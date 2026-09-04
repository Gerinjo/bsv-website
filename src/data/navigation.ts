export type MenuLink = {
  label: string;
  href: string;
};

export type MenuGroup = {
  title: string;
  links: MenuLink[];
};

export type MenuItem = {
  label: string;
  href: string;
  groups: MenuGroup[];
};

/**
 * Zentrale Navigationsquelle für Header und die Seiten „Alle Inhalte“.
 * Änderungen an einem Mega-Menü werden so automatisch in beiden Ansichten sichtbar.
 */
export const menu: MenuItem[] = [
  {
    label: 'Verein', href: '/verein', groups: [
      { title: 'Hauptverein', links: [
        { label: 'Vorstandschaft', href: '/verein/vorstandschaft' },
        { label: 'Unsere Geschichte', href: '/verein/geschichte' },
        { label: 'Organigramm', href: '/verein/organigramm' },
        { label: 'Satzung', href: '/verein/satzung' },
        { label: 'Beitragsordnung', href: '/verein/beitragsordnung' },
        { label: 'Termine', href: '/verein/termine' },
      ]},
      { title: 'Abteilungen', links: [
        { label: 'Gymnastik', href: '/abteilungen/gymnastik' },
        { label: 'Bogensport', href: '/abteilungen/bogensport' },
        { label: 'Wandergruppe', href: '/abteilungen/wandergruppe' },
      ]},
      { title: 'Mitgliedschaft', links: [
        { label: 'Mitglied werden', href: '/verein/mitglied-werden' },
        { label: 'Mitgliedschaft kündigen', href: '/verein/kuendigung' },
      ]},
      { title: 'Förderverein', links: [
        { label: 'Förderverein entdecken', href: '/foerderverein' },
        { label: 'Mitglied werden', href: '/foerderverein/mitglied-werden' },
      ]},
    ],
  },
  {
    label: 'Fußball', href: '/fussball', groups: [
      { title: 'Herren', links: [
        { label: 'BSV Nordstern Radolfzell · Kreisliga B Staffel 1', href: '/fussball/herren/bezirksliga' },
        { label: 'SG Herren 2 · Kreisliga C Staffel 1', href: '/fussball/herren/kreisliga-2' },
      ]},
      { title: 'Frauen', links: [
        { label: 'SG Frauen 1 · Bezirksliga Bodensee', href: '/fussball/frauen/bezirksliga' },
        { label: 'SG Frauen 2 · Kreisliga A', href: '/fussball/frauen/kreisliga' },
      ]},
      { title: 'Alte Herren', links: [
        { label: 'Ü35 Senioren', href: '/fussball/alte-herren' },
      ]},
      { title: 'Sportstätten', links: [
        { label: 'Sportstätten & Anfahrt', href: '/fussball/sportplaetze' },
        { label: 'Belegungsplan', href: '/fussball/belegungsplan' },
      ]},
    ],
  },
  {
    label: 'Junge Sterne', href: '/jugend', groups: [
      { title: 'Jugendabteilung', links: [
        { label: 'Jugendvorstandschaft', href: '/jugend/vorstandschaft' },
        { label: 'Jugendkonzept', href: '/jugend/jugendkonzept' },
        { label: 'Qualitätsoffensive', href: '/jugend/qualitaetsoffensive' },
        { label: 'Auszeichnungen', href: '/jugend/auszeichnungen' },
        { label: 'Schiedsrichter & Jugendschiedsrichter', href: '/jugend/jugendschiedsrichter' },
        { label: 'Torwarttraining', href: '/jugend/torwarttraining' },
        { label: 'Trainer:innen gesucht', href: '/jugend/trainer-gesucht' },
      ]},
      { title: 'Geschichten', links: [
        { label: 'Vom BSV ins Nationaltrikot · Mariam Oboladze', href: '/jugend/geschichten/mariam-oboladze' },
      ]},
      { title: 'Leistungssport', links: [
        { label: 'U19 A-Junioren', href: '/jugend/u19' },
        { label: 'U17 B-Junioren', href: '/jugend/u17' },
        { label: 'U15 C1-Junioren', href: '/jugend/u15-c1' },
        { label: 'U13 D1-Junioren', href: '/jugend/u13-d1' },
        { label: 'U13 D2-Junioren', href: '/jugend/u13-d2' },
        { label: 'U13 D3-Junioren', href: '/jugend/u13-d3' },
      ]},
      { title: 'Breitensport', links: [
        { label: 'U15 C2-Junioren', href: '/jugend/u15-c2' },
        { label: 'U11 E1-Junioren', href: '/jugend/u11-e1' },
        { label: 'U11 E2-Junioren', href: '/jugend/u11-e2' },
        { label: 'U11 E3-Junioren', href: '/jugend/u11-e3' },
        { label: 'U9 F-Junioren', href: '/jugend/u9-f' },
        { label: 'U8 F2 + F3-Junioren', href: '/jugend/u8-f' },
        { label: 'U7 G-Junioren Bambinis', href: '/jugend/u7-g' },
        { label: 'U6 G-Junioren Spielgruppe', href: '/jugend/u6-g' },
      ]},
      { title: 'Juniorinnen', links: [
        { label: 'U17 B-Juniorinnen', href: '/jugend/juniorinnen/u17' },
        { label: 'U15 C-Juniorinnen', href: '/jugend/juniorinnen/u15' },
        { label: 'U13 D-Juniorinnen', href: '/jugend/juniorinnen/u13' },
      ]},
    ],
  },
  {
    label: 'Erlebnis', href: '/erlebnis', groups: [
      { title: 'Fußballcamps', links: [
        { label: 'SKECHERS Fußballschule mit Bernd Voss', href: '/erlebnis/skechers-fussballschule' },
        { label: 'Porsche Mädchenfußballcamp', href: '/erlebnis/porsche-maedchenfussballcamp' },
        { label: 'Save & Play Torwartcamp', href: '/erlebnis/torwartcamp' },
      ]},
      { title: 'Turniere & Aktionstage', links: [
        { label: 'Bürgerstiftung · Grundschulturnier', href: '/erlebnis/buergerstiftung-grundschulturnier' },
        { label: 'Tag des Mädchenfußballs', href: '/events/tag-des-maedchenfussballs' },
        { label: 'Allianz Juniors Cup – D-Junioren', href: '/events/allianz-juniors-cup-d' },
        { label: 'Allianz Juniors Cup – C-Juniorinnen', href: '/events/allianz-juniors-cup-c' },
      ]},
      { title: 'Benefits', links: [
        { label: 'MC Shape Radolfzell', href: '/erlebnis/mcshape-radolfzell' },
      ]},
    ],
  },
  {
    label: 'Sponsoring', href: '/werbepartner', groups: [
      { title: 'Sponsoring-Level', links: [
        { label: 'Alle Sponsoring-Pakete', href: '/sponsoring' },
        { label: 'Kids-Sponsor', href: '/sponsoring#kids' },
        { label: 'Bronze-Sponsor', href: '/sponsoring#bronze' },
        { label: 'Silber-Sponsor', href: '/sponsoring#silver' },
        { label: 'Gold-Sponsor', href: '/sponsoring#gold' },
      ]},
      { title: 'Partnerschaft', links: [
        { label: 'Unsere Werbepartner', href: '/werbepartner' },
        { label: 'Pakete vergleichen', href: '/sponsoring#vergleich' },
        { label: 'Einzelbausteine', href: '/sponsoring#bausteine' },
        { label: 'Sponsoring anfragen', href: '/kontakt?thema=sponsoring' },
      ]},
    ],
  },
  {
    label: 'Gastronomie', href: '/gastronomie', groups: [
      { title: 'Gastro', links: [
        { label: 'Über uns', href: '/gastronomie/ueber-uns' },
        { label: 'Öffnungszeiten', href: '/gastronomie/oeffnungszeiten' },
        { label: 'Speisekarte', href: '/gastronomie/speisekarte' },
        { label: 'Events', href: '/gastronomie/events' },
      ]},
    ],
  },
];

export const allContentPaths: Record<string, string> = {
  Verein: '/verein/alle-inhalte',
  Fußball: '/fussball/alle-inhalte',
  'Junge Sterne': '/jugend/alle-inhalte',
};
