import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { withMembershipDatabase } from '../supabase/functions/membership-email/database.mjs';
import { collectRecipientEmails, getMembershipRoutingKeys } from '../supabase/functions/_shared/membership-routing.mjs';
import { isTrainerEmail, getTrainerEmailRecipient, getTrainerEmailMode, TRAINER_TEST_RECIPIENT } from '../supabase/functions/_shared/trainer-onboarding-email.mjs';

const clockError = { code: 'PGRST303', message: 'JWT issued at future' };
const recipients = ['membership', 'passwesen', 'membership-registration-copy'].map(schluessel => ({ schluessel, email: 'office@example.org', weitere_emails: [] }));
function adapter(result = { data: null, error: clockError }, nativeFailure = false) {
  const calls = [], queries = [];
  const native = Object.assign(async (strings, ...values) => {
    const sql = strings.join('?'); calls.push({ sql, values });
    if (nativeFailure) throw Object.assign(new Error('private connection information'), { code: '08006' });
    if (sql.includes('set local role')) return [];
    return sql.includes('select schluessel') ? recipients : [{ data: { status: 'queued', ok: true } }];
  }, { json: value => value });
  const rest = {
    from(table) { return { select(columns) { return { in(field, keys) { return { eq(flag, active) { queries.push({ table, columns, field, keys, flag, active }); return Promise.resolve(result); } }; } }; } }; },
    rpc: async () => result,
  };
  const connect = () => ({ begin: fn => fn(native) });
  return { db: withMembershipDatabase(rest, connect), rest, calls, queries, connect };
}

test('a clock rejection recovers the exact recipient lookup with bound keys and service_role privileges', async () => {
  const app = adapter(), keys = ['membership', "key'); drop table contacts; --"];
  const result = await app.db.recipients(keys);
  assert.deepEqual(result.data, recipients); assert.equal(result.error, null);
  assert.match(app.calls[0].sql, /set local role service_role/);
  assert.ok(app.calls[1].values.includes(keys));
  assert.ok(!app.calls[1].sql.includes('drop table'));
  assert.equal(app.queries[0].active, true);
});

test('healthy responses, other JWT errors, permission errors, and SQL failures are never replayed', async () => {
  for (const error of [null, { code: 'PGRST303', message: 'JWT expired' }, { code: '42501' }, { code: '23505' }]) {
    const result = { data: error ? null : recipients, error }, app = adapter(result);
    assert.equal(await app.db.recipients(['membership']), result); assert.equal(app.calls.length, 0);
  }
  const app = adapter();
  const broken = withMembershipDatabase({ from() { throw new Error('network failure'); } }, app.connect);
  await assert.rejects(async () => broken.recipients(['membership']), /network failure/);
  assert.equal(app.calls.length, 0);
});

test('only the two known membership RPCs recover an authentication rejection, with fixed bound SQL', async () => {
  const app = adapter();
  assert.deepEqual((await app.db.rpc('trainer_suite_onboarding_queue', { payload: { action: 'prepare' } })).data, { status: 'queued', ok: true });
  const args = { p_email: 'person@example.org', p_mode: 'test', p_token_hash: 'a'.repeat(64), p_message: { text: 'confirmation' }, p_consent_version: 'test', p_application_number: 'BSV-20261027-001925-769E', p_topics: ['newsletter'] };
  assert.equal((await app.db.rpc('newsletter_request_membership_topics', args)).data.status, 'queued');
  assert.equal(app.calls.filter(call => call.sql.includes('select public.')).length, 2);
  assert.ok(app.calls.at(-1).values.includes(args.p_message));
  const count = app.calls.length;
  assert.equal((await app.db.rpc('arbitrary_function', {})).error, clockError);
  assert.equal(app.calls.length, count);
});

test('an unavailable native connection keeps the original failure and missing configuration remains explicit', async () => {
  const app = adapter(undefined, true);
  assert.equal((await app.db.recipients(['membership'])).error, clockError);
  assert.equal((await withMembershipDatabase(app.rest).recipients(['membership'])).error, clockError);
});

test('authenticated internal application dry run succeeds despite clock rejection, sends no mail, and writes no subscriptions', async () => {
  const app = adapter(); let handler;
  const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/membership-email/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, ''));
  runInNewContext(source, {
    Response, Request, console: { error() {} }, createClient: () => app.rest, postgres: () => app.connect(), withMembershipDatabase,
    collectRecipientEmails, getMembershipRoutingKeys, isTrainerEmail, getTrainerEmailRecipient, getTrainerEmailMode, TRAINER_TEST_RECIPIENT,
    Deno: { env: { get: key => ({ MEMBERSHIP_EMAIL_SECRET: 'test-secret', SUPABASE_URL: 'https://example.org', SUPABASE_SERVICE_ROLE_KEY: 'test-only', SUPABASE_DB_URL: 'postgres://test-only' })[key] }, serve: fn => { handler = fn; } },
    getEmailRuntimeConfig: () => ({ mode: 'live', mailFrom: 'sender@example.org', resendApiKey: 'test-only' }),
    sendEmail: () => assert.fail('dry run must never deliver mail'),
    queueMembershipNewsletter: () => assert.fail('dry run must never queue subscriptions'),
    prepareTrainerOnboarding: () => assert.fail('dry run must never prepare onboarding'),
  });
  const submit = secret => handler(new Request('https://example.org/membership-email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bsv-membership-secret': secret }, body: JSON.stringify({ messageType: 'internal', subject: 'Routing test', text: 'Test', html: '<p>Test</p>', dryRun: true, attachments: [] }) }));
  assert.equal((await submit('wrong-secret')).status, 401); assert.equal(app.calls.length, 0);
  const response = await submit('test-secret'), result = await response.json();
  assert.equal(response.status, 200); assert.equal(result.dryRun, true); assert.deepEqual(result.to, ['office@example.org']);
  assert.equal(result.senderConfigured, true);
});
