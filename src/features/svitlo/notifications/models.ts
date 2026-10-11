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
  type: z.literal('schedule-published'),
  createdAt: z.number().int().positive(),
  scheduleDate: dateSchema,
  version: z.string().regex(/^[a-f0-9]{64}$/),
});
export type PublicationNotification = z.infer<typeof notificationSchema>;
export const historySchema = z.object({ items: z.array(notificationSchema), nextCursor: z.string().nullable() });
export type NotificationPage = z.infer<typeof historySchema>;
export const deliverySchema = z.object({
  permission: z.enum(['undetermined', 'granted', 'denied']),
  token: z.string().regex(/^(?:ExpoPushToken|ExponentPushToken)\[[\w-]+\]$/).nullable().optional(),
}).refine(value => value.permission === 'granted' || !value.token);
export type DeliverySettings = z.infer<typeof deliverySchema>;
