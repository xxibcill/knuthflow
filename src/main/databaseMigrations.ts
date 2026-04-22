import type Database from 'better-sqlite3';
import type { AppSettings } from './database';

// Schema version for migrations
export const SCHEMA_VERSION = 17;

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

  // Migrate from version 6 to 7 (add portfolio tables for Phase 16)
  if (currentVersion < 7) {
    migrateToV7(db);
  }

  // Migrate from version 7 to 8 (add artifact references table for Phase 16)
  if (currentVersion < 8) {
    migrateToV8(db);
  }

  // Migrate from version 8 to 9 (add delivery_metrics and prompt_countermeasures tables for Phase 17)
  if (currentVersion < 9) {
    migrateToV9(db);
  }

  // Migrate from version 9 to 10 (add apps table with platform targets for Phase 18)
  if (currentVersion < 10) {
    migrateToV10(db);
  }

  // Migrate from version 10 to 11 (add app_versions table for Phase 19)
  if (currentVersion < 11) {
    migrateToV11(db);
  }

  // Migrate from version 11 to 12 (add monitoring config and health records for Phase 19)
  if (currentVersion < 12) {
    migrateToV12(db);
  }

  // Migrate from version 12 to 13 (add maintenance_run table for Phase 19)
  if (currentVersion < 13) {
    migrateToV13(db);
  }

  // Migrate from version 13 to 14 (add staged rollout tables for Phase 19)
  if (currentVersion < 14) {
    migrateToV14(db);
  }

  // Migrate from version 14 to 15 (add blueprints tables for Phase 20)
  if (currentVersion < 15) {
    migrateToV15(db);
  }

  // Migrate from version 15 to 16 (add Phase 26 tables: health_events, feedback, delivered_apps, iteration_backlog, run_patterns)
  if (currentVersion < 16) {
    migrateToV16(db);
  }

  // Migrate from version 16 to 17 (add Phase 29 policy tables)
  if (currentVersion < 17) {
    migrateToV17(db);
  }

  // Update schema version
  db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
}

function migrateToV17(db: Database.Database): void {
  // Create policy_rules table (Phase 29)
  db.exec(`
    CREATE TABLE IF NOT EXISTS policy_rules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      pattern TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      scope TEXT,
      severity TEXT NOT NULL DEFAULT 'error',
      inheritable INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id)
    )
  `);

  // Create policy_overrides table (Phase 29)
  db.exec(`
    CREATE TABLE IF NOT EXISTS policy_overrides (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      rule_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'command',
      expires_at INTEGER,
      approver TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      FOREIGN KEY (rule_id) REFERENCES policy_rules(id)
    )
  `);

  // Create policy_audit table (Phase 29)
  db.exec(`
    CREATE TABLE IF NOT EXISTS policy_audit (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      entity_id TEXT,
      summary TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id)
    )
  `);

  // Create indexes for policy queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_policy_rules_project_id ON policy_rules(project_id);
    CREATE INDEX IF NOT EXISTS idx_policy_rules_type ON policy_rules(type);
    CREATE INDEX IF NOT EXISTS idx_policy_rules_enabled ON policy_rules(enabled);
    CREATE INDEX IF NOT EXISTS idx_policy_overrides_project_id ON policy_overrides(project_id);
    CREATE INDEX IF NOT EXISTS idx_policy_overrides_status ON policy_overrides(status);
    CREATE INDEX IF NOT EXISTS idx_policy_overrides_expires_at ON policy_overrides(expires_at);
    CREATE INDEX IF NOT EXISTS idx_policy_audit_project_id ON policy_audit(project_id);
    CREATE INDEX IF NOT EXISTS idx_policy_audit_event_type ON policy_audit(event_type);
    CREATE INDEX IF NOT EXISTS idx_policy_audit_created_at ON policy_audit(created_at);
  `);
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

function migrateToV7(db: Database.Database): void {
  // Create portfolios table
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create portfolio_projects table (links Ralph projects to portfolios)
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_projects (
      id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      dependency_graph TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id),
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      UNIQUE (portfolio_id, project_id)
    )
  `);

  // Create indexes for portfolio queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at);
    CREATE INDEX IF NOT EXISTS idx_portfolio_projects_portfolio_id ON portfolio_projects(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_portfolio_projects_project_id ON portfolio_projects(project_id);
    CREATE INDEX IF NOT EXISTS idx_portfolio_projects_priority ON portfolio_projects(priority);
    CREATE INDEX IF NOT EXISTS idx_portfolio_projects_status ON portfolio_projects(status);
  `);
}

function migrateToV8(db: Database.Database): void {
  // Create portfolio_artifact_references table for cross-app artifact propagation
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_artifact_references (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      artifact_path TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Create indexes for artifact reference queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artifact_references_project_id ON portfolio_artifact_references(project_id);
    CREATE INDEX IF NOT EXISTS idx_artifact_references_created_at ON portfolio_artifact_references(created_at);
  `);
}

