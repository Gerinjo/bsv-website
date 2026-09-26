import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { teamTraining } from '../src/data/trainingPlan.ts';

const pageSource = readFileSync(new URL('../src/pages/[...slug].astro', import.meta.url), 'utf8');
const teamPagesSource = readFileSync(new URL('../src/data/teamPages.ts', import.meta.url), 'utf8');
const layoutSource = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
const legacySource = readFileSync(new URL('../src/data/legacyContent.ts', import.meta.url), 'utf8');
const trainingPlanSource = readFileSync(new URL('../src/pages/fussball/belegungsplan.astro', import.meta.url), 'utf8') + readFileSync(new URL('../src/data/trainingPlan.ts', import.meta.url), 'utf8');
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

  assert.deepEqual(teamTraining['jugend/u11-e2'], [
    { day: 'Montag', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern Hauptplatz' },
    { day: 'Mittwoch', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern Hauptplatz' },
  ]);
  assert.deepEqual(teamTraining['jugend/u9-f'].map(({ day, time }) => ({ day, time })), [
    { day: 'Montag', time: '16:00 – 17:30 Uhr' },
    { day: 'Mittwoch', time: '16:00 – 17:30 Uhr' },
  ]);
  assert.doesNotMatch(e2Section, /Termin folgt/);
});

test('E2 is always allocated to the main pitch', () => {
  assert.match(trainingPlanSource, /'jugend\/u11-e2': \{ pitch: 'Hauptplatz'/);
  assert.doesNotMatch(trainingPlanSource, /'jugend\/u11-e2': \{ pitch: 'Nebenplatz'/);
});

test('F2 and F3 use the training data from the 2026/27 allocation graphic', () => {
  const f2AndF3Section = teamSection('jugend/u8-f', 'jugend/u7-g');

  assert.deepEqual(teamTraining['jugend/u8-f'], [
    { day: 'Dienstag', time: '17:00 – 18:30 Uhr', place: 'BSV Nordstern Hauptplatz' },
    { day: 'Donnerstag', time: '17:00 – 18:30 Uhr', place: 'BSV Nordstern Hauptplatz' },
  ]);
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
  assert.doesNotMatch(coachVacanciesSource, /D1-Junioren.*gesucht|team: 'D1-Junioren'/);
  assert.doesNotMatch(coachVacanciesSource, /D3-Junioren.*gesucht|team: 'D3-Junioren'/);
  assert.match(coachVacanciesSource, /card-head.*<strong>03<\/strong>/s);
  assert.match(coachVacanciesSource, /Drei Teams\./);
});

test('D2 trains Wednesday and Friday at the currently assigned times', () => {
  const d2Section = teamSection('jugend/u13-d2', 'jugend/u13-d3');

  assert.match(d2Section, /training:teamTraining\['jugend\/u13-d2'\]/);
  assert.deepEqual(teamTraining['jugend/u13-d2'], [
    { day: 'Mittwoch', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' },
    { day: 'Freitag', time: '16:30 – 18:00 Uhr', place: 'BSV Nordstern' },
  ]);
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
  assert.match(sportsPagesSource, /5-m- und 7,32-m-Tor/);
  assert.match(sportsPagesSource, /Stefan Gastaudo', role: 'Torwarttrainer · C-Lizenz'/);
});

test('A-Jugend trains Tuesday at BSV and Thursday in Markelfingen', () => {
  const u19Section = teamSection('jugend/u19', 'jugend/u17');

  assert.deepEqual(teamTraining['jugend/u19'], [
    { day: 'Dienstag', time: '19:30 – 21:00 Uhr', place: 'BSV Nordstern Radolfzell' },
    { day: 'Donnerstag', time: '19:00 – 20:30 Uhr', place: 'SV Markelfingen' },
  ]);
});

test('the girls football day overview card uses a cover photo and names SBFV support', () => {
  assert.match(erlebnisDataSource, /partner: 'Tag des Mädchenfußballs'/);
  assert.match(erlebnisDataSource, /Unterstützung des Südbadischen Fußballverbands \(SBFV\)/);
  assert.match(erlebnisOverviewSource, /tag-des-maedchenfussballs' \? 'cover'/);
  assert.match(erlebnisOverviewSource, /\[data-kind='cover'\] \.logo-stage img\{[^}]*width:100%;height:100%;[^}]*object-fit:cover/);
});
