import generatedPartners from './advertisingPartners.generated.json';

export type AdvertisingPartner = {
  sourceId: string;
  slug: string;
  name: string;
  logoSrc: string;
  logoAlt: string;
  website: string | null;
  teamAudienceSlugs: string[];
  sortOrder: number;
  sourceUpdatedAt: string;
};

/**
 * Automatisch aus der freigegebenen Werbepartner-Verwaltung synchronisiert.
 * Die Sortierung steuert nur die Reihenfolge; alle Karten sind gleichwertig.
 */
export const advertisingPartners = generatedPartners satisfies AdvertisingPartner[];
