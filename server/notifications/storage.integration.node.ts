import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNotificationsClient } from '../../src/features/svitlo/notifications/client';
import { createNotificationApi } from './api';
import { forwardBackend, triggerBackend } from './gateway-worker';
import { createHttpDatabase } from './http-database';
import { openLocalDatabase } from './local-database';
import { createNotificationRepository } from './repository';
import { createStorageGateway } from './storage-gateway';

const token = 'ab'.repeat(32);
const url = 'https://storage.invalid';

test('outbox claim reads and updates use the claim index rather than scanning delivered history', async () => {
  const local = openLocalDatabase(':memory:');
  try {
    for (const sql of ['SELECT history_id FROM push_outbox WHERE claim_key = ?', 'UPDATE push_outbox SET state = \'sent\' WHERE claim_key = ?']) {
      const plan = await local.database.all<{ detail: string }>({ sql: `EXPLAIN QUERY PLAN ${sql}`, params: ['new-claim'] });
      assert.ok(plan.some(step => step.detail.includes('USING INDEX push_outbox_claim_key')));
    }
  }
  finally { local.close(); }
});

function command(value: unknown, secret = token) {
  return new Request(`${url}/internal/database`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    body: JSON.stringify(value),
  });
}

test('storage gateway authenticates before reading SQL and rejects malformed, oversized and management commands', async () => {
  const local = openLocalDatabase(':memory:');
  const api = createStorageGateway(local.database, token);
  try {
    const read = { operation: 'first', queries: [{ sql: 'SELECT COUNT(*) AS count FROM installations', params: [] }] };
    assert.equal((await api(command(read, 'wrong'))).status, 404);
    assert.equal((await createStorageGateway(local.database)(command(read))).status, 404);
    assert.equal((await api(command(read))).status, 200);
    for (const value of [null, {}, { ...read, queries: [] }, { ...read, queries: Array.from({ length: 21 }, () => read.queries[0]) }, { operation: 'batch', queries: [{ sql: 'DROP TABLE installations', params: [] }] }, { operation: 'all', queries: [{ sql: 'DELETE FROM installations', params: [] }] }, { ...read, queries: [{ sql: 'SELECT 1; DELETE FROM installations', params: [] }] }, { ...read, queries: [{ sql: 'SELECT ?', params: [null] }] }]) {
      assert.equal((await api(command(value))).status, 400);
    }
    assert.equal((await api(new Request(`${url}/internal/database`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: 'x'.repeat(128001) }))).status, 413);
  }
  finally { local.close(); }
});

test('Node storage adapter keeps batch writes atomic and never retries ambiguous mutations', async () => {
  const local = openLocalDatabase(':memory:');
  const api = createStorageGateway(local.database, token);
  const request: typeof fetch = async (input, init) => api(new Request(String(input), init));
  const database = createHttpDatabase({ url, token, request });
  try {
    await database.batch([{ sql: 'INSERT INTO backend_jobs (name, owner, lease_until) VALUES (?, ?, ?)', params: ['test', 'first', 1] }]);
    await assert.rejects(database.batch([
      { sql: 'UPDATE backend_jobs SET owner = ? WHERE name = ?', params: ['changed', 'test'] },
      { sql: 'INSERT INTO nonexistent_table (id) VALUES (?)', params: [1] },
    ]));
    assert.equal((await database.first<{ owner: string }>({ sql: 'SELECT owner FROM backend_jobs WHERE name = ?', params: ['test'] }))?.owner, 'first');
    assert.equal((await database.all({ sql: 'SELECT * FROM backend_jobs', params: [] })).length, 1);
    let writes = 0;
    const failing = createHttpDatabase({ url, token, request: async () => {
      writes++;
      throw new Error('Response lost');
    } });
    await assert.rejects(failing.batch([{ sql: 'DELETE FROM backend_jobs', params: [] }]));
    assert.equal(writes, 1);
    assert.throws(() => createHttpDatabase({ url: 'http://storage.invalid', token }));
    assert.throws(() => createHttpDatabase({ url: 'https://user:pass@storage.invalid', token }));
    const malformed = createHttpDatabase({ url, token, request: async () => Response.json({ ok: false }) });
    await assert.rejects(malformed.batch([{ sql: 'DELETE FROM backend_jobs', params: [] }]));
    await assert.rejects(malformed.first({ sql: 'SELECT 1', params: [] }));
  }
  finally { local.close(); }
});

