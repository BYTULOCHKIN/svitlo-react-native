import type { InstallationIdentity } from './models';
import { identitySchema } from './models';

export type InstallationStorage = {
  getId: () => string | undefined;
  setId: (id: string) => void;
  getSecret: () => Promise<string | null>;
  setSecret: (secret: string) => Promise<void>;
};

export function createInstallationManager(storage: InstallationStorage, generate: () => InstallationIdentity) {
  let pending: Promise<InstallationIdentity> | undefined;
  async function loadOrCreate() {
    const id = storage.getId();
    // A missing local marker means a fresh install, even if iOS retained Keychain.
    const secret = id ? await storage.getSecret() : null;
    const saved = identitySchema.safeParse({ id, secret });
    if (saved.success)
      return saved.data;
    const identity = identitySchema.parse(generate());
    await storage.setSecret(identity.secret);
    storage.setId(identity.id);
    return identity;
  }
  return {
    get() {
      pending ??= loadOrCreate().finally(() => {
        pending = undefined;
      });
      return pending;
    },
  };
}
