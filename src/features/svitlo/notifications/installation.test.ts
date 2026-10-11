import { createInstallationManager } from './installation';

const identity = { id: '00000000-0000-4000-8000-000000000001', secret: 'ab'.repeat(32) };

function persistence(id?: string, secret: string | null = null) {
  return {
    getId: jest.fn(() => id),
    setId: jest.fn((value: string) => { id = value; }),
    getSecret: jest.fn(async () => secret),
    setSecret: jest.fn(async (value: string) => { secret = value; }),
  };
}

it('coalesces concurrent creation and restores the identity after a restart', async () => {
  const storage = persistence();
  const generate = jest.fn(() => identity);
  const manager = createInstallationManager(storage, generate);
  expect(await Promise.all([manager.get(), manager.get()])).toEqual([identity, identity]);
  expect(generate).toHaveBeenCalledTimes(1);
  expect(await createInstallationManager(storage, generate).get()).toEqual(identity);
  expect(generate).toHaveBeenCalledTimes(1);
});

it('replaces an orphaned iOS Keychain secret when the install marker is missing', async () => {
  const storage = persistence(undefined, 'cd'.repeat(32));
  expect(await createInstallationManager(storage, () => identity).get()).toEqual(identity);
  expect(storage.getSecret).not.toHaveBeenCalled();
  expect(storage.setSecret).toHaveBeenCalledWith(identity.secret);
});

it('does not persist the marker when protected storage fails and allows retry', async () => {
  const storage = persistence();
  storage.setSecret.mockRejectedValueOnce(new Error('SecureStore unavailable'));
  const manager = createInstallationManager(storage, () => identity);
  await expect(manager.get()).rejects.toThrow();
  expect(storage.setId).not.toHaveBeenCalled();
  expect(await manager.get()).toEqual(identity);
});
