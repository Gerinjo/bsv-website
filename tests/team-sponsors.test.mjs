import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const partners = JSON.parse(readFileSync(new URL('../src/data/advertisingPartners.generated.json', import.meta.url), 'utf8'));
const teamPagesSource = readFileSync(new URL('../src/data/teamPages.ts', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/[...slug].astro', import.meta.url), 'utf8');
const syncSource = readFileSync(new URL('../scripts/sync-advertising-partners.mjs', import.meta.url), 'utf8');
const homeSponsorsSource = readFileSync(new URL('../src/components/HomeSponsorShowcase.astro', import.meta.url), 'utf8');

test('synced sponsors include deduplicated team audience assignments', () => {
  for (const partner of partners) {
    assert.ok(Array.isArray(partner.teamAudienceSlugs), `${partner.name}: Mannschaftszuweisungen fehlen`);
    assert.equal(new Set(partner.teamAudienceSlugs).size, partner.teamAudienceSlugs.length, `${partner.name}: doppelte Mannschaftszuweisung`);
  }
  assert.match(syncSource, /teamAudienceSlugs/);
});

test('every assigned audience used by current sponsor data maps to a team page', () => {
  const mappedAudiences = new Set([...teamPagesSource.matchAll(/'[^']+': '([^']+)'/g)].map((match) => match[1]));
  for (const partner of partners) {
    for (const audience of partner.teamAudienceSlugs) {
      assert.ok(mappedAudiences.has(audience), `${partner.name}: keine Mannschaftsseite für ${audience}`);
    }
  }
});

test('team pages render sponsor logos and an explicit thank-you', () => {
  assert.match(pageSource, /teamProfile\.sponsors/);
  assert.match(pageSource, /Danke für euren Rückhalt\./);
  assert.match(pageSource, /für die Unterstützung und das Vertrauen/);
});

test('the home sponsor showcase links to the complete partner overview', () => {
  assert.match(homeSponsorsSource, /href=\{withBase\('\/werbepartner'\)\}/);
  assert.match(homeSponsorsSource, /Alle Werbepartner ansehen/);
});
