import type { ImageMetadata } from 'astro';
import bambiniLogo from '../assets/events/weihnachts-bambini-logo.png';
import { BAMBINI_EVENT } from '../../supabase/functions/_shared/bambini-event.mjs';
import { URMEL_EVENT } from '../../supabase/functions/_shared/urmel-event.mjs';
import { girlsCup } from './girlsCup';
import { bambiniGallery } from './bambiniImages';
import { urmelGallery } from './urmelImages';
import type { EventGallery } from './eventGallery';

export interface HomeTournament {
  id: string;
  name: string;
  category: string;
  date: string;
  isoDate: string;
  heading: string;
  emphasis: string;
  intro: string;
  logo: { src: ImageMetadata | string; alt: string; whiteBackground?: boolean };
  gallery?: EventGallery;
  photo?: { src: string; alt: string; caption: string; width: number; height: number; fit?: 'contain' };
  facts: { label: string; value: string; wide?: boolean }[];
  href: string;
  actionLabel: string;
  signup?: boolean;
}

// Add further tournaments here to keep the homepage in one shared event block.
const tournaments: HomeTournament[] = [
  {
    id: 'bambini-spieltag', name: BAMBINI_EVENT.title, category: 'Bambini · Hallenfußball',
    date: BAMBINI_EVENT.date, isoDate: BAMBINI_EVENT.isoDate,
    heading: 'Kleine Kicker.', emphasis: 'Große Weihnachtsfreude.',
    intro: 'Hallenfußball, eine Überraschung für jedes Kind und vielleicht sogar Besuch vom Nikolaus. Seid mit eurer Bambini-Mannschaft dabei!',
    logo: { src: bambiniLogo, alt: 'Weihnachtlicher Bambini-Spieltag · BSV Nordstern' },
    gallery: bambiniGallery,
    facts: [
      { label: 'Spielort', value: `${BAMBINI_EVENT.venue} · ${BAMBINI_EVENT.address}`, wide: true },
      { label: 'Startzeiten', value: `${BAMBINI_EVENT.timeSlots.join(' · ')} Uhr` },
      { label: 'Startgebühr', value: BAMBINI_EVENT.fee },
    ],
    href: '/erlebnis/weihnachts-bambini-spieltag', actionLabel: 'Mannschaft anmelden', signup: true,
  },
  {
    id: girlsCup.id, name: girlsCup.title, category: 'Juniorinnen · Futsal', date: girlsCup.date, isoDate: girlsCup.days[0].isoDate,
    heading: 'Bodensee.', emphasis: 'Indoor Girls Cup 2027.',
    intro: 'Zwei Tage Hallenfußball für E-, D-, C- und B-Juniorinnen. Gemeinsam spielen, als Team zusammenhalten und Fußballfreude erleben.',
    logo: { src: '/images/verein/wappen/bsv-nordstern.png', alt: 'BSV Nordstern Radolfzell' },
    photo: { src: girlsCup.artwork, alt: 'Turniermotiv Bodensee Indoor Girls Cup 2027 mit Fußball und stilisierten Bodenseewellen', caption: 'Vier Altersklassen · Ein Wochenende Hallenfußball', width: 1200, height: 800, fit: 'contain' },
    facts: [
      ...girlsCup.days.map((day) => ({ label: day.date, value: day.divisions.join(' & ') })),
      { label: 'Spielort', value: `${girlsCup.venue} · ${girlsCup.address}`, wide: true },
      { label: 'Startgebühr', value: girlsCup.fee, wide: true },
      { label: 'Startzeiten', value: 'Werden bekanntgegeben' },
    ],
    href: girlsCup.href, actionLabel: 'Teams anmelden', signup: true,
  },
  {
    id: 'urmel-cup', name: URMEL_EVENT.title, category: 'Bambini · Benefizturnier',
    date: URMEL_EVENT.date, isoDate: URMEL_EVENT.isoDate,
    heading: 'URMEL-Cup.', emphasis: 'Kids spielen für Kids.',
    intro: 'Unser Bambini-Benefizturnier geht in die nächste Runde. Die gesamten Turniergebühren und die Einnahmen der Tombola gehen an die Urmel Kinder-Krebshilfe e.V.',
    logo: { src: '/images/events/urmel/urmel-kinder-krebshilfe.webp', alt: 'Urmel Kinder-Krebshilfe e.V.', whiteBackground: true },
    gallery: urmelGallery,
    facts: [
      { label: 'Spielort', value: URMEL_EVENT.venue, wide: true },
      { label: 'Startzeiten', value: `${URMEL_EVENT.timeSlots.join(' · ')} Uhr` },
      { label: 'Startgebühr', value: `${URMEL_EVENT.fee} pro Team` },
    ],
    href: '/erlebnis/urmel-bambini-spieltag', actionLabel: 'Mannschaft anmelden', signup: true,
  },
];

// ISO dates sort chronologically, including across the turn of the year.
export const homeTournaments = tournaments.toSorted((a, b) => a.isoDate.localeCompare(b.isoDate));
