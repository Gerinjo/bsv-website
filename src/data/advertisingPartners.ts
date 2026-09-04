import generatedPartners from './advertisingPartners.generated.json';

export type AdvertisingPartnerTeamAssignment = {
  audienceSlug: string;
  sourceAudienceSlug: string;
  sponsorType: { slug: string; label: string } | null;
  description: string;
};

export type AdvertisingPartner = {
  sourceId: string;
  slug: string;
  name: string;
  logoSrc: string;
  logoAlt: string;
  website: string | null;
  teamAudienceSlugs: string[];
  teamAssignments?: AdvertisingPartnerTeamAssignment[];
  sortOrder: number;
  sourceUpdatedAt: string;
};

/**
 * Automatisch aus der freigegebenen Werbepartner-Verwaltung synchronisiert.
 * Die Sortierung steuert nur die Reihenfolge; alle Karten sind gleichwertig.
 */
export const advertisingPartners = generatedPartners satisfies AdvertisingPartner[];
