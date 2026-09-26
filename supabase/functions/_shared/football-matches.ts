export type NextMatch = {
  home: string;
  away: string;
  homeTeamId?: string;
  awayTeamId?: string;
  dateTime: string;
  dateLabel: string;
  time: string;
  competition?: string;
  url: string;
  status?: 'scheduled' | 'live' | 'finished' | 'acknowledged' | 'cancelled';
  homeScore?: number;
  awayScore?: number;
  observedAt?: string;
};

const decodeText = (text: string) => text
  .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();

// The widget exposes IDs and statuses; the match page supplies readable team
// names and the kickoff in its result-report subject (widget text uses a font cipher).
export function parseMatchPage(html: string, id: string, widgetTime?: string): NextMatch {
  if (!/^[A-Z0-9]{32}$/.test(id)) throw new Error('Invalid match ID');
  const teams = [...html.matchAll(/<div\s+class="team-name">\s*<a\b[^>]*>([^<]+)<\/a>/g)]
    .map((match) => decodeText(match[1]));
  const competitionHtml = html.match(/<a\b[^>]*\bclass="competition"[^>]*>([\s\S]*?)<\/a>/)?.[1];
  const competition = competitionHtml ? decodeText(competitionHtml.replace(/<[^>]*>/g, '')) : undefined;
  const dateInTitle = html.match(/<title>[^<]* - (\d{2}\.\d{2}\.\d{4})<\/title>/)?.[1];
  const kickoff = html.match(/name="subject"[^>]*\bvalue="[^"]* am (\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})"/)
    ?? (dateInTitle && widgetTime ? `${dateInTitle} ${widgetTime}`.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/) : null);
  if (teams.length !== 2 || teams.some((name) => !name) || !kickoff) throw new Error('Incomplete match details');
  const [, day, month, year, hour, minute] = kickoff;
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.getUTCDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59) throw new Error('Invalid kickoff');
  return {
    home: teams[0], away: teams[1], dateTime: `${year}-${month}-${day}T${hour}:${minute}`,
    dateLabel: new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }).format(date),
    time: `${hour}:${minute}`, competition, url: `https://www.fussball.de/spiel/-/spiel/${id}`,
  };
}

export function berlinNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (key: string) => parts.find((part) => part.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

// Friday through Sunday stays visible until Monday, 06:00 in Berlin.
// Work with calendar dates so the change also holds across DST weekends.
export function homepageMatchWindow(now = new Date()) {
  const localNow = berlinNow(now);
  const today = localNow.slice(0, 10);
  const date = new Date(`${today}T12:00:00Z`);
  const weekday = date.getUTCDay();
  const daysSinceFriday = weekday === 1 && localNow.slice(11) < '06:00' ? 3
    : weekday === 0 ? 2 : weekday >= 5 ? weekday - 5 : undefined;
  if (daysSinceFriday === undefined) return { startDate: today, endDate: today };
  date.setUTCDate(date.getUTCDate() - daysSinceFriday);
  const startDate = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 2);
  return { startDate, endDate: date.toISOString().slice(0, 10) };
}

export async function loadNextMatches(widgetId: string, fetcher: typeof fetch = fetch, options: { now?: Date; throwOnError?: boolean } = {}): Promise<NextMatch[]> {
  const now = options.now ?? new Date();
  const { startDate } = homepageMatchWindow(now);
  const read = async (url: string) => {
    const response = await fetcher(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`FUSSBALL.DE returned ${response.status}`);
    return response.text();
  };
  try {
    const html = await read(`https://next.fussball.de/widget/team-matches/${widgetId}`);
    const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
    if (!json) throw new Error('Missing widget data');
    const { nextMatches: upcoming, previousMatches: previous = [], obfuscatedFont, generatedAt } = JSON.parse(json).props.pageProps;
    if (!Array.isArray(upcoming)) throw new Error('Missing upcoming matches');
    const candidates = [...new Map([...upcoming, ...previous].filter((match) =>
      ['scheduled', 'live', 'finished', 'acknowledged', 'cancelled'].includes(match.status)
      && !match.notAllocated && !match.prePublished && /^[A-Z0-9]{32}$/.test(match.id)
    ).map((match) => [match.id, match])).values()];
    // Some match pages omit the result-report form. Read the widget's kickoff
    // using its supplied font so the result remains plain, accessible text.
    let fontPromise: Promise<import('fontkitten').Font> | undefined;
    const readWidgetNumber = async (value: string) => {
      if (/^[\d.:\s-]+$/.test(value)) return value;
      if (!/^[a-z0-9]+$/i.test(obfuscatedFont ?? '')) throw new Error('Missing widget font');
      fontPromise ??= (async () => {
        const response = await fetcher(`https://www.fussball.de/export.fontface/-/format/woff/id/${obfuscatedFont}/type/font`, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('Widget font unavailable');
        const [{ create }, { Buffer }] = await Promise.all([import('fontkitten'), import('node:buffer')]);
        const font = create(Buffer.from(await response.arrayBuffer()));
        if (font.isCollection) throw new Error('Unexpected widget font collection');
        return font;
      })();
      const font = await fontPromise;
      const digits: Record<string, string> = { zero:'0', one:'1', two:'2', three:'3', four:'4', five:'5', six:'6', seven:'7', eight:'8', nine:'9', colon:':', period:'.', hyphen:'-' };
      return [...value].map((character) => digits[font.glyphForCodePoint(character.codePointAt(0)!).name] ?? character).join('');
    };
    const results = await Promise.allSettled(candidates.map(async ({ id, kickoff, homeTeam, guestTeam, status, live, result }) => {
      // Keep weekend results for new visitors and builds, not just open browsers.
      if (kickoff?.date) {
        const date = (await readWidgetNumber(kickoff.date)).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (date && `${date[3]}-${date[2]}-${date[1]}` < startDate) return null;
      } else if (status === 'cancelled') return null;
      const page = await read(`https://www.fussball.de/spiel/-/spiel/${id}`);
      let match: NextMatch;
      try { match = parseMatchPage(page, id); }
      catch { match = parseMatchPage(page, id, await readWidgetNumber(kickoff?.time ?? '')); }
      const matchDay = match.dateTime.slice(0, 10);
      if (matchDay < startDate) return null;
      const score = async (value: unknown) => {
        if (value === null || value === undefined) return undefined;
        const decoded = (await readWidgetNumber(String(value))).trim();
        return /^\d{1,2}$/.test(decoded) ? Number(decoded) : undefined;
      };
      let homeScore: number | undefined;
      let awayScore: number | undefined;
      // An unreadable result must not hide an otherwise valid match.
      try { [homeScore, awayScore] = await Promise.all([score(result?.homeResult), score(result?.guestResult)]); }
      catch { /* Keep the fixture; never invent a score. */ }
      return { ...match, homeTeamId: homeTeam?.teamPermanentId, awayTeamId: guestTeam?.teamPermanentId,
        status: ['cancelled', 'finished', 'acknowledged'].includes(status) ? status : live ? 'live' : status,
        homeScore, awayScore,
        observedAt: typeof generatedAt === 'string' && Number.isFinite(Date.parse(generatedAt)) ? generatedAt : now.toISOString(),
      } as NextMatch;
    }));
    if (results.some((result) => result.status === 'rejected') && !results.some((result) => result.status === 'fulfilled' && result.value)) {
      throw new Error('Match details unavailable');
    }
    return results.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : [])
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime)).slice(0, 4);
  } catch (error) {
    if (options.throwOnError) throw error;
    console.warn('[next-match] Spielvorschau nicht verfügbar:', error instanceof Error ? error.message : error);
    return [];
  }
}
