import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeIban, isValidIban } from '../src/utils/bankDetails.mjs';

test('IBAN entry accepts spaces and lowercase without changing account digits', () => {
  assert.equal(normalizeIban(' de89 3704 0044 0532 0130 00 '), 'DE89370400440532013000');
  assert.equal(isValidIban('de89 3704 0044 0532 0130 00'), true);
});

test('missing, truncated or altered IBANs are rejected', () => {
  for (const value of ['', null, 'DE8937040044053201300', 'DE89370400440532013001', 'DE00370400440532013000', 'DE89-3704-0044-0532-0130-00', 'DE89370400440532013000X']) {
    assert.equal(isValidIban(value), false, `Invalid IBAN: ${value}`);
  }
});
