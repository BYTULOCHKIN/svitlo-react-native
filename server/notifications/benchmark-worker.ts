// Separate test Worker and disposable D1 only; never deployed as the app Worker.
import type { D1Binding } from './d1-database';
import type { ScheduleSnapshot } from './schedules';
import table from '../../src/features/svitlo/fixtures/poe-2026-10-10.json';
import noOutages from '../../src/features/svitlo/fixtures/poe-no-outages-2026-10-01.json';
import { createD1Database } from './d1-database';
import { fetchScheduleSnapshot, validatePilotHtml } from './pilot-source';
import { dispatchPush } from './push';
import { createNotificationRepository } from './repository';
import { createScheduleStore, validatedSnapshot } from './schedules';

type Bindings = { DB: D1Binding; ENVIRONMENT: string; BENCHMARK_RUN_TOKEN: string; BENCHMARK_URL: string };

async function authorized(request: Request, env: Bindings) {
  if (env.ENVIRONMENT !== 'benchmark' || !env.BENCHMARK_RUN_TOKEN || env.BENCHMARK_RUN_TOKEN.length < 32)
    return false;
  const hash = async (value: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const expected = new Uint8Array(await hash(env.BENCHMARK_RUN_TOKEN));
  return new Uint8Array(await hash(supplied)).every((byte, index) => byte === expected[index]);
}

async function seed(database: ReturnType<typeof createD1Database>, request: Request) {
  const users: { id: string; secretHash: string; token: string }[] = await request.json();
  if (users.length !== 100 || new Set(users.map(user => user.id)).size !== 100
    || users.some(user => !/^[a-f0-9-]{36}$/.test(user.id) || !/^[a-f0-9]{64}$/.test(user.secretHash) || !/^ExponentPushToken\[svitloTest[\w-]{12}\]$/.test(user.token))) {
    throw new Error('Expected 100 synthetic recipients');
  }
  await database.batch(['push_outbox', 'notification_history', 'installation_delivery', 'installations', 'notification_events', 'schedule_snapshots'].map(name => ({ sql: `DELETE FROM ${name}`, params: [] })));
  const payload = JSON.stringify(users);
  await database.batch([
    { sql: 'INSERT INTO installations (id, secret_hash, started_at, start_sequence) SELECT json_extract(value, \'$.id\'), json_extract(value, \'$.secretHash\'), ?, COALESCE((SELECT MAX(sequence) FROM notification_events),0) FROM json_each(?)', params: [Date.now(), payload] },
    { sql: 'INSERT INTO installation_delivery (installation_id, permission, push_token, enabled_after_sequence) SELECT json_extract(value, \'$.id\'), \'granted\', json_extract(value, \'$.token\'), COALESCE((SELECT MAX(sequence) FROM notification_events),0) FROM json_each(?)', params: [payload] },
  ]);
  return Response.json({ installations: users.length });
}

async function run(database: ReturnType<typeof createD1Database>, request: Request, env: Bindings) {
  const body: { source: string; transport: string; snapshot?: ScheduleSnapshot } = await request.json();
  const started = Date.now();
  let snapshot: ScheduleSnapshot;
  if (body.source === 'table' || body.source === 'no-outages') {
    const fixture = body.source === 'table' ? table : noOutages;
    snapshot = { day: validatePilotHtml(fixture.html, fixture.date), verifiedAt: Date.now() };
  }
  else if (body.source === 'json') {
    snapshot = validatedSnapshot(body.snapshot, body.snapshot?.day.date ?? 'invalid');
  }
  else if (body.source === 'live') {
    snapshot = await fetchScheduleSnapshot();
  }
  else {
    return Response.json({ error: 'Invalid source' }, { status: 400 });
  }
  if (!['mock', 'expo'].includes(body.transport))
    return Response.json({ error: 'Invalid transport' }, { status: 400 });
  await createScheduleStore(database).save(snapshot);
  await createNotificationRepository(database).publish(snapshot.day);
  let requests = 0;
  let messages = 0;
  let transportStatus = 0;
  const transport: typeof fetch = async (_url, options) => {
    requests++;
    messages += JSON.parse(String(options?.body)).length;
    const url = body.transport === 'expo' ? 'https://exp.host/--/api/v2/push/send' : `${env.BENCHMARK_URL}/expo-mock`;
    const response = await fetch(url, { ...options, ...(body.transport === 'mock' ? { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.BENCHMARK_RUN_TOKEN}` } } : {}) });
    transportStatus = response.status;
    return response;
  };
  const delivery = await dispatchPush(database, transport);
  const result = { source: body.source, transport: body.transport, requests, messages, transportStatus, ...delivery, ...database.metrics, wallMs: Date.now() - started };
  console.info(JSON.stringify({ operation: 'benchmark-run', ...result }));
  return Response.json(result);
}

export default {
  async fetch(request: Request, env: Bindings) {
    if (request.method !== 'POST' || !await authorized(request, env))
      return new Response('Not found', { status: 404 });
    const database = createD1Database(env.DB);
    const path = new URL(request.url).pathname;
    if (path === '/report')
      return Response.json({ states: await database.all({ sql: 'SELECT state, COUNT(*) AS deliveries FROM push_outbox GROUP BY state', params: [] }) });
    if (path === '/seed')
      return seed(database, request);
    if (path === '/run')
      return run(database, request, env);
    if (path === '/expo-mock') {
      const messages: unknown[] = await request.json();
      if (messages.length !== 100)
        return Response.json({ error: 'Expected 100 messages' }, { status: 400 });
      return Response.json({ data: messages.map(() => ({ status: 'ok', id: crypto.randomUUID() })) });
    }
    return new Response('Not found', { status: 404 });
  },
};
