import liveResponse from './fixtures/poe-2026-10-10.json';
import { fetchSchedule } from './poe-api';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
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
