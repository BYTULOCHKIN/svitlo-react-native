import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { QueuePicker } from './queue-picker';

afterEach(cleanup);

it('offers every API queue and chooses it without requiring another save action', () => {
  const queues = Array.from({ length: 12 }, (_, index) => `${Math.floor(index / 2) + 1}.${index % 2 + 1}`);
  const onChoose = jest.fn();
  render(<QueuePicker visible queues={queues} loading={false} onChoose={onChoose} onClose={jest.fn()} onRetry={jest.fn()} />);
  for (const queue of queues) {
    fireEvent.press(screen.getByRole('radio', { name: `Черга ${queue}` }));
    expect(onChoose).toHaveBeenLastCalledWith(queue);
  }
});

it('keeps empty, failed and loading states recoverable', () => {
  const onRetry = jest.fn();
  const onClose = jest.fn();
  const props = { visible: true, queues: [], onChoose: jest.fn(), onClose, onRetry };
  const { rerender } = render(<QueuePicker {...props} loading />);
  expect(screen.getByLabelText('Завантаження черг')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Спробувати ще раз' })).toBeNull();
  rerender(<QueuePicker {...props} loading={false} error="Помилка мережі" />);
  expect(screen.getByText('Помилка мережі')).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Спробувати ще раз' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Скасувати' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  rerender(<QueuePicker {...props} visible={false} loading={false} />);
  expect(screen.queryByRole('header', { name: 'Оберіть чергу' })).toBeNull();
});
