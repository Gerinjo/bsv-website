import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  collectRecipientEmails,
  getMembershipRoutingKeys,
} from '../supabase/functions/_shared/membership-routing.mjs';

const membershipSource = readFileSync(new URL('../public/api/membership-v3.php', import.meta.url), 'utf8');

test('full membership application routes to membership administration and pass office', () => {
  assert.deepEqual(getMembershipRoutingKeys('internal'), ['membership', 'passwesen']);
});

test('team notifications accept only protected team routing keys', () => {
  assert.deepEqual(
    getMembershipRoutingKeys('team', 'team--jugend--u13-d2'),
    ['team--jugend--u13-d2'],
  );
  assert.equal(getMembershipRoutingKeys('team', 'membership'), null);
  assert.equal(getMembershipRoutingKeys('team', 'team--'), null);
  assert.equal(getMembershipRoutingKeys('unknown', 'team--jugend--u13-d2'), null);
});

test('primary and additional recipients are normalized and deduplicated', () => {
  assert.deepEqual(collectRecipientEmails([
    {
      email: ' Trainer.One@BSVNordstern.de ',
      weitere_emails: ['trainer.two@bsvnordstern.de', 'trainer.one@bsvnordstern.de'],
    },
  ]), [
    'trainer.one@bsvnordstern.de',
    'trainer.two@bsvnordstern.de',
  ]);
  assert.equal(collectRecipientEmails([{ email: 'ungueltig', weitere_emails: [] }]), null);
});

test('every selectable team has a protected routing key', () => {
  const routingKeys = membershipSource.match(/'routingKey'\s*=>\s*'team--[^']+'/g) ?? [];
  assert.equal(routingKeys.length, 21);
  assert.equal(new Set(routingKeys).size, 21);
});

test('membership form and PHP endpoint name the C1 trainer consistently', () => {
  const formSource = readFileSync(new URL('../src/pages/verein/mitglied-werden.astro', import.meta.url), 'utf8');
  assert.match(formSource, /A\. Schäuble, S\. Bühler, T\. Parthenschlager/);
  assert.match(membershipSource, /A\. Schäuble, S\. Bühler, T\. Parthenschlager/);
  assert.doesNotMatch(formSource, /Scholpre/);
  assert.doesNotMatch(membershipSource, /Scholpre/);
});

test('trainer notification contains contact data but no bank data or attachments', () => {
  const sectionStart = membershipSource.indexOf('$trainerSubject =');
  const sectionEnd = membershipSource.indexOf('$siteBase =', sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart);
  const trainerSection = membershipSource.slice(sectionStart, sectionEnd);

  for (const label of [
    'Antragsnummer:',
    'Mitglied:',
    'Geburtsdatum:',
    'Abteilung:',
    'Mannschaft bereits bekannt: Ja',
    'Ausgewählte Mannschaft:',
    'Aktuelles Trainerteam:',
    'Anschrift:',
    'E-Mail:',
    'Telefon:',
    'Kontaktperson:',
    'Telefon Kontaktperson:',
  ]) {
    assert.match(trainerSection, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.doesNotMatch(trainerSection, /IBAN|BIC|Bank:|allAttachments|pdfAttachment|signatureAttachment/);
  assert.match(trainerSection, /\$sendMail\(\s*'team',\s*'',/);
  assert.match(trainerSection, /\$trainerBody,\s*array\(\),/);
});
