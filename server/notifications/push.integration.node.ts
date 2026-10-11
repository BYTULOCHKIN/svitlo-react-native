import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import fixture from '../../src/features/svitlo/fixtures/poe-2026-10-10.json';
import { createNotificationsClient } from '../../src/features/svitlo/notifications/client';
import { createNotificationApi } from './api';
import { openLocalDatabase } from './local-database';
import { kyivToday, validatePilotHtml } from './pilot-source';
import { dispatchPush } from './push';
import { createNotificationRepository } from './repository';
import worker from './worker';

const day = validatePilotHtml(fixture.html, fixture.date);
const identity = () => ({ id: randomUUID(), secret: 'ab'.repeat(32) });
function setup() {
  const local = openLocalDatabase(':memory:');
  const repository = createNotificationRepository(local.database);
  return { ...local, repository };
}

test('authenticated client updates delivery; a token cannot expose history or authenticate another install', async () => {
  const p = setup();
  try {
    const user = identity();
    const api = createNotificationApi(p.repository);
    const request: typeof fetch = async (input, options) => api(new Request(String(input), options));
    const client = createNotificationsClient({ url: 'https://pilot.invalid', request, getIdentity: async () => user });
    await client.updateDelivery({ permission: 'granted', token: 'ExpoPushToken[device-1]' });
    const wrong = { 'X-Installation-Id': user.id, 'Authorization': `Bearer ${'cd'.repeat(32)}` };
    assert.equal((await api(new Request('https://pilot.invalid/v1/delivery', { method: 'PUT', headers: wrong, body: JSON.stringify({ permission: 'denied' }) }))).status, 401);
    await p.repository.publish(day);
    let calls = 0;
    const expo: typeof fetch = async (_input, options) => {
      calls++;
      const messages = JSON.parse(String(options?.body));
      assert.equal(messages[0].to, 'ExpoPushToken[device-1]');
      assert.equal(messages[0].data.notificationId, (await client.history()).items[0].id);
      return Response.json({ data: [{ status: 'ok', id: 'ticket-1' }] });
    };
    assert.deepEqual(await dispatchPush(p.database, expo), { attempted: 1, accepted: 1 });
    await p.repository.publish(day);
    await dispatchPush(p.database, expo);
    assert.equal(calls, 1);
    assert.equal((await client.history()).items.length, 1);
  }
  finally { p.close(); }
});

test('100 installations fan out into one Expo REST request with distinct history targets', async () => {
  const p = setup();
  try {
    const users = Array.from({ length: 100 }, identity);
    for (const [index, user] of users.entries()) {
      await p.repository.register(user);
      await p.repository.updateDelivery(user, { permission: 'granted', token: `ExpoPushToken[test-${index}]` });
    }
    let queries = 0;
    const counted = {
      ...p.database,
      batch: async (batch: Parameters<typeof p.database.batch>[0]) => {
        queries += batch.length;
        await p.database.batch(batch);
      },
      all: async <T>(query: Parameters<typeof p.database.all>[0]) => {
        queries++;
        return p.database.all<T>(query);
      },
    };
    await createNotificationRepository(counted).publish(day);
    let requests = 0;
    const expo: typeof fetch = async (_url, options) => {
      requests++;
      const messages = JSON.parse(String(options?.body));
      assert.equal(messages.length, 100);
      assert.equal(new Set(messages.map((message: { data: { notificationId: string } }) => message.data.notificationId)).size, 100);
      return Response.json({ data: messages.map((_message: unknown, index: number) => ({ status: 'ok', id: `ticket-${index}` })) });
    };
    assert.deepEqual(await dispatchPush(counted, expo), { attempted: 100, accepted: 100 });
    assert.equal(requests, 1);
    assert.equal(queries, 8, '100 recipients must not turn into 100 D1 statements');
    for (const user of users)
      assert.equal((await p.repository.history(user)).items.length, 1);
  }
  finally { p.close(); }
});

