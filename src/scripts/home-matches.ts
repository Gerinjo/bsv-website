import { berlinNow, type NextMatch } from '../utils/nextMatch';
import { matchPresentation, selectHomepageMatch } from '../utils/matchPresentation';

const feedUrl = import.meta.env.PUBLIC_HOME_MATCHES_URL || 'https://avbkhyptztqitlgqnajn.supabase.co/functions/v1/home-matches';
const teams = [...document.querySelectorAll<HTMLElement>('.next-match[data-widget-id]')].map((element) => ({
  element,
  matches: JSON.parse(element.dataset.matches || '[]') as NextMatch[],
}));
const setText = (element: HTMLElement, value: string) => { if (element.textContent !== value) element.textContent = value; };

function renderMatches(now = new Date()) {
  for (const { element, matches } of teams) {
    const match = selectHomepageMatch(matches, now);
    const details = element.querySelector<HTMLElement>('.match-details')!;
    details.hidden = !match;
    element.querySelector<HTMLElement>('.match-fallback')!.hidden = Boolean(match);
    if (!match) continue;
    details.dataset.kickoff = match.dateTime;
    const home = match.homeTeamId === element.dataset.teamId ? 'BSV' : match.home;
    const away = match.awayTeamId === element.dataset.teamId ? 'BSV' : match.away;
    setText(element.querySelector('[data-home]')!, home);
    setText(element.querySelector('[data-away]')!, away);
    const time = element.querySelector('time')!;
    time.dateTime = match.dateTime;
    setText(time, `${match.dateLabel} · ${match.time} Uhr`);
    element.querySelector<HTMLElement>('.competition')!.hidden = !match.competition;
    setText(element.querySelector('[data-competition]')!, match.competition || '');
    const link = element.querySelector<HTMLAnchorElement>('.match-details .match-link')!;
    link.href = match.url;
    link.setAttribute('aria-label', `${element.dataset.label}: ${home} gegen ${away} auf fussball.de`);
    const state = matchPresentation(match, now);
    element.querySelector<HTMLElement>('.match-state')!.hidden = !state.label;
    element.querySelector<HTMLElement>('.live-badge')!.hidden = !state.live;
    const score = element.querySelector<HTMLElement>('.match-score')!;
    score.hidden = !state.score;
    setText(score, state.score);
    score.setAttribute('aria-label', `Ergebnis ${state.score}`);
    const label = element.querySelector<HTMLElement>('.state-label')!;
    label.hidden = state.live;
    setText(label, state.label);
  }
}

function isMatch(value: unknown): value is NextMatch {
  if (!value || typeof value !== 'object') return false;
  const match = value as NextMatch;
  return ['home', 'away', 'dateTime', 'dateLabel', 'time', 'url'].every((key) => typeof match[key as keyof NextMatch] === 'string')
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(match.dateTime)
    && /^https:\/\/www\.fussball\.de\/spiel\/-\/spiel\/[A-Z0-9]{32}$/.test(match.url);
}

let pending = false;
let lastChecked = 0;
async function refreshFeed() {
  renderMatches();
  if (pending || document.hidden || !teams.length) return;
  const today = berlinNow().slice(0, 10);
  const matchDay = teams.some(({ matches }) => matches.some((match) => match.dateTime.startsWith(today)));
  const interval = matchDay ? 60_000 : 15 * 60_000;
  if (Date.now() - lastChecked < interval) return;
  pending = true;
  lastChecked = Date.now();
  try {
    const response = await fetch(feedUrl, { signal: AbortSignal.timeout(25_000), credentials: 'omit' });
    if (!response.ok) return;
    const feed = await response.json();
    for (const team of teams) {
      const update = feed.teams?.[team.element.dataset.widgetId!];
      if (!update?.available || !Array.isArray(update.matches)) continue;
      // If a source temporarily omits today's game, retain it until midnight.
      team.matches = [...new Map([
        ...team.matches,
        ...update.matches.filter(isMatch),
      ].map((match) => [match.url, match])).values()].filter((match) => match.dateTime.slice(0, 10) >= today);
    }
    renderMatches();
  } catch { /* Preserve the built-in schedule when the live feed is unavailable. */ }
  finally { pending = false; }
}

renderMatches();
void refreshFeed();
window.setInterval(() => { if (!document.hidden) void refreshFeed(); }, 15_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refreshFeed(); });
window.addEventListener('online', () => { lastChecked = 0; void refreshFeed(); });
