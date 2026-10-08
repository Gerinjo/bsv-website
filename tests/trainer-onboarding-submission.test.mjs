import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,cpSync,rmSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {getMembershipRoutingKeys} from '../supabase/functions/_shared/membership-routing.mjs';
import {getTrainerEmailRecipient} from '../supabase/functions/_shared/trainer-onboarding-email.mjs';
import {berlinToday} from '../supabase/functions/_shared/form-dates.mjs';

const root=new URL('../',import.meta.url).pathname;
const signature=spawnSync('php',['-r',`$im=imagecreatetruecolor(640,190);imagefill($im,0,0,imagecolorallocate($im,255,255,255));imagettftext($im,36,3,30,120,imagecolorallocate($im,9,47,32),'public/api/vendor/tfpdf/font/unifont/DejaVuSans.ttf','M. Muster');imagepng($im);`],{cwd:root});
assert.equal(signature.status,0,signature.stderr.toString());
const blankSignature=spawnSync('php',['-r',`$im=imagecreatetruecolor(640,190);imagefill($im,0,0,imagecolorallocate($im,255,255,255));imagepng($im);`]);
assert.equal(blankSignature.status,0,blankSignature.stderr.toString());
const blankPaletteSignature=spawnSync('php',['-r',`$im=imagecreate(640,190);imagecolorallocate($im,255,255,255);imagepng($im);`]);
assert.equal(blankPaletteSignature.status,0,blankPaletteSignature.stderr.toString());

test('trainer documents route only to the relevant protected administrative destinations',()=>{
  assert.deepEqual(getMembershipRoutingKeys('trainer-onboarding','arbitrary'),['youth-leadership']);
  assert.equal(getTrainerEmailRecipient('trainer-membership','attacker@example.org'),'verwaltung@bsvnordstern.de');
});

