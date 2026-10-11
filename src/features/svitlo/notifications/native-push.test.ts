import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { storage } from '@/lib/storage';
import { pushPermission } from './native-push';
import { notificationsClient } from './runtime';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'own-project' } } } } }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  AndroidImportance: { HIGH: 4 },
}));
jest.mock('@/lib/storage', () => ({ storage: { getBoolean: jest.fn(), set: jest.fn() } }));
jest.mock('./runtime', () => ({ notificationsClient: { updateDelivery: jest.fn() } }));

const requestedKey = 'svitlo.notifications.permission-requested.v1';
const androidInitial = { status: 'denied', granted: false, canAskAgain: true, expires: 'never' } as Notifications.NotificationPermissionsStatus;
const granted = { ...androidInitial, status: 'granted', granted: true } as Notifications.NotificationPermissionsStatus;

beforeEach(() => {
  jest.resetAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(androidInitial);
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: 'ExponentPushToken[test]' });
});
afterEach(() => jest.restoreAllMocks());

it('does not prompt on Android inspection before the first request', async () => {
  await expect(pushPermission.inspect()).resolves.toEqual({ permission: 'undetermined', ready: false });
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(notificationsClient?.updateDelivery).toHaveBeenCalledWith({ permission: 'undetermined' });
});

it('requests on explicit enable and preserves an actual denial', async () => {
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(androidInitial);
  jest.mocked(storage.set).mockImplementation(() => {
    jest.mocked(storage.getBoolean).mockReturnValue(true);
  });
  await expect(pushPermission.enable()).resolves.toEqual({ permission: 'denied', ready: false });
  expect(storage.set).toHaveBeenCalledWith(requestedKey, true);
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  await expect(pushPermission.inspect()).resolves.toEqual({ permission: 'denied', ready: false });
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
});

it('registers the token after the explicit Android grant', async () => {
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(granted);
  await expect(pushPermission.enable()).resolves.toEqual({ permission: 'granted', ready: true });
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'own-project' });
  expect(notificationsClient?.updateDelivery).toHaveBeenCalledWith({ permission: 'granted', token: 'ExponentPushToken[test]' });
});

it('keeps a non-requestable Android permission denied', async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ ...androidInitial, canAskAgain: false });
  await expect(pushPermission.enable()).resolves.toEqual({ permission: 'denied', ready: false });
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
});

it('does not reinterpret an iOS denial as a first Android request', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await expect(pushPermission.inspect()).resolves.toEqual({ permission: 'denied', ready: false });
});
