import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const dataPath = path.join(root, 'src/data/advertisingPartners.generated.json');
const logoDirectory = path.join(root, 'public/images/sponsors/synced');
const feedUrl = process.env.SPONSOR_FEED_URL?.trim() ?? '';
const feedSecret = process.env.SPONSOR_FEED_SECRET?.trim() ?? '';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

if (!feedUrl || !feedSecret) {
  throw new Error('SPONSOR_FEED_URL und SPONSOR_FEED_SECRET müssen gesetzt sein.');
}
const parsedFeedUrl = new URL(feedUrl);
if (parsedFeedUrl.protocol !== 'https:') throw new Error('SPONSOR_FEED_URL muss HTTPS verwenden.');

const previous = JSON.parse(await readFile(dataPath, 'utf8'));
const previousById = new Map(previous.map((partner) => [partner.sourceId, partner]));
const response = await fetch(parsedFeedUrl, {
  headers: {
    accept: 'application/json',
    'x-bsv-sponsor-sync-secret': feedSecret,
  },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`Werbepartner-Feed antwortet mit HTTP ${response.status}.`);
const payload = await response.json();
if (!payload?.ok || !Array.isArray(payload.partners)) throw new Error('Werbepartner-Feed enthält kein gültiges Ergebnis.');

await mkdir(logoDirectory, { recursive: true });
const ids = new Set();
const slugs = new Set();
const partners = [];
let downloaded = 0;

const profileUrl = (websiteUrl, instagramHandle) => {
  const candidate = String(websiteUrl ?? '').trim()
    || (instagramHandle ? `https://www.instagram.com/${String(instagramHandle).replace(/^@/, '')}/` : '');
  if (!candidate) return null;
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`Ungültiger Webauftritt: ${candidate}`);
  }
  return url.toString();
};

