import { getRandomBytes, randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { isE2E } from '@/lib/e2e';
import { storage } from '@/lib/storage';
import { createNotificationsClient } from './client';
import { createInstallationManager } from './installation';

const idKey = 'svitlo.notifications.installation.v1';
const secretKey = isE2E ? 'svitlo.notifications.e2e.secret.v1' : 'svitlo.notifications.secret.v1';
const installation = createInstallationManager({
  getId: () => storage.getString(idKey),
  setId: id => storage.set(idKey, id),
  getSecret: () => SecureStore.getItemAsync(secretKey),
  setSecret: secret => SecureStore.setItemAsync(secretKey, secret, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
}, () => ({ id: randomUUID(), secret: Array.from(getRandomBytes(32), byte => byte.toString(16).padStart(2, '0')).join('') }));

const url = process.env.EXPO_PUBLIC_SVITLO_API_URL ?? process.env.EXPO_PUBLIC_NOTIFICATIONS_API_URL;
// No demo data or localhost fallback is included in a release build.
export const notificationsClient = url ? createNotificationsClient({ url, getIdentity: () => installation.get() }) : undefined;
