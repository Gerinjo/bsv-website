import test from 'node:test';import assert from 'node:assert/strict';
import {resolveContactRecipients} from '../supabase/functions/contact-request/recipients.mjs';
const lookup={payload:{purpose:'trainer-contact',routingKey:'team--jugend--u15-c1',requestedAt:'2026-10-13T08:00:00Z'},signature:'a'.repeat(64)};
const db={rpc:async()=>({data:lookup}),from(){throw new Error('managed team must not use the old contact list');}};
test('each submission resolves the current trainer addresses and never uses a removed contact as fallback',async()=>{
 let emails=['old@example.test'];const fetcher=async(url,options)=>{assert.match(url,/trainer-contact-recipients$/);assert.equal(options.headers['x-bsv-contact-signature'],lookup.signature);assert.equal(options.headers['x-bsv-onboarding-secret'],undefined);assert.deepEqual(JSON.parse(options.body),lookup.payload);return Response.json({ok:true,managed:true,label:'C1',emails});};
 const resolve=()=>resolveContactRecipients({db,routingKey:'team--jugend--u15-c1',fetcher});
 assert.deepEqual((await resolve()).emails,['old@example.test']);emails=['new@example.test','NEW@example.test','co@example.test'];assert.deepEqual((await resolve()).emails,['new@example.test','co@example.test']);emails=[];assert.deepEqual((await resolve()).emails,[]);
});
test('bridge outage, expired signatures and malformed responses fail without sending to a stale trainer',async()=>{
 for(const fetcher of [async()=>{throw new Error('offline');},async()=>Response.json({error:'expired_lookup'},{status:401}),async()=>Response.json({ok:true,managed:true,label:'C1',emails:['bad']}),async()=>Response.json({ok:true,managed:true,label:'C1',emails:null}),async()=>Response.json({ok:true}),async()=>Response.json({ok:true,managed:true,emails:[]})])await assert.rejects(()=>resolveContactRecipients({db,routingKey:'team--jugend--u15-c1',fetcher}),e=>e.status===503);
 await assert.rejects(()=>resolveContactRecipients({db:{rpc:async()=>({error:{}})},routingKey:'team--jugend--u15-c1'}),e=>e.status===503);
});
test('person links resolve trainer profiles; other functions retain all configured recipients',async()=>{
 assert.deepEqual((await resolveContactRecipients({db,routingKey:'person-ole-schmal',fetcher:async()=>Response.json({ok:true,managed:true,label:'Ole',emails:['current@example.test']})})).emails,['current@example.test']);
 const calls=[];const query={select(value){calls.push(value);return this;},eq(){return this;},maybeSingle:async()=>({data:{email:'Primary@Example.test',weitere_emails:['other@example.test','primary@example.test'],bezeichnung:'General'}})};
 const staticDb={from(name){assert.equal(name,'contact_empfaenger');return query;},rpc:async()=>({data:lookup})};
 assert.deepEqual((await resolveContactRecipients({db:staticDb,routingKey:'general'})).emails,['primary@example.test','other@example.test']);
 assert.deepEqual((await resolveContactRecipients({db:staticDb,routingKey:'person-board',fetcher:async()=>Response.json({ok:true,managed:false})})).emails,['primary@example.test','other@example.test']);assert.match(calls[0],/weitere_emails/);
});
