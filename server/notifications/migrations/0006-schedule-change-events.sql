-- Rebuild the dependent tables from leaf to parent in one transaction.
-- Staging copies have no foreign keys; IDs, timestamps and delivery state survive.
CREATE TABLE _events_0006 AS SELECT * FROM notification_events;
CREATE TABLE _history_0006 AS SELECT * FROM notification_history;
CREATE TABLE _outbox_0006 AS SELECT * FROM push_outbox;
CREATE TABLE _sequence_0006 AS SELECT seq FROM sqlite_sequence WHERE name = 'notification_events';

DROP TABLE push_outbox;
DROP TABLE notification_history;
DROP TABLE notification_events;

CREATE TABLE notification_events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('schedule-published', 'schedule-changed')),
  schedule_date TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  push_eligible INTEGER NOT NULL DEFAULT 1 CHECK (push_eligible IN (0, 1))
);
INSERT INTO notification_events (sequence, id, type, schedule_date, version, created_at)
  SELECT sequence, id, type, schedule_date, version, created_at FROM _events_0006;
-- Preserve the AUTOINCREMENT high-water mark even if older events were deleted.
INSERT INTO notification_events (sequence, id, type, schedule_date, version, created_at)
  SELECT COALESCE(MAX(seq), 0) + 1, 'migration:0006:sequence', 'schedule-published',
    '1970-01-01', '0000000000000000000000000000000000000000000000000000000000000000', 1
  FROM _sequence_0006;
DELETE FROM notification_events WHERE id = 'migration:0006:sequence';

CREATE TABLE notification_history (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL REFERENCES installations(id),
  event_id TEXT NOT NULL REFERENCES notification_events(id),
  created_at INTEGER NOT NULL,
  UNIQUE (installation_id, event_id)
);
INSERT INTO notification_history SELECT * FROM _history_0006;
CREATE INDEX history_installation_order ON notification_history(installation_id, created_at DESC, id DESC);

CREATE TABLE push_outbox (
  history_id TEXT PRIMARY KEY REFERENCES notification_history(id),
  state TEXT NOT NULL CHECK (state IN ('queued', 'claimed', 'sent', 'failed')),
  claim_key TEXT,
  ticket_id TEXT,
  error TEXT
);
INSERT INTO push_outbox SELECT * FROM _outbox_0006;
CREATE INDEX push_outbox_state ON push_outbox(state);
CREATE INDEX push_outbox_claim_key ON push_outbox(claim_key);

DROP TABLE _outbox_0006;
DROP TABLE _history_0006;
DROP TABLE _events_0006;
DROP TABLE _sequence_0006;
