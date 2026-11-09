import type { ScheduleDay } from '../../src/features/svitlo/models';
import type { NotificationPreferences } from '../../src/features/svitlo/notifications/models';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { createNotificationsClient } from '../../src/features/svitlo/notifications/client';
import { createBackendApi } from '../schedule-relay/backend';
import { openLocalDatabase } from './local-database';
import { formOutageWarnings, kyivTimestamp, outageCandidates } from './outage-warnings';
import { dispatchPush, publicationMessage } from './push';
import { createNotificationRepository } from './repository';
import { createScheduleChangeRecorder } from './schedule-changes';
import { createScheduleStore } from './schedules';

const date = '2026-11-09';
const token = 'test-tick-token'.repeat(4);
function day(queues = ['1.1', '1.2'], start = 600, end = 660): ScheduleDay {
  return { date, queues: queues.map(queue => ({ queue, intervals: [
    ...(start ? [{ start: 0, end: start, state: 'on' as const }] : []),
    { start, end, state: 'off' as const },
    ...(end < 1440 ? [{ start: end, end: 1440, state: 'on' as const }] : []),
  ] })) };
}
const home = { id: 'home', name: 'Дім', queue: '1.1', enabled: true };
const work = { id: 'work', name: 'Робота', queue: '1.1', enabled: true };
const school = { id: 'school', name: 'Школа', queue: '1.2', enabled: true };
function pipeline(start = '2026-11-09T07:48:00Z', schedule = day()) {
  const local = openLocalDatabase(':memory:');
  let now = Date.parse(start);
  let available = true;
  const days = new Map([schedule, { ...schedule, date: '2026-11-10' }].map(item => [item.date, item]));
  const messages: ReturnType<typeof publicationMessage>[] = [];
  const transport: typeof fetch = async (_input, init) => {
    const batch = JSON.parse(String(init?.body));
    messages.push(...batch);
    return Response.json({ data: batch.map(() => ({ status: 'ok', id: randomUUID() })) });
  };
  const options = { database: local.database, tickToken: token, now: () => now, transport, source: async (key: string) => {
    if (!available || !days.has(key))
      throw new Error('Unavailable');
    return { day: days.get(key)!, verifiedAt: now };
  } };
  function client() {
    const identity = { id: randomUUID(), secret: 'ab'.repeat(32) };
    return createNotificationsClient({ url: 'https://test.invalid', getIdentity: async () => identity, request: async (input, init) => createBackendApi(options)(new Request(String(input), init)) });
  }
  async function tick() {
    const response = await createBackendApi(options)(new Request('https://test.invalid/internal/tick', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }));
    assert.equal(response.status, 200);
    return response.json();
  }
  return { ...local, options, messages, days, client, tick, time: () => now, advance: (ms: number) => {
    now += ms;
  }, offline: () => {
    available = false;
  } };
}
async function subscribe(p: ReturnType<typeof pipeline>, locations = [home, work], options: boolean | { regionalPushEnabled?: boolean; permission?: 'granted' | 'denied' } = true) {
  const { regionalPushEnabled = true, permission = 'granted' } = typeof options === 'boolean' ? { regionalPushEnabled: options } : options;
  const client = p.client();
  await client.updateDelivery(permission === 'granted' ? { permission, token: `ExponentPushToken[${randomUUID()}]` } : { permission });
  await client.updatePreferences({ revision: 1, regionalPushEnabled, locations });
  return client;
}

test('one grouped warning per installation/queue/outage, independent of regional toggle and selected queue', async () => {
  const p = pipeline();
  try {
    const client = await subscribe(p, [{ ...home, enabled: false }, work, school], false);
    const denied = await subscribe(p, [home, work], { permission: 'denied' });
    await p.tick();
    p.advance(120000);
    await Promise.all([p.tick(), p.tick()]);
    await p.tick();
    assert.equal(p.messages.length, 2);
    assert.ok(p.messages.every(message => message.title === 'Відключення за 10 хвилин'));
    assert.ok(p.messages.some(message => message.body.includes('Робота') && !message.body.includes('Дім')));
    assert.ok(p.messages.some(message => message.body.includes('Школа')));
    const warnings = (await client.history()).items;
    assert.equal(warnings.length, 2);
    assert.deepEqual(warnings.map(item => item.type === 'outage-warning' ? item.locations.map(location => location.name) : []).sort(), [['Робота'], ['Школа']]);
    const history = (await denied.history()).items;
    assert.equal(history.length, 1);
    assert.deepEqual(history[0].type === 'outage-warning' && history[0].locations.map(item => item.name), ['Дім', 'Робота']);
    assert.ok(p.messages.every(message => message.expiration === Date.parse('2026-11-09T08:00:00Z') / 1000 - 1));
  }
  finally {
    p.close();
  }
});

