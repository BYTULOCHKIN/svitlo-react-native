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
    expect(restored.locations).toEqual([{ id: 'home', name: 'Дім', queue: '2.2', icon: 'home', notificationsEnabled: true }]);
    expect(restored.selectedId).toBe('home');
  });
  it('recovers safely from invalid saved JSON', () => {
    expect(createLocationStore({ getString: () => '{', set: () => {} }).getState().locations).toEqual([]);
  });
  it('adds, switches and edits locations without losing persistence', () => {
    const persistence = memoryStorage();
    const store = createLocationStore(persistence, () => 'work');
    store.getState().chooseFirst('2.2');
    store.getState().add({ name: ' Робота ', queue: '4.1', icon: 'work', notificationsEnabled: true });
    expect(store.getState().selectedId).toBe('work');
    store.getState().select('home');
    store.getState().edit({ id: 'home', name: 'Квартира', queue: '1.2', icon: 'heart', notificationsEnabled: true });
    const restored = createLocationStore(persistence).getState();
    expect(restored.selectedId).toBe('home');
    expect(restored.locations.map(location => location.queue)).toEqual(['1.2', '4.1']);
    expect(restored.locations[1].name).toBe('Робота');
  });
  it('rejects empty names and invalid queues', () => {
    const store = createLocationStore(memoryStorage(), () => 'test');
    expect(() => store.getState().add({ name: ' ', queue: '1.1', icon: 'home', notificationsEnabled: true })).toThrow();
    expect(() => store.getState().add({ name: 'Дім', queue: '', icon: 'home', notificationsEnabled: true })).toThrow();
    expect(store.getState().locations).toEqual([]);
  });
  it('deletes an inactive location without changing selection', () => {
    const store = createLocationStore(memoryStorage(), () => 'work');
    store.getState().chooseFirst('1.1');
    store.getState().add({ name: 'Робота', queue: '2.1', icon: 'work', notificationsEnabled: true });
    store.getState().remove('home');
    expect(store.getState().selectedId).toBe('work');
    expect(store.getState().locations).toHaveLength(1);
  });
  it('selects a remaining location after deleting the active one', () => {
    const store = createLocationStore(memoryStorage(), () => 'work');
    store.getState().chooseFirst('1.1');
    store.getState().add({ name: 'Робота', queue: '2.1', icon: 'work', notificationsEnabled: true });
    store.getState().remove('work');
    expect(store.getState().selectedId).toBe('home');
  });
  it('persists deletion of the last location and allows choosing again', () => {
    const persistence = memoryStorage();
    const store = createLocationStore(persistence);
    store.getState().chooseFirst('1.1');
    store.getState().remove('home');
    const restored = createLocationStore(persistence);
    expect(restored.getState().locations).toEqual([]);
    expect(restored.getState().selectedId).toBeNull();
    restored.getState().chooseFirst('6.2');
    expect(restored.getState().locations[0].queue).toBe('6.2');
  });
  it('does not update the visible selection when persistence fails', () => {
    const store = createLocationStore({ getString: () => undefined, set: () => {
      throw new Error('Storage failure');
    } });
    expect(() => store.getState().chooseFirst('1.1')).toThrow();
    expect(store.getState().selectedId).toBeNull();
  });
});

it('migrates legacy locations without changing names, icons, queues or selected location', () => {
  const old = { locations: [{ id: 'home', name: 'Дім', queue: '1.1', icon: 'home' }, { id: 'work', name: 'Офіс', queue: '2.1', icon: 'work' }], selectedId: 'work' };
  const store = createLocationStore({ getString: () => JSON.stringify(old), set: () => {} });
  expect(store.getState().locations).toEqual(old.locations.map(location => ({ ...location, notificationsEnabled: true })));
  expect(store.getState().selectedId).toBe('work');
  expect(store.getState().regionalPushEnabled).toBe(true);
});

it('persists independent switches and advances notification revisions only for subscription changes', () => {
  const persistence = memoryStorage();
  const store = createLocationStore(persistence, () => 'work');
  store.getState().chooseFirst('1.1');
  store.getState().add({ name: 'Офіс', queue: '1.1', icon: 'work' });
  const before = store.getState().notificationRevision;
  store.getState().select('home');
  store.getState().edit({ ...store.getState().locations[0], icon: 'heart' });
  expect(store.getState().notificationRevision).toBe(before);
  store.getState().setRegionalPush(false);
  store.getState().setLocationNotifications('home', false);
  const restored = createLocationStore(persistence).getState();
  expect(restored.notificationRevision).toBe(before + 2);
  expect(restored.regionalPushEnabled).toBe(false);
  expect(restored.locations.map(location => location.notificationsEnabled)).toEqual([false, true]);
  store.getState().remove('home');
  store.getState().remove('work');
  expect(createLocationStore(persistence).getState().notificationRevision).toBe(before + 4);
});
