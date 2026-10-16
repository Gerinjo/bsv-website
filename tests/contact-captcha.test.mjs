import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import {withContactDatabase} from '../supabase/functions/contact-request/database.mjs';

const clockError={code:'PGRST303',message:'JWT issued at future'};
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/contact-request/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''));
function adapters({error=clockError,rows=[{id:'challenge-id'}],fail=false}={}){
 const calls=[];
 const query={};for(const method of ['insert','update','delete','select','eq','lt','single','maybeSingle'])query[method]=()=>query;
 query.then=(resolve,reject)=>Promise.resolve({data:null,error}).then(resolve,reject);
 const native=Object.assign(async(strings,...values)=>{
  const text=strings.join('?').replace(/\s+/g,' ').trim();calls.push({text,values});
  if(fail)throw Object.assign(new Error('native unavailable'),{code:'08006'});
  return text==='set local role service_role'?[]:rows;
 },{});
 native.json=value=>{assert.equal(typeof value,'object');return JSON.stringify(value)};
 const connect=()=>({begin:fn=>fn(native)});
 const db=withContactDatabase({from:()=>query,rpc:()=>query},connect);
 return {db,connect,calls,rest:{from:()=>query,rpc:()=>query}};
}

test('live HTTP entrypoint creates a correct captcha despite gateway clock rejection',async()=>{
 const app=adapters();let handle;
 runInNewContext(source,{
  Response,crypto,console:{error(){}},BAMBINI_EVENT:{},URMEL_EVENT:{},withContactDatabase,
  postgres:()=>app.connect(),createClient:()=>app.rest,
  Deno:{env:{get:key=>({SUPABASE_URL:'https://example.org',SUPABASE_SERVICE_ROLE_KEY:'server-only',SUPABASE_DB_URL:'postgres://example.org',ALLOWED_ORIGINS:'https://bsvnordstern.de'})[key]},serve:fn=>{handle=fn}},
 });
 const response=await handle(new Request('https://example.org/contact-request',{headers:{Origin:'https://bsvnordstern.de'}}));
 const data=await response.json();assert.equal(response.status,200);assert.equal(data.token,'challenge-id');
 const insert=app.calls.find(c=>c.text.startsWith('insert'));
 assert.equal(data.a+data.b,insert.values[0]);assert.ok(data.a>=2&&data.a<=9);assert.ok(data.b>=1&&data.b<=9);
 assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('access-control-allow-origin'),'https://bsvnordstern.de');
 assert.ok(app.calls.some(c=>c.text.startsWith('delete from public.contact_captcha_challenges where expires_at')));
});

test('healthy REST calls and unrelated authentication, network and write failures are never replayed',async()=>{
 for(const error of [null,{code:'42501',message:'permission denied'},{code:'PGRST303',message:'JWT expired'},{code:'PGRST301',message:'JWT issued at future'},{code:'23505',message:'duplicate'}]){
  const app=adapters({error});const result=await app.db.from('contact_captcha_challenges').insert({antwort:7}).select('id').single();
  assert.equal(result.error,error);assert.equal(app.calls.length,0);
 }
 const app=adapters();const broken=withContactDatabase({from(){throw new Error('network failed')}},app.connect);
 await assert.rejects(async()=>broken.from('contact_captcha_challenges').insert({antwort:7}),/network failed/);
 assert.equal(app.calls.length,0);
});

test('fallback captcha consumption remains a single atomic DELETE RETURNING',async()=>{
 const expected={antwort:7,expires_at:'2026-10-16T17:00:00Z'};
 const app=adapters({rows:[expected]});
 const query=app.db.from('contact_captcha_challenges').delete().eq('id','challenge-id').select('antwort, expires_at').maybeSingle();
 assert.deepEqual((await query).data,expected);await query;
 const deletes=app.calls.filter(c=>c.text.startsWith('delete'));assert.equal(deletes.length,1);
 assert.match(deletes[0].text,/where id = \? returning antwort, expires_at$/);assert.deepEqual(deletes[0].values,['challenge-id']);
 assert.equal((await adapters({rows:[]}).db.from('contact_captcha_challenges').delete().eq('id','missing').select('antwort, expires_at').maybeSingle()).data,null);
});

test('recipient lookup, private routing signatures, inquiry storage and mail status retain bound parameters',async()=>{
 const malicious="person-a'; drop table contact_anfragen; --";
 const app=adapters({rows:[{id:'inquiry-id',data:{payload:{},signature:'signed'}}]});
 await app.db.from('contact_empfaenger').select('email, weitere_emails, bezeichnung').eq('schluessel',malicious).eq('aktiv',true).maybeSingle();
 await app.db.rpc('prepare_trainer_contact_lookup',{routing_key:malicious});
 await app.db.from('contact_anfragen').insert({thema:'general',empfaenger_email:'a@example.org',nachricht:malicious}).select('id').single();
 await app.db.from('contact_anfragen').update({benachrichtigung_status:'versendet',mail_modus:'live',resend_id:'mail-id',benachrichtigung_fehler:null}).eq('id','inquiry-id');
 assert.ok(app.calls.every(c=>!c.text.includes(malicious)));
 assert.ok(app.calls.some(c=>c.values.includes(malicious)));
 const insert=app.calls.find(c=>c.text.startsWith('insert'));assert.deepEqual(JSON.parse(insert.values[0]).empfaenger_emails,['a@example.org']);
 const update=app.calls.find(c=>c.text.startsWith('update'));assert.ok(update.values.includes('mail-id'));assert.ok(update.values.includes('inquiry-id'));
 assert.equal(app.calls.filter(c=>c.text==='set local role service_role').length,4);
});

test('unknown SQL operations and a broken native connection fail closed',async()=>{
 const app=adapters();const result=await app.db.from('unrelated_table').delete().eq('id','x');
 assert.equal(result.error,clockError);assert.equal(app.calls.length,1);
 const rpc=await app.db.rpc('unrelated_function',{});assert.equal(rpc.error,clockError);
 const broken=adapters({fail:true});assert.equal((await broken.db.from('contact_captcha_challenges').insert({antwort:7}).select('id').single()).error,clockError);
});
