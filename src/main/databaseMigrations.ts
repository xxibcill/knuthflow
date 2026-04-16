import type Database from 'better-sqlite3';
import type { AppSettings } from './database';

// Schema version for migrations
export const SCHEMA_VERSION = 6;

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

  // Migrate from version 3 to 4 (add artifact, learning, follow-ups, safety state)
  if (currentVersion < 4) {
    migrateToV4(db);
  }

  // Migrate from version 4 to 5 (add checkpoint metadata)
  if (currentVersion < 5) {
    migrateToV5(db);
  }

  // Migrate from version 5 to 6 (add milestone state and task graph for Phase 14)
  if (currentVersion < 6) {
    migrateToV6(db);
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

function migrateToV4(db: Database.Database): void {
  // Create ralph_artifacts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ralph_artifacts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      item_id TEXT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      exit_code INTEGER,
      duration_ms INTEGER,
      severity TEXT NOT NULL DEFAULT 'info',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create loop_learning table
  db.exec(`
    CREATE TABLE IF NOT EXISTS loop_learning (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      pattern TEXT NOT NULL,
      countermeasure TEXT NOT NULL,
      success_count INTEGER NOT NULL DEFAULT 1,
      last_seen_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id)
    )
  `);

  // Create follow_ups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      task_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      reason TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id)
    )
  `);

  // Create safety_state table
  db.exec(`
    CREATE TABLE IF NOT EXISTS safety_state (
      project_id TEXT PRIMARY KEY,
      rate_limit_state TEXT NOT NULL,
      circuit_breaker_state TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id)
    )
  `);

  // Create indexes for new tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ralph_artifacts_project_id ON ralph_artifacts(project_id);
    CREATE INDEX IF NOT EXISTS idx_ralph_artifacts_run_id ON ralph_artifacts(run_id);
    CREATE INDEX IF NOT EXISTS idx_ralph_artifacts_iteration ON ralph_artifacts(iteration);
    CREATE INDEX IF NOT EXISTS idx_ralph_artifacts_type ON ralph_artifacts(type);
    CREATE INDEX IF NOT EXISTS idx_loop_learning_project_id ON loop_learning(project_id);
    CREATE INDEX IF NOT EXISTS idx_loop_learning_pattern ON loop_learning(project_id, pattern);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_project_id ON follow_ups(project_id);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_resolved ON follow_ups(project_id, resolved);
  `);
}

function migrateToV5(db: Database.Database): void {
  // Create checkpoint_metadata table for tracking Ralph checkpoints
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkpoint_metadata (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      commit_sha TEXT NOT NULL,
      staged_files TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create indexes for checkpoint queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_checkpoint_run_id ON checkpoint_metadata(run_id);
    CREATE INDEX IF NOT EXISTS idx_checkpoint_commit_sha ON checkpoint_metadata(commit_sha);
  `);
}

function migrateToV6(db: Database.Database): void {
  // Create milestone_states table
  db.exec(`
    CREATE TABLE IF NOT EXISTS milestone_states (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      milestone_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      acceptance_gate TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      tasks TEXT NOT NULL DEFAULT '[]',
      completed_tasks TEXT NOT NULL DEFAULT '[]',
      blocked_tasks TEXT NOT NULL DEFAULT '[]',
      started_at INTEGER,
      completed_at INTEGER,
      validation_result TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create milestone_tasks table (task graph)
  db.exec(`
    CREATE TABLE IF NOT EXISTS milestone_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      milestone_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority INTEGER NOT NULL DEFAULT 2,
      dependencies TEXT NOT NULL DEFAULT '[]',
      blocked_reason TEXT,
      selected_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create task_dependencies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      depends_on_task_id TEXT NOT NULL,
      milestone_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id)
    )
  `);

  // Create milestone_snapshots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS milestone_snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      milestones TEXT NOT NULL DEFAULT '[]',
      task_graph TEXT NOT NULL DEFAULT '[]',
      compressed_context TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create milestone_feedback table
  db.exec(`
    CREATE TABLE IF NOT EXISTS milestone_feedback (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      milestone_id TEXT NOT NULL,
      task_id TEXT,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT NOT NULL,
      suggested_action TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create indexes for milestone queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_milestone_states_project_id ON milestone_states(project_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_states_run_id ON milestone_states(run_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_states_milestone_id ON milestone_states(milestone_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_states_status ON milestone_states(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_milestone_tasks_project_id ON milestone_tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_tasks_run_id ON milestone_tasks(run_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_tasks_milestone_id ON milestone_tasks(milestone_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_tasks_task_id ON milestone_tasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_project_id ON task_dependencies(project_id);
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_snapshots_project_id ON milestone_snapshots(project_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_snapshots_run_id ON milestone_snapshots(run_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_feedback_project_id ON milestone_feedback(project_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_feedback_run_id ON milestone_feedback(run_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_feedback_milestone_id ON milestone_feedback(milestone_id);
  `);
}
