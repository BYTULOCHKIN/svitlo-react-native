import { render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import WidgetEntry from '@/app/widget';
import { useLocations } from '../location-store';

let mockLocationId: string | undefined;
let mockDate: string | undefined;
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ locationId: mockLocationId, date: mockDate })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDate = undefined;
  useLocations.setState({ locations: [{ id: 'home', name: 'Дім', queue: '1.1', icon: 'home' }, { id: 'work', name: 'Робота', queue: '2.1', icon: 'work' }], selectedId: 'home' });
});

it('opens the requested location on repeated warm navigation without replacing other locations', async () => {
  mockLocationId = 'work';
  const view = render(<WidgetEntry />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  expect(useLocations.getState().selectedId).toBe('work');
  mockLocationId = 'home';
  view.rerender(<WidgetEntry />);
  await waitFor(() => expect(useLocations.getState().selectedId).toBe('home'));
  expect(useLocations.getState().locations).toHaveLength(2);
});

it('does not substitute another address when the requested location has been deleted', () => {
  mockLocationId = 'deleted';
  render(<WidgetEntry />);
  expect(screen.getByText('Локацію видалено')).toBeTruthy();
  expect(useLocations.getState().selectedId).toBe('home');
  expect(router.replace).not.toHaveBeenCalled();
});

it('opens the main screen without changing the location when invoked by empty configuration', async () => {
  mockLocationId = undefined;
  render(<WidgetEntry />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  expect(useLocations.getState().selectedId).toBe('home');
});

it('opens the exact tomorrow date from the overflow action', async () => {
  mockLocationId = 'work';
  mockDate = '2026-11-10';
  render(<WidgetEntry />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/widget-schedule', params: { locationId: 'work', date: '2026-11-10' } }));
  expect(useLocations.getState().selectedId).toBe('work');
});
