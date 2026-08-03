import { legacyContent } from './legacyContent.ts';
import { personImageByName } from './personImages';

export type TeamCoach = {
  name: string;
  role: string;
  club?: string;
  qualification?: string;
  image?: string;
  email?: string;
  phone?: string;
};

export type TrainingSlot = {
  day: string;
  time: string;
  place: string;
};

export type TeamPhoto = {
  src: string;
  alt: string;
  caption: string;
  size?: string;
};

export type TeamPartner = {
  label: string;
  href?: string;
};

export type TeamSponsor = {
  name: string;
  image: string;
  href: string;
};

export type TeamProfile = {
  path: string;
  kicker: string;
  headline: string;
  opening: string[];
  trainingLead: string;
  training: TrainingSlot[];
  trainingNote?: string;
  notice?: string;
  trial: string;
  image?: string;
  coaches: TeamCoach[];
  gallery: TeamPhoto[];
  partners?: TeamPartner[];
  squad?: string[];
  letter: string;
  fussballDeUrl?: string;
  fussballDeWidgetId?: string;
  fussballDeTableWidgetId?: string;
  sponsor?: TeamSponsor;
};

type TeamConfig = Omit<TeamProfile, 'coaches' | 'gallery' | 'squad'> & {
  coaches?: TeamCoach[];
  gallery?: TeamPhoto[];
  showSquad?: boolean;
  sourcePath?: string;
};

const placeholderImage = '/images/migration/5ea5d4dc01-placeholder-32.jpg';

const youthYears = {
  a: '2008 und 2009',
  b: '2010 und 2011',
  c: '2012 und 2013',
  d: '2014 und 2015',
  e: '2016 und 2017',
  f: '2018 und 2019',
  g: '2020 und 2021',
  playgroup: '2022 und 2023',
} as const;

export const womenAssociationName = 'SG Nordstern Radolfzell/Öhningen-Gaienhofen/Bankholzen-Moos';
export const menFirstTeamName = 'BSV Nordstern Radolfzell';
export const menSecondTeamName = 'SG Markelfingen/BSV Nordstern Radolfzell 2';

const womenPartners: TeamPartner[] = [
  { label: 'FC Öhningen-Gaienhofen e.V.', href: 'https://www.fc-oehningen-gaienhofen.de/' },
  { label: 'SC Bankholzen-Moos', href: 'https://www.sc-bankholzen-moos.de/' },
];

const youthAssociationPartners: TeamPartner[] = [
  { label: 'SV Markelfingen', href: 'https://www.sv-markelfingen.de/' },
  { label: 'SG Liggeringen-Güttingen', href: 'https://www.sg-liggeringen-guettingen.de/' },
];

const associationTeamPaths = new Set([
  'fussball/herren/kreisliga-2',
  'fussball/frauen/bezirksliga',
  'fussball/frauen/kreisliga',
  'jugend/u19',
  'jugend/u17',
]);

const coachHomeClubs: Record<string, string> = {
  'Matthias Becht': 'BSV Nordstern Radolfzell',
  'Miriam Lipp': 'FC Öhningen-Gaienhofen',
  'Emel Bayram': 'BSV Nordstern Radolfzell',
  'Ole Schmal': 'BSV Nordstern Radolfzell',
  'Michael Jentsch': 'SV Markelfingen',
  'Frieder Demmer': 'SV Markelfingen',
  'Maximilian Geismann': 'SG Liggeringen-Güttingen',
  'Andrea Basile': 'BSV Nordstern Radolfzell',
};

const coachDisplayNames: Record<string, string> = {
  'Michael Jentsch': 'Migo Jentsch',
};

const decodeHtml = (value: string) => value
  .replace(/&auml;/gi, 'ä').replace(/&ouml;/gi, 'ö').replace(/&uuml;/gi, 'ü')
  .replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü')
  .replace(/&szlig;/gi, 'ß').replace(/&amp;/gi, '&').replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"').replace(/&#039;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/[ \t]+/g, ' ').trim();

const plainText = (html: string) => decodeHtml(html
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/\r/g, ''));

