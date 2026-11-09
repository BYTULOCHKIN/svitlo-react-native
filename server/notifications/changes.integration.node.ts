import type { ScheduleDay } from '../../src/features/svitlo/models';
import type { NotificationDatabase } from './database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { createNotificationsClient } from '../../src/features/svitlo/notifications/client';
import { createBackendApi } from '../schedule-relay/backend';
import { openLocalDatabase } from './local-database';
import { canonicalSchedule, createNotificationRepository } from './repository';
import { createScheduleChangeRecorder, scheduleDifference } from './schedule-changes';
import { createScheduleStore } from './schedules';

const initial = Date.parse('2026-11-09T08:29:00Z');
const token = 'ab'.repeat(32);
const baseline: ScheduleDay = { date: '2026-11-09', queues: ['1.1', '2.1'].map(queue => ({ queue, intervals: [{ start: 0, end: 1440, state: 'on' }] })) };
function outage(start: number, end: number, date = baseline.date): ScheduleDay {
  return { date, queues: [baseline.queues[0], { queue: '2.1', intervals: [
    ...(start ? [{ start: 0, end: start, state: 'on' as const }] : []),
    { start, end, state: 'off' },
    ...(end < 1440 ? [{ start: end, end: 1440, state: 'on' as const }] : []),
  ] }] };
}
function pipeline() {
  const local = openLocalDatabase(':memory:');
  let now = initial;
  const days = new Map([baseline, { ...baseline, date: '2026-11-10' }].map(day => [day.date, day]));
  const messages: { title: string; data: { notificationId: string } }[] = [];
  const options = {
    database: local.database,
    tickToken: token,
    now: () => now,
    source: async (date: string) => {
      const day = days.get(date);
      if (!day)
        throw new Error('Source unavailable');
      return { day, verifiedAt: now };
    },
    transport: (async (_input, init) => {
      const batch = JSON.parse(String(init?.body));
      messages.push(...batch);
      return Response.json({ data: batch.map(() => ({ status: 'ok', id: randomUUID() })) });
    }) as typeof fetch,
  };
  const api = createBackendApi(options);
  const client = () => {
    const identity = { id: randomUUID(), secret: 'cd'.repeat(32) };
    return createNotificationsClient({ url: 'https://backend.invalid', getIdentity: async () => identity, request: async (input, init) => api(new Request(String(input), init)) });
  };
  const tick = () => new Request('https://backend.invalid/internal/tick', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  return { ...local, api, options, days, messages, client, tick, advance: () => {
    now += 60000;
  } };
}

test('regional changes reach every connected client, retain denied history, survive reversions and restarts', async () => {
  const p = pipeline();
  try {
    const clients = [p.client(), p.client(), p.client()];
    for (const [index, client] of clients.entries())
      await client.updateDelivery(index < 2 ? { permission: 'granted', token: `ExponentPushToken[test${index}]` } : { permission: 'denied' });
    await p.api(p.tick());
    for (const day of [outage(600, 660), baseline, outage(600, 660)]) {
      p.advance();
      p.days.set(day.date, day);
      await createBackendApi(p.options)(p.tick());
      await createBackendApi(p.options)(p.tick());
    }
    assert.equal(p.messages.length, 6);
    assert.ok(p.messages.every(message => message.title === 'Графік змінено'));
    for (const client of clients) {
      const history = (await client.history()).items;
      assert.equal(history.length, 3);
      assert.ok(history.every(item => item.type === 'schedule-changed' && item.scheduleDate === baseline.date));
      assert.equal(new Set(history.map(item => item.id)).size, 3);
      assert.equal(history[0].version, history[2].version);
    }
    const fresh = p.client();
    await fresh.connect();
    p.advance();
    await p.api(p.tick());
    assert.deepEqual((await fresh.history()).items, []);
    assert.equal(p.messages.length, 6);
  }
  finally { p.close(); }
});

test('one changed queue fans out once to 100 regional targets in one batch', async () => {
  const p = pipeline();
  try {
    const repository = createNotificationRepository(p.database, p.options.now);
    for (let index = 0; index < 100; index++) {
      const identity = { id: randomUUID(), secret: 'cd'.repeat(32) };
      await repository.register(identity);
      await repository.updateDelivery(identity, { permission: 'granted', token: `ExponentPushToken[regional${index}]` });
    }
    await p.api(p.tick());
    p.days.set(baseline.date, outage(600, 660));
    p.advance();
    const result = await (await p.api(p.tick())).json();
    assert.equal(result.accepted, 100);
    assert.equal(p.messages.length, 100);
    assert.equal(new Set(p.messages.map(message => message.data.notificationId)).size, 100);
    p.advance();
    await createBackendApi(p.options)(p.tick());
    assert.equal(p.messages.length, 100);
  }
  finally { p.close(); }
});

test('past-only corrections are history-only; an interval ending exactly now is past', async () => {
  const p = pipeline();
  try {
    const client = p.client();
    await client.updateDelivery({ permission: 'granted', token: 'ExponentPushToken[test]' });
    await p.api(p.tick());
    p.days.set(baseline.date, outage(600, 630));
    p.advance(); // 10:30 Kyiv, precisely the corrected interval end.
    await p.api(p.tick());
    assert.equal(p.messages.length, 0);
    assert.equal((await client.history()).items.length, 1);
    p.days.set(baseline.date, outage(600, 660));
    p.advance();
    await p.api(p.tick());
    assert.equal(p.messages.length, 1);
    assert.equal((await client.history()).items.length, 2);
  }
  finally { p.close(); }
});

test('tomorrow midnight changes notify; identical past hours today remain silent', async () => {
  const p = pipeline();
  try {
    const client = p.client();
    await client.updateDelivery({ permission: 'granted', token: 'ExponentPushToken[test]' });
    await p.api(p.tick());
    p.days.set(baseline.date, outage(0, 30));
    p.days.set('2026-11-10', outage(0, 30, '2026-11-10'));
    p.advance();
    await p.api(p.tick());
    const history = (await client.history()).items;
    assert.equal(history.length, 2);
    assert.equal(p.messages.length, 1);
    assert.equal(history.find(item => item.id === p.messages[0].data.notificationId)?.scheduleDate, '2026-11-10');
    assert.equal(scheduleDifference(baseline, outage(0, 30), Date.parse('2026-11-09T22:00:00Z')).future, false);
  }
  finally { p.close(); }
});

test('queue order, identical adjacent segments and verification timestamps never create changes', async () => {
  const p = pipeline();
  try {
    const client = p.client();
    await client.connect();
    await p.api(p.tick());
    const formatted: ScheduleDay = { ...baseline, verifiedAt: 1, queues: [...baseline.queues].reverse().map(queue => ({ ...queue, intervals: [{ start: 0, end: 720, state: 'on' }, { start: 720, end: 1440, state: 'on' }] })) };
    assert.equal(canonicalSchedule(formatted), canonicalSchedule(baseline));
    p.days.set(baseline.date, formatted);
    p.advance();
    await p.api(p.tick());
    assert.deepEqual((await client.history()).items, []);
    assert.equal((await createScheduleStore(p.database).get(baseline.date))?.revision, 0);
    const noOutages: ScheduleDay = { date: baseline.date, queues: [], noOutagesScope: 'region' };
    assert.deepEqual(scheduleDifference(baseline, noOutages, initial), { changed: false, future: false });
    assert.equal(scheduleDifference(outage(600, 660), noOutages, initial).future, true);
  }
  finally { p.close(); }
});

test('snapshot, change event, history and outbox roll back together; stale writers cannot override the winner', async () => {
  const p = pipeline();
  try {
    await p.client().updateDelivery({ permission: 'granted', token: 'ExponentPushToken[test]' });
    await p.api(p.tick());
    const store = createScheduleStore(p.database);
    const previous = (await store.get(baseline.date))!;
    const next = { day: outage(0, 30), verifiedAt: previous.verifiedAt + 60000 };
    const failing: NotificationDatabase = { ...p.database, batch: queries => p.database.batch([...queries, { sql: 'INSERT INTO nonexistent_table VALUES (?)', params: [1] }]) };
    await assert.rejects(createScheduleChangeRecorder(failing, () => next.verifiedAt)(previous, next));
    assert.deepEqual(await store.get(baseline.date), previous);
    assert.equal((await p.database.all({ sql: 'SELECT id FROM notification_events', params: [] })).length, 0);
    const record = createScheduleChangeRecorder(p.database, () => next.verifiedAt);
    await record(previous, next);
    await record(previous, { day: outage(600, 700), verifiedAt: next.verifiedAt + 1 });
    await record(previous, { day: baseline, verifiedAt: next.verifiedAt + 2 });
    assert.equal((await store.get(baseline.date))?.revision, 1);
    assert.equal(canonicalSchedule((await store.get(baseline.date))!.day), canonicalSchedule(next.day));
    assert.equal((await p.database.all({ sql: 'SELECT id FROM notification_events', params: [] })).length, 1);
    assert.equal((await p.database.all({ sql: 'SELECT history_id FROM push_outbox', params: [] })).length, 0);
  }
  finally { p.close(); }
});

test('a failed first-publication snapshot rolls back its event and retries once on the next tick', async () => {
  const p = pipeline();
  try {
    const client = p.client();
    await client.updateDelivery({ permission: 'granted', token: 'ExponentPushToken[test]' });
    p.days.delete('2026-11-10');
    await p.api(p.tick());
    p.days.set('2026-11-10', { ...baseline, date: '2026-11-10' });
    p.advance();
    const failing: NotificationDatabase = {
      ...p.database,
      batch: queries => p.database.batch(queries.some(query => query.sql.includes('INSERT INTO schedule_snapshots')) && queries.some(query => query.sql.includes('INSERT OR IGNORE INTO notification_events'))
        ? [...queries, { sql: 'INSERT INTO nonexistent_table VALUES (?)', params: [1] }]
        : queries),
    };
    await createBackendApi({ ...p.options, database: failing })(p.tick());
    assert.equal(await createScheduleStore(p.database).get('2026-11-10'), undefined);
    assert.deepEqual((await client.history()).items, []);
    p.advance();
    await p.api(p.tick());
    assert.equal((await client.history()).items.length, 1);
    assert.equal(p.messages.length, 1);
    assert.equal(p.messages[0].title, 'Опубліковано графік');
  }
  finally { p.close(); }
});

test('legacy migration preserves history, delivery, foreign keys and the deleted-event sequence high-water mark', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'svitlo-migrate-'));
  const path = join(directory, 'history.sqlite');
  try {
    const old = new DatabaseSync(path);
    old.exec('PRAGMA foreign_keys = ON');
    for (const file of ['0001-history.sql', '0002-delivery.sql', '0003-schedules.sql', '0004-backend-jobs.sql', '0005-outbox-claim-index.sql'])
      old.exec(readFileSync(join('server/notifications/migrations', file), 'utf8'));
    old.exec(`INSERT INTO installations VALUES ('old', 'hash', 1, 100);
      INSERT INTO notification_events VALUES (7, 'old-event', 'schedule-published', '2026-11-08', '${'ab'.repeat(32)}', 1);
      INSERT INTO notification_events VALUES (100, 'deleted-event', 'schedule-published', '2026-11-08', '${'ab'.repeat(32)}', 1);
      DELETE FROM notification_events WHERE id = 'deleted-event';
      INSERT INTO notification_history VALUES ('old-history', 'old', 'old-event', 1);
      INSERT INTO push_outbox VALUES ('old-history', 'sent', 'old-claim', 'original-ticket', '');`);
    old.close();
    const migrated = openLocalDatabase(path);
    assert.deepEqual({ ...await migrated.database.first<Record<string, unknown>>({ sql: 'SELECT * FROM push_outbox', params: [] }) }, { history_id: 'old-history', state: 'sent', claim_key: 'old-claim', ticket_id: 'original-ticket', error: '' });
    assert.deepEqual(await migrated.database.all({ sql: 'PRAGMA foreign_key_check', params: [] }), []);
    await createNotificationRepository(migrated.database, () => initial).publish(baseline);
    assert.ok((await migrated.database.first<{ sequence: number }>({ sql: 'SELECT MAX(sequence) AS sequence FROM notification_events', params: [] }))!.sequence > 100);
    assert.equal((await migrated.database.all({ sql: 'SELECT id FROM notification_history', params: [] })).length, 2);
    migrated.close();
    const reopened = openLocalDatabase(path);
    assert.equal((await reopened.database.all({ sql: 'SELECT id FROM notification_history', params: [] })).length, 2);
    reopened.close();
  }
  finally { rmSync(directory, { recursive: true, force: true }); }
});
