import type { Location } from './models';
import { create } from 'zustand';
import { storage } from '@/lib/storage';

const KEY = 'svitlo.locations.v1';
type Selection = { locations: Location[]; selectedId: string | null };

type LocationStorage = Pick<typeof storage, 'getString' | 'set'>;

function load(persistence: LocationStorage): Selection {
  try {
    const raw: unknown = JSON.parse(persistence.getString(KEY) ?? 'null');
    if (raw && typeof raw === 'object' && 'locations' in raw && Array.isArray(raw.locations) && raw.locations.every(isLocation)) {
      const selectedId = 'selectedId' in raw && typeof raw.selectedId === 'string' ? raw.selectedId : null;
      return { locations: raw.locations, selectedId: raw.locations.find(location => location.id === selectedId)?.id ?? raw.locations[0]?.id ?? null };
    }
  }
  catch { /* Invalid saved data starts with an empty selection. */ }
  return { locations: [], selectedId: null };
}

function isLocation(value: unknown): value is Location {
  if (!value || typeof value !== 'object')
    return false;
  return 'id' in value && typeof value.id === 'string' && 'name' in value && typeof value.name === 'string' && 'queue' in value && typeof value.queue === 'string' && 'icon' in value && ['home', 'work', 'school', 'shop', 'gym', 'parents', 'cafe', 'heart'].includes(String(value.icon));
}

type LocationStore = Selection & { chooseFirst: (queue: string) => void };

export function createLocationStore(persistence: LocationStorage) {
  return create<LocationStore>(set => ({
    ...load(persistence),
    chooseFirst(queue) {
      const location: Location = { id: 'home', name: 'Дім', queue, icon: 'home' };
      const selection = { locations: [location], selectedId: location.id };
      persistence.set(KEY, JSON.stringify(selection));
      set(selection);
    },
  }));
}

export const useLocations = createLocationStore(storage);
