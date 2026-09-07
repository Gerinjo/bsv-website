import assert from 'node:assert/strict';
import test from 'node:test';
import { berlinNow, loadNextMatches, parseMatchPage } from '../src/utils/nextMatch.ts';

const id = '031H21VMEG000000VS5489BTVVG7L386';
const page = (date = '12.09.2099 16:00') => `<div class="team-name"><a href="/home">BSV Nordstern Radolfzell</a></div>
<div class="team-name"><a href="/away">SG Bodman-Ludw./&#8203;Espas. &amp; Wahlw. 2</a></div>
<input name="subject" type="text" value="Falsches Ergebnis für das Spiel BSV-SG am ${date}">`;

test('reads teams, German kickoff and a direct match link', () => {
  const match = parseMatchPage(page(), id);
  assert.equal(match.home, 'BSV Nordstern Radolfzell');
  assert.equal(match.away, 'SG Bodman-Ludw./Espas. & Wahlw. 2');
  assert.equal(match.dateTime, '2099-09-12T16:00');
  assert.equal(match.time, '16:00');
  assert.equal(match.url, `https://www.fussball.de/spiel/-/spiel/${id}`);
});

test('rejects incomplete details and impossible kickoffs', () => {
  assert.throws(() => parseMatchPage('<html>Unavailable</html>', id));
  assert.throws(() => parseMatchPage(page('31.02.2099 16:00'), id));
  assert.throws(() => parseMatchPage(page('12.09.2099 25:00'), id));
  assert.throws(() => parseMatchPage(page(), '../bad'));
});

test('reads the actual competition of each match, including cup matches', () => {
  for (const competition of ['Kreisliga B - Staffel 1', 'Bezirkspokal Bodensee', 'Frauen Bezirksliga']) {
    const html = `<a href="/spieltag/" class="competition">${competition}<span class="icon-link-arrow-circle"></span></a>${page()}`;
    assert.equal(parseMatchPage(html, id).competition, competition);
  }
  assert.equal(parseMatchPage(page(), id).competition, undefined);
});

test('uses the widget time for women’s match pages without a result-report form', () => {
  const html = '<title>FSG - SG Ergebnis: Frauen Bezirkspokal - Frauen - 16.09.2099</title>'
    + page().replace(/<input[^>]+>/, '');
  const match = parseMatchPage(html, id, '19:00');
  assert.equal(match.dateTime, '2099-09-16T19:00');
  assert.equal(match.time, '19:00');
  assert.throws(() => parseMatchPage(html, id, 'unknown'));
});

test('uses Berlin local time in winter and summer', () => {
  assert.equal(berlinNow(new Date('2026-09-12T14:00:00Z')), '2026-09-12T16:00');
  assert.equal(berlinNow(new Date('2026-12-12T14:00:00Z')), '2026-12-12T15:00');
});

test('selects scheduled matches and excludes cancellations and unallocated fixtures', async () => {
  const calls = [];
  const data = { props: { pageProps: { nextMatches: [
    { id, status: 'cancelled' }, { id, status: 'scheduled', notAllocated: true },
    { id, status: 'scheduled', prePublished: true }, { id, status: 'scheduled' },
  ] } } };
  const result = await loadNextMatches('widget', async (url) => {
    calls.push(url);
    return new Response(url.includes('/widget/') ? `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>` : page());
  });
  assert.equal(result.length, 1);
  assert.equal(calls.length, 2);
});

test('returns fallback data on upstream failure or changed markup', async () => {
  assert.deepEqual(await loadNextMatches('widget', async () => new Response('', { status: 503 })), []);
  assert.deepEqual(await loadNextMatches('widget', async () => new Response('<html>Changed</html>')), []);
});

test('does not present old matches as upcoming', async () => {
  const data = { props: { pageProps: { nextMatches: [{ id, status: 'scheduled' }] } } };
  const result = await loadNextMatches('widget', async (url) => new Response(url.includes('/widget/')
    ? `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>` : page('12.09.2020 16:00')));
  assert.deepEqual(result, []);
});
