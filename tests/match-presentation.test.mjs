import assert from 'node:assert/strict';
import test from 'node:test';
import { matchPresentation, mergeHomepageMatches, selectHomepageMatch, selectHomepageMatches } from '../src/utils/matchPresentation.ts';
import { createHomeMatchesHandler, homeMatchWidgets } from '../supabase/functions/home-matches/handler.mjs';
import { homeMatchGroups } from '../supabase/functions/_shared/home-match-groups.mjs';

const game = { home: 'BSV', away: 'Gast', dateTime: '2026-09-26T16:00', status: 'scheduled', url: 'today' };
const next = { ...game, dateTime: '2026-10-03T16:00', url: 'next' };

test('homepage groups cover all requested youth teams and each has its own feed and team ID', () => {
  assert.deepEqual(homeMatchGroups.map((group) => group.label), ['Erste', 'Reserve', 'Junioren', 'Juniorinnen']);
  assert.deepEqual(homeMatchGroups.find((group) => group.id === 'boys').teams.map((team) => team.path), [
    'jugend/u19', 'jugend/u17', 'jugend/u15-c1', 'jugend/u15-c2', 'jugend/u13-d1', 'jugend/u13-d2', 'jugend/u13-d3',
  ]);
  assert.deepEqual(homeMatchGroups.find((group) => group.id === 'girls').teams.map((team) => team.path), [
    'jugend/juniorinnen/u17', 'jugend/juniorinnen/u15', 'jugend/juniorinnen/u13',
  ]);
  assert.equal(homeMatchWidgets.length, 14);
  assert.equal(new Set(homeMatchWidgets).size, 14);
  const teams = homeMatchGroups.flatMap((group) => group.teams);
  assert.equal(new Set(teams.map((team) => team.teamId)).size, 14);
  for (const team of teams) assert.match(team.teamId, /^[A-Z0-9]{32}$/);
});

test('keeps Friday through Sunday fixtures until Monday at 06:00 in Berlin', () => {
  const friday = { ...game, dateTime: '2026-09-25T18:00' };
  for (const time of ['2026-09-25T16:00:00Z', '2026-09-26T22:00:00Z', '2026-09-27T21:59:59Z', '2026-09-28T03:59:59Z']) {
    assert.equal(selectHomepageMatch([next, friday], new Date(time)), friday);
  }
  assert.equal(selectHomepageMatch([friday, next], new Date('2026-09-28T04:00:00Z')), next);
});

test('keeps every game of a team on the same weekend', () => {
  const friday = { ...game, dateTime: '2026-09-25T18:00', url: 'friday' };
  const sunday = { ...game, dateTime: '2026-09-27T16:00', url: 'sunday' };
  assert.deepEqual(selectHomepageMatches([next, sunday, friday, game], new Date('2026-09-27T15:00:00Z')), [friday, game, sunday]);
});

test('switches Monday at 06:00 in winter and across daylight saving and month boundaries', () => {
  for (const [date, before, after] of [
    ['2026-12-12T16:00', '2026-12-14T04:59:59Z', '2026-12-14T05:00:00Z'],
    ['2026-10-23T16:00', '2026-10-26T04:59:59Z', '2026-10-26T05:00:00Z'],
    ['2026-03-27T16:00', '2026-03-30T03:59:59Z', '2026-03-30T04:00:00Z'],
    ['2026-07-31T16:00', '2026-08-03T03:59:59Z', '2026-08-03T04:00:00Z'],
  ]) {
    const weekend = { ...game, dateTime: date };
    const future = { ...next, dateTime: '2099-01-01T16:00' };
    assert.equal(selectHomepageMatch([weekend, future], new Date(before)), weekend);
    assert.equal(selectHomepageMatch([weekend, future], new Date(after)), future);
  }
});

test('weekday games expire at midnight; teams without a weekend game show their next match', () => {
  const thursday = { ...game, dateTime: '2026-09-24T18:00' };
  assert.equal(selectHomepageMatch([thursday, next], new Date('2026-09-24T21:59:59Z')), thursday);
  assert.equal(selectHomepageMatch([thursday, next], new Date('2026-09-24T22:00:00Z')), next);
  assert.equal(selectHomepageMatch([next], new Date('2026-09-26T14:00:00Z')), next);
  assert.deepEqual(selectHomepageMatches([], new Date('2026-09-26T14:00:00Z')), []);
});

test('incomplete refreshes retain weekend fixtures and merge late results until Monday', () => {
  const now = new Date('2026-09-27T14:00:00Z');
  const final = { ...game, status: 'finished', homeScore: 2, awayScore: 0 };
  assert.deepEqual(mergeHomepageMatches([game], [next], now), [game, next]);
  assert.deepEqual(mergeHomepageMatches([game, next], [final], now), [final, next]);
  assert.deepEqual(mergeHomepageMatches([final, next], [], new Date('2026-09-28T04:00:00Z')), [next]);
});