const extractCoaches = (path: string): TeamCoach[] => {
  const html = legacyContent[path] ?? '';
  const cards = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];

  return cards.flatMap(([, card]) => {
    const nameMatch = card.match(/<h4[^>]*class="[^"]*uk-card-title[^"]*"[^>]*>([\s\S]*?)<\/h4>/i);
    if (!nameMatch) return [];

    const name = plainText(nameMatch[1]);
    const qualificationMatch = card.match(/qualification-wrapper[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i);
    const role = qualificationMatch ? plainText(qualificationMatch[1]) : 'Trainer:in';
    const rawQualification = qualificationMatch ? plainText(qualificationMatch[2]).replace(/^Lizenz:\s*/i, '') : undefined;
    const qualification = rawQualification && !/^keine Angab/i.test(rawQualification) ? rawQualification : undefined;
    const image = card.match(/<img[^>]+src="([^"]+)"/i)?.[1];
    const email = card.match(/href="mailto:([^"?]+)(?:\?[^\"]*)?"/i)?.[1];
    const phone = card.match(/href="tel:([^"]+)"/i)?.[1];

    return [{
      name,
      role,
      qualification,
      image: image && image !== placeholderImage ? image : undefined,
      email: email ? decodeURIComponent(email) : undefined,
      phone,
    }];
  });
};

const extractSquad = (path: string): string[] | undefined => {
  const html = legacyContent[path] ?? '';
  const text = plainText(html);
  const end = text.search(/Trainingszeiten/i);
  if (end < 0) return undefined;

  const lines = text.slice(0, end)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^(Mannschaftsbild|Ausweichtrikotsatz)$/i.test(line));
  const unique = [...new Set(lines)];
  return unique.length ? unique : undefined;
};

const bBoysGallery: TeamPhoto[] = [
  ['6a9b4065d8-BSV2023-266.jpg', 'Gemeinsam am Ball'],
  ['c9f5489f3b-BSV2023-292.jpg', 'Volle Konzentration'],
  ['b79442c45d-BSV2023-293.jpg', 'Im Spiel'],
  ['2c67ea8f2c-BSV2023-190.jpg', 'Teamgeist auf dem Platz'],
  ['e548297925-BSV2023-15.jpg', 'Gemeinsam verteidigen'],
  ['9e063b88ba-BSV2023-169.jpg', 'Mit Tempo nach vorne'],
  ['51e37debe3-BSV2023-47.jpg', 'Fußball erleben'],
  ['c8c9c40792-BSV2023-6.jpg', 'Als Mannschaft'],
  ['427fa8ec30-BSV2023-96.jpg', 'Am Ball bleiben'],
  ['8187b9655b-BSV2023-65.jpg', 'Gemeinsam besser werden'],
  ['3f8b0ed073-BSV2023-320.jpg', 'Einsatz für das Team'],
  ['ebd4e05546-BSV2023-197.jpg', 'Jeder Moment zählt'],
  ['5da2dfbd32-BSV2023-43.jpg', 'Junge Sterne'],
].map(([file, caption], index) => ({
  src: `/images/migration/${file}`,
  alt: `${caption} bei den U17 B-Junioren`,
  caption,
  size: index === 0 ? 'wide' : index === 1 ? 'tall' : '',
}));

const bGirlsGallery: TeamPhoto[] = [
  { src: '/images/migration/111514b3f2-WhatsApp-Image-2025-06-29-at-17.50.32.jpeg', alt: 'Gemeinsamer Mannschaftsmoment der B-Juniorinnen', caption: 'Gemeinsam unterwegs', size: 'wide' },
  { src: '/images/migration/fd4387b0f8-WhatsApp-Image-2025-06-29-at-17.50.33.jpeg', alt: 'Die B-Juniorinnen bei einer gemeinsamen Aktivität', caption: 'Als Team zusammen', size: 'tall' },
  { src: '/images/migration/f6b7d3c5cb-WhatsApp-Image-2025-06-29-at-17.50.38.jpeg', alt: 'Teamtag der B-Juniorinnen', caption: 'Erlebnisse verbinden' },
  { src: '/images/migration/c24d2dded5-WhatsApp-Image-2025-06-29-at-17.50.36.jpeg', alt: 'Spielerinnen der B-Juniorinnen beim Teamtag', caption: 'Zeit füreinander' },
  { src: '/images/migration/06ded97c94-WhatsApp-Image-2025-06-29-at-17.50.31.jpeg', alt: 'Die Mannschaft in gemeinsamer Runde', caption: 'Mannschaft erleben', size: 'wide' },
  { src: '/images/migration/6cbc4be7a5-WhatsApp-Image-2025-06-29-at-17.50.34.jpeg', alt: 'Gemeinsamer Abschluss der B-Juniorinnen', caption: 'Ein Tag zum Erinnern', size: 'tall' },
];

