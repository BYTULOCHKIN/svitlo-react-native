import { act, render } from '@testing-library/react-native';
import { useLocations } from '../location-store';
import { WidgetBootstrap } from './bootstrap';
import { widgetNative } from './native';

jest.mock('./native', () => ({ widgetNative: { sync: jest.fn() } }));
beforeEach(() => {
  jest.mocked(widgetNative!.sync).mockReset();
  useLocations.setState({ locations: [{ id: 'home', name: 'Дім', queue: '1.1', icon: 'home', notificationsEnabled: true }], selectedId: 'home' });
});
it('synchronises current persisted locations and later edits/deletion through the native bridge', () => {
  const view = render(<WidgetBootstrap />);
  expect(widgetNative!.sync).toHaveBeenLastCalledWith(JSON.stringify([{ id: 'home', name: 'Дім', queue: '1.1' }]), expect.any(String), expect.any(String));
  act(() => useLocations.getState().edit({ id: 'home', name: 'Нова назва', queue: '2.1', icon: 'home' }));
  expect(widgetNative!.sync).toHaveBeenLastCalledWith(JSON.stringify([{ id: 'home', name: 'Нова назва', queue: '2.1' }]), expect.any(String), expect.any(String));
  act(() => useLocations.getState().remove('home'));
  expect(widgetNative!.sync).toHaveBeenLastCalledWith('[]', expect.any(String), expect.any(String));
  view.unmount();
  const count = jest.mocked(widgetNative!.sync).mock.calls.length;
  act(() => useLocations.getState().chooseFirst('1.1'));
  expect(widgetNative!.sync).toHaveBeenCalledTimes(count);
});
it('does not synchronise a selection-only change or fail location editing when the bridge rejects', () => {
  jest.mocked(widgetNative!.sync).mockImplementation(() => {
    throw new Error('native write failed');
  });
  render(<WidgetBootstrap />);
  act(() => useLocations.getState().select('home'));
  expect(widgetNative!.sync).toHaveBeenCalledTimes(1);
  act(() => useLocations.getState().edit({ id: 'home', name: 'Збережено', queue: '1.1', icon: 'home' }));
  expect(useLocations.getState().locations[0].name).toBe('Збережено');
  expect(widgetNative!.sync).toHaveBeenCalledTimes(2);
});
