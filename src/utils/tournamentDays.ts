import { load } from 'cheerio';
import { berlinNow } from './nextMatch.ts';

export type TournamentTeam = { id: string; name: string };
export type TournamentFixture = { id: string; date: string; time: string; teams: TournamentTeam[]; url: string; cancelled: boolean };
export type TournamentDay = {
  date: string; firstTeamKickoff: string; title: string; url: string;
  teams: TournamentTeam[]; venues: { name: string; matchUrl: string }[];
  preliminary: boolean; cancelled?: boolean;
};
export type TournamentSchedule = { teamId: string; season: string; checkedAt: string; days: TournamentDay[] };
const origin = 'https://www.fussball.de';
const clean = (text: string) => text.replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();

function sourceUrl(value: string | undefined, kind: 'spiel' | 'spieltag') {
  const url = new URL(value ?? '', origin);
  if (url.origin !== origin || !url.pathname.startsWith(`/${kind}/`)) throw new Error('Unexpected source URL');
  url.hash = '';
  return url.href;
}

export function parseTournamentPlan(html: string, teamId: string): TournamentFixture[] {
  const $ = load(html);
  if (!$('.club-matchplan-table').length) throw new Error('Missing team match plan');
  if ($('[data-ajax-resource*="matchplan.loadmore"]').length) throw new Error('Incomplete team match plan');
  const fixtures: TournamentFixture[] = [];
  let date = '', time = '', tournament = false;
  $('.club-matchplan-table tbody tr').each((_, row) => {
    const item = $(row);
    if (item.hasClass('row-headline')) {
      const text = clean(item.text());
      tournament = /Bezirksturnier/.test(text);
      const match = text.match(/(\d{2})\.(\d{2})\.(\d{4}) - (\d{2}:\d{2}) Uhr/);
      date = match ? `${match[3]}-${match[2]}-${match[1]}` : '';
      time = match?.[4] ?? '';
      return;
    }
    const link = item.find('.column-detail a[href*="/spiel/"]').first().attr('href');
    if (!link || !tournament) return;
    if (!date || !time || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid fixture date');
    const teams = item.find('a.club-wrapper').map((_, a) => ({
      id: $(a).attr('href')?.match(/\/team-id\/([A-Z0-9]{32})(?:[/?#]|$)/)?.[1] ?? '',
      name: clean($(a).find('.club-name').text()),
    })).get();
    if (teams.length !== 2 || teams.some((team) => !team.id || !team.name) || !teams.some((team) => team.id === teamId)) throw new Error('Invalid fixture teams');
    const url = sourceUrl(link, 'spiel');
    const id = new URL(url).pathname.match(/\/spiel\/([A-Z0-9]{32})$/)?.[1];
    if (!id) throw new Error('Invalid fixture ID');
    const status = item.find('.column-score').text() + ' ' + item.find('.column-score [title]').map((_, el) => $(el).attr('title')).get().join(' ');
    const cancelled = /\b(?:Absetzung|Ausfall|abgesagt|abgesetzt)\b/i.test(status);
    if (!fixtures.some((fixture) => fixture.id === id)) fixtures.push({ id, date, time, teams, url, cancelled });
  });
  return fixtures;
}

export function parseTournamentMatch(html: string, fixture: TournamentFixture) {
  const $ = load(html);
  const competition = $('.stage-header a.competition').first();
  const url = sourceUrl(competition.attr('href'), 'spieltag');
  const date = new URL(url).pathname.match(/\/spieldatum\/(\d{4}-\d{2}-\d{2})\//)?.[1];
  const groupId = new URL(url).pathname.match(/\/staffel\/([A-Z0-9]{32}-G)$/)?.[1];
  if (!groupId || date !== fixture.date) throw new Error('Inconsistent tournament date/group');
  const title = clean(competition.text());
  if (!title) throw new Error('Missing tournament name');
  // A nominal home team need not host a children's tournament. Use the match venue.
  const venue = clean($('.stage-header .location').first().text());
  return { url, groupId, title, venue };
}

export function parseTournamentParticipants(html: string, teamId: string) {
  const $ = load(html);
  const teams = new Map<string, TournamentTeam>();
  $('tr').has('.column-score').find('a.club-wrapper').each((_, a) => {
    const id = $(a).attr('href')?.match(/\/team-id\/([A-Z0-9]{32})(?:[/?#]|$)/)?.[1];
    const name = clean($(a).find('.club-name').text());
    if (id && name) teams.set(id, { id, name });
  });
  if (!teams.has(teamId) || teams.size < 2) throw new Error('Missing tournament participants');
  return { teams: [...teams.values()], preliminary: $('.hint-pre-publish').length > 0 };
}

export async function loadTournamentSchedule(teamId: string, season: string, fetcher: typeof fetch = fetch): Promise<TournamentSchedule> {
  if (!/^[A-Z0-9]{32}$/.test(teamId) || !/^20\d{2}-20\d{2}$/.test(season)) throw new Error('Invalid tournament configuration');
  const [start, end] = season.split('-');
  if (Number(end) !== Number(start) + 1) throw new Error('Invalid season range');
  const deadline = AbortSignal.timeout(60000);
  const read = async (url: string) => {
    const response = await fetcher(url, { signal: AbortSignal.any([deadline, AbortSignal.timeout(10000)]) });
    if (!response.ok) throw new Error(`FUSSBALL.DE returned ${response.status}`);
    return response.text();
  };
  const query = new URLSearchParams({ max: '100', 'datum-von': `${start}-07-01`, 'datum-bis': `${end}-06-30` });
  const fixtures = parseTournamentPlan(await read(`${origin}/ajax.team.matchplan/-/mode/PAGE/team-id/${teamId}?${query}`), teamId);
  const groups = new Map<string, TournamentDay>();
  for (const fixture of fixtures) {
    const detail = parseTournamentMatch(await read(fixture.url), fixture);
    const key = `${fixture.date}/${detail.groupId}`;
    let day = groups.get(key);
    if (!day) {
      const participants = parseTournamentParticipants(await read(detail.url), teamId);
      day = { date: fixture.date, firstTeamKickoff: fixture.time, title: detail.title, url: detail.url, ...participants, venues: [], cancelled: fixture.cancelled };
      groups.set(key, day);
    }
    if (fixture.teams.some((team) => !day.teams.some(({ id }) => id === team.id))) throw new Error('Inconsistent tournament participants');
    if (!fixture.cancelled && (day.cancelled || fixture.time < day.firstTeamKickoff)) day.firstTeamKickoff = fixture.time;
    day.cancelled = day.cancelled && fixture.cancelled;
    if (detail.venue && !day.venues.some(({ name }) => name === detail.venue)) day.venues.push({ name: detail.venue, matchUrl: fixture.url });
  }
  return { teamId, season, checkedAt: new Date().toISOString(), days: [...groups.values()].sort((a, b) => a.date.localeCompare(b.date) || a.firstTeamKickoff.localeCompare(b.firstTeamKickoff)) };
}

export async function tournamentScheduleWithFallback(fallback: TournamentSchedule, fetcher: typeof fetch = fetch) {
  try {
    return { schedule: await loadTournamentSchedule(fallback.teamId, fallback.season, fetcher), stale: false };
  } catch (error) {
    console.warn('[tournament-days] Aktualisierung nicht verfügbar:', error instanceof Error ? error.message : error);
    return { schedule: fallback, stale: true };
  }
}

export function splitTournamentDays(days: TournamentDay[], now = new Date()) {
  const today = berlinNow(now).slice(0, 10);
  return { upcoming: days.filter((day) => day.date >= today), past: days.filter((day) => day.date < today) };
}
