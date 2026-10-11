import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import fixture from '../../src/features/svitlo/fixtures/poe-2026-10-10.json';
import { createNotificationsClient } from '../../src/features/svitlo/notifications/client';
import { createHttpDatabase } from '../notifications/http-database';
import { openLocalDatabase } from '../notifications/local-database';
import { validatePilotHtml } from '../notifications/pilot-source';
import { createNotificationRepository } from '../notifications/repository';
import { createStorageGateway } from '../notifications/storage-gateway';
import { createBackendApi } from './backend';

const token = 'ab'.repeat(32);
const initial = Date.parse('2026-10-10T12:00:00Z');
const day = validatePilotHtml(fixture.html, fixture.date);
const tick = () => new Request('https://backend.invalid/internal/tick', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });

function pipeline() {
  const local = openLocalDatabase(':memory:');
  const gateway = createStorageGateway(local.database, token);
  const database = createHttpDatabase({ url: 'https://storage.invalid', token, request: async (input, init) => gateway(new Request(String(input), init)) });
  let now = initial;
  let tomorrowAvailable = false;
  let sourceFailed = false;
  let sourceCalls = 0;
  let deliveries = 0;
  let messages = 0;
  const options = {
    database,
    tickToken: token,
    now: () => now,
    source: async (date: string) => {
      sourceCalls++;
      if (sourceFailed || (date !== day.date && !tomorrowAvailable))
        throw new Error('Source unavailable');
      return { day: { ...day, date }, verifiedAt: now };
    },
    transport: (async (_input, init) => {
      deliveries++;
      const payload: unknown[] = JSON.parse(String(init?.body));
      messages += payload.length;
      return Response.json({ data: payload.map(() => ({ status: 'ok', id: randomUUID() })) });
    }) as typeof fetch,
  };
  const api = createBackendApi(options);
  const identity = { id: randomUUID(), secret: 'cd'.repeat(32) };
  const client = createNotificationsClient({ url: 'https://backend.invalid', getIdentity: async () => identity, request: async (input, init) => api(new Request(String(input), init)) });
  return { ...local, database, options, api, identity, client, advance: () => {
    now += 60000;
  }, tomorrow: () => {
    tomorrowAvailable = true;
  }, fail: () => {
    sourceFailed = true;
  }, recover: () => {
    sourceFailed = false;
  }, counts: () => ({ sourceCalls, deliveries, messages }) };
}

test('Render serves public JSON and authenticated history; initial schedules do not backfill publications', async () => {
  const p = pipeline();
  try {
    await p.client.connect();
    assert.equal((await p.api(new Request('https://backend.invalid/v1/schedules'))).status, 404);
    assert.equal((await p.api(new Request('https://backend.invalid/internal/tick', { method: 'POST' }))).status, 404);
    assert.equal(p.counts().sourceCalls, 0);
    assert.equal((await p.api(tick())).status, 200);
    const snapshot = await (await p.api(new Request('https://backend.invalid/v1/schedules'))).json();
    assert.equal(snapshot.queues.length, 12);
    assert.equal(snapshot.verifiedAt, initial);
    assert.equal(snapshot.stale, false);
    assert.deepEqual((await p.client.history()).items, []);
    assert.equal((await p.api(new Request('https://backend.invalid/v1/history', { headers: { 'Authorization': `Bearer ${token}`, 'X-Installation-Id': p.identity.id } }))).status, 401);
    assert.equal((await p.api(new Request('https://backend.invalid/internal/database', { method: 'POST' }))).status, 404);
  }
  finally { p.close(); }
});

test('100 installations: Node sends one Expo batch; repeated and restarted ticks preserve one history card', async () => {
  const p = pipeline();
  try {
    const repository = createNotificationRepository(p.database, p.options.now);
    const identities = Array.from({ length: 100 }, () => ({ id: randomUUID(), secret: 'cd'.repeat(32) }));
    for (const identity of identities) {
      await repository.register(identity);
      await repository.updateDelivery(identity, { permission: 'granted', token: `ExponentPushToken[svitloTest${identity.id.replace(/-/g, '').slice(0, 12)}]` });
    }
    await p.api(tick());
    p.advance();
    p.tomorrow();
    const replies = await Promise.all(Array.from({ length: 6 }, () => createBackendApi(p.options)(tick())));
    assert.equal(replies.filter(response => response.status === 200).length, 6);
    assert.deepEqual(p.counts(), { sourceCalls: 4, deliveries: 1, messages: 100 });
    const restarted = createBackendApi(p.options);
    assert.equal((await (await restarted(tick())).json()).skipped, true);
    p.advance();
    await restarted(tick());
    assert.equal(p.counts().deliveries, 1);
    for (const identity of identities) {
      const history = await repository.history(identity);
      assert.equal(history.items.length, 1);
      assert.equal(history.items[0].scheduleDate, '2026-10-11');
    }
    assert.equal((await p.database.first<{ count: number }>({ sql: 'SELECT COUNT(*) AS count FROM push_outbox WHERE state = ?', params: ['sent'] }))?.count, 100);
  }
  finally { p.close(); }
});

