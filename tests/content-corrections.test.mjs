import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(new URL('../src/pages/[...slug].astro', import.meta.url), 'utf8');
const teamPagesSource = readFileSync(new URL('../src/data/teamPages.ts', import.meta.url), 'utf8');
const legacySource = readFileSync(new URL('../src/data/legacyContent.ts', import.meta.url), 'utf8');
const trainingPlanSource = readFileSync(new URL('../src/pages/fussball/belegungsplan.astro', import.meta.url), 'utf8');
const urmelSource = readFileSync(new URL('../src/pages/erlebnis/urmel-bambini-spieltag.astro', import.meta.url), 'utf8');
const erlebnisDataSource = readFileSync(new URL('../src/data/erlebnis.ts', import.meta.url), 'utf8');
const erlebnisOverviewSource = readFileSync(new URL('../src/pages/erlebnis/index.astro', import.meta.url), 'utf8');

test('the board page includes Stefan Gastaudo as data protection officer', () => {
  assert.match(pageSource, /'Stefan Gastaudo',\s*'Datenschutzbeauftragter'/);
  assert.match(pageSource, /'\/images\/verein\/personen\/stefan-gastaudo\.jpg'/);
});

test('Annika Peglau is no longer added as a youth representative', () => {
  assert.doesNotMatch(pageSource, /Annika Peglau/);
});

test('the URMEL page announces 2027 without the obsolete 2026 link', () => {
  assert.match(urmelSource, /Wir freuen uns auf[\s\S]*Mai 2027/);
  assert.match(urmelSource, /Den genauen Termin und alle weiteren Informationen geben wir rechtzeitig hier bekannt\./);
  assert.doesNotMatch(urmelSource, /Ankündigung 2026 lesen|bsvnordstern\.de\/j4\/index\.php/);
});

test('the old men team names Christian Stielow as contact instead of a coach', () => {
  assert.match(teamPagesSource, /Christian Stielow', role: 'Ansprechperson Alte Herren'/);
  assert.doesNotMatch(teamPagesSource, /Torben Schmidt/);
  assert.match(pageSource, /isOldMenTeam \? 'Ansprechperson\.' : 'Das Trainerteam\.'/);
});

test('Torben Altenburg remains co-coach of the first men team', () => {
  assert.match(legacySource, /Torben Altenburg \(Co-Trainer\)/);
});

test('Marcelino Rueth teams use the updated Monday and Wednesday training times', () => {
  const e2Start = teamPagesSource.indexOf("path: 'jugend/u11-e2'");
  const u9Start = teamPagesSource.indexOf("path: 'jugend/u9-f'");
  const u8Start = teamPagesSource.indexOf("path: 'jugend/u8-f'");
  const e2Section = teamPagesSource.slice(e2Start, u9Start);
  const u9Section = teamPagesSource.slice(u9Start, u8Start);

  assert.match(e2Section, /Montag', time: '17:30 – 19:00 Uhr'/);
  assert.match(e2Section, /Mittwoch', time: '17:30 – 19:00 Uhr'/);
  assert.equal((e2Section.match(/place: 'BSV Nordstern Hauptplatz'/g) ?? []).length, 2);
  assert.match(u9Section, /Montag', time: '16:00 – 17:30 Uhr'/);
  assert.match(u9Section, /Mittwoch', time: '16:00 – 17:30 Uhr'/);
  assert.doesNotMatch(e2Section, /Termin folgt/);
});

test('E2 is always allocated to the main pitch', () => {
  assert.match(trainingPlanSource, /'jugend\/u11-e2': \{ pitch: 'Hauptplatz'/);
  assert.doesNotMatch(trainingPlanSource, /'jugend\/u11-e2': \{ pitch: 'Nebenplatz'/);
});

test('the girls football day overview card uses a cover photo and names SBFV support', () => {
  assert.match(erlebnisDataSource, /partner: 'Tag des Mädchenfußballs'/);
  assert.match(erlebnisDataSource, /Unterstützung des Südbadischen Fußballverbands \(SBFV\)/);
  assert.match(erlebnisOverviewSource, /tag-des-maedchenfussballs' \? 'cover'/);
  assert.match(erlebnisOverviewSource, /\[data-kind='cover'\] \.logo-stage img\{[^}]*width:100%;height:100%;[^}]*object-fit:cover/);
});
