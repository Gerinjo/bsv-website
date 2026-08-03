export const CLUB_CALENDAR_URL = 'https://calendar.google.com/calendar/ical/bsvnordsternradolfzell%40gmail.com/public/basic.ics';

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  allDay: boolean;
  googleUrl: string;
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

export const parseCalendar = (ics: string): CalendarEvent[] => {
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
      id: raw.UID ?? `${raw.DTSTART}-${raw.SUMMARY}`,
      title: unescapeText(raw.SUMMARY),
      description: unescapeText(raw.DESCRIPTION),
      location: unescapeText(raw.LOCATION),
      start: parsedStart.date,
      end: parsedEnd.date,
      allDay: parsedStart.allDay,
    };
    return [{ ...base, googleUrl: createGoogleUrl(base) }];
  }).sort((a, b) => a.start.getTime() - b.start.getTime());
};

export const loadClubCalendar = async () => {
  try {
    const response = await fetch(CLUB_CALENDAR_URL, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Kalender antwortete mit HTTP ${response.status}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { available: true, events: parseCalendar(await response.text()).filter((event) => event.end >= today) };
  } catch (error) {
    console.warn('Google-Kalender konnte nicht geladen werden:', error);
    return { available: false, events: [] as CalendarEvent[] };
  }
};
