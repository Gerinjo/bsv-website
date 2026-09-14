import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { matchdayScheduleWithFallback } from './loadMatchdayPlan.ts';
import type { MatchdaySchedule } from './matchdayPlan.ts';

const cacheFile = '.astro/matchday-plan.json';
export async function savedMatchdayPlan(seed: MatchdaySchedule) {
  let fallback = seed;
  try {
    const saved = JSON.parse(await readFile(cacheFile, 'utf8')) as MatchdaySchedule;
    if (saved.version === 1 && Array.isArray(saved.bookings) && saved.checkedAt > seed.checkedAt) fallback = saved;
  } catch { /* The checked-in snapshot covers the first build. */ }
  const result = await matchdayScheduleWithFallback(fallback);
  if (!result.stale) {
    const temporary = cacheFile + '.' + randomUUID() + '.tmp';
    try {
      await mkdir('.astro', { recursive: true });
      await writeFile(temporary, JSON.stringify(result.schedule));
      await rename(temporary, cacheFile);
    } catch (error) {
      console.warn('[matchday-plan] Datenstand konnte nicht zwischengespeichert werden:', error);
    } finally {
      await rm(temporary, { force: true }).catch(() => {});
    }
  }
  return result;
}
