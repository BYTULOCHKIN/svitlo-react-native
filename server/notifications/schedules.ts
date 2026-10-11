import type { ScheduleDay } from '../../src/features/svitlo/models';
import type { NotificationDatabase } from './database';
import { dateSchema } from '../../src/features/svitlo/notifications/models';
import { canonicalSchedule } from './repository';

export type ScheduleSnapshot = { day: ScheduleDay; verifiedAt: number };

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// Keep this bounded validation free of runtime schema compilation on cold Workers.
export function parseSchedule(value: unknown): ScheduleDay {
  if (!record(value) || typeof value.date !== 'string' || !Array.isArray(value.queues) || value.queues.length > 100
    || (value.noOutagesScope !== undefined && value.noOutagesScope !== 'region')) {
    throw new Error('Invalid schedule');
  }
  const queues = value.queues.map((queue) => {
    if (!record(queue) || typeof queue.queue !== 'string' || !Array.isArray(queue.intervals) || queue.intervals.length > 48)
      throw new Error('Invalid queue');
    const intervals = queue.intervals.map((interval) => {
      if (!record(interval) || typeof interval.start !== 'number' || typeof interval.end !== 'number'
        || !['on', 'off', 'possible'].includes(String(interval.state))) {
        throw new Error('Invalid interval');
      }
      return { start: interval.start, end: interval.end, state: interval.state as 'on' | 'off' | 'possible' };
    });
    return { queue: queue.queue, intervals };
  });
  const day: ScheduleDay = { date: value.date, queues, ...(value.noOutagesScope === 'region' ? { noOutagesScope: 'region' } : {}) };
  canonicalSchedule(day);
  return day;
}

export function validatedSnapshot(value: unknown, date: string, now = Date.now()): ScheduleSnapshot {
  if (!record(value) || typeof value.verifiedAt !== 'number' || !Number.isSafeInteger(value.verifiedAt) || value.verifiedAt <= 0)
    throw new Error('Invalid verification time');
  const snapshot = { day: parseSchedule(value.day), verifiedAt: value.verifiedAt };
  if (snapshot.day.date !== date || snapshot.verifiedAt > now + 30000 || now - snapshot.verifiedAt > 90000)
    throw new Error('Source date or verification time is invalid');
  return snapshot;
}

export function createScheduleStore(database: NotificationDatabase) {
  return {
    async save(snapshot: ScheduleSnapshot) {
      const payload = canonicalSchedule(parseSchedule(snapshot.day));
      await database.batch([{
        sql: `INSERT INTO schedule_snapshots (date, payload, verified_at) VALUES (?, ?, ?)
          ON CONFLICT(date) DO UPDATE SET payload = excluded.payload, verified_at = excluded.verified_at
          WHERE excluded.verified_at >= schedule_snapshots.verified_at`,
        params: [snapshot.day.date, payload, snapshot.verifiedAt],
      }]);
    },
    async get(date: string) {
      const row = await database.first<{ payload: string; verified_at: number }>({ sql: 'SELECT payload, verified_at FROM schedule_snapshots WHERE date = ?', params: [date] });
      return row ? { day: parseSchedule(JSON.parse(row.payload)), verifiedAt: row.verified_at } : undefined;
    },
  };
}

export async function scheduleResponse(request: Request, store: ReturnType<typeof createScheduleStore>, now = Date.now()) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.method !== 'GET')
    return Response.json({ error: 'Метод не підтримується' }, { status: 405, headers: { ...headers, Allow: 'GET' } });
  const date = new URL(request.url).searchParams.get('date') ?? new Date(now).toLocaleDateString('en-CA', { timeZone: 'Europe/Kyiv' });
  if (!dateSchema.safeParse(date).success)
    return Response.json({ error: 'Дата має бути дійсною датою YYYY-MM-DD' }, { status: 400, headers });
  try {
    const snapshot = await store.get(date);
    if (!snapshot)
      return Response.json({ error: 'Графік на цю дату ще не отримано', date }, { status: 404, headers });
    return Response.json({ ...snapshot.day, verifiedAt: snapshot.verifiedAt, stale: now - snapshot.verifiedAt > 300000 }, { headers });
  }
  catch {
    return Response.json({ error: 'Сховище графіків тимчасово недоступне' }, { status: 503, headers });
  }
}
