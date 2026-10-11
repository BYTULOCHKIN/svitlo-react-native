CREATE TABLE IF NOT EXISTS installations (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  start_sequence INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notification_events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type = 'schedule-published'),
  schedule_date TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notification_history (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL REFERENCES installations(id),
  event_id TEXT NOT NULL REFERENCES notification_events(id),
  created_at INTEGER NOT NULL,
  UNIQUE (installation_id, event_id)
);
CREATE INDEX IF NOT EXISTS history_installation_order
  ON notification_history(installation_id, created_at DESC, id DESC);
