import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AppDialog } from './dialog';
import { AppText } from './text';

afterEach(cleanup);

it('shows the named dialog and requests closure while remaining controlled', () => {
  const onRequestClose = jest.fn();
  const { rerender } = render(<AppDialog open title="Нова локація" onRequestClose={onRequestClose}><AppText>Вміст форми</AppText></AppDialog>);
  expect(screen.getByRole('header', { name: 'Нова локація' })).toBeOnTheScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Закрити діалог' }));
  expect(onRequestClose).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Вміст форми')).toBeOnTheScreen();
  rerender(<AppDialog open={false} title="Нова локація" onRequestClose={onRequestClose}><AppText>Вміст форми</AppText></AppDialog>);
  expect(screen.queryByText('Вміст форми')).toBeNull();
});
