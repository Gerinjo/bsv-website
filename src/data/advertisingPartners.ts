import generatedPartners from './advertisingPartners.generated.json';

export type AdvertisingPartnerSponsorType = {
  slug: string;
  label: string;
  sortOrder?: number;
  displayWeight?: number;
};

export type AdvertisingPartnerTeamAssignment = {
  audienceSlug: string;
  sourceAudienceSlug: string;
  sponsorType: AdvertisingPartnerSponsorType | null;
  description: string;
};

export type AdvertisingPartnerAudienceAssignment = {
  audienceSlug: string;
  audienceLabel: string;
  audienceGroup: string;
  sponsorType: AdvertisingPartnerSponsorType | null;
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
  audienceAssignments: AdvertisingPartnerAudienceAssignment[];
  sortOrder: number;
  sourceUpdatedAt: string;
};

/**
 * Automatisch aus der freigegebenen Werbepartner-Verwaltung synchronisiert.
 * Sponsorart-Gewichtung und Sortierung steuern Reihenfolge und visuelle Präsenz der Karten.
 */
export const advertisingPartners = generatedPartners satisfies AdvertisingPartner[];
