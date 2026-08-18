import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const proposalSource = readFileSync(new URL('../src/pages/fussball/belegungsplan2.astro', import.meta.url), 'utf8');
const navigationSource = readFileSync(new URL('../src/data/navigation.ts', import.meta.url), 'utf8');
const sportsPagesSource = readFileSync(new URL('../src/data/sportsPages.ts', import.meta.url), 'utf8');

test('Belegungsplan 2 remains an unlinked, non-indexed discussion draft', () => {
  assert.match(proposalSource, /noindex/);
  assert.match(proposalSource, /Entwurf · nicht öffentlich verlinkt/);
  assert.match(proposalSource, /Durchgeführte Aktionen/);
  assert.doesNotMatch(navigationSource, /belegungsplan2/);
  assert.doesNotMatch(sportsPagesSource, /belegungsplan2/);
});

test('Belegungsplan 2 contains the conflict-adjusted proposal', () => {
  assert.match(proposalSource, /'fussball\/alte-herren\|Mittwoch': \{ time: '19:30 – 21:00 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u19\|Dienstag': \{ day: 'Montag', time: '19:30 – 21:00 Uhr', allocation: \{ pitch: 'Nebenplatz' \} \}/);
  assert.match(proposalSource, /'jugend\/u15-c1\|Dienstag': \{ day: 'Montag', time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u15-c2\|Dienstag': \{ day: 'Freitag', time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u15-c2\|Donnerstag': \{ day: 'Mittwoch', time: '19:30 – 21:00 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u13-d3\|Donnerstag': \{ day: 'Freitag', time: '17:30 – 19:00 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u17\|Donnerstag': \{ time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'fussball\/herren\/kreisliga-2\|Donnerstag': \{ place: 'SV Markelfingen' \}/);
});
