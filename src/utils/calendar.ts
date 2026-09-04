export const CLUB_CALENDAR_URL = 'https://calendar.google.com/calendar/ical/bsvnordsternradolfzell%40gmail.com/public/basic.ics';
export const YOUTH_EVENTS_CALENDAR_URL = 'https://calendar.google.com/calendar/ical/44441b5aa88fb2f94d035df62770eda875140e0568d7d02c04ee14d7fa877520%40group.calendar.google.com/public/basic.ics';

export const CALENDAR_SOURCES = [
  {
    id: 'meetings',
    label: 'Meetings & Veranstaltungen',
    shortLabel: 'Meetings',
    url: CLUB_CALENDAR_URL,
    color: '#164f32',
    softColor: '#f4d638',
  },
  {
    id: 'youth-events',
    label: 'Jugendevents',
    shortLabel: 'Jugendevents',
    url: YOUTH_EVENTS_CALENDAR_URL,
    color: '#8e3e78',
    softColor: '#f3d8eb',
  },
] as const;

export type CalendarSource = (typeof CALENDAR_SOURCES)[number];

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  allDay: boolean;
  googleUrl: string;
  source: CalendarSource;
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const sanitizeCalendarHtml = (value: string) => {
  const withoutUnsafeBlocks = value.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  return withoutUnsafeBlocks
    .split(/(<[^>]+>)/g)
    .map((part) => {
      const tag = part.match(/^<\s*(\/?)\s*(p|ul|ol|li|strong|b|em|i|br)\b[^>]*>$/i);
      if (!tag) return escapeHtml(part);
      const [, closing, name] = tag;
      const normalized = name.toLowerCase();
      if (normalized === 'br') return '<br>';
      return `<${closing ? '/' : ''}${normalized}>`;
    })
    .join('');
};

type RawEvent = Record<string, string>;

const unescapeText = (value = '') => value
  .replace(/\\n/gi, '\n')
  .replace(/\\,/g, ',')
  .replace(/\\;/g, ';')
  .replace(/\\\\/g, '\\')
  .trim();

const parseIcalDate = (value: string) => {
  const normalized = value.trim();
  const allDay = /^\d{8}$/.test(normalized);
  const match = normalized.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!match) return null;
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  return {
    allDay,
    date: new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second)),
  };
};

const localTimeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Europe/Berlin',
});

const isLocalMidnight = (date: Date) => localTimeFormat.format(date) === '00:00:00';

const googleDate = (date: Date, allDay: boolean) => allDay
  ? date.toISOString().slice(0, 10).replaceAll('-', '')
  : date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const createGoogleUrl = (event: Omit<CalendarEvent, 'googleUrl'>) => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${googleDate(event.start, event.allDay)}/${googleDate(event.end, event.allDay)}`,
  });
  if (event.description) params.set('details', event.description);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
};

export const parseCalendar = (ics: string, source: CalendarSource = CALENDAR_SOURCES[0]): CalendarEvent[] => {
  const lines = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const rawEvents: RawEvent[] = [];
  let current: RawEvent | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { current = {}; continue; }
    if (line === 'END:VEVENT') {
      if (current) rawEvents.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const name = line.slice(0, separator).split(';', 1)[0];
    if (!(name in current)) current[name] = line.slice(separator + 1);
  }

  return rawEvents.flatMap((raw) => {
    const parsedStart = parseIcalDate(raw.DTSTART ?? '');
    if (!parsedStart || !raw.SUMMARY || raw.STATUS === 'CANCELLED') return [];
    const parsedEnd = parseIcalDate(raw.DTEND ?? '') ?? {
      allDay: parsedStart.allDay,
      date: new Date(parsedStart.date.getTime() + (parsedStart.allDay ? 86_400_000 : 3_600_000)),
    };
    const base = {
      id: `${source.id}:${raw.UID ?? `${raw.DTSTART}-${raw.SUMMARY}`}`,
      title: unescapeText(raw.SUMMARY),
      description: unescapeText(raw.DESCRIPTION),
      location: unescapeText(raw.LOCATION),
      start: parsedStart.date,
      end: parsedEnd.date,
      allDay: parsedStart.allDay,
      source,
    };
    const googleUrl = createGoogleUrl(base);
    const allDay = parsedStart.allDay || (
      parsedEnd.date > parsedStart.date
      && isLocalMidnight(parsedStart.date)
      && isLocalMidnight(parsedEnd.date)
    );
    return [{ ...base, allDay, googleUrl }];
  }).sort((a, b) => a.start.getTime() - b.start.getTime());
};

export const loadClubCalendar = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sourceResults = await Promise.all(CALENDAR_SOURCES.map(async (source) => {
    try {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Kalender antwortete mit HTTP ${response.status}`);
      const events = parseCalendar(await response.text(), source).filter((event) => event.end >= today);
      return { source, available: true, events };
    } catch (error) {
      console.warn(`Google-Kalender „${source.label}“ konnte nicht geladen werden:`, error);
      return { source, available: false, events: [] as CalendarEvent[] };
    }
  }));

  const events = sourceResults
    .flatMap((result) => result.events)
    .sort((left, right) => left.start.getTime() - right.start.getTime());

  return {
    available: sourceResults.some((result) => result.available),
    complete: sourceResults.every((result) => result.available),
    events,
    sources: sourceResults.map(({ source, available, events: sourceEvents }) => ({
      ...source,
      available,
      eventCount: sourceEvents.length,
    })),
  };
};
