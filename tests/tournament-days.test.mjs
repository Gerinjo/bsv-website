import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseTournamentPlan, parseTournamentMatch, parseTournamentParticipants, loadTournamentSchedule, tournamentScheduleWithFallback, splitTournamentDays } from '../src/utils/tournamentDays.ts';

const own = '01DN9LCDA0000000VV0AG80NVSQ3PCMQ';
const other = '011MID8TAS000000VTVG0001VTR8C1K7';
const third = '02M4CFOAB8000000VS5489B1VVVHS1D7';
const fourth = '011MIF3MCC000000VTVG0001VTR8C1K7';
const matchId = '031TP8CA14000000VS5489BTVT7QHFUC';
const match2 = '031TP93TF8000000VS5489BTVT7QHFUC';
const groupId = '031T6JUML8000000VS5489BUVSORQI22-G';
const group2 = '031T6K3JBG000006VS5489BUVSORQI22-G';
const groupUrl = (id = groupId, date = '2026-09-19') => `https://www.fussball.de/spieltag/-/spieldatum/${date}/staffel/${id}`;
const team = (id, name) => `<a class="club-wrapper" href="/mannschaft/-/team-id/${id}"><div class="club-name">${name}</div></a>`;
const row = (id = matchId, time = '14:00', date = '19.09.2026') => `<tr class="row-headline"><td>Samstag, ${date} - ${time} Uhr | Bezirksturnier</td></tr>
<tr><td>${team(other, 'SV Bohlingen')}${team(own, 'BSV Nordstern Radolfzell 2')}</td><td class="column-detail"><a href="/spiel/-/spiel/${id}">Zum Spiel</a></td></tr>`;
const plan = (rows = row()) => `<div class="club-matchplan-table"><table><tbody>${rows}</tbody></table></div>`;
const match = (group = groupId, venue = 'Nebenplatz, Schlesierstr. 43, Radolfzell') => `<div class="stage-header"><a class="competition" href="${groupUrl(group)}">Herbstrunde Staffel 5 Spieltag 1</a><a class="location">${venue}</a></div>`;
const participants = `<div class="hint-pre-publish">Vorläufig</div><table><tr><td>${team(own, 'BSV Nordstern Radolfzell 2')}${team(other, 'SV Bohlingen')}</td><td class="column-score">:</td></tr><tr><td>${team(third, 'FC Öhningen-Gaienhofen')}${team(fourth, 'BSV Nordstern Radolfzell')}</td><td class="column-score">:</td></tr></table>`;

test('reads dated team fixtures and deduplicates match IDs', () => {
  const result = parseTournamentPlan(plan(row() + row()), own);
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-09-19');
  assert.equal(result[0].time, '14:00');
  assert.equal(result[0].teams[1].id, own);
});

test('rejects missing, truncated, malformed and foreign-team plans', () => {
  assert.throws(() => parseTournamentPlan('<html>Unavailable</html>', own));
  assert.throws(() => parseTournamentPlan(plan() + '<form data-ajax-resource="matchplan.loadmore"></form>', own));
  assert.throws(() => parseTournamentPlan(plan(row(matchId, '25:00')), own));
  assert.throws(() => parseTournamentPlan(plan(row(matchId, '14:00', '31.02.2026')), own));
  assert.throws(() => parseTournamentPlan(plan(), third));
  assert.deepEqual(parseTournamentPlan(plan(''), own), []);
});

test('takes venue and dated group link from match, never the nominal home team', () => {
  const fixture = parseTournamentPlan(plan(), own)[0];
  const detail = parseTournamentMatch(match(), fixture);
  assert.equal(detail.venue, 'Nebenplatz, Schlesierstr. 43, Radolfzell');
  assert.equal(detail.url, groupUrl());
  assert.equal(parseTournamentMatch(match(groupId, ''), fixture).venue, '');
});

test('rejects wrong dates, unexpected URLs and missing group metadata', () => {
  const fixture = parseTournamentPlan(plan(), own)[0];
  assert.throws(() => parseTournamentMatch(match().replace('2026-09-19', '2026-09-20'), fixture));
  assert.throws(() => parseTournamentMatch(match().replace('https://www.fussball.de', 'https://other.test'), fixture));
  assert.throws(() => parseTournamentMatch('<html>Unavailable</html>', fixture));
});

