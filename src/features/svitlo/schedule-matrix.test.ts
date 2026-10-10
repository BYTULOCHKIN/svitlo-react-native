import { toMatrixRows } from './schedule-matrix';

it('uses the middle of each hour and actual light duration while preserving unknown data', () => {
  const rows = toMatrixRows([
    { queue: '2.1', intervals: [{ start: 0, end: 30, state: 'on' }, { start: 30, end: 60, state: 'possible' }, { start: 60, end: 90, state: 'off' }] },
    { queue: '1.1', intervals: [{ start: 0, end: 1440, state: 'on' }] },
  ]);
  expect(rows[0].queue).toBe('1.1');
  expect(rows[0].lightMinutes).toBe(1440);
  expect(rows[1].lightMinutes).toBe(30);
  expect(rows[1].hours).toHaveLength(24);
  expect(rows[1].hours[0]).toBe('possible');
  expect(rows[1].hours[1]).toBe('unknown');
  expect(rows[1].hours[23]).toBe('unknown');
  expect(toMatrixRows([])).toEqual([]);
});
