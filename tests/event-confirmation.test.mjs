import assert from 'node:assert/strict';
import test from 'node:test';
import { deliverEventConfirmation } from '../supabase/functions/_shared/event-confirmation.mjs';

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
