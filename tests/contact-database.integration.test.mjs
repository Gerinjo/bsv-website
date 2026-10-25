// Run with a disposable local Postgres database named contact_database_test:
// CONTACT_DATABASE_TEST_URL=postgres://postgres@127.0.0.1:PORT/contact_database_test node --test tests/contact-database.integration.test.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import postgres from 'postgres';
import {withContactDatabase} from '../supabase/functions/contact-request/database.mjs';
import {buildEventConfirmation,deliverEventConfirmation} from '../supabase/functions/_shared/event-confirmation.mjs';
import {BAMBINI_EVENT} from '../supabase/functions/_shared/bambini-event.mjs';
import {URMEL_EVENT} from '../supabase/functions/_shared/urmel-event.mjs';
import {GIRLS_CUP_EVENT} from '../supabase/functions/_shared/girls-cup-event.mjs';
import {getBambiniRouting,BAMBINI_SUCCESS_MESSAGE,prepareBambiniRegistration} from '../supabase/functions/contact-request/bambini-registration.mjs';

const databaseUrl=process.env.CONTACT_DATABASE_TEST_URL;
test('complete HTTP submission stores contact data through the real driver and prevents captcha reuse',{skip:!databaseUrl},async()=>{
 const url=new URL(databaseUrl);
 assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.pathname==='/contact_database_test','Only a disposable local test database is allowed');
 const sql=postgres(databaseUrl,{prepare:false,max:1}),mails=[];
 try{
  await sql.unsafe(`
   do $$ begin if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if; end $$;
   create table if not exists public.contact_anfragen (
    id uuid primary key default gen_random_uuid(),thema text,routing_schluessel text,anfrageart text,
    empfaenger_email text,empfaenger_emails text[],vorname text,nachname text,email text,telefon text,
    gegner_verein text,gegner_mannschaft text,nachricht text,datenschutz_bestaetigt boolean,
    benachrichtigung_status text,mail_modus text,resend_id text,benachrichtigung_fehler text
   );
   create table if not exists public.contact_captcha_challenges(id uuid primary key default gen_random_uuid(),antwort integer,expires_at timestamptz default now()+interval '10 minutes');
   create table if not exists public.gst_anmeldungen(id uuid primary key default gen_random_uuid());
   create table if not exists public.contact_empfaenger(schluessel text primary key,email text,weitere_emails text[],bezeichnung text,aktiv boolean);
   grant usage on schema public to service_role;
   grant select,insert,update,delete on public.contact_anfragen,public.contact_captcha_challenges,public.contact_empfaenger to service_role;
   insert into public.contact_empfaenger values('general','one@example.invalid',array[]::text[],'Kontakt',true) on conflict (schluessel) do update set weitere_emails=excluded.weitere_emails;
  `);
  await sql.unsafe(readFileSync(new URL('../supabase/migrations/20261025164806_event_registration_confirmations.sql',import.meta.url),'utf8'));
  const query={};for(const method of ['insert','update','delete','select','eq','lt','single','maybeSingle'])query[method]=()=>query;
  query.then=(resolve,reject)=>Promise.resolve({data:null,error:{code:'PGRST303',message:'JWT issued at future'}}).then(resolve,reject);
  const rest={from:()=>query};let handle;
  const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/contact-request/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''));
  runInNewContext(source,{
   Request,Response,crypto,console,withContactDatabase,createClient:()=>rest,postgres:()=>sql,
   BAMBINI_EVENT,URMEL_EVENT,GIRLS_CUP_EVENT,getBambiniRouting,BAMBINI_SUCCESS_MESSAGE,prepareBambiniRegistration,
   buildEventConfirmation,deliverEventConfirmation,
   Deno:{env:{get:key=>({SUPABASE_URL:'https://example.org',SUPABASE_SERVICE_ROLE_KEY:'test-only',SUPABASE_DB_URL:databaseUrl,ALLOWED_ORIGINS:'https://bsvnordstern.de'})[key]},serve:fn=>{handle=fn}},
   getEmailRuntimeConfig:()=>({mode:'test'}),sendEmail:async mail=>{mails.push(mail);return {id:'provider-id',mode:'test'}},
   resolveContactRecipients:async({db})=>{const {data,error}=await db.from('contact_empfaenger').select('email, weitere_emails, bezeichnung').eq('schluessel','general').eq('aktiv',true).maybeSingle();if(error)throw error;return {bezeichnung:data.bezeichnung,emails:[data.email,...data.weitere_emails]}},
  });
  const headers={Origin:'https://bsvnordstern.de','Content-Type':'application/json'};
  const challenge=await handle(new Request('https://example.org/contact-request',{headers}));assert.equal(challenge.status,200);
  const captcha=await challenge.json(),message="Grüße vom BSV – 'Anfrage' mit \"Anführungszeichen\"\nZweite Zeile; kein SQL.";
  const values={topic:'general',firstName:'Jérôme',lastName:'Test',email:'sender@example.invalid',phone:'0123456789',message,privacyAccepted:true,captchaToken:captcha.token,captchaAnswer:captcha.a+captcha.b};
  const submit=()=>handle(new Request('https://example.org/contact-request',{method:'POST',headers,body:JSON.stringify(values)}));
  const response=await submit(),result=await response.json();
  assert.equal(response.status,201,JSON.stringify(result));assert.equal(result.saved,true);assert.equal(result.notificationStatus,'versendet');
  const [stored]=await sql`select * from public.contact_anfragen where id=${result.inquiryId}`;
  assert.equal(stored.nachricht,message);assert.equal(stored.vorname,'Jérôme');assert.equal(stored.telefon,'0123456789');assert.equal(stored.datenschutz_bestaetigt,true);
  assert.deepEqual(stored.empfaenger_emails,['one@example.invalid']);assert.equal(stored.benachrichtigung_status,'versendet');assert.equal(stored.resend_id,'provider-id');
  assert.equal(mails.length,1);assert.equal(mails[0].reply_to,values.email);
  assert.equal((await submit()).status,422);assert.equal(mails.length,1);
  const db=withContactDatabase(rest,()=>sql);
  const status=await db.from('contact_anfragen').update({benachrichtigung_status:'fehler',mail_modus:'test',benachrichtigung_fehler:'Provider unavailable'}).eq('id',result.inquiryId);
  assert.equal(status.error,null);
  const [updated]=await sql`select * from public.contact_anfragen where id=${result.inquiryId}`;
  assert.equal(updated.resend_id,'provider-id');assert.equal(updated.benachrichtigung_status,'fehler');assert.equal(updated.benachrichtigung_fehler,'Provider unavailable');
  const nextCaptcha=await (await handle(new Request('https://example.org/contact-request',{headers}))).json();
  const eventResponse=await handle(new Request('https://example.org/contact-request',{method:'POST',headers,body:JSON.stringify({...values,
   topic:BAMBINI_EVENT.topic,phone:'07732 123456',clubName:'FC Integration',timeSlots:['09:00'],registrationAccepted:true,
   captchaToken:nextCaptcha.token,captchaAnswer:nextCaptcha.a+nextCaptcha.b,
  })}));
  const eventResult=await eventResponse.json();assert.equal(eventResponse.status,201,JSON.stringify(eventResult));
  const [eventStored]=await sql`select * from public.contact_anfragen where id=${eventResult.inquiryId}`;
  assert.equal(eventStored.benachrichtigung_status,'versendet');assert.equal(eventStored.bestaetigung_status,'versendet');
  assert.equal(eventStored.bestaetigung_mail_modus,'test');assert.equal(eventStored.bestaetigung_resend_id,'provider-id');
  assert.equal(eventStored.bestaetigung_fehler,null);assert.equal(mails.length,3);assert.equal(mails[2].to,'sender@example.invalid');
  const confirmationError=await db.from('contact_anfragen').update({bestaetigung_status:'fehler',bestaetigung_mail_modus:'test',bestaetigung_resend_id:null,bestaetigung_fehler:'Rejected'}).eq('id',eventResult.inquiryId);
  assert.equal(confirmationError.error,null);
  const [after]=await sql`select * from public.contact_anfragen where id=${eventResult.inquiryId}`;
  assert.equal(after.benachrichtigung_status,'versendet');assert.equal(after.resend_id,'provider-id');assert.equal(after.bestaetigung_status,'fehler');
 }finally{await sql.end({timeout:1})}
});
