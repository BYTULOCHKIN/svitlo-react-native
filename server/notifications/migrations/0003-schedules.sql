CREATE TABLE IF NOT EXISTS schedule_snapshots (
  date TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  verified_at INTEGER NOT NULL CHECK (verified_at > 0)
);
