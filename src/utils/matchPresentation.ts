import { berlinNow, type NextMatch } from './nextMatch.ts';

export function selectHomepageMatch(matches: NextMatch[], now = new Date()) {
  const today = berlinNow(now).slice(0, 10);
  return matches.filter((match) => match.dateTime.slice(0, 10) >= today
    && (match.status !== 'cancelled' || match.dateTime.slice(0, 10) === today))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))[0];
}

export function matchPresentation(match: NextMatch | undefined, now = new Date()) {
  if (!match) return { live: false, score: '', label: '' };
  const localNow = berlinNow(now);
  const today = localNow.slice(0, 10);
  const matchToday = match.dateTime.slice(0, 10) === today;
  const fresh = Boolean(match.observedAt && now.getTime() - Date.parse(match.observedAt) <= 3 * 60_000);
  if (match.status === 'cancelled') return { live: false, score: '', label: 'Abgesagt' };
  const live = matchToday && match.status === 'live' && fresh;
  const finished = match.status === 'finished' || match.status === 'acknowledged';
  const hasScore = Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore);
  const score = (finished || (matchToday && match.dateTime <= localNow)) && hasScore
    ? `${match.homeScore} : ${match.awayScore}` : '';
  const elapsedMinutes = (Date.parse(`${localNow}:00Z`) - Date.parse(`${match.dateTime}:00Z`)) / 60_000;
  const label = live ? 'LIVE' : score ? (finished ? 'Endstand' : 'Spielstand')
    : finished || (matchToday && elapsedMinutes >= 120) ? 'Ergebnis folgt' : '';
  return { live, score, label };
}
