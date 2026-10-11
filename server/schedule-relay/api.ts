import type { ScheduleSnapshot } from '../notifications/schedules';
import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import { dateSchema } from '../../src/features/svitlo/notifications/models';
import { fetchScheduleSnapshot, kyivToday } from '../notifications/pilot-source';

type Options = { token: string; source?: (date: string) => Promise<ScheduleSnapshot>; now?: () => number };

export function createRelayApi(options: Options) {
  if (options.token.length < 32)
    throw new Error('SCHEDULE_RELAY_TOKEN must contain at least 32 random characters');
  const now = options.now ?? Date.now;
  const source = options.source ?? (date => fetchScheduleSnapshot({ date }));
  const cache = new Map<string, ScheduleSnapshot>();
  const pending = new Map<string, Promise<ScheduleSnapshot>>();
  return async (request: Request) => {
    const url = new URL(request.url);
    const headers = { 'Cache-Control': 'no-store' };
    if (request.method === 'GET' && url.pathname === '/health')
      return Response.json({ ok: true }, { headers });
    const supplied = Buffer.from(request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '');
    const expected = Buffer.from(options.token);
    if (url.pathname !== '/v1/schedules' || supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      return Response.json({ error: 'Not found' }, { status: 404, headers });
    if (request.method !== 'GET')
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { ...headers, Allow: 'GET' } });
    const today = kyivToday(new Date(now()));
    const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    const date = url.searchParams.get('date') ?? today;
    if (!dateSchema.safeParse(date).success || ![today, tomorrow].includes(date))
      return Response.json({ error: 'Only today and tomorrow are supported' }, { status: 400, headers });
    for (const key of cache.keys()) {
      if (![today, tomorrow].includes(key))
        cache.delete(key);
    }
    try {
      let snapshot = cache.get(date);
      if (!snapshot || now() - snapshot.verifiedAt >= 55000) {
        let fetching = pending.get(date);
        if (!fetching) {
          fetching = source(date);
          pending.set(date, fetching);
        }
        try {
          snapshot = await fetching;
          cache.set(date, snapshot);
        }
        finally {
          if (pending.get(date) === fetching)
            pending.delete(date);
        }
      }
      return Response.json(snapshot, { headers });
    }
    catch {
      // Never give an old snapshot a new verification timestamp after failure.
      return Response.json({ error: 'Schedule source unavailable' }, { status: 503, headers });
    }
  };
}