const dGirlsGallery: TeamPhoto[] = [
  { src: '/images/migration/003f2fe06e-WhatsApp-Image-2025-06-28-at-17.56.57.jpeg', alt: 'Die D-Juniorinnen bei einer gemeinsamen Veranstaltung', caption: 'Gemeinsam unterwegs', size: 'wide' },
  { src: '/images/migration/8d1d3ff0dd-WhatsApp-Image-2025-06-28-at-20.05.07-1.jpeg', alt: 'Die Mannschaft gemeinsam im See', caption: 'Abkühlung als Team', size: 'tall' },
  { src: '/images/migration/299b20ab41-WhatsApp-Image-2025-06-28-at-20.05.00.jpeg', alt: 'Die D-Juniorinnen beim Beachsoccer', caption: 'Fußball funktioniert überall' },
  { src: '/images/migration/c6c3081a6a-WhatsApp-Image-2025-06-28-at-20.57.40-1.jpeg', alt: 'Gemeinsame Pause der D-Juniorinnen', caption: 'Zeit füreinander' },
  { src: '/images/migration/bad3cc98b7-WhatsApp-Image-2025-06-28-at-20.57.40.jpeg', alt: 'Das Team bei einer gemeinsamen Mahlzeit', caption: 'Stärkung für die Mannschaft', size: 'wide' },
  { src: '/images/migration/3b0b7f4b79-WhatsApp-Image-2025-06-28-at-17.56.56.jpeg', alt: 'Spielerinnen mit einer Auszeichnung', caption: 'Ein Tag zum Erinnern', size: 'tall' },
];

