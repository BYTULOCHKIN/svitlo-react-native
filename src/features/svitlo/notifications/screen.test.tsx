import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NotificationsScreen } from './screen';

const item = { id: 'publication:1', type: 'schedule-published' as const, createdAt: 1791676800000, scheduleDate: '2026-10-10', version: 'ab'.repeat(32) };
const clients: QueryClient[] = [];

afterEach(() => {
  cleanup();
  clients.forEach(client => client.clear());
  clients.length = 0;
});

function show(history = jest.fn(async () => ({ items: [item], nextCursor: null as string | null })), hasLocations = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><NotificationsScreen client={{ history }} hasLocations={hasLocations} /></QueryClientProvider>);
  return history;
}

it('shows loading followed by a Ukrainian publication card', async () => {
  show();
  expect(screen.getByLabelText('Завантаження сповіщень')).toBeOnTheScreen();
  expect(await screen.findByRole('header', { name: 'Опубліковано графік' })).toBeOnTheScreen();
  expect(screen.getByText(/Графік на 10 жовтня 2026/)).toBeOnTheScreen();
});

it('renders an empty history without fabricating messages', async () => {
  show(jest.fn(async () => ({ items: [], nextCursor: null })));
  expect(await screen.findByText(/Сповіщень поки немає/)).toBeOnTheScreen();
});

it('exposes an accessible error and retries without duplicating the card', async () => {
  const history = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ items: [item], nextCursor: null });
  show(history);
  expect(await screen.findByRole('alert')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Спробувати ще раз' }));
  expect(await screen.findByRole('header', { name: 'Опубліковано графік' })).toBeOnTheScreen();
  expect(screen.getAllByRole('header', { name: 'Опубліковано графік' })).toHaveLength(1);
});

it('does not start a history before selecting a queue', async () => {
  const history = show(undefined, false);
  expect(screen.getByText(/Оберіть свою чергу на головному/)).toBeOnTheScreen();
  await waitFor(() => expect(history).not.toHaveBeenCalled());
});

it('deduplicates overlapping history pages', async () => {
  const history = jest.fn().mockResolvedValueOnce({ items: [item], nextCursor: 'next' }).mockResolvedValueOnce({ items: [item], nextCursor: null });
  show(history);
  fireEvent.press(await screen.findByRole('button', { name: 'Показати ще' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Показати ще' })).toBeNull());
  expect(screen.getAllByRole('header', { name: 'Опубліковано графік' })).toHaveLength(1);
});
