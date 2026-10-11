import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useLocations } from '../location-store';
import { PushPermissionExplanation } from './permission-ui';
import { PushNavigation } from './push-navigation';
import { notificationsClient } from './runtime';

export function NotificationBootstrap() {
  const hasLocations = useLocations(state => state.locations.length > 0);
  useEffect(() => {
    if (hasLocations && Platform.OS !== 'web')
      void notificationsClient?.connect().catch(() => { /* The history screen provides retry and an accessible error. */ });
  }, [hasLocations]);
  return hasLocations && Platform.OS !== 'web'
    ? (
        <>
          <PushNavigation />
          <PushPermissionExplanation />
        </>
      )
    : null;
}
