CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'layout-grid',
  color TEXT NOT NULL DEFAULT 'blue',
  is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_launched_at TEXT
);

CREATE TABLE IF NOT EXISTS launch_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('application', 'folder', 'url', 'terminal')),
  name TEXT NOT NULL,
  config_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_launch_items_workspace ON launch_items(workspace_id, sort_order);

CREATE TABLE IF NOT EXISTS workspace_notes (
  workspace_id TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_workspace ON workspace_tasks(workspace_id, sort_order);

CREATE TABLE IF NOT EXISTS launch_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  workspace_name_snapshot TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'completed_with_errors', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_launch_runs_started ON launch_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS launch_run_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  launch_item_id TEXT,
  item_name_snapshot TEXT NOT NULL,
  item_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'warning', 'failed', 'skipped', 'cancelled')),
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,
  message TEXT NOT NULL DEFAULT '',
  error_code TEXT,
  FOREIGN KEY (run_id) REFERENCES launch_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (launch_item_id) REFERENCES launch_items(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_run_items_run ON launch_run_items(run_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