function migrateToV9(db: Database.Database): void {
  // Create delivery_metrics table for tracking run outcomes (Phase 17)
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_metrics (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      build_time_ms INTEGER,
      iteration_count INTEGER NOT NULL DEFAULT 0,
      validation_pass_rate REAL,
      operator_intervention_count INTEGER NOT NULL DEFAULT 0,
      outcome TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (run_id) REFERENCES loop_runs(id),
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id)
    )
  `);

  // Create lessons_learned table for surfacing operator-visible knowledge (Phase 17)
  db.exec(`
    CREATE TABLE IF NOT EXISTS lessons_learned (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      pattern TEXT,
      countermeasure TEXT,
      outcome TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create prompt_countermeasures table for tracking PROMPT.md modifications (Phase 17)
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_countermeasures (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      pattern TEXT NOT NULL,
      countermeasure TEXT NOT NULL,
      threshold INTEGER NOT NULL DEFAULT 3,
      removal_threshold INTEGER NOT NULL DEFAULT 5,
      consecutive_successes INTEGER NOT NULL DEFAULT 0,
      auto_inject INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      injected_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES ralph_projects(id)
    )
  `);

  // Create indexes for new tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_delivery_metrics_run_id ON delivery_metrics(run_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_metrics_project_id ON delivery_metrics(project_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_metrics_created_at ON delivery_metrics(created_at);
    CREATE INDEX IF NOT EXISTS idx_lessons_learned_project_id ON lessons_learned(project_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_learned_run_id ON lessons_learned(run_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_countermeasures_project_id ON prompt_countermeasures(project_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_countermeasures_pattern ON prompt_countermeasures(project_id, pattern);
    CREATE INDEX IF NOT EXISTS idx_prompt_countermeasures_active ON prompt_countermeasures(active);
  `);
}

function migrateToV10(db: Database.Database): void {
  // Create apps table for storing app metadata with platform targets (Phase 18)
  db.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brief TEXT NOT NULL,
      platform_targets TEXT NOT NULL DEFAULT '[]',
      platform_categories TEXT NOT NULL DEFAULT '[]',
      delivery_format TEXT NOT NULL,
      success_criteria TEXT NOT NULL DEFAULT '[]',
      stack_preferences TEXT NOT NULL DEFAULT '[]',
      forbidden_patterns TEXT NOT NULL DEFAULT '[]',
      max_build_time INTEGER NOT NULL DEFAULT 30,
      supported_browsers TEXT NOT NULL DEFAULT '[]',
      workspace_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    )
  `);

  // Create indexes for app queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_apps_workspace_id ON apps(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at);
  `);
}

