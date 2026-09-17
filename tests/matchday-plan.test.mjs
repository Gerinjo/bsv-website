import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { addDays, applyChangeovers, bookingTimes, clockLabel, matchRule, pitchBlocks, pitchSegments, timeMinutes } from '../src/utils/matchdayPlan.ts';
import { identifyPitch, loadMatchdaySchedule, matchdayScheduleWithFallback, parseClubPlan, parseMatchLocation } from '../src/utils/loadMatchdayPlan.ts';

const own = '011MICT8J8000000VTVG0001VTR8C1K7';
const guest = '011MID8TAS000000VTVG0001VTR8C1K7';
const e1 = '011MIF3MCC000000VTVG0001VTR8C1K7';
const e2 = '01DN9LCDA0000000VV0AG80NVSQ3PCMQ';
const third = '02M4CFOAB8000000VS5489B1VVVHS1D7';
const matchId = '031NRBVV2O000000VS5489BTVV1LNS7C';
const secondId = '031TP8CA14000000VS5489BTVT7QHFUC';
const groupId = '031T6JUML8000000VS5489BUVSORQI22-G';
const groupUrl = 'https://www.fussball.de/spieltag/-/spieldatum/2026-09-19/staffel/' + groupId;
const venue = 'Rasenplatz, Nebenpl. bei Nordst. Radolfz., Schlesierstr. 43, 78315 Radolfzell am Bodensee';
const club = (id, name) => '<a class="club-wrapper" href="/mannschaft/-/team-id/' + id + '"><div class="club-name">' + name + '</div></a>';
const row = (id = matchId, names = [[own, 'BSV Nordstern Radolfzell'], [guest, 'SV Bohlingen']], category = 'D-Junioren', competition = 'Bezirksliga', time = '10:00', status = '') =>
  '<tr class="row-headline"><td>Samstag, 19.09.2026 - ' + time + ' Uhr | ' + category + ' | ' + competition + '</td></tr><tr><td>'
  + names.map(([id, name]) => club(id, name)).join('') + '</td><td class="column-score">' + status + '</td><td class="column-detail"><a href="/spiel/-/spiel/' + id + '">Spiel</a></td></tr>';
const plan = (rows = row()) => '<div class="club-matchplan-table"><table><tbody>' + rows + '</tbody></table></div>';
const details = (names = [[own, 'BSV Nordstern Radolfzell'], [guest, 'SV Bohlingen']], location = venue, group = '', time = '10:00') =>
  '<title>Spiel - 19.09.2026</title><div class="stage-header"><a class="location">' + location + '</a>' + (group ? '<a class="competition" href="' + group + '">Spieltag 1</a>' : '') + '</div>'
  + names.map(([id, name]) => '<div class="team-name"><a href="/mannschaft/-/team-id/' + id + '">' + name + '</a></div>').join('')
  + '<input name="subject" value="Spiel am 19.09.2026 ' + time + '">';
const names = (...values) => values.map((name, i) => ({ id:String(i), name }));
const booking = (id, start, end, halves) => ({ id, start, end, halves, label:id });
const game = (id, kickoff, duration = 85, format = '11er', pitch = 'Hauptplatz', date = '2026-10-10') => ({
  id, label:id, kickoff, ...bookingTimes(kickoff,duration), format, halves:format === '7er' ? 1 : 2, pitch, date, notes:[],
});

test('equal team sizes need only 15 minutes after the preceding match, without changing kickoff or end', () => {
  const original = [game('C1','14:00'), game('Herren 1','16:00',105)];
  const result = applyChangeovers(original);
  assert.equal(original[1].start,930);
  assert.equal(result[1].start,940);
  assert.equal(result[1].kickoff,'16:00');
  assert.equal(result[1].end,1080);
  assert.ok(!pitchSegments(result).some((s)=>s.conflict));
  for (const format of ['7er','9er','11er']) {
    const pair = applyChangeovers([game('a','10:00',85,format),game('b','11:40',85,format)]);
    assert.equal(pair[0].end,pair[1].start);
  }
});

test('short turnarounds and actual overlapping games remain conflicts', () => {
  for (const next of ['11:20','11:30']) {
    const result=applyChangeovers([game('a','10:00'),game('b',next)]);
    assert.ok(pitchSegments(result).some((s)=>s.conflict));
  }
});

