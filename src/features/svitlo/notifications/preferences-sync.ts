import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useLocations } from '../location-store';
import { notificationsClient } from './runtime';

export function useNotificationPreferencesSync() {
  const { locations, notificationRevision: revision, regionalPushEnabled } = useLocations();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['svitlo-notification-preferences', revision],
    enabled: Platform.OS !== 'web' && !!notificationsClient && (locations.length > 0 || revision > 1),
    queryFn: async () => {
      await notificationsClient!.updatePreferences({ revision, regionalPushEnabled, locations: locations.map(location => ({ id: location.id, name: location.name, queue: location.queue, enabled: location.notificationsEnabled ?? true })) });
      return revision;
    },
    retry: 2,
    staleTime: Infinity,
    gcTime: 60000,
  });
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active')
        void queryClient.invalidateQueries({ queryKey: ['svitlo-notification-preferences'] });
    });
    return () => listener.remove();
  }, [queryClient]);
  return query;
}