function migrateToV11(db: Database.Database): void {
  // Create app_versions table for tracking delivered app versions (Phase 19)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_versions (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      version TEXT NOT NULL,
      changelog TEXT NOT NULL DEFAULT '',
      released_at INTEGER NOT NULL,
      channel TEXT NOT NULL DEFAULT 'internal',
      created_by TEXT NOT NULL DEFAULT 'operator',
      run_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (app_id) REFERENCES apps(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create indexes for version queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_app_versions_app_id ON app_versions(app_id);
    CREATE INDEX IF NOT EXISTS idx_app_versions_channel ON app_versions(channel);
    CREATE INDEX IF NOT EXISTS idx_app_versions_released_at ON app_versions(released_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_app_versions_app_version ON app_versions(app_id, version);
  `);
}

function migrateToV12(db: Database.Database): void {
  // Create monitoring_config table for per-app monitoring settings (Phase 19)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitoring_config (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      check_interval_hours INTEGER NOT NULL DEFAULT 6,
      check_build INTEGER NOT NULL DEFAULT 1,
      check_lint INTEGER NOT NULL DEFAULT 1,
      check_tests INTEGER NOT NULL DEFAULT 1,
      check_vulnerabilities INTEGER NOT NULL DEFAULT 1,
      auto_fix_trigger INTEGER NOT NULL DEFAULT 0,
      alert_threshold INTEGER NOT NULL DEFAULT 1,
      last_check_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (app_id) REFERENCES apps(id)
    )
  `);

  // Create monitoring_health_records table for tracking health status (Phase 19)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitoring_health_records (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      check_type TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      details TEXT,
      regressed INTEGER NOT NULL DEFAULT 0,
      checked_at INTEGER NOT NULL,
      FOREIGN KEY (app_id) REFERENCES apps(id)
    )
  `);

  // Create indexes for monitoring queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_monitoring_config_app_id ON monitoring_config(app_id);
    CREATE INDEX IF NOT EXISTS idx_monitoring_config_enabled ON monitoring_config(enabled);
    CREATE INDEX IF NOT EXISTS idx_monitoring_health_app_id ON monitoring_health_records(app_id);
    CREATE INDEX IF NOT EXISTS idx_monitoring_health_checked_at ON monitoring_health_records(checked_at);
    CREATE INDEX IF NOT EXISTS idx_monitoring_health_regressed ON monitoring_health_records(regressed);
  `);
}

function migrateToV13(db: Database.Database): void {
  // Create maintenance_run table for tracking auto-triggered maintenance runs (Phase 19)
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_run (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      run_id TEXT,
      trigger_type TEXT NOT NULL,
      trigger_reason TEXT NOT NULL,
      regression_ids TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      iteration_count INTEGER NOT NULL DEFAULT 0,
      outcome TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (app_id) REFERENCES apps(id),
      FOREIGN KEY (run_id) REFERENCES loop_runs(id)
    )
  `);

  // Create indexes for maintenance run queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_maintenance_run_app_id ON maintenance_run(app_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_run_status ON maintenance_run(status);
    CREATE INDEX IF NOT EXISTS idx_maintenance_run_trigger_type ON maintenance_run(trigger_type);
    CREATE INDEX IF NOT EXISTS idx_maintenance_run_created_at ON maintenance_run(created_at);
    CREATE INDEX IF NOT EXISTS idx_maintenance_run_status_trigger ON maintenance_run(status, trigger_type);
  `);
}

