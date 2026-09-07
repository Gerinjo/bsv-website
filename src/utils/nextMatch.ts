export type NextMatch = {
  home: string;
  away: string;
  homeTeamId?: string;
  awayTeamId?: string;
  dateTime: string;
  dateLabel: string;
  time: string;
  url: string;
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
    time: `${hour}:${minute}`, url: `https://www.fussball.de/spiel/-/spiel/${id}`,
  };
}

export function berlinNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (key: string) => parts.find((part) => part.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export async function loadNextMatches(widgetId: string, fetcher: typeof fetch = fetch): Promise<NextMatch[]> {
  const read = async (url: string) => {
    const response = await fetcher(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`FUSSBALL.DE returned ${response.status}`);
    return response.text();
  };
  try {
    const html = await read(`https://next.fussball.de/widget/team-matches/${widgetId}`);
    const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
    if (!json) throw new Error('Missing widget data');
    const { nextMatches: upcoming, obfuscatedFont } = JSON.parse(json).props.pageProps;
    if (!Array.isArray(upcoming)) throw new Error('Missing upcoming matches');
    const candidates = upcoming.filter((match) => match.status === 'scheduled' && !match.notAllocated && !match.prePublished && /^[A-Z0-9]{32}$/.test(match.id)).slice(0, 3);
    // Some match pages omit the result-report form. Read the widget's kickoff
    // using its supplied font so the result remains plain, accessible text.
    let fontPromise: Promise<import('fontkitten').Font> | undefined;
    const readWidgetTime = async (value: string) => {
      if (/^\d{2}:\d{2}$/.test(value)) return value;
      if (!/^[a-z0-9]+$/i.test(obfuscatedFont ?? '')) throw new Error('Missing widget font');
      fontPromise ??= (async () => {
        const response = await fetcher(`https://www.fussball.de/export.fontface/-/format/woff/id/${obfuscatedFont}/type/font`, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('Widget font unavailable');
        const { create } = await import('fontkitten');
        const font = create(Buffer.from(await response.arrayBuffer()));
        if (font.isCollection) throw new Error('Unexpected widget font collection');
        return font;
      })();
      const font = await fontPromise;
      const digits: Record<string, string> = { zero:'0', one:'1', two:'2', three:'3', four:'4', five:'5', six:'6', seven:'7', eight:'8', nine:'9', colon:':' };
      const time = [...value].map((character) => digits[font.glyphForCodePoint(character.codePointAt(0)!).name] ?? character).join('');
      if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('Unreadable widget kickoff');
      return time;
    };
    const matches = await Promise.all(candidates.map(async ({ id, kickoff, homeTeam, guestTeam }) => {
      const page = await read(`https://www.fussball.de/spiel/-/spiel/${id}`);
      let match: NextMatch;
      try { match = parseMatchPage(page, id); }
      catch { match = parseMatchPage(page, id, await readWidgetTime(kickoff?.time ?? '')); }
      return { ...match, homeTeamId: homeTeam?.teamPermanentId, awayTeamId: guestTeam?.teamPermanentId };
    }));
    return matches.filter((match) => match.dateTime > berlinNow()).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  } catch (error) {
    console.warn('[next-match] Spielvorschau nicht verfügbar:', error instanceof Error ? error.message : error);
    return [];
  }
}
