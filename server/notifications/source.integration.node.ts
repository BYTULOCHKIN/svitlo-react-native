import assert from 'node:assert/strict';
import { test } from 'node:test';
import fixture from '../../src/features/svitlo/fixtures/poe-2026-10-10.json';
import { openLocalDatabase } from './local-database';
import { fetchScheduleSnapshot, readSourceText, validatePilotHtml } from './pilot-source';
import { createScheduleStore, scheduleResponse, validatedSnapshot } from './schedules';

const day = validatePilotHtml(fixture.html, fixture.date);
const now = Date.parse('2026-10-10T12:00:00Z');

test('public schedules return a cached complete day and retain its verification time when stale', async () => {
  const local = openLocalDatabase(':memory:');
  try {
    const store = createScheduleStore(local.database);
    const request = new Request('https://worker.invalid/v1/schedules');
    assert.equal((await scheduleResponse(request, store, now)).status, 404);
    await store.save({ day, verifiedAt: now });
    const fresh = await (await scheduleResponse(request, store, now + 1000)).json();
    assert.equal(fresh.date, day.date);
    assert.equal(fresh.queues.length, 12);
    assert.equal(fresh.stale, false);
    const stale = await (await scheduleResponse(request, store, now + 300001)).json();
    assert.equal(stale.stale, true);
    assert.equal(stale.verifiedAt, now);
    await store.save({ day, verifiedAt: now - 1000 });
    assert.equal((await store.get(day.date))?.verifiedAt, now);
    assert.equal((await scheduleResponse(new Request('https://worker.invalid/v1/schedules?date=2026-02-30'), store, now)).status, 400);
    assert.equal((await scheduleResponse(new Request('https://worker.invalid/v1/schedules', { method: 'POST' }), store, now)).status, 405);
  }
  finally { local.close(); }
});

test('relay snapshots reject wrong dates, stale times, future times, unknown states and incomplete days', () => {
  const valid = { day, verifiedAt: now };
  assert.deepEqual(validatedSnapshot(valid, day.date, now), valid);
  assert.throws(() => validatedSnapshot(valid, '2026-10-11', now));
  assert.throws(() => validatedSnapshot(valid, day.date, now + 90001));
  assert.throws(() => validatedSnapshot({ ...valid, verifiedAt: now + 30001 }, day.date, now));
  const invalid = structuredClone(valid);
  invalid.day.queues[0].intervals.pop();
  assert.throws(() => validatedSnapshot(invalid, day.date, now));
  assert.throws(() => validatedSnapshot({ day: { ...day, queues: [{ queue: '1.1', intervals: [{ start: 0, end: 1440, state: 'unknown' }] }] }, verifiedAt: now }, day.date, now));
});

test('relay fetching uses only configured HTTPS origin and preserves source timestamp', async () => {
  let calls = 0;
  const request: typeof fetch = async (input, options) => {
    calls++;
    assert.equal(String(input), 'https://relay.invalid/v1/schedules?date=2026-10-10');
    assert.equal(new Headers(options?.headers).get('Authorization'), `Bearer ${'ab'.repeat(32)}`);
    return Response.json({ day, verifiedAt: now - 1000 });
  };
  const options = { date: day.date, relayUrl: 'https://relay.invalid', relayToken: 'ab'.repeat(32), request, now: () => now };
  assert.equal((await fetchScheduleSnapshot(options)).verifiedAt, now - 1000);
  await assert.rejects(fetchScheduleSnapshot({ ...options, relayUrl: 'http://relay.invalid' }));
  await assert.rejects(fetchScheduleSnapshot({ ...options, relayToken: 'short' }));
  assert.equal(calls, 1);
  await assert.rejects(fetchScheduleSnapshot({ ...options, request: async () => Response.json({ error: 'unavailable' }, { status: 503 }) }));
});

test('source body is bounded by bytes and cancels an oversized stream', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(20)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(readSourceText(new Response(stream), 10));
  assert.equal(cancelled, true);
  assert.equal(await readSourceText(new Response('графік'), 20), 'графік');
  await assert.rejects(readSourceText(new Response('unavailable', { status: 503 })));
});