const configs: TeamConfig[] = [
  {
    path: 'fussball/herren/bezirksliga', sourcePath: 'fussball/herren/kreisliga-b', kicker: `${menFirstTeamName} · Kreisliga B Staffel 1`, headline: 'Leidenschaft.<br /><em>Für den Nordstern.</em>', letter: '1',
    fussballDeUrl: 'https://www.fussball.de/mannschaft/bsv-nordstern-radolfzell-bsv-nordstern-radolfzell-suedbaden/-/saison/2627/team-id/011MICLVK0000000VTVG0001VTR8C1K7',
    fussballDeWidgetId: 'af96d999-a7ba-432a-87c5-439ab401516d',
    fussballDeTableWidgetId: '52d29828-708d-438f-be85-3c8b47a58b44',
    sponsor: {
      name: 'Sparkasse Hegau-Bodensee',
      image: '/images/sponsors/sparkasse-hegau-bodensee.png',
      href: 'https://www.sparkasse-hegau-bodensee.de/',
    },
    opening: ['Unsere erste Herrenmannschaft spielt in der Kreisliga B Staffel 1 und verbindet sportlichen Ehrgeiz mit Zusammenhalt und echter Vereinsidentität.', 'Neue Spieler sind zu den Trainingstagen herzlich willkommen.'],
    trainingLead: 'Zwei gemeinsame Trainingseinheiten pro Woche.',
    training: [{ day: 'Dienstag', time: '19:00 – 20:30 Uhr', place: 'BSV Nordstern Radolfzell' }, { day: 'Donnerstag', time: '19:00 – 20:30 Uhr', place: 'BSV Nordstern Radolfzell' }],
    trial: 'Lerne die Mannschaft und das Trainerteam bei einem unverbindlichen Probetraining kennen.', image: '/images/aktive/teams/2526/herren-1.jpeg', showSquad: true,
    gallery: [{ src: '/images/migration/9fc1c481e5-BSV-Herren-2526-Trikotsatz-schwarz.jpeg', alt: 'Die erste Herrenmannschaft im schwarzen Ausweichtrikot', caption: 'Unser Ausweichtrikotsatz', size: 'wide' }],
  },
  {
    path: 'fussball/herren/kreisliga-2', sourcePath: 'fussball/herren/kreisliga-c', kicker: `${menSecondTeamName} · Kreisliga C Staffel 1`, headline: 'Gemeinsam.<br /><em>Stark verbunden.</em>', letter: '2',
    fussballDeUrl: 'https://www.fussball.de/mannschaft/sg-markelfingen-bsv-n-radolfz-2-sv-markelfingen-suedbaden/-/saison/2627/team-id/011MIBT808000000VTVG0001VTR8C1K7',
    fussballDeWidgetId: '48130047-3237-4579-8f2e-a581bbb98097',
    fussballDeTableWidgetId: '9bc34c27-6f02-4e05-bd7d-7c5594256630',
    opening: [`Unsere zweite Herrenmannschaft spielt als ${menSecondTeamName} in der Kreisliga C Staffel 1.`, 'Im Team zählen Verlässlichkeit, Freude am Fußball und der Zusammenhalt über Vereinsgrenzen hinweg.'],
    trainingLead: 'Zwei gemeinsame Trainingseinheiten pro Woche.',
    training: [{ day: 'Dienstag', time: '19:00 – 20:30 Uhr', place: 'BSV Nordstern Radolfzell' }, { day: 'Donnerstag', time: '19:00 – 20:30 Uhr', place: 'BSV Nordstern Radolfzell' }],
    trial: 'Neue Spieler sind zu den Trainingstagen herzlich willkommen.', image: '/images/aktive/teams/2526/herren-2.jpg', showSquad: true,
  },
  {
    path: 'fussball/frauen/bezirksliga', kicker: `${womenAssociationName} · Frauen Bezirksliga Bodensee`, headline: 'Drei Vereine.<br /><em>Eine Mannschaft.</em>', letter: 'F1',
    fussballDeUrl: 'https://www.fussball.de/mannschaft/sg-no-radolfz-oehning-gai-bankh-moos-bsv-nordstern-radolfzell-suedbaden/-/saison/2627/team-id/01A2FGUHDO000000VV0AG80NVSEJ47CH',
    fussballDeWidgetId: 'a7855cb2-0226-49a3-98ca-b106b3786afb',
    fussballDeTableWidgetId: 'a71cf2af-c7c4-403d-9d0a-bad8f465dc18',
    opening: [`Unsere erste Frauenmannschaft tritt als ${womenAssociationName} an.`, 'Sie spielt in der Bezirksliga und verbindet Spielerinnen aller drei Partnervereine in einer gemeinsamen Mannschaft.'],
    partners: womenPartners,
    trainingLead: 'Gemeinsames Training an zwei Standorten der Spielgemeinschaft.',
    training: [{ day: 'Dienstag', time: '19:00 – 20:30 Uhr', place: 'BSV Nordstern Radolfzell' }, { day: 'Donnerstag', time: '19:00 – 20:30 Uhr', place: 'SC Bankholzen-Moos' }],
    trial: 'Komm vorbei, lerne die Mannschaft kennen und werde Teil unserer Spielgemeinschaft.',
    image: '/images/aktive/teams/2526/frauen.jpg',
    coaches: [{ name: 'Matthias Becht', role: 'Trainer' }],
  },
  {
    path: 'fussball/frauen/kreisliga', kicker: `${womenAssociationName} 2 · Frauen Kreisliga A`, headline: 'Drei Vereine.<br /><em>Fußball gemeinsam.</em>', letter: 'F2',
    fussballDeUrl: 'https://www.fussball.de/mannschaft/sg-no-radolfz-oehning-gai-bankh-moos-2-bsv-nordstern-radolfzell-suedbaden/-/saison/2627/team-id/03163NI9R0000000VS5489BSVSCPI5U4',
    fussballDeWidgetId: '48107d01-3242-45df-8f09-55a20a959688',
    fussballDeTableWidgetId: '9f37d0e5-fcf0-44d1-8c49-56652f0eee7a',
    opening: [`Unsere zweite Frauenmannschaft tritt als ${womenAssociationName} 2 an.`, 'Sie spielt in der Kreisliga und bietet Spielerinnen aller drei Partnervereine ein gemeinsames Team.'],
    partners: womenPartners,
    trainingLead: 'Gemeinsames Training an zwei Standorten der Spielgemeinschaft.',
    training: [{ day: 'Dienstag', time: '19:00 – 20:30 Uhr', place: 'BSV Nordstern Radolfzell' }, { day: 'Donnerstag', time: '19:00 – 20:30 Uhr', place: 'SC Bankholzen-Moos' }],
    trial: 'Komm vorbei, lerne die Mannschaft kennen und werde Teil unserer Spielgemeinschaft.',
    image: '/images/aktive/teams/2526/frauen.jpg',
    coaches: [{ name: 'Miriam Lipp', role: 'Chef-Trainerin' }, { name: 'Emel Bayram', role: 'Co-Trainerin' }],
  },
  {
    path: 'fussball/alte-herren', kicker: 'Ü35 Senioren', headline: 'Am Ball.<br /><em>Aus Freude.</em>', letter: 'AH',
    opening: ['Für Fußballer ab 35, die das Kicken nicht sein lassen wollen, bieten wir unsere Alte-Herren-Mannschaft an.', 'Neben dem wöchentlichen Training nehmen wir an Turnieren teil und tragen Freundschaftsspiele aus. Aktiv sein hält jung – und gemeinsam macht es einfach mehr Spaß.'],
    trainingLead: 'Ein fester Termin für Fußball, Freundschaft und gemeinsame Erlebnisse.',
    training: [{ day: 'Mittwoch', time: '19:00 Uhr', place: 'BSV Nordstern Sportplatz' }],
    trial: 'Wir freuen uns über jedes neue Gesicht. Komm direkt zum gemeinsamen Fußballspiel vorbei oder melde dich vorab.',
    coaches: [{ name: 'Torben Schmidt', role: 'Ansprechperson Alte Herren', phone: '+491715680710' }],
  },
  {
    path: 'jugend/u11-e1', kicker: 'Kinderfußball', headline: 'Spielen.<br /><em>Mutig werden.</em>', letter: 'E1',
    opening: ['Bei den E1-Junioren entwickeln Kinder Technik, Spielverständnis und Freude am gemeinsamen Fußball.', `Jungs und Mädchen der Jahrgänge ${youthYears.e} sind herzlich willkommen.`],
    trainingLead: 'Zwei Einheiten pro Woche mit viel Ballzeit und altersgerechten Spielformen.',
    training: [{ day: 'Dienstag', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }, { day: 'Donnerstag', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }],
    notice: 'Für unsere E-Jugend suchen wir weitere zuverlässige Trainerinnen und Trainer, die Freude an der Arbeit mit Kindern haben.',
    trial: `Kinder der Jahrgänge ${youthYears.e} können gerne ein Probetraining vereinbaren. Bitte frage vorab beim Trainerteam an.`,
  },
  {
    path: 'jugend/u11-e2', kicker: 'Kinderfußball', headline: 'Lernen.<br /><em>Gemeinsam spielen.</em>', letter: 'E2',
    opening: ['Bei den E2-Junioren stehen viele Ballkontakte, Spielfreude und das Lernen in der Gruppe im Mittelpunkt.', `Jungs und Mädchen der Jahrgänge ${youthYears.e} sind herzlich willkommen.`],
    trainingLead: 'Die neuen Trainingszeiten werden durch das Trainerteam bekanntgegeben.',
    training: [{ day: 'Aktuell', time: 'Termin folgt', place: 'BSV Nordstern' }],
    notice: 'Für unsere E-Jugend suchen wir weitere zuverlässige Trainerinnen und Trainer, die Freude an der Arbeit mit Kindern haben.',
    trial: `Kinder der Jahrgänge ${youthYears.e} können gerne ein Probetraining vereinbaren. Bitte frage vorab beim Trainerteam an.`,
    coaches: [{ name: 'Marcelino Rüth', role: 'Trainer', email: 'marcelino.rueth@bsvnordstern.de', phone: '+491754003543' }, { name: 'Mohamad Mahmoudi', role: 'Trainer', email: 'mohamad.mahmoudi@bsvnordstern.de' }],
  },
  {
    path: 'jugend/u11-e3', kicker: 'Kinderfußball', headline: 'Entdecken.<br /><em>Zusammen wachsen.</em>', letter: 'E3',
    opening: [`In der E3 spielen Kinder der Jahrgänge ${youthYears.e} und sammeln gemeinsam wertvolle Fußballerfahrungen.`, 'Im Mittelpunkt stehen Freude, Bewegung und ein sicherer Einstieg in das Mannschaftsspiel.'],
    trainingLead: 'Zwei Einheiten pro Woche mit viel Bewegung und altersgerechtem Fußball.',
    training: [{ day: 'Dienstag', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }, { day: 'Donnerstag', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }],
    notice: 'Für unsere E-Jugend suchen wir weitere zuverlässige Trainerinnen und Trainer, die Freude an der Arbeit mit Kindern haben.',
    trial: `Kinder der Jahrgänge ${youthYears.e} sind willkommen. Bitte frage vorab beim Trainerteam an.`,
    coaches: [{ name: 'Stefan Sulger', role: 'Trainer', qualification: 'Kindertrainer-Zertifikat', email: 'stefan.sulger@bsvnordstern.de' }, { name: 'Michael Sick', role: 'Trainer', email: 'michael.sick@bsvnordstern.de' }],
  },
  {
    path: 'jugend/u9-f', kicker: 'Kinderfußball', headline: 'Dribbeln.<br /><em>Freude teilen.</em>', letter: 'U9',
    opening: [`Unsere U9 bietet Kindern der Jahrgänge ${youthYears.f} einen spielerischen Einstieg mit vielen Ballkontakten.`, 'Gemeinsames Entdecken und die Freude am Fußball stehen dabei immer an erster Stelle.'],
    trainingLead: 'Sommertraining von Mitte März bis Mitte November.',
    training: [{ day: 'Montag', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }, { day: 'Mittwoch', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }],
    trial: `Jungs und Mädchen der Jahrgänge ${youthYears.f} sind herzlich willkommen. Bitte melde dich vorab beim Trainerteam.`,
  },
  {
    path: 'jugend/u8-f', kicker: 'Kinderfußball', headline: 'Loslegen.<br /><em>Am Ball bleiben.</em>', letter: 'U8',
    opening: [`Unsere U8 richtet sich an Kinder der Jahrgänge ${youthYears.f} und verbindet Fußballlernen mit jeder Menge Bewegung.`, 'In einer kindgerechten Umgebung dürfen alle ausprobieren, mutig sein und gemeinsam wachsen.'],
    trainingLead: 'Sommertraining von Mitte März bis Mitte November.',
    training: [{ day: 'Montag', time: '17:00 – 18:30 Uhr', place: 'BSV Nordstern' }, { day: 'Mittwoch', time: '17:00 – 18:30 Uhr', place: 'BSV Nordstern' }],
    notice: 'Aktuell gibt es eine Warteliste. Bitte frage deshalb vor einem Probetraining beim Trainerteam an.',
    trial: `Jungs und Mädchen der Jahrgänge ${youthYears.f} sind grundsätzlich herzlich willkommen.`,
  },
  {
    path: 'jugend/u7-g', kicker: 'Bambinis', headline: 'Bewegen.<br /><em>Einfach spielen.</em>', letter: 'U7',
    opening: [`Bei den Bambinis trainieren Kinder der Jahrgänge ${youthYears.g}.`, 'Spiel, Bewegung und erste Erfahrungen mit dem Ball sorgen für einen fröhlichen Einstieg in den Vereinsfußball.'],
    trainingLead: 'Eine kompakte Einheit pro Woche für unsere jungen Fußballsterne.',
    training: [{ day: 'Mittwoch', time: '16:30 – 17:30 Uhr', place: 'BSV Nordstern Sportplatz' }],
    trial: `Kinder der Jahrgänge ${youthYears.g} können gerne schnuppern. Bitte melde dein Kind vorher beim Trainerteam an.`,
  },
  {
    path: 'jugend/u6-g', kicker: 'Spielgruppe', headline: 'Ankommen.<br /><em>Freude entdecken.</em>', letter: 'U6',
    opening: [`In der G-Jugend-Spielgruppe trainieren Kinder der Jahrgänge ${youthYears.playgroup}.`, 'Mit altersgerechten Spielen entdecken Mädchen und Jungs Bewegung, Gemeinschaft und den Ball.'],
    trainingLead: 'Der behutsame Einstieg in den Fußball – gemeinsam und ohne Leistungsdruck.',
    training: [{ day: 'Mittwoch', time: '16:30 – 17:30 Uhr', place: 'BSV Nordstern Sportplatz' }],
    trial: `Kinder der Jahrgänge ${youthYears.playgroup} können gerne schnuppern. Bitte melde dein Kind vorher beim Trainerteam an.`,
  },
  {
    path: 'jugend/u19', kicker: 'Leistungsfußball', headline: 'Ambition.<br /><em>Als Gemeinschaft.</em>', letter: 'A',
    opening: ['Unsere A-Junioren spielen in einer Spielgemeinschaft mit dem SV Markelfingen, SV Güttingen und SV Liggeringen.', `Zum Team gehören Jugendliche der Jahrgänge ${youthYears.a}.`],
    partners: youthAssociationPartners,
    trainingLead: 'Bitte mindestens 15 Minuten vor Trainingsbeginn vor Ort sein.',
    training: [{ day: 'Montag', time: '19:00 Uhr', place: 'SV Markelfingen' }, { day: 'Mittwoch', time: '19:00 Uhr', place: 'BSV Nordstern Radolfzell' }],
    trial: `Neue Spieler der Jahrgänge ${youthYears.a} sind willkommen. Bitte frage vorab beim Trainerteam an.`,
  },
  {
    path: 'jugend/u17', kicker: 'Leistungsfußball', headline: 'Entwicklung.<br /><em>Im Team.</em>', letter: 'B',
    opening: ['Unsere B-Junioren spielen in einer Spielgemeinschaft mit dem SV Markelfingen, SV Güttingen und SV Liggeringen.', `Zum Team gehören Jugendliche der Jahrgänge ${youthYears.b}.`],
    partners: youthAssociationPartners,
    trainingLead: 'Zwei Trainingsorte, eine gemeinsame Mannschaft.',
    training: [{ day: 'Dienstag', time: '19:00 Uhr', place: 'SV Markelfingen' }, { day: 'Donnerstag', time: '18:30 Uhr', place: 'BSV Nordstern Radolfzell' }],
    trial: `Neue Spieler der Jahrgänge ${youthYears.b} sind willkommen. Bitte frage vorab beim Trainerteam an.`, gallery: bBoysGallery,
  },
  {
    path: 'jugend/u15-c1', kicker: 'Leistungsfußball', headline: 'Fordern.<br /><em>Gezielt fördern.</em>', letter: 'C1',
    opening: [`Im Leistungskader der C1 spielen Kinder und Jugendliche der Jahrgänge ${youthYears.c}.`, 'Das Team verbindet ambitioniertes Training mit persönlicher und spielerischer Entwicklung.'],
    trainingLead: 'Zwei fokussierte Trainingseinheiten pro Woche beim BSV Nordstern.',
    training: [{ day: 'Dienstag', time: '18:30 Uhr', place: 'BSV Nordstern' }, { day: 'Donnerstag', time: '18:30 Uhr', place: 'BSV Nordstern' }],
    trial: `Spieler der Jahrgänge ${youthYears.c} können ein Probetraining absolvieren. Bitte frage vorab beim Trainerteam an.`,
  },
  {
    path: 'jugend/u15-c2', kicker: 'Breitensport', headline: 'Fußball.<br /><em>Für jeden.</em>', letter: 'C2',
    opening: [`In der C2 spielen Kinder und Jugendliche der Jahrgänge ${youthYears.c}.`, 'Freude am Fußball, individuelle Fortschritte und Verlässlichkeit in der Mannschaft stehen im Mittelpunkt.'],
    trainingLead: 'Zwei gemeinsame Trainingseinheiten pro Woche beim BSV Nordstern.',
    training: [{ day: 'Dienstag', time: '18:30 Uhr', place: 'BSV Nordstern' }, { day: 'Donnerstag', time: '18:30 Uhr', place: 'BSV Nordstern' }],
    trial: `Spieler der Jahrgänge ${youthYears.c} können ein Probetraining absolvieren. Bitte frage vorab beim Trainerteam an.`,
  },
  {
    path: 'jugend/u13-d1', kicker: 'Leistungsfußball', headline: 'Fokus.<br /><em>Mit Spielfreude.</em>', letter: 'D1',
    opening: [`Im Leistungskader der D1 spielen Kinder der Jahrgänge ${youthYears.d}.`, 'Leistungsorientiertes Lernen und die Freude am gemeinsamen Spiel gehören für uns zusammen.'],
    trainingLead: 'Zwei Einheiten pro Woche für eine kontinuierliche Entwicklung.',
    training: [{ day: 'Dienstag', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }, { day: 'Donnerstag', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }],
    trial: `Kinder der Jahrgänge ${youthYears.d} können ein Probetraining absolvieren. Bitte frage vorab beim Trainer an.`,
  },
  {
    path: 'jugend/u13-d2', kicker: 'Leistungsfußball', headline: 'Lernen.<br /><em>Als Mannschaft.</em>', letter: 'D2',
    opening: [`In der D2 spielen Kinder der Jahrgänge ${youthYears.d}.`, 'Altersgerechtes Training schafft die Grundlage für individuelle Entwicklung und gutes Zusammenspiel.'],
    trainingLead: 'Zwei gemeinsame Trainingseinheiten pro Woche beim BSV Nordstern.',
    training: [{ day: 'Montag', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }, { day: 'Mittwoch', time: '17:30 – 19:00 Uhr', place: 'BSV Nordstern' }],
    trial: `Kinder der Jahrgänge ${youthYears.d} sind willkommen. Bitte frage vorab beim Trainerteam an.`,
  },
  {
    path: 'jugend/u13-d3', kicker: 'Leistungsfußball', headline: 'Wachsen.<br /><em>Schritt für Schritt.</em>', letter: 'D3',
    opening: [`In der D3 spielen Kinder der Jahrgänge ${youthYears.d}.`, 'Das Team bietet Raum für Entwicklung, Freude am Ball und gemeinsames Lernen.'],
    trainingLead: 'Zwei Einheiten pro Woche auf dem Gelände des BSV Nordstern.',
    training: [{ day: 'Montag', time: '17:00 – 18:30 Uhr', place: 'BSV Nordstern' }, { day: 'Donnerstag', time: '17:00 – 18:30 Uhr', place: 'BSV Nordstern' }],
    trial: `Kinder der Jahrgänge ${youthYears.d} sind willkommen. Bitte frage vorab beim Trainerteam an.`,
  },
  {
    path: 'jugend/juniorinnen/u17', kicker: 'B-Juniorinnen', headline: 'Entwicklung.<br /><em>Zusammenhalt.</em>', letter: 'B',
    opening: ['Unsere B-Juniorinnen verbinden ambitionierten Fußball mit einer Mannschaft, in der Entwicklung, Verlässlichkeit und Freude am gemeinsamen Spiel zählen.', `Zum Team gehören Spielerinnen der Jahrgänge ${youthYears.b}.`],
    trainingLead: 'Sommertraining von Mitte März bis Mitte November auf dem BSV-Nordstern-Sportplatz.',
    training: [{ day: 'Montag', time: '18:00 – 19:30 Uhr', place: 'BSV Nordstern Sportplatz' }, { day: 'Mittwoch', time: '18:00 – 19:30 Uhr', place: 'BSV Nordstern Sportplatz' }],
    trainingNote: 'Bitte jeweils zehn Minuten vor Trainingsbeginn umgezogen auf dem Platz sein.',
    trial: `Neue Spielerinnen der Jahrgänge ${youthYears.b} sind herzlich willkommen. Lerne das Team bei einem Probetraining kennen.`, image: '/images/jugend/teams/2526/u17-b-juniorinnen.jpg', gallery: bGirlsGallery,
    coaches: [{ name: 'Sven Goldhagen', role: 'Cheftrainer', qualification: 'DFB-Basis-Coach', image: '/images/verein/personen/sven-goldhagen.jpg', email: 'sven.goldhagen@bsvnordstern.de', phone: '+491727404080' }, { name: 'Sonja Thomen', role: 'Co-Trainerin', qualification: 'DFB-Basis-Coach', email: 'sonja.thomen@bsvnordstern.de' }],
  },
  {
    path: 'jugend/juniorinnen/u15', kicker: 'C-Juniorinnen', headline: 'Lernen.<br /><em>Wachsen.</em>', letter: 'C',
    opening: ['Bei unseren C-Juniorinnen stehen die fußballerische Entwicklung, mutiges Zusammenspiel und ein starker Teamgeist im Mittelpunkt.', `Zum Team gehören Spielerinnen der Jahrgänge ${youthYears.c}.`],
    trainingLead: 'Die aktuellen Trainingszeiten erhältst du direkt beim Trainer.',
    training: [{ day: 'Nach Absprache', time: 'Termin erfragen', place: 'BSV Nordstern' }],
    trial: `Spielerinnen der Jahrgänge ${youthYears.c} können beim Trainer ein unverbindliches Probetraining vereinbaren.`,
    coaches: [{ name: 'Alexander Kramer', role: 'Trainer', qualification: 'DFB-Basis-Coach', email: 'alexander.kramer@bsvnordstern.de', phone: '+491733276748' }],
  },
  {
    path: 'jugend/juniorinnen/u13', kicker: 'D wie Durchstarten', headline: 'Am Ball.<br /><em>Als Team.</em>', letter: 'D',
    opening: ['Bei unseren D-Juniorinnen stehen Freude am Fußball, persönliche Entwicklung und ein starker Zusammenhalt im Mittelpunkt.', `Neue Spielerinnen der Jahrgänge ${youthYears.d} sind herzlich willkommen.`],
    trainingLead: 'Sommertraining von Mitte März bis Mitte November auf dem BSV-Nordstern-Sportplatz.',
    training: [{ day: 'Montag', time: '18:00 – 19:30 Uhr', place: 'BSV Nordstern Sportplatz' }, { day: 'Mittwoch', time: '18:00 – 19:30 Uhr', place: 'BSV Nordstern Sportplatz' }],
    trainingNote: 'Bitte jeweils zehn Minuten vor Trainingsbeginn umgezogen auf dem Platz sein.',
    trial: `Spielerinnen der Jahrgänge ${youthYears.d} können die Mannschaft und das Trainerteam bei einem Probetraining kennenlernen.`, image: '/images/jugend/teams/2526/u13-d-juniorinnen.jpg', gallery: dGirlsGallery,
    coaches: [{ name: 'Dana Bulander', role: 'Trainerin', qualification: 'C-Lizenz', image: '/images/verein/personen/dana-bulander.jpg', email: 'dana.bulander@bsvnordstern.de' }],
  },
];

export const teamProfiles: Record<string, TeamProfile> = Object.fromEntries(configs.map((config) => {
  const { showSquad, sourcePath, ...profile } = config;
  const legacyPath = sourcePath ?? config.path;
  const coaches = config.coaches ?? extractCoaches(legacyPath);
  return [config.path, {
    ...profile,
    coaches: coaches.map((coach) => ({
      ...coach,
      name: coachDisplayNames[coach.name] ?? coach.name,
      image: personImageByName[coach.name] ?? coach.image,
      club: associationTeamPaths.has(config.path) ? (coach.club ?? coachHomeClubs[coach.name]) : coach.club,
    })),
    gallery: config.gallery ?? [],
    squad: showSquad ? extractSquad(legacyPath) : undefined,
  } satisfies TeamProfile];
}));

export const teamPaths = Object.keys(teamProfiles);
