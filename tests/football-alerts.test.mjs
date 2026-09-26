import assert from 'node:assert/strict';
import test from 'node:test';
import { collectFootballAlerts, refereeCandidates, youthTrainingSessions, alertTeams } from '../supabase/functions/football-alerts/rules.ts';
import { parseRefereeStatus, loadFootballAlertSources } from '../supabase/functions/football-alerts/sources.ts';
import { footballAlertEmail } from '../supabase/functions/football-alerts/emails.mjs';
import { deliverFootballAlerts, sha256 } from '../supabase/functions/football-alerts/workflow.mjs';

const now = new Date('2026-09-28T08:00:00Z');
const session = { path: 'jugend/u13-d3', team: 'D3-Junioren', day: 'Mittwoch', time: '17:30 – 19:00 Uhr', pitch: 'Hauptplatz' };
const booking = { id:'match', date:'2026-09-30', kickoff:'18:00', start:1050, end:1170, pitch:'Hauptplatz', teams:[{name:'BSV'},{name:'Gast'}], category:'D-Junioren', url:'https://www.fussball.de/spiel/-/spiel/031P25NKVC000000VS5489BUVSV0FPBG', notes:[], preliminary:false };
const boy = alertTeams.find(team=>team.path==='jugend/u13-d3');
const girl = alertTeams.find(team=>team.path==='jugend/juniorinnen/u15');
const fixture = { id:booking.id, date:booking.date, time:'18:00', category:'D-Junioren', competition:'Bezirksliga', teams:[{id:boy.teamId,name:'BSV'},{id:'other',name:'Gast'}],url:booking.url,cancelled:false,preliminary:false };
const alertsFor = (bookings=[booking], sessions=[session])=>collectFootballAlerts({bookings, sessions,referees:[],now});
const refereeAlerts = (entry=fixture,state='missing',date=now)=>collectFootballAlerts({bookings:[],referees:[{fixture:entry,state}],now:date});

test('warns every youth training group on the same pitch, including half-field games',()=>{
 const alerts=alertsFor([{...booking,halves:1}], [session,{...session,path:'jugend/u13-d2',team:'D2-Junioren'}]);
 assert.equal(alerts.length,2);
 assert.equal(alerts[0].bookingTime,'17:30–19:30 Uhr');
 assert.equal(alerts[0].routingKey,'team--jugend--u13-d3');
});

test('training overlap includes warm-up, but excludes touching intervals, other pitches and other days',()=>{
 assert.equal(alertsFor([{...booking,kickoff:'19:00',start:1110,end:1260}]).length,1);
 for(const change of [{start:1140},{end:1050},{pitch:'Nebenplatz'},{date:'2026-10-01'}]) assert.equal(alertsFor([{...booking,...change}]).length,0);
});

test('unknown, preliminary, fixed and suggested bookings never create misleading warnings',()=>{
 for(const change of [{start:null},{end:null},{pitch:null},{kickoff:''},{preliminary:true},{kind:'fixed'},{relocation:'suggested'}]) assert.equal(alertsFor([{...booking,...change}]).length,0);
 assert.equal(alertsFor([booking],[{...session,time:'nach Absprache'}]).length,0);
 assert.equal(alertsFor([booking],[{...session,path:'fussball/herren/bezirksliga'}]).length,0);
});

