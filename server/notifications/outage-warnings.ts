import type { ScheduleDay } from '../../src/features/svitlo/models';
import type { NotificationDatabase } from './database';
import { getDateKey, getMinute } from '../../src/features/svitlo/models';
import { preferenceAllowsPush } from './delivery-policy';
import { canonicalSchedule, digest } from './repository';
import { parseSchedule } from './schedules';

type SnapshotRow = { date: string; payload: string; verified_at: number; revision: number };
type Job = { id: string; schedule_date: string; queue: string; outage_at: number; due_at: number; revision: number };
const minuteMs = 60000;

export function adjacentDate(date: string, offset: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
}

// Sample both sides of a possible UTC-offset change. Nonexistent local times
// are skipped; a repeated autumn clock time uses its first occurrence once.
export function kyivTimestamp(date: string, minute: number): number | undefined {
  const target = Date.parse(`${date}T00:00:00Z`) + minute * minuteMs;
  const offsets = new Set([-86400000, 0, 86400000].map((delta) => {
    const instant = target + delta;
    const day = getDateKey(new Date(instant));
    return Date.parse(`${day}T00:00:00Z`) + getMinute(new Date(instant)) * minuteMs - instant;
  }));
  return [...offsets].map(offset => target - offset).filter(instant => getDateKey(new Date(instant)) === date && getMinute(new Date(instant)) === minute).sort((a, b) => a - b)[0];
}

export function outageCandidates(day: ScheduleDay, previous?: ScheduleDay) {
  const normalized: ScheduleDay = JSON.parse(canonicalSchedule(day));
  const jobs: { id: string; queue: string; outageAt: number; dueAt: number }[] = [];
  for (const queue of normalized.queues) {
    for (const interval of queue.intervals) {
      if (interval.state !== 'off')
        continue;
      if (interval.start === 0 && previous?.queues.find(item => item.queue === queue.queue)?.intervals.at(-1)?.state === 'off')
        continue;
      const outageAt = kyivTimestamp(day.date, interval.start);
      if (outageAt !== undefined)
        jobs.push({ id: `outage:${day.date}:${queue.queue}:${outageAt}`, queue: queue.queue, outageAt, dueAt: outageAt - 10 * minuteMs });
    }
  }
  return jobs;
}

export async function formOutageWarnings(database: NotificationDatabase, now: number) {
  const today = getDateKey(new Date(now));
  const snapshots = await database.all<SnapshotRow>({
    sql: 'SELECT date, payload, verified_at, revision FROM schedule_snapshots WHERE date >= ? AND date <= ? ORDER BY date',
    params: [adjacentDate(today, -1), adjacentDate(today, 1)],
  });
  const days = new Map(snapshots.map(row => [row.date, parseSchedule(JSON.parse(row.payload))]));
  for (const row of snapshots) {
    if (row.date < today || now - row.verified_at > 300000 || row.verified_at > now + 30000)
      continue;
    const candidates = JSON.stringify(outageCandidates(days.get(row.date)!, days.get(adjacentDate(row.date, -1))));
    await database.batch([{
      sql: `INSERT INTO outage_warning_jobs (id, schedule_date, queue, outage_at, due_at, first_seen_at, revision)
        SELECT json_extract(value, '$.id'), ?, json_extract(value, '$.queue'), json_extract(value, '$.outageAt'),
        json_extract(value, '$.dueAt'), ?, ? FROM json_each(?) WHERE EXISTS
        (SELECT 1 FROM schedule_snapshots WHERE date = ? AND revision = ?)
        ON CONFLICT(id) DO UPDATE SET revision = excluded.revision WHERE excluded.revision > outage_warning_jobs.revision`,
      params: [row.date, row.verified_at, row.revision, candidates, row.date, row.revision],
    }, {
      sql: `DELETE FROM outage_warning_jobs WHERE schedule_date = ? AND id NOT IN
        (SELECT json_extract(value, '$.id') FROM json_each(?)) AND EXISTS
        (SELECT 1 FROM schedule_snapshots WHERE date = ? AND revision = ?)`,
      params: [row.date, candidates, row.date, row.revision],
    }]);
  }
  const slot = Math.floor(now / minuteMs) * minuteMs;
  const jobs = await database.all<Job>({
    sql: `SELECT j.* FROM outage_warning_jobs j JOIN schedule_snapshots s ON s.date = j.schedule_date
      WHERE j.due_at >= ? AND j.due_at < ? AND j.first_seen_at <= j.due_at
      AND j.revision = s.revision AND s.verified_at >= ? AND s.verified_at <= ? ORDER BY j.due_at, j.id`,
    params: [slot, slot + minuteMs, now - 300000, now + 30000],
  });
  for (const job of jobs) {
    const version = await digest(`${job.id}:${job.revision}`);
    // The snapshot/job guards are repeated inside the atomic write: another
    // source check or settings update may have won after the read above.
    const current = `j.id = ? AND j.revision = ? AND j.first_seen_at <= j.due_at
      AND j.due_at >= ? AND j.due_at < ? AND s.revision = j.revision
      AND s.verified_at >= ? AND s.verified_at <= ?`;
    const guard = [job.id, job.revision, slot, slot + minuteMs, now - 300000, now + 30000];
    await database.batch([{
      sql: `INSERT OR IGNORE INTO notification_events (id, type, schedule_date, version, created_at)
        SELECT j.id, 'outage-warning', j.schedule_date, ?, ? FROM outage_warning_jobs j
        JOIN schedule_snapshots s ON s.date = j.schedule_date WHERE ${current}`,
      params: [version, now, ...guard],
    }, {
      sql: `INSERT OR IGNORE INTO notification_history (id, installation_id, event_id, created_at, details)
        SELECT e.id || ':' || p.installation_id, p.installation_id, e.id, e.created_at,
        json_object('queue', j.queue, 'outageAt', j.outage_at, 'locations', json((
          SELECT json_group_array(json_object('id', json_extract(l.value, '$.id'), 'name', json_extract(l.value, '$.name')))
          FROM json_each(p.locations) l WHERE json_extract(l.value, '$.queue') = j.queue AND json_extract(l.value, '$.enabled') = 1)))
        FROM outage_warning_jobs j JOIN schedule_snapshots s ON s.date = j.schedule_date
        JOIN notification_events e ON e.id = j.id JOIN installation_preferences p ON p.updated_at <= j.due_at
        JOIN installations i ON i.id = p.installation_id AND i.start_sequence < e.sequence
        WHERE ${current} AND e.version = ? AND EXISTS
        (SELECT 1 FROM json_each(p.locations) l WHERE json_extract(l.value, '$.queue') = j.queue AND json_extract(l.value, '$.enabled') = 1)`,
      params: [...guard, version],
    }, {
      sql: `INSERT OR IGNORE INTO push_outbox (history_id, state)
        SELECT h.id, 'queued' FROM notification_history h JOIN notification_events e ON e.id = h.event_id
        JOIN installation_delivery d ON d.installation_id = h.installation_id
        JOIN installation_preferences p ON p.installation_id = h.installation_id
        WHERE e.id = ? AND e.version = ? AND d.permission = 'granted' AND d.push_token IS NOT NULL
        AND e.sequence > d.enabled_after_sequence AND ${preferenceAllowsPush}`,
      params: [job.id, version],
    }]);
  }
  return jobs.length;
}
