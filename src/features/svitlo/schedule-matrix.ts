import type { QueueSchedule } from './models';
import { getCurrentState } from './models';

export function toMatrixRows(queues: QueueSchedule[]) {
  return queues.map(schedule => ({
    queue: schedule.queue,
    hours: Array.from({ length: 24 }, (_, hour) => getCurrentState(schedule, hour * 60 + 30)),
    lightMinutes: schedule.intervals.filter(interval => interval.state === 'on').reduce((sum, interval) => sum + interval.end - interval.start, 0),
  })).sort((a, b) => b.lightMinutes - a.lightMinutes || a.queue.localeCompare(b.queue, 'uk', { numeric: true }));
}