test('reads all participants from full group, keeping BSV 1 and 2 distinct', () => {
  const result = parseTournamentParticipants(participants, own);
  assert.equal(result.teams.length, 4);
  assert.equal(result.preliminary, true);
  assert.ok(result.teams.some((team) => team.name === 'FC Öhningen-Gaienhofen'));
  assert.throws(() => parseTournamentParticipants('<html></html>', own));
});

test('groups by date and group, selects first team kickoff and retains multiple venues', async () => {
  const calls = [];
  const result = await loadTournamentSchedule(own, '2026-2027', async (url) => {
    calls.push(url);
    if (url.includes('ajax.team.matchplan')) return new Response(plan(row() + row(match2, '13:30')));
    if (url.includes('/spiel/')) return new Response(match(groupId, url.endsWith(match2) ? 'Platz 2' : 'Platz 1'));
    return new Response(participants);
  });
  assert.equal(result.days.length, 1);
  assert.equal(result.days[0].firstTeamKickoff, '13:30');
  assert.equal(result.days[0].teams.length, 4);
  assert.equal(result.days[0].venues.length, 2);
  assert.equal(calls.filter((url) => url.includes('/spieltag/')).length, 1);
  assert.match(calls[0], /max=100/);
  assert.match(calls[0], /datum-von=2026-07-01/);
});

test('does not merge different tournament groups on the same date', async () => {
  const result = await loadTournamentSchedule(own, '2026-2027', async (url) => {
    if (url.includes('ajax.team.matchplan')) return new Response(plan(row() + row(match2)));
    if (url.includes('/spiel/')) return new Response(match(url.endsWith(match2) ? group2 : groupId));
    return new Response(participants);
  });
  assert.equal(result.days.length, 2);
});

test('marks fully cancelled days and excludes cancelled games from the first kickoff', async () => {
  const cancelledRow = row(matchId, '13:00').replace('<td class="column-detail">', '<td class="column-score">Absetzung</td><td class="column-detail">');
  const run = async (rows) => loadTournamentSchedule(own, '2026-2027', async (url) => new Response(url.includes('ajax.team.matchplan') ? plan(rows) : url.includes('/spiel/') ? match() : participants));
  assert.equal((await run(cancelledRow)).days[0].cancelled, true);
  const mixed = (await run(cancelledRow + row(match2, '14:00'))).days[0];
  assert.equal(mixed.cancelled, false);
  assert.equal(mixed.firstTeamKickoff, '14:00');
});

test('retains explicitly stale saved data when any required source fails', async () => {
  const fallback = { teamId: own, season: '2026-2027', checkedAt: '2026-09-13T12:00:00Z', days: [] };
  const result = await tournamentScheduleWithFallback(fallback, async () => new Response('', { status: 503 }));
  assert.equal(result.stale, true);
  assert.strictEqual(result.schedule, fallback);
  const incomplete = await tournamentScheduleWithFallback(fallback, async (url) => new Response(url.includes('ajax.team.matchplan') ? plan() : '<html>Changed</html>'));
  assert.equal(incomplete.stale, true);
  await assert.rejects(loadTournamentSchedule('../invalid', '2026-2027'));
  await assert.rejects(loadTournamentSchedule(own, '2026-2028'));
});

test('keeps today visible until Berlin midnight and separates past days', () => {
  const days = [{ date: '2026-09-18' }, { date: '2026-09-19' }, { date: '2026-09-20' }];
  const result = splitTournamentDays(days, new Date('2026-09-19T21:59:00Z'));
  assert.equal(result.upcoming.length, 2);
  assert.equal(splitTournamentDays(days, new Date('2026-09-19T22:00:00Z')).upcoming.length, 1);
});

test('verified E2 snapshot contains all six four-team dates and sourced venues', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/e2TournamentSchedule.json', import.meta.url)));
  assert.deepEqual(data.days.map(({ date }) => date), ['2026-09-19', '2026-09-26', '2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24']);
  for (const day of data.days) {
    assert.equal(day.teams.length, 4);
    assert.equal(day.teams.filter(({ id }) => id === own).length, 1);
    assert.ok(day.venues.every(({ name, matchUrl }) => name && matchUrl.includes('/spiel/')));
    assert.ok(day.url.includes(`/spieldatum/${day.date}/staffel/`));
  }
  assert.match(data.days[0].venues[0].name, /Nebenpl. bei Nordst/);
});
