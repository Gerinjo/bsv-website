export type ErlebnisCooperation = {
  id: string;
  partner: string;
  title: string;
  menuTitle: string;
  category: string;
  summary: string;
  facts: string[];
  actionLabel: string;
  actionHref: string;
  external: boolean;
  accent: string;
  symbol: string;
  logoSrc: string;
  logoAlt: string;
  logoBackground: string;
  logoLabel?: string;
  date?: string;
};

export const erlebnisCooperations: ErlebnisCooperation[] = [
  {
    id: 'skechers-fussballschule',
    partner: 'SKECHERS Fußballschule mit Bernd Voss',
    title: 'Fußball erleben, lernen und gemeinsam wachsen.',
    menuTitle: 'SKECHERS Fußballschule',
    category: 'Fußballcamp & Nachwuchsförderung',
    summary: 'Professionelles, kindgerechtes Training trifft auf Wettbewerbe, Fairness und jede Menge Spielfreude. Die Fußballschule bringt Trainerteam, Material und ein erprobtes Campkonzept mit zum BSV.',
    facts: [
      'Kindgerechtes Fußballtraining',
      'Technik, Koordination und Wettbewerbe',
      'Fairness und respektvolles Miteinander',
    ],
    actionLabel: 'Mehr zur Kooperation',
    actionHref: '/erlebnis/skechers-fussballschule',
    external: false,
    accent: '#ef2132',
    symbol: '⚽',
    logoSrc: '/images/partners/skechers-fussballschule-logo-white.svg',
    logoAlt: 'SKECHERS Fußballschule mit Bernd Voss',
    logoBackground: '#164f32',
  },
  {
    id: 'porsche-maedchencamp',
    partner: 'Porsche Fußballschule · Stuttgarter Kickers',
    title: 'Mädchenfußballcamp beim BSV Nordstern.',
    menuTitle: 'Porsche Mädchenfußballcamp',
    category: 'Mädchenfußball & Feriencamp',
    summary: 'Das Hallencamp verbindet qualifiziertes, altersgerechtes Training mit gemeinsamen Erlebnissen. Willkommen sind fußballbegeisterte Mädchen – unabhängig davon, ob sie bereits im Verein spielen.',
    facts: [
      'Für Mädchen von 6 bis 14 Jahren',
      'Zwei Trainingseinheiten pro Camptag',
      'Ausstattung und Verpflegung inklusive',
    ],
    actionLabel: 'Mehr zur Kooperation',
    actionHref: '/erlebnis/porsche-maedchenfussballcamp',
    external: false,
    accent: '#009fe3',
    symbol: '★',
    logoSrc: 'https://fussballschule.stuttgarter-kickers.de/uploads/host/logo/1/square_regular_logo_original.png',
    logoAlt: 'Stuttgarter Kickers',
    logoBackground: '#ffffff',
    logoLabel: 'Porsche Fußballschule · Stuttgarter Kickers',
    date: '26.–28. Oktober 2026',
  },
  {
    id: 'mcshape-radolfzell',
    partner: 'MC Shape Radolfzell',
    title: 'Fitness und Athletik als starke Ergänzung.',
    menuTitle: 'MC Shape Radolfzell',
    category: 'Fitness & Athletik',
    summary: 'Die Kooperation verbindet Vereinsfußball mit den Möglichkeiten eines modernen Fitnessstudios in Radolfzell. Konkrete Aktionen und Vorteile werden jeweils über den Verein bekanntgegeben.',
    facts: [
      'Lokaler Fitnesspartner',
      'Training und Athletik im Blick',
      'Gemeinsame Aktionen nach Ankündigung',
    ],
    actionLabel: 'Mehr zur Kooperation',
    actionHref: '/erlebnis/mcshape-radolfzell',
    external: false,
    accent: '#e30613',
    symbol: '▲',
    logoSrc: '/images/partners/MCShape-Logo-2023-v3.png',
    logoAlt: 'MC Shape',
    logoBackground: '#000000',
  },
  {
    id: 'buergerstiftung-grundschulturnier',
    partner: 'Bürgerstiftung Radolfzell',
    title: 'Gemeinsam für das Zeller Grundschulturnier.',
    menuTitle: 'Bürgerstiftung Radolfzell · Grundschulturnier',
    category: 'Schule, Bewegung & Gemeinschaft',
    summary: 'Mit Unterstützung der Bürgerstiftung Radolfzell bringt der BSV die Radolfzeller Grundschulen zu einem altersgerechten Sport- und Begegnungstag zusammen.',
    facts: [
      'Turnier für Radolfzeller Grundschulen',
      'Bewegung, Fairplay und Schulgemeinschaft',
      'Unterstützung durch die Bürgerstiftung',
    ],
    actionLabel: 'Mehr zur Kooperation',
    actionHref: '/erlebnis/buergerstiftung-grundschulturnier',
    external: false,
    accent: '#e2b400',
    symbol: '✦',
    logoSrc: '/images/partners/GS-Logo-Transparent.png',
    logoAlt: 'Bürgerstiftung Radolfzell',
    logoBackground: '#ffffff',
  },
  {
    id: 'tag-des-maedchenfussballs',
    partner: 'BSV Nordstern Radolfzell · Südbadischer Fußballverband',
    title: 'Ein Aktionstag ganz im Zeichen des Mädchenfußballs.',
    menuTitle: 'Tag des Mädchenfußballs',
    category: 'Mädchenfußball · Aktionstag',
    summary: 'Bewegung, Fairplay und jede Menge Spaß: Beim Tag des Mädchenfußballs können junge Spielerinnen Technik, Spielformen und gemeinsames Fußballerlebnis ohne Leistungsdruck entdecken.',
    facts: [
      'Technikstationen mit Dribbling, Passen und Schießen',
      'Spiele in gemischten Teams und DFB-Abzeichen',
      'Rückblick auf den Aktionstag vom 11. Mai 2025',
    ],
    actionLabel: 'Rückblick 2025 ansehen',
    actionHref: '/erlebnis/tag-des-maedchenfussballs',
    external: false,
    accent: '#f4d638',
    symbol: '♀︎⚽',
    logoSrc: '/images/events/tdm/2025/01-gruppenfoto.jpg',
    logoAlt: 'Gruppenfoto vom Tag des Mädchenfußballs 2025',
    logoBackground: '#164f32',
    date: '11. Mai 2025',
  },
];