for (const source of payload.partners) {
  const sourceId = String(source.id ?? '').trim();
  const slug = String(source.slug ?? '').trim();
  const name = String(source.name ?? '').trim();
  const logoUrl = String(source.logoUrl ?? '').trim();
  const sourceUpdatedAt = String(source.updatedAt ?? '').trim();
  const teamAudienceSlugs = Array.isArray(source.teamAudienceSlugs)
    ? [...new Set(source.teamAudienceSlugs.map((value) => String(value).trim()))].sort()
    : [];
  const teamAssignments = Array.isArray(source.teamAssignments)
    ? source.teamAssignments.map((assignment) => {
      const audienceSlug = String(assignment?.audienceSlug ?? '').trim();
      const sourceAudienceSlug = String(assignment?.sourceAudienceSlug ?? '').trim();
      const description = String(assignment?.description ?? '').trim();
      const sponsorType = assignment?.sponsorType == null ? null : {
        slug: String(assignment.sponsorType.slug ?? '').trim(),
        label: String(assignment.sponsorType.label ?? '').trim(),
      };
      if (!slugPattern.test(audienceSlug) || !slugPattern.test(sourceAudienceSlug)) {
        throw new Error(`Eine detaillierte Mannschaftszuweisung für ${slug} ist ungültig.`);
      }
      if (description.length > 1600) throw new Error(`Ein Zuordnungstext für ${slug} ist zu lang.`);
      if (sponsorType && (!slugPattern.test(sponsorType.slug) || !sponsorType.label || sponsorType.label.length > 80)) {
        throw new Error(`Eine Sponsorart für ${slug} ist ungültig.`);
      }
      return { audienceSlug, sourceAudienceSlug, sponsorType, description };
    }).sort((left, right) => left.audienceSlug.localeCompare(right.audienceSlug))
    : [];
  const audienceAssignments = Array.isArray(source.audienceAssignments)
    ? source.audienceAssignments.map((assignment) => {
      const audienceSlug = String(assignment?.audienceSlug ?? '').trim();
      const audienceLabel = String(assignment?.audienceLabel ?? '').trim();
      const audienceGroup = String(assignment?.audienceGroup ?? '').trim();
      const description = String(assignment?.description ?? '').trim();
      const sponsorType = assignment?.sponsorType == null ? null : {
        slug: String(assignment.sponsorType.slug ?? '').trim(),
        label: String(assignment.sponsorType.label ?? '').trim(),
      };
      if (!slugPattern.test(audienceSlug) || !audienceLabel || audienceLabel.length > 120 || !audienceGroup) {
        throw new Error(`Eine Website-Zuweisung für ${slug} ist ungültig.`);
      }
      if (description.length > 1600) throw new Error(`Ein Zuordnungstext für ${slug} ist zu lang.`);
      if (sponsorType && (!slugPattern.test(sponsorType.slug) || !sponsorType.label || sponsorType.label.length > 80)) {
        throw new Error(`Eine Sponsorart für ${slug} ist ungültig.`);
      }
      return { audienceSlug, audienceLabel, audienceGroup, sponsorType, description };
    }).sort((left, right) => left.audienceSlug.localeCompare(right.audienceSlug))
    : [];
  const sortOrder = Number(source.sortOrder);
  if (!uuidPattern.test(sourceId) || !slugPattern.test(slug) || !name || name.length > 120) {
    throw new Error('Ein Werbepartner im Feed enthält ungültige Stammdaten.');
  }
  if (ids.has(sourceId) || slugs.has(slug)) throw new Error(`Werbepartner ${slug} ist im Feed doppelt vorhanden.`);
  if (teamAudienceSlugs.some((audienceSlug) => !slugPattern.test(audienceSlug))) {
    throw new Error(`Eine Mannschaftszuweisung für ${slug} ist ungültig.`);
  }
  if (new Set(teamAssignments.map((assignment) => assignment.audienceSlug)).size !== teamAssignments.length) {
    throw new Error(`Detaillierte Mannschaftszuweisungen für ${slug} sind doppelt vorhanden.`);
  }
  if (teamAssignments.length && (
    teamAssignments.length !== teamAudienceSlugs.length
    || teamAssignments.some((assignment) => !teamAudienceSlugs.includes(assignment.audienceSlug))
  )) throw new Error(`Die Mannschaftszuweisungen für ${slug} sind widersprüchlich.`);
  if (new Set(audienceAssignments.map((assignment) => assignment.audienceSlug)).size !== audienceAssignments.length) {
    throw new Error(`Website-Zuweisungen für ${slug} sind doppelt vorhanden.`);
  }
  ids.add(sourceId);
  slugs.add(slug);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new Error(`Sortierung für ${slug} ist ungültig.`);
  if (!sourceUpdatedAt || Number.isNaN(Date.parse(sourceUpdatedAt))) throw new Error(`Änderungsdatum für ${slug} ist ungültig.`);
  const parsedLogoUrl = new URL(logoUrl);
  if (parsedLogoUrl.protocol !== 'https:') throw new Error(`Logo-URL für ${slug} muss HTTPS verwenden.`);

  const logoFilename = `${slug}.png`;
  const logoPath = path.join(logoDirectory, logoFilename);
  const unchanged = previousById.get(sourceId)?.sourceUpdatedAt === sourceUpdatedAt;
  let logoExists = true;
  try { await access(logoPath); } catch { logoExists = false; }
  if (!unchanged || !logoExists) {
    const logoResponse = await fetch(parsedLogoUrl, { signal: AbortSignal.timeout(30_000) });
    if (!logoResponse.ok) throw new Error(`Logo für ${slug} antwortet mit HTTP ${logoResponse.status}.`);
    const logo = Buffer.from(await logoResponse.arrayBuffer());
    if (logo.length < 32 || logo.length > 5 * 1024 * 1024 || !logo.subarray(0, 8).equals(pngSignature)) {
      throw new Error(`Logo für ${slug} ist keine gültige PNG-Datei oder zu groß.`);
    }
    const temporaryPath = `${logoPath}.tmp`;
    await writeFile(temporaryPath, logo);
    await rename(temporaryPath, logoPath);
    downloaded += 1;
  }

  partners.push({
    sourceId,
    slug,
    name,
    logoSrc: `/images/sponsors/synced/${logoFilename}`,
    logoAlt: `Logo von ${name}`,
    website: profileUrl(source.websiteUrl, source.instagramHandle),
    teamAudienceSlugs,
    teamAssignments,
    audienceAssignments,
    sortOrder,
    sourceUpdatedAt,
  });
}

partners.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'de'));
const nextJson = `${JSON.stringify(partners, null, 2)}\n`;
const currentJson = await readFile(dataPath, 'utf8');
if (nextJson !== currentJson) await writeFile(dataPath, nextJson);

const added = partners.filter((partner) => !previousById.has(partner.sourceId)).length;
console.log(`${partners.length} Werbepartner geprüft: ${added} neu, ${downloaded} Logos aktualisiert.`);
