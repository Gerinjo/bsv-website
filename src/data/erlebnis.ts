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
    actionLabel: 'Konzept der Fußballschule',
    actionHref: 'https://skechers-fussballschule.de/uber-uns/konzept/',
    external: true,
    accent: '#ef2132',
    symbol: '⚽',
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
    actionLabel: 'Camp ansehen und anmelden',
    actionHref: 'https://fussballschule.stuttgarter-kickers.de/de/portal/events/767-herbstcamp-m-dchen-bsv-nordstern-radolfzell-halle?view_type=tiles',
    external: true,
    accent: '#d5001c',
    symbol: '★',
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
    actionLabel: 'MC Shape Radolfzell',
    actionHref: 'https://www.mcshape.com/fitnessstudio/radolfzell/',
    external: true,
    accent: '#e30613',
    symbol: '▲',
  },
  {
    id: 'buergerstiftung-grundschulturnier',
    partner: 'Bürgerstiftung Radolfzell',
    title: 'Gemeinsam für das Zeller Grundschulturnier.',
    menuTitle: 'Bürgerstiftung · Grundschulturnier',
    category: 'Schule, Bewegung & Gemeinschaft',
    summary: 'Mit Unterstützung der Bürgerstiftung Radolfzell bringt der BSV die Radolfzeller Grundschulen zu einem altersgerechten Sport- und Begegnungstag zusammen.',
    facts: [
      'Turnier für Radolfzeller Grundschulen',
      'Bewegung, Fairplay und Schulgemeinschaft',
      'Unterstützung durch die Bürgerstiftung',
    ],
    actionLabel: 'Zum Grundschulturnier',
    actionHref: '/events/grundschulturnier',
    external: false,
    accent: '#e2b400',
    symbol: '✦',
  },
];
