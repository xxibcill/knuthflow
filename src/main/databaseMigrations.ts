import type Database from 'better-sqlite3';
import type { AppSettings } from './database';

// Schema version for migrations
export const SCHEMA_VERSION = 3;

export function runMigrations(db: Database.Database, currentVersion: number, DEFAULT_SETTINGS: AppSettings): void {
  // Migrate from version 0 to 1
  if (currentVersion < 1) {
    migrateToV1(db);
  }

  // Migrate from version 1 to 2 (add settings and profiles)
  if (currentVersion < 2) {
    migrateToV2(db, DEFAULT_SETTINGS);
  }

  // Migrate from version 2 to 3 (add Ralph tables)
  if (currentVersion < 3) {
    migrateToV3(db);
  }

  // Update schema version
  db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
}

function migrateToV1(db: Database.Database): void {
  // Create workspaces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      last_opened_at INTEGER
    )
  `);

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      exit_code INTEGER,
      signal INTEGER,
      run_id TEXT,
      pty_session_id TEXT,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    )
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_workspace_id ON sessions(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_workspaces_last_opened ON workspaces(last_opened_at);
  `);
}

function migrateToV2(db: Database.Database, DEFAULT_SETTINGS: AppSettings): void {
  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create launch_profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS launch_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      cli_path TEXT,
      args TEXT NOT NULL DEFAULT '[]',
      env TEXT NOT NULL DEFAULT '{}',
      workspace_id TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    )
  `);

  // Initialize with default settings
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run(key, JSON.stringify(value));
  }
}

function migrateToV3(db: Database.Database): void {
  // Create ralph_projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ralph_projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    )
  `);

  // Create loop_runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS loop_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      start_time INTEGER,
      end_time INTEGER,
      exit_code INTEGER,
      signal INTEGER,
      error TEXT,
      iteration_count INTEGER NOT NULL DEFAULT 0,
      session_id TEXT,
      pty_session_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id)
    )
  `);

  // Create loop_summaries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS loop_summaries (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      selected_files TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create plan_snapshots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plan_snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      plan_content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create indexes for Ralph tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_loop_runs_project_id ON loop_runs(project_id);
    CREATE INDEX IF NOT EXISTS idx_loop_runs_status ON loop_runs(status);
    CREATE INDEX IF NOT EXISTS idx_loop_summaries_project_id ON loop_summaries(project_id);
    CREATE INDEX IF NOT EXISTS idx_loop_summaries_run_id ON loop_summaries(run_id);
    CREATE INDEX IF NOT EXISTS idx_plan_snapshots_project_id ON plan_snapshots(project_id);
    CREATE INDEX IF NOT EXISTS idx_plan_snapshots_run_id ON plan_snapshots(run_id);
  `);
}
