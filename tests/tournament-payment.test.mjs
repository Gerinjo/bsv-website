import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio';
import { tournamentPayment, YOUTH_TREASURY } from '../supabase/functions/_shared/tournament-payment.mjs';
import { isValidIban } from '../src/utils/bankDetails.mjs';
import { buildEventConfirmation } from '../supabase/functions/_shared/event-confirmation.mjs';
import { GIRLS_CUP_EVENT } from '../supabase/functions/_shared/girls-cup-event.mjs';

test('the confirmed youth account is valid and payment references retain the registration ID within SEPA limits', () => {
  assert.equal(isValidIban(YOUTH_TREASURY.iban), true);
  const reference = '11111111-1111-4111-8111-111111111111';
  const payment = tournamentPayment({ event: GIRLS_CUP_EVENT, clubName: 'Langer Vereinsname '.repeat(10), reference, amount: '100 € insgesamt' });
  assert.ok(payment.purpose.length <= 140);
  assert.ok(payment.purpose.endsWith(reference));
  assert.ok(payment.purpose.includes(GIRLS_CUP_EVENT.title));
  assert.equal(payment.accountHolder, 'BSV Nordstern e.V. Radolfzell');
});

test('confirmation thanks the team immediately and includes identical cash and bank instructions in HTML and text', () => {
  const reference = 'registration-123';
  const payment = tournamentPayment({ event: GIRLS_CUP_EVENT, clubName: 'FC <Test>', reference, amount: '100 € insgesamt' });
  const mail = buildEventConfirmation({
    event: { ...GIRLS_CUP_EVENT, url: 'https://bsvnordstern.de/erlebnis/bodensee-indoor-girls-cup/', nextSteps: 'Die Startzeiten und den Spielplan schicken wir euch rechtzeitig vor dem Turnier zu.' },
    firstName: 'Mara', lastName: 'Muster', email: 'trainer@example.org', phone: '07732 123456', details: [], reference, payment,
  });
  const $ = load(mail.html);
  for (const content of [$.text(), mail.text]) {
    assert.match(content, /Teilnahme ist hiermit bestätigt/);
    assert.match(content, /bar vor Ort bei der Turnierleitung/);
    assert.match(content, /Jugendkasse überweisen/);
    assert.ok(content.includes(payment.accountHolder));
    assert.ok(content.includes(payment.bank));
    assert.ok(content.includes('DE77 6925 0035 0004 1036 77'));
    assert.ok(content.includes(payment.bic));
    assert.ok(content.includes(payment.purpose));
    assert.ok(content.includes('100 € insgesamt'));
    assert.doesNotMatch(content, /Wir prüfen|Eingang eurer Anmeldung|sendet keine zweite Anmeldung/);
  }
  assert.equal($('Test').length, 0);
  assert.match(mail.html, /FC &lt;Test&gt;/);
  assert.match(mail.subject, /Anmeldung ist bestätigt/);
});
