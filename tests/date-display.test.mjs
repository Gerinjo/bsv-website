import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDate, formatDateTime } from '../src/utils/dates.mjs';
import { berlinToday, parseGermanDate, formatGermanDate } from '../supabase/functions/_shared/form-dates.mjs';

test('page dates include leading zeroes and the full year', () => {
  assert.equal(formatDate('2026-01-02'), '02.01.2026');
  assert.equal(formatDate('1956-07-11'), '11.07.1956');
  assert.equal(formatDate('2028-02-29'), '29.02.2028');
});

test('timestamps use the Berlin calendar day across UTC midnight and daylight saving', () => {
  assert.equal(formatDate('2026-12-31T23:30:00Z'), '01.01.2027');
  assert.equal(formatDateTime('2026-03-29T01:30:00Z'), '29.03.2026, 03:30');
  assert.equal(formatGermanDate(berlinToday(new Date('2026-12-31T23:30:00Z'))), '01.01.2027');
});

test('German input normalizes unambiguously while API dates stay ISO', () => {
  for (const input of ['2.1.2026', '02.01.2026', '02012026']) {
    assert.equal(parseGermanDate(input), '2026-01-02');
    assert.equal(formatGermanDate(parseGermanDate(input)), '02.01.2026');
  }
  for (const input of ['31.04.2026', '29.02.2026', '02/01/2026', '02.01.26', '2026-01-02', '']) {
    assert.equal(parseGermanDate(input), '');
  }
  assert.equal(parseGermanDate('29.02.2028'), '2028-02-29');
});
