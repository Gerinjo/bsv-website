import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {readFile} from 'node:fs/promises';import {setTimeout as delay} from 'node:timers/promises';
const exec=promisify(execFile),name='bsv-contact-lookup-test-'+process.pid;
const sql=text=>new Promise((resolve,reject)=>{const child=execFile('docker',['exec','-i',name,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-U','postgres'],{maxBuffer:1048576},(error,stdout,stderr)=>error?reject(new Error(stderr)):resolve(stdout.trim()));child.stdin.end(text);});
try{
 await exec('docker',['run','--rm','-d','--name',name,'-e','POSTGRES_PASSWORD=isolated-only','postgres:17-alpine']);
 for(let i=0;;i++){try{await exec('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);break;}catch{if(i>30)throw new Error('Database unavailable');await delay(300);}}
 await sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema extensions;create extension pgcrypto with schema extensions;create schema private;grant usage on schema private,extensions to service_role;
 create table private.trainer_suite_bridge(singleton boolean primary key default true,secret text);alter table private.trainer_suite_bridge enable row level security;grant select on private.trainer_suite_bridge to service_role;insert into private.trainer_suite_bridge(secret) values(repeat('a',64));
 create table public.contact_anfragen(id uuid primary key,empfaenger_email text);`);
 await sql(await readFile(new URL('../supabase/migrations/20261013081947_trainer_contact_lookup.sql',import.meta.url),'utf8'));
 await sql(`create function pg_temp.check_lookup(ok boolean,label text) returns void language plpgsql as $$begin if ok is not true then raise exception 'Contact lookup: %',label;end if;end $$;
 set role service_role;
 do $$declare lookup jsonb;begin
 lookup:=public.prepare_trainer_contact_lookup('team--jugend--u15-c1');
 perform pg_temp.check_lookup(lookup->>'signature'=encode(extensions.hmac((lookup->'payload')::text,encode(extensions.digest(repeat('a',64),'sha256'),'hex'),'sha256'),'hex'),'same signed payload and key derivation as Suite');
 perform pg_temp.check_lookup(lookup->'payload'->>'purpose'='trainer-contact' and lookup->'payload'->>'routingKey'='team--jugend--u15-c1','purpose and team bound into signature');
 perform pg_temp.check_lookup(abs(extract(epoch from clock_timestamp()-(lookup->'payload'->>'requestedAt')::timestamptz))<5,'fresh timestamp on each lookup');
 perform pg_temp.check_lookup(not lookup ? 'secret' and lookup::text not like '%'||repeat('a',64)||'%','bridge key never returned');
 perform pg_temp.check_lookup(public.prepare_trainer_contact_lookup('person-ole-schmal') ? 'signature','person lookup supported');
 perform pg_temp.check_lookup(public.prepare_trainer_contact_lookup('general')->>'error'='invalid_routing_key','arbitrary routes rejected');
 end $$;reset role;
 select pg_temp.check_lookup(not has_function_privilege('anon','public.prepare_trainer_contact_lookup(text)','EXECUTE') and not has_function_privilege('authenticated','public.prepare_trainer_contact_lookup(text)','EXECUTE'),'browser cannot mint signatures');`);
 console.log('Contact lookup: private signing, fresh timestamp, purpose, recipient snapshots and browser access verified.');
}finally{await exec('docker',['rm','-f',name]).catch(()=>{});}
