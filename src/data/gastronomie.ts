export const gastronomyLinks = [
  { label: 'Über uns', href: '/gastronomie/ueber-uns', description: 'Küche, Atmosphäre und Feiern' },
  { label: 'Öffnungszeiten', href: '/gastronomie/oeffnungszeiten', description: 'Gaststätte und Lieferservice' },
  { label: 'Speisekarte', href: '/gastronomie/speisekarte', description: 'Angebot als PDF ansehen' },
  { label: 'Events', href: '/gastronomie/events', description: 'Termine und Rückblicke' },
] as const;

export const gastronomy = {
  title: 'Vereinsgaststätte BSV Nordstern',
  shortTitle: 'BSV Gaststätte',
  address: 'Schlesierstraße 43, 78315 Radolfzell',
  phone: '+49 7732 910080',
  phoneHref: 'tel:+497732910080',
  reservationPhone: '+49 160 92658131',
  reservationPhoneHref: 'tel:+4916092658131',
  menuPdf: 'https://bsvnordstern.de/j4/images/bsv/gastro/speisekarte/Speisekarte_BSV_JAN_2024.pdf',
  lieferandoImage: 'https://bsvnordstern.de/j4/images/bsv/gastro/lieferando.jpg',
  karaokeImage: 'https://bsvnordstern.de/j4/images/bsv/gastro/events/karaoke.jpg',
  openingHours: [
    { days: 'Montag', hours: 'Ruhetag' },
    { days: 'Dienstag bis Donnerstag', hours: '16:00 bis 22:00 Uhr' },
    { days: 'Freitag', hours: '16:00 bis 24:00 Uhr' },
    { days: 'Samstag', hours: '14:00 bis 24:00 Uhr' },
    { days: 'Sonntag', hours: '14:00 bis 22:00 Uhr' },
  ],
  deliveryHours: [
    { days: 'Montag', hours: 'Ruhetag' },
    { days: 'Dienstag bis Donnerstag', hours: '16:30 bis 21:30 Uhr' },
    { days: 'Freitag und Samstag', hours: '16:00 bis 21:30 Uhr' },
    { days: 'Sonntag', hours: '16:30 bis 21:30 Uhr' },
  ],
} as const;
