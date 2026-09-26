import { berlinNow, type NextMatch } from '../utils/nextMatch';
import { matchPresentation, mergeHomepageMatches, selectHomepageMatches } from '../utils/matchPresentation';

const feedUrl = import.meta.env.PUBLIC_HOME_MATCHES_URL || 'https://avbkhyptztqitlgqnajn.supabase.co/functions/v1/home-matches';
const teams = [...document.querySelectorAll<HTMLElement>('.next-match[data-widget-id]')].map((element) => ({
  element,
  matches: JSON.parse(element.dataset.matches || '[]') as NextMatch[],
}));
const setText = (element: HTMLElement, value: string) => { if (element.textContent !== value) element.textContent = value; };

function renderMatches(now = new Date()) {
  for (const { element, matches } of teams) {
    const selected = selectHomepageMatches(matches, now);
    const fixtures = element.querySelector<HTMLElement>('.match-fixtures')!;
    const rows = [...fixtures.querySelectorAll<HTMLElement>('.match-details')];
    const rowCount = Math.max(1, selected.length);
    while (rows.length < rowCount) {
      const row = rows[0].cloneNode(true) as HTMLElement;
      fixtures.append(row);
      rows.push(row);
    }
    while (rows.length > rowCount) rows.pop()!.remove();
    element.querySelector<HTMLElement>('.match-fallback')!.hidden = selected.length > 0;
    rows[0].hidden = !selected.length;
    for (const [index, match] of selected.entries()) {
      const details = rows[index];
      details.hidden = false;
      details.dataset.kickoff = match.dateTime;
      const home = match.homeTeamId === element.dataset.teamId ? 'BSV' : match.home;
      const away = match.awayTeamId === element.dataset.teamId ? 'BSV' : match.away;
      setText(details.querySelector('[data-home]')!, home);
      setText(details.querySelector('[data-away]')!, away);
      const time = details.querySelector('time')!;
      time.dateTime = match.dateTime;
      setText(time, `${match.dateLabel} · ${match.time} Uhr`);
      details.querySelector<HTMLElement>('.competition')!.hidden = !match.competition;
      setText(details.querySelector('[data-competition]')!, match.competition || '');
      const link = details.querySelector<HTMLAnchorElement>('.match-link')!;
      link.href = match.url;
      link.setAttribute('aria-label', `${element.dataset.label}: ${home} gegen ${away} auf fussball.de`);
      const state = matchPresentation(match, now, Number(element.dataset.playingMinutes) || 90);
      details.querySelector<HTMLElement>('.match-state')!.hidden = !state.label;
      details.querySelector<HTMLElement>('.live-badge')!.hidden = !state.live;
      const score = details.querySelector<HTMLAnchorElement>('.match-score')!;
      score.hidden = !state.score;
      setText(score, state.score);
      if (state.score && !state.live) {
        score.href = element.dataset.tableUrl!;
        score.title = `Zur Tabelle: ${element.dataset.label}`;
        score.setAttribute('aria-label', `Endstand ${state.score} – Tabelle ${element.dataset.label} öffnen`);
      } else {
        score.removeAttribute('href');
        score.removeAttribute('title');
        score.setAttribute('aria-label', `Ergebnis ${state.score}`);
      }
      const label = details.querySelector<HTMLElement>('.state-label')!;
      label.hidden = state.live;
      setText(label, state.label);
    }
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
  const now = new Date();
  const matchDay = teams.some(({ matches }) => selectHomepageMatches(matches, now).some((match) =>
    match.dateTime.startsWith(today) || match.dateTime <= berlinNow(now)
      && !['finished', 'acknowledged', 'cancelled'].includes(match.status ?? '')));
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
      team.matches = mergeHomepageMatches(team.matches, update.matches.filter(isMatch), new Date());
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
