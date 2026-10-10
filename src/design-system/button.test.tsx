import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AppButton, AppIconButton } from './button';
import { AppIcon } from './icon';

afterEach(cleanup);

it('activates the action and blocks it while loading or disabled, preserving its name', () => {
  const onPress = jest.fn();
  const { rerender } = render(<AppButton onPress={onPress}>Зберегти</AppButton>);
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<AppButton onPress={onPress} loading>Зберегти</AppButton>);
  expect(screen.getByRole('button', { name: 'Зберегти', busy: true })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  rerender(<AppButton onPress={onPress} disabled>Зберегти</AppButton>);
  expect(screen.getByRole('button', { name: 'Зберегти' })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Зберегти' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('names an icon action without depending on its decorative icon', () => {
  const onPress = jest.fn();
  render(<AppIconButton accessibilityLabel="Закрити діалог" icon={<AppIcon name="close" />} onPress={onPress} />);
  fireEvent.press(screen.getByRole('button', { name: 'Закрити діалог' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
