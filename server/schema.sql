CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  notification_date TEXT,
  source TEXT,
  created_at INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_imports_pending
  ON imports (consumed_at, created_at);
