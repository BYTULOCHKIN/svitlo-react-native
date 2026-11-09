import z from 'zod';

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
export const identitySchema = z.object({ id: z.uuid(), secret: z.string().regex(/^[a-f0-9]{64}$/) });
export type InstallationIdentity = z.infer<typeof identitySchema>;
export const registrationSchema = z.object({ id: z.uuid(), startedAt: z.number().int().positive() });
export const notificationSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(['schedule-published', 'schedule-changed']),
  createdAt: z.number().int().positive(),
  scheduleDate: dateSchema,
  version: z.string().regex(/^[a-f0-9]{64}$/),
});
export type ScheduleNotification = z.infer<typeof notificationSchema>;
export const subscriptionSchema = z.object({
  id: z.string().regex(/^[\w-]{1,64}$/),
  name: z.string().trim().min(1).max(20),
  queue: z.string().regex(/^\d{1,2}\.\d{1,2}$/),
  enabled: z.boolean(),
});
export const preferencesSchema = z.object({
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  regionalPushEnabled: z.boolean(),
  locations: z.array(subscriptionSchema).max(50),
}).refine(value => new Set(value.locations.map(location => location.id)).size === value.locations.length);
export type NotificationPreferences = z.infer<typeof preferencesSchema>;
export const warningSchema = notificationSchema.extend({
  type: z.literal('outage-warning'),
  queue: subscriptionSchema.shape.queue,
  outageAt: z.number().int().positive(),
  locations: z.array(subscriptionSchema.pick({ id: true, name: true })).min(1).max(50),
});
export const notificationItemSchema = z.discriminatedUnion('type', [notificationSchema, warningSchema]);
export type NotificationItem = z.infer<typeof notificationItemSchema>;
export const historySchema = z.object({ items: z.array(notificationItemSchema), nextCursor: z.string().nullable() });
export type NotificationPage = z.infer<typeof historySchema>;
export const deliverySchema = z.object({
  permission: z.enum(['undetermined', 'granted', 'denied']),
  token: z.string().regex(/^(?:ExpoPushToken|ExponentPushToken)\[[\w-]+\]$/).nullable().optional(),
}).refine(value => value.permission === 'granted' || !value.token);
export type DeliverySettings = z.infer<typeof deliverySchema>;
