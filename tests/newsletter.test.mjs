import assert from 'node:assert/strict';
import test from 'node:test';
import { createNewsletterHandler, hash, token } from '../supabase/functions/newsletter/handler.mjs';
import { renderNewsletterEmail, selectSponsors, loadSponsors } from '../supabase/functions/newsletter/emails.mjs';
import { processNewsletterJob, syncNewsletterContact, NORDSTERN_SEGMENT_ID } from '../supabase/functions/newsletter/workflow.mjs';

const config = { mode: 'test', testMode: true, resendApiKey: 'fake', mailFrom: 'BSV <test@example.org>' };
const noFetch = async () => new Response('', { status: 503 });
const makeRequest = (body, headers = {}) => new Request('https://example.org/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const sponsor = (id) => ({ id, name: `Partner ${id}`, website: `https://example.org/${id}`, logo: `https://bsvnordstern.de/images/${id}.png`, width: 100, height: 50 });

test('tokens are unguessable, distinct, and only their SHA-256 hashes identify a request', async () => {
  const a = token(), b = token();
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, b);
  assert.notEqual(await hash(a), a);
  assert.equal(await hash(a), await hash(a));
});

test('email templates contain BSV identity, action, address and same sponsor selection in HTML/text', () => {
  for (const kind of ['confirmation', 'welcome']) {
    const mail = renderNewsletterEmail({ kind, email: 'fan@example.org', actionUrl: `https://bsvnordstern.de/newsletter/action#token=${'a'.repeat(64)}`, sponsors: [sponsor('one'), sponsor('two')] });
    for (const content of [mail.html, mail.text]) {
      assert.match(content, /Schlesierstraße 43/);
      assert.match(content, /78315 Radolfzell/);
      assert.match(content, /Partner one/);
      assert.match(content, /Partner two/);
      assert.match(content, /#token=a{64}/);
      assert.match(content, /info@bsvnordstern.de/);
    }
    assert.match(mail.html, /bsv-nordstern.png/);
    assert.match(mail.html, /#f4d638/);
    if (kind === 'confirmation') assert.match(mail.text, /Ohne deine Bestätigung erhältst du keinen Newsletter/);
    else assert.match(mail.text, /Newsletter abmelden/);
  }
});

test('partner pool is unique, shuffled and rejects unsafe URLs; outages preserve the signup email', async () => {
  const pool = [sponsor('one'), sponsor('two'), sponsor('three'), sponsor('four'), sponsor('one'), { ...sponsor('bad'), website: 'javascript:alert(1)' }];
  const partners = selectSponsors(pool, () => 0);
  assert.equal(partners.length, 3);
  assert.equal(new Set(partners.map((item) => item.id)).size, 3);
  assert.ok(!partners.some((item) => item.id === 'bad'));
  assert.notDeepEqual(partners.map((item) => item.id), ['one', 'two', 'three']);
  assert.deepEqual(await loadSponsors(noFetch), []);
  const mail = renderNewsletterEmail({ kind: 'confirmation', email: 'a&b@example.org', actionUrl: 'https://example.org/#x', sponsors: [{ ...sponsor('a'), name: '<script>bad</script>' }] });
  assert.ok(!mail.html.includes('<script>'));
  assert.match(mail.html, /&lt;script&gt;/);
  assert.match(mail.html, /a&amp;b@example.org/);
});

function stubDb({ rpc = () => null, table = () => null } = {}) {
  return {
    rpc: async (name, args) => ({ data: await rpc(name, args), error: null }),
    from(name) {
      const state = { name, filters: {}, operation: 'select' };
      const chain = {
        select() { return chain; },
        delete() { state.operation = 'delete'; return chain; },
        update(values) { state.operation = 'update'; state.values = values; return chain; },
        eq(key, value) { state.filters[key] = value; return chain; },
        single() { return chain; }, maybeSingle() { return chain; },
        then(resolve, reject) { return Promise.resolve(table(state)).then((data) => ({ data, error: null })).then(resolve, reject); },
      };
      return chain;
    },
  };
}
const handler = (db, overrides = {}) => createNewsletterHandler({ db, config, sendEmail: async () => { throw new Error('unexpected send'); }, serviceKey: 'server-only', fetcher: noFetch, ...overrides });

test('GET, bad origins, malformed bodies, absent consent and unauthenticated workers have no side effects', async () => {
  const handle = handler(stubDb({ rpc: () => assert.fail('unexpected database operation'), table: () => assert.fail('unexpected database operation') }));
  assert.equal((await handle(new Request('https://example.org?token=abc'))).status, 405);
  assert.equal((await handle(makeRequest({ action: 'subscribe' }, { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await handle(makeRequest(null))).status, 400);
  assert.equal((await handle(makeRequest({ action: 'subscribe', email: 'a@example.org' }))).status, 422);
  assert.equal((await handle(makeRequest({ action: 'process' }))).status, 401);
  assert.equal((await handle(makeRequest({ action: 'confirm', token: 'guess' }))).status, 400);
  assert.equal((await handle(makeRequest({ action: 'subscribe', email: 'x'.repeat(5000) }))).status, 400);
});

test('a signup consumes the captcha and queues a confirmation without activating any contact', async () => {
  let queued;
  const db = stubDb({
    table: (state) => { assert.equal(state.name, 'contact_captcha_challenges'); assert.equal(state.operation, 'delete'); return { antwort: 7, expires_at: new Date(Date.now() + 60000).toISOString() }; },
    rpc: (name, args) => { assert.equal(name, 'newsletter_request'); queued = args; return null; },
  });
  const response = await handler(db)(makeRequest({ action: 'subscribe', email: ' Fan@Example.ORG ', consent: true, captchaToken: '11111111-1111-4111-8111-111111111111', captchaAnswer: 7 }));
  assert.equal(response.status, 202);
  assert.equal(queued.p_email, 'fan@example.org');
  assert.equal(queued.p_mode, 'test');
  assert.match(queued.p_message.html, /Anmeldung bestätigen/);
  assert.equal(queued.p_token_hash, await hash(queued.p_message.text.match(/#token=([a-f0-9]+)/)[1]));
  assert.match(queued.p_rate_key, /^[a-f0-9]{64}$/);
});

test('incorrect captcha and honeypot do not queue mail', async () => {
  const handle = handler(stubDb({ rpc: () => assert.fail('no mail may be queued'), table: () => ({ antwort: 8, expires_at: new Date(Date.now() + 60000).toISOString() }) }));
  assert.equal((await handle(makeRequest({ action: 'subscribe', email: 'fan@example.org', consent: true, captchaToken: '11111111-1111-4111-8111-111111111111', captchaAnswer: 7 }))).status, 422);
  assert.equal((await handle(makeRequest({ action: 'subscribe', website: 'spam' }))).status, 200);
});

test('expired confirmations cannot queue welcome mail, repeated clicks do not regenerate a message', async () => {
  for (const consumed of [false, true]) {
    let parameters;
    const db = stubDb({ table: () => ({ email: 'fan@example.org', token_consumed: consumed, confirmation_expires_at: '2000-01-01' }), rpc: (name, args) => { assert.equal(name, 'newsletter_confirm'); parameters = args; return { status: consumed ? 'already_confirmed' : 'expired' }; } });
    const response = await handler(db)(makeRequest({ action: 'confirm', token: 'a'.repeat(64) }));
    assert.equal(response.status, consumed ? 200 : 400);
    assert.equal(parameters.p_message, null);
  }
});

test('only a token confirmed by the database creates the welcome job', async () => {
  let parameters;
  const db = stubDb({ table: () => ({ email: 'fan@example.org', token_consumed: false, confirmation_expires_at: new Date(Date.now() + 60000).toISOString() }), rpc: (name, args) => { assert.equal(name, 'newsletter_confirm'); parameters = args; return { status: 'confirmed' }; } });
  const result = await (await handler(db)(makeRequest({ action: 'confirm', token: 'a'.repeat(64) }))).json();
  assert.equal(result.ok, true);
  assert.match(result.message, /Testanmeldung/);
  assert.match(parameters.p_message.subject, /Willkommen/);
  assert.equal(parameters.p_unsubscribe_hash, await hash(parameters.p_message.text.match(/abmelden#token=([a-f0-9]+)/)[1]));
});

function workflowFixture({ mode = 'test', kind = 'welcome', status = 'confirmed', attempts = 1, providerSynced = false, firstAttempt = new Date().toISOString() } = {}) {
  const changes = [];
  const job = { id: 'job-1', subscription_id: 'sub-1', lease_id: 'lease-1', kind, attempts, first_attempt_at: firstAttempt, provider_synced: providerSynced, message: { to: 'fan@example.org', subject: 'Welcome', html: '<p>Hello</p>' } };
  const db = stubDb({ rpc: (name, args) => { assert.equal(name, 'newsletter_claim_job'); assert.equal(args.p_mode, mode); return [job]; }, table: (state) => {
    if (state.name === 'newsletter_subscriptions') return { id: 'sub-1', email: 'fan@example.org', status, mail_mode: mode, token_consumed: true };
    assert.equal(state.filters.lease_id, 'lease-1'); changes.push(state.values); return null;
  } });
  return { db, changes, config: { ...config, mode, testMode: mode === 'test' } };
}

test('test workflows send branded test mail but never mutate real Resend contacts', async () => {
  const fixture = workflowFixture();
  let mail;
  await processNewsletterJob({ ...fixture, fetcher: () => assert.fail('test contact must not reach Resend'), sendEmail: async (message, options) => { mail = { message, options }; return { mode: 'test', id: 'mail-1' }; } });
  assert.equal(mail.options.idempotencyKey, 'newsletter/test/job-1');
  assert.equal(fixture.changes.at(-1).status, 'sent');
  assert.equal(fixture.changes.at(-1).message, null);
});

test('live welcome follows segment activation; retry uses same payload/key and skips completed sync', async () => {
  const events = [];
  const fixture = workflowFixture({ mode: 'live' });
  await processNewsletterJob({ ...fixture, contactsApiKey: 'contacts-only-test-key', fetcher: async (url, options) => { assert.equal(options.headers.Authorization, 'Bearer contacts-only-test-key'); events.push(`${options.method} ${new URL(url).pathname}`); return options.method === 'GET' ? new Response('', { status: 404 }) : Response.json({ id: 'contact' }); }, sendEmail: async (_, options) => { assert.equal(fixture.config.resendApiKey, 'fake'); events.push(options.idempotencyKey); return { mode: 'live', id: 'mail-1' }; } });
  assert.deepEqual(events, ['GET /contacts/fan%40example.org', 'POST /contacts', 'newsletter/live/job-1']);
  const retry = workflowFixture({ mode: 'live', providerSynced: true });
  await processNewsletterJob({ ...retry, fetcher: () => assert.fail('no second contact sync'), sendEmail: async (_, options) => { assert.equal(options.idempotencyKey, events.at(-1)); throw new Error('provider body with sensitive data'); } });
  assert.equal(retry.changes.at(-1).status, 'pending');
  assert.equal(retry.changes.at(-1).last_error, 'delivery_failed');
  assert.ok(!Object.hasOwn(retry.changes.at(-1), 'message'), 'retry keeps the frozen email and sponsor selection');
});

test('unsubscribed contacts and exhausted retry windows cannot trigger a welcome', async () => {
  for (const args of [{ status: 'unsubscribed' }, { firstAttempt: '2000-01-01' }]) {
    const fixture = workflowFixture(args);
    await processNewsletterJob({ ...fixture, fetcher: () => assert.fail(), sendEmail: () => assert.fail() });
    assert.ok(['cancelled', 'failed'].includes(fixture.changes.at(-1).status));
  }
});

test('existing global provider opt-outs are preserved; unsubscribe removes only the newsletter segment', async () => {
  const calls = [];
  const fetcher = async (url, options) => { calls.push(options.method); return Response.json({ unsubscribed: true }); };
  await assert.rejects(syncNewsletterContact({ kind: 'welcome', email: 'fan@example.org', apiKey: 'fake', segmentId: NORDSTERN_SEGMENT_ID, fetcher }), /resend_global_opt_out/);
  assert.deepEqual(calls, ['GET']);
  await syncNewsletterContact({ kind: 'unsubscribe', email: 'fan@example.org', apiKey: 'fake', segmentId: NORDSTERN_SEGMENT_ID, fetcher: async (url, options) => { assert.equal(options.method, 'DELETE'); assert.ok(url.endsWith(`/segments/${NORDSTERN_SEGMENT_ID}`)); return new Response('', { status: 404 }); } });
});