test('different sizes, other pitches, other dates and first matches retain standard buffers', () => {
  for (const next of [game('b','11:40',85,'9er'),game('b','11:40',85,'11er','Nebenplatz'),game('b','11:40',85,'11er','Hauptplatz','2026-10-11')]) {
    assert.deepEqual(applyChangeovers([game('a','10:00'),next])[1],next);
  }
  assert.deepEqual(applyChangeovers([game('a','10:00')])[0],game('a','10:00'));
  const gap=applyChangeovers([game('a','10:00'),game('b','15:00')]);
  assert.equal(gap[1].start,870);
});

test('half-pitch turnarounds use separate predecessors and never cross an intervening format', () => {
  const result=applyChangeovers([game('a','10:00',75,'7er'),game('b','11:30',75,'7er'),game('c','11:30',75,'7er')]);
  assert.equal(result[1].start,690);
  assert.equal(result[2].start,660);
  const both=applyChangeovers([game('a','10:00',75,'7er'),game('b','10:00',75,'7er'),game('c','11:30',75,'7er'),game('d','11:30',75,'7er')]);
  assert.equal(both[2].start,690);
  assert.equal(both[3].start,690);
  const mixed=applyChangeovers([game('a','09:00'),game('b','11:00',85,'9er'),game('c','12:40')]);
  assert.equal(mixed[2].start,730);
});

test('continuous booking blocks span unrelated time boundaries and never duplicate games', () => {
  const data=[booking('C1',810,940,2),booking('Herren 1',940,1080,2)];
  const timeline=pitchBlocks(data,[810,855,930,940,1080]);
  assert.equal(timeline.blocks.length,2);
  assert.deepEqual(timeline.blocks.map(({row,endRow,span})=>[row,endRow,span]),[[1,4,2],[4,5,2]]);
  const halves=pitchBlocks([booking('a',600,720,1),booking('b',660,780,1)],[600,660,720,780]);
  assert.deepEqual(halves.blocks.map((b)=>b.column),[0,1]);
  const conflict=pitchBlocks([booking('a',600,720,2),booking('b',690,780,2)],[600,690,720,780]);
  assert.equal(conflict.blocks.length,2);
  assert.ok(conflict.blocks.every((b)=>b.conflict));
  assert.deepEqual(conflict.blocks.map((b)=>b.column),[0,1]);
});

test('live C1 followed by Herren 1 is a single block each, without a false changeover conflict', () => {
  const data=JSON.parse(readFileSync(new URL('../src/data/matchdaySchedule.json',import.meta.url)));
  const games=applyChangeovers(data.bookings).filter((b)=>b.date==='2026-10-10'&&b.pitch==='Hauptplatz');
  assert.deepEqual(games.map((b)=>b.label),['C1','Herren 1']);
  assert.ok(!pitchSegments(games).some((s)=>s.conflict));
});

test('pitch rules honor D 7-a-side, C2 9-a-side and every whole-pitch age group', () => {
  for (const category of ['D-Junioren', 'D-Juniorinnen']) assert.deepEqual(matchRule(category, names('BSV', 'Gast')), { halves:1, format:'7er', duration:75 });
  assert.equal(matchRule('C-Junioren', names('BSV 2 (9er)', 'Gast')).halves, 2);
  for (const category of ['C-Junioren', 'B-Junioren', 'A-Junioren', 'Herren', 'Frauen']) assert.equal(matchRule(category, names('BSV', 'Gast')).halves, 2);
  assert.equal(matchRule('B-Junioren', names('BSV', 'Gast')).duration, 95);
  assert.equal(matchRule('A-Junioren', names('BSV', 'Gast')).duration, 105);
  assert.equal(matchRule('F-Junioren', names('BSV', 'Gast')), null);
});

test('girls use half a pitch when either side explicitly reports 7-a-side', () => {
  for (const category of ['C-Juniorinnen', 'B-Juniorinnen']) {
    for (const pair of [['BSV (9er)', 'Gast (7er)'], ['BSV (7er)', 'Gast (9er)'], ['BSV (7 er)', 'Gast']]) assert.equal(matchRule(category, names(...pair)).halves, 1);
    assert.equal(matchRule(category, names('BSV (9er)', 'Gast (9er)')).halves, 2);
    assert.equal(matchRule(category, names('BSV', 'FC 1907')).halves, 2);
  }
});

