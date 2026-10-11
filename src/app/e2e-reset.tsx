import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { useLocations } from '@/features/svitlo/location-store';
import { notificationsClient } from '@/features/svitlo/notifications/runtime';
import { isE2E } from '@/lib/e2e';
import { storage } from '@/lib/storage';

export default function E2EReset() {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isE2E) {
      // The flag selects a separate MMKV instance; normal locations are untouched.
      storage.clearAll();
      notificationsClient?.reset();
      queryClient.clear();
      useLocations.setState({ locations: [], selectedId: null });
      router.replace('/');
    }
  }, [queryClient]);
  return isE2E ? null : <Redirect href="/" />;
}
