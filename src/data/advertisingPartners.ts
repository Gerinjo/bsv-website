export type AdvertisingPartner = {
  name: string;
  logoSrc: string;
  logoAlt: string;
  website: string;
};

/**
 * Aktuelle Werbepartner des BSV. Die Reihenfolge ist rein redaktionell;
 * auf der Website werden alle Partner gleichwertig dargestellt.
 */
export const advertisingPartners: AdvertisingPartner[] = [
  {
    name: 'Sparkasse Hegau-Bodensee',
    logoSrc: '/images/sponsors/sparkasse-hegau-bodensee.png',
    logoAlt: 'Logo der Sparkasse Hegau-Bodensee',
    website: 'https://www.sparkasse-hegau-bodensee.de/de/home.html',
  },
  {
    name: 'BGV Badische Versicherungen',
    logoSrc: '/images/sponsors/bgv-badische-versicherungen.gif',
    logoAlt: 'Logo der BGV Badische Versicherungen',
    website: 'https://www.bgv.de/',
  },
];