test('E four-team tournaments reserve 60 minutes plus the confirmed 30/15 minute buffers', () => {
  assert.deepEqual(matchRule('E-Junioren', [], true), { halves:1, format:'4er-Spieltag', duration:60 });
  assert.deepEqual(bookingTimes('10:00', 60), { start:570, end:675 });
  assert.deepEqual(bookingTimes('18:00', 75), { start:1050, end:1170 });
  assert.deepEqual(bookingTimes('', 75), { start:null, end:null });
  assert.equal(timeMinutes('25:00'), null);
  assert.equal(clockLabel(1445), '00:05 (+1)');
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
});

test('actual pitch detection distinguishes main, side, unspecified BSV and offsite venues', () => {
  assert.deepEqual(identifyPitch(venue), { bsv:true, pitch:'Nebenplatz' });
  assert.deepEqual(identifyPitch(venue.replace('Nebenpl.', 'Hauptplatz')), { bsv:true, pitch:'Hauptplatz' });
  assert.deepEqual(identifyPitch('Schlesierstr. 43, 78315 Radolfzell'), { bsv:true, pitch:null });
  assert.deepEqual(identifyPitch('Kunstrasenplatz, Strandbadstr. 39, 78315 Radolfzell'), { bsv:false, pitch:null });
  assert.deepEqual(identifyPitch(''), { bsv:false, pitch:null });
});

test('club parser preserves category, missing times, cancellation and real identities', () => {
  const parsed = parseClubPlan(plan(row() + row()));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].category, 'D-Junioren');
  assert.equal(parsed[0].time, '10:00');
  assert.equal(parseClubPlan(plan(row(matchId, undefined, undefined, undefined, '')))[0].time, '');
  assert.equal(parseClubPlan(plan(row(matchId, undefined, undefined, undefined, '10:00', 'Absetzung')))[0].cancelled, true);
  assert.throws(() => parseClubPlan('<html>error</html>'));
  assert.throws(() => parseClubPlan(plan().replace('19.09.2026', '31.09.2026')));
  assert.throws(() => parseClubPlan(plan().replace('10:00', '25:00')));
  assert.throws(() => parseClubPlan(plan() + '<a data-ajax-resource="matchplan.loadmore"></a>'));
  assert.throws(() => parseClubPlan(plan().replace('/spiel/-/', 'https://other.test/spiel/-/')));
  assert.deepEqual(parseClubPlan(plan('')), []);
});

test('detail parsing validates the fixture identity and date before accepting a venue', () => {
  const fixture = parseClubPlan(plan())[0];
  assert.equal(parseMatchLocation(details(), fixture).venue, venue);
  assert.throws(() => parseMatchLocation(details().replaceAll(own, e1), fixture));
  assert.throws(() => parseMatchLocation(details().replace('19.09.2026', '20.09.2026'), fixture));
  assert.throws(() => parseMatchLocation('<html>Unavailable</html>', fixture));
});

test('two halves fit, three halves conflict, and exact handovers do not overlap', () => {
  assert.ok(pitchSegments([booking('a', 600, 720, 1), booking('b', 600, 720, 1)]).every((s) => !s.conflict && s.lanes.every((l) => l.length === 1)));
  const segments = pitchSegments([booking('a', 600, 720, 2), booking('b', 690, 780, 1)]);
  assert.deepEqual(segments.filter((s) => s.conflict).map((s) => [s.start, s.end]), [[690, 720]]);
  assert.ok(pitchSegments([booking('a', 600, 720, 2), booking('b', 720, 780, 2)]).every((s) => !s.conflict));
  assert.equal(pitchSegments([booking('a',600,720,1),booking('b',600,720,1),booking('c',600,720,1)])[0].conflict,true);
  assert.equal(pitchSegments([], [600, 660])[0].active.length, 0);
});

