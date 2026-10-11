CREATE TABLE IF NOT EXISTS installation_delivery (
  installation_id TEXT PRIMARY KEY REFERENCES installations(id),
  permission TEXT NOT NULL CHECK (permission IN ('undetermined', 'granted', 'denied')),
  push_token TEXT,
  enabled_after_sequence INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS push_outbox (
  history_id TEXT PRIMARY KEY REFERENCES notification_history(id),
  state TEXT NOT NULL CHECK (state IN ('queued', 'claimed', 'sent', 'failed')),
  claim_key TEXT,
  ticket_id TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS push_outbox_state ON push_outbox(state);
