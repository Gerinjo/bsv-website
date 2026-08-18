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
  assert.match(proposalSource, /'fussball\/alte-herren\|Mittwoch': \{ time: '19:00 – 20:30 Uhr', allocation: \{ pitch: 'Hauptplatz' \} \}/);
  assert.match(proposalSource, /'jugend\/u19\|Dienstag': \{ day: 'Montag', time: '19:30 – 21:00 Uhr', allocation: \{ pitch: 'Nebenplatz' \} \}/);
  assert.match(proposalSource, /'jugend\/u15-c1\|Dienstag': \{ day: 'Montag', time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u15-c2\|Dienstag': \{ day: 'Freitag', time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u15-c2\|Donnerstag': \{ day: 'Montag', time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u13-d3\|Donnerstag': \{ day: 'Freitag', time: '17:30 – 19:00 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u17\|Donnerstag': \{ time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'fussball\/herren\/kreisliga-2\|Donnerstag': \{ place: 'SV Markelfingen' \}/);
  assert.match(proposalSource, /'jugend\/u7-g\|Mittwoch': \{ allocation: \{ pitch: 'Hauptplatz', share: 1 \/ 3, shareLabel: '⅓ Platz' \} \}/);
  assert.match(proposalSource, /'jugend\/u6-g\|Mittwoch': \{ allocation: \{ pitch: 'Hauptplatz', share: 1 \/ 3, shareLabel: '⅓ Platz' \} \}/);
});

test('Belegungsplan 2 offers the requested accessible team filters', () => {
  for (const label of ['Herren', 'Frauen', 'A', 'B', 'BM', 'C', 'CM', 'D', 'DM', 'E', 'F', 'G']) {
    assert.match(proposalSource, new RegExp(`label: '${label}'`));
  }
  assert.match(proposalSource, /role="group" aria-label="Mannschaft auswählen"/);
  assert.match(proposalSource, /aria-pressed=/);
  assert.match(proposalSource, /data-team-filter=\{session\.filterKey\}/);
  assert.match(proposalSource, /button\.addEventListener\('click'/);
  assert.match(proposalSource, /dayCard\.hidden = filterKey !== 'all' && !hasVisibleBooking/);
  assert.match(proposalSource, /data-conflict-filter-keys=/);
});
