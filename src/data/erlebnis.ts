import { BAMBINI_EVENT } from '../../supabase/functions/_shared/bambini-event.mjs';
import { getImage } from 'astro:assets';
import bambiniLogo from '../assets/events/weihnachts-bambini-logo.png';
import { URMEL_EVENT } from '../../supabase/functions/_shared/urmel-event.mjs';
import { girlsCup } from './girlsCup';

const bambiniLogoWeb = await getImage({ src: bambiniLogo, width: 600, format: 'webp' });

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
    id: 'weihnachts-bambini-spieltag', partner: 'Weihnachtlicher Bambini-Spieltag', title: 'Kleine Kicker. Große Weihnachtsfreude.', menuTitle: 'Weihnachtlicher Bambini-Spieltag', category: 'Bambini · Hallenspieltag',
    summary: 'Weihnachtlicher Hallenfußball in der Unterseesporthalle Radolfzell. Jedes Kind bekommt eine Überraschung – und vielleicht schaut der Nikolaus vorbei.',
    facts: [`${BAMBINI_EVENT.date} · ${BAMBINI_EVENT.venue}`, BAMBINI_EVENT.address, 'Startzeiten: 9:00, 12:00 und 15:00 Uhr', 'Mannschaft anmelden und Wunschzeiten auswählen'],
    actionLabel: 'Mannschaft anmelden', actionHref: '/erlebnis/weihnachts-bambini-spieltag', external: false, accent: '#a7323c', symbol: '✦',
    logoSrc: bambiniLogoWeb.src, logoAlt: 'Eventlogo Weihnachtlicher Bambini-Spieltag · BSV Nordstern', logoBackground: '#0e3929', date: '12. Dezember 2026',
  },
  {
    id: girlsCup.id, partner: girlsCup.title, title: 'Zwei Turniertage. Vier Altersklassen. Ein Wochenende Hallenfußball.', menuTitle: girlsCup.title, category: 'Juniorinnen · Futsalturnier',
    summary: `Hallenfußball in der ${girlsCup.venue}: E- und D-Juniorinnen am 20. Februar, C- und B-Juniorinnen am 21. Februar 2027.`,
    facts: [...girlsCup.days.map((day) => `${day.date}: ${day.divisions.join(' & ')}`), `${girlsCup.venue} · ${girlsCup.address}`, girlsCup.fee],
    actionLabel: 'Teams anmelden', actionHref: `${girlsCup.href}#anmeldung`, external: false, accent: '#e4bf6a', symbol: '⚽',
    logoSrc: girlsCup.artwork, logoAlt: girlsCup.title, logoBackground: '#0e3929', date: girlsCup.date,
  },
  {
    id: 'urmel-bambini-spieltag', partner: URMEL_EVENT.title, title: 'Kids spielen für Kids – Bambini-Fußball mit Herz.', menuTitle: URMEL_EVENT.title, category: 'Bambini · Benefizturnier',
    summary: URMEL_EVENT.charityNote, facts: [`${URMEL_EVENT.date} · ${URMEL_EVENT.venue}`, `Drei Startzeiten: ${URMEL_EVENT.timeSlots.join(', ')} Uhr`, `${URMEL_EVENT.fee} pro Mannschaft · Wunschzeiten auswählen`],
    actionLabel: 'Mannschaft anmelden', actionHref: '/erlebnis/urmel-bambini-spieltag', external: false, accent: '#9fc900', symbol: '♥',
    logoSrc: '/images/events/urmel/urmel-kinder-krebshilfe.webp', logoAlt: 'URMEL Kinder-Krebshilfe e.V.', logoBackground: '#ffffff', date: URMEL_EVENT.date,
  },
  {
    id: 'skechers-fussballschule',
    partner: 'SKECHERS Fußballschule mit Bernd Voss',
    title: 'Fußball erleben, lernen und gemeinsam wachsen.',
    menuTitle: 'SKECHERS Fußballschule',
    category: 'Fußballcamp & Nachwuchsförderung',
    summary: 'Professionelles, kindgerechtes Training trifft auf Wettbewerbe, Fairness und jede Menge Spielfreude. Die Fußballschule bringt Trainerteam, Material und ein erprobtes Campkonzept mit zum BSV.',
    facts: ['Kindgerechtes Fußballtraining','Technik, Koordination und Wettbewerbe','Fairness und respektvolles Miteinander'],
    actionLabel: 'Mehr zur Kooperation', actionHref: '/erlebnis/skechers-fussballschule', external: false, accent: '#ef2132', symbol: '⚽',
    logoSrc: '/images/partners/skechers-fussballschule-logo-white.svg', logoAlt: 'SKECHERS Fußballschule mit Bernd Voss', logoBackground: '#164f32',
  },
  {
    id: 'porsche-maedchencamp', partner: 'Porsche Fußballschule · Stuttgarter Kickers', title: 'Mädchenfußballcamp beim BSV Nordstern.', menuTitle: 'Porsche Mädchenfußballcamp', category: 'Mädchenfußball & Feriencamp',
    summary: 'Das Hallencamp verbindet qualifiziertes, altersgerechtes Training mit gemeinsamen Erlebnissen. Willkommen sind fußballbegeisterte Mädchen – unabhängig davon, ob sie bereits im Verein spielen.',
    facts: ['Für Mädchen von 6 bis 14 Jahren','Zwei Trainingseinheiten pro Camptag','Ausstattung und Verpflegung inklusive'], actionLabel: 'Mehr zur Kooperation', actionHref: '/erlebnis/porsche-maedchenfussballcamp', external: false, accent: '#009fe3', symbol: '★',
    logoSrc: 'https://fussballschule.stuttgarter-kickers.de/uploads/host/logo/1/square_regular_logo_original.png', logoAlt: 'Stuttgarter Kickers', logoBackground: '#ffffff', logoLabel: 'Porsche Fußballschule · Stuttgarter Kickers', date: '26.–28. Oktober 2026',
  },
  {
    id: 'buergerstiftung-grundschulturnier', partner: 'Bürgerstiftung Radolfzell', title: 'Gemeinsam für das Zeller Grundschulturnier.', menuTitle: 'Bürgerstiftung Radolfzell · Grundschulturnier', category: 'Schule, Bewegung & Gemeinschaft',
    summary: 'Mit Unterstützung der Bürgerstiftung Radolfzell bringt der BSV die Radolfzeller Grundschulen zu einem altersgerechten Sport- und Begegnungstag zusammen.', facts: ['Turnier für Radolfzeller Grundschulen','Bewegung, Fairplay und Schulgemeinschaft','Unterstützung durch die Bürgerstiftung'],
    actionLabel: 'Mehr zur Kooperation', actionHref: '/erlebnis/buergerstiftung-grundschulturnier', external: false, accent: '#e2b400', symbol: '✦', logoSrc: '/images/partners/GS-Logo-Transparent.png', logoAlt: 'Bürgerstiftung Radolfzell', logoBackground: '#ffffff',
  },
  {
    id: 'tag-des-maedchenfussballs', partner: 'Tag des Mädchenfußballs', title: 'Ein Aktionstag des BSV Nordstern mit Unterstützung des Südbadischen Fußballverbands (SBFV).', menuTitle: 'Tag des Mädchenfußballs', category: 'Mädchenfußball · Aktionstag',
    summary: 'Bewegung, Fairplay und jede Menge Spaß: Beim Tag des Mädchenfußballs können junge Spielerinnen Technik, Spielformen und gemeinsames Fußballerlebnis ohne Leistungsdruck entdecken.', facts: ['Technikstationen mit Dribbling, Passen und Schießen','Spiele in gemischten Teams und DFB-Abzeichen','Rückblick auf den Aktionstag vom 11. Mai 2025'],
    actionLabel: 'Rückblick 2025 ansehen', actionHref: '/erlebnis/tag-des-maedchenfussballs', external: false, accent: '#f4d638', symbol: '♀︎⚽', logoSrc: '/images/events/tdm/2025/01-gruppenfoto.jpg', logoAlt: 'Gruppenfoto vom Tag des Mädchenfußballs 2025', logoBackground: '#164f32', date: '11. Mai 2025',
  },

  {
    id: 'mcshape-radolfzell', partner: 'MC Shape Radolfzell', title: 'Fitness und Athletik als starke Ergänzung.', menuTitle: 'MC Shape Radolfzell', category: 'Fitness & Athletik',
    summary: 'Die Kooperation verbindet Vereinsfußball mit den Möglichkeiten eines modernen Fitnessstudios in Radolfzell. Konkrete Aktionen und Vorteile werden jeweils über den Verein bekanntgegeben.', facts: ['Lokaler Fitnesspartner','Training und Athletik im Blick','Gemeinsame Aktionen nach Ankündigung'],
    actionLabel: 'Mehr zur Kooperation', actionHref: '/erlebnis/mcshape-radolfzell', external: false, accent: '#e30613', symbol: '▲', logoSrc: '/images/partners/MCShape-Logo-2023-v3.png', logoAlt: 'MC Shape', logoBackground: '#000000',
  },
];