test('regional preference keeps publication/change history, does not change subscriptions, and rejects stale/duplicate revisions safely', async () => {
  const p = pipeline();
  try {
    const client = await subscribe(p, [home], false);
    await p.tick();
    p.days.set('2026-11-10', { ...day(['1.1'], 660, 720), date: '2026-11-10' });
    p.days.set(date, day(['1.1'], 600, 720));
    p.advance(60000);
    await p.tick();
    assert.equal(p.messages.length, 0);
    assert.equal((await client.history()).items.length, 2);
    const prefs: NotificationPreferences = { revision: 3, regionalPushEnabled: true, locations: [home] };
    await client.updatePreferences(prefs);
    await client.updatePreferences(prefs);
    await assert.rejects(client.updatePreferences({ ...prefs, revision: 2, regionalPushEnabled: false, locations: [] }));
    await assert.rejects(client.updatePreferences({ ...prefs, locations: [] }));
    const row = await p.database.first<{ revision: number; locations: string }>({ sql: 'SELECT * FROM installation_preferences', params: [] });
    assert.equal(row!.revision, 3);
    assert.deepEqual(JSON.parse(row!.locations), [home]);
    p.advance(60000);
    await p.tick();
    assert.equal(p.messages.length, 1);
    assert.equal(p.messages[0].title, 'Відключення за 10 хвилин');
  }
  finally {
    p.close();
  }
});

test('queue edits, disabled/deleted locations and immutable historical names work through the API', async () => {
  const p = pipeline();
  try {
    const client = await subscribe(p);
    await p.tick();
    await client.updatePreferences({ revision: 2, regionalPushEnabled: true, locations: [{ ...work, name: 'Офіс', queue: '1.2' }] });
    p.advance(120000);
    await p.tick();
    assert.equal(p.messages.length, 1);
    assert.ok(p.messages[0].body.includes('Офіс'));
    assert.ok(p.messages[0].body.includes('1.2'));
    await client.updatePreferences({ revision: 3, regionalPushEnabled: true, locations: [] });
    await assert.rejects(client.updatePreferences({ revision: 2, regionalPushEnabled: true, locations: [home, work] }));
    const item = (await client.history()).items[0];
    assert.equal(item.type, 'outage-warning');
    if (item.type === 'outage-warning')
      assert.deepEqual(item.locations, [{ id: 'work', name: 'Офіс' }]);
  }
  finally {
    p.close();
  }
});

test('late first schedule and missed warning slots are never caught up', async () => {
  for (const late of [false, true]) {
    const p = pipeline(late ? '2026-11-09T07:55:00Z' : undefined);
    try {
      const client = await subscribe(p);
      await p.tick();
      p.advance(late ? 60000 : 180000);
      await p.tick();
      assert.equal(p.messages.length, 0);
      assert.deepEqual((await client.history()).items, []);
    }
    finally {
      p.close();
    }
  }
});

test('fresh cache at five minutes is allowed, older cache is not, failed source does not refresh it', async () => {
  for (const delay of [300000, 301000]) {
    const p = pipeline('2026-11-09T07:45:00Z');
    try {
      await subscribe(p);
      await p.tick();
      const before = await createScheduleStore(p.database).get(date);
      p.offline();
      p.advance(delay);
      await p.tick();
      assert.equal(p.messages.length, delay === 300000 ? 1 : 0);
      assert.equal((await createScheduleStore(p.database).get(date))!.verifiedAt, before!.verifiedAt);
    }
    finally {
      p.close();
    }
  }
});

test('midnight warning uses tomorrow date, but continuous overnight off has no second start', async () => {
  for (const continuous of [false, true]) {
    const p = pipeline('2026-11-09T21:48:00Z', continuous ? day(['1.1'], 1380, 1440) : { date, queues: [{ queue: '1.1', intervals: [{ start: 0, end: 1440, state: 'on' }] }] });
    try {
      p.days.set('2026-11-10', { ...day(['1.1'], 0, 60), date: '2026-11-10' });
      const client = await subscribe(p);
      await p.tick();
      p.advance(120000);
      await p.tick();
      assert.equal(p.messages.length, continuous ? 0 : 1);
      if (!continuous) {
        const item = (await client.history()).items[0];
        assert.equal(item.scheduleDate, '2026-11-10');
        assert.equal(item.type === 'outage-warning' && item.outageAt, Date.parse('2026-11-09T22:00:00Z'));
      }
    }
    finally {
      p.close();
    }
  }
});

