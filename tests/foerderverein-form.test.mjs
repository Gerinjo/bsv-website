import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Förderverein contact actions route through the protected contact form', () => {
  const page = read('src/components/FoerdervereinPage.astro');
  const topics = read('src/data/contactTopics.ts');

  assert.doesNotMatch(page, /mailto:/i);
  assert.match(page, /\/kontakt\?thema=foerderverein/);
  assert.match(topics, /id: 'foerderverein'/);
});

test('Förderverein membership is a complete online application', () => {
  const form = read('src/components/FoerdervereinApplicationForm.astro');

  for (const field of [
    'birthDate',
    'annualContribution',
    'iban',
    'sepaAccepted',
    'statutesAccepted',
    'signatureData',
    'captchaToken',
  ]) {
    assert.match(form, new RegExp(`name="${field}"`), `Feld ${field} fehlt`);
  }
  assert.match(form, /foerderverein-membership/);
});

test('Förderverein application log excludes bank details and signatures', () => {
  const migration = read('supabase/migrations/20260816221827_foerderverein_online_antrag.sql');
  const tableDefinition = migration.match(/create table public\.foerderverein_antraege \(([\s\S]*?)\n\);/)?.[1] ?? '';

  assert.doesNotMatch(tableDefinition, /iban|bic|bank|unterschrift|signature/i);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.foerderverein_antraege from anon, authenticated/);
});
