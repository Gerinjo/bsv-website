import { load } from 'cheerio';
import { Buffer } from 'node:buffer';
import { isBsvHomeTournament, parseTournamentParticipants } from './tournamentDays.ts';
import { berlinNow } from './nextMatch.ts';
import { addDays, bookingTimes, matchRule, matchdaySettings, matchdayTeams, timeMinutes } from './matchdayPlan.ts';
import type { MatchdaySchedule, MatchFixture, MatchTeam, Pitch, PitchBooking } from './matchdayPlan.ts';

const origin = 'https://www.fussball.de';
export const clubPlanUrl = origin + '/ajax.club.matchplan/-/id/00ES8GN9F000001IVV0AG08LVUPGND5I/mode/PAGE/show-filter/false';
const clean = (s: string) => s.replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
const isCancelled = (status: string) => /\b(?:Absetzung|Ausfall|abgesagt|abgesetzt|annulliert)\b/i.test(status);
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;
const sourceUrl = (value: string, kind: 'spiel' | 'spieltag') => {
  const url = new URL(value, origin);
  if (url.origin !== origin || !url.pathname.startsWith('/' + kind + '/')) throw new Error('Unexpected match source');
  url.hash = '';
  return url.href;
};

export function parseClubPlan(html: string): MatchFixture[] {
  const $ = load(html);
  if (!$('.club-matchplan-table').length) throw new Error('Missing club match plan');
  if ($('[data-ajax-resource*="loadmore"]').length || $('.column-detail a[href*="/spiel/"]').length >= 100) throw new Error('Truncated club match plan');
  let date = '', time = '', category = '', competition = '';
  const fixtures = new Map<string, MatchFixture>();
  $('.club-matchplan-table tbody tr').each((_, el) => {
    const row = $(el);
    if (row.hasClass('row-headline')) {
      const parts = clean(row.text()).split('|').map((s) => s.trim());
      const match = parts[0].match(/(\d{2})\.(\d{2})\.(\d{4}) -\s*(.*?)\s*Uhr/);
      date = match ? match[3] + '-' + match[2] + '-' + match[1] : '';
      time = match?.[4] ?? '';
      category = parts[1] ?? ''; competition = parts.slice(2).join(' | ');
      return;
    }
    const href = row.find('.column-detail a[href*="/spiel/"]').first().attr('href');
    if (!href) return;
    if (!validDate(date) || (time && timeMinutes(time) === null) || !category) throw new Error('Invalid club fixture');
    const url = sourceUrl(href, 'spiel');
    const id = new URL(url).pathname.match(/\/spiel\/([A-Z0-9]{32})$/)?.[1];
    const teams = row.find('a.club-wrapper').map((_, a) => ({
      id: $(a).attr('href')?.match(/\/team-id\/([A-Z0-9]{32})(?:[/?#]|$)/)?.[1] ?? '',
      name: clean($(a).find('.club-name').text()),
    })).get();
    if (!id || teams.length !== 2 || teams.some((t) => !t.id || !t.name)) throw new Error('Incomplete fixture teams');
    const status = row.find('.column-score').text() + ' ' + row.find('[title]').map((_, e) => $(e).attr('title')).get().join(' ');
    fixtures.set(id, { id, date, time, category, competition, teams, url,
      cancelled: isCancelled(status),
      preliminary: $('.hint-pre-publish').length > 0 });
  });
  return [...fixtures.values()];
}

export function identifyPitch(venue: string): { bsv: boolean; pitch: Pitch | null } {
  const bsv = isBsvHomeTournament({ venues: [{ name: venue, matchUrl: '' }] });
  return { bsv, pitch: !bsv ? null : /\bhauptpl(?:atz|\.)?/i.test(venue) ? 'Hauptplatz' : /\bnebenpl(?:atz|\.)?/i.test(venue) ? 'Nebenplatz' : null };
}

export function parseMatchLocation(html: string, fixture: MatchFixture) {
  const $ = load(html);
  if (!$('.stage-header').length || $('.team-name').length !== 2) throw new Error('Missing match detail');
  const detailTeams = $('.team-name a[href*="/team-id/"]').map((_, a) => ({
    id: $(a).attr('href')?.match(/\/team-id\/([A-Z0-9]{32})(?:[/?#]|$)/)?.[1] ?? '', name: clean($(a).text()),
  })).get();
  if (detailTeams.length !== 2 || detailTeams.some((t, i) => t.id !== fixture.teams[i].id)) throw new Error('Match identity changed');
  const venue = clean($('.stage-header .location').first().text());
  const group = $('.stage-header a.competition[href*="/spieltag/"]').attr('href');
  const date = $('title').text().match(/(\d{2})\.(\d{2})\.(\d{4})/)?.slice(1);
  if (date && [date[2], date[1], date[0]].join('-') !== fixture.date) throw new Error('Match date changed during refresh');
  const reportedTime = $('input[name="subject"]').attr('value')?.match(/ am \d{2}\.\d{2}\.\d{4} (\d{2}:\d{2})/)?.[1];
  if (fixture.time && reportedTime && reportedTime !== fixture.time) throw new Error('Match time changed during refresh');
  return { venue, teams: detailTeams, groupUrl: group ? sourceUrl(group, 'spieltag') : '', groupTitle: clean($('.stage-header a.competition').text()) };
}

export async function loadMatchdaySchedule(now = new Date(), fetcher: typeof fetch = fetch, options: { days?: number } = {}): Promise<MatchdaySchedule> {
  const days = options.days ?? matchdaySettings.days;
  if (!Number.isInteger(days) || days < 1 || days > matchdaySettings.days) throw new Error('Invalid schedule range');
  const from = berlinNow(now).slice(0, 10), through = addDays(from, days - 1);
  const deadline = AbortSignal.timeout(180000);
  const cache = new Map<string, string>();
  const fonts = new Map<string, import('fontkitten').Font>();
  const decodeTime = async (value: string, fontId: string) => {
    if (timeMinutes(value) !== null) return value;
    if (!/^[a-z0-9]+$/i.test(fontId)) throw new Error('Missing tournament clock font');
    let font = fonts.get(fontId);
    if (!font) {
      const response = await fetcher(origin + '/export.fontface/-/format/woff/id/' + fontId + '/type/font', { signal: AbortSignal.any([deadline, AbortSignal.timeout(12000)]) });
      if (!response.ok) throw new Error('Tournament clock unavailable');
      const { create } = await import('fontkitten');
      const parsed = create(Buffer.from(await response.arrayBuffer()));
      if (parsed.isCollection) throw new Error('Unexpected clock font');
      font = parsed; fonts.set(fontId, font);
    }
    const digits: Record<string, string> = { zero:'0', one:'1', two:'2', three:'3', four:'4', five:'5', six:'6', seven:'7', eight:'8', nine:'9', colon:':' };
    const decoded = [...value].map((c) => digits[font!.glyphForCodePoint(c.codePointAt(0)!).name] ?? c).join('');
    if (timeMinutes(decoded) === null) throw new Error('Unreadable tournament start');
    return decoded;
  };
  const read = async (url: string) => {
    if (cache.has(url)) return cache.get(url)!;
    const response = await fetcher(url, { signal: AbortSignal.any([deadline, AbortSignal.timeout(12000)]) });
    if (!response.ok) throw new Error('FUSSBALL.DE returned ' + response.status);
    const html = await response.text(); cache.set(url, html); return html;
  };
  const fixtures = new Map<string, MatchFixture>();
  for (let offset = 0; offset < days; offset += 7) {
    const start = addDays(from, offset), end = addDays(from, Math.min(offset + 6, days - 1));
    for (const fixture of parseClubPlan(await read(clubPlanUrl + '/max/100/datum-von/' + start + '/datum-bis/' + end))) {
      if (fixture.date < start || fixture.date > end) throw new Error('Source ignored requested dates');
      fixtures.set(fixture.id, fixture);
    }
  }
  const bookings = new Map<string, PitchBooking>();
  let excludedAway = 0, cancelled = 0;
  for (const fixture of fixtures.values()) {
    if (fixture.cancelled) { cancelled++; continue; }
    const detail = parseMatchLocation(await read(fixture.url), fixture);
    const { bsv, pitch } = identifyPitch(detail.venue);
    if (detail.venue && !bsv) { excludedAway++; continue; }
    const tournament = fixture.category === 'E-Junioren' && /Bezirksturnier/.test(fixture.competition);
    let teams = detail.teams, kickoff = fixture.time, id = fixture.id, url = fixture.url;
    const notes: string[] = [];
    if (tournament) {
      if (!detail.groupUrl.includes('/spieldatum/' + fixture.date + '/staffel/')) throw new Error('Missing dated tournament link');
      // A four-team group is a single booking even when two BSV teams participate.
      id = detail.groupUrl + '|' + (pitch ?? detail.venue);
      if (bookings.has(id)) continue;
      url = detail.groupUrl;
      const html = await read(url), $ = load(html);
      teams = parseTournamentParticipants(html, fixture.teams.find((t) => matchdayTeams[t.id])?.id ?? fixture.teams[0].id).teams;
      if (teams.length !== 4) notes.push('Teilnehmerzahl weicht vom 4er-Spieltag ab.');
      // Read every group match, including pairings without BSV, for the true start.
      const groupRows = $('tr').has('.column-detail a[href*="/spiel/"]').toArray();
      if (!groupRows.length) throw new Error('Missing tournament fixtures');
      const starts: string[] = [];
      for (const row of groupRows) {
        const status = $(row).find('.column-score').text() + ' ' + $(row).find('[title]').map((_, e) => $(e).attr('title')).get().join(' ');
        if (isCancelled(status)) continue;
        const link = sourceUrl($(row).find('.column-detail a[href*="/spiel/"]').first().attr('href')!, 'spiel');
        const game = load(await read(link));
        if (!game('.stage-header').length) throw new Error('Missing tournament match details');
        const subject = game('input[name="subject"]').attr('value') ?? '';
        const stamp = subject.match(/ am (\d{2})\.(\d{2})\.(\d{4}) (\d{2}:\d{2})/);
        if (stamp && [stamp[3], stamp[2], stamp[1]].join('-') !== fixture.date) throw new Error('Tournament match date changed');
        const clock = $(row).find('.column-date [data-obfuscation]').last();
        const start = stamp?.[4] ?? await decodeTime(clean(clock.length ? clock.text() : $(row).find('.column-date').text()), clock.attr('data-obfuscation') ?? '');
        const location = clean(game('.stage-header .location').text());
        if (location !== detail.venue) notes.push('Spieltag auf mehreren Plätzen: Platzumfang prüfen.');
        starts.push(start);
      }
      if (!starts.length) throw new Error('No active tournament fixtures');
      kickoff = starts.sort()[0];
    }
    const rule = matchRule(fixture.category, teams, tournament);
    if (!rule) notes.push('Spielform und Dauer nicht eindeutig: vorsorglich ganzer Platz, 105 Minuten.');
    if (!detail.venue) notes.push('Austragungsort noch offen; BSV-Belegung nicht bestätigt.');
    else if (!pitch) notes.push('BSV-Spielort bestätigt; Haupt- oder Nebenplatz noch offen.');
    if (!kickoff) notes.push('Anstoßzeit noch offen.');
    if (/Pokal|Entscheidung/i.test(fixture.competition)) notes.push('Pokal/Entscheidung: mögliche Verlängerung und besondere Spielform zusätzlich prüfen.');
    const actualRule = rule ?? { halves: 2 as const, format: 'offen', duration: 105 };
    const labels = [...new Set(teams.map((t) => matchdayTeams[t.id]).filter(Boolean))];
    bookings.set(id, { id, date: fixture.date, kickoff, ...bookingTimes(kickoff, actualRule.duration), pitch,
      venue: detail.venue, label: (labels.join(' + ') || fixture.category) + (tournament ? ' · Spieltag' : ''),
      teams, category: fixture.category, format: actualRule.format, halves: actualRule.halves, url,
      preliminary: fixture.preliminary, notes: [...new Set(notes)] });
  }
  return { version: 1, checkedAt: now.toISOString(), from, through,
    bookings: [...bookings.values()].sort((a, b) => a.date.localeCompare(b.date) || a.kickoff.localeCompare(b.kickoff) || a.id.localeCompare(b.id)),
    excludedAway, cancelled };
}

export async function matchdayScheduleWithFallback(fallback: MatchdaySchedule, now = new Date(), fetcher: typeof fetch = fetch) {
  try { return { schedule: await loadMatchdaySchedule(now, fetcher), stale: false }; }
  catch (error) {
    console.warn('[matchday-plan] Gespeicherter Datenstand:', error instanceof Error ? error.message : 'Quelle nicht erreichbar');
    return { schedule: fallback, stale: true };
  }
}