test('Kyiv civil times handle winter, summer, DST gaps and repeated clocks deterministically', () => {
  assert.equal(kyivTimestamp(date, 600), Date.parse('2026-11-09T08:00:00Z'));
  assert.equal(kyivTimestamp('2026-07-09', 600), Date.parse('2026-07-09T07:00:00Z'));
  assert.equal(kyivTimestamp('2026-03-29', 210), undefined);
  assert.equal(kyivTimestamp('2026-10-25', 210), Date.parse('2026-10-25T00:30:00Z'));
  for (const state of ['possible', 'unknown', 'on'] as const)
    assert.deepEqual(outageCandidates({ date, queues: [{ queue: '1.1', intervals: [{ start: 0, end: 1440, state }] }] }), []);
});

test('delivery checks current settings/source/expiry again, regional toggle does not cancel a warning', async () => {
  for (const action of ['regional', 'disable', 'source', 'expiry'] as const) {
    const p = pipeline();
    try {
      const client = await subscribe(p);
      await p.tick();
      p.advance(120000);
      await formOutageWarnings(p.database, p.time());
      if (action === 'regional' || action === 'disable')
        await client.updatePreferences({ revision: 2, regionalPushEnabled: false, locations: action === 'disable' ? [{ ...home, enabled: false }, { ...work, enabled: false }] : [home, work] });
      if (action === 'source') {
        const previous = (await createScheduleStore(p.database).get(date))!;
        await createScheduleChangeRecorder(p.database, p.time)(previous, { day: { date, noOutagesScope: 'region', queues: [] }, verifiedAt: p.time() });
      }
      if (action === 'expiry')
        p.advance(600000);
      await dispatchPush(p.database, p.options.transport, { now: p.time });
      const warningMessages = p.messages.filter(message => message.title === 'Відключення за 10 хвилин');
      assert.equal(warningMessages.length, action === 'regional' ? 1 : 0);
      assert.equal((await client.history()).items.filter(item => item.type === 'outage-warning').length, 1);
    }
    finally {
      p.close();
    }
  }
});

test('100 installations with two queues drain separate Expo batches once, and long names stay below payload limit', async () => {
  const p = pipeline();
  try {
    for (let index = 0;
      index < 100;
      index++) await subscribe(p, [home, school]);
    await p.tick();
    p.advance(120000);
    await p.tick();
    await p.tick();
    assert.equal(p.messages.length, 200);
    assert.equal(new Set(p.messages.map(message => message.data.notificationId)).size, 200);
    const locations = Array.from({ length: 50 }, (_, index) => ({ id: String(index), name: 'Д'.repeat(20) }));
    const message = publicationMessage({ history_id: 'warning:test', push_token: 'ExponentPushToken[test]', installation_id: 'test', schedule_date: date, type: 'outage-warning', details: JSON.stringify({ queue: '1.1', outageAt: Date.parse('2026-11-09T08:00:00Z'), locations }) });
    assert.ok(new TextEncoder().encode(JSON.stringify(message)).length < 4096);
    assert.match(message.body, /та ще/);
  }
  finally {
    p.close();
  }
});

test('warning generation rolls back atomically and concurrent retries create one history and one delivery', async () => {
  const p = pipeline();
  try {
    const client = await subscribe(p);
    await p.tick();
    p.advance(60000);
    await p.tick();
    assert.equal(p.messages.length, 0);
    p.advance(60000);
    const failing = { ...p.database, batch: async (queries: Parameters<typeof p.database.batch>[0]) => {
      if (queries.some(query => query.sql.includes('\'outage-warning\', j.schedule_date')))
        return p.database.batch([queries[0], { sql: 'INSERT INTO intentionally_missing_table VALUES (1)', params: [] }, ...queries.slice(1)]);
      return p.database.batch(queries);
    } };
    await assert.rejects(formOutageWarnings(failing, p.time()));
    assert.deepEqual((await client.history()).items, []);
    await Promise.all([formOutageWarnings(p.database, p.time()), formOutageWarnings(p.database, p.time())]);
    await Promise.all([dispatchPush(p.database, p.options.transport, { now: p.time }), dispatchPush(p.database, p.options.transport, { now: p.time })]);
    assert.equal(p.messages.length, 1);
    assert.equal((await client.history()).items.length, 1);
  }
  finally { p.close(); }
});

