import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import fixture from '../../src/features/svitlo/fixtures/poe-2026-10-10.json';
import { createNotificationsClient } from '../../src/features/svitlo/notifications/client';
import { parsePoeHtml } from '../../src/features/svitlo/poe-parser';
import { createNotificationApi } from './api';
import { openLocalDatabase } from './local-database';
import { canonicalSchedule, createNotificationRepository } from './repository';

const day = parsePoeHtml(fixture.html, fixture.date);
const identity = () => ({ id: randomUUID(), secret: 'ab'.repeat(32) });

function pilot(path = ':memory:') {
  const local = openLocalDatabase(path);
  const repository = createNotificationRepository(local.database, () => 1791676800000);
  const api = createNotificationApi(repository);
  const request: typeof fetch = async (input, options) => api(new Request(input instanceof Request ? input : String(input), options));
  const client = createNotificationsClient({ url: 'https://pilot.invalid', getIdentity: async () => user, request });
  const user = identity();
  return { ...local, repository, api, client, user, request };
}

test('captured HTML -> atomic publication -> authenticated API -> client without duplicates', async () => {
  const p = pilot();
  try {
    await Promise.all([p.client.connect(), p.client.connect()]);
    await p.repository.publish(day);
    await Promise.all([p.repository.publish(day), p.repository.publish(day)]);
    const page = await p.client.history();
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].scheduleDate, fixture.date);
    assert.equal(page.items[0].type, 'schedule-published');
    assert.deepEqual(await p.client.history(), page);
    assert.equal((await p.database.first<{ count: number }>({ sql: 'SELECT COUNT(*) AS count FROM installations', params: [] }))?.count, 1);
  }
  finally { p.close(); }
});

test('fresh install never receives old events, even with identical timestamps and publication replay', async () => {
  const p = pilot();
  try {
    await p.repository.publish(day);
    await p.client.connect();
    await p.repository.publish(day);
    assert.deepEqual((await p.client.history()).items, []);
    await p.repository.publish({ ...day, date: '2026-10-11' });
    assert.equal((await p.client.history()).items.length, 1);
  }
  finally { p.close(); }
});

test('ID alone, wrong secret, takeover and another install cannot expose a history', async () => {
  const p = pilot();
  try {
    await p.client.connect();
    await p.repository.publish(day);
    const headers = { 'X-Installation-Id': p.user.id, 'Authorization': `Bearer ${'cd'.repeat(32)}` };
    assert.equal((await p.api(new Request('https://pilot.invalid/v1/history', { headers }))).status, 401);
    assert.equal((await p.api(new Request('https://pilot.invalid/v1/history', { headers: { 'X-Installation-Id': p.user.id } }))).status, 400);
    assert.equal((await p.api(new Request('https://pilot.invalid/v1/installations', { method: 'POST', body: JSON.stringify({ ...p.user, secret: 'cd'.repeat(32) }) }))).status, 401);
    const stranger = identity();
    await p.repository.register(stranger);
    assert.equal((await p.repository.history(stranger)).items.length, 0);
    assert.equal((await p.client.history()).items.length, 1);
  }
  finally { p.close(); }
});

test('persisted identity and history survive reopening the SQLite database', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'svitlo-history-'));
  const path = join(directory, 'history.sqlite');
  const p = pilot(path);
  await p.client.connect();
  await p.repository.publish(day);
  p.close();
  const reopened = openLocalDatabase(path);
  try {
    const repository = createNotificationRepository(reopened.database, () => 1791676900000);
    const registration = await repository.register(p.user);
    assert.equal(registration.startedAt, 1791676800000);
    assert.equal((await repository.history(p.user)).items.length, 1);
  }
  finally {
    reopened.close();
    unlinkSync(path);
    rmdirSync(directory);
  }
});

test('invalid or incomplete schedules do not create history; normal row ordering is canonical', async () => {
  const p = pilot();
  try {
    await p.client.connect();
    await assert.rejects(p.repository.publish({ date: '2026-10-10', queues: [] }));
    await assert.rejects(p.repository.publish({ ...day, date: '2026-02-30' }));
    await assert.rejects(p.repository.publish({ ...day, queues: [{ queue: '1.1', intervals: [{ start: 0, end: 30, state: 'off' }] }] }));
    assert.deepEqual((await p.client.history()).items, []);
    assert.equal(canonicalSchedule(day), canonicalSchedule({ ...day, queues: [...day.queues].reverse() }));
  }
  finally { p.close(); }
});

test('stable pagination at equal timestamps contains every event exactly once', async () => {
  const p = pilot();
  try {
    await p.client.connect();
    for (let index = 0; index < 53; index++) {
      const date = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
      await p.repository.publish({ ...day, date });
    }
    const first = await p.client.history();
    assert.equal(first.items.length, 50);
    assert.ok(first.nextCursor);
    const second = await p.client.history(first.nextCursor);
    assert.equal(second.items.length, 3);
    assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 53);
    assert.equal(second.nextCursor, null);
    assert.equal((await p.api(new Request('https://pilot.invalid/v1/history?cursor=invalid', { headers: { 'X-Installation-Id': p.user.id, 'Authorization': `Bearer ${p.user.secret}` } }))).status, 400);
  }
  finally { p.close(); }
});

test('recipient write failure rolls back publication; the public API cannot inject fixtures', async () => {
  const p = pilot();
  try {
    await p.client.connect();
    await p.database.batch([{ sql: 'CREATE TEMP TRIGGER reject_history BEFORE INSERT ON notification_history BEGIN SELECT RAISE(ABORT, \'write failed\'); END', params: [] }]);
    await assert.rejects(p.repository.publish(day));
    assert.equal((await p.database.first<{ count: number }>({ sql: 'SELECT COUNT(*) AS count FROM notification_events', params: [] }))?.count, 0);
    assert.deepEqual((await p.client.history()).items, []);
    assert.equal((await p.api(new Request('https://pilot.invalid/dev/publications', { method: 'POST', body: JSON.stringify(day) }))).status, 404);
  }
  finally { p.close(); }
});
