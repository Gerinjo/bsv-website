const parsedTimeRange = (value) => {
  const matches = [...String(value ?? '').matchAll(/(\d{1,2}):(\d{2})/g)];
  if (matches.length < 2) return null;
  const minutes = matches.slice(0, 2).map((match) => Number(match[1]) * 60 + Number(match[2]));
  if (minutes.some((entry) => !Number.isFinite(entry)) || minutes[1] <= minutes[0]) return null;
  return { start: minutes[0], end: minutes[1] };
};

const timeLabel = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function findTrainingConflicts(sessions = []) {
  const scheduled = sessions.flatMap((session) => {
    const interval = parsedTimeRange(session?.time);
    const share = Number(session?.allocation?.share);
    if (!interval || !session?.day || !session?.allocation?.pitch || !session?.team || !Number.isFinite(share) || share <= 0) return [];
    return [{ ...session, ...interval, share }];
  });
  const groups = new Map();
  for (const session of scheduled) {
    const key = `${session.day}\u0000${session.allocation.pitch}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(session);
  }

  const conflicts = [];
  for (const group of groups.values()) {
    const boundaries = [...new Set(group.flatMap((session) => [session.start, session.end]))].sort((left, right) => left - right);
    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const start = boundaries[index];
      const end = boundaries[index + 1];
      const active = group.filter((session) => session.start < end && session.end > start);
      const totalShare = active.reduce((sum, session) => sum + session.share, 0);
      if (totalShare <= 1 + Number.EPSILON) continue;
      const teams = active.map((session) => session.team).sort((left, right) => left.localeCompare(right, 'de'));
      const previous = conflicts.at(-1);
      if (previous
        && previous.day === active[0].day
        && previous.pitch === active[0].allocation.pitch
        && previous.end === start
        && Math.abs(previous.totalShare - totalShare) < Number.EPSILON
        && previous.teams.join('\u0000') === teams.join('\u0000')) {
        previous.end = end;
        previous.time = `${timeLabel(previous.start)}–${timeLabel(end)} Uhr`;
        continue;
      }
      conflicts.push({
        day: active[0].day,
        pitch: active[0].allocation.pitch,
        start,
        end,
        time: `${timeLabel(start)}–${timeLabel(end)} Uhr`,
        teams,
        totalShare,
        occupancyPercent: Math.round(totalShare * 100),
      });
    }
  }
  return conflicts;
}
