export function notificationTarget(data: Record<string, unknown>) {
  const id = data.notificationId;
  return typeof id === 'string' && /^[\w:.-]{1,200}$/.test(id) ? id : undefined;
}
