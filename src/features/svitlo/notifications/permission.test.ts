import { createPermissionController } from './permission';

function setup(permission: 'undetermined' | 'granted' | 'denied' = 'undetermined') {
  const native = { getPermission: jest.fn(async () => permission), requestPermission: jest.fn(async () => 'granted' as const), getToken: jest.fn(async () => 'ExpoPushToken[device-1]') };
  const sync = jest.fn(async () => {});
  return { native, sync, controller: createPermissionController(native, sync) };
}

it('inspects the OS without asking permission or registering a token before explicit enable', async () => {
  const p = setup();
  expect(await p.controller.inspect()).toEqual({ permission: 'undetermined', ready: false });
  expect(p.native.requestPermission).not.toHaveBeenCalled();
  expect(p.native.getToken).not.toHaveBeenCalled();
  expect(p.sync).toHaveBeenCalledWith({ permission: 'undetermined' });
  expect(await p.controller.enable()).toEqual({ permission: 'granted', ready: true });
  expect(p.native.requestPermission).toHaveBeenCalledTimes(1);
  expect(p.sync).toHaveBeenLastCalledWith({ permission: 'granted', token: 'ExpoPushToken[device-1]' });
});

it('reports denial without repeated prompts or a token request', async () => {
  const p = setup('denied');
  expect(await p.controller.enable()).toEqual({ permission: 'denied', ready: false });
  expect(p.native.requestPermission).not.toHaveBeenCalled();
  expect(p.native.getToken).not.toHaveBeenCalled();
  expect(p.sync).toHaveBeenCalledWith({ permission: 'denied' });
});

it('refreshes a previously granted token without requesting OS permission', async () => {
  const p = setup('granted');
  expect(await p.controller.inspect()).toEqual({ permission: 'granted', ready: true });
  expect(p.native.requestPermission).not.toHaveBeenCalled();
  expect(p.sync).toHaveBeenCalledWith({ permission: 'granted', token: 'ExpoPushToken[device-1]' });
});

it('preserves actual OS permission when token or server registration fails', async () => {
  const p = setup('granted');
  p.native.getToken.mockRejectedValueOnce(new Error('FCM unavailable'));
  expect(await p.controller.inspect()).toEqual({ permission: 'granted', ready: false });
  expect(p.sync).toHaveBeenCalledWith({ permission: 'granted' });
  p.sync.mockRejectedValueOnce(new Error('offline'));
  expect(await p.controller.inspect()).toEqual({ permission: 'granted', ready: false });
});
