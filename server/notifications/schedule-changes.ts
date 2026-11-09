import type { Interval, ScheduleDay } from '../../src/features/svitlo/models';
import type { NotificationDatabase } from './database';
import type { ScheduleSnapshot, StoredSnapshot } from './schedules';
import { getDateKey, getMinute } from '../../src/features/svitlo/models';
import { canonicalSchedule, digest } from './repository';
import { parseSchedule } from './schedules';

function intervals(day: ScheduleDay, queue: string): Interval[] {
  return day.queues.find(item => item.queue === queue)?.intervals
    ?? [{ start: 0, end: 1440, state: day.noOutagesScope === 'region' ? 'on' : 'unknown' }];
}

export function scheduleDifference(previous: ScheduleDay, next: ScheduleDay, now: number) {
  if (previous.date !== next.date)
    throw new Error('Cannot compare different schedule dates');
  const date = getDateKey(new Date(now));
  const boundary = next.date < date ? 1440 : next.date > date ? 0 : getMinute(new Date(now));
  let changed = false;
  let future = false;
  const queues = new Set([...previous.queues, ...next.queues].map(item => item.queue));
  for (const queue of queues) {
    const before = intervals(previous, queue);
    const after = intervals(next, queue);
    let left = 0;
    let right = 0;
    while (left < before.length && right < after.length) {
      const end = Math.min(before[left].end, after[right].end);
      if (before[left].state !== after[right].state) {
        changed = true;
        future ||= end > boundary;
      }
      if (before[left].end === end)
        left++;
      if (after[right].end === end)
        right++;
    }
  }
  return { changed, future };
}

export function createScheduleChangeRecorder(database: NotificationDatabase, now = Date.now) {
  return async (previous: StoredSnapshot, next: ScheduleSnapshot) => {
    const payload = canonicalSchedule(parseSchedule(next.day));
    const difference = scheduleDifference(previous.day, next.day, now());
    if (next.verifiedAt < previous.verifiedAt)
      return;
    if (!difference.changed) {
      await database.batch([{
        sql: 'UPDATE schedule_snapshots SET payload = ?, verified_at = ? WHERE date = ? AND revision = ? AND verified_at = ?',
        params: [payload, next.verifiedAt, next.day.date, previous.revision, previous.verifiedAt],
      }]);
      return;
    }
    const revision = previous.revision + 1;
    const id = `change:${next.day.date}:${revision}`;
    const version = await digest(payload);
    await database.batch([
      { sql: `UPDATE schedule_snapshots SET payload = ?, verified_at = ?, revision = ?
        WHERE date = ? AND revision = ? AND verified_at = ?`, params: [payload, next.verifiedAt, revision, next.day.date, previous.revision, previous.verifiedAt] },
      { sql: `INSERT OR IGNORE INTO notification_events (id, type, schedule_date, version, created_at, push_eligible)
        SELECT ?, 'schedule-changed', date, ?, ?, ? FROM schedule_snapshots
        WHERE date = ? AND revision = ? AND payload = ?`, params: [id, version, now(), difference.future ? 1 : 0, next.day.date, revision, payload] },
      { sql: `INSERT OR IGNORE INTO notification_history (id, installation_id, event_id, created_at)
        SELECT e.id || ':' || i.id, i.id, e.id, e.created_at FROM notification_events e
        JOIN installations i ON i.start_sequence < e.sequence WHERE e.id = ? AND e.version = ?`, params: [id, version] },
      { sql: `INSERT OR IGNORE INTO push_outbox (history_id, state)
        SELECT h.id, 'queued' FROM notification_history h JOIN notification_events e ON e.id = h.event_id
        JOIN installation_delivery d ON d.installation_id = h.installation_id
        WHERE e.id = ? AND e.version = ? AND e.push_eligible = 1 AND d.permission = 'granted' AND d.push_token IS NOT NULL
        AND e.sequence > d.enabled_after_sequence`, params: [id, version] },
    ]);
  };
}
