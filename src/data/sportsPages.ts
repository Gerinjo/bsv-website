import { menFirstTeamName } from './teamPages';

const footballImage = '/images/aktive/teams/2526/herren-1.jpeg';
const reserveImage = '/images/aktive/teams/2526/herren-2.jpg';
const youthImage = '/images/jugend/teams/2526/u17-b-juniorinnen.jpg';
const juniorsImage = '/images/jugend/teams/2526/u13-d-juniorinnen.jpg';

export const sportsPages = [
  { path: 'fussball', eyebrow: 'Auf geht’s grün', title: 'Fußball', intro: 'Von den Aktiven bis zu den Alten Herren – Leidenschaft, Teamgeist und Heimat auf jedem Platz.', image: footballImage, body: ['Der Fußball prägt den BSV Nordstern seit seiner Gründung. Heute bieten wir Mannschaften und Spielgemeinschaften für unterschiedliche Alters- und Leistungsklassen.', 'Hier findest du unsere Teams, Trainingszeiten, Ansprechpersonen und Informationen zu den Sportstätten.'] },
  { path: 'fussball/sportplaetze', eyebrow: 'Unsere Heimat', title: 'Sportplätze', intro: 'Trainieren und spielen an der Schlesierstraße in Radolfzell.', image: footballImage },
  { path: 'fussball/belegungsplan', eyebrow: 'Plätze & Zeiten', title: 'Belegungsplan', intro: 'Die aktuelle Übersicht zur Nutzung unserer Sportstätten.', image: footballImage },
  { path: 'fussball/herren/bezirksliga', eyebrow: 'Herren · Kreisliga B Staffel 1', title: menFirstTeamName, intro: 'Unsere erste Herrenmannschaft spielt in der Kreisliga B Staffel 1.', image: footballImage },
  { path: 'fussball/herren/kreisliga-2', eyebrow: 'Herren · Kreisliga C Staffel 1', title: 'SG Herren 2', intro: 'Die Spielgemeinschaft des SV Markelfingen und des BSV Nordstern Radolfzell.', image: reserveImage },
  { path: 'fussball/frauen/bezirksliga', eyebrow: 'Frauen · Bezirksliga Bodensee', title: 'SG Frauen 1', intro: 'Unsere erste Frauenmannschaft in der Frauen Bezirksliga Bodensee.', image: footballImage },
  { path: 'fussball/frauen/kreisliga', eyebrow: 'Frauen · Kreisliga A', title: 'SG Frauen 2', intro: 'Unsere zweite Frauenmannschaft in der Frauen Kreisliga A.', image: footballImage },
  { path: 'fussball/alte-herren', eyebrow: 'Ü35 Senioren', title: 'Alte Herren', intro: 'Fußball, Freundschaft und gemeinsame Erlebnisse über den Spieltag hinaus.', image: footballImage },
  { path: 'jugend', eyebrow: 'Die Zukunft des BSV', title: 'Junge Sterne', intro: 'Gemeinsam wachsen: Fußball, Freundschaft und Entwicklung für Kinder und Jugendliche.', image: youthImage, body: ['Unsere Jugendabteilung begleitet Kinder und Jugendliche vom ersten Ballkontakt bis in den Leistungsfußball.', 'Qualifizierte Trainerinnen und Trainer, ein klares Jugendkonzept und die Freude am gemeinsamen Sport bilden dabei unsere Grundlage.'] },
  { path: 'jugend/vorstandschaft', eyebrow: 'Jugendabteilung', title: 'Jugendvorstandschaft', intro: 'Die Menschen hinter einer starken und lebendigen Nachwuchsarbeit.', image: youthImage },
  { path: 'jugend/neuigkeiten', eyebrow: 'Neues vom Nachwuchs', title: 'Jugend-News', intro: 'Aktuelles aus unseren Mannschaften und der Jugendabteilung.', image: youthImage },
  { path: 'jugend/spielgenehmigung', eyebrow: 'Gut vorbereitet', title: 'Spielgenehmigung', intro: 'Alle Informationen und Unterlagen für den Start im Spielbetrieb.', image: juniorsImage },
  { path: 'jugend/jugendkonzept', eyebrow: 'Unser gemeinsamer Weg', title: 'Jugendkonzept', intro: 'Leitlinien für eine nachhaltige, altersgerechte und respektvolle Nachwuchsarbeit.', image: youthImage },
  { path: 'jugend/jugendschiedsrichter', eyebrow: 'Verantwortung übernehmen', title: 'Jugendschiedsrichter', intro: 'Junge Menschen, die Spiele leiten und Fairness vorleben.', image: '/images/jugend/schiedsrichter/7b4f53d574-WhatsApp_Bild_2024-05-29_um_16.44.07_afe27bc6.jpg' },
  ...[
    ['jugend/u11-e1','U11 E1-Junioren','Kinderfußball'], ['jugend/u11-e2','U11 E2-Junioren','Kinderfußball'], ['jugend/u11-e3','U11 E3-Junioren','Kinderfußball'],
    ['jugend/u9-f','U9 F-Junioren','Kinderfußball'], ['jugend/u8-f','U8 F-Junioren','Kinderfußball'], ['jugend/u7-g','U7 G-Junioren Bambinis','Kinderfußball'], ['jugend/u6-g','U6 G-Junioren Spielgruppe','Kinderfußball'],
    ['jugend/u19','U19 A-Junioren','Leistungsfußball'], ['jugend/u17','U17 B-Junioren','Leistungsfußball'], ['jugend/u15-c1','U15 C1-Junioren','Leistungsfußball'], ['jugend/u15-c2','U15 C2-Junioren','Leistungsfußball'], ['jugend/u13-d1','U13 D1-Junioren','Leistungsfußball'], ['jugend/u13-d2','U13 D2-Junioren','Leistungsfußball'], ['jugend/u13-d3','U13 D3-Junioren','Leistungsfußball'],
  ].map(([path,title,eyebrow]) => ({ path, title, eyebrow, intro: 'Mannschaft, Trainingszeiten und Ansprechpersonen auf einen Blick.', image: juniorsImage })),
  { path: 'jugend/juniorinnen/spielberichte', eyebrow: 'Juniorinnen', title: 'Spielberichte', intro: 'Neuigkeiten und Berichte aus dem Juniorinnenfußball.', image: youthImage },
  { path: 'jugend/juniorinnen/u17', eyebrow: 'Juniorinnen', title: 'U17 B-Juniorinnen', intro: 'Team, Training und Ansprechpersonen unserer B-Juniorinnen.', image: youthImage },
  { path: 'jugend/juniorinnen/u15', eyebrow: 'Juniorinnen', title: 'U15 C-Juniorinnen', intro: 'Team, Training und Ansprechpersonen unserer C-Juniorinnen.', image: youthImage },
  { path: 'jugend/juniorinnen/u13', eyebrow: 'Juniorinnen', title: 'U13 D-Juniorinnen', intro: 'Team, Training und Ansprechpersonen unserer D-Juniorinnen.', image: juniorsImage },
];

export const sportsPaths = sportsPages.map((page) => page.path);
