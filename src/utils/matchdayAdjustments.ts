import { matchdayPitchOverrides } from '../data/matchdayPitchOverrides.ts';
import { bookingTimes, matchdaySettings } from './matchdayPlan.ts';
import type { PitchBooking } from './matchdayPlan.ts';

export function applyMatchdayAdjustments(bookings: PitchBooking[]): PitchBooking[] {
  return bookings.map((original) => {
    const booking = { ...original, notes: [...original.notes] };
    // Recompute old cached E bookings as well as freshly fetched fixtures.
    if (/^E-Junior/.test(booking.category) && booking.format === '4er-Spieltag') {
      Object.assign(booking, bookingTimes(booking.kickoff, matchdaySettings.eTournament));
    }
    const override = matchdayPitchOverrides.find((entry) => entry.date === booking.date && booking.teams.some((team) => team.id === entry.teamId));
    if (override && booking.kind !== 'fixed') {
      booking.pitchOverride = { from: booking.pitchOverride ? booking.pitchOverride.from : booking.pitch, reason: override.reason };
      booking.pitch = override.pitch;
      booking.notes = [...new Set([...booking.notes, 'Vereinsplanung: ' + override.reason + ' Der gemeldete Spielort bei FUSSBALL.DE wird dadurch nicht geändert.'])];
    }
    return booking;
  });
}
