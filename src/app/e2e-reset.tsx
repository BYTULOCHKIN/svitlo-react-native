import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { useLocations } from '@/features/svitlo/location-store';
import { isE2E } from '@/lib/e2e';
import { storage } from '@/lib/storage';

export default function E2EReset() {
  useEffect(() => {
    if (isE2E) {
      // The flag selects a separate MMKV instance; normal locations are untouched.
      storage.clearAll();
      useLocations.setState({ locations: [], selectedId: null });
      router.replace('/');
    }
  }, []);
  return isE2E ? null : <Redirect href="/" />;
}
