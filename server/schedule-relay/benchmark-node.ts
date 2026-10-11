import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import fixture from '../../src/features/svitlo/fixtures/poe-2026-10-10.json';
import { createHttpDatabase } from '../notifications/http-database';
import { kyivToday, validatePilotHtml } from '../notifications/pilot-source';
import { createBackendApi } from './backend';

async function main() {
  const url = process.env.SVITLO_STORAGE_BENCHMARK_URL ?? '';
  const tokenFile = process.env.SVITLO_STORAGE_BENCHMARK_TOKEN_FILE;
  // A mistaken production URL must never allow the disposable seed to run.
  if (new URL(url).hostname !== 'svitlo-notifications-storage-benchmark.svitlonorify.workers.dev' || !tokenFile)
    throw new Error('Use the dedicated storage benchmark Worker and token file');
  let gatewayRequests = 0;
  const database = createHttpDatabase({ url, token: readFileSync(tokenFile, 'utf8').trim(), request: async (input, init) => {
    gatewayRequests++;
    return fetch(input, init);
  } });
  const results: unknown[] = [];
  const parsed = validatePilotHtml(fixture.html, fixture.date);
  for (let iteration = 1; iteration <= 3; iteration++) {
    await database.batch(['push_outbox', 'notification_history', 'installation_delivery', 'installations', 'notification_events', 'schedule_snapshots', 'backend_jobs'].map(name => ({ sql: `DELETE FROM ${name}`, params: [] })));
    const users = Array.from({ length: 100 }, () => ({ id: randomUUID(), hash: randomBytes(32).toString('hex'), token: `ExponentPushToken[svitloTest${randomBytes(9).toString('base64url')}]` }));
    const payload = JSON.stringify(users);
    await database.batch([
      { sql: `INSERT INTO installations (id, secret_hash, started_at, start_sequence)
        SELECT json_extract(value, '$.id'), json_extract(value, '$.hash'), ?, 0 FROM json_each(?)`, params: [Date.now(), payload] },
      { sql: `INSERT INTO installation_delivery (installation_id, permission, push_token, enabled_after_sequence)
        SELECT json_extract(value, '$.id'), 'granted', json_extract(value, '$.token'), 0 FROM json_each(?)`, params: [payload] },
    ]);
    let now = Date.now();
    let tomorrow = false;
    let expoRequests = 0;
    let messages = 0;
    const tickToken = randomBytes(32).toString('hex');
    const today = kyivToday(new Date(now));
    const options = {
      database,
      tickToken,
      now: () => now,
      source: async (date: string) => {
        if (date !== today && !tomorrow)
          throw new Error('Tomorrow not published yet');
        return { day: { ...parsed, date }, verifiedAt: now };
      },
      transport: (async (_input, init) => {
        expoRequests++;
        const recipients: unknown[] = JSON.parse(String(init?.body));
        messages += recipients.length;
        return Response.json({ data: recipients.map(() => ({ status: 'ok', id: randomUUID() })) });
      }) as typeof fetch,
    };
    const api = createBackendApi(options);
    const tick = () => new Request('https://backend.invalid/internal/tick', { method: 'POST', headers: { Authorization: `Bearer ${tickToken}` } });
    await api(tick());
    now += 60000;
    tomorrow = true;
    gatewayRequests = 0;
    const started = performance.now();
    const cpuStart = process.cpuUsage();
    const response = await api(tick());
    const result = await response.json();
    const cpu = process.cpuUsage(cpuStart);
    const wallMs = Math.round(performance.now() - started);
    const requests = gatewayRequests;
    const replay = await (await createBackendApi(options)(tick())).json();
    const history = await database.first<{ count: number; targets: number }>({ sql: 'SELECT COUNT(*) AS count, COUNT(DISTINCT installation_id) AS targets FROM notification_history', params: [] });
    if (response.status !== 200 || result.accepted !== 100 || expoRequests !== 1 || messages !== 100 || history?.count !== 100 || history.targets !== 100 || !replay.skipped)
      throw new Error('Node benchmark did not preserve the 100-recipient contract');
    const summary = { iteration, gatewayRequests: requests, expoRequests, messages, accepted: result.accepted, history: history.count, targets: history.targets, replaySkipped: replay.skipped, nodeCpuMs: Math.round((cpu.user + cpu.system) / 1000), wallMs };
    results.push(summary);
    console.log(JSON.stringify(summary));
  }
  writeFileSync('.expo/notifications/backend-benchmark-results.json', JSON.stringify(results, null, 2));
}

void main().catch(() => {
  console.error('Node benchmark failed; secrets and recipient data omitted');
  process.exitCode = 1;
});
