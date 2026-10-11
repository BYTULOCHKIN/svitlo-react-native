import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { pushPermission } from './native-push';
import { PushPermissionCard, PushPermissionExplanation } from './permission-ui';

jest.mock('./native-push', () => ({ pushPermission: { inspect: jest.fn(), enable: jest.fn() } }));
jest.mock('@/lib/storage', () => ({ storage: { getBoolean: jest.fn(() => false), set: jest.fn() } }));
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach(client => client.clear());
  clients.length = 0;
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

function show(explanation = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  clients.push(client);
  render(<QueryClientProvider client={client}>{explanation ? <PushPermissionExplanation /> : <PushPermissionCard />}</QueryClientProvider>);
}

it('shows the explanation without asking permission until the enable button is pressed', async () => {
  jest.mocked(pushPermission.inspect).mockResolvedValue({ permission: 'undetermined', ready: false });
  jest.mocked(pushPermission.enable).mockResolvedValue({ permission: 'denied', ready: false });
  show(true);
  const button = await screen.findByRole('button', { name: 'Увімкнути сповіщення' });
  expect(pushPermission.enable).not.toHaveBeenCalled();
  fireEvent.press(button);
  await waitFor(() => expect(pushPermission.enable).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Увімкнути сповіщення' })).toBeNull());
});

it('allows deferring permission without requesting it', async () => {
  jest.mocked(pushPermission.inspect).mockResolvedValue({ permission: 'undetermined', ready: false });
  show(true);
  fireEvent.press(await screen.findByRole('button', { name: 'Пізніше' }));
  expect(pushPermission.enable).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Увімкнути сповіщення' })).toBeNull();
});

it('shows actual denial and opens OS settings while keeping history available', async () => {
  jest.mocked(pushPermission.inspect).mockResolvedValue({ permission: 'denied', ready: false });
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  show();
  expect(await screen.findByText(/Історія залишається доступною/)).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Налаштування телефона' }));
  expect(openSettings).toHaveBeenCalledTimes(1);
  expect(pushPermission.enable).not.toHaveBeenCalled();
});

it('distinguishes granted permission from unavailable delivery registration', async () => {
  jest.mocked(pushPermission.inspect).mockResolvedValue({ permission: 'granted', ready: false });
  show();
  expect(await screen.findByText('Дозвіл у налаштуваннях телефона ввімкнений.')).toBeOnTheScreen();
  expect(screen.getByText(/Не вдалося підключити push/)).toBeOnTheScreen();
});
