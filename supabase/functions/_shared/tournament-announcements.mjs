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
    image: {
      src: `${site}/images/email/tournaments/weihnachts-bambini.jpg`, width: 1200, height: 800,
      alt: 'Weihnachtliches Fußballmotiv mit Ball, Nikolausmütze und Geschenken in der Sporthalle',
      caption: 'KI-generiertes Stimmungsmotiv zum Weihnachts-Bambini-Spieltag',
    },
    url: `${site}/erlebnis/weihnachts-bambini-spieltag/`,
  },
  {
    title: GIRLS_CUP_EVENT.title, date: GIRLS_CUP_EVENT.date, lastDate: GIRLS_CUP_EVENT.days.at(-1).isoDate,
    audience: `${GIRLS_CUP_EVENT.days.flatMap(day => day.divisions).join(', ')} · Futsal`,
    venue: GIRLS_CUP_EVENT.venue, note: GIRLS_CUP_FEE_LABEL,
    image: {
      src: `${site}/images/email/tournaments/bodensee-indoor-girls-cup-2027.jpg`, width: 1200, height: 800,
      alt: 'Turniermotiv Bodensee Indoor Girls Cup 2027 mit Fußball und Bodenseewellen',
      caption: 'Bodensee Indoor Girls Cup 2027 · E-, D-, C- und B-Juniorinnen',
    },
    url: `${site}/erlebnis/bodensee-indoor-girls-cup/`,
  },
  {
    title: URMEL_EVENT.title, date: URMEL_EVENT.date, lastDate: URMEL_EVENT.isoDate,
    audience: 'Bambini · Benefizturnier', venue: URMEL_EVENT.venue,
    note: `${URMEL_EVENT.fee} pro Mannschaft · zugunsten der Urmel Kinder-Krebshilfe`,
    image: {
      src: `${site}/images/email/tournaments/urmel-bambini-2026.jpg`, width: 1200, height: 900,
      alt: 'Gruppenfoto mit Kindern und Trainerteams beim Urmel-Bambini-Spieltag 2026',
      caption: 'Rückblick: Gemeinsam beim Urmel-Bambini-Spieltag 2026',
    },
    url: `${site}/erlebnis/urmel-bambini-spieltag/`,
  },
];

const normalizeUrl = url => String(url).split(/[?#]/)[0].replace(/\/+$/, '');

export function getOtherTournaments(currentEventUrl, now = new Date()) {
  // Keep a tournament visible through its last local calendar day, including multi-day events.
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  return tournaments
    .filter(tournament => normalizeUrl(tournament.url) !== normalizeUrl(currentEventUrl))
    .filter(tournament => tournament.lastDate >= today)
    .toSorted((a, b) => a.lastDate.localeCompare(b.lastDate));
}
