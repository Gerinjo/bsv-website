import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const partners = JSON.parse(readFileSync(new URL('../src/data/advertisingPartners.generated.json', import.meta.url), 'utf8'));
const teamPagesSource = readFileSync(new URL('../src/data/teamPages.ts', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/[...slug].astro', import.meta.url), 'utf8');
const syncSource = readFileSync(new URL('../scripts/sync-advertising-partners.mjs', import.meta.url), 'utf8');
const homeSponsorsSource = readFileSync(new URL('../src/components/HomeSponsorShowcase.astro', import.meta.url), 'utf8');
const youthSponsorsSource = readFileSync(new URL('../src/components/YouthSponsorShowcase.astro', import.meta.url), 'utf8');
const youthLandingSource = readFileSync(new URL('../src/components/YouthLandingContent.astro', import.meta.url), 'utf8');
const youthMenuSponsorsSource = readFileSync(new URL('../src/components/YouthMenuSponsors.astro', import.meta.url), 'utf8');
const partnerPageSource = readFileSync(new URL('../src/pages/werbepartner/index.astro', import.meta.url), 'utf8');
const headerSource = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const navigationSource = readFileSync(new URL('../src/data/navigation.ts', import.meta.url), 'utf8');
const sponsoringMenuSource = readFileSync(new URL('../src/components/SponsoringMegaEnhancer.astro', import.meta.url), 'utf8');

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

test('the youth landing keeps leadership and stories above sponsors and four team groups below', () => {
  assert.match(pageSource, /isYouthLanding && <YouthLandingContent \/>/);
  assert.ok(youthLandingSource.indexOf('class="leadership-card"') < youthLandingSource.indexOf('<YouthSponsorShowcase />'));
  assert.ok(youthLandingSource.indexOf('class="story-card"') < youthLandingSource.indexOf('<YouthSponsorShowcase />'));
  assert.ok(youthLandingSource.indexOf('<YouthSponsorShowcase />') < youthLandingSource.indexOf('class="youth-teams"'));
  assert.match(youthLandingSource, /\['Leistungsbereich', 'Entwicklungsbereich', 'Kinderfußball', 'Juniorinnen'\]/);
  assert.match(youthLandingSource, /Vier Bereiche/);
  assert.match(youthLandingSource, /teamGroupColumns = \[teamGroups\.slice\(0, 2\), teamGroups\.slice\(2, 3\), teamGroups\.slice\(3, 4\)\]/);
  assert.match(youthLandingSource, /\.team-groups \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(navigationSource, /title: 'Leistungsbereich',[\s\S]*?'U13 D2-Junioren'[\s\S]*?title: 'Entwicklungsbereich'/);
  assert.match(navigationSource, /title: 'Entwicklungsbereich',[\s\S]*?'U15 C2-Junioren'[\s\S]*?'U13 D3-Junioren'[\s\S]*?title: 'Kinderfußball'/);
  assert.match(navigationSource, /title: 'Kinderfußball',[\s\S]*?'U11 E1-Junioren'[\s\S]*?'U6 G-Junioren Spielgruppe'[\s\S]*?title: 'Juniorinnen'/);
  assert.match(teamPagesSource, /path:'jugend\/u15-c2',kicker:'Entwicklungsbereich'/);
  assert.match(teamPagesSource, /path:'jugend\/u13-d3',kicker:'Entwicklungsbereich'/);
  assert.match(navigationSource, /title: 'Geschichten',[\s\S]*?title: 'Unterstützung gesucht',[\s\S]*?'Trainer:innen gesucht'/);
  assert.match(youthLandingSource, /supportGroup\.links/);
  assert.match(youthLandingSource, /departmentGroup\.links\.filter/);
  assert.match(youthLandingSource, /teamProfiles\[link\.href\.replace/);
  assert.match(youthLandingSource, /class="story-mobile-link"/);
  assert.match(youthLandingSource, /@media\(max-width:600px\).*\.story-card>img,\.story-shade,\.story-copy\{display:none\}/s);
  assert.match(youthLandingSource, /\.story-mobile-link\{min-height:78px/);
});

test('the youth mega menu shows three random youth partners below its team image', () => {
  assert.match(headerSource, /item\.label === 'Junge Sterne' && <YouthMenuSponsors \/>/);
  assert.ok(headerSource.indexOf('class="club-preview"') < headerSource.indexOf('<YouthMenuSponsors />'));
  assert.match(youthMenuSponsorsSource, /partner\.audienceAssignments\.some\(isYouthSponsorAssignment\)/);
  assert.match(youthMenuSponsorsSource, /hidden=\{index >= 3\}/);
  assert.match(youthMenuSponsorsSource, /Math\.floor\(Math\.random\(\) \* \(index \+ 1\)\)/);
  assert.match(youthMenuSponsorsSource, /\/werbepartner\?bereich=jugendabteilung/);
  assert.match(youthMenuSponsorsSource, /\.youth-menu-sponsor-grid \{ display:grid; grid-template-columns:1fr;/);
});

test('the youth mega menu stacks support directly below stories', () => {
  assert.match(headerSource, /"youth-mega-groups": item\.label === 'Junge Sterne'/);
  assert.match(headerSource, /data-mega-group=\{group\.title\}/);
  assert.match(headerSource, /grid-template-areas:'department stories' 'department support' 'performance development' 'children girls'/);
  assert.match(headerSource, /\[data-mega-group='Jugendabteilung'\] \{ grid-area:department; \}/);
  assert.match(headerSource, /\[data-mega-group='Geschichten'\] \{ grid-area:stories; \}/);
  assert.match(headerSource, /\[data-mega-group='Unterstützung gesucht'\] \{ grid-area:support; \}/);
  assert.match(headerSource, /grid-template-rows:repeat\(2,minmax\(0,1fr\)\) auto auto/);
});

test('the partner overview has two filters and groups cards by sponsor type', () => {
  assert.match(partnerPageSource, /id="partner-area"/);
  assert.match(partnerPageSource, /id="partner-type"/);
  assert.match(partnerPageSource, /data-partner-group/);
  assert.match(partnerPageSource, /sponsorAreaOptions/);
  assert.match(partnerPageSource, /const availableAreaKeys = new Set/);
  assert.match(partnerPageSource, /area\.value === 'all' \|\| availableAreaKeys\.has\(area\.value\)/);
  assert.match(partnerPageSource, /availableSponsorAreaOptions\.map/);
  assert.match(syncSource, /displayWeight/);
  assert.match(syncSource, /sortOrder/);
  assert.match(partnerPageSource, /right\.displayWeight - left\.displayWeight/);
  assert.match(partnerPageSource, /data-sponsor-weight/);
  assert.match(partnerPageSource, /weight-3/);
  assert.match(partnerPageSource, /\.partner-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(partnerPageSource, /@media\(max-width:900px\).*\.partner-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(partnerPageSource, /@media\(max-width:600px\).*\.partner-grid\{grid-template-columns:1fr\}/s);
});

test('Sponsoring opens the partner overview and packages remain explicitly selectable', () => {
  assert.match(navigationSource, /label: 'Sponsoring', href: '\/werbepartner'/);
  assert.match(navigationSource, /label: 'Alle Sponsoring-Pakete', href: '\/sponsoring'/);
  assert.match(sponsoringMenuSource, /data-sponsor-pane-target="partners"/);
  assert.match(sponsoringMenuSource, /class="sponsor-mega-tab active"/);
  assert.match(sponsoringMenuSource, /data-sponsor-pane="packages" hidden/);
  assert.match(sponsoringMenuSource, /selectPane\('partners'\)/);
  assert.match(sponsoringMenuSource, /pane\.hidden = pane\.dataset\.sponsorPane !== target/);
  assert.match(sponsoringMenuSource, /sponsor-mega-tab\.active\{background:#f4d638/);
});
