import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CALENDAR_SOURCES,
  loadClubCalendar,
  parseCalendar,
  YOUTH_EVENTS_CALENDAR_URL,
  MATCHDAYS_CALENDAR_URL,
  SUPPORTERS_CALENDAR_URL,
} from '../src/utils/calendar.ts';

import { matchesCalendarFilter } from '../src/utils/calendarFilters.ts';

const calendarPage = readFileSync(new URL('../src/components/CalendarOverview.astro', import.meta.url), 'utf8');
const calendarFilter = readFileSync(new URL('../src/components/CalendarSourceFilter.astro', import.meta.url), 'utf8');
const youthMenuSponsors = readFileSync(new URL('../src/components/YouthMenuSponsors.astro', import.meta.url), 'utf8');
const navigation = readFileSync(new URL('../src/data/navigation.ts', import.meta.url), 'utf8');
const homePage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

const icsEvent = ({ uid, start, end, title }) => [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:' + uid,
  'DTSTART:' + start,
  'DTEND:' + end,
  'SUMMARY:' + title,
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

test('calendar sources include the four actual club calendars', () => {
  assert.deepEqual(CALENDAR_SOURCES.map((source) => source.id), ['meetings', 'youth-events', 'spieltage', 'foerderverein']);
  assert.equal(CALENDAR_SOURCES[0].label, 'Meetings');
  assert.equal(CALENDAR_SOURCES[1].label, 'Jugendevents');
  assert.match(YOUTH_EVENTS_CALENDAR_URL, /44441b5aa88fb2f94d035df62770eda875140e0568d7d02c04ee14d7fa877520%40group\.calendar\.google\.com/);
  assert.equal(CALENDAR_SOURCES[2].label, 'Spieltage');
  assert.equal(CALENDAR_SOURCES[2].url, MATCHDAYS_CALENDAR_URL);
  assert.equal(CALENDAR_SOURCES[3].label, 'Förderverein');
  assert.equal(CALENDAR_SOURCES[3].url, SUPPORTERS_CALENDAR_URL);
  assert.equal(new Set(CALENDAR_SOURCES.map((source) => source.color)).size, 4);
});

test('events retain their calendar source and are merged chronologically', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => new Response(
    url === SUPPORTERS_CALENDAR_URL
      ? icsEvent({ uid: 'supporter', start: '20270222T090000Z', end: '20270222T150000Z', title: 'Flohmarkt' })
      : url === MATCHDAYS_CALENDAR_URL
      ? icsEvent({ uid: 'matchday', start: '20270221T090000Z', end: '20270221T100000Z', title: 'E1 – Heimspieltag' })
      : url === YOUTH_EVENTS_CALENDAR_URL
      ? icsEvent({ uid: 'youth', start: '20270220T090000Z', end: '20270220T120000Z', title: 'Jugendevent' })
      : icsEvent({ uid: 'meeting', start: '20270305T180000Z', end: '20270305T200000Z', title: 'Vorstandssitzung' }),
    { status: 200 },
  );

  try {
    const result = await loadClubCalendar();
    assert.equal(result.available, true);
    assert.equal(result.complete, true);
    assert.deepEqual(result.events.map((event) => event.title), ['Jugendevent', 'E1 – Heimspieltag', 'Flohmarkt', 'Vorstandssitzung']);
    assert.deepEqual(result.events.map((event) => event.source.id), ['youth-events', 'spieltage', 'foerderverein', 'meetings']);
    assert.deepEqual(result.sources.map((source) => source.eventCount), [1, 1, 1, 1]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('calendar parsing applies the selected source metadata', () => {
  const event = parseCalendar(
    icsEvent({ uid: 'source-check', start: '20270401T100000Z', end: '20270401T110000Z', title: 'Quellentest' }),
    CALENDAR_SOURCES[1],
  )[0];
  assert.equal(event.source.label, 'Jugendevents');
  assert.match(event.id, /^youth-events:/);
});

test('midnight-to-midnight Google events are displayed as whole-day dates', () => {
  const event = parseCalendar(
    icsEvent({ uid: 'whole-day', start: '20270219T230000Z', end: '20270220T230000Z', title: 'Ganzer Turniertag' }),
    CALENDAR_SOURCES[1],
  )[0];
  assert.equal(event.allDay, true);
  assert.match(event.googleUrl, /20270219T230000Z%2F20270220T230000Z/);
});

test('calendar page filters and colors events by source', () => {
  assert.match(calendarPage, /<CalendarSourceFilter sources=\{sources\} total=\{events\.length\}/);
  assert.match(calendarPage, /data-calendar-source=\{event\.source\.id\}/);
  assert.match(calendarPage, /--source-color:\$\{event\.source\.color\}/);
  assert.match(calendarPage, /data-calendar-month/);
  assert.match(calendarFilter, /data-calendar-filter-button="all"/);
  assert.doesNotMatch(calendarFilter, /data-calendar-filter-button="jugend"/);
  assert.match(calendarFilter, /matchesCalendarFilter\(event\.dataset\.calendarSource/);
  assert.match(calendarFilter, /group\.hidden = !/);
  assert.match(calendarFilter, /URLSearchParams\(window\.location\.search\)\.get\('kalender'\)/);
  assert.match(calendarFilter, /data-calendar-filter-value=\{source\.id === 'youth-events' \? 'jugendevents'/);
  assert.match(homePage, /data-calendar-source=\{event\.source\.id\}/);
});

test('the youth mega menu promotes the next youth event and its filtered overview', () => {
  assert.match(youthMenuSponsors, /loadClubCalendarCached/);
  assert.match(youthMenuSponsors, /events\.find\(\(event\) => isYouthCalendarSource\(event\.source\.id\)\)/);
  assert.match(youthMenuSponsors, /\/jugend\/termine/);
  assert.match(youthMenuSponsors, /Nächster Jugendtermin/);
  assert.match(youthMenuSponsors, /Alle Jugendtermine/);
  assert.match(navigation, /title: 'Jugendabteilung'[\s\S]*?\{ label: 'Termine', href: '\/jugend\/termine' \}/);
});

test('youth overview combines youth events and matchdays while source filters remain separate', () => {
  for (const [filter, expected] of [
    ['all', ['meetings', 'youth-events', 'spieltage', 'foerderverein']],
    ['jugend', ['youth-events', 'spieltage']],
    ['youth-events', ['youth-events']],
    ['spieltage', ['spieltage']],
    ['meetings', ['meetings']],
    ['foerderverein', ['foerderverein']],
  ]) {
    assert.deepEqual(CALENDAR_SOURCES.filter((source) => matchesCalendarFilter(source.id, filter)).map((source) => source.id), expected);
  }
});

test('an unavailable matchday feed preserves other calendars and reports incomplete data', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => url === MATCHDAYS_CALENDAR_URL
    ? new Response('', { status: 404 })
    : new Response(icsEvent({ uid: 'available', start: '20270305T180000Z', end: '20270305T200000Z', title: 'Verfügbarer Termin' }));
  try {
    const result = await loadClubCalendar();
    assert.equal(result.available, true);
    assert.equal(result.complete, false);
    assert.equal(result.events.length, 3);
    assert.equal(result.sources.find((source) => source.id === 'spieltage').available, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('matchday descriptions end after the planned duration, including Google ICS conference footers', () => {
  const source = CALENDAR_SOURCES.find((source) => source.id === 'spieltage');
  for (const description of [
    'E-Junioren · Teilnehmer: BSV\\n\\nGeplante Dauer: 1 Stunde. Änderungen vorbehalten. Quelle: https://example.com Stand: 2026-09-17\\nÜber Google Meet teilnehmen: https://meet.google.com/example',
    '<p>F-Junioren · Teilnehmer: BSV &amp; Gäste</p><p>Geplante Dauer: 2 Stunden.</p>\\nÜber Google Meet teilnehmen: https://meet.google.com/example',
  ]) {
    const ics = icsEvent({ uid: 'description', start: '20271010T100000Z', end: '20271010T110000Z', title: 'Heimspieltag' })
      .replace('END:VEVENT', `DESCRIPTION:${description}\r\nEND:VEVENT`);
    const event = parseCalendar(ics, source)[0];
    assert.match(event.description, /Teilnehmer: BSV/);
    assert.match(event.description, /Geplante Dauer: [12] Stunden?\.<\/p>$/);
    assert.doesNotMatch(event.description, /Quelle|Stand:|Änderungen|Google Meet|https:/);
    assert.doesNotMatch(new URL(event.googleUrl).searchParams.get('details'), /Google Meet|https:/);
    assert.match(parseCalendar(ics, CALENDAR_SOURCES[0])[0].description, /Google Meet/);
  }
});
