// Metro replaces these public flags at bundle time. Release bundles always use real data.
export const isE2E = __DEV__ && process.env.EXPO_PUBLIC_E2E === '1';
// Isolated storage alone must not replace the API's queue list with a fixture.
export const useE2EFixtures = isE2E && process.env.EXPO_PUBLIC_E2E_FIXTURES === '1';
