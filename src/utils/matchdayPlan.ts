export type Pitch = 'Hauptplatz' | 'Nebenplatz';
export type MatchTeam = { id: string; name: string };
export type MatchFixture = {
  id: string; date: string; time: string; category: string; competition: string;
  teams: MatchTeam[]; url: string; cancelled: boolean; preliminary: boolean;
};
export type PitchBooking = {
  id: string; date: string; kickoff: string; start: number | null; end: number | null;
  pitch: Pitch | null; venue: string; label: string; teams: MatchTeam[];
  category: string; format: string; halves: 1 | 2; url: string;
  preliminary: boolean; notes: string[];
  kind?: 'fixed';
  source?: 'club';
  relocation?: 'suggested' | 'blocked';
};
export type MatchdaySchedule = {
  version: 1; checkedAt: string; from: string; through: string;
  bookings: PitchBooking[]; excludedAway: number; cancelled: number;
};

export const matchdaySettings = { before: 30, after: 15, interval: 15, tournament: 120, days: 56 };
export const matchdayTeams: Record<string, string> = {
  '011MICLVK0000000VTVG0001VTR8C1K7': 'Herren 1',
  '011MIBT808000000VTVG0001VTR8C1K7': 'Herren 2',
  '02ENGA3D98000000VS5489B1VU24SJ9U': 'A-Junioren',
  '02BBS8A0MK000000VS5489B1VU20GQ5T': 'B-Junioren',
  '0276T1CNK8000000VS5489B2VVRTHQ8E': 'C1',
  '031AUPODRC000000VS5489BRVVNAT1LG': 'C2',
  '011MICT8J8000000VTVG0001VTR8C1K7': 'D1',
  '027LQ5OTKO000000VS5489B1VTUKARPV': 'D2',
  '02PPN4UQA0000000VS5489B1VU7RM1AE': 'D3',
  '011MIF3MCC000000VTVG0001VTR8C1K7': 'E1',
  '01DN9LCDA0000000VV0AG80NVSQ3PCMQ': 'E2',
  '0276SUOJAS000000VS5489B2VVRTHQ8E': 'E3',
  '01A2FGUHDO000000VV0AG80NVSEJ47CH': 'Frauen 1',
  '03163NI9R0000000VS5489BSVSCPI5U4': 'Frauen 2',
  '02EK6R3IFK000000VS5489B2VVOABD77': 'B-Juniorinnen',
  '0314RN90R8000000VS5489BRVVV10ESU': 'C-Juniorinnen',
  '01SE05SKMO000000VS548985VTSAFDL4': 'D-Juniorinnen',
};

export function timeMinutes(time: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}
export const clockLabel = (minute: number) => {
  const value = ((minute % 1440) + 1440) % 1440;
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0')
    + (minute >= 1440 ? ' (+1)' : minute < 0 ? ' (-1)' : '');
};
export const addDays = (day: string, count: number) => {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};

export function matchRule(category: string, teams: MatchTeam[], tournament = false) {
  const seven = teams.some(({ name }) => /\b7\s*(?:er|gegen\s*7|vs\.?\s*7)\b/i.test(name));
  const nine = teams.some(({ name }) => /\b9\s*er\b/i.test(name));
  if (tournament && /^E-Junior/.test(category)) return { halves: 1 as const, format: '4er-Spieltag', duration: matchdaySettings.tournament };
  if (/^D-Junior/.test(category)) return { halves: 1 as const, format: '7er', duration: 60 + matchdaySettings.interval };
  const duration = /^C-Junior/.test(category) ? 70 : /^B-Junior/.test(category) ? 80 : 90;
  if (/^[BC]-Juniorinnen/.test(category) && seven) return { halves: 1 as const, format: '7er', duration: duration + matchdaySettings.interval };
  if (/^[ABC]-Junioren|^Herren|^Frauen/.test(category) || /^[BC]-Juniorinnen/.test(category)) {
    return { halves: 2 as const, format: nine ? '9er' : '11er', duration: duration + matchdaySettings.interval };
  }
  if (seven) return { halves: 1 as const, format: '7er', duration: duration + matchdaySettings.interval };
  return null;
}

export function bookingTimes(kickoff: string, duration: number) {
  const minute = timeMinutes(kickoff);
  return { start: minute === null ? null : minute - matchdaySettings.before, end: minute === null ? null : minute + duration + matchdaySettings.after };
}

