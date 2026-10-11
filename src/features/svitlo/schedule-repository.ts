import type { ScheduleDay } from './models';

export type ScheduleSnapshot = { day: ScheduleDay; updatedAt: number; persistenceWarning?: boolean };
type Persistence = { getString: (key: string) => string | undefined; set: (key: string, value: string) => void };
const KEY = 'svitlo.schedule.v1';

function isDay(value: unknown): value is ScheduleDay {
  if (!value || typeof value !== 'object' || !('date' in value) || typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !('queues' in value) || !Array.isArray(value.queues))
    return false;
  if ('noOutagesScope' in value && value.noOutagesScope !== 'region')
    return false;
  return (value.queues.length > 0 || ('noOutagesScope' in value && value.noOutagesScope === 'region')) && value.queues.every((queue: unknown) => {
    if (!queue || typeof queue !== 'object' || !('queue' in queue) || typeof queue.queue !== 'string' || !/^\d+\.\d+$/.test(queue.queue) || !('intervals' in queue) || !Array.isArray(queue.intervals))
      return false;
    let end = 0;
    return queue.intervals.length > 0 && queue.intervals.every((interval: unknown) => {
      if (!interval || typeof interval !== 'object' || !('start' in interval) || !('end' in interval) || !('state' in interval) || typeof interval.start !== 'number' || typeof interval.end !== 'number' || !Number.isFinite(interval.end) || interval.start !== end || interval.end <= end || interval.end > 1440 || !['on', 'off', 'possible', 'unknown'].includes(String(interval.state)))
        return false;
      end = interval.end;
      return true;
    });
  });
}

export function createScheduleRepository(persistence: Persistence, fetchDay: (date: string, signal?: AbortSignal) => Promise<ScheduleDay>, now = Date.now) {
  function load(): ScheduleSnapshot | undefined {
    try {
      const value: unknown = JSON.parse(persistence.getString(KEY) ?? 'null');
      if (value && typeof value === 'object' && 'version' in value && value.version === 1 && 'day' in value && isDay(value.day) && 'updatedAt' in value && typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) && value.updatedAt > 0)
        return { day: value.day, updatedAt: value.updatedAt };
    }
    catch { /* Unreadable cache is treated as absent. */ }
    return undefined;
  }
  async function fetch(date: string, signal?: AbortSignal): Promise<ScheduleSnapshot> {
    const day = await fetchDay(date, signal);
    if (!isDay(day) || day.date !== date)
      throw new Error('Отримано некоректний графік або іншу дату.');
    const snapshot = { day, updatedAt: day.verifiedAt ?? now() };
    try {
      persistence.set(KEY, JSON.stringify({ version: 1, ...snapshot }));
      return snapshot;
    }
    catch {
      return { ...snapshot, persistenceWarning: true };
    }
  }
  return { load, fetch };
}

export function currentSchedule(snapshot: ScheduleSnapshot | undefined, date: string) {
  return snapshot?.day.date === date ? snapshot.day : undefined;
}
