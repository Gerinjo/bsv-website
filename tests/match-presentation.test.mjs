import assert from 'node:assert/strict';
import test from 'node:test';
import { matchPresentation, selectHomepageMatch } from '../src/utils/matchPresentation.ts';
import { createHomeMatchesHandler, homeMatchWidgets } from '../supabase/functions/home-matches/handler.mjs';

const game = { home: 'BSV', away: 'Gast', dateTime: '2026-09-26T16:00', status: 'scheduled', url: 'today' };
const next = { ...game, dateTime: '2026-10-03T16:00', url: 'next' };

test('keeps today’s fixture before, during and after kickoff through 23:59 in Berlin', () => {
  for (const time of ['2026-09-26T10:00:00Z', '2026-09-26T14:00:00Z', '2026-09-26T21:59:59Z']) {
    assert.equal(selectHomepageMatch([next, game], new Date(time)), game);
  }
  assert.equal(selectHomepageMatch([game, next], new Date('2026-09-26T22:00:00Z')), next);
});

test('switches at Berlin midnight in winter too', () => {
  const winter = { ...game, dateTime: '2026-12-12T16:00' };
  const future = { ...next, dateTime: '2026-12-19T16:00' };
  assert.equal(selectHomepageMatch([winter, future], new Date('2026-12-12T22:59:59Z')), winter);
  assert.equal(selectHomepageMatch([winter, future], new Date('2026-12-12T23:00:00Z')), future);
});

test('shows confirmed LIVE with a 0:0 score, and expires stale live status', () => {
  const match = { ...game, status: 'live', homeScore: 0, awayScore: 0, observedAt: '2026-09-26T14:05:00Z' };
  assert.deepEqual(matchPresentation(match, new Date('2026-09-26T14:06:00Z')), { live: true, score: '0 : 0', label: 'LIVE' });
  assert.deepEqual(matchPresentation(match, new Date('2026-09-26T14:09:00Z')), { live: false, score: '0 : 0', label: 'Spielstand' });
  assert.equal(matchPresentation(match, new Date('2026-09-27T14:06:00Z')).live, false);
});

test('shows final score until midnight, including nil results', () => {
  const match = { ...game, status: 'acknowledged', homeScore: 2, awayScore: 0 };
  const now = new Date('2026-09-26T21:59:00Z');
  assert.equal(selectHomepageMatch([match, next], now), match);
  assert.deepEqual(matchPresentation(match, now), { live: false, score: '2 : 0', label: 'Endstand' });
});

test('does not invent LIVE or a score when a result has not been reported', () => {
  assert.deepEqual(matchPresentation(game, new Date('2026-09-26T14:01:00Z')), { live: false, score: '', label: '' });
  assert.deepEqual(matchPresentation(game, new Date('2026-09-26T17:00:00Z')), { live: false, score: '', label: 'Ergebnis folgt' });
  assert.equal(matchPresentation({ ...game, status: 'finished', homeScore: 1 }, new Date('2026-09-26T17:00:00Z')).score, '');
});

test('keeps today’s cancellation with its notice and skips future cancelled games', () => {
  const cancelled = { ...game, status: 'cancelled', homeScore: 0, awayScore: 0 };
  assert.equal(selectHomepageMatch([cancelled, next], new Date('2026-09-26T15:00:00Z')), cancelled);
  assert.equal(selectHomepageMatch([cancelled, next], new Date('2026-09-25T15:00:00Z')), next);
  assert.deepEqual(matchPresentation(cancelled), { live: false, score: '', label: 'Abgesagt' });
});

test('feed coalesces concurrent requests, caches results and refreshes after one minute', async () => {
  let time = new Date('2026-09-26T14:00:00Z');
  const calls = [];
  const handler = createHomeMatchesHandler(async (id) => { calls.push(id); return [game]; }, () => time);
  const request = () => new Request('https://example.test/home-matches?url=https://untrusted.test');
  const responses = await Promise.all([handler(request()), handler(request())]);
  assert.deepEqual(calls, homeMatchWidgets);
  assert.equal(responses[0].headers.get('access-control-allow-origin'), '*');
  const data = await responses[0].json();
  assert.equal(data.teams[homeMatchWidgets[0]].matches.length, 1);
  await handler(request());
  assert.equal(calls.length, 4);
  time = new Date('2026-09-26T14:01:01Z');
  await handler(request());
  assert.equal(calls.length, 8);
});

test('feed isolates a team outage and rejects writes', async () => {
  const handler = createHomeMatchesHandler(async (id) => {
    if (id === homeMatchWidgets[0]) throw new Error('Unavailable');
    return [game];
  });
  const response = await handler(new Request('https://example.test'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.teams[homeMatchWidgets[0]].available, false);
  assert.equal(data.teams[homeMatchWidgets[1]].available, true);
  assert.equal((await handler(new Request('https://example.test', { method: 'POST' }))).status, 405);
  assert.equal((await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status, 204);
});

test('a complete upstream outage returns 503 and cannot be cached as an empty fixture list', async () => {
  const handler = createHomeMatchesHandler(async () => { throw new Error('Unavailable'); });
  const response = await handler(new Request('https://example.test'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
