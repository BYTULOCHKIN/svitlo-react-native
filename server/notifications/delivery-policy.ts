// The aliases e/h/d/p refer to event, history, delivery and preferences.
// Compare only this queue's active locations: regional preferences and other
// queues must not invalidate an already formed warning.
export const matchingWarningLocations = `json_extract(h.details, '$.locations') = (
  SELECT json_group_array(json_object('id', json_extract(l.value, '$.id'), 'name', json_extract(l.value, '$.name')))
  FROM json_each(p.locations) l WHERE json_extract(l.value, '$.queue') = json_extract(h.details, '$.queue')
  AND json_extract(l.value, '$.enabled') = 1)`;

export const preferenceAllowsPush = `(CASE WHEN e.type = 'outage-warning' THEN
  p.installation_id IS NOT NULL AND ${matchingWarningLocations}
  ELSE COALESCE(p.regional_push_enabled, 1) = 1 END)`;

export function warningIsCurrent(now: number) {
  if (!Number.isSafeInteger(now) || now <= 0)
    throw new Error('Invalid delivery time');
  return `(e.type != 'outage-warning' OR EXISTS (
    SELECT 1 FROM outage_warning_jobs j JOIN schedule_snapshots s ON s.date = j.schedule_date
    WHERE j.id = e.id AND j.revision = s.revision AND j.outage_at > ${now}
    AND s.verified_at >= ${now - 300000} AND s.verified_at <= ${now + 30000}))`;
}