test('every team uses its age-specific playing time, including junior girls', () => {
  for (const team of homeMatchGroups.flatMap((group) => group.teams)) {
    const minutes = /^D/.test(team.label) ? 60 : /^C/.test(team.label) ? 70 : /^B/.test(team.label) ? 80 : 90;
    assert.equal(team.playingMinutes, minutes, team.label);
    const kickoff = Date.parse('2026-09-26T14:00:00Z');
    assert.deepEqual(matchPresentation(game, new Date(kickoff - 1), minutes), { live: false, score: '', label: '' });
    assert.deepEqual(matchPresentation(game, new Date(kickoff), minutes), { live: true, score: '', label: 'LIVE' });
    assert.deepEqual(matchPresentation(game, new Date(kickoff + 40 * 60_000), minutes), { live: true, score: '', label: 'LIVE' });
    assert.deepEqual(matchPresentation(game, new Date(kickoff + (minutes + 15) * 60_000 - 1), minutes), { live: true, score: '', label: 'LIVE' });
    assert.deepEqual(matchPresentation(game, new Date(kickoff + (minutes + 15) * 60_000), minutes), { live: false, score: '', label: 'Warten auf Ergebnis' });
  }
});

test('shows ticker scores including 0:0, and uses the clock when ticker data becomes stale', () => {
  const match = { ...game, status: 'live', homeScore: 0, awayScore: 0, observedAt: '2026-09-26T14:05:00Z' };
  for (const time of ['2026-09-26T14:06:00Z', '2026-09-26T14:09:00Z']) {
    assert.deepEqual(matchPresentation(match, new Date(time)), { live: true, score: '0 : 0', label: 'LIVE' });
  }
  assert.deepEqual(matchPresentation(match, new Date('2026-09-26T15:45:00Z')), { live: false, score: '', label: 'Warten auf Ergebnis' });
});

test('fresh ticker can extend play beyond the estimate, but a final status takes precedence', () => {
  const now = new Date('2026-09-26T16:00:00Z');
  const match = { ...game, status: 'live', homeScore: 2, awayScore: 1, observedAt: now.toISOString() };
  assert.deepEqual(matchPresentation(match, now, 60), { live: true, score: '2 : 1', label: 'LIVE' });
  assert.deepEqual(matchPresentation({ ...match, status: 'finished' }, now, 60), { live: false, score: '2 : 1', label: 'Endstand' });
  assert.deepEqual(matchPresentation({ ...match, status: 'finished', awayScore: undefined }, now, 60), { live: false, score: '', label: 'Warten auf Ergebnis' });
});

test('shows final scores throughout the weekend, including 0:0 and games without a ticker', () => {
  const now = new Date('2026-09-27T21:59:00Z');
  for (const status of ['finished', 'acknowledged']) {
    const match = { ...game, status, homeScore: 0, awayScore: 0 };
    assert.equal(selectHomepageMatch([match, next], now), match);
    assert.deepEqual(matchPresentation(match, now), { live: false, score: '0 : 0', label: 'Endstand' });
  }
});

test('does not fabricate a score or treat an old interim score as a final result', () => {
  assert.deepEqual(matchPresentation({ ...game, homeScore: 0, awayScore: 0 }, new Date('2026-09-26T14:01:00Z')), { live: true, score: '', label: 'LIVE' });
  assert.deepEqual(matchPresentation(game, new Date('2026-09-27T17:00:00Z')), { live: false, score: '', label: 'Warten auf Ergebnis' });
  assert.deepEqual(matchPresentation({ ...game, status: 'live', observedAt: '2026-09-26T15:50:00Z' }, new Date('2026-09-26T15:45:00Z')), { live: false, score: '', label: 'Warten auf Ergebnis' });
  assert.deepEqual(matchPresentation(undefined), { live: false, score: '', label: '' });
});

test('retains weekend cancellations, skips future cancellations, and never shows them as LIVE', () => {
  const cancelled = { ...game, status: 'cancelled', homeScore: 0, awayScore: 0 };
  assert.equal(selectHomepageMatch([cancelled, next], new Date('2026-09-26T15:00:00Z')), cancelled);
  assert.equal(selectHomepageMatch([cancelled, next], new Date('2026-09-27T15:00:00Z')), cancelled);
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
  assert.equal(calls.length, homeMatchWidgets.length);
  time = new Date('2026-09-26T14:01:01Z');
  await handler(request());
  assert.equal(calls.length, homeMatchWidgets.length * 2);
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