test('a preference change before the final read blocks that recipient without breaking other tickets', async () => {
  const p = pipeline();
  try {
    const client = await subscribe(p);
    const other = await subscribe(p);
    await p.tick();
    p.advance(120000);
    await formOutageWarnings(p.database, p.time());
    const racing = { ...p.database, all: async <T>(query: Parameters<typeof p.database.all>[0]): Promise<T[]> => {
      if (query.sql.includes('o.claim_key'))
        await client.updatePreferences({ revision: 2, regionalPushEnabled: true, locations: [] });
      return p.database.all<T>(query);
    } };
    await dispatchPush(racing, p.options.transport, { now: p.time });
    assert.equal(p.messages.length, 1);
    assert.equal((await other.history()).items.length, 1);
    const states = await p.database.all<{ state: string }>({ sql: 'SELECT state FROM push_outbox ORDER BY state', params: [] });
    assert.deepEqual(states.map(row => row.state), ['failed', 'sent']);
    assert.equal((await client.history()).items.length, 1);
  }
  finally { p.close(); }
});

test('warning migration preserves silent changes, original histories, tickets, preferences and sequence high-water', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec('PRAGMA foreign_keys = ON');
    for (const name of readdirSync('server/notifications/migrations').filter(name => name.endsWith('.sql') && name < '0009').sort()) {
      sqlite.exec('BEGIN');
      sqlite.exec(readFileSync(`server/notifications/migrations/${name}`, 'utf8'));
      sqlite.exec('COMMIT');
    }
    sqlite.exec(`INSERT INTO installations VALUES ('legacy', 'hash', 1, 100);
      INSERT INTO installation_preferences VALUES ('legacy', 7, 0, '[]', 1);
      INSERT INTO notification_events (sequence,id,type,schedule_date,version,created_at,push_eligible)
        VALUES (7,'silent','schedule-changed','2026-11-09','version',1,0);
      INSERT INTO notification_events (sequence,id,type,schedule_date,version,created_at)
        VALUES (100,'deleted','schedule-published','2026-11-09','version',1);
      DELETE FROM notification_events WHERE id='deleted';
      INSERT INTO notification_history VALUES ('history','legacy','silent',1);
      INSERT INTO push_outbox VALUES ('history','sent','original-claim','original-ticket','');`);
    const events = sqlite.prepare('SELECT * FROM notification_events').all();
    const outbox = sqlite.prepare('SELECT * FROM push_outbox').all();
    const preferences = sqlite.prepare('SELECT * FROM installation_preferences').all();
    sqlite.exec('BEGIN');
    sqlite.exec(readFileSync('server/notifications/migrations/0009-outage-warnings.sql', 'utf8'));
    sqlite.exec('COMMIT');
    assert.deepEqual(sqlite.prepare('SELECT * FROM notification_events').all(), events);
    assert.deepEqual(sqlite.prepare('SELECT * FROM push_outbox').all(), outbox);
    assert.deepEqual(sqlite.prepare('SELECT * FROM installation_preferences').all(), preferences);
    assert.equal(sqlite.prepare('SELECT details FROM notification_history').get()!.details, null);
    assert.ok(Number(sqlite.prepare('SELECT seq FROM sqlite_sequence WHERE name=\'notification_events\'').get()!.seq) >= 100);
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  }
  finally { sqlite.close(); }
});

test('a moved future outage removes the old job and warns only at its new ten-minute target', async () => {
  const p = pipeline();
  try {
    const client = await subscribe(p);
    await p.tick();
    p.advance(60000);
    p.days.set(date, day(['1.1', '1.2'], 630, 690));
    await p.tick();
    p.advance(60000);
    await p.tick();
    assert.equal(p.messages.filter(message => message.title === 'Відключення за 10 хвилин').length, 0);
    p.advance(30 * 60000);
    await p.tick();
    const warnings = (await client.history()).items.filter(item => item.type === 'outage-warning');
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].outageAt, Date.parse('2026-11-09T08:30:00Z'));
    assert.equal(p.messages.filter(message => message.title === 'Відключення за 10 хвилин').length, 1);
  }
  finally { p.close(); }
});

test('turning regional push off cancels queued publications without losing history or backfilling on re-enable', async () => {
  const p = pipeline();
  try {
    const client = await subscribe(p);
    const repository = createNotificationRepository(p.database, p.time);
    await repository.publish({ ...day(), date: '2026-11-10' });
    await client.updatePreferences({ revision: 2, regionalPushEnabled: false, locations: [home, work] });
    await dispatchPush(p.database, p.options.transport, { now: p.time });
    assert.equal(p.messages.length, 0);
    assert.equal((await client.history()).items.length, 1);
    await client.updatePreferences({ revision: 3, regionalPushEnabled: true, locations: [home, work] });
    await dispatchPush(p.database, p.options.transport, { now: p.time });
    assert.equal(p.messages.length, 0);
    await repository.publish({ ...day(), date: '2026-11-11' });
    await dispatchPush(p.database, p.options.transport, { now: p.time });
    assert.equal(p.messages.length, 1);
    assert.equal((await client.history()).items.length, 2);
  }
  finally { p.close(); }
});
