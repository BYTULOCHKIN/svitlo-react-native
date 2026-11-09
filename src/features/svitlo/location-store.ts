import type { Location } from './models';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { storage } from '@/lib/storage';

const KEY = 'svitlo.locations.v1';
type Selection = { locations: Location[]; selectedId: string | null; notificationRevision: number; regionalPushEnabled: boolean };
type Choice = Pick<Selection, 'locations' | 'selectedId'> & Partial<Pick<Selection, 'regionalPushEnabled'>>;

type LocationStorage = Pick<typeof storage, 'getString' | 'set'>;

function load(persistence: LocationStorage): Selection {
  try {
    const raw: unknown = JSON.parse(persistence.getString(KEY) ?? 'null');
    if (raw && typeof raw === 'object' && 'locations' in raw && Array.isArray(raw.locations) && raw.locations.every(isLocation)) {
      const selectedId = 'selectedId' in raw && typeof raw.selectedId === 'string' ? raw.selectedId : null;
      return { notificationRevision: 'notificationRevision' in raw && Number.isSafeInteger(raw.notificationRevision) && Number(raw.notificationRevision) > 0 ? Number(raw.notificationRevision) : 1, regionalPushEnabled: !('regionalPushEnabled' in raw) || raw.regionalPushEnabled !== false, locations: raw.locations.map(location => ({ ...location, notificationsEnabled: location.notificationsEnabled ?? true })), selectedId: raw.locations.find(location => location.id === selectedId)?.id ?? raw.locations[0]?.id ?? null };
    }
  }
  catch { /* Invalid saved data starts with an empty selection. */ }
  return { locations: [], selectedId: null, notificationRevision: 1, regionalPushEnabled: true };
}

function isLocation(value: unknown): value is Location {
  if (!value || typeof value !== 'object')
    return false;
  return (!('notificationsEnabled' in value) || typeof value.notificationsEnabled === 'boolean') && 'id' in value && typeof value.id === 'string' && 'name' in value && typeof value.name === 'string' && 'queue' in value && typeof value.queue === 'string' && 'icon' in value && ['home', 'work', 'school', 'shop', 'gym', 'parents', 'cafe', 'heart'].includes(String(value.icon));
}

type LocationStore = Selection & {
  setRegionalPush: (enabled: boolean) => void;
  setLocationNotifications: (id: string, enabled: boolean) => void;
  chooseFirst: (queue: string) => void;
  add: (location: Omit<Location, 'id'>) => void;
  edit: (location: Location) => void;
  select: (id: string) => void;
  remove: (id: string) => void;
};

export function createLocationStore(persistence: LocationStorage, generateId = randomUUID) {
  return create<LocationStore>((set, get) => {
    function save(choice: Choice) {
      const previous = get();
      const regionalPushEnabled = choice.regionalPushEnabled ?? previous.regionalPushEnabled;
      const subscriptions = (locations: Location[]) => JSON.stringify(locations.map(location => ({ id: location.id, name: location.name, queue: location.queue, enabled: location.notificationsEnabled ?? true })));
      const changed = regionalPushEnabled !== previous.regionalPushEnabled || subscriptions(choice.locations) !== subscriptions(previous.locations);
      const selection: Selection = { ...choice, regionalPushEnabled, notificationRevision: previous.notificationRevision + Number(changed) };
      persistence.set(KEY, JSON.stringify(selection));
      set(selection);
    }
    return {
      ...load(persistence),
      setRegionalPush(enabled) {
        save({ locations: get().locations, selectedId: get().selectedId, regionalPushEnabled: enabled });
      },
      setLocationNotifications(id, enabled) {
        save({ locations: get().locations.map(location => location.id === id ? { ...location, notificationsEnabled: enabled } : location), selectedId: get().selectedId });
      },
      chooseFirst(queue) {
        const location: Location = { id: 'home', name: 'Дім', queue, icon: 'home', notificationsEnabled: true };
        const selection = { locations: [location], selectedId: location.id };
        save(selection);
      },
      add(input) {
        validate(input);
        if (get().locations.length >= 50)
          throw new Error('Можна зберегти до 50 локацій');
        const location = { ...input, notificationsEnabled: input.notificationsEnabled ?? true, name: input.name.trim(), id: generateId() };
        save({ locations: [...get().locations, location], selectedId: location.id });
      },
      edit(location) {
        validate(location);
        if (!get().locations.some(item => item.id === location.id))
          return;
        save({ locations: get().locations.map(item => item.id === location.id ? { ...location, notificationsEnabled: location.notificationsEnabled ?? item.notificationsEnabled ?? true, name: location.name.trim() } : item), selectedId: get().selectedId });
      },
      select(id) {
        if (get().locations.some(location => location.id === id))
          save({ locations: get().locations, selectedId: id });
      },
      remove(id) {
        const locations = get().locations.filter(location => location.id !== id);
        const selectedId = get().selectedId === id ? locations[0]?.id ?? null : get().selectedId;
        save({ locations, selectedId });
      },
    };
  });
}

function validate(location: Omit<Location, 'id'>) {
  if (!location.name.trim() || location.name.trim().length > 20 || !/^\d+\.\d+$/.test(location.queue))
    throw new Error('Вкажіть назву й оберіть чергу');
}

export const useLocations = createLocationStore(storage);
