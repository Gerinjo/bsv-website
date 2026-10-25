import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio';
import { buildEventConfirmation, deliverEventConfirmation } from '../supabase/functions/_shared/event-confirmation.mjs';
import { getOtherTournaments } from '../supabase/functions/_shared/tournament-announcements.mjs';
import { BAMBINI_EVENT } from '../supabase/functions/_shared/bambini-event.mjs';
import { GIRLS_CUP_EVENT } from '../supabase/functions/_shared/girls-cup-event.mjs';
import { URMEL_EVENT } from '../supabase/functions/_shared/urmel-event.mjs';

const now = new Date('2026-10-25T12:00:00Z');
const girlsUrl = 'https://bsvnordstern.de/erlebnis/bodensee-indoor-girls-cup/';

test('each event announces the other upcoming BSV tournaments using the shared dates and fees', () => {
  const all = getOtherTournaments('', now);
  assert.equal(all.length, 3);
  assert.ok(all.every(event => !event.url.includes('gst2027') && !event.title.includes('Grundschulturnier')));
  for (const event of all) {
    const others = getOtherTournaments(event.url, now);
    assert.equal(others.length, 2);
    assert.ok(others.every(other => other.url !== event.url));
  }
  const girls = all.find(event => event.url === girlsUrl);
  assert.equal(girls.date, GIRLS_CUP_EVENT.date);
  assert.ok(girls.note.includes(String(GIRLS_CUP_EVENT.firstTeamFee)));
  assert.ok(all.some(event => event.title === BAMBINI_EVENT.title && event.date === BAMBINI_EVENT.date));
  assert.ok(all.some(event => event.title === URMEL_EVENT.title && event.date === URMEL_EVENT.date));
  assert.deepEqual(getOtherTournaments(girlsUrl + '?from=email#anmeldung', now), getOtherTournaments(girlsUrl.slice(0, -1), now));
});

test('announcements expire after the last event day in Berlin', () => {
  // 23:30 UTC is already the next calendar day in Berlin in December.
  const before = getOtherTournaments('', new Date('2026-12-12T22:30:00Z'));
  const after = getOtherTournaments('', new Date('2026-12-12T23:30:00Z'));
  assert.ok(before.some(event => event.title === BAMBINI_EVENT.title));
  assert.ok(!after.some(event => event.title === BAMBINI_EVENT.title));
  assert.ok(getOtherTournaments('', new Date('2027-02-21T12:00:00Z')).some(event => event.url === girlsUrl));
  assert.ok(!getOtherTournaments('', new Date('2027-02-22T12:00:00Z')).some(event => event.url === girlsUrl));
  assert.deepEqual(getOtherTournaments('', new Date('2028-01-01T12:00:00Z')), []);
});

test('HTML and text confirmations announce the same other tournaments with direct links', () => {
  const mail = buildEventConfirmation({
    event: { ...GIRLS_CUP_EVENT, url: girlsUrl }, firstName: 'Mara', lastName: 'Muster',
    email: 'trainer@example.org', phone: '07732 123456', details: [['Verein', 'FC Testverein']], reference: 'one-registration', now,
  });
  const $ = load(mail.html);
  const section = $('h2').filter((_, element) => $(element).text() === 'Unsere weiteren Turniere').parent();
  assert.ok(section.length);
  for (const event of getOtherTournaments(girlsUrl, now)) {
    assert.ok(section.text().includes(event.title));
    assert.ok(section.text().includes(event.date));
    const card = section.find('h3').filter((_, heading) => $(heading).text() === event.title).closest('.tournament-card');
    assert.equal(card.find(`a[href="${event.url}"]`).length, 1);
    assert.equal(card.find('img').attr('src'), event.image.src);
    assert.equal(card.find('.tournament-copy').next('.tournament-image-cell').find('img').attr('width'), '132');
    assert.ok(card.find('img').attr('alt'));
    assert.ok(mail.text.includes(event.url));
  }
  assert.ok(!section.text().includes(GIRLS_CUP_EVENT.title));
  assert.ok(!mail.text.includes('Grundschulturnier'));
  assert.ok(!mail.html.includes('/gst2027/'));
  assert.ok(mail.text.includes('Urmel Bambini Cup 2027 – Kinder spielen für Kinder'));
  assert.match(section.find('img[alt*="Urmel"]').attr('src'), /urmel-drache\.png$/);
  const summary = $('.registration-summary');
  assert.equal(summary.find('.registration-details').next('.registration-art').find('img').attr('src'), 'https://bsvnordstern.de/images/events/bodensee-indoor-girls-cup-2027-motiv.jpg');
  assert.equal(summary.find('caption').text(), 'Eure Anmeldedaten');
  assert.equal(summary.find('th[scope="row"]').length, summary.find('.registration-details td').length);
  for (const value of ['FC Testverein', 'Mara Muster', 'trainer@example.org', '07732 123456', 'one-registration']) {
    assert.ok(summary.text().includes(value));
  }
});

test('transient errors retry with one idempotency key and record only the final outcome', async () => {
  const sends = [], updates = [], waits = [];
  const db = { from: table => ({ update: values => ({ eq: async (key, id) => { updates.push({ table, values, key, id }); return {}; } }) }) };
  const status = await deliverEventConfirmation({
    db, table: 'contact_anfragen', id: 'one-registration', message: { to: 'test@example.org' }, mode: 'live',
    sendEmail: async (message, options) => {
      sends.push({ message, options });
      if (sends.length === 1) throw new Error('E-Mail-Versand fehlgeschlagen (429): rate limit');
      if (sends.length === 2) throw new Error('E-Mail-Versand fehlgeschlagen (503): temporary');
      return { mode: 'live', id: 'provider-id' };
    }, delay: async ms => { waits.push(ms); },
  });
  assert.equal(status, 'versendet');
  assert.equal(sends.length, 3);
  assert.equal(new Set(sends.map(send => send.options.idempotencyKey)).size, 1);
  assert.deepEqual(waits, [1000, 2000]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].values.bestaetigung_resend_id, 'provider-id');
  assert.equal(updates[0].values.bestaetigung_fehler, null);
});

test('status persistence failure after provider acceptance never triggers a second send', async () => {
  let sends = 0;
  const status = await deliverEventConfirmation({
    db: { from: () => ({ update: () => ({ eq: async () => { throw new Error('database unavailable'); } }) }) },
    table: 'gst_anmeldungen', id: 'one-registration', message: {}, mode: 'test',
    sendEmail: async () => { sends++; return { mode: 'test', id: 'provider-id' }; },
  });
  assert.equal(status, 'versendet');
  assert.equal(sends, 1);
});
