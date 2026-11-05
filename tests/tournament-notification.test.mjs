import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTournamentNotification, deliverTournamentNotification, TOURNAMENT_NOTIFICATION_RECIPIENT } from '../supabase/functions/_shared/tournament-notification.mjs';
import { createClubEmailPreparer } from '../supabase/functions/_shared/club-email-delivery.mjs';
import { BAMBINI_EVENT } from '../supabase/functions/_shared/bambini-event.mjs';
import { GIRLS_CUP_EVENT } from '../supabase/functions/_shared/girls-cup-event.mjs';
import { URMEL_EVENT } from '../supabase/functions/_shared/urmel-event.mjs';

test('all tournament notifications use the Girls Cup design and do not need sponsor snapshot storage', async () => {
  const prepare = createClubEmailPreparer({
    loadSponsors: async () => assert.fail('A complete tournament template must not load another sponsor pool'),
    freezeSponsors: async () => { throw new Error('E-Mail-Vorbereitung ist vorübergehend nicht verfügbar.'); },
  });
  for (const event of [BAMBINI_EVENT, GIRLS_CUP_EVENT, URMEL_EVENT, { title: 'Zeller Grundschulturnier 2027' }]) {
    const mail = buildTournamentNotification({ event, firstName: 'Mara', lastName: 'Muster', email: 'trainer@example.org', phone: '07732 123456', message: 'Verein: FC Testverein\nWunschzeit: 09:00 Uhr', reference: 'registration-123' });
    const rendered = await prepare(mail, { idempotencyKey: 'notification/test/registration-123' });
    assert.deepEqual(rendered.to, [TOURNAMENT_NOTIFICATION_RECIPIENT]);
    assert.equal(rendered.reply_to, 'trainer@example.org');
    assert.ok(rendered.html.includes('email-header-organic.png'));
    assert.ok(rendered.html.includes('data-bsv-email-header'));
    for (const content of [event.title, 'FC Testverein', '09:00 Uhr', 'registration-123', 'Mara Muster']) {
      assert.ok(rendered.html.includes(content), content);
      assert.ok(rendered.text.includes(content), content);
    }
    assert.ok(!rendered.html.includes('bsv-email-sponsor-slot'));
    assert.doesNotMatch(rendered.html, /Teilnahme ist hiermit bestätigt|Danke für eure Anmeldung/);
  }
});

test('transient failures retry one message and key, recording only the accepted send', async () => {
  const sends = [], updates = [], delays = [];
  const message = { to: [TOURNAMENT_NOTIFICATION_RECIPIENT], subject: 'Anmeldung', html: '<p>Test</p>' };
  const status = await deliverTournamentNotification({
    db: { from: () => ({ update: values => ({ eq: async () => { updates.push(values); return {}; } }) }) },
    table: 'contact_anfragen', id: 'ref-1', mode: 'live', message,
    delay: async ms => delays.push(ms),
    sendEmail: async (mail, options) => {
      sends.push({ mail, options });
      if (sends.length < 3) throw new Error('E-Mail-Versand fehlgeschlagen (503): temporary outage');
      return { id: 'provider-id', mode: 'live' };
    },
  });
  assert.equal(status, 'versendet');
  assert.equal(sends.length, 3);
  assert.ok(sends.every(send => send.mail === message));
  assert.equal(new Set(sends.map(send => send.options.idempotencyKey)).size, 1);
  assert.deepEqual(delays, [1000, 2000]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].resend_id, 'provider-id');
});

test('status storage failure after acceptance never sends a duplicate notification', async () => {
  let sends = 0;
  const status = await deliverTournamentNotification({
    db: { from: () => ({ update: () => ({ eq: async () => { throw new Error('database unavailable'); } }) }) },
    table: 'contact_anfragen', id: 'ref-1', mode: 'live', message: {},
    sendEmail: async () => { sends++; return { id: 'provider-id', mode: 'live' }; },
  });
  assert.equal(status, 'versendet');
  assert.equal(sends, 1);
});
