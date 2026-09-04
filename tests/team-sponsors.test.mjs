import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const partners = JSON.parse(readFileSync(new URL('../src/data/advertisingPartners.generated.json', import.meta.url), 'utf8'));
const teamPagesSource = readFileSync(new URL('../src/data/teamPages.ts', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/[...slug].astro', import.meta.url), 'utf8');
const syncSource = readFileSync(new URL('../scripts/sync-advertising-partners.mjs', import.meta.url), 'utf8');
const homeSponsorsSource = readFileSync(new URL('../src/components/HomeSponsorShowcase.astro', import.meta.url), 'utf8');
const youthSponsorsSource = readFileSync(new URL('../src/components/YouthSponsorShowcase.astro', import.meta.url), 'utf8');
const partnerPageSource = readFileSync(new URL('../src/pages/werbepartner/index.astro', import.meta.url), 'utf8');
const headerSource = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const navigationSource = readFileSync(new URL('../src/data/navigation.ts', import.meta.url), 'utf8');

test('synced sponsors include deduplicated direct website assignments', () => {
  for (const partner of partners) {
    assert.ok(Array.isArray(partner.audienceAssignments), `${partner.name}: Website-Zuweisungen fehlen`);
    assert.equal(new Set(partner.audienceAssignments.map((assignment) => assignment.audienceSlug)).size, partner.audienceAssignments.length, `${partner.name}: doppelte Website-Zuweisung`);
    assert.ok(Array.isArray(partner.teamAudienceSlugs), `${partner.name}: Mannschaftszuweisungen fehlen`);
    assert.equal(new Set(partner.teamAudienceSlugs).size, partner.teamAudienceSlugs.length, `${partner.name}: doppelte Mannschaftszuweisung`);
  }
  assert.match(syncSource, /audienceAssignments/);
  assert.match(syncSource, /audienceGroup/);
  assert.match(syncSource, /teamAudienceSlugs/);
  assert.match(syncSource, /teamAssignments/);
  assert.match(syncSource, /sourceAudienceSlug/);
  assert.match(syncSource, /sponsorType/);
});

test('only direct team assignments are rendered on individual team pages', () => {
  for (const partner of partners) {
    const directTeamAssignments = partner.audienceAssignments
      .filter((assignment) => ['mens_team', 'womens_team', 'youth_team'].includes(assignment.audienceGroup))
      .map((assignment) => assignment.audienceSlug)
      .sort();
    assert.deepEqual(partner.teamAudienceSlugs, directTeamAssignments, `${partner.name}: Mannschaftszuweisungen sind nicht direkt`);
  }
  assert.match(teamPagesSource, /partner\.audienceAssignments\.find\(item=>item\.audienceSlug===sponsorAudience\)/);
});

test('every assigned audience used by current sponsor data maps to a team page', () => {
  const mappedAudiences = new Set([...teamPagesSource.matchAll(/'[^']+'\s*:\s*'([^']+)'/g)].map((match) => match[1]));
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
  assert.match(pageSource, /sponsor\.typeLabel/);
  assert.match(pageSource, /sponsor\.description/);
});

test('the home sponsor showcase links to the complete partner overview', () => {
  assert.match(homeSponsorsSource, /href=\{withBase\('\/werbepartner'\)\}/);
  assert.match(homeSponsorsSource, /Alle Werbepartner ansehen/);
});

test('the youth page shows up to four direct youth sponsors and links to the prefiltered overview', () => {
  assert.match(youthSponsorsSource, /partner\.audienceAssignments\.some\(isYouthSponsorAssignment\)/);
  assert.match(youthSponsorsSource, /index >= 4/);
  assert.match(youthSponsorsSource, /\/werbepartner\?bereich=jugendabteilung/);
  assert.match(youthSponsorsSource, /Alle Jugendsponsoren/);
  assert.match(headerSource, /item\.label === 'Junge Sterne' \? item\.href/);
});

test('the partner overview has two filters and groups cards by sponsor type', () => {
  assert.match(partnerPageSource, /id="partner-area"/);
  assert.match(partnerPageSource, /id="partner-type"/);
  assert.match(partnerPageSource, /data-partner-group/);
  assert.match(partnerPageSource, /sponsorAreaOptions/);
  assert.match(syncSource, /displayWeight/);
  assert.match(syncSource, /sortOrder/);
  assert.match(partnerPageSource, /right\.displayWeight - left\.displayWeight/);
  assert.match(partnerPageSource, /data-sponsor-weight/);
  assert.match(partnerPageSource, /weight-3/);
});

test('Sponsoring opens the partner overview and packages remain explicitly selectable', () => {
  assert.match(navigationSource, /label: 'Sponsoring', href: '\/werbepartner'/);
  assert.match(navigationSource, /label: 'Alle Sponsoring-Pakete', href: '\/sponsoring'/);
});
