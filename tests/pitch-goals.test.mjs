import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { bookingTimes, fiveMeterGoals, pitchGoalSegments, pitchGoalStock, pitchSegments } from '../src/utils/matchdayPlan.ts';
import { applyMatchdayAdjustments } from '../src/utils/matchdayAdjustments.ts';
import { planWithPitchReservations } from '../src/utils/pitchReservations.ts';
import { manualTournamentBookings } from '../src/utils/manualTournamentPlan.ts';
import { fTournamentSchedules } from '../src/data/fTournamentSchedules.ts';

const game = (id, category, pitch = 'Nebenplatz', kickoff = '12:00') => ({
  id, date: '2026-09-20', kickoff, ...bookingTimes(kickoff, 120),
  pitch, label: id, category, halves: 1, teams: [], venue: pitch,
  format: category.startsWith('E-') ? '4er-Spieltag' : category.startsWith('D-') ? '7er' : 'Fair-Play-Spieltag',
  url: '', preliminary: false, notes: [],
});
const snapshot = () => JSON.parse(readFileSync(new URL('../src/data/matchdaySchedule.json', import.meta.url)));

test('goal stock is local to each pitch; E/F require four, D including girls two', () => {
  assert.deepEqual(pitchGoalStock, { Hauptplatz: 4, Nebenplatz: 6 });
  for (const category of ['E-Junioren', 'F-Junioren']) assert.equal(fiveMeterGoals(game('a', category)), 4);
  for (const category of ['D-Junioren', 'D-Juniorinnen']) assert.equal(fiveMeterGoals(game('a', category)), 2);
  assert.equal(fiveMeterGoals({ ...game('a', 'E-Junioren'), label: 'E1 + E2 · Spieltag' }), 4);
  assert.equal(fiveMeterGoals({ ...game('a', 'E-Junioren'), kind: 'fixed' }), 0);
});

test('half-pitch E and F can fit spatially but have insufficient goals; no pooling between pitches', () => {
  const events = [game('E', 'E-Junioren'), game('F', 'F-Junioren')];
  assert.ok(!pitchSegments(events).some((s) => s.conflict));
  assert.ok(pitchGoalSegments(events, 'Nebenplatz').some((s) => s.conflict && s.needed === 8 && s.available === 6));
  const split = [events[0], { ...events[1], pitch: 'Hauptplatz' }];
  assert.ok(!pitchGoalSegments(split, 'Nebenplatz').some((s) => s.conflict));
  assert.ok(!pitchGoalSegments(split, 'Hauptplatz').some((s) => s.conflict));
  const six = [game('F', 'F-Junioren'), game('D', 'D-Junioren')];
  assert.ok(!pitchGoalSegments(six, 'Nebenplatz').some((s) => s.conflict));
  assert.ok(pitchGoalSegments(six.map((b) => ({ ...b, pitch: 'Hauptplatz' })), 'Hauptplatz').some((s) => s.conflict));
});

test('goal reservations include buffers, but exact handovers and separate dates do not overlap', () => {
  const a = game('a', 'F-Junioren');
  const b = { ...game('b', 'F-Junioren'), start: a.end, end: a.end + 120 };
  assert.ok(!pitchGoalSegments([a, b], 'Nebenplatz').some((s) => s.conflict));
  assert.ok(pitchGoalSegments([a, { ...b, start: a.end - 1 }], 'Nebenplatz').some((s) => s.conflict));
  assert.ok(!pitchGoalSegments([{ ...a, start: null, end: null }], 'Nebenplatz').some((s) => s.conflict));
  assert.ok(!pitchGoalSegments([a, { ...a, id: 'tomorrow', date: '2026-09-21' }], 'Nebenplatz').some((s) => s.conflict));
});

test('all old cached E bookings get one hour while F and G keep two hours', () => {
  const input = [game('e', 'E-Junioren'), game('f', 'F-Junioren'), game('g', 'G-Junioren')];
  const copy = structuredClone(input);
  const adjusted = applyMatchdayAdjustments(input);
  assert.deepEqual(adjusted.map((b) => b.end - b.start), [105, 165, 165]);
  assert.deepEqual(input, copy);
  assert.deepEqual(applyMatchdayAdjustments(adjusted), adjusted);
  const unknown = applyMatchdayAdjustments([{ ...input[0], kickoff: '' }])[0];
  assert.equal(unknown.start, null);
  assert.equal(unknown.end, null);
});

test('October 10 overrides preserve source venue, URL and kickoff and do not affect other dates', () => {
  const data = snapshot();
  const originals = data.bookings.filter((b) => b.date === '2026-10-10' && ['D2', 'E3 · Spieltag'].includes(b.label));
  const adjusted = applyMatchdayAdjustments(originals);
  for (const [index, booking] of adjusted.entries()) {
    assert.equal(booking.pitch, 'Hauptplatz');
    assert.equal(booking.pitchOverride.from, 'Nebenplatz');
    assert.equal(booking.venue, originals[index].venue);
    assert.equal(booking.url, originals[index].url);
    assert.equal(booking.kickoff, originals[index].kickoff);
  }
  assert.deepEqual(applyMatchdayAdjustments(adjusted), adjusted);
  assert.equal(applyMatchdayAdjustments([{ ...originals[0], date: '2026-10-11' }])[0].pitch, 'Nebenplatz');
  assert.equal(applyMatchdayAdjustments([{ ...originals[0], pitch: null }])[0].pitchOverride.from, null);
});

test('October 10 needs no goal transport, and E3 releases the main pitch before the C1 warm-up', () => {
  const data = snapshot();
  const planned = planWithPitchReservations([...data.bookings, ...manualTournamentBookings(fTournamentSchedules, data.from, data.through)], data.from, data.through)
    .filter((b) => b.date === '2026-10-10');
  for (const pitch of ['Hauptplatz', 'Nebenplatz']) {
    assert.ok(!pitchSegments(planned.filter((b) => b.pitch === pitch)).some((s) => s.conflict));
    assert.ok(!pitchGoalSegments(planned, pitch).some((s) => s.conflict));
  }
  const e = planned.find((b) => b.label === 'E3 · Spieltag');
  assert.equal(e.pitch, 'Hauptplatz');
  assert.equal(e.start, 690);
  assert.equal(e.end, 795);
  assert.ok(e.end <= planned.find((b) => b.label === 'C1').start);
  assert.equal(planned.find((b) => b.label === 'D2').pitch, 'Hauptplatz');
  assert.equal(Math.max(...pitchGoalSegments(planned, 'Hauptplatz').map((s) => s.needed)), 4);
  assert.equal(Math.max(...pitchGoalSegments(planned, 'Nebenplatz').map((s) => s.needed)), 4);
});

test('archery relocation cannot suggest a main pitch with insufficient goals', () => {
  const e = game('e', 'E-Junioren', 'Hauptplatz', '10:00');
  const f = game('f', 'F-Junioren', 'Nebenplatz', '10:00');
  const planned = planWithPitchReservations([e, f], e.date, e.date);
  const affected = planned.find((b) => b.id === 'f');
  assert.equal(affected.pitch, 'Nebenplatz');
  assert.equal(affected.relocation, 'blocked');
  assert.ok(affected.notes.some((note) => note.includes('5er-Tore nicht ausreichend')));
});
