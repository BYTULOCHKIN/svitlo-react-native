import type { ScheduleDay } from './models';

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseScheduleJson(value: unknown, date: string): ScheduleDay {
  if (!record(value) || value.date !== date || !Array.isArray(value.queues) || value.queues.length > 100
    || (value.noOutagesScope !== undefined && value.noOutagesScope !== 'region')
    || typeof value.verifiedAt !== 'number' || !Number.isSafeInteger(value.verifiedAt) || value.verifiedAt <= 0
    || value.verifiedAt > Date.now() + 30000 || typeof value.stale !== 'boolean') {
    throw new Error('Некоректна відповідь сервера графіків.');
  }
  const queues = value.queues.map((queue) => {
    if (!record(queue) || typeof queue.queue !== 'string' || !/^\d+\.\d+$/.test(queue.queue)
      || !Array.isArray(queue.intervals) || !queue.intervals.length || queue.intervals.length > 48) {
      throw new Error('Некоректна черга у графіку.');
    }
    let end = 0;
    const intervals = queue.intervals.map((interval) => {
      if (!record(interval) || interval.start !== end || typeof interval.end !== 'number' || !Number.isInteger(interval.end)
        || interval.end <= end || interval.end > 1440 || !['on', 'off', 'possible'].includes(String(interval.state))) {
        throw new Error('Некоректні інтервали у графіку.');
      }
      end = interval.end;
      return { start: interval.start as number, end, state: interval.state as 'on' | 'off' | 'possible' };
    });
    if (end !== 1440)
      throw new Error('Неповний графік.');
    return { queue: queue.queue, intervals };
  });
  if ((!queues.length && value.noOutagesScope !== 'region') || new Set(queues.map(queue => queue.queue)).size !== queues.length)
    throw new Error('Неповний графік або повторена черга.');
  return { date, queues, ...(value.noOutagesScope === 'region' ? { noOutagesScope: 'region' as const } : {}), verifiedAt: value.verifiedAt };
}
