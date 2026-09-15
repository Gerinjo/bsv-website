import { pitchReservations } from '../data/pitchReservations.ts';
import { addDays, applyChangeovers, pitchSegments, timeMinutes } from './matchdayPlan.ts';
import type { PitchBooking } from './matchdayPlan.ts';

export function recurringPitchBookings(from: string, through: string): PitchBooking[] {
  const bookings: PitchBooking[] = [];
  for (let date = from; date <= through; date = addDays(date, 1)) {
    const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
    for (const fixed of pitchReservations.filter((entry) => entry.weekday === weekday)) {
      bookings.push({ id: fixed.id + '-' + date, date, kickoff: fixed.start,
        start: timeMinutes(fixed.start), end: timeMinutes(fixed.end), pitch: fixed.pitch,
        venue: 'BSV-Sportgelände, Nebenplatz', label: fixed.label, teams: [], category: 'Bogensport',
        format: 'Festbelegung', halves: 2, url: fixed.path, preliminary: false, kind: 'fixed',
        notes: ['Wöchentliche Festbelegung. Der gesamte Nebenplatz ist in dieser Zeit für Fußball gesperrt.'] });
    }
  }
  return bookings;
}

export function planWithPitchReservations(matches: PitchBooking[], from: string, through: string): PitchBooking[] {
  const fixed = recurringPitchBookings(from, through);
  let raw = [...matches.map((b) => ({ ...b, notes: [...b.notes] })), ...fixed];
  let planned = applyChangeovers(raw);
  const overlaps = (a: PitchBooking, b: PitchBooking) => a.date === b.date && a.pitch === b.pitch
    && a.start !== null && a.end !== null && b.start !== null && b.end !== null
    && a.start < b.end && a.end > b.start;
  const processed = new Set<string>();
  // Re-evaluate after each move: removing a predecessor can restore another game's warm-up time.
  while (true) {
    const affected = planned.filter((b) => b.kind !== 'fixed' && !processed.has(b.id) && fixed.some((f) => overlaps(b, f)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start! - b.start! || b.halves - a.halves || a.id.localeCompare(b.id))[0];
    if (!affected) break;
    processed.add(affected.id);
    const candidate = raw.map((b) => b.id === affected.id ? { ...b, pitch: 'Hauptplatz' as const } : b);
    const proposed = applyChangeovers(candidate);
    const main = proposed.filter((b) => b.date === affected.date && b.pitch === 'Hauptplatz');
    const changed = new Set(main.filter((b) => b.id === affected.id || b.start !== planned.find((p) => p.id === b.id)?.start).map((b) => b.id));
    const conflict = pitchSegments(main).some((s) => s.conflict && s.active.some((b) => changed.has(b.id)));
    // Unknown locations/times can hide a main-pitch reservation; do not promise availability.
    const uncertain = planned.some((b) => b.date === affected.date && b.kind !== 'fixed'
      && (b.pitch === null || (b.pitch === 'Hauptplatz' && (b.start === null || b.end === null))));
    const relocation = conflict || uncertain ? 'blocked' as const : 'suggested' as const;
    if (relocation === 'suggested') raw = candidate;
    raw = raw.map((b) => b.id === affected.id ? { ...b, relocation, notes: [...b.notes,
      relocation === 'suggested'
        ? 'Planungsvorschlag wegen Bogensport: vom Nebenplatz auf den Hauptplatz. Noch nicht bestätigt; bei FUSSBALL.DE bleibt der gemeldete Nebenplatz unverändert.'
        : 'Nebenplatz wegen Bogensport gesperrt. Hauptplatz ebenfalls belegt oder nicht sicher verfügbar; Platz oder Anstoßzeit müssen abgestimmt werden.'] } : b);
    planned = applyChangeovers(raw);
  }
  return planned.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? Infinity) - (b.start ?? Infinity) || a.id.localeCompare(b.id));
}
