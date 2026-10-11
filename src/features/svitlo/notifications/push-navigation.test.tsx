import type { NotificationResponse } from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanupAsync, render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { PushNavigation } from './push-navigation';

jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'default',
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
}));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
const push = jest.fn();
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  jest.mocked(Notifications.getLastNotificationResponse).mockReturnValue(null);
});
afterEach(async () => {
  await cleanupAsync();
  client.clear();
  jest.clearAllMocks();
});

function response(data: Record<string, unknown>) {
  return { actionIdentifier: 'default', notification: { request: { content: { data } } } } as NotificationResponse;
}
function show() {
  render(<QueryClientProvider client={client}><PushNavigation /></QueryClientProvider>);
}

it('opens and consumes the saved response when the application starts', () => {
  jest.mocked(Notifications.getLastNotificationResponse).mockReturnValue(response({ notificationId: 'publication:2026-10-11:install-1' }));
  show();
  expect(push).toHaveBeenCalledWith({ pathname: '/notifications', params: { notificationId: 'publication:2026-10-11:install-1' } });
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
});

it('handles a tap on a running app but never navigates to arbitrary payload URLs', () => {
  show();
  const onTap = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0];
  act(() => onTap(response({ notificationId: 'https://stranger.invalid', url: 'https://stranger.invalid' })));
  expect(push).not.toHaveBeenCalled();
  act(() => onTap(response({ notificationId: 'publication:2026-10-11:install-1' })));
  expect(push).toHaveBeenCalledTimes(1);
});

it('invalidates history on foreground receipt and removes listeners on unmount', async () => {
  const invalidation = jest.spyOn(client, 'invalidateQueries');
  show();
  const onReceived = jest.mocked(Notifications.addNotificationReceivedListener).mock.calls[0][0];
  const received = jest.mocked(Notifications.addNotificationReceivedListener).mock.results[0].value;
  const tapped = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.results[0].value;
  act(() => onReceived(response({}).notification));
  expect(invalidation).toHaveBeenCalledWith({ queryKey: ['svitlo-notifications'] });
  await cleanupAsync();
  expect(received.remove).toHaveBeenCalledTimes(1);
  expect(tapped.remove).toHaveBeenCalledTimes(1);
});
