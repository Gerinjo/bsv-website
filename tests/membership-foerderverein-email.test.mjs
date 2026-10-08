import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { collectRecipientEmails, getMembershipRoutingKeys } from '../supabase/functions/_shared/membership-routing.mjs';
import { isTrainerEmail, getTrainerEmailRecipient, getTrainerEmailMode, TRAINER_TEST_RECIPIENT } from '../supabase/functions/_shared/trainer-onboarding-email.mjs';

const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/membership-email/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, ''));
const attachment = { filename: 'Foerdervereinsantrag-FV-20261005-ABC123.pdf', contentType: 'application/pdf', content: Buffer.from('%PDF-test-only').toString('base64') };

function harness({ recipients = [{ schluessel: 'foerderverein', email: 'foerderverein@bsvnordstern.de', weitere_emails: [] }], fails = false } = {}) {
  let handler;
  const mails = [], lookups = [], newsletter = [];
  const db = { from(table) {
    const chain = {
      select() { return chain; },
      in(field, keys) { lookups.push({ table, field, keys: Array.from(keys) }); return chain; },
      eq() { return Promise.resolve({ data: recipients, error: null }); },
    }; return chain;
  } };
  runInNewContext(source, {
    Response, Request, console: { error() {} }, createClient: () => db, collectRecipientEmails, getMembershipRoutingKeys, isTrainerEmail, getTrainerEmailRecipient, getTrainerEmailMode, TRAINER_TEST_RECIPIENT,
    Deno: { env: { get: key => ({ MEMBERSHIP_EMAIL_SECRET: 'test-secret', SUPABASE_URL: 'https://example.org', SUPABASE_SERVICE_ROLE_KEY: 'test-only' })[key] }, serve: callback => { handler = callback; } },
    getEmailRuntimeConfig: () => ({ mode: 'live' }),
    queueMembershipNewsletter: async options => { newsletter.push(options); return 'not_requested'; },
    sendEmail: async (mail, options) => { mails.push({ mail, options }); if (fails) throw new Error('test failure'); return { id: 'test-message', mode: 'live' }; },
  });
  return { mails, lookups, newsletter, submit: (overrides = {}, secret = 'test-secret') => handler(new Request('https://example.org/membership-email', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bsv-membership-secret': secret },
    body: JSON.stringify({ messageType: 'foerderverein', to: 'attacker@example.org', routingKey: 'membership', subject: 'Fördervereinsantrag', text: 'Antrag', html: '<p>Antrag</p>', replyTo: 'mara@example.org', applicationNumber: 'BSV-20261005-111500-A1B2', attachments: [attachment], ...overrides }),
  })) };
}

test('Förderverein receives only its PDF and Jerome always receives a copy', async () => {
  const app = harness();
  assert.equal((await app.submit()).status, 201);
  assert.deepEqual(app.lookups, [{ table: 'contact_empfaenger', field: 'schluessel', keys: ['foerderverein'] }]);
  const { mail, options } = app.mails[0];
  assert.deepEqual(Array.from(mail.to), ['foerderverein@bsvnordstern.de']);
  assert.equal(mail.bcc, 'jerome.ernsberger@gmail.com');
  assert.equal(mail.reply_to, 'mara@example.org');
  assert.equal(mail.attachments.length, 1);
  assert.equal(mail.attachments[0].content, attachment.content);
  assert.equal(options.idempotencyKey, 'membership-foerderverein/live/BSV-20261005-111500-A1B2');
  assert.equal(app.newsletter[0].db, null);
});

test('configured additional recipients are retained and Jerome is not duplicated', async () => {
  const app = harness({ recipients: [{ schluessel: 'foerderverein', email: 'foerderverein@bsvnordstern.de', weitere_emails: [' Jerome.Ernsberger@gmail.com ', 'kasse@example.org'] }] });
  assert.equal((await app.submit()).status, 201);
  assert.deepEqual(Array.from(app.mails[0].mail.to), ['foerderverein@bsvnordstern.de', 'jerome.ernsberger@gmail.com', 'kasse@example.org']);
  assert.equal(app.mails[0].mail.bcc, undefined);
});

test('missing authentication or routing never sends an application', async () => {
  const app = harness();
  assert.equal((await app.submit({}, '')).status, 401);
  assert.equal(app.mails.length, 0);
  const missing = harness({ recipients: [] });
  assert.equal((await missing.submit()).status, 503);
  assert.equal(missing.mails.length, 0);
});

test('passport uploads and main club PDFs cannot be sent via the Förderverein route', async () => {
  for (const attachments of [[], [{ ...attachment, filename: 'BSV-Mitgliedsantrag.pdf' }], [attachment, { ...attachment, filename: 'Ausweis.png', contentType: 'image/png' }]]) {
    const app = harness();
    assert.equal((await app.submit({ attachments })).status, 422);
    assert.equal(app.mails.length, 0);
  }
});

test('mail failures propagate to PHP for partial-success handling', async () => {
  const app = harness({ fails: true });
  const response = await app.submit();
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, 'email_failed');
});
