CREATE TABLE installation_preferences (
  installation_id TEXT PRIMARY KEY REFERENCES installations(id),
  revision INTEGER NOT NULL CHECK (revision > 0),
  regional_push_enabled INTEGER NOT NULL DEFAULT 1 CHECK (regional_push_enabled IN (0, 1)),
  locations TEXT NOT NULL CHECK (json_valid(locations)),
  updated_at INTEGER NOT NULL
);