test('Cloudflare tick only sends an authenticated trigger and does not parse source or Expo results', async () => {
  let calls = 0;
  const request: typeof fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), 'https://backend.invalid/internal/tick');
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'manual');
    assert.equal(new Headers(init?.headers).get('Authorization'), `Bearer ${token}`);
    return new Response('not JSON, deliberately unused', { status: 200 });
  };
  assert.equal((await triggerBackend({}, request)).configured, false);
  assert.equal(calls, 0);
  assert.deepEqual(await triggerBackend({ BACKEND_URL: 'https://backend.invalid', TICK_RUN_TOKEN: token }, request), { configured: true, ok: true, status: 200 });
  assert.equal(calls, 1);
  assert.equal((await triggerBackend({ BACKEND_URL: 'https://backend.invalid', TICK_RUN_TOKEN: token }, async () => new Response('', { status: 503 }))).ok, false);
  assert.deepEqual(await triggerBackend({ BACKEND_URL: 'https://backend.invalid', TICK_RUN_TOKEN: token }, async (_input, init) => {
    assert.equal(init?.redirect, 'manual');
    return new Response(null, { status: 302, headers: { Location: 'https://other.invalid' } });
  }), { configured: true, ok: false, status: 302 });
});

test('compatibility forwarding preserves installation identity and date without leaking gateway secrets', async () => {
  const input = new Request('https://storage.invalid/v1/history?cursor=123%7Cid', { headers: { 'Authorization': 'Bearer installation-secret', 'X-Installation-Id': 'installation', 'Cookie': 'private-browser-cookie' } });
  const response = await forwardBackend(input, 'https://backend.invalid', async (url, init) => {
    assert.equal(String(url), 'https://backend.invalid/v1/history?cursor=123%7Cid');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('Authorization'), 'Bearer installation-secret');
    assert.equal(headers.get('X-Installation-Id'), 'installation');
    assert.equal(headers.get('Cookie'), null);
    assert.equal(init?.redirect, 'manual');
    return Response.json({ items: [], nextCursor: null });
  });
  assert.equal(response.status, 200);
  await assert.rejects(forwardBackend(new Request('https://storage.invalid/v1/installations', { method: 'POST', body: 'x'.repeat(4097) }), 'https://backend.invalid'));
});

test('large grouped-warning pages retain every location and paginate through the bounded storage adapter', async () => {
  const local = openLocalDatabase(':memory:');
  const gateway = createStorageGateway(local.database, token);
  const database = createHttpDatabase({ url, token, request: async (input, init) => gateway(new Request(String(input), init)) });
  const api = createNotificationApi(createNotificationRepository(database));
  const identity = { id: crypto.randomUUID(), secret: 'ab'.repeat(32) };
  const client = createNotificationsClient({ url: 'https://test.invalid', getIdentity: async () => identity, request: async (input, init) => api(new Request(String(input), init)) });
  try {
    await client.connect();
    const locations = Array.from({ length: 50 }, (_, index) => ({ id: `${'a'.repeat(60)}${String(index).padStart(4, '0')}`, name: 'Д'.repeat(20) }));
    const details = JSON.stringify({ queue: '1.1', outageAt: Date.parse('2026-11-09T08:00:00Z'), locations });
    for (let index = 0; index < 51; index++) {
      const id = `large-warning:${index}`;
      await local.database.batch([
        { sql: 'INSERT INTO notification_events (id,type,schedule_date,version,created_at) VALUES (?,?,?,?,?)', params: [id, 'outage-warning', '2026-11-09', 'ab'.repeat(32), 1000 + index] },
        { sql: 'INSERT INTO notification_history (id,installation_id,event_id,created_at,details) VALUES (?,?,?,?,?)', params: [id, identity.id, id, 1000 + index, details] },
      ]);
    }
    const first = await client.history();
    assert.equal(first.items.length, 50);
    assert.ok(first.nextCursor);
    for (const item of first.items) {
      assert.equal(item.type, 'outage-warning');
      if (item.type === 'outage-warning')
        assert.deepEqual(item.locations, locations);
    }
    const next = await client.history(first.nextCursor!);
    assert.equal(next.items.length, 1);
    assert.equal(next.nextCursor, null);
  }
  finally { local.close(); }
});
