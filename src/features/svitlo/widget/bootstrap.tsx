import { useEffect } from 'react';
import { AppState } from 'react-native';
import { isE2E } from '@/lib/e2e';
import { useLocations } from '../location-store';
import { widgetNative as native } from './native';

export function WidgetBootstrap() {
  useEffect(() => {
    const bridge = native;
    if (!bridge || isE2E)
      return;
    const sync = () => {
      try {
        bridge.sync(
          JSON.stringify(useLocations.getState().locations.map(({ id, name, queue }) => ({ id, name, queue }))),
          process.env.EXPO_PUBLIC_SVITLO_API_URL ?? 'https://svitlo-backend-pilot.onrender.com',
          `svitlo-rn${process.env.EXPO_PUBLIC_APP_ENV === 'production' ? '' : `-${process.env.EXPO_PUBLIC_APP_ENV ?? 'development'}`}`,
        );
      }
      catch {
        // A failed bridge write must not prevent editing the user's locations.
      }
    };
    sync();
    const unsubscribe = useLocations.subscribe((state, previous) => {
      if (state.locations !== previous.locations)
        sync();
    });
    const subscription = AppState.addEventListener('change', state => state === 'active' && sync());
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);
  return null;
}
