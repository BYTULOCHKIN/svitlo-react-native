import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { useLocations } from '../location-store';
import { fetchSchedule } from '../poe-api';
import { readWidgetDay } from './native';
import { WidgetScheduleScreen } from './schedule-screen';

let mockDate = '2026-11-10';
jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useLocalSearchParams: jest.fn(() => ({ locationId: 'home', date: mockDate })) }));
jest.mock('../poe-api', () => ({ fetchSchedule: jest.fn() }));
jest.mock('./native', () => ({ readWidgetDay: jest.fn() }));
// eslint-disable-next-line react/no-unnecessary-use-prefix -- Keep the framework-facing hook name in this mock.
jest.mock('../use-clock', () => ({ useClock: () => new Date('2026-11-09T15:00:00Z') }));
const tomorrow = { date: '2026-11-10', verifiedAt: Date.parse('2026-11-09T15:00:00Z'), queues: [{ queue: '1.1', intervals: [{ start: 0, end: 1440, state: 'off' as const }] }] };
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><WidgetScheduleScreen /></QueryClientProvider>);
}
beforeEach(() => {
  jest.clearAllMocks();
  mockDate = '2026-11-10';
  jest.mocked(readWidgetDay).mockReturnValue(undefined);
  useLocations.setState({ locations: [{ id: 'home', name: 'Дім', queue: '1.1', icon: 'home' }], selectedId: 'home' });
});
it('loads the requested date and renders the complete interval instead of today', async () => {
  jest.mocked(fetchSchedule).mockResolvedValue(tomorrow);
  show();
  expect(await screen.findByText('00:00–24:00')).toBeTruthy();
  expect(fetchSchedule).toHaveBeenCalledWith('2026-11-10', expect.anything());
  expect(screen.getByText('Відключення за графіком')).toBeTruthy();
});
it('keeps the exact dated native cache available when refreshing fails', async () => {
  jest.mocked(readWidgetDay).mockReturnValue(tomorrow);
  jest.mocked(fetchSchedule).mockRejectedValue(new Error('offline'));
  show();
  expect(screen.getByText('00:00–24:00')).toBeTruthy();
  expect(await screen.findByText('Дані можуть бути застарілими. Показано збережений графік.', { timeout: 4000 })).toBeTruthy();
});
it('rejects an invalid date without fetching a different day', () => {
  mockDate = '2026-02-31';
  show();
  expect(screen.getByText('Некоректна дата')).toBeTruthy();
  expect(fetchSchedule).not.toHaveBeenCalled();
});
