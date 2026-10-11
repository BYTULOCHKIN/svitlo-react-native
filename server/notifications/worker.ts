import type { D1Binding } from './d1-database';
import { createNotificationApi } from './api';
import { createD1Database } from './d1-database';
import { fetchPilotSchedule } from './pilot-source';
import { dispatchPush } from './push';
import { createNotificationRepository } from './repository';

type Bindings = { DB: D1Binding; ENVIRONMENT: string; PILOT_RUN_TOKEN?: string; EXPO_ACCESS_TOKEN?: string };

async function authorizedPilot(request: Request, env: Bindings) {
  if (env.ENVIRONMENT !== 'pilot' || !env.PILOT_RUN_TOKEN || env.PILOT_RUN_TOKEN.length < 32)
    return false;
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).join(',');
  return await hash(supplied) === await hash(env.PILOT_RUN_TOKEN);
}

export default {
  async fetch(request: Request, env: Bindings) {
    const database = createD1Database(env.DB);
    const repository = createNotificationRepository(database);
    if (new URL(request.url).pathname === '/pilot/publication') {
      if (request.method !== 'POST' || !await authorizedPilot(request, env))
        return Response.json({ error: 'Не знайдено' }, { status: 404 });
      try {
        const started = Date.now();
        const day = await fetchPilotSchedule();
        await repository.publish(day);
        const delivery = await dispatchPush(database, fetch, env.EXPO_ACCESS_TOKEN);
        const result = { date: day.date, queues: day.queues.length, ...delivery, ...database.metrics, wallMs: Date.now() - started };
        console.info(JSON.stringify({ operation: 'pilot-publication', ...result }));
        return Response.json(result);
      }
      catch {
        return Response.json({ error: 'Pilot source or delivery unavailable' }, { status: 503 });
      }
    }
    return createNotificationApi(repository)(request);
  },
  async scheduled(_event: unknown, env: Bindings) {
    const database = createD1Database(env.DB);
    const started = Date.now();
    let sourceValid = false;
    try {
      await fetchPilotSchedule();
      sourceValid = true;
    }
    catch { /* A failed check does not manufacture a publication or clear history. */ }
    const delivery = await dispatchPush(database, fetch, env.EXPO_ACCESS_TOKEN);
    console.info(JSON.stringify({ operation: 'pilot-cron', sourceValid, ...delivery, ...database.metrics, wallMs: Date.now() - started }));
  },
};
