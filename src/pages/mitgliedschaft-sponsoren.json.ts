import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { advertisingPartners } from '../data/advertisingPartners';
import { isYouthSponsorAssignment } from '../data/sponsorAreas';
import { withBase } from '../utils/paths';

// Public, approved partner information only; rebuilt with the website's daily sync.
export function GET({ site }: { site: URL | undefined }) {
  const origin = site ?? new URL('https://bsvnordstern.de');
  const sponsors = advertisingPartners.map((partner) => {
    const logo = readFileSync(resolve('public', partner.logoSrc.slice(1)));
    const width = logo.readUInt32BE(16);
    const height = logo.readUInt32BE(20);
    const scale = Math.min(112 / width, 64 / height, 1);
    return {
      id: partner.slug,
      name: partner.name,
      website: partner.website ?? new URL(withBase('/werbepartner'), origin).href,
      logo: new URL(withBase(partner.logoSrc), origin).href,
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      youth: partner.audienceAssignments.some(isYouthSponsorAssignment),
    };
  });
  return Response.json({ version: 1, sponsors });
}
