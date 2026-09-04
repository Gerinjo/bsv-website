import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CALENDAR_SOURCES,
  loadClubCalendar,
  parseCalendar,
  YOUTH_EVENTS_CALENDAR_URL,
} from '../src/utils/calendar.ts';

const calendarPage = readFileSync(new URL('../src/pages/verein/termine.astro', import.meta.url), 'utf8');
const calendarFilter = readFileSync(new URL('../src/components/CalendarSourceFilter.astro', import.meta.url), 'utf8');
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

test('calendar sources include meetings and the public youth event calendar', () => {
  assert.deepEqual(CALENDAR_SOURCES.map((source) => source.id), ['meetings', 'youth-events']);
  assert.equal(CALENDAR_SOURCES[0].label, 'Meetings & Veranstaltungen');
  assert.equal(CALENDAR_SOURCES[1].label, 'Jugendevents');
  assert.match(YOUTH_EVENTS_CALENDAR_URL, /44441b5aa88fb2f94d035df62770eda875140e0568d7d02c04ee14d7fa877520%40group\.calendar\.google\.com/);
  assert.notEqual(CALENDAR_SOURCES[0].color, CALENDAR_SOURCES[1].color);
});

test('events retain their calendar source and are merged chronologically', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => new Response(
    String(url).includes('group.calendar.google.com')
      ? icsEvent({ uid: 'youth', start: '20270220T090000Z', end: '20270220T120000Z', title: 'Jugendevent' })
      : icsEvent({ uid: 'meeting', start: '20270305T180000Z', end: '20270305T200000Z', title: 'Vorstandssitzung' }),
    { status: 200 },
  );

  try {
    const result = await loadClubCalendar();
    assert.equal(result.available, true);
    assert.equal(result.complete, true);
    assert.deepEqual(result.events.map((event) => event.title), ['Jugendevent', 'Vorstandssitzung']);
    assert.deepEqual(result.events.map((event) => event.source.id), ['youth-events', 'meetings']);
    assert.deepEqual(result.sources.map((source) => source.eventCount), [1, 1]);
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
  assert.match(calendarFilter, /event\.dataset\.calendarSource !== sourceId/);
  assert.match(calendarFilter, /group\.hidden = !/);
  assert.match(homePage, /data-calendar-source=\{event\.source\.id\}/);
});
