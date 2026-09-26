import { load } from 'cheerio';
import { berlinNow, parseMatchPage } from '../_shared/football-matches.ts';
import { clubPlanUrl, loadMatchdaySchedule, parseClubPlan, parseMatchLocation } from '../../../src/utils/loadMatchdayPlan.ts';
import { applyMatchdayAdjustments } from '../../../src/utils/matchdayAdjustments.ts';
import { manualTournamentBookings } from '../../../src/utils/manualTournamentPlan.ts';
import { gTournamentSchedule } from '../../../src/data/gTournamentSchedule.ts';
import { fTournamentSchedules } from '../../../src/data/fTournamentSchedules.ts';
import { addDays, applyChangeovers, type PitchBooking } from '../../../src/utils/matchdayPlan.ts';
import { refereeCandidates, type RefereeCheck } from './rules.ts';

// Only the match's labelled row counts. Navigation links mention referees too.
export function parseRefereeStatus(html: string): RefereeCheck['state'] {
  const $ = load(html);
  if (!$('.stage-header').length || $('.team-name').length !== 2) return 'unknown';
  const rows = $('.stage-meta-left li').filter((_, el) => /^Schiedsrichter(?:\/in|in)?\s*:$/.test($(el).children().first().text().trim()));
  if (rows.length !== 1 || rows.first().children().length < 2) return 'unknown';
  const row = rows.first();
  if (row.find('a[href*="/schiedsrichterprofil/"]').length) return 'assigned';
  const details = row.clone();
  details.children().first().remove();
  const value = details.text().replace(/\u200b/g, '').trim();
  if (!value || /^(?:[-–—]|nicht angesetzt|nicht eingeteilt|noch nicht angesetzt|offen|kein Schiedsrichter)$/i.test(value)) return 'missing';
  if (/nicht (?:veröffentlicht|verfügbar)|Datenschutz|keine Angaben/i.test(value)) return 'unknown';
  return 'assigned'; // Includes font-obfuscated names; decoding is unnecessary.
}

export async function loadFootballAlertSources(now = new Date(), fetcher: typeof fetch = fetch) {
  const cache = new Map<string, Promise<Response>>();
  const deadline = AbortSignal.timeout(90_000);
  const cachedFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (!cache.has(url)) cache.set(url, fetcher(input, { ...init, signal: AbortSignal.any([deadline, AbortSignal.timeout(12_000)]) }));
    return (await cache.get(url)!).clone();
  };
  const read = async (url: string) => {
    const response = await cachedFetch(url);
    if (!response.ok) throw new Error('Football source unavailable');
    return response.text();
  };
  const issues: string[] = [];
  const loadBookings = async (): Promise<PitchBooking[]> => {
    const from = berlinNow(now).slice(0, 10);
    const bookings = manualTournamentBookings([gTournamentSchedule, ...fTournamentSchedules], from, addDays(from, 13));
    try {
      const schedule = await loadMatchdaySchedule(now, cachedFetch, { days: 14 });
      bookings.push(...schedule.bookings);
    } catch { issues.push('training_schedule_unavailable'); }
    // Apply confirmed club overrides, never automatic relocation suggestions.
    return applyChangeovers(applyMatchdayAdjustments(bookings));
  };
  const loadReferees = async (): Promise<RefereeCheck[]> => {
    const date = addDays(berlinNow(now).slice(0, 10), 2);
    try {
      const fixtures = parseClubPlan(await read(`${clubPlanUrl}/max/100/datum-von/${date}/datum-bis/${date}`));
      if (fixtures.some((fixture) => fixture.date !== date)) throw new Error('Source ignored date');
      const checks: RefereeCheck[] = [];
      // Sequential requests keep the source load bounded (only D–A home fixtures).
      for (const fixture of refereeCandidates(fixtures, now)) {
        try {
          const html = await read(fixture.url);
          parseMatchLocation(html, fixture);
          if (fixture.time && parseMatchPage(html, fixture.id, fixture.time).dateTime !== `${fixture.date}T${fixture.time}`) throw new Error('Kickoff changed');
          const $ = load(html);
          if (/Absetzung|Ausfall|abgesagt|abgesetzt|annulliert|Spielabbruch/i.test($('.stage-header .result').text())) continue;
          const state = parseRefereeStatus(html);
          if (state === 'unknown') issues.push('referee_unknown:' + fixture.id);
          checks.push({ fixture, state });
        } catch { issues.push('referee_unavailable:' + fixture.id); }
      }
      return checks;
    } catch { issues.push('referee_schedule_unavailable'); return []; }
  };
  const [bookings, referees] = await Promise.all([loadBookings(), loadReferees()]);
  return { bookings, referees, issues };
}
