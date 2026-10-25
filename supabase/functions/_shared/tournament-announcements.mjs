import { BAMBINI_EVENT } from './bambini-event.mjs';
import { GIRLS_CUP_EVENT, GIRLS_CUP_FEE_LABEL } from './girls-cup-event.mjs';
import { URMEL_EVENT } from './urmel-event.mjs';

const site = 'https://bsvnordstern.de';

// Dates and fees stay tied to the same event facts used for registration.
const tournaments = [
  {
    title: BAMBINI_EVENT.title, date: BAMBINI_EVENT.date, lastDate: BAMBINI_EVENT.isoDate,
    audience: 'Bambini · Hallenfußball', venue: BAMBINI_EVENT.venue,
    note: `${BAMBINI_EVENT.fee} pro Mannschaft`,
    url: `${site}/erlebnis/weihnachts-bambini-spieltag/`,
  },
  {
    title: GIRLS_CUP_EVENT.title, date: GIRLS_CUP_EVENT.date, lastDate: GIRLS_CUP_EVENT.days.at(-1).isoDate,
    audience: `${GIRLS_CUP_EVENT.days.flatMap(day => day.divisions).join(', ')} · Futsal`,
    venue: GIRLS_CUP_EVENT.venue, note: GIRLS_CUP_FEE_LABEL,
    url: `${site}/erlebnis/bodensee-indoor-girls-cup/`,
  },
  {
    title: URMEL_EVENT.title, date: URMEL_EVENT.date, lastDate: URMEL_EVENT.isoDate,
    audience: 'Bambini · Benefizturnier', venue: URMEL_EVENT.venue,
    note: `${URMEL_EVENT.fee} pro Mannschaft · zugunsten der Urmel Kinder-Krebshilfe`,
    url: `${site}/erlebnis/urmel-bambini-spieltag/`,
  },
  {
    title: 'Zeller Grundschulturnier 2027', date: '2027 · Termin wird noch bekannt gegeben', year: 2027,
    audience: 'Grundschulen · Mädchen- und Mix-Teams der 1. bis 4. Klasse', venue: 'BSV-Sportgelände Radolfzell',
    note: 'Fußball und Gemeinschaft mit den Radolfzeller Grundschulen',
    url: `${site}/gst2027/`,
  },
];

const normalizeUrl = url => String(url).split(/[?#]/)[0].replace(/\/+$/, '');

export function getOtherTournaments(currentEventUrl, now = new Date()) {
  // Keep a tournament visible through its last local calendar day, including multi-day events.
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  return tournaments
    .filter(tournament => normalizeUrl(tournament.url) !== normalizeUrl(currentEventUrl))
    .filter(tournament => tournament.lastDate ? tournament.lastDate >= today : tournament.year >= Number(today.slice(0, 4)))
    .toSorted((a, b) => (a.lastDate ?? `${a.year}-12-31`).localeCompare(b.lastDate ?? `${b.year}-12-31`));
}
