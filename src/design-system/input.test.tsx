import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AppInput } from './input';

afterEach(cleanup);

it('labels the field, forwards changes and exposes its error', () => {
  const onChangeText = jest.fn();
  render(<AppInput label="Назва локації" value="" onChangeText={onChangeText} error="Вкажіть назву." />);
  const field = screen.getByLabelText('Назва локації');
  fireEvent.changeText(field, 'Робота');
  expect(onChangeText).toHaveBeenCalledWith('Робота');
  expect(screen.getByRole('alert')).toHaveTextContent('Вкажіть назву.');
  expect(field).toHaveProp('accessibilityHint', 'Вкажіть назву.');
});

it('keeps a disabled input discoverable and prevents editing', () => {
  const onChangeText = jest.fn();
  render(<AppInput label="Назва локації" value="Дім" onChangeText={onChangeText} disabled />);
  // RNTL also checks composite props; gluestack passes hidden=true to our
  // adapter, which clears it on the native field used by the screen reader.
  const field = screen.getByLabelText('Назва локації', { includeHiddenElements: true });
  expect(field).toHaveProp('accessibilityElementsHidden', false);
  expect(field).toBeDisabled();
  fireEvent.changeText(field, 'Робота');
  expect(onChangeText).not.toHaveBeenCalled();
});
