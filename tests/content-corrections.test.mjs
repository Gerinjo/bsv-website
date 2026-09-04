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
const navigationSource = readFileSync(new URL('../src/data/navigation.ts', import.meta.url), 'utf8');
const sportsPagesSource = readFileSync(new URL('../src/data/sportsPages.ts', import.meta.url), 'utf8');
const membershipSource = readFileSync(new URL('../src/pages/verein/mitglied-werden.astro', import.meta.url), 'utf8');
const coachVacanciesSource = readFileSync(new URL('../src/pages/jugend/trainer-gesucht.astro', import.meta.url), 'utf8');

function teamSection(path, nextPath) {
  const start = teamPagesSource.search(new RegExp(`path:\\s*'${path.replaceAll('/', '\\/')}'`));
  const tail = teamPagesSource.slice(start);
  const relativeEnd = nextPath
    ? tail.search(new RegExp(`path:\\s*'${nextPath.replaceAll('/', '\\/')}'`))
    : -1;
  return relativeEnd > 0 ? tail.slice(0, relativeEnd) : tail;
}

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
  assert.match(teamPagesSource, /Christian Stielow',\s*role:\s*'Ansprechperson Alte Herren'/);
  assert.doesNotMatch(teamPagesSource, /Torben Schmidt/);
  assert.match(pageSource, /isOldMenTeam \? 'Ansprechperson\.' : 'Das Trainerteam\.'/);
});

test('Torben Altenburg remains co-coach of the first men team', () => {
  assert.match(legacySource, /Torben Altenburg \(Co-Trainer\)/);
});

