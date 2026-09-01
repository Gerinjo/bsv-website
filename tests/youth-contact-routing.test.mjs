import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Jugendabteilung opens a required recipient selection', () => {
  const topics = read('src/data/contactTopics.ts');
  const page = read('src/pages/kontakt.astro');

  assert.match(topics, /id: 'youth'.*label: 'Jugendabteilung'/);
  assert.match(topics, /id: 'youth-leadership'.*label: 'Jugendleitung'/);
  assert.match(topics, /id: 'youth-parents'.*label: 'Elternvertretung'/);
  assert.match(topics, /id: 'youth-finance'.*label: 'Jugendkasse \(Wiebke\)'/);
  assert.match(page, /youthContactSelect\.required = isYouthDepartment/);
  assert.match(page, /topicInput\.value = youthTopic\?\.id/);
});

test('youth recipient routes are provisioned server-side', () => {
  const migration = read('supabase/migrations/20260901222334_add_youth_contact_recipients.sql');

  assert.match(migration, /'youth-leadership'.*'jugend@bsvnordstern\.de'/s);
  assert.match(migration, /'youth-parents'.*'Sarah\.Klumpp@bsvnordstern\.de'/s);
  assert.match(migration, /'youth-finance'.*'Jugendkasse@bsvnordstern\.de'/s);
});