test('a completely failed first poll does not turn the first valid baseline into old publication pushes', async () => {
  const p = pipeline();
  try {
    await p.client.connect();
    await p.client.updateDelivery({ permission: 'granted', token: 'ExponentPushToken[svitloTestabcdefgh1234]' });
    p.fail();
    await p.api(tick());
    p.advance();
    p.recover();
    p.tomorrow();
    await createBackendApi(p.options)(tick());
    assert.deepEqual((await p.client.history()).items, []);
    assert.equal(p.counts().deliveries, 0);
    assert.equal((await p.api(new Request('https://backend.invalid/v1/schedules'))).status, 200);
  }
  finally { p.close(); }
});

test('source failure keeps the last verified cache and still drains an already durable outbox', async () => {
  const p = pipeline();
  try {
    await p.client.connect();
    await p.client.updateDelivery({ permission: 'granted', token: 'ExponentPushToken[svitloTestabcdefgh1234]' });
    await p.api(tick());
    await createNotificationRepository(p.database, p.options.now).publish(day);
    p.fail();
    for (let index = 0; index < 6; index++)
      p.advance();
    const result = await (await createBackendApi(p.options)(tick())).json();
    assert.equal(result.sources.every((source: { valid: boolean }) => !source.valid), true);
    assert.equal(result.accepted, 1);
    const snapshot = await (await p.api(new Request('https://backend.invalid/v1/schedules'))).json();
    assert.equal(snapshot.verifiedAt, initial);
    assert.equal(snapshot.stale, true);
    assert.equal((await p.client.history()).items.length, 1);
  }
  finally { p.close(); }
});

test('source diagnostics expose only a network code and preserve the verified cache', async () => {
  const p = pipeline();
  try {
    await p.api(tick());
    p.advance();
    const api = createBackendApi({ ...p.options, source: async () => {
      throw new Error('private upstream headers and credentials', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } });
    } });
    const response = await api(tick());
    const result = await response.json();
    assert.equal(result.sources.length, 2);
    for (const source of result.sources) {
      assert.equal(source.valid, false);
      assert.equal(source.stage, 'fetch');
      assert.equal(source.reason, 'UND_ERR_CONNECT_TIMEOUT');
    }
    assert.equal(JSON.stringify(result).includes('private upstream'), false);
    const snapshot = await (await api(new Request('https://backend.invalid/v1/schedules'))).json();
    assert.equal(snapshot.verifiedAt, initial);
  }
  finally { p.close(); }
});

test('an interrupted lease blocks parallel work then expires; claimed pushes are not resent after restart', async () => {
  const p = pipeline();
  try {
    await p.client.connect();
    await p.client.updateDelivery({ permission: 'granted', token: 'ExponentPushToken[svitloTestabcdefgh1234]' });
    await p.api(tick());
    await createNotificationRepository(p.database, p.options.now).publish(day);
    await p.database.batch([
      { sql: 'UPDATE push_outbox SET state = ? WHERE state = ?', params: ['claimed', 'queued'] },
      { sql: 'UPDATE backend_jobs SET owner = ?, lease_until = ? WHERE name = ?', params: ['interrupted', initial + 300000, 'schedule-poll'] },
    ]);
    p.advance();
    assert.equal((await (await createBackendApi(p.options)(tick())).json()).skipped, true);
    assert.equal(p.counts().sourceCalls, 2);
    for (let index = 0; index < 4; index++)
      p.advance();
    assert.equal((await (await createBackendApi(p.options)(tick())).json()).skipped, false);
    assert.equal(p.counts().deliveries, 0);
    assert.equal((await p.client.history()).items.length, 1);
  }
  finally { p.close(); }
});
