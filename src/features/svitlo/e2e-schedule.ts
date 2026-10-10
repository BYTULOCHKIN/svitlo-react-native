import type { ScheduleDay } from './models';

export async function fetchE2ESchedule(date: string): Promise<ScheduleDay> {
  return { date, queues: ['1.1', '1.2', '2.1'].map(queue => ({ queue, intervals: [{ start: 0, end: 1440, state: 'on' }] })) };
}
