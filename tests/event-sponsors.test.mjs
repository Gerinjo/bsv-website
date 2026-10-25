import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio';
import { createYouthSponsorLoader, selectYouthSponsors, buildYouthSponsorFooter } from '../supabase/functions/_shared/youth-sponsors.mjs';
import { buildEventConfirmation } from '../supabase/functions/_shared/event-confirmation.mjs';
import { GIRLS_CUP_EVENT } from '../supabase/functions/_shared/girls-cup-event.mjs';
import { eventSponsors } from './fixtures/event-sponsors.mjs';

const more = Array.from({ length: 8 }, (_, index) => ({ ...eventSponsors[0], id: `partner-${index}`, name: `Partner ${index}` }));

test('each selection contains four distinct youth sponsors and excludes unsafe or unapproved entries', () => {
  const records = [
    ...more, more[0], { ...eventSponsors[0], id: 'adult', youth: false },
    { ...eventSponsors[0], id: 'unspecified', youth: undefined },
    { ...eventSponsors[0], id: 'script', website: 'javascript:alert(1)' },
    { ...eventSponsors[0], id: 'external-logo', logo: 'https://other.example.org/tracker.png' },
    { ...eventSponsors[0], id: 'wrong-path', logo: 'https://bsvnordstern.de/api/tracker' },
    { ...eventSponsors[0], id: 'oversized', width: 999 },
  ];
  const selection = selectYouthSponsors(records, () => 0);
  assert.equal(selection.length, 4);
  assert.equal(new Set(selection.map(item => item.id)).size, 4);
  assert.ok(selection.every(item => item.id.startsWith('partner-')));
  assert.notDeepEqual(selection.map(item => item.id), more.slice(0, 4).map(item => item.id));
  assert.notDeepEqual(selectYouthSponsors(records, () => 0), selectYouthSponsors(records, () => 0.99));
});

test('the loader caches the pool but draws again for each mail and refreshes after one hour', async () => {
  let requests = 0, clock = 0, draw = 0;
  const fetcher = async url => {
    assert.equal(url, 'https://bsvnordstern.de/mitgliedschaft-sponsoren.json');
    requests++;
    return Response.json({ version: 1, sponsors: requests === 1 ? more : eventSponsors });
  };
  const sponsors = createYouthSponsorLoader({ fetcher, clock: () => clock, random: () => draw });
  const first = await sponsors();
  draw = 0.99;
  assert.notDeepEqual(await sponsors(), first);
  assert.equal(requests, 1);
  clock = 60 * 60 * 1000;
  assert.deepEqual(new Set((await sponsors()).map(item => item.id)), new Set(eventSponsors.map(item => item.id)));
  assert.equal(requests, 2);
});

test('feed failures use the recent approved pool; missing data leaves a valid thank-you without blocking the mail', async () => {
  let fail = false, clock = 0;
  const sponsors = createYouthSponsorLoader({
    fetcher: async () => { if (fail) throw new Error('offline'); return Response.json({ version: 1, sponsors: eventSponsors }); },
    clock: () => clock,
  });
  assert.equal((await sponsors()).length, 4);
  fail = true; clock = 2 * 60 * 60 * 1000;
  assert.equal((await sponsors()).length, 4);
  clock = 25 * 60 * 60 * 1000;
  assert.deepEqual(await sponsors(), []);
  for (const fetcher of [async () => new Response('', { status: 503 }), async () => Response.json({ sponsors: eventSponsors })]) {
    assert.deepEqual(await createYouthSponsorLoader({ fetcher })(), []);
  }
  const empty = buildYouthSponsorFooter([]);
  assert.match(empty.html, /Danke an unsere Jugendsponsoren/);
  assert.match(empty.text, /https:\/\/bsvnordstern.de\/werbepartner/);
});

test('the event mail places the four linked logos below the tournaments and uses the same partners in text', () => {
  const sponsors = [{ ...eventSponsors[0], name: 'Sponsor <script> & Co.' }, ...eventSponsors.slice(1)];
  const mail = buildEventConfirmation({
    event: { ...GIRLS_CUP_EVENT, url: 'https://bsvnordstern.de/erlebnis/bodensee-indoor-girls-cup/' },
    firstName: 'Mara', lastName: 'Muster', email: 'test@example.org', phone: '07732 123456',
    details: [], reference: 'preview', sponsors, now: new Date('2026-10-25T12:00:00Z'),
  });
  const $ = load(mail.html);
  const footer = $('h2').filter((_, element) => $(element).text() === 'Unsere Jugendsponsoren').parent();
  assert.equal(footer.find('img').length, 4);
  for (const sponsor of sponsors) {
    assert.equal(footer.find(`a[href="${sponsor.website}"] img`).attr('src'), sponsor.logo);
    assert.ok(mail.text.includes(`${sponsor.name}: ${sponsor.website}`));
  }
  assert.ok(mail.html.indexOf('Unsere Jugendsponsoren') > mail.html.indexOf('Unsere weiteren Turniere'));
  assert.equal(footer.find('script').length, 0);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.html, /&lt;script&gt;/);
});
