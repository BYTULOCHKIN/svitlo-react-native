import liveResponse from './fixtures/poe-2026-10-10.json';
import { fetchSchedule } from './poe-api';
import { parsePoeHtml } from './poe-parser';

const originalFetch = globalThis.fetch;
const originalBackend = process.env.EXPO_PUBLIC_SVITLO_API_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBackend === undefined)
    delete process.env.EXPO_PUBLIC_SVITLO_API_URL;
  else
    process.env.EXPO_PUBLIC_SVITLO_API_URL = originalBackend;
});

it('uses Render JSON exclusively when configured and preserves the source verification time', async () => {
  process.env.EXPO_PUBLIC_SVITLO_API_URL = 'https://backend.invalid';
  const verifiedAt = Date.now() - 600000;
  const response = { ...parsePoeHtml(liveResponse.html, liveResponse.date), verifiedAt, stale: true };
  const request = jest.fn().mockResolvedValue({ ok: true, json: async () => response });
  globalThis.fetch = request;
  const day = await fetchSchedule(liveResponse.date);
  expect(day.queues).toHaveLength(12);
  expect(day.verifiedAt).toBe(verifiedAt);
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe('https://backend.invalid/v1/schedules?date=2026-10-10');
  expect(request.mock.calls[0][1].method).toBeUndefined();
});

it('rejects unavailable, wrong-date and incomplete backend graphs without fetching POE directly', async () => {
  process.env.EXPO_PUBLIC_SVITLO_API_URL = 'https://backend.invalid';
  const valid = { ...parsePoeHtml(liveResponse.html, liveResponse.date), verifiedAt: Date.now(), stale: false };
  for (const value of [{ ...valid, date: '2026-10-09' }, { ...valid, queues: [] }, { ...valid, verifiedAt: Date.now() + 60000 }, { ...valid, queues: [{ queue: '1.1', intervals: [{ start: 0, end: 100, state: 'off' }] }] }, { ...valid, queues: [{ queue: '1.1', intervals: [{ start: 0, end: 1440, state: 'unknown' }] }] }]) {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => value });
    await expect(fetchSchedule(liveResponse.date)).rejects.toThrow();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  }
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });
  await expect(fetchSchedule(liveResponse.date)).rejects.toThrow();
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

it('requests the selected date and normalizes a successful response', async () => {
  const request = jest.fn().mockResolvedValue({ ok: true, text: async () => liveResponse.html });
  globalThis.fetch = request;
  const day = await fetchSchedule(liveResponse.date);
  expect(day.queues).toHaveLength(12);
  expect(decodeURIComponent(request.mock.calls[0][1].body)).toContain('10-10-2026');
});

it('rejects HTTP, network and malformed response errors instead of replacing valid data', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });
  await expect(fetchSchedule(liveResponse.date)).rejects.toThrow();
  globalThis.fetch = jest.fn().mockRejectedValue(new Error('Connection failed'));
  await expect(fetchSchedule(liveResponse.date)).rejects.toThrow('Connection failed');
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
  await expect(fetchSchedule(liveResponse.date)).rejects.toThrow();
});
