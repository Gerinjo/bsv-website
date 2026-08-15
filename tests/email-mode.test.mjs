import assert from 'node:assert/strict';
import test from 'node:test';
import { LIVE_EMAIL_CONFIRMATION, resolveEmailMode } from '../supabase/functions/_shared/email-mode.mjs';

const resolve = (values = {}) => resolveEmailMode((name) => values[name]);

test('email delivery defaults to test mode', () => {
  assert.deepEqual(resolve(), {
    mode: 'test', testMode: true, requestedMode: 'test', liveBlocked: false,
  });
});

test('legacy EMAIL_TEST_MODE cannot enable live delivery', () => {
  assert.equal(resolve({ EMAIL_TEST_MODE: 'false' }).mode, 'test');
});

test('requesting live delivery without confirmation remains in test mode', () => {
  const result = resolve({ EMAIL_DELIVERY_MODE: 'live' });
  assert.equal(result.mode, 'test');
  assert.equal(result.liveBlocked, true);
});

test('live delivery requires the exact independent confirmation', () => {
  const result = resolve({
    EMAIL_DELIVERY_MODE: 'live',
    EMAIL_LIVE_CONFIRMATION: LIVE_EMAIL_CONFIRMATION,
  });
  assert.equal(result.mode, 'live');
  assert.equal(result.testMode, false);
});
