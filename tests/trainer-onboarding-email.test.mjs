import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {resolveEmailMode, LIVE_EMAIL_CONFIRMATION} from '../supabase/functions/_shared/email-mode.mjs';
import {collectRecipientEmails,getMembershipRoutingKeys} from '../supabase/functions/_shared/membership-routing.mjs';
import {isTrainerEmail,getTrainerEmailRecipient,getTrainerEmailMode,TRAINER_TEST_RECIPIENT} from '../supabase/functions/_shared/trainer-onboarding-email.mjs';
import {trainerWelcomeProfile} from '../src/utils/trainerOnboardingWelcome.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const stripped=path=>stripTypeScriptTypes(read(path).replace(/^import .*;\r?\n/gm,'')).replace(/^export\s+/gm,'');
const welcome=JSON.parse(read('public/api/trainer-onboarding-welcome.json'));
const reference='TR-20261008-ABC123';
const pdf={filename:`Trainerunterlagen-${reference}.pdf`,contentType:'application/pdf',content:Buffer.from('%PDF-test-only').toString('base64')};

function harness(values={},failed=false){
  const env={EMAIL_DELIVERY_MODE:'live',EMAIL_LIVE_CONFIRMATION:LIVE_EMAIL_CONFIRMATION,EMAIL_TEST_RECIPIENT:'unrelated-test@example.org',RESEND_API_KEY:'test-only',MAIL_FROM:'BSV <test@example.org>',MEMBERSHIP_EMAIL_SECRET:'test-secret',SUPABASE_URL:'https://example.org',SUPABASE_SERVICE_ROLE_KEY:'test-only',...values};
  const payloads=[],lookups=[];let handler;
  const deno={env:{get:key=>env[key]},serve:callback=>{handler=callback;}};
  const api=runInNewContext(stripped('supabase/functions/_shared/email-service.ts')+'\n({sendEmail,getEmailRuntimeConfig});',{
    Deno:deno,resolveEmailMode,console:{error(){}},fetch:async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');payloads.push({body:JSON.parse(options.body),headers:options.headers});return new Response(JSON.stringify(failed?{error:'test-failure'}:{id:'test-resend'}),{status:failed?502:201});},
  });
  const db={from(){const chain={select(){return chain;},in(field,keys){lookups.push(Array.from(keys));return chain;},eq(){return Promise.resolve({data:[{schluessel:'youth-leadership',email:'jugend@bsvnordstern.de',weitere_emails:[]}],error:null});}};return chain;}};
  runInNewContext(stripped('supabase/functions/membership-email/index.ts'),{
    Deno:deno,Response,Request,console:{error(){}},createClient:()=>db,collectRecipientEmails,getMembershipRoutingKeys,isTrainerEmail,getTrainerEmailRecipient,getTrainerEmailMode,TRAINER_TEST_RECIPIENT,...api,queueMembershipNewsletter:async()=> 'not_requested',
  });
  return{payloads,lookups,submit:async(type,overrides={})=>handler(new Request('https://example.org/mail',{method:'POST',headers:{'Content-Type':'application/json','x-bsv-membership-secret':'test-secret'},body:JSON.stringify({messageType:type,to:'coach@example.org',routingKey:'attacker',replyTo:'coach@example.org',subject:'Willkommen',text:'Testunterlagen',html:'<p>Testunterlagen</p>',applicationNumber:reference,attachments:type==='trainer-welcome'?[pdf]:[],...overrides})}))};
}

test('every onboarding email goes only to Jerome by default even if general club mail is live',async()=>{
  const app=harness();
  for(const type of ['trainer-onboarding','trainer-keys','trainer-dfbnet','trainer-membership','trainer-welcome']){
    const response=await app.submit(type);assert.equal(response.status,201);assert.equal((await response.json()).mailMode,'test');
    const {body,headers}=app.payloads.at(-1);assert.deepEqual(body.to,[TRAINER_TEST_RECIPIENT]);assert.equal(body.reply_to,TRAINER_TEST_RECIPIENT);assert.equal(body.cc,undefined);assert.equal(body.bcc,undefined);assert.match(body.subject,/^\[TEST\]/);assert.match(body.html,/TESTMODUS/);assert.equal(headers['Idempotency-Key'],`${type}/test/${reference}`);
  }
  assert.deepEqual(app.lookups,[],'test mode never depends on live administrative recipient configuration');
});

test('the PHP release can force every trainer email into test mode even with both live switches enabled',async()=>{
  const app=harness({TRAINER_ONBOARDING_MAIL_MODE:'live'});
  for(const type of ['trainer-onboarding','trainer-keys','trainer-dfbnet','trainer-membership','trainer-welcome']){
    const response=await app.submit(type,{forceTestMode:true});assert.equal(response.status,201);assert.equal((await response.json()).mailMode,'test');
    const {body}=app.payloads.at(-1);assert.deepEqual(body.to,[TRAINER_TEST_RECIPIENT]);assert.equal(body.reply_to,TRAINER_TEST_RECIPIENT);assert.equal(body.cc,undefined);assert.equal(body.bcc,undefined);assert.match(body.subject,/^\[TEST\]/);
  }
  assert.deepEqual(app.lookups,[]);
});

