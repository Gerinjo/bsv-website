import { berlinNow, homepageMatchWindow, type NextMatch } from './nextMatch.ts';

export function selectHomepageMatches(matches: NextMatch[], now = new Date()) {
  const today = berlinNow(now).slice(0, 10);
  const { startDate, endDate } = homepageMatchWindow(now);
  const candidates = matches.filter((match) => match.dateTime.slice(0, 10) >= startDate
    && (match.status !== 'cancelled' || match.dateTime.slice(0, 10) <= today))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const current = candidates.filter((match) => match.dateTime.slice(0, 10) <= endDate);
  return current.length ? current : candidates.slice(0, 1);
}

export function selectHomepageMatch(matches: NextMatch[], now = new Date()) {
  return selectHomepageMatches(matches, now)[0];
}

// A temporarily incomplete feed must not remove a retained weekend fixture.
export function mergeHomepageMatches(previous: NextMatch[], update: NextMatch[], now = new Date()) {
  const { startDate } = homepageMatchWindow(now);
  return [...new Map([...previous, ...update].map((match) => [match.url, match])).values()]
    .filter((match) => match.dateTime.slice(0, 10) >= startDate);
}

export function matchPresentation(match: NextMatch | undefined, now = new Date(), playingMinutes = 90) {
  if (!match) return { live: false, score: '', label: '' };
  const localNow = berlinNow(now);
  if (match.status === 'cancelled') return { live: false, score: '', label: 'Abgesagt' };
  const finished = match.status === 'finished' || match.status === 'acknowledged';
  const hasScore = Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore);
  if (finished) return { live: false, score: hasScore ? `${match.homeScore} : ${match.awayScore}` : '', label: hasScore ? 'Endstand' : 'Warten auf Ergebnis' };
  const elapsedMinutes = (Date.parse(`${localNow}:00Z`) - Date.parse(`${match.dateTime}:00Z`)) / 60_000;
  if (!(elapsedMinutes >= 0)) return { live: false, score: '', label: '' };
  const age = match.observedAt ? now.getTime() - Date.parse(match.observedAt) : Infinity;
  const tickerLive = match.status === 'live' && age >= 0 && age <= 3 * 60_000;
  const live = tickerLive || elapsedMinutes < playingMinutes + 15;
  // Only a reported ticker score is an interim result. A stale score is never a final result.
  const score = live && match.status === 'live' && hasScore ? `${match.homeScore} : ${match.awayScore}` : '';
  return { live, score, label: live ? 'LIVE' : 'Warten auf Ergebnis' };
}
