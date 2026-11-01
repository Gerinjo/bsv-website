import assert from 'node:assert/strict';
import test from 'node:test';
import { assertUniqueSponsorServices, teamSponsorDetails } from '../src/data/sponsorServices.mjs';
const assignments = [
  { audienceSlug: 'herren-1', sponsorType: { slug: 'bandensponsor', label: 'Bandensponsor' }, description: 'Bande am Sportplatz' },
  { audienceSlug: 'herren-1', sponsorType: { slug: 'stadionheft', label: 'Stadionheft' }, description: 'Anzeige im Heft' },
];
test('different sponsor services share the same website or team audience', () => {
  assert.doesNotThrow(() => assertUniqueSponsorServices(assignments, 'Garten Graf'));
  assert.throws(() => assertUniqueSponsorServices([...assignments, assignments[0]], 'Garten Graf'), /doppelt/);
  assert.throws(() => assertUniqueSponsorServices([{ audienceSlug: 'club' }, { audienceSlug: 'club' }], 'Garten Graf'), /doppelt/);
});
test('team display shows one logo with all service labels and correctly attributed text', () => {
  assert.deepEqual(teamSponsorDetails(assignments, 'herren-1'), {
    typeLabel: 'Bandensponsor · Stadionheft',
    description: 'Bandensponsor: Bande am Sportplatz Stadionheft: Anzeige im Heft',
  });
  assert.deepEqual(teamSponsorDetails([assignments[0]], 'herren-1'), { typeLabel: 'Bandensponsor', description: 'Bande am Sportplatz' });
  assert.equal(teamSponsorDetails(assignments, 'herren-2'), null);
});
