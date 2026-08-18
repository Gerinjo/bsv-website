import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(new URL('../src/pages/[...slug].astro', import.meta.url), 'utf8');
const teamPagesSource = readFileSync(new URL('../src/data/teamPages.ts', import.meta.url), 'utf8');
const layoutSource = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
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

test('the favicon uses the filled PNG crest', () => {
  assert.match(layoutSource, /rel="icon" type="image\/png"[^>]*bsv-nordstern\.png/);
  assert.doesNotMatch(layoutSource, /rel="icon"[^>]*bsv-nordstern\.gif/);
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

test('F2 and F3 use the training data from the 2026/27 allocation graphic', () => {
  const u8Start = teamPagesSource.indexOf("path: 'jugend/u8-f'");
  const u7Start = teamPagesSource.indexOf("path: 'jugend/u7-g'", u8Start);
  const f2AndF3Section = teamPagesSource.slice(u8Start, u7Start);

  assert.match(f2AndF3Section, /Dienstag', time: '17:00 – 18:30 Uhr', place: 'BSV Nordstern Hauptplatz'/);
  assert.match(f2AndF3Section, /Donnerstag', time: '17:00 – 18:30 Uhr', place: 'BSV Nordstern Hauptplatz'/);
  assert.match(trainingPlanSource, /'jugend\/u8-f': \{ pitch: 'Hauptplatz', share: 1, shareLabel: 'je ½ Platz'/);
  assert.match(trainingPlanSource, /'jugend\/u8-f': 'F2 \+ F3-Junioren'/);
});

test('A-Jugend trains Tuesday at BSV and Thursday in Markelfingen', () => {
  const u19Start = teamPagesSource.indexOf("path: 'jugend/u19'");
  const u17Start = teamPagesSource.indexOf("path: 'jugend/u17'", u19Start);
  const u19Section = teamPagesSource.slice(u19Start, u17Start);

  assert.match(u19Section, /Dienstag', time: '19:00 – 20:30 Uhr', place: 'BSV Nordstern Radolfzell'/);
  assert.match(u19Section, /Donnerstag', time: '19:00 – 20:30 Uhr', place: 'SV Markelfingen'/);
  assert.doesNotMatch(u19Section, /Montag|Mittwoch/);
});

test('the girls football day overview card uses a cover photo and names SBFV support', () => {
  assert.match(erlebnisDataSource, /partner: 'Tag des Mädchenfußballs'/);
  assert.match(erlebnisDataSource, /Unterstützung des Südbadischen Fußballverbands \(SBFV\)/);
  assert.match(erlebnisOverviewSource, /tag-des-maedchenfussballs' \? 'cover'/);
  assert.match(erlebnisOverviewSource, /\[data-kind='cover'\] \.logo-stage img\{[^}]*width:100%;height:100%;[^}]*object-fit:cover/);
});
