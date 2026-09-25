import test from 'node:test';
import assert from 'node:assert/strict';

import { findTrainingConflicts, findGoalTrainingOverlaps } from '../src/utils/trainingConflicts.mjs';
import { goalkeeperTraining } from '../src/data/goalkeeperTraining.ts';

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

test('goalkeeper groups reserve their own goals without inventing field fractions', () => {
  assert.deepEqual(goalkeeperTraining.map(({ day, time, allocation }) => ({ day, time, ...allocation })), [
    { day: 'Mittwoch', time: '17:30 – 18:30 Uhr', pitch: 'Gleisdreieck', share: 0, shareLabel: '1 5-m-Tor', goalCount: 1, tone: 'other' },
    { day: 'Mittwoch', time: '18:45 – 19:45 Uhr', pitch: 'Nebenplatz', share: 0, shareLabel: '1 großes Tor', goalCount: 1, tone: 'other' },
  ]);
  assert.deepEqual(findTrainingConflicts(goalkeeperTraining), []);
  assert.deepEqual(findGoalTrainingOverlaps(goalkeeperTraining), []);
});

test('the large goal needs coordination with the Wednesday girls sessions until 19:30', () => {
  const girls = ['B-Juniorinnen', 'C-Juniorinnen', 'D-Juniorinnen'].map((team) => ({
    ...session(team, '18:00 – 19:30 Uhr', 1 / 3, 'Nebenplatz'), day: 'Mittwoch',
  }));
  const all = [...goalkeeperTraining, ...girls];
  assert.deepEqual(findTrainingConflicts(all), [], 'a single goal must not count as another half or whole field');
  assert.deepEqual(findGoalTrainingOverlaps(all), [{
    day: 'Mittwoch', pitch: 'Nebenplatz', time: '18:45–19:30 Uhr',
    goalTeam: 'Torwarttraining · großes Tor', goalLabel: '1 großes Tor',
    otherTeams: ['B-Juniorinnen', 'C-Juniorinnen', 'D-Juniorinnen'],
    teams: ['Torwarttraining · großes Tor', 'B-Juniorinnen', 'C-Juniorinnen', 'D-Juniorinnen'],
  }]);
});

test('Gleisdreieck does not block adjacent pitches and touching times do not overlap', () => {
  const all = [...goalkeeperTraining,
    { ...session('Hauptplatz voll', '17:00 – 20:00 Uhr', 1), day: 'Mittwoch' },
    { ...session('Vorher', '17:00 – 18:45 Uhr', 1, 'Nebenplatz'), day: 'Mittwoch' },
    { ...session('Nachher', '19:45 – 21:00 Uhr', 1, 'Nebenplatz'), day: 'Mittwoch' },
    session('Anderer Tag', '18:00 – 20:00 Uhr', 1, 'Nebenplatz'),
  ];
  assert.deepEqual(findGoalTrainingOverlaps(all), []);
  assert.deepEqual(findTrainingConflicts(all), []);
});

test('goal coordination follows actual overlapping intervals and ignores unknown end times', () => {
  const atWednesday = (team, time) => ({ ...session(team, time, .5, 'Nebenplatz'), day: 'Mittwoch' });
  assert.deepEqual(findGoalTrainingOverlaps([
    ...goalkeeperTraining,
    atWednesday('Früh', '18:00 – 19:00 Uhr'),
    atWednesday('Spät', '19:00 – 20:00 Uhr'),
    atWednesday('Ende offen', '18:00 Uhr'),
  ]).map(({ time, otherTeams }) => ({ time, otherTeams })), [
    { time: '18:45–19:00 Uhr', otherTeams: ['Früh'] },
    { time: '19:00–19:45 Uhr', otherTeams: ['Spät'] },
  ]);
});
