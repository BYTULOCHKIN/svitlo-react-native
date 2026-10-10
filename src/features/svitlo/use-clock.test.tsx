import type { AppStateStatus } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';
import { getDateKey, getMinute } from './models';
import { useClock } from './use-clock';

function ClockProbe() {
  const now = useClock();
  return <Text testID="clock">{`${getDateKey(now)} ${getMinute(now)}`}</Text>;
}

it('resumes immediately with real Kyiv time after background and cleans up listeners and ticks', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-10T20:59:00Z'));
  let onActivity: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    onActivity = listener;
    return { remove };
  });
  try {
    const view = render(<ClockProbe />);
    expect(screen.getByTestId('clock').props.children).toBe('2026-10-10 1439');
    act(() => onActivity!('background'));
    expect(jest.getTimerCount()).toBe(0);
    jest.setSystemTime(new Date('2026-10-10T21:30:00Z'));
    expect(screen.getByTestId('clock').props.children).toBe('2026-10-10 1439');
    act(() => onActivity!('active'));
    expect(screen.getByTestId('clock').props.children).toBe('2026-10-11 30');
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByTestId('clock').props.children).toBe(`2026-10-11 ${30 + 1 / 60}`);
    view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  }
  finally {
    subscription.mockRestore();
    jest.useRealTimers();
  }
});
