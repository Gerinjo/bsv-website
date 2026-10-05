import assert from 'node:assert/strict';
import test from 'node:test';
import { membershipSuccess, membershipFailure, membershipResultText } from '../src/utils/membership-result.mjs';

const selection = { memberName: 'Lea Muster', department: 'Fußball Jugend', team: 'U13 D2-Junioren',
  email: 'maria@example.invalid', foerderverein: null, emailOffers: [] };
const success = { applicationNumber: 'BSV-20261005-TEST', confirmationEmailSent: true, newsletterStatus: 'not_requested' };
const combined = { ...selection, foerderverein: { name: 'Maria Muster', contribution: '25' } };

test('main-only receipt states person, department, team, reference and email action without confirming admission', () => {
  const result = membershipSuccess(success, selection);
  assert.equal(result.kind, 'success');
  assert.equal(result.delivered, true);
  assert.equal(result.applications.length, 1);
  assert.equal(result.applications[0].person, 'Lea Muster');
  assert.match(result.applications[0].detail, /Fußball Jugend.*U13 D2-Junioren/);
  assert.match(result.applications[0].status, /BSV-20261005-TEST/);
  assert.match(result.intro, /prüft die Aufnahme/);
  assert.match(result.emailText, /maria@example.invalid.*Spam-Ordner/);
  assert.match(result.emailText, /deinem unterschriebenen Antrag/);
  assert.doesNotMatch(membershipResultText(result), /Förderverein|undefined|null|beiden/);
});

test('combined receipt identifies the child and the adult contact as different applicants', () => {
  const result = membershipSuccess({ ...success, foerdervereinStatus: 'sent', foerdervereinApplicationNumber: 'FV-123' }, combined);
  assert.equal(result.kind, 'success');
  assert.match(result.title, /Beide Anträge/);
  assert.deepEqual(result.applications.map(item => item.person), ['Lea Muster', 'Maria Muster']);
  assert.match(result.applications[1].detail, /25,00\s€ jährlich/);
  assert.match(result.applications[1].status, /FV-123/);
  assert.match(result.emailText, /beiden unterschriebenen Anträgen/);
});

test('partial Förderverein delivery does not invite duplicate applications or claim both were forwarded', () => {
  for (const status of ['failed', 'not_requested', undefined]) {
    const result = membershipSuccess({ ...success, foerdervereinStatus: status }, combined);
    assert.equal(result.kind, 'warning');
    assert.equal(result.delivered, true);
    assert.match(result.applications[0].status, /Erfolgreich übermittelt/);
    assert.match(result.applications[1].status, /Weiterleitung.*noch nicht bestätigt/);
    assert.match(result.notes.join(' '), /keinen zweiten Antrag/);
    assert.doesNotMatch(result.title, /Beide Anträge erfolgreich/);
  }
});

test('confirmation failure and missing delivery status do not turn main success into a failed application', () => {
  for (const confirmationEmailSent of [false, undefined]) {
    const result = membershipSuccess({ ...success, confirmationEmailSent }, selection);
    assert.equal(result.kind, 'warning');
    assert.equal(result.delivered, true);
    assert.match(result.emailText, /Postfach.*Spam-Ordner/);
    assert.match(result.emailText, /Antragsnummer.*keinen zweiten Antrag/);
    assert.doesNotMatch(result.emailText, /PDF wurde versendet/);
  }
});

test('email choices require their own confirmation and a failed opt-in does not undo the application', () => {
  const withOffers = { ...selection, emailOffers: ['Newsletter und digitale Vereinszeitschrift', 'allgemeine Vereinsinformationen'] };
  const requested = membershipSuccess({ ...success, newsletterStatus: 'requested' }, withOffers);
  assert.equal(requested.kind, 'success');
  assert.match(requested.emailText, /Newsletter.*allgemeine Vereinsinformationen.*Link.*Verifizierungsmail/);
  const failed = membershipSuccess({ ...success, newsletterStatus: 'failed' }, withOffers);
  assert.equal(failed.kind, 'warning');
  assert.equal(failed.delivered, true);
  assert.match(failed.notes.join(' '), /Mitgliedsanträge bleiben übermittelt.*newsletter/);
});

test('known server rejection keeps its reason and tells users that their input is retained', () => {
  const result = membershipFailure('Bitte prüfe die IBAN.', true);
  assert.equal(result.kind, 'error');
  assert.equal(result.delivered, false);
  assert.equal(result.intro, 'Bitte prüfe die IBAN.');
  assert.match(result.title, /nicht übermittelt/);
  assert.match(result.emailText, /Angaben und Unterschrift bleiben/);
});

test('network or unparseable responses are indeterminate, not a definite failed registration', () => {
  const result = membershipFailure('Failed to fetch');
  assert.equal(result.kind, 'error');
  assert.equal(result.delivered, false);
  assert.match(result.title, /nicht bestätigt/);
  assert.match(result.intro, /noch unklar/);
  assert.match(result.emailText, /bevor du erneut absendest/);
  assert.doesNotMatch(result.title, /nicht übermittelt/);
});
