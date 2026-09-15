import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { bookingTimes, pitchSegments } from '../src/utils/matchdayPlan.ts';
import { planWithPitchReservations, recurringPitchBookings } from '../src/utils/pitchReservations.ts';

const from = '2026-09-20';
const game = (id, kickoff, pitch = 'Nebenplatz', halves = 2, duration = 85) => ({
  id, date:from, kickoff, ...bookingTimes(kickoff,duration), pitch, halves,
  venue:'Original venue: ' + pitch, label:id, teams:[], category:'C-Junioren',
  format:halves === 1 ? '7er' : '11er', url:'https://www.fussball.de/spiel/' + id,
  preliminary:false, notes:[],
});
const plan = (games) => planWithPitchReservations(games,from,from);

test('recurring archery reserves the whole side pitch on Friday and Sunday, without football buffers', () => {
  const dates=recurringPitchBookings('2026-10-23','2026-10-26');
  assert.deepEqual(dates.map(b=>[b.date,b.start,b.end]),[['2026-10-23',1050,1140],['2026-10-25',600,720]]);
  assert.ok(dates.every(b=>b.pitch==='Nebenplatz'&&b.halves===2&&b.kind==='fixed'));
  assert.deepEqual(recurringPitchBookings('2026-09-21','2026-09-24'),[]);
});

test('a conflicting game is shown on the main pitch as an unconfirmed proposal, preserving the source', () => {
  const original=game('a','11:00'); const before=structuredClone(original);
  const result=plan([original]); const moved=result.find(b=>b.id==='a');
  assert.equal(moved.pitch,'Hauptplatz'); assert.equal(moved.relocation,'suggested');
  assert.equal(moved.venue,original.venue); assert.equal(moved.url,original.url);
  assert.equal(moved.kickoff,original.kickoff); assert.equal(moved.end,original.end);
  assert.deepEqual(original,before);
  assert.equal(result.find(b=>b.kind==='fixed').pitch,'Nebenplatz');
});

test('warm-up and cooldown overlaps count, but exact handovers at 10 and 12 do not', () => {
  assert.equal(plan([game('a','12:15')]).find(b=>b.id==='a').relocation,'suggested');
  assert.equal(plan([game('a','08:30')]).find(b=>b.id==='a').relocation,'suggested');
  for(const kickoff of ['08:20','12:30']) assert.equal(plan([game('a',kickoff)]).find(b=>b.id==='a').relocation,undefined);
});

test('an occupied main pitch leaves the source booking visibly unresolved', () => {
  const result=plan([game('a','11:00'),game('b','11:00','Hauptplatz')]);
  assert.equal(result.find(b=>b.id==='a').relocation,'blocked');
  assert.equal(result.find(b=>b.id==='a').pitch,'Nebenplatz');
  assert.ok(pitchSegments(result.filter(b=>b.pitch==='Nebenplatz')).some(s=>s.conflict));
});

test('main-pitch capacity includes previously proposed moves and half-pitch games', () => {
  const result=plan([game('a','11:00','Nebenplatz',1),game('b','11:00','Nebenplatz',1),game('c','11:00','Nebenplatz',1)]);
  assert.equal(result.filter(b=>b.relocation==='suggested').length,2);
  assert.equal(result.filter(b=>b.relocation==='blocked').length,1);
  assert.ok(!pitchSegments(result.filter(b=>b.pitch==='Hauptplatz')).some(s=>s.conflict));
  const shared=plan([game('a','11:00','Nebenplatz',1),game('b','11:00','Hauptplatz',1)]);
  assert.equal(shared.find(b=>b.id==='a').relocation,'suggested');
});

test('proposed main-pitch bookings use the existing 15-minute equal-strength changeover rule', () => {
  const result=plan([game('a','11:40'),game('b','10:00','Hauptplatz')]);
  const moved=result.find(b=>b.id==='a');
  assert.equal(moved.relocation,'suggested'); assert.equal(moved.start,700);
  assert.ok(!pitchSegments(result.filter(b=>b.pitch==='Hauptplatz')).some(s=>s.conflict));
});

test('unknown times or venues do not result in an unsupported free-main-pitch claim', () => {
  for(const uncertain of [{...game('b','11:00'),pitch:null},{...game('b','11:00','Hauptplatz'),kickoff:'',start:null,end:null}]) {
    assert.equal(plan([game('a','11:00'),uncertain]).find(b=>b.id==='a').relocation,'blocked');
  }
});

test('fixed occupancy interrupts football changeovers and remains visible with no games', () => {
  const result=plan([game('a','08:20'),game('b','12:30')]);
  assert.equal(result.find(b=>b.id==='b').start,720);
  assert.equal(plan([]).length,1);
  assert.equal(plan([])[0].label,'Bogensport');
});

test('the weekly plan uses the same fixed reservations and includes Sundays independently of football sessions', () => {
  const source=readFileSync(new URL('../src/pages/fussball/belegungsplan.astro',import.meta.url),'utf8');
  assert.match(source,/import \{ pitchReservations \}/);
  assert.match(source,/const dayOrder = .*'Sonntag'/);
  assert.match(source,/const allBsvSessions = \[\.\.\.bsvSessions, \.\.\.fixedSessions\]/);
  assert.match(source,/findTrainingConflicts\(allBsvSessions\)/);
  assert.doesNotMatch(source,/day === 'Freitag' && pitch === 'Nebenplatz'/);
});
