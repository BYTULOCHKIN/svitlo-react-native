import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createPermissionController } from './permission';
import { notificationsClient } from './runtime';

function permission(result: Notifications.NotificationPermissionsStatus) {
  if (result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
    return 'granted' as const;
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
    return permission(await Notifications.requestPermissionsAsync());
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
