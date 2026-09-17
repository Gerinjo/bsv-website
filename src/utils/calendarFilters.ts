export const isYouthCalendarSource = (sourceId: string) =>
  sourceId === 'youth-events' || sourceId === 'spieltage';

export const matchesCalendarFilter = (sourceId: string, filterId: string) =>
  filterId === 'all' || (filterId === 'jugend' ? isYouthCalendarSource(sourceId) : sourceId === filterId);
