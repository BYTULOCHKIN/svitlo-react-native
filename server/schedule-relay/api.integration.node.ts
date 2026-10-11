import assert from 'node:assert/strict';
import { test } from 'node:test';
import fixture from '../../src/features/svitlo/fixtures/poe-2026-10-10.json';
import { validatePilotHtml } from '../notifications/pilot-source';
import { createRelayApi } from './api';

const token = 'ab'.repeat(32);
const initial = Date.parse('2026-10-10T12:00:00Z');
const day = validatePilotHtml(fixture.html, fixture.date);
const request = (date = day.date) => new Request(`https://relay.invalid/v1/schedules?date=${date}`, { headers: { Authorization: `Bearer ${token}` } });

test('relay protects source access and accepts only current dates', async () => {
  let calls = 0;
  const api = createRelayApi({ token, now: () => initial, source: async () => {
    calls++;
    return { day, verifiedAt: initial };
  } });
  assert.equal((await api(new Request('https://relay.invalid/health'))).status, 200);
  assert.equal((await api(new Request('https://relay.invalid/v1/schedules'))).status, 404);
  assert.equal((await api(request('2026-02-30'))).status, 400);
  assert.equal((await api(request('2026-10-09'))).status, 400);
  assert.equal(calls, 0);
  assert.equal((await api(request())).status, 200);
  assert.equal(calls, 1);
});

test('relay coalesces concurrent requests, refreshes after 55s, and never returns stale data as fresh after source failure', async () => {
  let now = initial;
  let calls = 0;
  let failed = false;
  const api = createRelayApi({ token, now: () => now, source: async () => {
    calls++;
    if (failed)
      throw new Error('source unavailable');
    return { day, verifiedAt: now };
  } });
  const responses = await Promise.all(Array.from({ length: 10 }, () => api(request())));
  assert.equal(calls, 1);
  for (const response of responses)
    assert.equal((await response.json()).verifiedAt, initial);
  now += 54000;
  assert.equal((await (await api(request())).json()).verifiedAt, initial);
  assert.equal(calls, 1);
  now += 1000;
  failed = true;
  assert.equal((await api(request())).status, 503);
  assert.equal(calls, 2);
  failed = false;
  assert.equal((await (await api(request())).json()).verifiedAt, now);
  assert.equal(calls, 3);
});
