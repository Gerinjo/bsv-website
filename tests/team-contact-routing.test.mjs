import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const teamPagesSource = readFileSync(new URL('../src/data/teamPages.ts', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/[...slug].astro', import.meta.url), 'utf8');
const legacySource = readFileSync(new URL('../src/data/legacyContent.ts', import.meta.url), 'utf8');

const legacyTeamPaths = [
  'fussball/herren/kreisliga-b',
  'fussball/herren/kreisliga-c',
  'fussball/frauen/bezirksliga',
  'fussball/alte-herren',
  'jugend/u11-e1',
  'jugend/u11-e2',
  'jugend/u11-e3',
  'jugend/u9-f',
  'jugend/u8-f',
  'jugend/u7-g',
  'jugend/u6-g',
  'jugend/u19',
  'jugend/u17',
  'jugend/u15-c1',
  'jugend/u15-c2',
  'jugend/u13-d1',
  'jugend/u13-d2',
  'jugend/u13-d3',
  'jugend/juniorinnen/u17',
  'jugend/juniorinnen/u13',
];

test('team profiles do not store direct email addresses', () => {
  assert.doesNotMatch(teamPagesSource, /\bemail\??\s*:/);
  assert.doesNotMatch(teamPagesSource, /mailto:/i);
});

test('imported team content routes contact through the protected form', () => {
  const lines = legacySource.split('\n');

  for (const path of legacyTeamPaths) {
    const line = lines.find((entry) => entry.startsWith(`  "${path}":`));
    assert.ok(line, `Legacy-Teamseite fehlt: ${path}`);
    assert.doesNotMatch(line, /mailto:/i, `Direkte E-Mail-Adresse auf ${path}`);
  }
});

test('coach contact action uses the selected team routing key', () => {
  assert.match(pageSource, /team--\$\{page\.path\.replaceAll\('\/', '--'\)\}--general/);
  assert.doesNotMatch(pageSource, /coach\.email/);
});
