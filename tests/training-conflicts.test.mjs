import test from 'node:test';
import assert from 'node:assert/strict';

import { findTrainingConflicts } from '../src/utils/trainingConflicts.mjs';

const session = (team, time, share, pitch = 'Hauptplatz') => ({
  day: 'Dienstag',
  team,
  time,
  allocation: { pitch, share },
});

test('three teams with half a pitch are reported as an overload', () => {
  assert.deepEqual(findTrainingConflicts([
    session('Team A', '18:00 – 19:30 Uhr', .5),
    session('Team B', '18:00 – 19:30 Uhr', .5),
    session('Team C', '18:30 – 20:00 Uhr', .5),
  ]), [{
    day: 'Dienstag',
    pitch: 'Hauptplatz',
    start: 1110,
    end: 1170,
    time: '18:30–19:30 Uhr',
    teams: ['Team A', 'Team B', 'Team C'],
    totalShare: 1.5,
    occupancyPercent: 150,
  }]);
});

test('C1 and both active teams overload the main pitch from 19:00 to 20:00', () => {
  assert.deepEqual(findTrainingConflicts([
    session('C1-Junioren', '18:30 – 20:00 Uhr', 1),
    session('Herren 1', '19:00 – 20:30 Uhr', .5),
    session('Herren 2', '19:00 – 20:30 Uhr', .5),
  ]), [{
    day: 'Dienstag',
    pitch: 'Hauptplatz',
    start: 1140,
    end: 1200,
    time: '19:00–20:00 Uhr',
    teams: ['C1-Junioren', 'Herren 1', 'Herren 2'],
    totalShare: 2,
    occupancyPercent: 200,
  }]);
});

test('an exactly full pitch is not a conflict', () => {
  assert.deepEqual(findTrainingConflicts([
    session('Team A', '18:00 – 19:30 Uhr', .5),
    session('Team B', '18:00 – 19:30 Uhr', .5),
  ]), []);
});

test('sessions without a confirmed end time are not used for exact conflict windows', () => {
  assert.deepEqual(findTrainingConflicts([
    session('Team A', '19:00 Uhr', .5),
    session('Team B', '19:00 – 20:30 Uhr', 1),
  ]), []);
});
