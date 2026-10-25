import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { resolveEmailMode } from '../supabase/functions/_shared/email-mode.mjs';

const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/_shared/email-service.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '')).replace(/^export\s+/gm, '');
const officialAddress = 'jerome.ernsberger@bsvnordstern.de';

function harness(testRecipient) {
  const env = { EMAIL_DELIVERY_MODE: 'test', EMAIL_TEST_RECIPIENT: testRecipient, MAIL_FROM: 'BSV <no-reply@bsvnordstern.de>', RESEND_API_KEY: 'test-only' };
  const sent = [];
  const api = runInNewContext(source + '\n({sendEmail,getEmailRuntimeConfig});', {
    Deno: { env: { get: key => env[key] } }, resolveEmailMode, console,
    fetch: async (_, options) => { sent.push(JSON.parse(options.body)); return Response.json({ id: 'test-message' }); },
  });
  return { ...api, sent };
}

test('BSV test mail uses the club address with missing or legacy runtime configuration', async () => {
  for (const configured of [undefined, '', 'jerome.ernsberger@gmail.com', ' Jerome.Ernsberger@gmail.com ']) {
    const app = harness(configured);
    assert.equal(app.getEmailRuntimeConfig().testRecipient, officialAddress);
    await app.sendEmail({ to: 'applicant@example.org', subject: 'Vorschau', html: '<p>Test</p>' });
    assert.deepEqual(app.sent[0].to, [officialAddress]);
    assert.equal(app.sent[0].reply_to, officialAddress);
  }
});

test('legacy preview overrides use the club address while other configured test recipients remain selectable', async () => {
  const app = harness('qa@example.org');
  assert.equal(app.getEmailRuntimeConfig().testRecipient, 'qa@example.org');
  await app.sendEmail({ to: 'applicant@example.org', subject: 'Vorschau', html: '<p>Test</p>' }, { forceTestRecipient: 'jerome.ernsberger@gmail.com' });
  assert.deepEqual(app.sent[0].to, [officialAddress]);
  assert.equal(app.sent[0].reply_to, officialAddress);
});
