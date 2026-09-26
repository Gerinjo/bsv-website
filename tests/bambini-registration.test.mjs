import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { BAMBINI_EVENT } from '../supabase/functions/_shared/bambini-event.mjs';
import { BAMBINI_ROUTING, BAMBINI_SUCCESS_MESSAGE, prepareBambiniRegistration } from '../supabase/functions/contact-request/bambini-registration.mjs';

const valid = (overrides = {}) => ({
  topic: BAMBINI_EVENT.topic, clubName: 'FC Testverein',
  firstName: 'Mara', lastName: 'Muster', email: 'Trainer@Example.org', phone: '+49 (0) 170-1234567',
  timeSlots: ['15:00', '09:00'], registrationAccepted: true, privacyAccepted: true,
  captchaToken: '11111111-1111-4111-8111-111111111111', captchaAnswer: 7, ...overrides,
});
const request = (body) => new Request('https://example.org/contact-request', {
  method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://bsvnordstern.de' }, body: JSON.stringify(body),
});

// Exercise the deployed HTTP entrypoint with in-memory database and email adapters.
// No production secrets, network calls, registrations or messages are needed.
const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/contact-request/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, ''));
function harness({ emailFails = false, captchaExpired = false, insertFails = false } = {}) {
  const operations = [], mails = [], challenges = new Map();
  challenges.set(valid().captchaToken, { antwort: 7, expires_at: new Date(Date.now() + (captchaExpired ? -60000 : 60000)).toISOString() });
  const db = {
    from(table) {
      const state = { table, operation: 'select', filters: {} };
      const chain = {
        select() { return chain; },
        insert(values) { state.operation = 'insert'; state.values = values; return chain; },
        update(values) { state.operation = 'update'; state.values = values; return chain; },
        delete() { state.operation = 'delete'; return chain; },
        eq(key, value) { state.filters[key] = value; return chain; },
        single() { return chain; }, maybeSingle() { return chain; },
        then(resolve, reject) {
          operations.push(state);
          let data = null, error = null;
          if (table === 'contact_captcha_challenges') {
            data = challenges.get(state.filters.id) ?? null;
            challenges.delete(state.filters.id);
          } else if (table === 'contact_empfaenger') {
            data = { email: 'organizer@example.org', bezeichnung: 'Organisation' };
          } else if (table === 'contact_anfragen' && state.operation === 'insert') {
            if (insertFails) error = { message: 'simulated database failure' };
            else data = { id: 'registration-123' };
          }
          return Promise.resolve({ data, error }).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  let handle;
  runInNewContext(source, {
    Request, Response, crypto, console: { error() {} }, createClient: () => db,
    Deno: { env: { get: (key) => ({ SUPABASE_URL: 'https://example.org', SUPABASE_SERVICE_ROLE_KEY: 'fake-server-key', ALLOWED_ORIGINS: 'https://bsvnordstern.de' })[key] }, serve: (callback) => { handle = callback; } },
    getEmailRuntimeConfig: () => ({ mode: 'test' }),
    sendEmail: async (mail, options) => {
      mails.push({ mail, options });
      if (emailFails) throw new Error('simulated email failure');
      return { id: 'mail-123', mode: 'test' };
    },
    BAMBINI_EVENT, BAMBINI_ROUTING, BAMBINI_SUCCESS_MESSAGE, prepareBambiniRegistration,
  });
  return { handle, operations, mails };
}

test('all seven combinations of preferred times are accepted and rendered chronologically', () => {
  for (let mask = 1; mask < 8; mask++) {
    const chosen = BAMBINI_EVENT.timeSlots.filter((_, i) => mask & (1 << i));
    const result = prepareBambiniRegistration(valid({ timeSlots: [...chosen].reverse() }));
    assert.equal(result.error, undefined);
    assert.ok(result.message.includes(`Priorisierte Zeitfenster: ${chosen.map((slot) => `${slot} Uhr`).join(', ')}`));
    assert.match(result.message, /12\. Dezember 2026/);
    assert.match(result.message, /Unterseesporthalle Radolfzell/);
  }
});

test('missing or invalid trainer details, club, preferences and acknowledgements cause no side effects', async () => {
  const invalid = [
    { clubName: '' }, { clubName: 'x'.repeat(161) }, { clubName: 'Verein\nAndere Zeile' },
    { firstName: '' }, { lastName: '' }, { email: 'invalid-address' }, { phone: '' }, { phone: '0170<script>' },
    ...[undefined, null, [], '09:00', {}, ['09:00', '09:00'], ['09:00', '10:00'], ['09:00', null]].map((timeSlots) => ({ timeSlots })),
    { message: 'x'.repeat(2001) }, { message: {} }, { registrationAccepted: false }, { registrationAccepted: 'true' }, { privacyAccepted: false },
  ];
  for (const override of invalid) {
    const app = harness();
    const response = await app.handle(request(valid(override)));
    assert.equal(response.status, 422, JSON.stringify(override));
    assert.equal(app.operations.length, 0, 'invalid registrations must not consume captcha or write data');
    assert.equal(app.mails.length, 0);
  }
});

test('a registration stores all wishes and emails the private organizer with trainer reply-to', async () => {
  const app = harness();
  const response = await app.handle(request(valid({ to: 'attacker@example.org', routingKey: 'someone-else', eventDate: 'wrong date' })));
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.saved, true);
  assert.equal(result.notificationStatus, 'versendet');
  assert.match(result.message, /persönlich/);
  const recipient = app.operations.find((op) => op.table === 'contact_empfaenger');
  assert.equal(recipient.filters.schluessel, 'person-jerome-ernsberger');
  assert.equal(recipient.filters.aktiv, true);
  const saved = app.operations.find((op) => op.operation === 'insert').values;
  assert.equal(saved.thema, BAMBINI_EVENT.topic);
  assert.equal(saved.anfrageart, 'kontakt');
  assert.equal(saved.telefon, '+49 (0) 170-1234567');
  assert.equal(saved.email, 'trainer@example.org');
  assert.match(saved.nachricht, /Verein: FC Testverein/);
  assert.match(saved.nachricht, /09:00 Uhr, 15:00 Uhr/);
  assert.equal(app.mails.length, 1);
  const { mail, options } = app.mails[0];
  assert.equal(mail.to, 'organizer@example.org');
  assert.equal(mail.reply_to, 'trainer@example.org');
  assert.match(mail.subject, /Bambini-Anmeldung/);
  assert.match(mail.html, /09:00 Uhr, 15:00 Uhr/);
  assert.match(mail.html, /Mara Muster/);
  assert.match(mail.html, /FC Testverein/);
  assert.doesNotMatch(mail.html, /attacker@example.org|wrong date/);
  assert.equal(options.idempotencyKey, 'bambini-registration/test/registration-123');
});

test('names, clubs and free text are escaped in organizer email HTML', async () => {
  const app = harness();
  const response = await app.handle(request(valid({ firstName: '<b>Mara</b>', clubName: 'FC <Test> & Verein', message: '<img src=x onerror=alert(1)>\nNoch eine Zeile' })));
  assert.equal(response.status, 201);
  assert.match(app.mails[0].mail.html, /&lt;b&gt;Mara&lt;\/b&gt;/);
  assert.match(app.mails[0].mail.html, /FC &lt;Test&gt; &amp; Verein/);
  assert.match(app.mails[0].mail.html, /&lt;img src=x onerror=alert\(1\)&gt;<br>Noch eine Zeile/);
  assert.doesNotMatch(app.mails[0].mail.html, /<img|<b>Mara/);
});

test('incorrect, expired and reused captcha challenges cannot submit a registration', async () => {
  for (const [options, fields] of [[{}, { captchaAnswer: 8 }], [{ captchaExpired: true }, {}], [{}, { captchaToken: 'unknown-token' }]]) {
    const app = harness(options);
    assert.equal((await app.handle(request(valid(fields)))).status, 422);
    assert.equal(app.mails.length, 0);
    assert.equal(app.operations.length, 1);
  }
  const app = harness();
  assert.equal((await app.handle(request(valid()))).status, 201);
  assert.equal((await app.handle(request(valid()))).status, 422);
  assert.equal(app.mails.length, 1);
});

test('saved registrations report an email failure without inviting duplicate submissions', async () => {
  const app = harness({ emailFails: true });
  const response = await app.handle(request(valid()));
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.saved, true);
  assert.equal(result.notificationStatus, 'fehler');
  assert.match(result.message, /nicht erneut/);
  assert.equal(app.operations.at(-1).values.benachrichtigung_status, 'fehler');
});

test('database failures do not send email or claim the registration was saved', async () => {
  const app = harness({ insertFails: true });
  const response = await app.handle(request(valid()));
  assert.equal(response.status, 500);
  assert.notEqual((await response.json()).saved, true);
  assert.equal(app.mails.length, 0);
});

test('malformed JSON bodies and honeypot have no database or email effects', async () => {
  const app = harness();
  for (const body of [null, [], 'invalid']) assert.equal((await app.handle(request(body))).status, 400);
  assert.equal((await app.handle(request(valid({ website: 'spam' })))).status, 200);
  assert.equal(app.operations.length, 0);
  assert.equal(app.mails.length, 0);
});

test('existing contact, trial and friendly-match routing still work without event fields', async () => {
  for (const [topic, requestType] of [['verein', 'kontakt'], ['team--jugend--u7-g--trial', 'probetraining'], ['team--jugend--u7-g--friendly', 'freundschaftsspiel']]) {
    const app = harness();
    const response = await app.handle(request(valid({ topic, timeSlots: undefined, registrationAccepted: undefined, phone: '', message: 'Eine normale Anfrage zum Fußball.', opponentTeam: 'Bambini' })));
    assert.equal(response.status, 201);
    const saved = app.operations.find((op) => op.operation === 'insert').values;
    assert.equal(saved.anfrageart, requestType);
    assert.equal(saved.nachricht, 'Eine normale Anfrage zum Fußball.');
    assert.equal(app.mails.length, 1);
    assert.doesNotMatch(app.mails[0].mail.subject, /Bambini-Anmeldung/);
  }
});
