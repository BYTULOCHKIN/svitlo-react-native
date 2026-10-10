const originalDevelopment = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
const originalFlag = process.env.EXPO_PUBLIC_E2E;
const originalFixtures = process.env.EXPO_PUBLIC_E2E_FIXTURES;

afterEach(() => {
  if (originalDevelopment)
    Object.defineProperty(globalThis, '__DEV__', originalDevelopment);
  if (originalFlag === undefined)
    delete process.env.EXPO_PUBLIC_E2E;
  else process.env.EXPO_PUBLIC_E2E = originalFlag;
  if (originalFixtures === undefined)
    delete process.env.EXPO_PUBLIC_E2E_FIXTURES;
  else process.env.EXPO_PUBLIC_E2E_FIXTURES = originalFixtures;
});

it.each([
  { development: true, flag: '1', expected: true },
  { development: true, flag: undefined, expected: false },
  { development: true, flag: '0', expected: false },
  { development: false, flag: '1', expected: false },
])('only enables the isolated store for development=$development, flag=$flag', ({ development, flag, expected }) => {
  Object.defineProperty(globalThis, '__DEV__', { value: development, configurable: true, writable: true });
  if (flag === undefined)
    delete process.env.EXPO_PUBLIC_E2E;
  else process.env.EXPO_PUBLIC_E2E = flag;
  jest.isolateModules(() => {
    expect(require('./e2e').isE2E).toBe(expected);
  });
});

it.each([
  { development: true, flag: '1', fixtures: '1', expected: true },
  { development: true, flag: '1', fixtures: undefined, expected: false },
  { development: true, flag: '1', fixtures: '0', expected: false },
  { development: true, flag: undefined, fixtures: '1', expected: false },
  { development: false, flag: '1', fixtures: '1', expected: false },
])('only substitutes API data with explicitly enabled development fixtures: $development/$flag/$fixtures', ({ development, flag, fixtures, expected }) => {
  Object.defineProperty(globalThis, '__DEV__', { value: development, configurable: true, writable: true });
  if (flag === undefined)
    delete process.env.EXPO_PUBLIC_E2E;
  else process.env.EXPO_PUBLIC_E2E = flag;
  if (fixtures === undefined)
    delete process.env.EXPO_PUBLIC_E2E_FIXTURES;
  else process.env.EXPO_PUBLIC_E2E_FIXTURES = fixtures;
  jest.isolateModules(() => {
    expect(require('./e2e').useE2EFixtures).toBe(expected);
  });
});
