import type { ScheduleDay } from '../../src/features/svitlo/models';
import type { InstallationIdentity, NotificationPage, PublicationNotification } from '../../src/features/svitlo/notifications/models';
import type { NotificationDatabase } from './database';
import { dateSchema } from '../../src/features/svitlo/notifications/models';

export class NotificationApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function canonicalSchedule(day: ScheduleDay) {
  dateSchema.parse(day.date);
  if ((!day.queues.length && day.noOutagesScope !== 'region') || new Set(day.queues.map(queue => queue.queue)).size !== day.queues.length)
    throw new NotificationApiError(422, 'Некоректний графік');
  for (const queue of day.queues) {
    let end = 0;
    if (!/^\d+\.\d+$/.test(queue.queue) || !queue.intervals.length)
      throw new NotificationApiError(422, 'Некоректна черга');
    for (const interval of queue.intervals) {
      if (interval.start !== end || !Number.isInteger(interval.end) || interval.end <= end || interval.end > 1440 || !['on', 'off', 'possible', 'unknown'].includes(interval.state))
        throw new NotificationApiError(422, 'Некоректні інтервали');
      end = interval.end;
    }
    if (end !== 1440)
      throw new NotificationApiError(422, 'Неповний графік');
  }
  return JSON.stringify({ date: day.date, noOutagesScope: day.noOutagesScope, queues: [...day.queues].sort((a, b) => a.queue.localeCompare(b.queue, 'en', { numeric: true })) });
}

type InstallationRow = { id: string; secret_hash: string; started_at: number };

export function createNotificationRepository(database: NotificationDatabase, now = Date.now) {
  async function register(identity: InstallationIdentity) {
    const hash = await digest(identity.secret);
    await database.batch([{ sql: 'INSERT OR IGNORE INTO installations (id, secret_hash, started_at, start_sequence) SELECT ?, ?, ?, COALESCE(MAX(sequence), 0) FROM notification_events', params: [identity.id, hash, now()] }]);
    const row = await database.first<InstallationRow>({ sql: 'SELECT * FROM installations WHERE id = ?', params: [identity.id] });
    if (!row || row.secret_hash !== hash)
      throw new NotificationApiError(401, 'Недійсні дані інсталяції');
    return { id: row.id, startedAt: row.started_at };
  }

  async function authenticate(identity: InstallationIdentity) {
    const row = await database.first<InstallationRow>({ sql: 'SELECT * FROM installations WHERE id = ?', params: [identity.id] });
    if (!row || row.secret_hash !== await digest(identity.secret))
      throw new NotificationApiError(401, 'Недійсні дані інсталяції');
  }

  async function publish(day: ScheduleDay) {
    const version = await digest(canonicalSchedule(day));
    const id = `publication:${day.date}`;
    const createdAt = now();
    await database.batch([
      { sql: 'INSERT OR IGNORE INTO notification_events (id, type, schedule_date, version, created_at) VALUES (?, ?, ?, ?, ?)', params: [id, 'schedule-published', day.date, version, createdAt] },
      { sql: `INSERT OR IGNORE INTO notification_history (id, installation_id, event_id, created_at)
        SELECT e.id || ':' || i.id, i.id, e.id, e.created_at
        FROM notification_events e JOIN installations i ON i.start_sequence < e.sequence WHERE e.id = ?`, params: [id] },
    ]);
    return { id };
  }

  async function history(identity: InstallationIdentity, cursor?: string): Promise<NotificationPage> {
    await authenticate(identity);
    const boundary = cursor ? parseCursor(cursor) : undefined;
    const params: (string | number)[] = [identity.id];
    if (boundary)
      params.push(boundary.time, boundary.time, boundary.id);
    const items = await database.all<PublicationNotification>({
      sql: `SELECT h.id, e.type, h.created_at AS createdAt, e.schedule_date AS scheduleDate, e.version
        FROM notification_history h JOIN notification_events e ON h.event_id = e.id
        WHERE h.installation_id = ? ${boundary ? 'AND (h.created_at < ? OR (h.created_at = ? AND h.id < ?))' : ''}
        ORDER BY h.created_at DESC, h.id DESC LIMIT 51`,
      params,
    });
    const page = items.slice(0, 50);
    const last = page.at(-1);
    return { items: page, nextCursor: items.length > 50 && last ? `${last.createdAt}|${last.id}` : null };
  }
  return { register, publish, history };
}

function parseCursor(cursor: string) {
  const match = /^(\d+)\|([\w:.-]{1,200})$/.exec(cursor);
  if (!match || !Number.isSafeInteger(Number(match[1])))
    throw new NotificationApiError(400, 'Некоректний курсор');
  return { time: Number(match[1]), id: match[2] };
}