test('PHP onboarding requires all trainers to sign and sends complete signed documents with isolated membership copies',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'bsv-trainer-')); mkdirSync(join(directory,'api'));
  for(const name of ['trainer-onboarding.php','trainer-onboarding-access.php','trainer-onboarding-teams.php','trainer-onboarding-clothing.json','trainer-onboarding-bus.json','trainer-onboarding-pdf.php','trainer-onboarding-welcome.json','trainer-onboarding-welcome.php','membership-pdf.php','vendor','assets']) cpSync(join(root,'public/api',name),join(directory,'api',name),{recursive:true,filter:p=>!/\.(?:mtx\.php|cw\.dat|cw127\.php)$/.test(p)});
  const messages=[]; let failType='';
  const message=type=>messages.find(message=>message.messageType===type);
  const bridge=createServer(async(req,res)=>{
    const chunks=[];for await(const chunk of req) chunks.push(chunk);
    const message=JSON.parse(Buffer.concat(chunks).toString()); messages.push(message);
    const failed=message.messageType===failType;
    res.writeHead(failed?502:201,{'Content-Type':'application/json'});res.end(JSON.stringify(failed?{error:'email_failed'}:{ok:true,mailMode:'test'}));
  });bridge.listen(0,'127.0.0.1');await once(bridge,'listening');
  const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
  const php=spawn('php',['-d','upload_max_filesize=4M','-d','post_max_size=15M','-S',`127.0.0.1:${port}`,'-t',directory],{env:{...process.env,BSV_TRAINER_LOCAL_DEV:'1',BSV_MEMBERSHIP_EMAIL_ENDPOINT:`http://127.0.0.1:${bridge.address().port}`,BSV_MEMBERSHIP_EMAIL_SECRET:'test-only'},stdio:['ignore','ignore','pipe']});
  let logs='';php.stderr.on('data',s=>{logs+=s;});
  t.after(async()=>{php.kill();if(php.exitCode===null)await once(php,'exit');await new Promise(resolve=>bridge.close(resolve));rmSync(directory,{recursive:true,force:true});});
  const endpoint=`http://127.0.0.1:${port}/api/trainer-onboarding.php`;
  for(let i=0;i<50;i++){try{const r=await fetch(endpoint+'?action=access');if(r.ok)break;}catch{}await delay(50);}
  const base={firstName:'Mara',lastName:'Muster',nationality:'deutsch',gender:'divers',birthDate:'1985-03-18',street:'Teststraße 1',postalCode:'78315',city:'Radolfzell',phone:'+49 170 1234567',email:'trainer@example.org',membership:'yes',team:'jugend--u11-e1',role:'Trainer',accountHolder:'Mara Muster',bankName:'Testbank',iban:'de89 3704 0044 0532 0130 00',bic:'',idProcessingAccepted:'accepted',contributionAccepted:'accepted',statutesAccepted:'accepted',criminalRecordAccepted:'accepted',privacyAccepted:'accepted',membershipApplicationAccepted:'accepted',signingPlace:'Radolfzell',signingDate:berlinToday(),signatureData:'data:image/png;base64,'+signature.stdout.toString('base64')};
  const clothingSizes={clothingJerseySize:'M',clothingTrackJacketSize:'L',clothingTrackPantsSize:'S',clothingRainJacketSize:'XL',clothingCoachJacketSize:'XXL',clothingPoloSize:'3XL'};
  Object.assign(base,clothingSizes);
  base.clothingReturnAccepted='accepted';
  const busRequest={busUse:'yes',busDriverAccepted:'accepted',busRulesAccepted:'accepted',busLicenseProcessingAccepted:'accepted',busRulesVersion:'2026-10-08'};
  base.busUse='no';
  async function submit(overrides={},fileOptions={}) {
    const access=await fetch(endpoint+'?action=access');const {nonce}=await access.json();
    const unlocked=await fetch(endpoint+'?action=access',{method:'POST',headers:{Cookie:access.headers.get('set-cookie').split(';')[0]},body:new URLSearchParams({nonce,word:'Fussball'})});
    assert.equal(unlocked.status,200);const cookie=unlocked.headers.get('set-cookie').split(';')[0];
    const challenge=await fetch(endpoint,{headers:{Cookie:cookie}});const {a,b}=await challenge.json();
    const data=new FormData();for(const[k,v]of Object.entries({...base,captchaAnswer:String(a+b),...overrides}))data.set(k,v);
    const uploadNames=['idFront','idBack'];if((overrides.busUse??base.busUse)==='yes'||fileOptions.includeLicense)uploadNames.push('licenseFront','licenseBack');
    for(const name of uploadNames)if(!fileOptions.omit?.includes(name)){
      const options=fileOptions.fields?.[name]??fileOptions;
      data.set(name,new Blob([options.content??signature.stdout],{type:options.mime??'image/png'}),options.name??`${name}.png`);
    }
    return fetch(endpoint,{method:'POST',headers:{Cookie:cookie},body:data});
  }
  await t.test('direct captcha and submission requests require the server-approved access session',async()=>{
    let response=await fetch(endpoint);assert.equal(response.status,403);assert.equal((await response.json()).code,'trainer_access_required');
    response=await fetch(endpoint,{method:'POST',body:new URLSearchParams({word:'Fussball',trainerAccessExpires:String(Date.now()+14400000)})});
    assert.equal(response.status,403);assert.equal(messages.length,0);
    const access=await fetch(endpoint+'?action=access');const {nonce}=await access.json();const oldCookie=access.headers.get('set-cookie').split(';')[0];
    assert.match(access.headers.get('set-cookie'),/HttpOnly/i);
    response=await fetch(endpoint+'?action=access',{method:'POST',headers:{Cookie:oldCookie},body:new URLSearchParams({nonce,word:'Fussbald'})});
    assert.equal(response.status,422);assert.deepEqual((await response.json()).invalidFields,[3]);
    response=await fetch(endpoint,{headers:{Cookie:oldCookie}});assert.equal(response.status,403);
    response=await fetch(endpoint+'?action=access',{method:'POST',headers:{Cookie:oldCookie},body:new URLSearchParams({nonce,word:'FUSSBALL'})});
    assert.equal(response.status,200);assert.equal((await response.json()).granted,true);
    const newCookie=response.headers.get('set-cookie').split(';')[0];assert.notEqual(newCookie,oldCookie,'approval rotates the session ID');
    response=await fetch(endpoint+'?action=access',{headers:{Cookie:newCookie}});assert.deepEqual(await response.json(),{ok:true,granted:true});
    response=await fetch(endpoint,{headers:{Cookie:newCookie}});assert.equal(response.status,200);assert.equal((await response.json()).features.trainerOnboarding,true);
    response=await fetch(endpoint,{headers:{Cookie:oldCookie}});assert.equal(response.status,403,'the pre-approval cookie is not a grant');
    response=await fetch(endpoint+'?action=access',{method:'POST',body:new URLSearchParams({nonce,word:'Fussball'})});assert.equal(response.status,422,'a challenge from another browser is invalid');
  });
  for(const key of ['idProcessingAccepted','contributionAccepted','statutesAccepted','criminalRecordAccepted','privacyAccepted']){
    const response=await submit({[key]:''});assert.equal(response.status,422,key);assert.equal(messages.length,0);
  }
  for(const value of ['','yes','false']){
    const response=await submit({clothingReturnAccepted:value});assert.equal(response.status,422);assert.match((await response.json()).message,/Rückgaberegel/);assert.equal(messages.length,0);
  }
  for(const overrides of [{nationality:''},{nationality:'x'.repeat(121)},{gender:''},{gender:'unknown'},{iban:'DE89370400440532013001'},{role:'Manager'},{team:'made-up'},{membership:'maybe'},{birthDate:'1985-02-31'},{membership:'no',signatureData:''},{membership:'no',membershipApplicationAccepted:''},{membership:'no',birthDate:'2012-03-18'}]){
    const response=await submit(overrides);assert.equal(response.status,422,JSON.stringify(overrides));assert.equal(messages.length,0);
  }
  for(const overrides of [{signatureData:''},{signatureData:'data:image/png;base64,bm90LWFuLWltYWdl'},...[blankSignature,blankPaletteSignature].map(image=>({signatureData:'data:image/png;base64,'+image.stdout.toString('base64')})),{signingPlace:''},{signingDate:''},{signingDate:'2026-02-31'},{signingDate:'2999-01-01'},{signingDate:'1980-01-01'},{birthDate:'2012-03-18'},{birthDate:'2012-03-18',guardianFirstName:'Alex'}]){
    const response=await submit(overrides);assert.equal(response.status,422,JSON.stringify({...overrides,signatureData:overrides.signatureData?'invalid or blank PNG':overrides.signatureData}));assert.equal(messages.length,0,'an unsigned or invalid form must not trigger mail');
  }
  for(const name of Object.keys(clothingSizes)){
    for(const value of ['', 'XS', 'M\nXL', 'not-required']){
      const response=await submit({[name]:value});assert.equal(response.status,422,`${name}: ${value}`);assert.equal(messages.length,0);
    }
  }
  for(const overrides of [{clothingJerseySize:'4XL'},{clothingPoloSize:'116'},{clothingTrackJacketSize:'122'}]){
    const response=await submit(overrides);assert.equal(response.status,422,JSON.stringify(overrides));assert.equal(messages.length,0);
  }
  for(const options of [{omit:['idFront']},{content:'not-an-image',mime:'image/png',name:'ausweis.png'},{content:'<script>alert(1)</script>',mime:'text/html',name:'ausweis.html'},{content:Buffer.alloc(3*1024*1024+1),mime:'image/png',name:'huge.png'}]){
    const response=await submit({},options);assert.equal(response.status,422);assert.equal(messages.length,0);
  }
  for(const overrides of [{busUse:''},{busUse:'maybe'},...['busDriverAccepted','busRulesAccepted','busLicenseProcessingAccepted'].map(key=>({...busRequest,[key]:''})),{...busRequest,busRulesVersion:'2026-01-01'}]){
    const response=await submit(overrides);assert.equal(response.status,422,JSON.stringify(overrides));assert.equal(messages.length,0);
  }
  const today=berlinToday();const birthday26=new Date(`${today}T12:00:00Z`);birthday26.setUTCFullYear(birthday26.getUTCFullYear()-26);
  const dayBefore26=new Date(birthday26);dayBefore26.setUTCDate(dayBefore26.getUTCDate()+1);
  const birthday25=new Date(`${today}T12:00:00Z`);birthday25.setUTCFullYear(birthday25.getUTCFullYear()-25);
  for(const birth of [birthday25,dayBefore26]){
    const response=await submit({...busRequest,birthDate:birth.toISOString().slice(0,10)});assert.equal(response.status,422);assert.match((await response.json()).message,/mindestens 26/);assert.equal(messages.length,0);
  }
  for(const options of [{omit:['licenseFront']},{omit:['licenseBack']},{fields:{licenseFront:{content:'not-an-image',mime:'image/png',name:'license.png'}}},{fields:{licenseBack:{content:Buffer.alloc(3*1024*1024+1),mime:'image/png',name:'huge.png'}}}]){
    const response=await submit(busRequest,options);assert.equal(response.status,422);assert.equal(messages.length,0);
  }
  const paddedCopy=Buffer.concat([signature.stdout,Buffer.alloc(3*1024*1024-signature.stdout.length)]);
  const oversizedCopies=await submit(busRequest,{content:paddedCopy});assert.equal(oversizedCopies.status,422);assert.match((await oversizedCopies.json()).message,/zusammen.*10 MB/);assert.equal(messages.length,0);
  let response=await submit();let result=await response.json();assert.equal(response.status,201,JSON.stringify(result));assert.equal(result.mailMode,'test');assert.equal(result.delivered,true);
  assert.deepEqual(messages.map(x=>x.messageType),['trainer-onboarding','trainer-keys','trainer-dfbnet','trainer-membership','trainer-welcome']);
  assert.ok(messages.every(x=>x.forceTestMode===true),'the PHP release forces test delivery for all trainer notifications');
  assert.equal(messages[0].attachments.length,3);assert.equal(message('trainer-welcome').attachments.length,1);
  assert.equal(message('trainer-keys').attachments.length,0);assert.equal(message('trainer-dfbnet').attachments.length,0);assert.equal(message('trainer-membership').attachments.length,0);
  assert.match(message('trainer-keys').text,/Mara Muster/);assert.match(message('trainer-keys').text,/trainer@example.org/);assert.match(message('trainer-keys').text,/\+49 170/);assert.doesNotMatch(message('trainer-keys').text,/Mannschaft:|IBAN|Testbank|Nationalität/);
  assert.match(message('trainer-dfbnet').text,/Mannschaft: U11 E1-Junioren/);assert.match(message('trainer-dfbnet').text,/Rolle: Trainer/);assert.doesNotMatch(message('trainer-dfbnet').text,/DE8937|Testbank|Ausweis|Führerschein/);
  assert.match(message('trainer-welcome').subject,/Willkommen.*Mara/);assert.match(message('trainer-welcome').html,/<img[^]*?Trainerteam/);assert.match(message('trainer-welcome').html,/Teampunkt schon jetzt installieren/);assert.doesNotMatch(message('trainer-welcome').html,/Spond|TimeTree/);assert.match(message('trainer-welcome').html,/Für iPhone/);assert.match(message('trainer-welcome').html,/Für Android/);assert.match(message('trainer-welcome').html,/Trainingsbelegungsplan/);assert.match(message('trainer-welcome').html,/Spieltagsbelegungsplan/);
  const signedText=(attachment,name)=>{
    const path=join(directory,name+'.pdf');writeFileSync(path,Buffer.from(attachment.content,'base64'));
    const text=spawnSync('pdftotext',['-layout',path,'-']);assert.equal(text.status,0,text.stderr.toString());
    const images=spawnSync('pdfimages',['-list',path]);assert.equal(images.status,0,images.stderr.toString());
    assert.match(images.stdout.toString(),/\b640\s+190\b/,'the drawn signature must be embedded as an image');
    const output=text.stdout.toString();assert.match(output,/Radolfzell/);assert.match(output,new RegExp(base.signingDate.split('-').reverse().join('\\.')));assert.match(output,/Mit meiner Unterschrift/);assert.match(output,/Im Onlineformular erfasste Unterschrift/);
    return output;
  };
  const existingMemberText=signedText(messages[0].attachments[0],'signed-existing-member');
  assert.match(existingMemberText,/Richtigkeit meiner Angaben/);assert.match(existingMemberText,/Bereits Mitglied/);assert.match(existingMemberText,/Unterschrift durch\s+Mara Muster/);
  assert.equal(message('trainer-welcome').attachments[0].content,messages[0].attachments[0].content,'the trainer receives the same signed PDF');
  messages.length=0;
  response=await submit({membership:'no'});result=await response.json();assert.equal(response.status,201,JSON.stringify(result));
  assert.deepEqual(messages.map(x=>x.messageType),['trainer-onboarding','trainer-keys','trainer-dfbnet','trainer-membership','trainer-welcome']);
  assert.equal(messages[0].attachments.length,4);assert.equal(message('trainer-membership').attachments.length,1);assert.equal(message('trainer-welcome').attachments.length,2);
  signedText(messages[0].attachments[0],'signed-new-member-onboarding');signedText(message('trainer-membership').attachments[0],'signed-membership');
  assert.equal(messages[0].attachments[1].content,message('trainer-membership').attachments[0].content,'the membership office receives the separate signed membership PDF');
  assert.equal(message('trainer-welcome').attachments[0].content,messages[0].attachments[0].content);assert.equal(message('trainer-welcome').attachments[1].content,message('trainer-membership').attachments[0].content);
  const membershipFile=join(directory,'membership.pdf');writeFileSync(membershipFile,Buffer.from(message('trainer-membership').attachments[0].content,'base64'));
  const membershipText=spawnSync('pdftotext',['-layout',membershipFile,'-']).stdout.toString();
  assert.match(membershipText,/Mitgliedsantrag|Mitgliedschaft/);assert.match(membershipText,/Beitragsordnung/);assert.match(membershipText,/beitrag befreit|Mitgliedsbeitrag befreit/);
  assert.match(membershipText,/Nationalität/);assert.match(membershipText,/deutsch/);assert.match(membershipText,/Geschlecht/);assert.match(membershipText,/divers/);assert.match(membershipText,/Unterschrift/);assert.doesNotMatch(membershipText,/DE8937|Testbank|Personalausweis-Kopie|SET-2852|Polyesterjacke|Coachjacke|Größe:|Kleidungsstücke|12 Monaten/);
  const summaryFile=join(directory,'summary.pdf');writeFileSync(summaryFile,Buffer.from(messages[0].attachments[0].content,'base64'));
  const summaryText=spawnSync('pdftotext',['-layout',summaryFile,'-']).stdout.toString();assert.match(summaryText,/DE89370400440532013000/);assert.match(summaryText,/Führungszeugnis/);assert.match(summaryText,/Nationalität/);assert.match(summaryText,/Geschlecht/);assert.match(summaryText,/divers/);
  assert.match(summaryText,/SET-2852-004/);
  assert.match(summaryText.replace(/[ \t]{2,}Ja[ \t]*$/gm,'').replace(/\s+/g,' '),/Ich habe gelesen und akzeptiere, dass ich die vom BSV gestellten Kleidungsstücke zurückgeben muss, wenn ich meine Tätigkeit als Trainer innerhalb von 12 Monaten nach Beginn beende\./);
  for(const [label,size]of [['Trikot Team kurzarm','M'],['Polyesterjacke One','L'],['Polyesterhose One','S'],['Allwetterjacke Team 2.0','XL'],['Coachjacke Team mit Kapuze','XXL'],['Polo One','3XL']]){
    assert.match(summaryText,new RegExp(`${label}[^]*?Größe: ${size}\\b`));
  }
  messages.length=0;response=await submit(Object.fromEntries(Object.keys(clothingSizes).map(name=>[name,'not-needed'])));result=await response.json();assert.equal(response.status,201,JSON.stringify(result));
  const noClothingText=signedText(messages[0].attachments[0],'signed-no-clothing');assert.equal(noClothingText.match(/Nicht benötigt/g)?.length,6);assert.doesNotMatch(noClothingText,/Größe:/);
  assert.equal(message('trainer-welcome').attachments[0].content,messages[0].attachments[0].content,'the trainer receives all six declined clothing choices');
  messages.length=0;response=await submit({clothingJerseySize:'not-needed',clothingPoloSize:'not-needed'});result=await response.json();assert.equal(response.status,201,JSON.stringify(result));
  const mixedClothingText=signedText(messages[0].attachments[0],'signed-mixed-clothing');assert.equal(mixedClothingText.match(/Nicht benötigt/g)?.length,2);assert.match(mixedClothingText,/Trikot Team kurzarm[^]*?Nicht benötigt/);assert.match(mixedClothingText,/Polo One[^]*?Nicht benötigt/);assert.match(mixedClothingText,/Polyesterjacke One[^]*?Größe: L\b/);assert.doesNotMatch(mixedClothingText,/Größe: (M|3XL)\b/);
  for(const membership of ['yes','no']){
    messages.length=0;response=await submit({membership,birthDate:'2012-03-18',guardianFirstName:'Alex',guardianLastName:'Muster'});result=await response.json();assert.equal(response.status,201,JSON.stringify(result));
    const text=signedText(messages[0].attachments[0],`signed-minor-${membership}`);assert.match(text,/sorgeberechtigte Person\s+Alex Muster/);
    if(membership==='no')assert.match(signedText(message('trainer-membership').attachments[0],'signed-minor-membership'),/sorgeberechtigte Person\s+Alex Muster/);
  }
  messages.length=0;response=await submit({clothingTrackPantsSize:'122'});assert.equal(response.status,201);const childSizeFile=join(directory,'child-size.pdf');writeFileSync(childSizeFile,Buffer.from(messages[0].attachments[0].content,'base64'));assert.match(spawnSync('pdftotext',['-layout',childSizeFile,'-']).stdout.toString(),/Polyesterhose One[^]*?Größe: 122\b/);
  messages.length=0;response=await submit({gender:'keine-angabe'});assert.equal(response.status,201);const noGenderFile=join(directory,'no-gender.pdf');writeFileSync(noGenderFile,Buffer.from(messages[0].attachments[0].content,'base64'));assert.match(spawnSync('pdftotext',['-layout',noGenderFile,'-']).stdout.toString(),/Keine Angabe/);
  messages.length=0;response=await submit({...busRequest,birthDate:birthday26.toISOString().slice(0,10),membership:'no'});result=await response.json();assert.equal(response.status,201,JSON.stringify(result));
  assert.deepEqual(messages.map(x=>x.messageType),['trainer-onboarding','trainer-keys','trainer-dfbnet','trainer-membership','trainer-welcome']);assert.equal(messages[0].attachments.length,6);assert.equal(message('trainer-membership').attachments.length,1);assert.equal(message('trainer-welcome').attachments.length,2);
  assert.equal(messages[0].attachments.filter(x=>x.filename.startsWith('Fuehrerschein-Kopie-')).length,2);
  assert.ok(message('trainer-membership').attachments.every(x=>x.contentType==='application/pdf'));assert.ok(message('trainer-welcome').attachments.every(x=>x.contentType==='application/pdf'));
  const busFile=join(directory,'bus.pdf');writeFileSync(busFile,Buffer.from(messages[0].attachments[0].content,'base64'));const busText=spawnSync('pdftotext',['-layout',busFile,'-']).stdout.toString();
  signedText(messages[0].attachments[0],'signed-bus-onboarding');
  assert.match(message('trainer-welcome').html,/TimeTree schon jetzt installieren/);assert.match(message('trainer-welcome').text,/Mit dieser Anmeldung beantragst du automatisch deine Mitgliedschaft/);
  for(const rule of [/Mannschaftsbus/,/mindestens 26|Mindestens 26/,/08.10.2026/,/Prüfung im Verein steht aus/,/Führerschein Vorderseite/,/Führerschein Rückseite/,/im Original/,/angeschnallt/,/Aral/,/Garage/,/Fahrtenbuch/,/Vorstandschaft/,/nicht gegessen/])assert.match(busText,rule);
  const busMembershipFile=join(directory,'bus-membership.pdf');writeFileSync(busMembershipFile,Buffer.from(message('trainer-membership').attachments[0].content,'base64'));assert.doesNotMatch(spawnSync('pdftotext',['-layout',busMembershipFile,'-']).stdout.toString(),/Mannschaftsbus|Führerschein|Busregeln|Aral/);
  messages.length=0;response=await submit({}, {includeLicense:true});assert.equal(response.status,201);assert.equal(messages[0].attachments.length,3);assert.equal(message('trainer-welcome').attachments.length,1);assert.ok(!messages[0].attachments.some(x=>x.filename.startsWith('Fuehrerschein-Kopie-')));
  for(const team of ['jugend--u7-g','jugend--u9-f']){
    messages.length=0;response=await submit({team});result=await response.json();assert.equal(response.status,201);assert.equal(result.welcome.dfbnet,false);assert.deepEqual(result.welcome.apps,['spond']);assert.equal(message('trainer-dfbnet'),undefined);assert.match(message('trainer-welcome').html,/Spond schon jetzt installieren/);assert.doesNotMatch(message('trainer-welcome').html,/Teampunkt|Dein DFBnet-Zugang|TimeTree/);
  }
  messages.length=0;failType='trainer-onboarding';response=await submit();assert.equal(response.status,502);assert.equal(messages.length,1,'no welcome or administrative notifications before the main documents are delivered');
  messages.length=0;failType='trainer-membership';response=await submit({membership:'no'});result=await response.json();assert.equal(response.status,201);assert.equal(result.accepted,true);assert.deepEqual(result.pendingNotifications,['trainer-membership']);assert.equal(messages.length,5);assert.match(message('trainer-welcome').html,/nicht erneut/);
  messages.length=0;failType='trainer-welcome';response=await submit();result=await response.json();assert.equal(response.status,201);assert.equal(result.applicantCopySent,false);assert.equal(result.delivered,true);
  assert.ok(!logs.includes('DE8937')&&!logs.includes('Mara Muster')&&!logs.includes('trainer@example.org'));
});