test('loader reads every weekly window and excludes away/cancelled matches without inventing empty slots', async () => {
  const calls = [];
  const run = (location = venue, rows = row()) => loadMatchdaySchedule(new Date('2026-09-14T09:00:00Z'), async (url) => {
    calls.push(url);
    return new Response(url.includes('ajax.club.matchplan') ? plan(url.includes('/datum-von/2026-09-14/') ? rows : '') : details(undefined, location));
  });
  const data = await run();
  assert.equal(calls.filter((u) => u.includes('ajax.club.matchplan')).length, 8);
  assert.equal(data.through, '2026-11-08');
  assert.equal(data.bookings[0].pitch, 'Nebenplatz');
  assert.equal(data.bookings[0].start, 570);
  assert.equal((await run('Strandbadstr. 39, 78315 Radolfzell')).excludedAway, 1);
  assert.equal((await run('')).bookings[0].pitch, null);
  assert.equal((await run(venue, row(matchId, undefined, undefined, undefined, '', ''))).bookings[0].start, null);
  const cancelled = await run(venue, row(matchId, undefined, undefined, undefined, '10:00', 'Absetzung'));
  assert.equal(cancelled.cancelled, 1);
  assert.equal(cancelled.bookings.length, 0);
});

test('tournament counts once for E1 and E2, uses all pairings, and ignores cancelled early games', async () => {
  const ownPair = [[e1,'BSV'],[e2,'BSV 2']], otherPair = [[guest,'Gast'],[third,'Gast 2']];
  const group = '<table><tr><td>' + ownPair.map(([id,n])=>club(id,n)).join('') + '</td><td class="column-score">:</td><td class="column-detail"><a href="/spiel/-/spiel/' + matchId + '">Spiel</a></td></tr><tr><td>'
    + otherPair.map(([id,n])=>club(id,n)).join('') + '</td><td class="column-score">:</td><td class="column-detail"><a href="/spiel/-/spiel/' + secondId + '">Spiel</a></td></tr></table>';
  const run = (cancelEarly = false) => loadMatchdaySchedule(new Date('2026-09-14T09:00:00Z'), async (url) => {
    if (url.includes('ajax.club.matchplan')) return new Response(plan(url.includes('/datum-von/2026-09-14/') ? row(matchId,ownPair,'E-Junioren','Bezirksturnier','10:23') : ''));
    if (url.includes('/spieltag/')) return new Response(cancelEarly ? group.replaceAll('class="column-score">:', 'class="column-score">Absetzung').replace('class="column-score">Absetzung', 'class="column-score">:') : group);
    return new Response(url.endsWith(secondId) ? details(otherPair,venue,groupUrl,'10:00') : details(ownPair,venue,groupUrl,'10:23'));
  });
  const data = await run();
  assert.equal(data.bookings.length,1);
  assert.equal(data.bookings[0].label,'E1 + E2 · Spieltag');
  assert.equal(data.bookings[0].kickoff,'10:00');
  assert.equal(data.bookings[0].teams.length,4);
  assert.equal(data.bookings[0].halves,1);
  assert.equal((await run(true)).bookings[0].kickoff,'10:23');
});

test('upstream failure keeps the original snapshot and timestamp, never a fresh-looking empty plan', async () => {
  const fallback={version:1,checkedAt:'2026-09-13T09:00:00Z',from:'2026-09-13',through:'2026-11-07',bookings:[],excludedAway:0,cancelled:0};
  const result=await matchdayScheduleWithFallback(fallback,new Date('2026-09-14T09:00:00Z'),async()=>new Response('',{status:503}));
  assert.equal(result.stale,true);
  assert.strictEqual(result.schedule,fallback);
  await assert.rejects(loadMatchdaySchedule(new Date('2026-09-14T09:00:00Z'),async()=>new Response(plan())));
});

test('verified live snapshot includes all BSV E home days once and distinguishes 7er/9er girls', () => {
  const data=JSON.parse(readFileSync(new URL('../src/data/matchdaySchedule.json',import.meta.url)));
  assert.equal(data.bookings.length,55);
  assert.equal(new Set(data.bookings.map((b)=>b.id)).size,55);
  assert.equal(data.bookings.filter((b)=>b.format==='4er-Spieltag').length,6);
  const shared=data.bookings.filter((b)=>b.date==='2026-10-24'&&b.format==='4er-Spieltag');
  assert.equal(shared.length,1);
  assert.equal(shared[0].label,'E1 + E2 · Spieltag');
  assert.equal(shared[0].halves,1);
  const girls=data.bookings.filter((b)=>b.label==='B-Juniorinnen');
  assert.equal(girls.find((b)=>b.date==='2026-09-19').halves,1);
  assert.equal(girls.find((b)=>b.date==='2026-10-03').halves,2);
  assert.ok(data.bookings.every((b)=>b.venue.includes('Schlesierstr. 43')));
});
