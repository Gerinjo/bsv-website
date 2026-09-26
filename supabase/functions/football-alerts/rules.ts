import { berlinNow } from '../_shared/football-matches.ts';
import { homeMatchGroups } from '../_shared/home-match-groups.mjs';
import { teamTraining, teamNames, allocationByTeam, allocationByTeamAndDay } from '../../../src/data/trainingPlan.ts';
import { goalkeeperTraining } from '../../../src/data/goalkeeperTraining.ts';
import { addDays, clockLabel, timeMinutes, type PitchBooking, type MatchFixture } from '../../../src/utils/matchdayPlan.ts';

export const alertTeams = homeMatchGroups.flatMap((group) => group.teams).filter((team) => team.path.startsWith('jugend/'));
const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const routingKey = (path: string) => path === 'jugend/torwarttraining' ? 'goalkeeping' : 'team--' + path.replaceAll('/', '--');

export type TrainingSession = { path: string; team: string; day: string; time: string; pitch: string };
export type RefereeCheck = { fixture: MatchFixture; state: 'assigned' | 'missing' | 'unknown' };
export type FootballAlert = {
  kind: 'training_conflict' | 'missing_referee';
  identity: string; matchId: string; date: string; teamPath: string; team: string; routingKey: string;
  kickoff: string; matchLabel: string; competition: string; url: string; pitch?: string;
  trainingTime?: string; bookingTime?: string;
};

export function youthTrainingSessions(): TrainingSession[] {
  const sessions = Object.entries(teamTraining).filter(([path]) => path.startsWith('jugend/')).flatMap(([path, slots]) => slots.flatMap((slot) => {
    const allocation = { ...allocationByTeam[path], ...allocationByTeamAndDay[`${path}|${slot.day}`] };
    if (!/BSV Nordstern/i.test(slot.place) || !allocation.pitch) return [];
    return [{ path, team: teamNames[path], day: slot.day, time: slot.time, pitch: allocation.pitch }];
  }));
  return [...sessions, ...goalkeeperTraining.map((slot) => ({ ...slot, pitch: slot.allocation.pitch }))];
}

export function refereeCandidates(fixtures: MatchFixture[], now = new Date()) {
  const date = addDays(berlinNow(now).slice(0, 10), 2);
  return fixtures.filter((fixture) => fixture.date === date && !fixture.cancelled && !fixture.preliminary
    && alertTeams.some((team) => team.teamId === fixture.teams[0]?.id)
    && (/^[ABCD]-Junioren$/.test(fixture.category)
      || /^[BCD]-Juniorinnen$/.test(fixture.category) && /pokal/i.test(fixture.competition)));
}

export function collectFootballAlerts({ bookings, referees, now = new Date(), sessions = youthTrainingSessions() }: {
  bookings: PitchBooking[]; referees: RefereeCheck[]; now?: Date; sessions?: TrainingSession[];
}): FootballAlert[] {
  const localNow = berlinNow(now);
  const today = localNow.slice(0, 10);
  const currentMinute = timeMinutes(localNow.slice(11))!;
  const alerts: FootballAlert[] = [];
  for (const booking of bookings) {
    if (booking.kind === 'fixed' || (booking.preliminary && booking.source !== 'club') || booking.relocation === 'suggested'
      || !booking.pitch || booking.start === null || booking.end === null || !booking.kickoff
      || booking.date < today || booking.date > addDays(today, 13)) continue;
    const day = weekdays[new Date(booking.date + 'T12:00:00Z').getUTCDay()];
    for (const session of sessions) {
      if (session.day !== day || session.pitch !== booking.pitch || !session.path.startsWith('jugend/')) continue;
      const times = session.time.match(/\d{1,2}:\d{2}/g) ?? [];
      const start = timeMinutes(times[0]?.padStart(5, '0') ?? ''), end = timeMinutes(times[1]?.padStart(5, '0') ?? '');
      if (start === null || end === null || end <= start || start >= booking.end || end <= booking.start
        || booking.date === today && Math.min(booking.end, end) <= currentMinute) continue;
      const matchLabel = booking.teams.map((team) => team.name).join(' – ') || booking.label;
      alerts.push({ kind: 'training_conflict', matchId: booking.id, date: booking.date, teamPath: session.path, team: session.team,
        routingKey: routingKey(session.path), kickoff: booking.kickoff, matchLabel, competition: booking.category, url: booking.url,
        pitch: booking.pitch, trainingTime: session.time, bookingTime: `${clockLabel(booking.start)}–${clockLabel(booking.end)} Uhr`,
        identity: JSON.stringify(['training_conflict', booking.id, booking.date, booking.kickoff, booking.pitch, booking.start, booking.end, session.path, start, end]),
      });
    }
  }
  for (const check of referees) {
    const fixture = refereeCandidates([check.fixture], now)[0];
    if (!fixture || check.state !== 'missing') continue;
    const team = alertTeams.find((entry) => entry.teamId === fixture.teams[0]?.id)!;
    alerts.push({ kind: 'missing_referee', matchId: fixture.id, date: fixture.date, teamPath: team.path, team: team.label,
      routingKey: routingKey(team.path), kickoff: fixture.time || 'noch offen', matchLabel: fixture.teams.map((entry) => entry.name).join(' – '),
      competition: fixture.competition, url: fixture.url,
      identity: JSON.stringify(['missing_referee', fixture.id, fixture.date, team.path]),
    });
  }
  return [...new Map(alerts.map((alert) => [alert.identity, alert])).values()];
}
