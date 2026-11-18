import Database from 'better-sqlite3'

export function initializeDatabaseSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS process_targets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      process_name TEXT NOT NULL,
      watch_process_name TEXT,
      window_title TEXT NOT NULL DEFAULT '',
      exec_path TEXT NOT NULL,
      args TEXT NOT NULL DEFAULT '',
      work_dir TEXT NOT NULL DEFAULT '',
      window_style TEXT NOT NULL DEFAULT 'normal',
      enabled INTEGER NOT NULL DEFAULT 1,
      restart_delay_sec INTEGER NOT NULL DEFAULT 5,
      startup_grace_sec INTEGER NOT NULL DEFAULT 15,
      graceful_timeout_sec INTEGER NOT NULL DEFAULT 5,
      check_not_responding INTEGER NOT NULL DEFAULT 1,
      hung_threshold_count INTEGER NOT NULL DEFAULT 3,
      max_retries_in_window INTEGER NOT NULL DEFAULT 5,
      retry_window_sec INTEGER NOT NULL DEFAULT 180,
      total_restart_count INTEGER NOT NULL DEFAULT 0,
      last_started_at TEXT,
      last_failure_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS process_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_id TEXT NOT NULL,
      target_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      pid INTEGER,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_process_events_created_at
      ON process_events(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_process_events_target_id
      ON process_events(target_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ntp_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_used TEXT NOT NULL,
      offset_ms REAL NOT NULL,
      rtt_ms REAL NOT NULL,
      applied INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ntp_history_synced_at
      ON ntp_history(synced_at DESC);

    CREATE TABLE IF NOT EXISTS daily_stats (
      stat_date TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_name TEXT NOT NULL,
      running_samples INTEGER NOT NULL DEFAULT 0,
      total_samples INTEGER NOT NULL DEFAULT 0,
      restart_count INTEGER NOT NULL DEFAULT 0,
      hung_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (stat_date, target_id)
    );
  `)
}
