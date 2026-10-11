CREATE TABLE IF NOT EXISTS backend_jobs (
  name TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  lease_until INTEGER NOT NULL,
  completed_slot INTEGER NOT NULL DEFAULT -1
);
