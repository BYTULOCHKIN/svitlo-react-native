import { getDateKey, getMinute } from './models';
import { currentSchedule } from './schedule-repository';

it('uses Kyiv midnight for both request date and interval calculations', () => {
  const before = new Date('2026-10-10T20:59:59Z');
  const after = new Date('2026-10-10T21:00:00Z');
  expect(getDateKey(before)).toBe('2026-10-10');
  expect(getMinute(before)).toBeCloseTo(1439 + 59 / 60);
  expect(getDateKey(after)).toBe('2026-10-11');
  expect(getMinute(after)).toBe(0);
  expect(currentSchedule({ day: { date: '2026-10-10', queues: [], noOutagesScope: 'region' }, updatedAt: before.getTime() }, getDateKey(after))).toBeUndefined();
});

it('ignores device-local time methods and handles winter time', () => {
  const now = new Date('2026-01-10T22:30:00Z');
  const localHour = jest.spyOn(now, 'getHours').mockReturnValue(12);
  const localDay = jest.spyOn(now, 'getDate').mockReturnValue(10);
  expect(getDateKey(now)).toBe('2026-01-11');
  expect(getMinute(now)).toBe(30);
  expect(localHour).not.toHaveBeenCalled();
  expect(localDay).not.toHaveBeenCalled();
});

it('uses actual wall-clock time through the daylight saving transition', () => {
  expect(getMinute(new Date('2026-10-25T00:30:00Z'))).toBe(210);
  expect(getMinute(new Date('2026-10-25T01:30:00Z'))).toBe(210);
});
