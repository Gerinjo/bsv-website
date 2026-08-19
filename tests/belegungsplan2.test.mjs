import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const proposalSource = readFileSync(new URL('../src/pages/fussball/belegungsplan2.astro', import.meta.url), 'utf8');
const originalPlanSource = readFileSync(new URL('../src/pages/fussball/belegungsplan.astro', import.meta.url), 'utf8');
const filterComponentSource = readFileSync(new URL('../src/components/TrainingPlanFilter.astro', import.meta.url), 'utf8');
const filterDataSource = readFileSync(new URL('../src/data/trainingPlanFilters.ts', import.meta.url), 'utf8');
const navigationSource = readFileSync(new URL('../src/data/navigation.ts', import.meta.url), 'utf8');
const sportsPagesSource = readFileSync(new URL('../src/data/sportsPages.ts', import.meta.url), 'utf8');

test('Belegungsplan 2 remains an unlinked, non-indexed discussion draft', () => {
  assert.match(proposalSource, /noindex/);
  assert.match(proposalSource, /Entwurf · nicht öffentlich verlinkt/);
  assert.match(proposalSource, /Änderungen gegenüber dem Originalplan/);
  assert.doesNotMatch(navigationSource, /belegungsplan2/);
  assert.doesNotMatch(sportsPagesSource, /belegungsplan2/);
});

test('the action list always compares the linked original plan with plan 2', () => {
  assert.match(proposalSource, /Vergleichsgrundlage ist immer der aktuell auf der Homepage verlinkte Belegungsplan/);
  assert.match(proposalSource, /<dt>Original<\/dt>/);
  assert.match(proposalSource, /<dt>Plan 2<\/dt>/);
  assert.match(proposalSource, /team: 'U6 & U7',[\s\S]*?original: 'Mittwoch 16:30–17:30 Uhr auf dem Hauptplatz, jeweils ½ Platz\.',[\s\S]*?proposal: 'Zeit und Hauptplatz bleiben unverändert; Platzbedarf wird jeweils auf ⅓ reduziert\.'/);
  assert.match(proposalSource, /team: 'C2-Junioren',[\s\S]*?original: 'Dienstag und Donnerstag 18:30–20:00 Uhr, jeweils ½ Nebenplatz\.',[\s\S]*?proposal: 'Montag und Freitag 19:00–20:30 Uhr, jeweils ½ Hauptplatz\.'/);
});

test('Belegungsplan 2 contains the conflict-adjusted proposal', () => {
  assert.match(proposalSource, /'fussball\/alte-herren\|Mittwoch': \{ time: '19:00 – 20:30 Uhr', allocation: \{ pitch: 'Hauptplatz' \} \}/);
  assert.match(proposalSource, /'jugend\/u19\|Dienstag': \{ day: 'Montag', time: '19:30 – 21:00 Uhr', allocation: \{ pitch: 'Nebenplatz' \} \}/);
  assert.doesNotMatch(proposalSource, /'jugend\/u15-c1\|Dienstag':/);
  assert.match(proposalSource, /'jugend\/u15-c2\|Dienstag': \{ day: 'Freitag', time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u15-c2\|Donnerstag': \{ day: 'Montag', time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u13-d3\|Donnerstag': \{ day: 'Freitag', time: '17:30 – 19:00 Uhr' \}/);
  assert.match(proposalSource, /'jugend\/u17\|Donnerstag': \{ time: '19:00 – 20:30 Uhr' \}/);
  assert.match(proposalSource, /'fussball\/herren\/kreisliga-2\|Donnerstag': \{ place: 'SV Markelfingen' \}/);
  assert.doesNotMatch(proposalSource, /'fussball\/herren\/kreisliga-2\|Dienstag':/);
  assert.match(proposalSource, /'fussball\/herren\/bezirksliga\|Dienstag': \{ day: 'Montag' \}/);
  assert.match(proposalSource, /'jugend\/u7-g\|Mittwoch': \{ allocation: \{ pitch: 'Hauptplatz', share: 1 \/ 3, shareLabel: '⅓ Platz' \} \}/);
  assert.match(proposalSource, /'jugend\/u6-g\|Mittwoch': \{ allocation: \{ pitch: 'Hauptplatz', share: 1 \/ 3, shareLabel: '⅓ Platz' \} \}/);
  assert.match(proposalSource, /'jugend\/u15-c1': \{ pitch: 'Hauptplatz', share: \.5, shareLabel: '½ Platz'/);
  assert.match(proposalSource, /'jugend\/u15-c2': \{ pitch: 'Hauptplatz', share: \.5, shareLabel: '½ Platz'/);
  assert.match(proposalSource, /Rechnerisch ohne Überbelegung/);
});

test('Belegungsplan 2 offers the requested accessible team filters', () => {
  for (const label of ['Herren', 'Frauen', 'A', 'B', 'BM', 'C', 'CM', 'D', 'DM', 'E', 'F', 'G']) {
    assert.match(filterDataSource, new RegExp(`label: '${label}'`));
  }
  assert.match(filterComponentSource, /role="group" aria-label="Mannschaft auswählen"/);
  assert.match(filterComponentSource, /aria-pressed=/);
  assert.match(proposalSource, /data-team-filter=\{session\.filterKey\}/);
  assert.match(filterComponentSource, /button\.addEventListener\('click'/);
  assert.match(filterComponentSource, /dayCard\.hidden = filterKey !== 'all' && !hasVisibleBooking/);
  assert.match(proposalSource, /data-conflict-filter-keys=/);
});

test('the linked original plan uses the same team filter as plan 2', () => {
  assert.match(originalPlanSource, /import TrainingPlanFilter/);
  assert.match(originalPlanSource, /<TrainingPlanFilter \/>/);
  assert.match(originalPlanSource, /data-team-filter=\{session\.filterKey\}/);
  assert.match(originalPlanSource, /data-conflict-filter-keys=/);
  assert.match(proposalSource, /import TrainingPlanFilter/);
  assert.match(proposalSource, /<TrainingPlanFilter \/>/);
});

test('the shared filter ships its styles directly on both plan pages', () => {
  assert.match(filterComponentSource, /<style is:inline>/);
  assert.match(filterComponentSource, /\.booking\[hidden\][\s\S]*display:none/);
  assert.doesNotMatch(filterComponentSource, /:global\(/);
});
