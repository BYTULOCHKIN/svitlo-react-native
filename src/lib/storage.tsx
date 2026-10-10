import { createMMKV } from 'react-native-mmkv';
import { isE2E, useE2EFixtures } from './e2e';

export const storage = createMMKV(isE2E ? { id: useE2EFixtures ? 'svitlo.e2e.fixtures' : 'svitlo.e2e' } : undefined);

export function getItem<T>(key: string): T | null {
  const value = storage.getString(key);
  return value ? JSON.parse(value) || null : null;
}

export async function setItem<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

export async function removeItem(key: string) {
  storage.remove(key);
}