test('planned club tournaments count as bookings and keep their own details link',async()=>{
 const alerts=alertsFor([{...booking,source:'club',preliminary:true,url:'/jugend/u7-g#spieltage'}]);
 assert.equal(alerts.length,1);
 assert.match(footballAlertEmail(alerts[0],['coach@example.test']).text,/Spieldetails: https:\/\/bsvnordstern.de\/jugend\/u7-g#spieltage/);
 // The local club plan remains usable even when FUSSBALL.DE is unavailable.
 const at=new Date('2026-10-01T08:00:00Z');
 const data=await loadFootballAlertSources(at,async()=>new Response('Unavailable',{status:503}));
 assert.equal(data.bookings.filter(b=>b.source==='club').length,4);
 assert.equal(collectFootballAlerts({...data,now:at,sessions:[{...session,day:'Sonntag',time:'09:00 – 11:00 Uhr'}]}).length,1);
});

test('expired overlaps and dates beyond the 14-day horizon are excluded',()=>{
 assert.equal(alertsFor([{...booking,date:'2026-10-14'}]).length,0);
 assert.equal(collectFootballAlerts({bookings:[booking],sessions:[session],referees:[],now:new Date('2026-09-30T17:00:00Z')}).length,0);
 assert.equal(collectFootballAlerts({bookings:[booking],sessions:[session],referees:[],now:new Date('2026-09-30T16:59:00Z')}).length,1);
});

test('the shared production training plan excludes away grounds and includes goalkeeper training',()=>{
 const sessions=youthTrainingSessions();
 assert.ok(sessions.every(s=>s.path.startsWith('jugend/')));
 assert.ok(!sessions.some(s=>s.path==='jugend/u19'&&s.day==='Donnerstag'));
 assert.ok(!sessions.some(s=>s.path==='jugend/u11-e1'&&s.day==='Donnerstag'));
 const keeper=alertsFor([{...booking,pitch:'Nebenplatz'}],sessions).find(a=>a.teamPath==='jugend/torwarttraining');
 assert.equal(keeper.routingKey,'goalkeeping');
 assert.ok(!alertsFor([{...booking,pitch:'Hauptplatz'}],sessions).some(a=>a.team==='Torwarttraining · 5-m-Tor'));
});

test('unchanged conflicts have stable identities, while a rescheduled game is a new warning',()=>{
 const original=alertsFor()[0];
 assert.equal(alertsFor()[0].identity,original.identity);
 assert.notEqual(alertsFor([{...booking,kickoff:'18:30'}])[0].identity,original.identity);
 assert.equal(alertsFor([booking,booking]).length,1);
});

test('referee warnings apply to D–A junior boys home games, including the partner club home grounds',()=>{
 for(const team of alertTeams.filter(t=>!t.path.includes('juniorinnen'))) {
  const category=team.label.startsWith('A')?'A-Junioren':team.label.startsWith('B')?'B-Junioren':team.label.startsWith('C')?'C-Junioren':'D-Junioren';
  const entry={...fixture,category,teams:[{id:team.teamId,name:'SG Markelfingen'},fixture.teams[1]]};
  assert.equal(refereeAlerts(entry).length,1,team.label);
 }
 assert.equal(refereeAlerts({...fixture,teams:[fixture.teams[1],fixture.teams[0]]}).length,0);
 for(const category of ['E-Junioren','F-Junioren','Herren','Frauen']) assert.equal(refereeAlerts({...fixture,category}).length,0);
});

test('junior girls only receive missing-referee warnings for cup home matches',()=>{
 for(const competition of ['Bezirksliga','Freundschaftsspiel'])assert.equal(refereeAlerts({...fixture,category:'C-Juniorinnen',competition,teams:[{id:girl.teamId,name:'BSV'},fixture.teams[1]]}).length,0);
 for(const competition of ['Bezirkspokal','SBFV-Verbandspokal'])assert.equal(refereeAlerts({...fixture,category:'C-Juniorinnen',competition,teams:[{id:girl.teamId,name:'BSV'},fixture.teams[1]]}).length,1);
});

test('check occurs exactly two Berlin calendar days before the game, across DST and midnight',()=>{
 for(const [at,date] of [['2026-09-28T22:05:00Z','2026-10-01'],['2026-10-23T08:00:00Z','2026-10-25'],['2026-03-27T08:00:00Z','2026-03-29']]) assert.equal(refereeAlerts({...fixture,date},'missing',new Date(at)).length,1);
 for(const date of ['2026-09-29','2026-10-01'])assert.equal(refereeAlerts({...fixture,date}).length,0);
});

test('assigned or unknown referees, cancellations and preliminary fixtures cause no mail',()=>{
 for(const state of ['assigned','unknown'])assert.equal(refereeAlerts(fixture,state).length,0);
 for(const change of [{cancelled:true},{preliminary:true}])assert.equal(refereeCandidates([{...fixture,...change}],now).length,0);
});

const refereePage = (row)=>`<nav>Schiedsrichter: Niemand</nav><div class="stage-header"></div><div class="team-name"></div><div class="team-name"></div><ul class="stage-meta-left">${row}</ul>`;
test('referee parser distinguishes blank and obfuscated assignments from unavailable data',()=>{
 assert.equal(parseRefereeStatus(refereePage('<li><span>Schiedsrichter:</span><span data-obfuscation="abc"> </span></li>')),'missing');
 assert.equal(parseRefereeStatus(refereePage('<li><span>Schiedsrichter:</span><span>\uE900\uE910</span></li>')),'assigned');
 assert.equal(parseRefereeStatus(refereePage('<li><span>Schiedsrichter:</span><a href="/schiedsrichterprofil/-/userid/abc">Person</a></li>')),'assigned');
 assert.equal(parseRefereeStatus(refereePage('<li><span>Schiedsrichter:</span><span>Datenschutz: nicht veröffentlicht</span></li>')),'unknown');
 assert.equal(parseRefereeStatus(refereePage('<li><span>Assistenten:</span><span>Person</span></li>')),'unknown');
 assert.equal(parseRefereeStatus(refereePage('<li><span>Schiedsrichter:</span></li>')),'unknown');
 assert.equal(parseRefereeStatus('<h1>Service unavailable</h1>'),'unknown');
});

test('source outages cannot generate missing-referee or training warnings',async()=>{
 const data=await loadFootballAlertSources(now,async()=>new Response('Unavailable',{status:503}));
 assert.equal(collectFootballAlerts({...data,now}).length,0);
 assert.deepEqual([...data.issues].sort(),['referee_schedule_unavailable','training_schedule_unavailable']);
});

test('email explains reorganization, escapes external labels and does not invent a booking change',()=>{
 const alert={...alertsFor()[0],matchLabel:'BSV <script>alert(1)</script> – Gast',url:'javascript:alert(1)'};
 const mail=footballAlertEmail(alert,['coach@example.test']);
 assert.match(mail.text,/organisiert euer Training gegebenenfalls um/);
 assert.match(mail.text,/ändert keine Buchung/);
 assert.doesNotMatch(mail.html,/<script>|javascript:/);
 assert.match(mail.html,/&lt;script&gt;/);
 assert.match(footballAlertEmail(refereeAlerts()[0],['coach@example.test']).text,/Heimspiel in zwei Tagen/);
});

const recipients=[{schluessel:'team--jugend--u13-d3',aktiv:true,email:'COACH@example.test',weitere_emails:['assistant@example.test','coach@example.test']}];
function deliveryHarness() {
 const records=new Map(),accepted=new Map();let sends=0,failBefore=false,failAfter=false;
 const store={
  async claim(alert,key,mode,message) {const id=key+mode;const existing=records.get(id);if(existing?.status==='sent'||existing?.status==='sending')return null;const row={...(existing??{id,message,lease_id:'lease'}),status:'sending'};records.set(id,row);return row;},
  async sent(row) { if(failAfter){failAfter=false;throw Error('db failure');}row.status='sent'; },
  async failed(row) {row.status='failed';},
 };
 const send=async(message,options)=>{sends++;if(failBefore){failBefore=false;throw Error('network failure');}accepted.set(options.idempotencyKey,message);return {id:'provider-id'};};
 return {store,send,records,accepted,get sends(){return sends;},set failBefore(value){failBefore=value;},set failAfter(value){failAfter=value;}};
}

test('dry run resolves primary and additional coaches but performs no write or email',async()=>{
 const harness=deliveryHarness();const result=await deliverFootballAlerts({alerts:alertsFor(),recipients,...harness,mode:'live',dryRun:true});
 assert.equal(result.previews[0].recipientCount,2);assert.equal(harness.records.size,0);assert.equal(harness.sends,0);
 assert.ok(!JSON.stringify(result).includes('@'));
});

test('repeated and concurrent runs deliver a warning only once',async()=>{
 const harness=deliveryHarness(),args={alerts:alertsFor(),recipients,...harness,mode:'live'};
 await Promise.all([deliverFootballAlerts(args),deliverFootballAlerts(args)]);await deliverFootballAlerts(args);
 assert.equal(harness.sends,1);assert.equal(harness.accepted.size,1);
 assert.deepEqual([...harness.accepted.values()][0].to,['coach@example.test','assistant@example.test']);
});

test('a retry freezes its first payload and reuses the same provider key after a lost database acknowledgement',async()=>{
 const harness=deliveryHarness();harness.failAfter=true;
 const args={alerts:alertsFor(),recipients,...harness,mode:'live'};
 assert.equal((await deliverFootballAlerts(args)).failed,1);
 const retry={...args,alerts:[{...args.alerts[0],matchLabel:'Changed opponent spelling'}]};
 assert.equal((await deliverFootballAlerts(retry)).sent,1);
 assert.equal(harness.sends,2);assert.equal(harness.accepted.size,1);
 assert.doesNotMatch([...harness.accepted.values()][0].text,/Changed opponent/);
});

test('test sends cannot consume a future live notification',async()=>{
 const harness=deliveryHarness();const args={alerts:alertsFor(),recipients,...harness};
 await deliverFootballAlerts({...args,mode:'test'});await deliverFootballAlerts({...args,mode:'live'});
 assert.equal(harness.accepted.size,2);
});

test('unconfigured, invalid and disabled trainer contacts never fall back to arbitrary recipients',async()=>{
 for(const rows of [[],[{...recipients[0],aktiv:false}],[{...recipients[0],email:'not-an-email'}]]) {
  const harness=deliveryHarness();const result=await deliverFootballAlerts({alerts:alertsFor(),recipients:rows,...harness,mode:'live'});
  assert.deepEqual(result.missingRecipients,['team--jugend--u13-d3']);assert.equal(harness.sends,0);
 }
});

test('storage failure and exhausted runtime budget prevent delivery',async()=>{
 const harness=deliveryHarness();const args={alerts:alertsFor(),recipients,...harness,mode:'live'};
 const result=await deliverFootballAlerts({...args,store:{claim:async()=>{throw Error('DB down');}}});
 assert.equal(result.failed,1);assert.equal(harness.sends,0);
 assert.equal((await deliverFootballAlerts({...args,deadline:0})).skipped,1);assert.equal(harness.sends,0);
 assert.match(await sha256('test'),/^[a-f0-9]{64}$/);
});
