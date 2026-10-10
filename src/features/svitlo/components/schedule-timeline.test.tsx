import { cleanup, render, screen } from '@testing-library/react-native';
import { getScheduleView } from '../schedule-view';
import { ScheduleTimeline } from './schedule-timeline';

afterEach(cleanup);

it('identifies a possible outage and displays its next event without treating it as a confirmed outage', () => {
  const view = getScheduleView({
    queue: '1.1',
    intervals: [
      { start: 0, end: 600, state: 'on' },
      { start: 600, end: 660, state: 'possible' },
      { start: 660, end: 720, state: 'off' },
      { start: 720, end: 1440, state: 'on' },
    ],
  }, 610);
  render(<ScheduleTimeline view={view} />);
  expect(screen.getByText('10:00 — 11:00')).toBeOnTheScreen();
  expect(screen.getByText('Можливе відключення')).toBeOnTheScreen();
  expect(screen.getByText('Світла немає')).toBeOnTheScreen();
  expect(screen.getByText('Світло є')).toBeOnTheScreen();
  expect(screen.getAllByText('ЗАРАЗ')).toHaveLength(1);
  expect(screen.getByText('до відключення')).toBeOnTheScreen();
  expect(screen.getByText('0 год 50 хв')).toBeOnTheScreen();
});

it('does not display a countdown when the current interval has no reliable data', () => {
  const view = getScheduleView({ queue: '1.1', intervals: [{ start: 0, end: 600, state: 'unknown' }, { start: 600, end: 1440, state: 'on' }] }, 500);
  render(<ScheduleTimeline view={view} />);
  expect(screen.getByText('Немає даних')).toBeOnTheScreen();
  expect(screen.queryByText(/\d+ год \d+ хв/)).toBeNull();
});
