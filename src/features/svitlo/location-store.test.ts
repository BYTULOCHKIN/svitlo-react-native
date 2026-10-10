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
  it('adds, switches and edits locations without losing persistence', () => {
    const persistence = memoryStorage();
    const store = createLocationStore(persistence, () => 'work');
    store.getState().chooseFirst('2.2');
    store.getState().add({ name: ' Робота ', queue: '4.1', icon: 'work' });
    expect(store.getState().selectedId).toBe('work');
    store.getState().select('home');
    store.getState().edit({ id: 'home', name: 'Квартира', queue: '1.2', icon: 'heart' });
    const restored = createLocationStore(persistence).getState();
    expect(restored.selectedId).toBe('home');
    expect(restored.locations.map(location => location.queue)).toEqual(['1.2', '4.1']);
    expect(restored.locations[1].name).toBe('Робота');
  });
  it('rejects empty names and invalid queues', () => {
    const store = createLocationStore(memoryStorage(), () => 'test');
    expect(() => store.getState().add({ name: ' ', queue: '1.1', icon: 'home' })).toThrow();
    expect(() => store.getState().add({ name: 'Дім', queue: '', icon: 'home' })).toThrow();
    expect(store.getState().locations).toEqual([]);
  });
  it('does not update the visible selection when persistence fails', () => {
    const store = createLocationStore({ getString: () => undefined, set: () => {
      throw new Error('Storage failure');
    } });
    expect(() => store.getState().chooseFirst('1.1')).toThrow();
    expect(store.getState().selectedId).toBeNull();
  });
});
