import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { useLocations } from '../location-store';
import { useNotificationPreferencesSync } from './preferences-sync';

const mockUpdate = jest.fn().mockResolvedValue(undefined);
jest.mock('./runtime', () => ({ notificationsClient: { updatePreferences: (...args: unknown[]) => mockUpdate(...args) } }));
const clients: QueryClient[] = [];
function Probe() {
  useNotificationPreferencesSync();
  return null;
}
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
}
beforeEach(() => {
  mockUpdate.mockClear();
  useLocations.setState({ locations: [], selectedId: null, notificationRevision: 1, regionalPushEnabled: true });
});
afterEach(() => {
  cleanup();
  clients.forEach(client => client.clear());
  clients.length = 0;
});

it('does not register an unconfigured installation, then synchronizes toggles, edits and deletion of the last location', async () => {
  show();
  expect(mockUpdate).not.toHaveBeenCalled();
  act(() => useLocations.getState().chooseFirst('1.1'));
  await waitFor(() => expect(mockUpdate).toHaveBeenLastCalledWith({ revision: 2, regionalPushEnabled: true, locations: [{ id: 'home', name: 'Дім', queue: '1.1', enabled: true }] }));
  act(() => useLocations.getState().setLocationNotifications('home', false));
  await waitFor(() => expect(mockUpdate).toHaveBeenLastCalledWith({ revision: 3, regionalPushEnabled: true, locations: [{ id: 'home', name: 'Дім', queue: '1.1', enabled: false }] }));
  act(() => useLocations.getState().edit({ ...useLocations.getState().locations[0], name: 'Квартира', queue: '2.1' }));
  await waitFor(() => expect(mockUpdate).toHaveBeenLastCalledWith({ revision: 4, regionalPushEnabled: true, locations: [{ id: 'home', name: 'Квартира', queue: '2.1', enabled: false }] }));
  act(() => useLocations.getState().remove('home'));
  await waitFor(() => expect(mockUpdate).toHaveBeenLastCalledWith({ revision: 5, regionalPushEnabled: true, locations: [] }));
});

it('does not resend preferences for selection and icon changes, and preserves location flags on regional changes', async () => {
  act(() => useLocations.getState().chooseFirst('1.1'));
  show();
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  act(() => useLocations.getState().edit({ ...useLocations.getState().locations[0], icon: 'heart' }));
  act(() => useLocations.getState().select('home'));
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  act(() => useLocations.getState().setRegionalPush(false));
  await waitFor(() => expect(mockUpdate).toHaveBeenLastCalledWith({ revision: 3, regionalPushEnabled: false, locations: [{ id: 'home', name: 'Дім', queue: '1.1', enabled: true }] }));
});