test('live trainer routing requires both onboarding live mode and globally confirmed live mode',async()=>{
  assert.equal(getTrainerEmailMode(key=>({TRAINER_ONBOARDING_MAIL_MODE:'live'})[key],'test'),'test');
  const app=harness({TRAINER_ONBOARDING_MAIL_MODE:'live'});
  for(const[type,to]of [['trainer-onboarding','jugend@bsvnordstern.de'],['trainer-keys','Markus.Mossbrugger@bsvnordstern.de'],['trainer-dfbnet','dfbnet@bsvnordstern.de'],['trainer-membership','verwaltung@bsvnordstern.de'],['trainer-welcome','coach@example.org']]){
    const response=await app.submit(type);assert.equal(response.status,201);assert.equal((await response.json()).mailMode,'live');assert.deepEqual(app.payloads.at(-1).body.to,[to]);
  }
  assert.deepEqual(app.lookups,[['youth-leadership']]);
});

test('contact notifications reject sensitive attachments and membership receives only its separate PDF',async()=>{
  for(const type of ['trainer-keys','trainer-dfbnet','trainer-membership']){
    const app=harness();assert.equal((await app.submit(type,{attachments:[pdf]})).status,422);assert.equal(app.payloads.length,0);
  }
  const app=harness();for(const prefix of ['Mitgliedsantrag','Mitgliedsdaten'])assert.equal((await app.submit('trainer-membership',{attachments:[{...pdf,filename:`${prefix}-${reference}.pdf`}]})).status,201);
  assert.equal((await app.submit('trainer-welcome',{attachments:[{...pdf,filename:'Ausweis.png',contentType:'image/png'}]})).status,422);
});

test('delivery errors stay explicit and never report a successful welcome email',async()=>{
  const app=harness({},true);const response=await app.submit('trainer-welcome');assert.equal(response.status,502);assert.equal((await response.json()).error,'email_failed');assert.deepEqual(app.payloads[0].body.to,[TRAINER_TEST_RECIPIENT]);
});

test('thank-you page and welcome email agree on apps and DFBnet for every selectable team',()=>{
  const php=spawnSync('php',['-r',`require 'public/api/trainer-onboarding-welcome.php';$teams=require 'public/api/trainer-onboarding-teams.php';$result=[];foreach($teams as $key=>$label){$result[]=bsvTrainerWelcomeProfile(['teamKey'=>$key,'teamLabel'=>$label,'busUse'=>'yes','membership'=>'no']);}echo json_encode($result);`],{cwd:new URL('../',import.meta.url).pathname});
  assert.equal(php.status,0,php.stderr.toString());const profiles=JSON.parse(php.stdout.toString());assert.equal(profiles.length,22);
  for(const profile of profiles){const js=trainerWelcomeProfile(welcome,profile.teamKey,'yes','no');assert.deepEqual(profile.apps,js.apps);assert.equal(profile.dfbnet,js.dfbnet);assert.equal(js.membershipStep,'membershipNew');}
  for(const key of ['jugend--u6-g','jugend--u7-g','jugend--u8-f','jugend--u9-f']){assert.deepEqual(trainerWelcomeProfile(welcome,key,'no','yes').apps,['spond']);assert.equal(trainerWelcomeProfile(welcome,key,'no','yes').dfbnet,false);}
  for(const key of ['jugend--u11-e1','jugend--u19','jugend--juniorinnen--u15']){assert.deepEqual(trainerWelcomeProfile(welcome,key,'no','yes').apps,['teampunkt']);assert.equal(trainerWelcomeProfile(welcome,key,'no','yes').dfbnet,true);}
});

test('personalized welcome HTML escapes user input and contains no bank data outside the PDF',()=>{
  const php=spawnSync('php',['-r',`require 'public/api/trainer-onboarding-welcome.php';echo json_encode(bsvTrainerWelcomeEmail(['teamKey'=>'jugend--u11-e1','teamLabel'=>'E1 & Team','firstName'=>'<img src=x onerror=alert(1)>','role'=>'Trainer','applicationNumber'=>'${reference}','membership'=>'no','busUse'=>'no','iban'=>'DE89370400440532013000']));`],{cwd:new URL('../',import.meta.url).pathname});
  assert.equal(php.status,0,php.stderr.toString());const mail=JSON.parse(php.stdout.toString());assert.doesNotMatch(mail.html,/<img src=x/);assert.match(mail.html,/&lt;img/);assert.match(mail.html,/E1 &amp; Team/);assert.doesNotMatch(mail.html,/DE89370400440532013000/);assert.match(mail.html,/<table role="presentation"/);assert.match(mail.html,/<img src="https:\/\/bsvnordstern.de/);
});
