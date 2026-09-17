import { bookingTimes, matchdaySettings } from './matchdayPlan.ts';
import type { Pitch, PitchBooking } from './matchdayPlan.ts';
import type { TournamentSchedule } from './tournamentDays.ts';

export type ManualTournamentSchedule = TournamentSchedule & {
  id: string; sourceLabel: string; category: 'G-Junioren' | 'F-Junioren';
  ownTeamIds: string[]; label: string; homePitch: Pitch | null; halves: 1 | 2; pagePath: string;
  sectionId?: string;
};

export function manualTournamentBookings(schedules: ManualTournamentSchedule[], from: string, through: string): PitchBooking[] {
  const bookings = new Map<string, PitchBooking>();
  for (const schedule of schedules) {
    for (const day of schedule.days) {
      if (!day.home || day.cancelled || day.date < from || day.date > through) continue;
      // One shared event, regardless of how many BSV teams or team pages use it.
      const id = schedule.id + '-' + day.date;
      bookings.set(id, {
        id, date: day.date, kickoff: day.firstTeamKickoff,
        ...bookingTimes(day.firstTeamKickoff, matchdaySettings.tournament),
        pitch: schedule.homePitch, halves: schedule.halves,
        venue: day.venues.map((venue) => venue.name).join(' · '),
        label: schedule.label + ' · Spieltag', teams: day.teams,
        category: schedule.category, format: 'Fair-Play-Spieltag',
        url: schedule.pagePath + '#' + (schedule.sectionId ?? 'spieltage'), source: 'club', preliminary: day.preliminary,
        notes: [...(schedule.homePitch === null ? ['BSV-Heimspieltag: Haupt-/Nebenplatz und Platzumfang noch zu bestätigen.'] : []),
          schedule.sourceLabel + ' · Stand ' + new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin' }).format(new Date(schedule.checkedAt)),
          (schedule.ownTeamIds.length > 1 ? 'Gemeinsamer Spieltag der BSV-Teams: ' : 'Spieltag: ') + '2 Stunden, 30 Min. Vorlauf und 15 Min. Nachlauf.'],
      });
    }
  }
  return [...bookings.values()];
}
