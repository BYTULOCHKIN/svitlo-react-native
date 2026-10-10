import type { Location } from '../models';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { storage } from '@/lib/storage';
import { createLocationStore, useLocations } from '../location-store';
import { LocationSelector } from './location-selector';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'work') }));

const home: Location = { id: 'home', name: 'Дім', queue: '1.1', icon: 'home' };
const work: Location = { id: 'work', name: 'Робота', queue: '2.1', icon: 'work' };
const persisted = new Map<string, string>();

beforeEach(() => {
  jest.clearAllMocks();
  persisted.clear();
  useLocations.setState({ locations: [home, work], selectedId: 'home' });
  jest.spyOn(storage, 'set').mockImplementation((key, value) => {
    persisted.set(key, String(value));
  });
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

function openEdit(name = 'Робота') {
  fireEvent.press(screen.getByRole('button', { name: 'Обрати локацію: Дім, черга 1.1' }));
  fireEvent.press(screen.getByRole('button', { name: `Редагувати ${name}` }));
}

it('loads the exact location and retains a saved queue missing from the operator list', () => {
  render(<LocationSelector queues={['1.1']} />);
  openEdit();
  expect(screen.getByRole('header', { name: 'Редагувати локацію' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Назва локації')).toHaveDisplayValue('Робота');
  expect(screen.getByRole('radio', { name: 'Іконка: Робота', checked: true })).toBeOnTheScreen();
  expect(screen.getByRole('radio', { name: 'Черга 2.1', checked: true })).toBeOnTheScreen();
});

it.each(['Дім', 'Робота'])('edits %s, trims its name and restores selection and values from persistence', (name) => {
  render(<LocationSelector queues={['1.1', '1.2']} />);
  openEdit(name);
  fireEvent.changeText(screen.getByLabelText('Назва локації'), ' Квартира ');
  fireEvent.press(screen.getByRole('radio', { name: 'Іконка: Кохані' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Черга 1.2' }));
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  const edited = { ...(name === 'Дім' ? home : work), name: 'Квартира', queue: '1.2', icon: 'heart' };
  const expected = name === 'Дім' ? [edited, work] : [home, edited];
  expect(useLocations.getState().locations).toEqual(expected);
  expect(useLocations.getState().selectedId).toBe('home');
  const restored = createLocationStore({ getString: key => persisted.get(key), set: () => {} }).getState();
  expect(restored.locations).toEqual(expected);
  expect(restored.selectedId).toBe('home');
  expect(screen.queryByRole('header', { name: 'Редагувати локацію' })).toBeNull();
});

it('keeps the saved location and edited draft after failure, then allows retry', () => {
  render(<LocationSelector queues={['1.1', '1.2']} />);
  openEdit();
  fireEvent.changeText(screen.getByLabelText('Назва локації'), 'Офіс');
  jest.spyOn(storage, 'set').mockImplementationOnce(() => {
    throw new Error('Storage failure');
  });
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  expect(useLocations.getState().locations).toEqual([home, work]);
  expect(screen.getByLabelText('Назва локації')).toHaveDisplayValue('Офіс');
  expect(screen.getByRole('alert')).toHaveTextContent('Не вдалося зберегти локацію. Спробуйте ще раз.');
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  expect(useLocations.getState().locations[1].name).toBe('Офіс');
  expect(useLocations.getState().selectedId).toBe('home');
});

const closeRequests = {
  cancel: () => fireEvent.press(screen.getByRole('button', { name: 'Скасувати' })),
  close: () => fireEvent.press(screen.getByRole('button', { name: 'Закрити діалог' })),
  backdrop: () => fireEvent.press(screen.getByTestId('app-dialog-backdrop')),
  back: () => fireEvent(screen.UNSAFE_getAllByType(Modal).find(modal => modal.props.visible)!, 'requestClose'),
  accessibilityEscape: () => fireEvent(screen.getByLabelText('Редагувати локацію'), 'accessibilityEscape'),
};

it.each(Object.keys(closeRequests) as (keyof typeof closeRequests)[])('protects a dirty draft on %s and safely resumes or discards it', (request) => {
  render(<LocationSelector queues={['1.1', '1.2']} />);
  openEdit();
  fireEvent.changeText(screen.getByLabelText('Назва локації'), 'Чернетка');
  closeRequests[request]();
  expect(screen.getByRole('header', { name: 'Відкинути незбережені зміни?' })).toBeOnTheScreen();
  expect(screen.queryByLabelText('Назва локації')).toBeNull();
  expect(storage.set).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Продовжити редагування' }));
  expect(screen.getByLabelText('Назва локації')).toHaveDisplayValue('Чернетка');
  closeRequests[request]();
  fireEvent.press(screen.getByRole('button', { name: 'Відкинути зміни' }));
  expect(screen.queryByRole('header', { name: 'Редагувати локацію' })).toBeNull();
  expect(useLocations.getState().locations).toEqual([home, work]);
  expect(storage.set).not.toHaveBeenCalled();
});

it.each(['icon', 'queue'])('detects a changed %s and closes immediately after reverting every field', (field) => {
  render(<LocationSelector queues={['1.1', '1.2']} />);
  openEdit();
  const changed = field === 'icon' ? 'Іконка: Кохані' : 'Черга 1.2';
  const initial = field === 'icon' ? 'Іконка: Робота' : 'Черга 2.1';
  fireEvent.press(screen.getByRole('radio', { name: changed }));
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  fireEvent.press(screen.getByRole('button', { name: 'Закрити діалог' }));
  expect(screen.getByRole('radio', { name: changed, checked: true })).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('radio', { name: initial }));
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  expect(screen.queryByRole('header', { name: 'Відкинути незбережені зміни?' })).toBeNull();
  expect(screen.queryByRole('header', { name: 'Редагувати локацію' })).toBeNull();
  expect(storage.set).not.toHaveBeenCalled();
});

it('closes an unchanged form immediately and treats reverting the name as clean', () => {
  render(<LocationSelector queues={['1.1']} />);
  openEdit();
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  expect(screen.queryByRole('header', { name: 'Відкинути незбережені зміни?' })).toBeNull();
  openEdit();
  fireEvent.changeText(screen.getByLabelText('Назва локації'), 'Офіс');
  fireEvent.changeText(screen.getByLabelText('Назва локації'), 'Робота');
  fireEvent.press(screen.getByRole('button', { name: 'Закрити діалог' }));
  expect(screen.queryByRole('header', { name: 'Редагувати локацію' })).toBeNull();
  expect(storage.set).not.toHaveBeenCalled();
});

it.each(['Скасувати', 'Закрити діалог'])('safely cancels deletion with %s and preserves the edited draft', (action) => {
  render(<LocationSelector queues={['1.1']} />);
  openEdit();
  fireEvent.changeText(screen.getByLabelText('Назва локації'), 'Офіс');
  fireEvent.press(screen.getByRole('button', { name: 'Видалити локацію' }));
  expect(screen.getByText('Локацію «Робота» буде видалено.')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: action }));
  expect(screen.getByLabelText('Назва локації')).toHaveDisplayValue('Офіс');
  expect(useLocations.getState().locations).toEqual([home, work]);
  expect(storage.set).not.toHaveBeenCalled();
});

it.each([
  { name: 'Робота', locations: [home, work], next: 'home' },
  { name: 'Дім', locations: [home, work], next: 'work' },
  { name: 'Дім', locations: [home], next: null },
])('confirms deleting $name, selects $next and restores the result', ({ name, locations, next }) => {
  useLocations.setState({ locations, selectedId: 'home' });
  render(<LocationSelector queues={['1.1']} />);
  openEdit(name);
  fireEvent.changeText(screen.getByLabelText('Назва локації'), 'Чернетка');
  fireEvent.press(screen.getByRole('button', { name: 'Видалити локацію' }));
  fireEvent.press(screen.getByRole('button', { name: 'Видалити' }));
  const remaining = locations.filter(location => location.name !== name);
  expect(useLocations.getState().locations).toEqual(remaining);
  expect(useLocations.getState().selectedId).toBe(next);
  const restored = createLocationStore({ getString: key => persisted.get(key), set: () => {} }).getState();
  expect(restored.locations).toEqual(remaining);
  expect(restored.selectedId).toBe(next);
  expect(screen.queryByRole('header', { name: 'Відкинути незбережені зміни?' })).toBeNull();
  expect(screen.queryByRole('header', { name: 'Видалити локацію?' })).toBeNull();
});

it('keeps a location after a failed deletion and allows retry inside its confirmation', () => {
  render(<LocationSelector queues={['1.1']} />);
  openEdit();
  fireEvent.press(screen.getByRole('button', { name: 'Видалити локацію' }));
  jest.spyOn(storage, 'set').mockImplementationOnce(() => {
    throw new Error('Storage failure');
  });
  fireEvent.press(screen.getByRole('button', { name: 'Видалити' }));
  expect(useLocations.getState().locations).toEqual([home, work]);
  expect(screen.getByRole('alert')).toHaveTextContent('Не вдалося видалити локацію. Спробуйте ще раз.');
  expect(screen.getByRole('header', { name: 'Видалити локацію?' })).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Видалити' }));
  expect(useLocations.getState().locations).toEqual([home]);
});