function migrateToV14(db: Database.Database): void {
  // Create rollout_channels table for staged rollout (Phase 19)
  db.exec(`
    CREATE TABLE IF NOT EXISTS rollout_channels (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      validation_required INTEGER NOT NULL DEFAULT 1,
      auto_promote INTEGER NOT NULL DEFAULT 0,
      min_beta_adopters INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (app_id) REFERENCES apps(id),
      UNIQUE (app_id, channel)
    )
  `);

  // Create channel_releases table for tracking channel assignments (Phase 19)
  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_releases (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      version_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      promoted_at INTEGER,
      promoted_by TEXT,
      rollback_from_version_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (app_id) REFERENCES apps(id),
      FOREIGN KEY (version_id) REFERENCES app_versions(id),
      FOREIGN KEY (rollback_from_version_id) REFERENCES app_versions(id)
    )
  `);

  // Create beta_testers table for beta tester program (Phase 19)
  db.exec(`
    CREATE TABLE IF NOT EXISTS beta_testers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create beta_tester_access table for linking testers to apps/channels (Phase 19)
  db.exec(`
    CREATE TABLE IF NOT EXISTS beta_tester_access (
      id TEXT PRIMARY KEY,
      tester_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'beta',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (tester_id) REFERENCES beta_testers(id),
      FOREIGN KEY (app_id) REFERENCES apps(id),
      UNIQUE (tester_id, app_id)
    )
  `);

  // Create rollout_metrics table for tracking rollout metrics (Phase 19)
  db.exec(`
    CREATE TABLE IF NOT EXISTS rollout_metrics (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      version_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      metric_value REAL NOT NULL,
      recorded_at INTEGER NOT NULL,
      FOREIGN KEY (app_id) REFERENCES apps(id),
      FOREIGN KEY (version_id) REFERENCES app_versions(id)
    )
  `);

  // Create indexes for rollout queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rollout_channels_app_id ON rollout_channels(app_id);
    CREATE INDEX IF NOT EXISTS idx_channel_releases_app_id ON channel_releases(app_id);
    CREATE INDEX IF NOT EXISTS idx_channel_releases_version_id ON channel_releases(version_id);
    CREATE INDEX IF NOT EXISTS idx_channel_releases_channel ON channel_releases(channel);
    CREATE INDEX IF NOT EXISTS idx_beta_testers_email ON beta_testers(email);
    CREATE INDEX IF NOT EXISTS idx_beta_tester_access_tester_id ON beta_tester_access(tester_id);
    CREATE INDEX IF NOT EXISTS idx_beta_tester_access_app_id ON beta_tester_access(app_id);
    CREATE INDEX IF NOT EXISTS idx_rollout_metrics_app_id ON rollout_metrics(app_id);
    CREATE INDEX IF NOT EXISTS idx_rollout_metrics_version_id ON rollout_metrics(version_id);
    CREATE INDEX IF NOT EXISTS idx_rollout_metrics_recorded_at ON rollout_metrics(recorded_at);
  `);
}

function migrateToV15(db: Database.Database): void {
  // Create blueprints table for storing reusable app templates (Phase 20)
  db.exec(`
    CREATE TABLE IF NOT EXISTS blueprints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      is_published INTEGER NOT NULL DEFAULT 0,
      parent_blueprint_id TEXT,
      usage_count INTEGER NOT NULL DEFAULT 0,
      success_rate REAL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_blueprint_id) REFERENCES blueprints(id)
    )
  `);

  // Create blueprint_versions table for versioned blueprint specs (Phase 20)
  db.exec(`
    CREATE TABLE IF NOT EXISTS blueprint_versions (
      id TEXT PRIMARY KEY,
      blueprint_id TEXT NOT NULL,
      version TEXT NOT NULL,
      spec_content TEXT NOT NULL DEFAULT '{}',
      starter_template TEXT,
      acceptance_gates TEXT NOT NULL DEFAULT '[]',
      learned_rules TEXT NOT NULL DEFAULT '[]',
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (blueprint_id) REFERENCES blueprints(id),
      UNIQUE (blueprint_id, version)
    )
  `);

  // Create blueprint_usage_stats table for tracking blueprint effectiveness (Phase 20)
  db.exec(`
    CREATE TABLE IF NOT EXISTS blueprint_usage_stats (
      id TEXT PRIMARY KEY,
      blueprint_id TEXT NOT NULL,
      version_id TEXT,
      app_id TEXT,
      outcome TEXT NOT NULL,
      build_time_ms INTEGER,
      iteration_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (blueprint_id) REFERENCES blueprints(id),
      FOREIGN KEY (version_id) REFERENCES blueprint_versions(id),
      FOREIGN KEY (app_id) REFERENCES apps(id)
    )
  `);

  // Create indexes for blueprint queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_blueprints_category ON blueprints(category);
    CREATE INDEX IF NOT EXISTS idx_blueprints_is_published ON blueprints(is_published);
    CREATE INDEX IF NOT EXISTS idx_blueprints_parent_id ON blueprints(parent_blueprint_id);
    CREATE INDEX IF NOT EXISTS idx_blueprints_usage_count ON blueprints(usage_count);
    CREATE INDEX IF NOT EXISTS idx_blueprint_versions_blueprint_id ON blueprint_versions(blueprint_id);
    CREATE INDEX IF NOT EXISTS idx_blueprint_versions_version ON blueprint_versions(version);
    CREATE INDEX IF NOT EXISTS idx_blueprint_usage_stats_blueprint_id ON blueprint_usage_stats(blueprint_id);
    CREATE INDEX IF NOT EXISTS idx_blueprint_usage_stats_app_id ON blueprint_usage_stats(app_id);
  `);
}

