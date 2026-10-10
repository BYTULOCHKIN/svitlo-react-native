import type { Location } from './models';
import { randomUUID } from 'expo-crypto';
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

type LocationStore = Selection & {
  chooseFirst: (queue: string) => void;
  add: (location: Omit<Location, 'id'>) => void;
  edit: (location: Location) => void;
  select: (id: string) => void;
};

export function createLocationStore(persistence: LocationStorage, generateId = randomUUID) {
  return create<LocationStore>((set, get) => {
    function save(selection: Selection) {
      persistence.set(KEY, JSON.stringify(selection));
      set(selection);
    }
    return {
      ...load(persistence),
      chooseFirst(queue) {
        const location: Location = { id: 'home', name: 'Дім', queue, icon: 'home' };
        const selection = { locations: [location], selectedId: location.id };
        save(selection);
      },
      add(input) {
        validate(input);
        const location = { ...input, name: input.name.trim(), id: generateId() };
        save({ locations: [...get().locations, location], selectedId: location.id });
      },
      edit(location) {
        validate(location);
        if (!get().locations.some(item => item.id === location.id))
          return;
        save({ locations: get().locations.map(item => item.id === location.id ? { ...location, name: location.name.trim() } : item), selectedId: get().selectedId });
      },
      select(id) {
        if (get().locations.some(location => location.id === id))
          save({ locations: get().locations, selectedId: id });
      },
    };
  });
}

function validate(location: Omit<Location, 'id'>) {
  if (!location.name.trim() || location.name.trim().length > 20 || !/^\d+\.\d+$/.test(location.queue))
    throw new Error('Вкажіть назву й оберіть чергу');
}

export const useLocations = createLocationStore(storage);
