import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { buildEventConfirmation, CLUB_ADDRESS, deliverEventConfirmation } from '../supabase/functions/_shared/event-confirmation.mjs';
import { eventSponsors } from './fixtures/event-sponsors.mjs';

const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/gst2027-anmeldung/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, ''));
const valid = (overrides = {}) => ({ vorname: 'Mara', nachname: 'Muster', email: 'School@Example.org', telefon: '07732 123456', grundschule: 'Testschule', altersklasse: 'Mix 1. & 2. Klasse', mannschaftsname: 'Die Sterne', turniergebuehr: true, datenschutz: true, ...overrides });
const request = body => new Request('https://example.org/gst2027-anmeldung', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
function harness({ insertError, mailFails = false } = {}) {
  const mails = [], operations = [];
  const db = { from(table) {
    const state = { table };
    const chain = {
      insert(values) { state.insert = values; return chain; }, select() { return chain; }, single() { return chain; },
      update(values) { state.update = values; return chain; }, eq(key, value) { state[key] = value; return chain; },
      then(resolve, reject) { operations.push(state); return Promise.resolve({ data: { id: 'gst-123' }, error: state.insert ? insertError : null }).then(resolve, reject); },
    }; return chain;
  } };
  let handle;
  runInNewContext(source, {
    Response, console: { error() {} }, createClient: () => db,
    Deno: { env: { get: key => ({ SUPABASE_URL: 'https://example.org', SUPABASE_SERVICE_ROLE_KEY: 'test-only' })[key] }, serve: fn => { handle = fn; } },
    buildEventConfirmation, CLUB_ADDRESS, deliverEventConfirmation, getEmailRuntimeConfig: () => ({ mode: 'test' }),
    loadYouthSponsors: async () => eventSponsors,
    sendEmail: async (mail, options) => { mails.push({ mail, options }); if (mailFails) throw new Error('simulated provider rejection'); return { id: 'provider-id', mode: 'test' }; },
  });
  return { handle, mails, operations };
}

test('GST confirms validated school/team details, known address and pending date with the shared design', async () => {
  for (const competition of ['Mix 1. & 2. Klasse', 'Mädchen 3. & 4. Klasse']) {
    const app = harness();
    const response = await app.handle(request(valid({ altersklasse: competition, weitereInformationen: '<script>bad</script>', to: 'attacker@example.org', fee: 0, date: 'wrong' })));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).confirmationStatus, 'versendet');
    const { mail, options } = app.mails[0];
    assert.equal(mail.to, 'school@example.org');
    assert.equal(app.operations.find(operation => operation.insert).insert.status, 'bestaetigt');
    assert.match(mail.text, /Teilnahme ist hiermit bestätigt/);
    assert.doesNotMatch(mail.text, /Wir prüfen|IBAN:|BIC:/);
    for (const sponsor of eventSponsors) {
      assert.ok(mail.html.includes(sponsor.logo));
      assert.ok(mail.text.includes(`${sponsor.name}: ${sponsor.website}`));
    }
    assert.match(mail.text, /Grundschule: Testschule/);
    assert.match(mail.text, /Mannschaft: Die Sterne/);
    assert.match(mail.text, /Termin: Wird noch bekannt gegeben/);
    assert.ok(mail.text.includes(CLUB_ADDRESS));
    assert.ok(mail.text.includes(competition.startsWith('Mädchen') ? 'Waffelteig' : 'Kuchen'));
    assert.match(mail.html, /#092f20[\s\S]*#f4d638/);
    assert.match(mail.html, /Jérôme Ernsberger[\s\S]*Jugendleiter/);
    assert.match(mail.html, /&lt;script&gt;bad&lt;\/script&gt;/);
    assert.doesNotMatch(mail.html, /<script>|attacker@example.org|wrong/);
    assert.equal(options.idempotencyKey, 'event-confirmation/test/gst_anmeldungen/gst-123');
  }
});

test('GST rejects invalid, bot, duplicate and unsaved registrations without sending a confirmation', async () => {
  for (const fields of [null, [], 'bad', valid({ email: 'invalid' }), valid({ datenschutz: false }), valid({ turniergebuehr: false }), valid({ altersklasse: 'invalid' }), valid({ website: 'bot' })]) {
    const app = harness();
    await app.handle(request(fields));
    assert.equal(app.mails.length, 0);
    assert.equal(app.operations.length, 0);
  }
  for (const code of ['23505', 'database-unavailable']) {
    const app = harness({ insertError: { code } });
    const response = await app.handle(request(valid()));
    assert.equal(response.status, code === '23505' ? 409 : 500);
    assert.equal(app.mails.length, 0);
  }
});

test('GST mail failure keeps the registration and records the delivery failure separately', async () => {
  const app = harness({ mailFails: true });
  const response = await app.handle(request(valid()));
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.saved, true);
  assert.equal(result.confirmationStatus, 'fehler');
  assert.match(result.message, /nicht erneut/);
  assert.equal(app.operations.at(-1).update.bestaetigung_status, 'fehler');
});
