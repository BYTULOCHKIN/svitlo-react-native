import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { storage } from '@/lib/storage';
import { createPermissionController } from './permission';
import { notificationsClient } from './runtime';

const requestedKey = 'svitlo.notifications.permission-requested.v1';

function permission(result: Notifications.NotificationPermissionsStatus) {
  if (result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
    return 'granted' as const;
  // Expo Android can report denied before the first runtime prompt because
  // areNotificationsEnabled() is false. Preserve a real denial after our prompt.
  if (Platform.OS === 'android' && result.status === 'denied' && result.canAskAgain && !storage.getBoolean(requestedKey))
    return 'undetermined' as const;
  return result.status === 'undetermined' ? 'undetermined' as const : 'denied' as const;
}

async function prepareChannel() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('svitlo-schedules', { name: 'Графіки відключень', importance: Notifications.AndroidImportance.HIGH });
}

export const pushPermission = createPermissionController({
  getPermission: async () => permission(await Notifications.getPermissionsAsync()),
  async requestPermission() {
    await prepareChannel();
    const result = await Notifications.requestPermissionsAsync();
    storage.set(requestedKey, true);
    return permission(result);
  },
  async getToken() {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId)
      throw new Error('Push registration unavailable');
    await prepareChannel();
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  },
}, async (settings) => {
  if (!notificationsClient)
    throw new Error('Notification service unavailable');
  await notificationsClient.updateDelivery(settings);
});
