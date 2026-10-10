import { cleanup, render, screen } from '@testing-library/react-native';
import { getScheduleView } from '../schedule-view';
import { ScheduleFreshness } from './schedule-freshness';
import { StatusCard } from './status-card';

afterEach(cleanup);

it('shows the received timestamp in Kyiv time and retains it while refreshing saved data', () => {
  const snapshot = { day: { date: '2026-01-10', queues: [] }, updatedAt: Date.parse('2026-01-10T12:34:00Z') };
  const { rerender } = render(
    <>
      <StatusCard state="unknown" updatedAt={snapshot.updatedAt} />
      <ScheduleFreshness snapshot={snapshot} current fetching={false} failed={false} />
    </>,
  );
  expect(screen.getByText('Оновлено 14:34')).toBeOnTheScreen();
  expect(screen.getByLabelText(/Останнє оновлення графіка:.*Київ/)).toBeOnTheScreen();
  rerender(
    <>
      <StatusCard state="unknown" updatedAt={snapshot.updatedAt} />
      <ScheduleFreshness snapshot={snapshot} current={false} fetching failed />
    </>,
  );
  expect(screen.getByText('Оновлено 14:34')).toBeOnTheScreen();
  expect(screen.getByText('Оновлення…')).toBeOnTheScreen();
  expect(screen.getByText('Показано збережені дані')).toBeOnTheScreen();
  expect(screen.getByText('Збережений графік на 2026-01-10. Даних на сьогодні немає.')).toBeOnTheScreen();
});

it('does not invent an update timestamp when no snapshot exists', () => {
  render(<StatusCard state="unknown" />);
  expect(screen.queryByText(/^Оновлено/)).toBeNull();
});

it('keeps the no-outages message without a fabricated countdown', () => {
  const view = getScheduleView(undefined, 600, true);
  render(<StatusCard state={view.state} view={view} />);
  expect(screen.getByText('Відключення не заплановані на сьогодні')).toBeOnTheScreen();
  expect(screen.queryByText('ЗАЛИШИЛОСЬ')).toBeNull();
});
