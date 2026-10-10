import { createLocationStore } from './location-store';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getString: (key: string) => values.get(key),
    set: (key: string, value: string | number | boolean) => { values.set(key, String(value)); },
  };
}

describe('first queue selection', () => {
  it('starts without a location or an assigned queue', () => {
    const store = createLocationStore(memoryStorage());
    expect(store.getState().locations).toEqual([]);
    expect(store.getState().selectedId).toBeNull();
  });
  it('creates Home only after a choice and restores it from storage', () => {
    const persistence = memoryStorage();
    const store = createLocationStore(persistence);
    store.getState().chooseFirst('2.2');
    const restored = createLocationStore(persistence).getState();
    expect(restored.locations).toEqual([{ id: 'home', name: 'Дім', queue: '2.2', icon: 'home' }]);
    expect(restored.selectedId).toBe('home');
  });
  it('recovers safely from invalid saved JSON', () => {
    expect(createLocationStore({ getString: () => '{', set: () => {} }).getState().locations).toEqual([]);
  });
});
