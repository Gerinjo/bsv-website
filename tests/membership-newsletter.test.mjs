import assert from 'node:assert/strict';
import test from 'node:test';
import { queueMembershipNewsletter, MEMBERSHIP_NEWSLETTER_CONSENT_VERSION } from '../supabase/functions/_shared/membership-newsletter.mjs';
import { hash } from '../supabase/functions/_shared/newsletter-tokens.mjs';

const body = { messageType: 'applicant', to: ' New.Member@Example.org ', emailNewsletterAccepted: true, applicationNumber: 'BSV-20260924-221000-A123' };
const noFetch = async () => new Response('', { status: 503 });

test('only explicit newsletter consent on the applicant message starts the workflow', async () => {
  for (const override of [
    { emailNewsletterAccepted: false }, { emailNewsletterAccepted: undefined },
    { emailNewsletterAccepted: 'accepted' }, { emailNewsletterAccepted: 'true' },
    { emailNewsletterAccepted: 1 }, { messageType: 'internal' }, { messageType: 'team' },
    { emailNewsletterAccepted: false, emailGeneralInfoAccepted: true },
    { emailNewsletterAccepted: undefined, text: 'Newsletter und digitale Vereinszeitschrift per E-Mail: Ja' },
  ]) {
    assert.equal(await queueMembershipNewsletter({
      db: { rpc: () => assert.fail('must not write a subscription') }, body: { ...body, ...override }, mode: 'live',
      fetcher: () => assert.fail('must not load sponsors without consent'),
    }), 'not_requested');
  }
});

test('membership opt-in queues a BSV confirmation with source, reference and hashed token', async () => {
  for (const mode of ['test', 'live']) {
    let called = false;
    const db = { async rpc(name, args) {
      called = true;
      assert.equal(name, 'newsletter_request_membership');
      assert.equal(args.p_mode, mode);
      assert.equal(args.p_email, 'new.member@example.org');
      assert.equal(args.p_application_number, body.applicationNumber);
      assert.equal(args.p_consent_version, MEMBERSHIP_NEWSLETTER_CONSENT_VERSION);
      const token = args.p_message.text.match(/bestaetigen#token=([0-9a-f]{64})/)[1];
      assert.equal(args.p_token_hash, await hash(token));
      assert.match(args.p_message.html, /Schlesierstraße 43/);
      assert.match(args.p_message.text, /Ohne deine Bestätigung erhältst du keine E-Mails aus diesem Verteiler/);
      return { data: { status: 'queued' }, error: null };
    } };
    assert.equal(await queueMembershipNewsletter({ db, body, mode, fetcher: noFetch }), 'queued');
    assert.ok(called);
  }
});

test('malformed addresses, missing application reference and invalid mode cannot enqueue', async () => {
  for (const override of [{ to: '' }, { to: 'bad@example.org\nBcc: injected@example.org' }, { applicationNumber: undefined }, { applicationNumber: 'arbitrary' }]) {
    await assert.rejects(queueMembershipNewsletter({
      db: { rpc: () => assert.fail() }, body: { ...body, ...override }, mode: 'live', fetcher: noFetch,
    }), /invalid_membership_newsletter_request/);
  }
  await assert.rejects(queueMembershipNewsletter({ db: {}, body, mode: 'invalid', fetcher: noFetch }));
});

test('confirmed, pending and repeated applications do not require another queue operation', async () => {
  for (const status of ['already_confirmed', 'pending', 'already_requested']) {
    let calls = 0;
    const db = { async rpc() { calls++; return { data: { status }, error: null }; } };
    assert.equal(await queueMembershipNewsletter({ db, body, mode: 'live', fetcher: noFetch }), status);
    assert.equal(calls, 1);
  }
});

test('database failures and throttling are reported instead of claiming a successful signup', async () => {
  for (const response of [{ data: null, error: { message: 'outage' } }, { data: { status: 'unavailable' }, error: null }]) {
    await assert.rejects(queueMembershipNewsletter({
      db: { rpc: async () => response }, body, mode: 'live', fetcher: noFetch,
    }), /membership_newsletter_queue_failed/);
  }
});