export function applyChangeovers(bookings: PitchBooking[]): PitchBooking[] {
  const result = bookings.map((b) => ({ ...b, notes: [...b.notes] }));
  const groups = new Map<string, PitchBooking[]>();
  for (const b of result) {
    if (!b.pitch || b.start === null || b.end === null || timeMinutes(b.kickoff) === null) continue;
    const key = b.date + '|' + b.pitch;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  for (const group of groups.values()) {
    const previous: (PitchBooking | undefined)[] = [undefined, undefined];
    const coreEnd = (b: PitchBooking) => b.end! - (b.kind === 'fixed' ? 0 : matchdaySettings.after);
    group.sort((a, b) => a.kickoff.localeCompare(b.kickoff) || b.halves - a.halves || a.id.localeCompare(b.id));
    for (const b of group) {
      const kickoff = timeMinutes(b.kickoff)!;
      const same = (p: PitchBooking | undefined) => p && p.format === b.format && p.halves === b.halves && /^(7|9|11)er$/.test(b.format);
      // Each half has its own predecessor, so one 7er game cannot prepare two halves.
      const lanes = b.halves === 2 ? [0, 1] : [[0, 1].sort((a, c) => {
        const score = (n: number) => !previous[n] ? 1 : coreEnd(previous[n]!) > kickoff ? 3 : same(previous[n]) ? 0 : 2;
        return score(a) - score(c) || (previous[a]?.end ?? 0) - (previous[c]?.end ?? 0);
      })[0]];
      const predecessors = lanes.map((n) => previous[n]);
      if (predecessors.every((p) => same(p) && coreEnd(p!) <= kickoff)) {
        const start = Math.min(kickoff, Math.max(b.start!, ...predecessors.map((p) => p!.end!)));
        if (start > b.start!) {
          b.start = start;
          b.notes.push('Gleiche Teamstärke: 15 Min. Wechselzeit nach dem vorherigen Spiel, kein zusätzlicher 30-Min.-Vorlauf auf dieser Fläche.');
        }
      }
      for (const lane of lanes) {
        if (!previous[lane] || coreEnd(b) >= coreEnd(previous[lane]!)) previous[lane] = b;
      }
    }
  }
  return result;
}

export function pitchBlocks(bookings: PitchBooking[], boundaries: number[]) {
  const segments = pitchSegments(bookings, boundaries);
  const conflicts = segments.filter((s) => s.conflict);
  const timed = bookings.filter((b) => b.start !== null && b.end !== null).sort((a, b) => a.start! - b.start! || b.halves - a.halves || a.id.localeCompare(b.id));
  const ends: number[] = [];
  const blocks = timed.map((booking) => {
    const span = conflicts.length ? 1 : booking.halves;
    let column = 0;
    while (Array.from({ length: span }, (_, i) => ends[column + i] ?? -Infinity).some((end) => end > booking.start!)) column++;
    for (let n = 0; n < span; n++) ends[column + n] = booking.end!;
    return { booking, column, span, row: boundaries.indexOf(booking.start!) + 1, endRow: boundaries.indexOf(booking.end!) + 1,
      conflict: conflicts.some((s) => s.active.some((b) => b.id === booking.id)) };
  });
  // On overloaded pitches columns represent simultaneous bookings, not available halves.
  return { blocks, segments, conflicts, columns: Math.max(2, ends.length) };
}

export function pitchSegments(bookings: PitchBooking[], sharedBoundaries?: number[]) {
  const timed = bookings.filter((b) => b.start !== null && b.end !== null).sort((a, b) => a.start! - b.start! || b.halves - a.halves || a.id.localeCompare(b.id));
  const boundaries = sharedBoundaries ?? [...new Set(timed.flatMap((b) => [b.start!, b.end!]))].sort((a, b) => a - b);
  // Prefer stable halves. These are capacity suggestions, not field-side assignments.
  const lanes = new Map<string, number>();
  for (const b of timed) {
    const earlier = timed.filter((a) => lanes.has(a.id) && a.end! > b.start! && a.start! < b.end!);
    const lane = [0, 1].find((n) => earlier.every((a) => a.halves === 1 && lanes.get(a.id) !== n));
    lanes.set(b.id, b.halves === 2 ? 0 : (lane ?? 0));
  }
  return boundaries.slice(0, -1).map((start, i) => {
    const end = boundaries[i + 1];
    const active = timed.filter((b) => b.start! < end && b.end! > start);
    const conflict = active.reduce((sum, b) => sum + b.halves, 0) > 2;
    let slots = [0, 1].map((n) => active.filter((b) => b.halves === 2 || lanes.get(b.id) === n));
    if (!conflict && active.length === 2 && active.every((b) => b.halves === 1) && slots.some((s) => s.length === 2)) slots = active.map((b) => [b]);
    return { start, end, active, conflict, lanes: slots };
  });
}
