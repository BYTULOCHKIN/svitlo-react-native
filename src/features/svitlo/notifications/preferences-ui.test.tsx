import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { useLocations } from '../location-store';
import { useNotificationPreferencesSync } from './preferences-sync';
import { NotificationPreferencesCard } from './preferences-ui';

const mockRetry = jest.fn();

jest.mock('./preferences-sync', () => ({ useNotificationPreferencesSync: jest.fn() }));
beforeEach(() => {
  (useNotificationPreferencesSync as jest.Mock).mockReturnValue({ isFetching: false, error: null, refetch: mockRetry });
  mockRetry.mockClear();
  useLocations.setState({ notificationRevision: 1, regionalPushEnabled: true, selectedId: 'home', locations: [
    { id: 'home', name: 'Дім', queue: '1.1', icon: 'home', notificationsEnabled: true },
    { id: 'work', name: 'Робота', queue: '1.1', icon: 'work', notificationsEnabled: true },
  ] });
});
afterEach(cleanup);

it('exposes independent accessible regional and per-location switches with shared-queue explanation', () => {
  render(<NotificationPreferencesCard />);
  expect(screen.getAllByRole('switch')).toHaveLength(3);
  expect(screen.getByText(/одне спільне повідомлення/)).toBeOnTheScreen();
  fireEvent(screen.getByRole('switch', { name: 'Публікації та зміни графіків' }), 'valueChange', false);
  expect(useLocations.getState().regionalPushEnabled).toBe(false);
  expect(useLocations.getState().locations.every(location => location.notificationsEnabled)).toBe(true);
  fireEvent(screen.getByRole('switch', { name: 'Попередження: Дім' }), 'valueChange', false);
  expect(useLocations.getState().locations.map(location => location.notificationsEnabled)).toEqual([false, true]);
  expect(useLocations.getState().selectedId).toBe('home');
  expect(useLocations.getState().notificationRevision).toBe(3);
});

it('shows pending server application truthfully and offers a mockRetry without reverting local preferences', () => {
  (useNotificationPreferencesSync as jest.Mock).mockReturnValue({ isFetching: false, error: new Error('offline'), refetch: mockRetry });
  render(<NotificationPreferencesCard />);
  expect(screen.getByRole('alert')).toHaveTextContent(/Сервер застосує їх після синхронізації/);
  fireEvent.press(screen.getByRole('button', { name: 'Повторити синхронізацію' }));
  expect(mockRetry).toHaveBeenCalledTimes(1);
});
