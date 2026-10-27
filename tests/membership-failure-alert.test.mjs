import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function run(scenario = {}) {
  const result = spawnSync('php', ['-r', `
    require 'public/api/membership-failure-alert.php';
    $input = json_decode(stream_get_contents(STDIN), true);
    $calls = array();
    $transport = function ($channel) use (&$calls, $input) {
      return function ($message, $key) use (&$calls, $channel, $input) {
        $calls[] = array('channel' => $channel, 'message' => $message, 'key' => $key);
        if (!empty($input['throws'])) throw new Exception('SECRET-KEY bank-details private-response');
        return $channel === 'resend' ? !empty($input['resend']) : !empty($input['native']);
      };
    };
    $alert = bsvMembershipFailureAlert(array(
      'reference' => 'BSV-20261027-123000-ABCD', 'firstName' => 'Mila', 'lastName' => 'Muster-Łukasz',
      'email' => 'mila@example.invalid', 'phone' => '0123456789', 'department' => 'Fußball Jugend',
      'team' => 'U13 D2', 'iban' => 'PRIVATE-IBAN', 'signature' => 'PRIVATE-SIGNATURE',
    ), array(), function () use ($input) { return !empty($input['delivered']); },
      array('resend' => $transport('resend'), 'native' => $transport('hosting')));
    $results = array();
    foreach (isset($input['stages']) ? $input['stages'] : array('internal') as $stage) {
      $results[] = $alert($stage, 'recipient_lookup_failed', 500);
    }
    echo json_encode(array('results' => $results, 'calls' => $calls));
  `], { cwd: new URL('../', import.meta.url), input: JSON.stringify(scenario), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /mila@example|Mila|Muster|PRIVATE|SECRET-KEY|bank-details|private-response/);
  return JSON.parse(result.stdout);
}

test('failure alerts contain contact details and a fixed BSV recipient without sensitive application fields', () => {
  const { results, calls } = run({ resend: true });
  assert.deepEqual(results, [true]);
  assert.equal(calls.length, 1);
  const { message, key } = calls[0];
  assert.deepEqual(message.to, ['jerome.ernsberger@bsvnordstern.de']);
  assert.equal(message.reply_to, 'jerome.ernsberger@bsvnordstern.de');
  assert.match(message.text, /Vorname: Mila\nNachname: Muster-Łukasz/);
  assert.match(message.text, /mila@example\.invalid/);
  assert.match(message.text, /Eingang des Hauptantrags.*nicht bestätigt/);
  assert.doesNotMatch(JSON.stringify(message), /PRIVATE|attachments|signature|iban/i);
  assert.match(key, /^membership-alert\/[a-f0-9]{64}$/);
});

test('API failures fall back to the hosting mail transport independently of Supabase', () => {
  const { results, calls } = run({ resend: false, native: true });
  assert.deepEqual(results, [true]);
  assert.deepEqual(calls.map(x => x.channel), ['resend', 'hosting']);
  assert.deepEqual(calls[0].message, calls[1].message);
});

test('failure of both alert transports does not throw, recurse, or leak transport exceptions', () => {
  const { results, calls } = run({ throws: true });
  assert.deepEqual(results, [false]);
  assert.equal(calls.length, 2);
});

test('repeated failures in one step are deduplicated while distinct failed steps remain visible', () => {
  const { results, calls } = run({ resend: true, stages: ['applicant', 'applicant', 'newsletter'] });
  assert.deepEqual(results, [true, false, true]);
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0].key, calls[1].key);
});

test('partial-success alerts explain that the application already arrived and must not be resubmitted', () => {
  const { calls } = run({ resend: true, delivered: true, stages: ['team'] });
  assert.match(calls[0].message.text, /Hauptantrag wurde bereits/);
  assert.match(calls[0].message.text, /Kein erneuter Mitgliedsantrag erforderlich/);
});
