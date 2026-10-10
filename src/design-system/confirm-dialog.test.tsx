import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AppConfirmDialog } from './confirm-dialog';

afterEach(cleanup);

it('requests safe cancellation on close and only confirms on an explicit destructive action', () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  render(<AppConfirmDialog open title="Видалити локацію?" message="Локацію «Дім» буде видалено." cancelLabel="Скасувати" confirmLabel="Видалити" onCancel={onCancel} onConfirm={onConfirm} danger error="Не вдалося записати." />);
  expect(screen.getByText('Локацію «Дім» буде видалено.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Скасувати' })).toHaveProp('accessibilityHint', 'Локацію «Дім» буде видалено.');
  expect(screen.getByRole('alert')).toHaveTextContent('Не вдалося записати.');
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  fireEvent.press(screen.getByRole('button', { name: 'Закрити діалог' }));
  expect(onCancel).toHaveBeenCalledTimes(2);
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Видалити' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
