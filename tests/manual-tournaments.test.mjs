import assert from 'node:assert/strict';
import test from 'node:test';
import { gTournamentSchedule as schedule } from '../src/data/gTournamentSchedule.ts';
import { manualTournamentBookings } from '../src/utils/manualTournamentPlan.ts';
import { isBsvHomeTournament, tournamentScheduleWithFallback } from '../src/utils/tournamentDays.ts';
import { planWithPitchReservations } from '../src/utils/pitchReservations.ts';
import { pitchSegments } from '../src/utils/matchdayPlan.ts';
import { fTournamentSchedules } from '../src/data/fTournamentSchedules.ts';
import { readFileSync } from 'node:fs';

test('G teams share the five supplied dates, starts, hosts and eight participants', () => {
  assert.deepEqual(schedule.days.map((d) => [d.date, d.firstTeamKickoff, d.host]), [
    ['2026-09-27', '09:30', 'FC Böhringen'],
    ['2026-10-04', '10:00', 'FC 03 Radolfzell'],
    ['2026-10-11', '09:00', 'BSV Nordstern Radolfzell'],
    ['2026-10-18', '11:00', 'FC Öhningen'],
    ['2026-10-24', '09:00', 'SV Gaienhofen'],
  ]);
  assert.ok(schedule.days.every((d) => d.teams.length === 8 && schedule.ownTeamIds.every((id) => d.teams.some((t) => t.id === id))));
  assert.deepEqual(schedule.days.filter(isBsvHomeTournament).map((d) => d.date), ['2026-10-11']);
});

test('manual group plan is never overwritten by automatic FUSSBALL.DE refresh', async () => {
  const result = await tournamentScheduleWithFallback(schedule, () => assert.fail('Must not fetch a manual schedule'));
  assert.equal(result.schedule, schedule);
  assert.equal(result.stale, false);
});

test('shared G home event reserves half the main pitch once from 08:30 to 11:15', () => {
  const bookings = manualTournamentBookings([schedule, schedule], '2026-09-01', '2026-11-01');
  assert.equal(bookings.length, 1);
  assert.equal(bookings[0].label, 'G1 + G2 · Spieltag');
  assert.equal(bookings[0].pitch, 'Hauptplatz');
  assert.equal(bookings[0].halves, 1);
  assert.equal(bookings[0].start, 510);
  assert.equal(bookings[0].end, 675);
  assert.equal(bookings[0].source, 'club');
  assert.equal(manualTournamentBookings([schedule], '2026-10-12', '2026-11-01').length, 0);
  assert.equal(manualTournamentBookings([schedule], '2026-09-01', '2026-10-10').length, 0);
  assert.equal(manualTournamentBookings([{ ...schedule, days: schedule.days.map((d) => ({ ...d, cancelled: true })) }], '2026-09-01', '2026-11-01').length, 0);
});

test('F tournaments also last 120 minutes plus 30/15 buffers, with explicit pitch allocation', () => {
  const [booking] = manualTournamentBookings([{ ...schedule, category: 'F-Junioren', label: 'F1 + F2', homePitch: 'Nebenplatz', halves: 2 }], '2026-10-11', '2026-10-11');
  assert.equal(booking.end - booking.start, 165);
  assert.equal(booking.halves, 2);
  assert.equal(booking.pitch, 'Nebenplatz');
});

test('G home event counts towards capacity and remains separate from Sunday archery', () => {
  const matches = manualTournamentBookings([schedule], '2026-10-11', '2026-10-11');
  const planned = planWithPitchReservations(matches, '2026-10-11', '2026-10-11');
  assert.equal(planned.length, 2);
  assert.equal(planned.find((b) => b.kind === 'fixed').pitch, 'Nebenplatz');
  assert.equal(planned.find((b) => b.source === 'club').relocation, undefined);
  const main = planned.filter((b) => b.pitch === 'Hauptplatz');
  assert.ok(!pitchSegments(main).some((s) => s.conflict));
  assert.ok(pitchSegments([...main, { ...main[0], id: 'another-game', halves: 2 }]).some((s) => s.conflict));
});

test('F plans transcribe the three groups without duplicating the newer group 10 sheet', () => {
  assert.deepEqual(fTournamentSchedules.map((s) => [s.label, s.days.length, s.days[0].teams.length]), [['F1', 5, 7], ['F2', 4, 8], ['F3', 5, 7]]);
  assert.deepEqual(fTournamentSchedules.map((s) => s.days.map((d) => [d.date, d.firstTeamKickoff])), [
    [['2026-09-27','10:00'], ['2026-10-04','13:30'], ['2026-10-10','09:00'], ['2026-10-18',''], ['2026-10-24','12:00']],
    [['2026-09-19','15:30'], ['2026-09-27','12:30'], ['2026-10-10','12:00'], ['2026-10-25','13:30']],
    [['2026-09-27','11:00'], ['2026-10-04','13:00'], ['2026-10-10','15:00'], ['2026-10-17','10:00'], ['2026-10-31','']],
  ]);
  assert.equal(fTournamentSchedules[1].checkedAt.slice(0,10), '2026-09-13');
  assert.equal(new Set(fTournamentSchedules.map((s) => s.sectionId)).size, 3);
  assert.ok(fTournamentSchedules.every((s) => s.days.filter(isBsvHomeTournament).length === 1));
});

test('three F home tournaments are separate 165-minute bookings, with correct team-page anchors', () => {
  const bookings = manualTournamentBookings(fTournamentSchedules, '2026-10-10', '2026-10-10');
  assert.deepEqual(bookings.map((b) => [b.label, b.start, b.end]), [['F1 · Spieltag',510,675], ['F2 · Spieltag',690,855], ['F3 · Spieltag',870,1035]]);
  assert.equal(bookings[1].url, '/jugend/u8-f#spieltage-f2');
  assert.equal(bookings[2].url, '/jugend/u8-f#spieltage-f3');
  assert.ok(bookings.every((b) => !b.notes.join(' ').includes('Gemeinsamer Spieltag')));
  assert.ok(bookings.every((b) => b.pitch === null && b.notes.some((note) => note.includes('noch zu bestätigen'))));
});

test('F bookings participate in capacity checks against the existing matches', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/matchdaySchedule.json', import.meta.url)));
  const added = manualTournamentBookings(fTournamentSchedules.map((s) => ({ ...s, homePitch: 'Hauptplatz', halves: 1 })), '2026-10-10', '2026-10-10');
  const planned = planWithPitchReservations([...data.bookings, ...added], data.from, data.through);
  const main = planned.filter((b) => b.date === '2026-10-10' && b.pitch === 'Hauptplatz');
  const conflicts = pitchSegments(main).filter((s) => s.conflict);
  assert.ok(conflicts.some((s) => s.active.some((b) => b.label === 'F2 · Spieltag') && s.active.some((b) => b.label === 'C1')));
  assert.ok(conflicts.some((s) => s.active.some((b) => b.label === 'F3 · Spieltag') && s.active.some((b) => b.label === 'Herren 1')));
});

test('unknown manual home kickoff remains pending instead of inventing midnight', () => {
  const incomplete = { ...fTournamentSchedules[0], days: [{ ...fTournamentSchedules[0].days[2], firstTeamKickoff: '' }] };
  const [booking] = manualTournamentBookings([incomplete], '2026-10-10', '2026-10-10');
  assert.equal(booking.start, null);
  assert.equal(booking.end, null);
});
