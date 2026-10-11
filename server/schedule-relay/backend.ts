import type { NotificationDatabase } from '../notifications/database';
import type { ScheduleSnapshot } from '../notifications/schedules';
import { createNotificationApi } from '../notifications/api';
import { authorizedInternal, internalJson } from '../notifications/internal-http';
import { fetchScheduleSnapshot, kyivToday } from '../notifications/pilot-source';
import { dispatchPush } from '../notifications/push';
import { createNotificationRepository } from '../notifications/repository';
import { createScheduleStore, scheduleResponse, validatedSnapshot } from '../notifications/schedules';

type Options = {
  database: NotificationDatabase;
  tickToken: string;
  source?: (date: string) => Promise<ScheduleSnapshot>;
  transport?: typeof fetch;
  expoAccessToken?: string;
  now?: () => number;
};
type Lease = { owner: string; completed_slot: number };

function failureReason(error: unknown) {
  if (!(error instanceof Error))
    return 'unavailable';
  const cause = error.cause as { code?: string } | undefined;
  const codes = ['UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'];
  if (cause?.code && codes.includes(cause.code))
    return cause.code;
  if (error.name === 'TimeoutError' || error.name === 'AbortError')
    return 'timeout';
  if (/^Source HTTP \d{3}$/.test(error.message))
    return error.message.replace('Source HTTP ', 'http-');
  if (error.message === 'Source date does not match request')
    return 'invalid-date';
  if (error.message === 'Source response too large')
    return 'body-too-large';
  return 'unavailable';
}

export function createBackendApi(options: Options) {
  if (options.tickToken.length < 32 || options.tickToken.length > 256)
    throw new Error('Invalid tick token');
  const now = options.now ?? Date.now;
  const database = options.database;
  const store = createScheduleStore(database);
  const repository = createNotificationRepository(database, now);
  const api = createNotificationApi(repository);
  const source = options.source ?? (date => fetchScheduleSnapshot({ date, now }));

  async function runTick() {
    const started = now();
    const slot = Math.floor(started / 60000);
    const owner = crypto.randomUUID();
    await database.batch([{
      sql: `INSERT INTO backend_jobs (name, owner, lease_until, completed_slot) VALUES ('schedule-poll', ?, ?, -1)
        ON CONFLICT(name) DO UPDATE SET owner = excluded.owner, lease_until = excluded.lease_until
        WHERE backend_jobs.lease_until <= ? AND backend_jobs.completed_slot < ?`,
      params: [owner, started + 300000, started, slot],
    }]);
    const lease = await database.first<Lease>({ sql: 'SELECT owner, completed_slot FROM backend_jobs WHERE name = ?', params: ['schedule-poll'] });
    if (lease?.owner !== owner)
      return { skipped: true };
    try {
      const initialized = lease.completed_slot >= 0 && !!await database.first({ sql: 'SELECT date FROM schedule_snapshots LIMIT 1', params: [] });
      const today = kyivToday(new Date(started));
      const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
      const sources: { date: string; valid: boolean; queues?: number; stage?: string; reason?: string }[] = [];
      for (const date of [today, tomorrow]) {
        let stage = 'fetch';
        try {
          const received = await source(date);
          stage = 'validate';
          const snapshot = validatedSnapshot(received, date, now());
          stage = 'persist';
          const previous = await store.get(date);
          // Initial known schedules establish a baseline; restarts retain it in D1.
          if (initialized && !previous)
            await repository.publish(snapshot.day);
          await store.save(snapshot);
          sources.push({ date, valid: true, queues: snapshot.day.queues.length });
        }
        catch (error) { sources.push({ date, valid: false, stage, reason: failureReason(error) }); }
      }
      const delivery = await dispatchPush(database, options.transport, options.expoAccessToken);
      await database.batch([{
        sql: 'UPDATE backend_jobs SET completed_slot = ?, lease_until = 0 WHERE name = ? AND owner = ?',
        params: [slot, 'schedule-poll', owner],
      }]);
      return { skipped: false, sources, ...delivery, wallMs: now() - started };
    }
    finally {
      await database.batch([{
        sql: 'UPDATE backend_jobs SET lease_until = 0 WHERE name = ? AND owner = ?',
        params: ['schedule-poll', owner],
      }]);
    }
  }

  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    if (path === '/internal/tick') {
      if (!await authorizedInternal(request, options.tickToken))
        return internalJson({ error: 'Not found' }, 404);
      if (request.method !== 'POST')
        return internalJson({ error: 'Method not allowed' }, 405);
      try {
        return internalJson(await runTick());
      }
      catch { return internalJson({ error: 'Tick unavailable' }, 503); }
    }
    if (path === '/v1/schedules')
      return scheduleResponse(request, store, now());
    return api(request);
  };
}
