export type SponsorshipLevel = {
  id: 'kids' | 'bronze' | 'silver' | 'gold';
  name: string;
  price: string;
  tagline: string;
  summary: string;
  accent: string;
  featured?: boolean;
  features: string[];
};

export type SponsorshipModule = {
  title: string;
  price: string;
  description: string;
  note?: string;
};

export const sponsorshipLevels: SponsorshipLevel[] = [
  {
    id: 'kids',
    name: 'Kids-Sponsor',
    price: '250 €',
    tagline: 'Nachwuchs möglich machen',
    summary: 'Ein niedrigschwelliger Einstieg für Unternehmen und Privatpersonen, die gezielt unsere Kinder- und Jugendteams unterstützen möchten.',
    accent: '#91c82f',
    features: [
      'Nennung im Bereich „Kids-Sponsoren“ auf der Sponsoring-Seite',
      'Logo mit Verlinkung zur eigenen Website',
      'Digitale Kids-Sponsor-Urkunde für die eigene Kommunikation',
      'Dankesnennung in einem gemeinsamen Jugend-Sponsorenbeitrag pro Saison',
      'Zweckorientierte Unterstützung für Trainingsmaterial, Turniere oder Jugendaktionen',
    ],
  },
  {
    id: 'bronze',
    name: 'Bronze-Sponsor',
    price: '500 €',
    tagline: 'Lokal sichtbar werden',
    summary: 'Das Basispaket für regionale Partner, die dauerhaft als Unterstützer des BSV Nordstern wahrgenommen werden möchten.',
    accent: '#a86e3d',
    features: [
      'Logo und Verlinkung auf der Sponsoring-Seite',
      'Kurzes Unternehmensprofil im digitalen Sponsorenverzeichnis',
      'Begrüßungsbeitrag auf einem Vereinskanal',
      'Nennung auf der digitalen Sponsorenwand',
      'Zwei Einladungen zum jährlichen Sponsoren- und Vereinsevent',
    ],
  },
  {
    id: 'silver',
    name: 'Silber-Sponsor',
    price: '1.000 €',
    tagline: 'Mehr Reichweite. Mehr Nähe.',
    summary: 'Für Partner, die ihre Marke sichtbar mit Vereinsleben, Fußball und gesellschaftlichem Engagement verbinden möchten.',
    accent: '#b7c0c6',
    featured: true,
    features: [
      'Alle Leistungen des Bronze-Pakets',
      'Bevorzugte Logoplatzierung auf der Sponsoring-Seite',
      'Zwei individuelle Social-Media-Beiträge pro Saison',
      'Ein wählbarer Zusatzbaustein: Jugend, Spieltag, Event oder Digital',
      'Vier Einladungen zum jährlichen Sponsoren- und Vereinsevent',
      'Gemeinsame Abstimmung eines saisonalen Kommunikationsschwerpunkts',
    ],
  },
  {
    id: 'gold',
    name: 'Gold-Sponsor',
    price: '2.500 €',
    tagline: 'Starker Partner des Nordsterns',
    summary: 'Die umfassende Partnerschaft für Unternehmen, die den BSV langfristig begleiten und besonders präsent auftreten möchten.',
    accent: '#a8cbb4',
    features: [
      'Alle Leistungen des Silber-Pakets',
      'Top-Platzierung als Gold-Partner in ausgewählten Vereinsmedien',
      'Vier individuelle Social-Media-Beiträge pro Saison',
      'Ein hochwertiger Präsenzbaustein: Bande, Veranstaltung oder Teamprojekt',
      'Sechs Einladungen zum jährlichen Sponsoren- und Vereinsevent',
      'Jährliches Partnergespräch zur Planung und Erfolgsauswertung',
      'Vorrangiges Beteiligungsrecht bei neuen Vereinsprojekten und Events',
    ],
  },
];

export const sponsorshipModules: SponsorshipModule[] = [
  {
    title: 'Spieltagspatenschaft',
    price: 'ab 250 €',
    description: 'Präsenz rund um einen ausgewählten Heimspieltag mit digitaler Ankündigung, Nennung und individuellem Partnerhinweis.',
  },
  {
    title: 'Jugend- & Materialpartner',
    price: 'ab 500 €',
    description: 'Gezielte Unterstützung einer Jugendmannschaft oder eines konkreten Materialprojekts wie Bälle, Tore oder Trainingshilfen.',
  },
  {
    title: 'Turnier- & Eventpartner',
    price: 'ab 750 €',
    description: 'Partnerschaft für Grundschulturnier, Fußballcamp, Jugendturnier oder Vereinsveranstaltung mit abgestimmter Sichtbarkeit.',
  },
  {
    title: 'Bandenwerbung',
    price: 'ab 600 € / Jahr',
    description: 'Dauerhafte Werbefläche am Vereinsgelände. Platzierung, Format und Laufzeit werden individuell vereinbart.',
    note: 'Herstellungs- und Montagekosten werden separat kalkuliert.',
  },
  {
    title: 'Trikot- & Ausrüstungspartner',
    price: 'individuell',
    description: 'Exklusive oder geteilte Präsenz auf Trikots, Trainingskleidung oder Mannschaftsausstattung – abhängig von Team und Umfang.',
  },
  {
    title: 'Digitalpartner',
    price: 'ab 300 €',
    description: 'Kompakte digitale Kampagne über Website und Vereinskanäle, passend zu einem Angebot, Projekt oder besonderen Anlass.',
  },
];

export const sponsorshipPrinciples = [
  {
    title: 'Passend statt beliebig',
    text: 'Wir verbinden Partner mit Themen, Mannschaften und Projekten, die zu ihrem Unternehmen und ihrer Zielgruppe passen.',
  },
  {
    title: 'Leistung klar benennen',
    text: 'Umfang, Laufzeit, Werbeleistungen und Zuständigkeiten werden vor Beginn transparent und schriftlich vereinbart.',
  },
  {
    title: 'Partnerschaft pflegen',
    text: 'Sponsoring endet nicht mit einem Logo. Wir halten Kontakt, berichten über Projekte und entwickeln die Zusammenarbeit weiter.',
  },
] as const;

export const sponsoringDisclaimer = 'Alle Beträge sind Richtwerte pro Saison beziehungsweise für den jeweils genannten Zeitraum. Konkrete Leistungen, Laufzeiten, Verfügbarkeit und gegebenenfalls anfallende Produktionskosten werden individuell vereinbart.';
