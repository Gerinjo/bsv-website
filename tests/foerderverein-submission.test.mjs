import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { berlinToday, parseGermanDate, formatGermanDate, isValidIsoDate } from '../supabase/functions/_shared/form-dates.mjs';
import { collectRecipientEmails } from '../supabase/functions/_shared/membership-routing.mjs';

test('German dates validate real calendar days and normalize keyboard entry', () => {
  assert.equal(parseGermanDate('1.2.1985'), '1985-02-01');
  assert.equal(parseGermanDate('01021985'), '1985-02-01');
  assert.equal(formatGermanDate(parseGermanDate('1.2.1985')), '01.02.1985');
  assert.equal(parseGermanDate('29.02.2000'), '2000-02-29');
  for (const value of ['29.02.1900', '31.04.2026', '00.01.2000', '01.13.2000', '03/18/1985', '', '1.1.85']) assert.equal(parseGermanDate(value), '');
  assert.equal(isValidIsoDate('2026-02-30'), false);
});

test('signature default uses the Berlin day at midnight, including winter', () => {
  assert.equal(berlinToday(new Date('2026-10-04T22:30:00Z')), '2026-10-05');
  assert.equal(berlinToday(new Date('2026-12-01T23:30:00Z')), '2026-12-02');
});

const valid = (overrides = {}) => ({
  firstName: 'Mara', lastName: 'Muster', birthDate: '1985-03-18', phone: '+49 123 456789',
  email: 'mara@example.org', street: 'Teststraße 1', postalCode: '78315', city: 'Radolfzell',
  bsvMember: false, annualContribution: 25, bankName: 'Testbank', accountHolder: 'Mara Muster',
  iban: 'DE89 3704 0044 0532 0130 00', signatureCity: 'Radolfzell', signatureDate: berlinToday(),
  signatureData: `data:image/png;base64,${'A'.repeat(160)}`, captchaToken: 'challenge', captchaAnswer: 7,
  sepaAccepted: true, statutesAccepted: true, privacyAccepted: true, ...overrides,
});
const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/foerderverein-membership/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, ''));

function harness({ extraRecipients = [], mailFails = false } = {}) {
  const mails = [], operations = [];
  let captchaAvailable = true;
  const db = { from(table) {
    const state = { table, operation: 'select', filters: {} };
    const chain = {
      select() { return chain; }, single() { return chain; }, maybeSingle() { return chain; },
      insert(values) { state.operation = 'insert'; state.values = values; return chain; },
      update(values) { state.operation = 'update'; state.values = values; return chain; },
      delete() { state.operation = 'delete'; return chain; },
      eq(key, value) { state.filters[key] = value; return chain; },
      then(resolve, reject) {
        operations.push(state);
        let data = null;
        if (table === 'contact_captcha_challenges') {
          data = captchaAvailable ? { antwort: 7, expires_at: new Date(Date.now() + 60000).toISOString() } : null;
          captchaAvailable = false;
        }
        if (table === 'contact_empfaenger') data = { email: 'foerderverein@bsvnordstern.de', weitere_emails: extraRecipients };
        if (table === 'foerderverein_antraege' && state.operation === 'insert') data = { id: 'application-1' };
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return chain;
  } };
  let handle;
  runInNewContext(source, {
    Request, Response, crypto, console: { error() {} }, createClient: () => db,
    Deno: { env: { get: key => ({ SUPABASE_URL: 'https://example.org', SUPABASE_SERVICE_ROLE_KEY: 'test-only', ALLOWED_ORIGINS: 'https://bsvnordstern.de' })[key] }, serve: callback => { handle = callback; } },
    berlinToday, isValidIsoDate, formatDate: formatGermanDate, collectRecipientEmails,
    getEmailRuntimeConfig: () => ({ mode: 'live' }),
    sendEmail: async mail => { mails.push(mail); if (mailFails) throw new Error('Simulated failure'); return { id: 'message-1', mode: 'live' }; },
  });
  return { mails, operations, submit: (body = valid()) => handle(new Request('https://example.org/foerderverein-membership', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://bsvnordstern.de' }, body: JSON.stringify(body),
  })) };
}

test('complete application sends the mandatory copy and a separate confirmation without bank details', async () => {
  const app = harness({ extraRecipients: ['kasse@example.org'] });
  assert.equal((await app.submit()).status, 201);
  assert.deepEqual(Array.from(app.mails[0].to), ['foerderverein@bsvnordstern.de', 'kasse@example.org']);
  assert.equal(app.mails[0].bcc, 'jerome.ernsberger@gmail.com');
  assert.equal(app.mails[0].reply_to, 'mara@example.org');
  assert.match(app.mails[0].html, /18\.03\.1985/);
  assert.match(app.mails[0].html, /DE89 3704 0044 0532 0130 00/);
  assert.equal(app.mails[0].attachments.length, 1);
  assert.equal(app.mails[1].to, 'mara@example.org');
  assert.equal(app.mails[1].bcc, undefined);
  assert.doesNotMatch(app.mails[1].html, /DE89|Testbank|18\.03\.1985/);
  assert.equal(app.mails[1].attachments, undefined);
  const saved = app.operations.find(x => x.table === 'foerderverein_antraege' && x.operation === 'insert').values;
  assert.doesNotMatch(JSON.stringify(saved), /DE89|Testbank|Teststraße|signature|birthDate/);
});

test('mandatory copy is not duplicated when Jerome is already a configured recipient', async () => {
  const app = harness({ extraRecipients: [' Jerome.Ernsberger@gmail.com ', 'jerome.ernsberger@gmail.com'] });
  assert.equal((await app.submit()).status, 201);
  assert.equal(app.mails[0].to.filter(x => x === 'jerome.ernsberger@gmail.com').length, 1);
  assert.equal(app.mails[0].bcc, undefined);
});

test('invalid dates, future dates, missing status and too-low contributions cannot send mail', async () => {
  const future = `${new Date().getUTCFullYear() + 1}-12-31`;
  for (const values of [{ birthDate: '1985-02-30' }, { birthDate: future }, { signatureDate: future }, { signatureDate: '1980-01-01' }, { bsvMember: undefined }, { bsvMember: false, annualContribution: 11 }, { privacyAccepted: false }, { iban: 'DE89370400440532013001' }]) {
    const app = harness();
    assert.equal((await app.submit(valid(values))).status, 422);
    assert.equal(app.mails.length, 0);
    assert.equal(app.operations.length, 0);
  }
});

test('captcha is single-use and an incorrect answer never sends a message', async () => {
  const app = harness();
  assert.equal((await app.submit(valid({ captchaAnswer: 8 }))).status, 422);
  assert.equal((await app.submit()).status, 422);
  assert.equal(app.mails.length, 0);
});

test('mail failures do not claim the full application has been saved', async () => {
  const app = harness({ mailFails: true });
  const response = await app.submit();
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.saved, undefined);
  assert.match(result.message, /nicht zugestellt/);
});
