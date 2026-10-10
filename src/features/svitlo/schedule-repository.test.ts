import type { ScheduleDay } from './models';
import { createScheduleRepository, currentSchedule } from './schedule-repository';

const day: ScheduleDay = { date: '2026-10-10', queues: [{ queue: '1.1', intervals: [{ start: 0, end: 1440, state: 'on' }] }] };

function memory() {
  let raw: string | undefined;
  return { getString: () => raw, set: (_key: string, value: string) => {
    raw = value;
  } };
}

it('restores a successful schedule after recreating the repository and preserves it after a failed update', async () => {
  const persistence = memory();
  const repo = createScheduleRepository(persistence, async () => day, () => 1000);
  await repo.fetch(day.date);
  const restarted = createScheduleRepository(persistence, async () => {
    throw new Error('Network');
  });
  expect(restarted.load()).toEqual({ day, updatedAt: 1000 });
  await expect(restarted.fetch(day.date)).rejects.toThrow('Network');
  expect(restarted.load()).toEqual({ day, updatedAt: 1000 });
  expect(currentSchedule(restarted.load(), day.date)).toEqual(day);
  expect(currentSchedule(restarted.load(), '2026-10-11')).toBeUndefined();
});

it('persists a region confirmation without inventing queues', async () => {
  const confirmation: ScheduleDay = { date: day.date, queues: [], noOutagesScope: 'region' };
  const repo = createScheduleRepository(memory(), async () => confirmation, () => 2000);
  await repo.fetch(day.date);
  expect(repo.load()?.day).toEqual(confirmation);
});

it('rejects malformed and incompatible saved data without crashing', () => {
  const persistence = memory();
  const repo = createScheduleRepository(persistence, async () => day);
  for (const raw of ['{', 'null', JSON.stringify({ version: 2, day, updatedAt: 1000 }), JSON.stringify({ version: 1, day: { date: day.date, queues: [] }, updatedAt: 1000 }), JSON.stringify({ version: 1, day, updatedAt: 'yesterday' })]) {
    persistence.set('', raw);
    expect(repo.load()).toBeUndefined();
  }
});

it('keeps fresh data usable when persistence fails and rejects a response for another date', async () => {
  const persistence = { getString: () => {
    throw new Error('Read');
  }, set: () => {
    throw new Error('Write');
  } };
  const repo = createScheduleRepository(persistence, async () => day, () => 3000);
  expect(repo.load()).toBeUndefined();
  expect(await repo.fetch(day.date)).toEqual({ day, updatedAt: 3000, persistenceWarning: true });
  await expect(repo.fetch('2026-10-11')).rejects.toThrow('іншу дату');
});