function migrateToV16(db: Database.Database): void {
  // Create health_events table for lightweight telemetry (Phase 26)
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      app_id TEXT,
      workspace_id TEXT,
      run_id TEXT,
      status TEXT NOT NULL,
      message TEXT,
      details TEXT,
      triggered_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Create feedback table for operator feedback (Phase 26)
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      app_id TEXT,
      run_id TEXT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER,
      source TEXT,
      linked_backlog_id TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Create delivered_apps registry table (Phase 26)
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivered_apps (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      workspace_path TEXT NOT NULL,
      delivery_format TEXT NOT NULL,
      health_status TEXT NOT NULL DEFAULT 'unknown',
      bundle_path TEXT,
      run_id TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      delivered_at INTEGER NOT NULL,
      last_seen_at INTEGER,
      follow_up_signal TEXT,
      follow_up_notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create iteration_backlog table for improvement ideas (Phase 26)
  db.exec(`
    CREATE TABLE IF NOT EXISTS iteration_backlog (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      source TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      linked_feedback_id TEXT
    )
  `);

  // Create run_patterns table for learning feedback loop (Phase 26)
  db.exec(`
    CREATE TABLE IF NOT EXISTS run_patterns (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT,
      goal_type TEXT,
      blueprint_id TEXT,
      blueprint_version TEXT,
      milestone_count INTEGER NOT NULL DEFAULT 0,
      validation_result TEXT,
      delivery_status TEXT,
      pattern_tags TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    )
  `);

  // Create indexes for Phase 26 tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_health_events_event_type ON health_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_health_events_created_at ON health_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_health_events_app_id ON health_events(app_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_app_id ON feedback(app_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_run_id ON feedback(run_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
    CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
    CREATE INDEX IF NOT EXISTS idx_delivered_apps_app_id ON delivered_apps(app_id);
    CREATE INDEX IF NOT EXISTS idx_delivered_apps_health_status ON delivered_apps(health_status);
    CREATE INDEX IF NOT EXISTS idx_delivered_apps_delivered_at ON delivered_apps(delivered_at);
    CREATE INDEX IF NOT EXISTS idx_iteration_backlog_status ON iteration_backlog(status);
    CREATE INDEX IF NOT EXISTS idx_iteration_backlog_priority ON iteration_backlog(priority);
    CREATE INDEX IF NOT EXISTS idx_iteration_backlog_created_at ON iteration_backlog(created_at);
    CREATE INDEX IF NOT EXISTS idx_run_patterns_project_id ON run_patterns(project_id);
    CREATE INDEX IF NOT EXISTS idx_run_patterns_created_at ON run_patterns(created_at);
  `);
}