test('Marcelino Rueth teams use the updated Monday and Wednesday training times', () => {
  const e2Section = teamSection('jugend/u11-e2', 'jugend/u11-e3');
  const u9Section = teamSection('jugend/u9-f', 'jugend/u8-f');

  assert.match(e2Section, /Montag',\s*time:\s*'17:30 – 19:00 Uhr'/);
  assert.match(e2Section, /Mittwoch',\s*time:\s*'17:30 – 19:00 Uhr'/);
  assert.equal((e2Section.match(/place:\s*'BSV Nordstern Hauptplatz'/g) ?? []).length, 2);
  assert.match(u9Section, /Montag',\s*time:\s*'16:00 – 17:30 Uhr'/);
  assert.match(u9Section, /Mittwoch',\s*time:\s*'16:00 – 17:30 Uhr'/);
  assert.doesNotMatch(e2Section, /Termin folgt/);
});

test('E2 is always allocated to the main pitch', () => {
  assert.match(trainingPlanSource, /'jugend\/u11-e2': \{ pitch: 'Hauptplatz'/);
  assert.doesNotMatch(trainingPlanSource, /'jugend\/u11-e2': \{ pitch: 'Nebenplatz'/);
});

test('F2 and F3 use the training data from the 2026/27 allocation graphic', () => {
  const f2AndF3Section = teamSection('jugend/u8-f', 'jugend/u7-g');

  assert.match(f2AndF3Section, /Dienstag',\s*time:\s*'17:00 – 18:30 Uhr',\s*place:\s*'BSV Nordstern Hauptplatz'/);
  assert.match(f2AndF3Section, /Donnerstag',\s*time:\s*'17:00 – 18:30 Uhr',\s*place:\s*'BSV Nordstern Hauptplatz'/);
  assert.match(trainingPlanSource, /'jugend\/u8-f': \{ pitch: 'Hauptplatz', share: 1, shareLabel: 'je ½ Platz'/);
  assert.match(trainingPlanSource, /'jugend\/u8-f': 'F2 \+ F3-Junioren'/);
});

test('D1, D2 and D3 show the updated coaching teams and qualifications', () => {
  const d1Section = teamSection('jugend/u13-d1', 'jugend/u13-d2');
  const d2Section = teamSection('jugend/u13-d2', 'jugend/u13-d3');
  const d3Section = teamSection('jugend/u13-d3', 'jugend/juniorinnen/u17');

  assert.match(d1Section, /Stephan Hellmann',\s*role:\s*'Trainer',\s*qualification:\s*'DFB-Basis-Coach'/);
  assert.match(d1Section, /Hieu Ho',\s*role:\s*'Co-Trainerin',\s*qualification:\s*'DFB-Basis-Coach'/);
  assert.match(d2Section, /Jörg Boreatti',\s*role:\s*'Trainer',\s*qualification:\s*'C-Lizenz \(ab 2023\)'/);
  assert.match(d2Section, /Marko Eisner',\s*role:\s*'Co-Trainer',\s*qualification:\s*'DFB-Basis-Coach'/);
  assert.match(d2Section, /Patrick Müller',\s*role:\s*'Co-Trainer',\s*qualification:\s*'DFB-Basis-Coach'/);
  assert.match(d3Section, /Jérôme Ernsberger',\s*role:\s*'Trainer',\s*qualification:\s*'C-Lizenz'/);
  assert.doesNotMatch(d3Section, /Hieu Ho/);
  assert.match(membershipSource, /D1-Junioren', trainers: 'S\. Hellmann, H\. Ho'/);
  assert.match(membershipSource, /D3-Junioren', trainers: 'J\. Ernsberger'/);
  assert.match(coachVacanciesSource, /D3-Junioren', role: 'Trainer:in'/);
});

test('D2 trains Wednesday and Friday at the currently assigned times', () => {
  const d2Section = teamSection('jugend/u13-d2', 'jugend/u13-d3');

  assert.match(d2Section, /training:\s*\[\{\s*day:\s*'Mittwoch',\s*time:\s*'17:30 – 19:00 Uhr',\s*place:\s*'BSV Nordstern'\s*\},\s*\{\s*day:\s*'Freitag',\s*time:\s*'16:30 – 18:00 Uhr',\s*place:\s*'BSV Nordstern'\s*\}\]/);
  assert.doesNotMatch(d2Section, /day:\s*'Montag'/);
});

test('DFBnet qualifications are applied to the respective youth coaches', () => {
  for (const [name, qualification] of [
    ['Andreas Wolfmüller', 'DFB-Basis-Coach'],
    ['Fabian Keller', 'Kindertrainer-Zertifikat'],
    ['Jérôme Ernsberger', 'Trainer-C Kinder und Jugend'],
    ['Marcelino Rüth', 'Kindertrainer-Zertifikat'],
    ['Niku Pourheidari', 'DFB-Basis-Coach'],
    ['Pascal Dieterle', 'DFB-Basis-Coach'],
    ['Sebastian Bäuerle', 'Kindertrainer-Zertifikat'],
    ['Simon Bühler', 'Kindertrainer-Zertifikat'],
    ['Sina Rauch', 'DFB-Basis-Coach'],
    ['Stefan Sulger', 'Kindertrainer-Zertifikat'],
    ['Stephan Hellmann', 'DFB-Basis-Coach'],
  ]) {
    assert.match(teamPagesSource, new RegExp(`'${name}'\\s*:\\s*'${qualification}'`));
  }
  assert.match(teamPagesSource, /'Pascel Dieterle'\s*:\s*'Pascal Dieterle'/);
});

test('the youth section links to Stefan Gastaudo goalkeeping training', () => {
  assert.match(navigationSource, /Torwarttraining', href: '\/jugend\/torwarttraining'/);
  assert.match(sportsPagesSource, /path: 'jugend\/torwarttraining'/);
  assert.match(sportsPagesSource, /5er- und 7er-Tore/);
  assert.match(sportsPagesSource, /Stefan Gastaudo', role: 'Torwarttrainer · C-Lizenz'/);
});

test('A-Jugend trains Tuesday at BSV and Thursday in Markelfingen', () => {
  const u19Section = teamSection('jugend/u19', 'jugend/u17');

  assert.match(u19Section, /Dienstag',\s*time:\s*'19:00 – 20:30 Uhr',\s*place:\s*'BSV Nordstern Radolfzell'/);
  assert.match(u19Section, /Donnerstag',\s*time:\s*'19:00 – 20:30 Uhr',\s*place:\s*'SV Markelfingen'/);
  assert.doesNotMatch(u19Section, /Montag|Mittwoch/);
});

test('the girls football day overview card uses a cover photo and names SBFV support', () => {
  assert.match(erlebnisDataSource, /partner: 'Tag des Mädchenfußballs'/);
  assert.match(erlebnisDataSource, /Unterstützung des Südbadischen Fußballverbands \(SBFV\)/);
  assert.match(erlebnisOverviewSource, /tag-des-maedchenfussballs' \? 'cover'/);
  assert.match(erlebnisOverviewSource, /\[data-kind='cover'\] \.logo-stage img\{[^}]*width:100%;height:100%;[^}]*object-fit:cover/);
});
