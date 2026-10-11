import { notificationTarget } from './notification-target';

it('accepts an opaque history id and rejects redirects and malformed targets', () => {
  expect(notificationTarget({ notificationId: 'publication:2026-10-11:installation-1' })).toBe('publication:2026-10-11:installation-1');
  expect(notificationTarget({ url: 'https://stranger.invalid' })).toBeUndefined();
  expect(notificationTarget({ notificationId: 'https://stranger.invalid' })).toBeUndefined();
  expect(notificationTarget({ notificationId: '' })).toBeUndefined();
  expect(notificationTarget({ notificationId: 123 })).toBeUndefined();
});
