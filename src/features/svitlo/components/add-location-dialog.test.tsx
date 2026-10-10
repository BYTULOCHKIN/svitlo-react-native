import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { storage } from '@/lib/storage';
import apiResponse from '../fixtures/poe-2026-10-10.json';
import { useLocations } from '../location-store';
import { parsePoeHtml } from '../poe-parser';
import { AddLocationDialog } from './add-location-dialog';
import { LocationSelector } from './location-selector';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'new-location') }));

beforeEach(() => {
  jest.clearAllMocks();
  useLocations.setState({ locations: [], selectedId: null });
  jest.spyOn(storage, 'set').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

function fillForm(name = ' Робота ') {
  fireEvent.changeText(screen.getByLabelText('Назва локації'), name);
  fireEvent.press(screen.getByRole('radio', { name: 'Іконка: Робота' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Черга 1.2' }));
}

it('offers every queue in the API response and saves a queue beyond the E2E fixture', () => {
  const queues = parsePoeHtml(apiResponse.html, apiResponse.date).queues.map(item => item.queue);
  render(<AddLocationDialog queues={queues} onClose={jest.fn()} />);
  for (const queue of queues)
    expect(screen.getByRole('radio', { name: `Черга ${queue}` })).toBeOnTheScreen();
  fireEvent.changeText(screen.getByLabelText('Назва локації'), 'Інша черга');
  fireEvent.press(screen.getByRole('radio', { name: 'Черга 6.2' }));
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  expect(useLocations.getState().locations[0]).toMatchObject({ name: 'Інша черга', queue: '6.2' });
});

it('blocks missing and whitespace-only names, missing queues and overlong names', () => {
  const onClose = jest.fn();
  render(<AddLocationDialog queues={['1.1', '1.2']} onClose={onClose} />);
  expect(screen.getByRole('button', { name: 'Зберегти' })).toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Назва локації'), 'Дім');
  expect(screen.getByRole('button', { name: 'Зберегти' })).toBeDisabled();
  fillForm('   ');
  expect(screen.getByRole('button', { name: 'Зберегти' })).toBeDisabled();
  fillForm('x'.repeat(21));
  expect(screen.getByRole('button', { name: 'Зберегти' })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  expect(storage.set).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

it('adds the named location through the actual selector and makes it active', () => {
  useLocations.getState().chooseFirst('1.1');
  render(<LocationSelector queues={['1.1', '1.2']} />);
  fireEvent.press(screen.getByRole('button', { name: 'Обрати локацію: Дім, черга 1.1' }));
  fireEvent.press(screen.getByRole('button', { name: 'Додати локацію' }));
  fillForm();
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  const state = useLocations.getState();
  expect(state.locations).toContainEqual({ id: 'new-location', name: 'Робота', queue: '1.2', icon: 'work' });
  expect(state.selectedId).toBe('new-location');
  expect(screen.queryByRole('header', { name: 'Нова локація' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Обрати локацію: Робота, черга 1.2' })).toBeOnTheScreen();
  expect(storage.set).toHaveBeenLastCalledWith('svitlo.locations.v1', JSON.stringify({ locations: state.locations, selectedId: state.selectedId }));
});

it('retains the draft and confirmed state on storage failure, and allows retry', () => {
  const onClose = jest.fn();
  render(<AddLocationDialog queues={['1.1', '1.2']} onClose={onClose} />);
  fillForm();
  jest.spyOn(storage, 'set').mockImplementationOnce(() => {
    throw new Error('Storage failure');
  });
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  expect(onClose).not.toHaveBeenCalled();
  expect(useLocations.getState().locations).toEqual([]);
  expect(screen.getByRole('alert')).toHaveTextContent('Не вдалося зберегти локацію. Спробуйте ще раз.');
  expect(screen.getByLabelText('Назва локації')).toHaveDisplayValue(' Робота ');
  expect(screen.getByRole('radio', { name: 'Черга 1.2', checked: true })).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(useLocations.getState().locations).toHaveLength(1);
});

it('accepts a 20-character name and shows an empty queue state without inventing values', () => {
  const { rerender } = render(<AddLocationDialog queues={[]} onClose={jest.fn()} />);
  expect(screen.getByText('Немає доступних черг. Оновіть графік.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Зберегти' })).toBeDisabled();
  rerender(<AddLocationDialog queues={['1.1', '1.2']} onClose={jest.fn()} />);
  fillForm('x'.repeat(20));
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  expect(useLocations.getState().locations[0].name).toHaveLength(20);
});

it.each(['name', 'icon', 'queue'])('protects a new draft after changing its %s without writing on discard', (field) => {
  const onClose = jest.fn();
  render(<AddLocationDialog queues={['1.1']} onClose={onClose} />);
  if (field === 'name')
    fireEvent.changeText(screen.getByLabelText('Назва локації'), 'Чернетка');
  else fireEvent.press(screen.getByRole('radio', { name: field === 'icon' ? 'Іконка: Робота' : 'Черга 1.1' }));
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('header', { name: 'Відкинути незбережені зміни?' })).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Продовжити редагування' }));
  if (field === 'name')
    expect(screen.getByLabelText('Назва локації')).toHaveDisplayValue('Чернетка');
  else expect(screen.getByRole('radio', { name: field === 'icon' ? 'Іконка: Робота' : 'Черга 1.1', checked: true })).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Закрити діалог' }));
  fireEvent.press(screen.getByRole('button', { name: 'Відкинути зміни' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(storage.set).not.toHaveBeenCalled();
});

it('closes an untouched new form immediately', () => {
  const onClose = jest.fn();
  render(<AddLocationDialog queues={['1.1']} onClose={onClose} />);
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('header', { name: 'Відкинути незбережені зміни?' })).toBeNull();
});