test('denial, late enable and permission revocation never backfill pushes; history remains', async () => {
  const p = setup();
  try {
    const user = identity();
    await p.repository.register(user);
    await p.repository.updateDelivery(user, { permission: 'denied' });
    await p.repository.publish(day);
    await p.repository.updateDelivery(user, { permission: 'granted', token: 'ExpoPushToken[phone]' });
    await p.repository.publish(day);
    const never: typeof fetch = async () => {
      throw new Error('must not send');
    };
    assert.equal((await dispatchPush(p.database, never)).attempted, 0);
    await p.repository.publish({ ...day, date: '2026-10-11' });
    await p.repository.updateDelivery(user, { permission: 'denied' });
    assert.equal((await dispatchPush(p.database, never)).attempted, 0);
    assert.equal((await p.repository.history(user)).items.length, 2);
  }
  finally { p.close(); }
});

test('ambiguous delivery is not duplicated, and DeviceNotRegistered clears only the rejected token', async () => {
  const p = setup();
  try {
    const user = identity();
    await p.repository.register(user);
    await p.repository.updateDelivery(user, { permission: 'granted', token: 'ExpoPushToken[old]' });
    await p.repository.publish(day);
    const failure: typeof fetch = async () => {
      throw new Error('network interrupted');
    };
    assert.deepEqual(await dispatchPush(p.database, failure), { attempted: 1, accepted: 0 });
    assert.deepEqual(await dispatchPush(p.database, failure), { attempted: 0, accepted: 0 });
    await p.repository.publish({ ...day, date: '2026-10-11' });
    const rejection: typeof fetch = async () => Response.json({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] });
    await dispatchPush(p.database, rejection);
    assert.equal((await p.database.first<{ push_token: string | null }>({ sql: 'SELECT push_token FROM installation_delivery WHERE installation_id = ?', params: [user.id] }))?.push_token, null);
    assert.equal((await p.repository.history(user)).items.length, 2);
  }
  finally { p.close(); }
});

test('a rotated token is used, temporary token failure preserves it, malformed delivery settings fail', async () => {
  const p = setup();
  try {
    const user = identity();
    await p.repository.register(user);
    const api = createNotificationApi(p.repository);
    const headers = { 'X-Installation-Id': user.id, 'Authorization': `Bearer ${user.secret}` };
    assert.equal((await api(new Request('https://pilot.invalid/v1/delivery', { method: 'PUT', headers, body: JSON.stringify({ permission: 'denied', token: 'ExpoPushToken[phone]' }) }))).status, 400);
    await p.repository.updateDelivery(user, { permission: 'granted', token: 'ExpoPushToken[old]' });
    await p.repository.updateDelivery(user, { permission: 'granted', token: 'ExpoPushToken[new]' });
    await p.repository.updateDelivery(user, { permission: 'granted' });
    await p.repository.publish(day);
    const expo: typeof fetch = async (_input, options) => {
      assert.equal(JSON.parse(String(options?.body))[0].to, 'ExpoPushToken[new]');
      return Response.json({ data: [{ status: 'ok', id: 'ticket' }] });
    };
    assert.equal((await dispatchPush(p.database, expo)).accepted, 1);
  }
  finally { p.close(); }
});

test('source validation rejects empty, wrong-date and unknown cells; date respects Kyiv midnight', () => {
  assert.throws(() => validatePilotHtml('', fixture.date));
  assert.throws(() => validatePilotHtml(fixture.html, '2026-10-11'));
  assert.throws(() => validatePilotHtml(fixture.html.replace('class="light_1"', 'class="unrecognized"'), fixture.date));
  assert.equal(kyivToday(new Date('2026-10-10T22:30:00Z')), '2026-10-11');
});

test('private publication trigger is inaccessible without the pilot environment and server secret', async () => {
  const binding = {
    prepare: () => {
      throw new Error('database must not be accessed');
    },
    batch: async () => [],
  };
  const secret = 'ab'.repeat(32);
  const request = (token: string) => new Request('https://pilot.invalid/pilot/publication', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await worker.fetch(request(secret), { DB: binding, ENVIRONMENT: 'production', PILOT_RUN_TOKEN: secret })).status, 404);
  assert.equal((await worker.fetch(request('wrong'), { DB: binding, ENVIRONMENT: 'pilot', PILOT_RUN_TOKEN: secret })).status, 404);
  assert.equal((await worker.fetch(request('short'), { DB: binding, ENVIRONMENT: 'pilot', PILOT_RUN_TOKEN: 'short' })).status, 404);
});
