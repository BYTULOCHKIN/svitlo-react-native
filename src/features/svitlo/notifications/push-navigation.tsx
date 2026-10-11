import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { notificationTarget } from './notification-target';

export function PushNavigation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['svitlo-notifications'] });
    });
    const navigate = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER)
        return;
      const id = notificationTarget(response.notification.request.content.data);
      if (id) {
        router.push({ pathname: '/notifications', params: { notificationId: id } });
        void queryClient.invalidateQueries({ queryKey: ['svitlo-notifications'] });
        Notifications.clearLastNotificationResponse();
      }
    };
    const responseListener = Notifications.addNotificationResponseReceivedListener(navigate);
    navigate(Notifications.getLastNotificationResponse());
    return () => {
      received.remove();
      responseListener.remove();
      Notifications.setNotificationHandler(null);
    };
  }, [router, queryClient]);
  return null;
}
