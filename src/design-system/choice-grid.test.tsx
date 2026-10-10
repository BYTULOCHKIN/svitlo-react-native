import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AppChoiceGrid } from './choice-grid';

afterEach(cleanup);

const options = [{ value: '1.1', label: '1.1' }, { value: '1.2', label: '1.2' }, { value: '2.1', label: '2.1', disabled: true }];

it('has no implicit selection and only reflects the controlled value after a parent update', () => {
  const onChange = jest.fn();
  const { rerender } = render(<AppChoiceGrid label="Черги" options={options} value="" onChange={onChange} />);
  expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
  fireEvent.press(screen.getByRole('radio', { name: '1.2' }));
  expect(onChange).toHaveBeenCalledWith('1.2');
  expect(screen.getByRole('radio', { name: '1.2', checked: false })).toBeOnTheScreen();
  rerender(<AppChoiceGrid label="Черги" options={options} value="1.2" onChange={onChange} />);
  expect(screen.getByRole('radio', { name: '1.2', checked: true })).toBeOnTheScreen();
});

it('blocks disabled choices and a disabled group', () => {
  const onChange = jest.fn();
  const { rerender } = render(<AppChoiceGrid label="Черги" options={options} value="1.1" onChange={onChange} />);
  const choice = screen.getByRole('radio', { name: '2.1' });
  expect(choice).toBeDisabled();
  fireEvent.press(choice);
  expect(onChange).not.toHaveBeenCalled();
  rerender(<AppChoiceGrid label="Черги" options={options} value="1.1" onChange={onChange} disabled />);
  fireEvent.press(screen.getByRole('radio', { name: '1.2' }));
  expect(onChange).not.toHaveBeenCalled();
});

it('keeps long labels readable and selectable', () => {
  const onChange = jest.fn();
  render(<AppChoiceGrid label="Черги" options={[{ value: '123.456', label: '123.456' }]} value="" onChange={onChange} />);
  fireEvent.press(screen.getByRole('radio', { name: '123.456' }));
  expect(onChange).toHaveBeenCalledWith('123.456');
  expect(screen.getByText('123.456')).toBeOnTheScreen();
});
