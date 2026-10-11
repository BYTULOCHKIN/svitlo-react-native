import type { DeliverySettings, InstallationIdentity } from './models';
import { historySchema, registrationSchema } from './models';

type ClientOptions = { url: string; getIdentity: () => Promise<InstallationIdentity>; request?: typeof fetch };

export function createNotificationsClient({ url, getIdentity, request = fetch }: ClientOptions) {
  let registration: Promise<InstallationIdentity> | undefined;
  async function send(path: string, options: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await request(`${url.replace(/\/$/, '')}${path}`, { ...options, signal: controller.signal });
      if (!response.ok)
        throw new Error('Не вдалося завантажити сповіщення. Спробуйте ще раз.');
      return await response.json();
    }
    catch {
      throw new Error('Не вдалося завантажити сповіщення. Спробуйте ще раз.');
    }
    finally {
      clearTimeout(timeout);
    }
  }
  async function register() {
    const identity = await getIdentity();
    const result = registrationSchema.parse(await send('/v1/installations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(identity) }));
    if (result.id !== identity.id)
      throw new Error('Не вдалося налаштувати сповіщення. Спробуйте ще раз.');
    return identity;
  }
  function connect() {
    registration ??= register().catch((error) => {
      registration = undefined;
      throw error;
    });
    return registration;
  }
  return {
    connect,
    reset: () => { registration = undefined; },
    async updateDelivery(settings: DeliverySettings) {
      const identity = await connect();
      await send('/v1/delivery', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${identity.secret}`, 'X-Installation-Id': identity.id }, body: JSON.stringify(settings) });
    },
    async history(cursor?: string) {
      const identity = await connect();
      const data = await send(`/v1/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { headers: { 'Authorization': `Bearer ${identity.secret}`, 'X-Installation-Id': identity.id } });
      return historySchema.parse(data);
    },
  };
}
