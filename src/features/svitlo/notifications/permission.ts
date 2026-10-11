import type { DeliverySettings } from './models';

export type Permission = DeliverySettings['permission'];
export type PushState = { permission: Permission; ready: boolean };
type NativePush = { getPermission: () => Promise<Permission>; requestPermission: () => Promise<Permission>; getToken: () => Promise<string> };

export function createPermissionController(native: NativePush, sync: (settings: DeliverySettings) => Promise<void>) {
  async function synchronize(permission: Permission): Promise<PushState> {
    let token: string | undefined;
    try {
      if (permission === 'granted')
        token = await native.getToken();
    }
    catch { /* Permission is independent of token registration readiness. */ }
    try {
      await sync({ permission, ...(token ? { token } : {}) });
      return { permission, ready: !!token };
    }
    catch { return { permission, ready: false }; }
  }
  return {
    async inspect() { return synchronize(await native.getPermission()); },
    async enable() {
      const current = await native.getPermission();
      return synchronize(current === 'undetermined' ? await native.requestPermission() : current);
    },
  };
}
