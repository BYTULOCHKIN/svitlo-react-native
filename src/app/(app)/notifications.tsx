import { useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import { useLocations } from '@/features/svitlo/location-store';
import { PushPermissionCard } from '@/features/svitlo/notifications/permission-ui';
import { notificationsClient } from '@/features/svitlo/notifications/runtime';
import { NotificationsScreen } from '@/features/svitlo/notifications/screen';

export default function NotificationsRoute() {
  const hasLocations = useLocations(state => state.locations.length > 0);
  const { notificationId } = useLocalSearchParams<{ notificationId?: string }>();
  return <NotificationsScreen client={notificationsClient} hasLocations={hasLocations} native={Platform.OS !== 'web'} targetId={notificationId} permissionCard={hasLocations && <PushPermissionCard />} />;
}
