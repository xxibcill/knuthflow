import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

import type {
  RalphProject,
  LoopRunStatus,
  LoopRun,
  LoopSummary,
  PlanSnapshot,
} from '../shared/ralphTypes';
export type {
  RalphProject,
  LoopRunStatus,
  LoopRun,
  LoopSummary,
  PlanSnapshot,
  RalphControlFiles,
  BootstrapError,
  ValidationSeverity,
  ValidationIssue,
  ReadinessReport,
} from '../shared/ralphTypes';
export {
  STALE_RUN_THRESHOLD_MS,
} from '../shared/ralphTypes';

import type { PlatformCategory, PlatformTarget } from '../shared/deliveryTypes';
export type { PlatformCategory, PlatformTarget } from '../shared/deliveryTypes';

import { runMigrations, SCHEMA_VERSION } from './databaseMigrations';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  lastOpenedAt: number | null;
}

export interface Session {
  id: string;
  workspaceId: string | null;
  name: string;
  startTime: number;
  endTime: number | null;
  status: 'active' | 'completed' | 'failed';
  exitCode: number | null;
  signal: number | null;
  runId: string | null;
  ptySessionId: string | null;
}

// Settings types
export interface AppSettings {
  // CLI Configuration
  cliPath: string | null;
  defaultArgs: string[];

  // Launch Behavior
  launchOnStartup: boolean;
  restoreLastWorkspace: boolean;
  defaultWorkspaceId: string | null;

  // Safety
  confirmBeforeExit: boolean;
  confirmBeforeKill: boolean;
  autoSaveSessions: boolean;

  // Terminal
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'block' | 'underline' | 'bar';

  // UI Preferences
  showTabBar: boolean;
  showStatusBar: boolean;
  theme: 'dark' | 'light' | 'system';
}

export interface LaunchProfile {
  id: string;
  name: string;
  description: string;
  cliPath: string | null;
  args: string[];
  env: Record<string, string>;
  workspaceId: string | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DatabaseSchema {
  version: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Types (Phase 16)
// ─────────────────────────────────────────────────────────────────────────────

export interface Portfolio {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface PortfolioProject {
  id: string;
  portfolioId: string;
  projectId: string;
  priority: number;
  status: 'active' | 'paused' | 'completed' | 'archived';
  dependencyGraph: Record<string, string[]>;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delivery Metrics Types (Phase 17)
// ─────────────────────────────────────────────────────────────────────────────

export type DeliveryOutcome = 'success' | 'failure' | 'cancelled';

export interface DeliveryMetrics {
  id: string;
  runId: string;
  projectId: string;
  buildTimeMs: number | null;
  iterationCount: number;
  validationPassRate: number | null;
  operatorInterventionCount: number;
  outcome: DeliveryOutcome;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lessons Learned Types (Phase 17)
// ─────────────────────────────────────────────────────────────────────────────

export interface LessonsLearned {
  id: string;
  projectId: string;
  runId: string;
  summary: string;
  pattern: string | null;
  countermeasure: string | null;
  outcome: DeliveryOutcome;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Countermeasure Types (Phase 17)
// ─────────────────────────────────────────────────────────────────────────────

export interface PromptCountermeasure {
  id: string;
  projectId: string;
  pattern: string;
  countermeasure: string;
  threshold: number;
  removalThreshold: number;
  consecutiveSuccesses: number;
  autoInject: boolean;
  active: boolean;
  injectedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Artifact & Learning Types (Phase 09)
// ─────────────────────────────────────────────────────────────────────────────

export type ArtifactType =
  | 'compiler_output'
  | 'test_log'
  | 'diff'
  | 'exit_metadata'
  | 'generated_file'
  | 'validation_result'
  | 'loop_summary';

export type ArtifactSeverity = 'error' | 'warning' | 'info';

export interface RalphArtifact {
  id: string;
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  type: ArtifactType;
  content: string;
  exitCode: number | null;
  durationMs: number | null;
  severity: ArtifactSeverity;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface LoopLearning {
  id: string;
  projectId: string;
  pattern: string;
  countermeasure: string;
  successCount: number;
  lastSeenAt: number;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface FollowUp {
  id: string;
  projectId: string;
  taskId: string | null;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  resolved: boolean;
  createdAt: number;
  resolvedAt: number | null;
  reason: string;
}

export interface SafetyStateRecord {
  projectId: string;
  rateLimitState: string;
  circuitBreakerState: string;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoint Metadata Types (Phase 11)
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckpointMetadata {
  id: string;
  runId: string;
  iteration: number;
  commitSha: string;
  stagedFiles: string;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Settings
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  cliPath: null,
  defaultArgs: [],
  launchOnStartup: false,
  restoreLastWorkspace: true,
  defaultWorkspaceId: null,
  confirmBeforeExit: false,
  confirmBeforeKill: true,
  autoSaveSessions: true,
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  cursorStyle: 'block',
  showTabBar: true,
  showStatusBar: true,
  theme: 'dark',
};

// ─────────────────────────────────────────────────────────────────────────────
// SessionDatabase with Settings
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// App Metadata Types (Phase 18)
// ─────────────────────────────────────────────────────────────────────────────

interface AppMetadata {
  id: string;
  name: string;
  brief: string;
  platformTargets: PlatformTarget[];
  platformCategories: PlatformCategory[];
  deliveryFormat: string;
  successCriteria: string[];
  stackPreferences: string[];
  forbiddenPatterns: string[];
  maxBuildTime: number;
  supportedBrowsers: string[];
  workspaceId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// App Version Types (Phase 19)
// ─────────────────────────────────────────────────────────────────────────────

export type ReleaseChannel = 'internal' | 'beta' | 'stable';
export type CreatedBy = 'operator' | 'auto';

export interface AppVersion {
  id: string;
  appId: string;
  version: string;
  changelog: string;
  releasedAt: number;
  channel: ReleaseChannel;
  createdBy: CreatedBy;
  runId: string | null;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Monitoring Types (Phase 19)
// ─────────────────────────────────────────────────────────────────────────────

export interface MonitoringConfig {
  id: string;
  appId: string;
  enabled: boolean;
  checkIntervalHours: number;
  checkBuild: boolean;
  checkLint: boolean;
  checkTests: boolean;
  checkVulnerabilities: boolean;
  autoFixTrigger: boolean;
  alertThreshold: number;
  lastCheckAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type HealthCheckType = 'build' | 'lint' | 'tests' | 'vulnerabilities';
export type HealthStatus = 'healthy' | 'degraded' | 'failing';

export interface MonitoringHealthRecord {
  id: string;
  appId: string;
  checkType: HealthCheckType;
  status: HealthStatus;
  message: string | null;
  details: string | null;
  regressed: boolean;
  checkedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Maintenance Run Types (Phase 19)
// ─────────────────────────────────────────────────────────────────────────────

export type MaintenanceTriggerType = 'scheduled' | 'regression' | 'manual';
export type MaintenanceOutcome = 'success' | 'failure' | 'cancelled';

export interface MaintenanceRun {
  id: string;
  appId: string;
  runId: string | null;
  triggerType: MaintenanceTriggerType;
  triggerReason: string;
  regressionIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  iterationCount: number;
  outcome: MaintenanceOutcome | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Staged Rollout Types (Phase 19)
// ─────────────────────────────────────────────────────────────────────────────

export interface RolloutChannel {
  id: string;
  appId: string;
  channel: string;
  isDefault: boolean;
  validationRequired: boolean;
  autoPromote: boolean;
  minBetaAdopters: number;
  createdAt: number;
  updatedAt: number;
}

export type ChannelReleaseStatus = 'active' | 'promoted' | 'rolled_back' | 'archived';

export interface ChannelRelease {
  id: string;
  appId: string;
  versionId: string;
  channel: string;
  status: ChannelReleaseStatus;
  promotedAt: number | null;
  promotedBy: string | null;
  rollbackFromVersionId: string | null;
  createdAt: number;
}

export interface BetaTester {
  id: string;
  email: string;
  name: string | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BetaTesterAccess {
  id: string;
  testerId: string;
  appId: string;
  channel: string;
  createdAt: number;
}

export type RolloutMetricType = 'installs' | 'crashes' | 'active_users' | 'crash_rate' | 'feedback_score';

export interface RolloutMetrics {
  id: string;
  appId: string;
  versionId: string;
  channel: string;
  metricType: RolloutMetricType;
  metricValue: number;
  recordedAt: number;
}

class SessionDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    // Create version table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      )
    `);

    // Get current version
    const row = this.db.prepare('SELECT version FROM schema_version LIMIT 1').get() as { version: number } | undefined;
    const currentVersion = row?.version ?? 0;

    // Run migrations if needed
    if (currentVersion < SCHEMA_VERSION) {
      this.migrate(currentVersion);
    }
  }

  private migrate(fromVersion: number): void {
    runMigrations(this.db, fromVersion, DEFAULT_SETTINGS);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings Operations
  // ─────────────────────────────────────────────────────────────────────────────

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.value) as AppSettings[K];
    } catch {
      return null;
    }
  }

  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  }

  getAllSettings(): AppSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Partial<AppSettings> = {};
    for (const row of rows) {
      try {
        (settings as Record<string, unknown>)[row.key] = JSON.parse(row.value);
      } catch {
        // Skip malformed values
      }
    }
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Launch Profile Operations
  // ─────────────────────────────────────────────────────────────────────────────

  createProfile(profile: Omit<LaunchProfile, 'createdAt' | 'updatedAt'>): LaunchProfile {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO launch_profiles (id, name, description, cli_path, args, env, workspace_id, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      profile.id,
      profile.name,
      profile.description,
      profile.cliPath,
      JSON.stringify(profile.args),
      JSON.stringify(profile.env),
      profile.workspaceId,
      profile.isDefault ? 1 : 0,
      now,
      now
    );

    // If this is set as default, unset other defaults
    if (profile.isDefault) {
      this.db.prepare('UPDATE launch_profiles SET is_default = 0 WHERE id != ?').run(profile.id);
    }

    return { ...profile, createdAt: now, updatedAt: now };
  }

  getProfile(id: string): LaunchProfile | null {
    const row = this.db.prepare('SELECT * FROM launch_profiles WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToProfile(row);
  }

  getDefaultProfile(): LaunchProfile | null {
    const row = this.db.prepare('SELECT * FROM launch_profiles WHERE is_default = 1 LIMIT 1').get() as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToProfile(row);
  }

  listProfiles(): LaunchProfile[] {
    const rows = this.db.prepare('SELECT * FROM launch_profiles ORDER BY name').all() as Record<string, unknown>[];
    return rows.map(row => this.rowToProfile(row));
  }

  updateProfile(id: string, updates: Partial<Omit<LaunchProfile, 'id' | 'createdAt'>>): LaunchProfile | null {
    const existing = this.getProfile(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    const stmt = this.db.prepare(`
      UPDATE launch_profiles
      SET name = ?, description = ?, cli_path = ?, args = ?, env = ?, workspace_id = ?, is_default = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      updated.name,
      updated.description,
      updated.cliPath,
      JSON.stringify(updated.args),
      JSON.stringify(updated.env),
      updated.workspaceId,
      updated.isDefault ? 1 : 0,
      updated.updatedAt,
      id
    );

    // If this is set as default, unset other defaults
    if (updated.isDefault) {
      this.db.prepare('UPDATE launch_profiles SET is_default = 0 WHERE id != ?').run(id);
    }

    return updated;
  }

  deleteProfile(id: string): boolean {
    const result = this.db.prepare('DELETE FROM launch_profiles WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private rowToProfile(row: Record<string, unknown>): LaunchProfile {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string || '',
      cliPath: row.cli_path as string | null,
      args: JSON.parse(row.args as string || '[]'),
      env: JSON.parse(row.env as string || '{}'),
      workspaceId: row.workspace_id as string | null,
      isDefault: (row.is_default as number) === 1,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Workspace Operations
  // ─────────────────────────────────────────────────────────────────────────────

  createWorkspace(workspace: Omit<Workspace, 'createdAt' | 'lastOpenedAt'>): Workspace {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO workspaces (id, name, path, created_at, last_opened_at)
      VALUES (?, ?, ?, ?, NULL)
    `);
    stmt.run(workspace.id, workspace.name, workspace.path, now);
    return { ...workspace, createdAt: now, lastOpenedAt: null };
  }

  getWorkspace(id: string): Workspace | null {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      name: row.name as string,
      path: row.path as string,
      createdAt: row.created_at as number,
      lastOpenedAt: row.last_opened_at as number | null,
    };
  }

  getWorkspaceByPath(workspacePath: string): Workspace | null {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE path = ?').get(workspacePath) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      name: row.name as string,
      path: row.path as string,
      createdAt: row.created_at as number,
      lastOpenedAt: row.last_opened_at as number | null,
    };
  }

  listWorkspaces(): Workspace[] {
    const rows = this.db.prepare(`
      SELECT * FROM workspaces
      ORDER BY CASE WHEN last_opened_at IS NULL THEN 1 ELSE 0 END, last_opened_at DESC, created_at DESC
    `).all() as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      path: row.path as string,
      createdAt: row.created_at as number,
      lastOpenedAt: row.last_opened_at as number | null,
    }));
  }

  listRecentWorkspaces(limit = 10): Workspace[] {
    const rows = this.db.prepare(`
      SELECT * FROM workspaces
      WHERE last_opened_at IS NOT NULL
      ORDER BY last_opened_at DESC
      LIMIT ?
    `).all(limit) as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      path: row.path as string,
      createdAt: row.created_at as number,
      lastOpenedAt: row.last_opened_at as number | null,
    }));
  }

  updateWorkspaceLastOpened(id: string): void {
    this.db.prepare('UPDATE workspaces SET last_opened_at = ? WHERE id = ?').run(Date.now(), id);
  }

  deleteWorkspace(id: string): void {
    this.db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Session Operations
  // ─────────────────────────────────────────────────────────────────────────────

  createSession(session: Omit<Session, 'startTime' | 'endTime' | 'status' | 'exitCode' | 'signal'>): Session {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, workspace_id, name, start_time, end_time, status, exit_code, signal, run_id, pty_session_id)
      VALUES (?, ?, ?, ?, NULL, 'active', NULL, NULL, ?, ?)
    `);
    stmt.run(session.id, session.workspaceId, session.name, now, session.runId, session.ptySessionId);
    return {
      ...session,
      startTime: now,
      endTime: null,
      status: 'active',
      exitCode: null,
      signal: null,
    };
  }

  getSession(id: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToSession(row);
  }

  updateSessionEnd(id: string, status: 'completed' | 'failed', exitCode: number | null, signal: number | null): void {
    this.db.prepare(`
      UPDATE sessions
      SET end_time = ?, status = ?, exit_code = ?, signal = ?
      WHERE id = ?
    `).run(Date.now(), status, exitCode, signal, id);
  }

  listSessions(limit = 50): Session[] {
    const rows = this.db.prepare(`
      SELECT * FROM sessions
      ORDER BY start_time DESC
      LIMIT ?
    `).all(limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToSession(row));
  }

  listRecentSessions(workspaceId: string | null, limit = 20): Session[] {
    const query = workspaceId
      ? `SELECT * FROM sessions WHERE workspace_id = ? ORDER BY start_time DESC LIMIT ?`
      : `SELECT * FROM sessions ORDER BY start_time DESC LIMIT ?`;
    const rows = workspaceId
      ? this.db.prepare(query).all(workspaceId, limit) as Record<string, unknown>[]
      : this.db.prepare(query).all(limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToSession(row));
  }

  listActiveSessions(): Session[] {
    const rows = this.db.prepare(`SELECT * FROM sessions WHERE status = 'active'`).all() as Record<string, unknown>[];
    return rows.map(row => this.rowToSession(row));
  }

  private rowToSession(row: Record<string, unknown>): Session {
    return {
      id: row.id as string,
      workspaceId: row.workspace_id as string | null,
      name: row.name as string,
      startTime: row.start_time as number,
      endTime: row.end_time as number | null,
      status: row.status as 'active' | 'completed' | 'failed',
      exitCode: row.exit_code as number | null,
      signal: row.signal as number | null,
      runId: row.run_id as string | null,
      ptySessionId: row.pty_session_id as string | null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Ralph Project Operations
  // ─────────────────────────────────────────────────────────────────────────────

  createRalphProject(workspaceId: string): RalphProject {
    const id = `${SessionDatabase.RALPH_PROJECT_ID_PREFIX}${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO ralph_projects (id, workspace_id, version, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?)
    `).run(id, workspaceId, now, now);
    return { id, workspaceId, version: 1, createdAt: now, updatedAt: now };
  }

  private static readonly RALPH_PROJECT_ID_PREFIX = 'ralph-';

  getRalphProjectByWorkspaceId(workspaceId: string): RalphProject | null {
    const row = this.db.prepare('SELECT * FROM ralph_projects WHERE workspace_id = ?').get(workspaceId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      workspaceId: row.workspace_id as string,
      version: row.version as number,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  getRalphProject(id: string): RalphProject | null {
    const row = this.db.prepare('SELECT * FROM ralph_projects WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      workspaceId: row.workspace_id as string,
      version: row.version as number,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  updateRalphProjectVersion(id: string): void {
    const now = Date.now();
    this.db.prepare('UPDATE ralph_projects SET version = version + 1, updated_at = ? WHERE id = ?').run(now, id);
  }

  deleteRalphProject(id: string): void {
    // Delete Ralph state atomically so partial cleanup cannot orphan the project.
    const deleteProject = this.db.transaction((projectId: string) => {
      this.db.prepare('DELETE FROM loop_summaries WHERE project_id = ?').run(projectId);
      this.db.prepare('DELETE FROM plan_snapshots WHERE project_id = ?').run(projectId);
      this.db.prepare('DELETE FROM loop_runs WHERE project_id = ?').run(projectId);
      this.db.prepare('DELETE FROM ralph_projects WHERE id = ?').run(projectId);
    });

    deleteProject(id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Loop Run Operations
  // ─────────────────────────────────────────────────────────────────────────────

  createLoopRun(projectId: string, name: string): LoopRun {
    const id = `loop-${crypto.randomUUID()}`;
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO loop_runs (id, project_id, name, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)
    `);
    stmt.run(id, projectId, name, now);
    return {
      id,
      projectId,
      name,
      status: 'pending',
      startTime: null,
      endTime: null,
      exitCode: null,
      signal: null,
      error: null,
      iterationCount: 0,
      sessionId: null,
      ptySessionId: null,
      createdAt: now,
    };
  }

  getLoopRun(id: string): LoopRun | null {
    const row = this.db.prepare('SELECT * FROM loop_runs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToLoopRun(row);
  }

  startLoopRun(id: string, sessionId: string, ptySessionId: string): void {
    const now = Date.now();
    this.db.prepare(`
      UPDATE loop_runs SET status = 'running', start_time = ?, session_id = ?, pty_session_id = ?
      WHERE id = ?
    `).run(now, sessionId, ptySessionId, id);
  }

  endLoopRun(id: string, status: 'completed' | 'failed' | 'cancelled', exitCode: number | null, signal: number | null, error: string | null): void {
    const now = Date.now();
    this.db.prepare(`
      UPDATE loop_runs SET status = ?, end_time = ?, exit_code = ?, signal = ?, error = ?
      WHERE id = ?
    `).run(status, now, exitCode, signal, error, id);
  }

  incrementLoopRunIteration(id: string): void {
    this.db.prepare('UPDATE loop_runs SET iteration_count = iteration_count + 1 WHERE id = ?').run(id);
  }

  listLoopRuns(projectId: string, limit = 50): LoopRun[] {
    const rows = this.db.prepare(`
      SELECT * FROM loop_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(projectId, limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToLoopRun(row));
  }

  listActiveLoopRuns(projectId: string): LoopRun[] {
    const rows = this.db.prepare(`
      SELECT * FROM loop_runs WHERE project_id = ? AND status = 'running'
    `).all(projectId) as Record<string, unknown>[];
    return rows.map(row => this.rowToLoopRun(row));
  }

  private rowToLoopRun(row: Record<string, unknown>): LoopRun {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      name: row.name as string,
      status: row.status as LoopRunStatus,
      startTime: row.start_time as number | null,
      endTime: row.end_time as number | null,
      exitCode: row.exit_code as number | null,
      signal: row.signal as number | null,
      error: row.error as string | null,
      iterationCount: row.iteration_count as number,
      sessionId: row.session_id as string | null,
      ptySessionId: row.pty_session_id as string | null,
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Loop Summary Operations
  // ─────────────────────────────────────────────────────────────────────────────

  createLoopSummary(projectId: string, runId: string, iteration: number, prompt: string, response: string, selectedFiles: string[]): LoopSummary {
    const id = `summary-${crypto.randomUUID()}`;
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO loop_summaries (id, project_id, run_id, iteration, prompt, response, selected_files, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, projectId, runId, iteration, prompt, response, JSON.stringify(selectedFiles), now);
    return {
      id,
      projectId,
      runId,
      iteration,
      prompt,
      response,
      selectedFiles,
      createdAt: now,
    };
  }

  getLoopSummary(id: string): LoopSummary | null {
    const row = this.db.prepare('SELECT * FROM loop_summaries WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToLoopSummary(row);
  }

  listLoopSummaries(runId: string): LoopSummary[] {
    const rows = this.db.prepare(`
      SELECT * FROM loop_summaries WHERE run_id = ? ORDER BY iteration ASC
    `).all(runId) as Record<string, unknown>[];
    return rows.map(row => this.rowToLoopSummary(row));
  }

  getLatestLoopSummary(runId: string): LoopSummary | null {
    const row = this.db.prepare(`
      SELECT * FROM loop_summaries WHERE run_id = ? ORDER BY iteration DESC LIMIT 1
    `).get(runId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToLoopSummary(row);
  }

  private rowToLoopSummary(row: Record<string, unknown>): LoopSummary {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      runId: row.run_id as string,
      iteration: row.iteration as number,
      prompt: row.prompt as string,
      response: row.response as string,
      selectedFiles: JSON.parse(row.selected_files as string || '[]'),
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Plan Snapshot Operations
  // ─────────────────────────────────────────────────────────────────────────────

  createPlanSnapshot(projectId: string, runId: string, iteration: number, planContent: string): PlanSnapshot {
    const id = `snapshot-${crypto.randomUUID()}`;
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO plan_snapshots (id, project_id, run_id, iteration, plan_content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, projectId, runId, iteration, planContent, now);
    return {
      id,
      projectId,
      runId,
      iteration,
      planContent,
      createdAt: now,
    };
  }

  getPlanSnapshot(id: string): PlanSnapshot | null {
    const row = this.db.prepare('SELECT * FROM plan_snapshots WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToPlanSnapshot(row);
  }

  listPlanSnapshots(runId: string): PlanSnapshot[] {
    const rows = this.db.prepare(`
      SELECT * FROM plan_snapshots WHERE run_id = ? ORDER BY iteration ASC
    `).all(runId) as Record<string, unknown>[];
    return rows.map(row => this.rowToPlanSnapshot(row));
  }

  getLatestPlanSnapshot(runId: string): PlanSnapshot | null {
    const row = this.db.prepare(`
      SELECT * FROM plan_snapshots WHERE run_id = ? ORDER BY iteration DESC LIMIT 1
    `).get(runId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToPlanSnapshot(row);
  }

  private rowToPlanSnapshot(row: Record<string, unknown>): PlanSnapshot {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      runId: row.run_id as string,
      iteration: row.iteration as number,
      planContent: row.plan_content as string,
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Ralph Artifact Operations (Phase 09)
  // ─────────────────────────────────────────────────────────────────────────────

  createArtifact(params: {
    projectId: string;
    runId: string;
    iteration: number;
    itemId: string | null;
    type: ArtifactType;
    content: string;
    exitCode: number | null;
    durationMs: number | null;
    severity: ArtifactSeverity;
    metadata: Record<string, unknown>;
  }): RalphArtifact {
    const id = `artifact-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO ralph_artifacts (id, project_id, run_id, iteration, item_id, type, content, exit_code, duration_ms, severity, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.projectId,
      params.runId,
      params.iteration,
      params.itemId,
      params.type,
      params.content,
      params.exitCode,
      params.durationMs,
      params.severity,
      JSON.stringify(params.metadata),
      now
    );
    return {
      id,
      projectId: params.projectId,
      runId: params.runId,
      iteration: params.iteration,
      itemId: params.itemId,
      type: params.type,
      content: params.content,
      exitCode: params.exitCode,
      durationMs: params.durationMs,
      severity: params.severity,
      createdAt: now,
      metadata: params.metadata,
    };
  }

  getArtifact(id: string): RalphArtifact | null {
    const row = this.db.prepare('SELECT * FROM ralph_artifacts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToArtifact(row);
  }

  listArtifacts(params: {
    projectId?: string;
    runId?: string;
    iteration?: number;
    itemId?: string | null;
    type?: ArtifactType;
  }): RalphArtifact[] {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.projectId) {
      conditions.push('project_id = ?');
      values.push(params.projectId);
    }
    if (params.runId) {
      conditions.push('run_id = ?');
      values.push(params.runId);
    }
    if (params.iteration !== undefined) {
      conditions.push('iteration = ?');
      values.push(params.iteration);
    }
    if (params.itemId !== undefined) {
      if (params.itemId === null) {
        conditions.push('item_id IS NULL');
      } else {
        conditions.push('item_id = ?');
        values.push(params.itemId);
      }
    }
    if (params.type) {
      conditions.push('type = ?');
      values.push(params.type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db.prepare(`
      SELECT * FROM ralph_artifacts ${where} ORDER BY created_at DESC
    `).all(...values) as Record<string, unknown>[];
    return rows.map(row => this.rowToArtifact(row));
  }

  deleteArtifact(id: string): void {
    this.db.prepare('DELETE FROM ralph_artifacts WHERE id = ?').run(id);
  }

  deleteArtifactsForRun(runId: string): void {
    this.db.prepare('DELETE FROM ralph_artifacts WHERE run_id = ?').run(runId);
  }

  private rowToArtifact(row: Record<string, unknown>): RalphArtifact {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      runId: row.run_id as string,
      iteration: row.iteration as number,
      itemId: row.item_id as string | null,
      type: row.type as ArtifactType,
      content: row.content as string,
      exitCode: row.exit_code as number | null,
      durationMs: row.duration_ms as number | null,
      severity: row.severity as ArtifactSeverity,
      createdAt: row.created_at as number,
      metadata: JSON.parse(row.metadata as string || '{}'),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Loop Learning Operations (Phase 09)
  // ─────────────────────────────────────────────────────────────────────────────

  upsertLoopLearning(params: {
    projectId: string;
    pattern: string;
    countermeasure: string;
    metadata?: Record<string, unknown>;
  }): LoopLearning {
    const existing = this.getLoopLearningByPattern(params.projectId, params.pattern);

    if (existing) {
      // Update existing
      const now = Date.now();
      this.db.prepare(`
        UPDATE loop_learning SET success_count = success_count + 1, last_seen_at = ?, metadata = ?
        WHERE id = ?
      `).run(now, JSON.stringify(params.metadata || {}), existing.id);
      return { ...existing, successCount: existing.successCount + 1, lastSeenAt: now };
    }

    // Create new
    const id = `learning-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO loop_learning (id, project_id, pattern, countermeasure, success_count, last_seen_at, created_at, metadata)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `).run(id, params.projectId, params.pattern, params.countermeasure, now, now, JSON.stringify(params.metadata || {}));

    return {
      id,
      projectId: params.projectId,
      pattern: params.pattern,
      countermeasure: params.countermeasure,
      successCount: 1,
      lastSeenAt: now,
      createdAt: now,
      metadata: params.metadata || {},
    };
  }

  getLoopLearningByPattern(projectId: string, pattern: string): LoopLearning | null {
    const row = this.db.prepare(`
      SELECT * FROM loop_learning WHERE project_id = ? AND pattern = ?
    `).get(projectId, pattern) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToLoopLearning(row);
  }

  listLoopLearning(projectId: string): LoopLearning[] {
    const rows = this.db.prepare(`
      SELECT * FROM loop_learning WHERE project_id = ? ORDER BY success_count DESC
    `).all(projectId) as Record<string, unknown>[];
    return rows.map(row => this.rowToLoopLearning(row));
  }

  updateLoopLearningSuccessCount(id: string, count: number): void {
    this.db.prepare('UPDATE loop_learning SET success_count = ?, last_seen_at = ? WHERE id = ?')
      .run(count, Date.now(), id);
  }

  private rowToLoopLearning(row: Record<string, unknown>): LoopLearning {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      pattern: row.pattern as string,
      countermeasure: row.countermeasure as string,
      successCount: row.success_count as number,
      lastSeenAt: row.last_seen_at as number,
      createdAt: row.created_at as number,
      metadata: JSON.parse(row.metadata as string || '{}'),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Follow-up Operations (Phase 09)
  // ─────────────────────────────────────────────────────────────────────────────

  createFollowUp(projectId: string, followUp: Omit<FollowUp, 'projectId' | 'resolved' | 'resolvedAt'>): FollowUp {
    const id = followUp.id;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO follow_ups (id, project_id, task_id, title, description, priority, resolved, created_at, resolved_at, reason)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, ?)
    `).run(id, projectId, followUp.taskId, followUp.title, followUp.description, followUp.priority, now, followUp.reason);
    return { ...followUp, projectId, resolved: false, resolvedAt: null };
  }

  listFollowUps(projectId: string, includeResolved = false): FollowUp[] {
    const query = includeResolved
      ? 'SELECT * FROM follow_ups WHERE project_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM follow_ups WHERE project_id = ? AND resolved = 0 ORDER BY created_at DESC';
    const rows = this.db.prepare(query).all(projectId) as Record<string, unknown>[];
    return rows.map(row => this.rowToFollowUp(row));
  }

  resolveFollowUp(followUpId: string): void {
    this.db.prepare('UPDATE follow_ups SET resolved = 1, resolved_at = ? WHERE id = ?')
      .run(Date.now(), followUpId);
  }

  private rowToFollowUp(row: Record<string, unknown>): FollowUp {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      taskId: row.task_id as string | null,
      title: row.title as string,
      description: row.description as string,
      priority: row.priority as 'high' | 'medium' | 'low',
      resolved: (row.resolved as number) === 1,
      createdAt: row.created_at as number,
      resolvedAt: row.resolved_at as number | null,
      reason: (row.reason as string) || '',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Safety State Persistence (Phase 09)
  // ─────────────────────────────────────────────────────────────────────────────

  upsertSafetyState(projectId: string, rateLimitState: unknown, circuitBreakerState: unknown): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT OR REPLACE INTO safety_state (project_id, rate_limit_state, circuit_breaker_state, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(projectId, JSON.stringify(rateLimitState), JSON.stringify(circuitBreakerState), now);
  }

  getSafetyState(projectId: string): { rateLimitState: unknown; circuitBreakerState: unknown } | null {
    const row = this.db.prepare('SELECT * FROM safety_state WHERE project_id = ?').get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      rateLimitState: JSON.parse(row.rate_limit_state as string),
      circuitBreakerState: JSON.parse(row.circuit_breaker_state as string),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Checkpoint Metadata Operations (Phase 11)
  // ─────────────────────────────────────────────────────────────────────────────

  createCheckpoint(params: {
    runId: string;
    iteration: number;
    commitSha: string;
    stagedFiles: string;
    createdAt: number;
  }): CheckpointMetadata {
    const id = `checkpoint-${crypto.randomUUID()}`;
    this.db.prepare(`
      INSERT INTO checkpoint_metadata (id, run_id, iteration, commit_sha, staged_files, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, params.runId, params.iteration, params.commitSha, params.stagedFiles, params.createdAt);
    return {
      id,
      runId: params.runId,
      iteration: params.iteration,
      commitSha: params.commitSha,
      stagedFiles: params.stagedFiles,
      createdAt: params.createdAt,
    };
  }

  // Helper to parse staged files from database row
  private parseStagedFiles(row: Record<string, unknown>): string[] {
    try {
      return JSON.parse(row.staged_files as string || '[]');
    } catch {
      return [];
    }
  }

  listCheckpoints(runId: string): Array<{
    commitSha: string;
    iteration: number;
    stagedFiles: string[];
    createdAt: number;
  }> {
    const rows = this.db.prepare(`
      SELECT * FROM checkpoint_metadata WHERE run_id = ? ORDER BY created_at ASC
    `).all(runId) as Record<string, unknown>[];
    return rows.map(row => ({
      commitSha: row.commit_sha as string,
      iteration: row.iteration as number,
      stagedFiles: this.parseStagedFiles(row),
      createdAt: row.created_at as number,
    }));
  }

  getLatestCheckpoint(runId: string): {
    commitSha: string;
    iteration: number;
    stagedFiles: string[];
    createdAt: number;
  } | null {
    const row = this.db.prepare(`
      SELECT * FROM checkpoint_metadata WHERE run_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(runId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      commitSha: row.commit_sha as string,
      iteration: row.iteration as number,
      stagedFiles: this.parseStagedFiles(row),
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Portfolio Operations (Phase 16)
  // ─────────────────────────────────────────────────────────────────────────────

  createPortfolio(name: string, description = ''): Portfolio {
    const id = `portfolio-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO portfolios (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, description, now, now);
    return { id, name, description, createdAt: now, updatedAt: now };
  }

  getPortfolio(id: string): Portfolio | null {
    const row = this.db.prepare('SELECT * FROM portfolios WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || '',
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  listPortfolios(): Portfolio[] {
    const rows = this.db.prepare('SELECT * FROM portfolios ORDER BY created_at DESC').all() as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || '',
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    }));
  }

  updatePortfolio(id: string, updates: Partial<{ name: string; description: string }>): Portfolio | null {
    const existing = this.getPortfolio(id);
    if (!existing) return null;
    const now = Date.now();
    const name = updates.name ?? existing.name;
    const description = updates.description ?? existing.description;
    this.db.prepare('UPDATE portfolios SET name = ?, description = ?, updated_at = ? WHERE id = ?')
      .run(name, description, now, id);
    return { ...existing, name, description, updatedAt: now };
  }

  deletePortfolio(id: string): void {
    // Delete portfolio projects first (cascade)
    this.db.prepare('DELETE FROM portfolio_projects WHERE portfolio_id = ?').run(id);
    this.db.prepare('DELETE FROM portfolios WHERE id = ?').run(id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Portfolio Project Operations (Phase 16)
  // ─────────────────────────────────────────────────────────────────────────────

  addProjectToPortfolio(portfolioId: string, projectId: string, priority = 0): PortfolioProject {
    const id = `pp-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO portfolio_projects (id, portfolio_id, project_id, priority, status, dependency_graph, created_at)
      VALUES (?, ?, ?, ?, 'active', '{}', ?)
    `).run(id, portfolioId, projectId, priority, now);
    return {
      id,
      portfolioId,
      projectId,
      priority,
      status: 'active',
      dependencyGraph: {},
      createdAt: now,
    };
  }

  getPortfolioProject(id: string): PortfolioProject | null {
    const row = this.db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToPortfolioProject(row);
  }

  getPortfolioProjectByProjectId(portfolioId: string, projectId: string): PortfolioProject | null {
    const row = this.db.prepare(
      'SELECT * FROM portfolio_projects WHERE portfolio_id = ? AND project_id = ?'
    ).get(portfolioId, projectId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToPortfolioProject(row);
  }

  listPortfolioProjects(portfolioId: string): PortfolioProject[] {
    const rows = this.db.prepare(
      'SELECT * FROM portfolio_projects WHERE portfolio_id = ? ORDER BY priority DESC, created_at ASC'
    ).all(portfolioId) as Record<string, unknown>[];
    return rows.map(row => this.rowToPortfolioProject(row));
  }

  updatePortfolioProject(id: string, updates: Partial<{
    priority: number;
    status: PortfolioProject['status'];
    dependencyGraph: Record<string, string[]>;
  }>): PortfolioProject | null {
    const existing = this.getPortfolioProject(id);
    if (!existing) return null;
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.priority !== undefined) {
      setClauses.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.dependencyGraph !== undefined) {
      setClauses.push('dependency_graph = ?');
      values.push(JSON.stringify(updates.dependencyGraph));
    }

    if (setClauses.length === 0) return existing;

    values.push(id);
    this.db.prepare(`UPDATE portfolio_projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    return this.getPortfolioProject(id);
  }

  removeProjectFromPortfolio(id: string): void {
    this.db.prepare('DELETE FROM portfolio_projects WHERE id = ?').run(id);
  }

  listPortfoliosByProject(projectId: string): Portfolio[] {
    const rows = this.db.prepare(`
      SELECT p.* FROM portfolios p
      INNER JOIN portfolio_projects pp ON p.id = pp.portfolio_id
      WHERE pp.project_id = ?
      ORDER BY p.created_at DESC
    `).all(projectId) as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || '',
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    }));
  }

  private rowToPortfolioProject(row: Record<string, unknown>): PortfolioProject {
    return {
      id: row.id as string,
      portfolioId: row.portfolio_id as string,
      projectId: row.project_id as string,
      priority: row.priority as number,
      status: row.status as PortfolioProject['status'],
      dependencyGraph: JSON.parse(row.dependency_graph as string || '{}'),
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Milestone State Operations (Phase 14)
  // ─────────────────────────────────────────────────────────────────────────────

  createMilestoneState(params: {
    projectId: string;
    runId: string;
    milestoneId: string;
    title: string;
    description: string;
    acceptanceGate: string;
    order: number;
    tasks: string[];
  }): import('../shared/ralphTypes').MilestoneState {
    const id = `ms-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO milestone_states (id, project_id, run_id, milestone_id, title, description, status, acceptance_gate, "order", tasks, completed_tasks, blocked_tasks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, '[]', '[]', ?, ?)
    `).run(
      id,
      params.projectId,
      params.runId,
      params.milestoneId,
      params.title,
      params.description,
      params.acceptanceGate,
      params.order,
      JSON.stringify(params.tasks),
      now,
      now
    );
    return {
      id,
      projectId: params.projectId,
      runId: params.runId,
      milestoneId: params.milestoneId,
      title: params.title,
      description: params.description,
      status: 'pending',
      acceptanceGate: params.acceptanceGate,
      order: params.order,
      tasks: params.tasks,
      completedTasks: [],
      blockedTasks: [],
      startedAt: null,
      completedAt: null,
      validationResult: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  getMilestoneState(id: string): import('../shared/ralphTypes').MilestoneState | null {
    const row = this.db.prepare('SELECT * FROM milestone_states WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToMilestoneState(row);
  }

  getMilestoneStateByMilestoneId(projectId: string, runId: string, milestoneId: string): import('../shared/ralphTypes').MilestoneState | null {
    const row = this.db.prepare(`
      SELECT * FROM milestone_states WHERE project_id = ? AND run_id = ? AND milestone_id = ?
    `).get(projectId, runId, milestoneId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToMilestoneState(row);
  }

  listMilestoneStates(projectId: string, runId: string): import('../shared/ralphTypes').MilestoneState[] {
    const rows = this.db.prepare(`
      SELECT * FROM milestone_states WHERE project_id = ? AND run_id = ? ORDER BY "order" ASC
    `).all(projectId, runId) as Record<string, unknown>[];
    return rows.map(row => this.rowToMilestoneState(row));
  }

  listMilestoneStatesByStatus(projectId: string, runId: string, status: string): import('../shared/ralphTypes').MilestoneState[] {
    const rows = this.db.prepare(`
      SELECT * FROM milestone_states WHERE project_id = ? AND run_id = ? AND status = ? ORDER BY "order" ASC
    `).all(projectId, runId, status) as Record<string, unknown>[];
    return rows.map(row => this.rowToMilestoneState(row));
  }

  updateMilestoneState(id: string, updates: Partial<{
    status: import('../shared/ralphTypes').MilestoneStatus;
    completedTasks: string[];
    blockedTasks: string[];
    startedAt: number | null;
    completedAt: number | null;
    validationResult: import('../shared/ralphTypes').MilestoneValidationResult | null;
  }>): void {
    const now = Date.now();
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.completedTasks !== undefined) {
      setClauses.push('completed_tasks = ?');
      values.push(JSON.stringify(updates.completedTasks));
    }
    if (updates.blockedTasks !== undefined) {
      setClauses.push('blocked_tasks = ?');
      values.push(JSON.stringify(updates.blockedTasks));
    }
    if (updates.startedAt !== undefined) {
      setClauses.push('started_at = ?');
      values.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt);
    }
    if (updates.validationResult !== undefined) {
      setClauses.push('validation_result = ?');
      values.push(JSON.stringify(updates.validationResult));
    }

    values.push(id);
    this.db.prepare(`UPDATE milestone_states SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  private rowToMilestoneState(row: Record<string, unknown>): import('../shared/ralphTypes').MilestoneState {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      runId: row.run_id as string,
      milestoneId: row.milestone_id as string,
      title: row.title as string,
      description: row.description as string,
      status: row.status as import('../shared/ralphTypes').MilestoneStatus,
      acceptanceGate: row.acceptance_gate as string,
      order: row.order as number,
      tasks: JSON.parse(row.tasks as string || '[]'),
      completedTasks: JSON.parse(row.completed_tasks as string || '[]'),
      blockedTasks: JSON.parse(row.blocked_tasks as string || '[]'),
      startedAt: row.started_at as number | null,
      completedAt: row.completed_at as number | null,
      validationResult: row.validation_result ? JSON.parse(row.validation_result as string) : null,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Milestone Task Operations (Phase 14)
  // ─────────────────────────────────────────────────────────────────────────────

  createMilestoneTask(params: {
    projectId: string;
    runId: string;
    milestoneId: string;
    taskId: string;
    title: string;
    priority?: number;
    dependencies?: string[];
  }): import('../shared/ralphTypes').MilestoneTask {
    const id = `mt-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO milestone_tasks (id, project_id, run_id, milestone_id, task_id, title, status, priority, dependencies, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `).run(
      id,
      params.projectId,
      params.runId,
      params.milestoneId,
      params.taskId,
      params.title,
      params.priority ?? 2,
      JSON.stringify(params.dependencies ?? []),
      now,
      now
    );
    return {
      id,
      projectId: params.projectId,
      runId: params.runId,
      milestoneId: params.milestoneId,
      taskId: params.taskId,
      title: params.title,
      status: 'pending',
      priority: params.priority ?? 2,
      dependencies: params.dependencies ?? [],
      blockedReason: null,
      selectedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  getMilestoneTask(id: string): import('../shared/ralphTypes').MilestoneTask | null {
    const row = this.db.prepare('SELECT * FROM milestone_tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToMilestoneTask(row);
  }

  getMilestoneTaskByTaskId(projectId: string, runId: string, taskId: string): import('../shared/ralphTypes').MilestoneTask | null {
    const row = this.db.prepare(`
      SELECT * FROM milestone_tasks WHERE project_id = ? AND run_id = ? AND task_id = ?
    `).get(projectId, runId, taskId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToMilestoneTask(row);
  }

  listMilestoneTasks(projectId: string, runId: string): import('../shared/ralphTypes').MilestoneTask[] {
    const rows = this.db.prepare(`
      SELECT * FROM milestone_tasks WHERE project_id = ? AND run_id = ? ORDER BY priority ASC
    `).all(projectId, runId) as Record<string, unknown>[];
    return rows.map(row => this.rowToMilestoneTask(row));
  }

  listMilestoneTasksByMilestone(projectId: string, runId: string, milestoneId: string): import('../shared/ralphTypes').MilestoneTask[] {
    const rows = this.db.prepare(`
      SELECT * FROM milestone_tasks WHERE project_id = ? AND run_id = ? AND milestone_id = ? ORDER BY priority ASC
    `).all(projectId, runId, milestoneId) as Record<string, unknown>[];
    return rows.map(row => this.rowToMilestoneTask(row));
  }

  listPendingMilestoneTasks(projectId: string, runId: string): import('../shared/ralphTypes').MilestoneTask[] {
    const rows = this.db.prepare(`
      SELECT * FROM milestone_tasks WHERE project_id = ? AND run_id = ? AND status = 'pending' ORDER BY priority ASC
    `).all(projectId, runId) as Record<string, unknown>[];
    return rows.map(row => this.rowToMilestoneTask(row));
  }

  updateMilestoneTask(id: string, updates: Partial<{
    status: 'pending' | 'in_progress' | 'completed' | 'deferred' | 'blocked';
    blockedReason: string | null;
    selectedAt: number | null;
    completedAt: number | null;
  }>): void {
    const now = Date.now();
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.blockedReason !== undefined) {
      setClauses.push('blocked_reason = ?');
      values.push(updates.blockedReason);
    }
    if (updates.selectedAt !== undefined) {
      setClauses.push('selected_at = ?');
      values.push(updates.selectedAt);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt);
    }

    values.push(id);
    this.db.prepare(`UPDATE milestone_tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  private rowToMilestoneTask(row: Record<string, unknown>): import('../shared/ralphTypes').MilestoneTask {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      runId: row.run_id as string,
      milestoneId: row.milestone_id as string,
      taskId: row.task_id as string,
      title: row.title as string,
      status: row.status as 'pending' | 'in_progress' | 'completed' | 'deferred' | 'blocked',
      priority: row.priority as number,
      dependencies: JSON.parse(row.dependencies as string || '[]'),
      blockedReason: row.blocked_reason as string | null,
      selectedAt: row.selected_at as number | null,
      completedAt: row.completed_at as number | null,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Task Dependency Operations (Phase 14)
  // ─────────────────────────────────────────────────────────────────────────────

  createTaskDependency(params: {
    projectId: string;
    taskId: string;
    dependsOnTaskId: string;
    milestoneId?: string | null;
  }): import('../shared/ralphTypes').TaskDependency {
    const id = `td-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO task_dependencies (id, project_id, task_id, depends_on_task_id, milestone_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, params.projectId, params.taskId, params.dependsOnTaskId, params.milestoneId ?? null, now);
    return {
      id,
      projectId: params.projectId,
      taskId: params.taskId,
      dependsOnTaskId: params.dependsOnTaskId,
      milestoneId: params.milestoneId ?? null,
      createdAt: now,
    };
  }

  listTaskDependencies(projectId: string, taskId: string): import('../shared/ralphTypes').TaskDependency[] {
    const rows = this.db.prepare(`
      SELECT * FROM task_dependencies WHERE project_id = ? AND task_id = ?
    `).all(projectId, taskId) as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      projectId: row.project_id as string,
      taskId: row.task_id as string,
      dependsOnTaskId: row.depends_on_task_id as string,
      milestoneId: row.milestone_id as string | null,
      createdAt: row.created_at as number,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Milestone Snapshot Operations (Phase 14)
  // ─────────────────────────────────────────────────────────────────────────────

  createMilestoneSnapshot(params: {
    projectId: string;
    runId: string;
    iteration: number;
    milestones: import('../shared/ralphTypes').MilestoneState[];
    taskGraph: import('../shared/ralphTypes').MilestoneTask[];
    compressedContext?: import('../shared/ralphTypes').CompressedContext | null;
  }): import('../shared/ralphTypes').MilestoneSnapshot {
    const id = `msnap-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO milestone_snapshots (id, project_id, run_id, iteration, milestones, task_graph, compressed_context, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.projectId,
      params.runId,
      params.iteration,
      JSON.stringify(params.milestones),
      JSON.stringify(params.taskGraph),
      params.compressedContext ? JSON.stringify(params.compressedContext) : null,
      now
    );
    return {
      id,
      projectId: params.projectId,
      runId: params.runId,
      iteration: params.iteration,
      milestones: params.milestones,
      taskGraph: params.taskGraph,
      compressedContext: params.compressedContext ?? null,
      createdAt: now,
    };
  }

  getMilestoneSnapshot(id: string): import('../shared/ralphTypes').MilestoneSnapshot | null {
    const row = this.db.prepare('SELECT * FROM milestone_snapshots WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToMilestoneSnapshot(row);
  }

  listMilestoneSnapshots(runId: string): import('../shared/ralphTypes').MilestoneSnapshot[] {
    const rows = this.db.prepare(`
      SELECT * FROM milestone_snapshots WHERE run_id = ? ORDER BY iteration ASC
    `).all(runId) as Record<string, unknown>[];
    return rows.map(row => this.rowToMilestoneSnapshot(row));
  }

  getLatestMilestoneSnapshot(runId: string): import('../shared/ralphTypes').MilestoneSnapshot | null {
    const row = this.db.prepare(`
      SELECT * FROM milestone_snapshots WHERE run_id = ? ORDER BY iteration DESC LIMIT 1
    `).get(runId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToMilestoneSnapshot(row);
  }

  private rowToMilestoneSnapshot(row: Record<string, unknown>): import('../shared/ralphTypes').MilestoneSnapshot {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      runId: row.run_id as string,
      iteration: row.iteration as number,
      milestones: JSON.parse(row.milestones as string || '[]'),
      taskGraph: JSON.parse(row.task_graph as string || '[]'),
      compressedContext: row.compressed_context ? JSON.parse(row.compressed_context as string) : null,
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Milestone Feedback Operations (Phase 14)
  // ─────────────────────────────────────────────────────────────────────────────

  createMilestoneFeedback(params: {
    projectId: string;
    runId: string;
    milestoneId: string;
    taskId?: string | null;
    type: 'accept' | 'reject' | 'rework' | 'rollback' | 'replan';
    reason: string;
    evidence: string;
    suggestedAction?: string | null;
  }): import('../shared/ralphTypes').MilestoneFeedback {
    const id = `mfb-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO milestone_feedback (id, project_id, run_id, milestone_id, task_id, type, reason, evidence, suggested_action, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.projectId,
      params.runId,
      params.milestoneId,
      params.taskId ?? null,
      params.type,
      params.reason,
      params.evidence,
      params.suggestedAction ?? null,
      now
    );
    return {
      id,
      projectId: params.projectId,
      runId: params.runId,
      milestoneId: params.milestoneId,
      taskId: params.taskId ?? null,
      type: params.type,
      reason: params.reason,
      evidence: params.evidence,
      suggestedAction: params.suggestedAction ?? null,
      createdAt: now,
    };
  }

  listMilestoneFeedback(projectId: string, runId: string): import('../shared/ralphTypes').MilestoneFeedback[] {
    const rows = this.db.prepare(`
      SELECT * FROM milestone_feedback WHERE project_id = ? AND run_id = ? ORDER BY created_at DESC
    `).all(projectId, runId) as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      projectId: row.project_id as string,
      runId: row.run_id as string,
      milestoneId: row.milestone_id as string,
      taskId: row.task_id as string | null,
      type: row.type as 'accept' | 'reject' | 'rework' | 'rollback' | 'replan',
      reason: row.reason as string,
      evidence: row.evidence as string,
      suggestedAction: row.suggested_action as string | null,
      createdAt: row.created_at as number,
    }));
  }

  listMilestoneFeedbackByMilestone(projectId: string, runId: string, milestoneId: string): import('../shared/ralphTypes').MilestoneFeedback[] {
    const rows = this.db.prepare(`
      SELECT * FROM milestone_feedback WHERE project_id = ? AND run_id = ? AND milestone_id = ? ORDER BY created_at DESC
    `).all(projectId, runId, milestoneId) as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      projectId: row.project_id as string,
      runId: row.run_id as string,
      milestoneId: row.milestone_id as string,
      taskId: row.task_id as string | null,
      type: row.type as 'accept' | 'reject' | 'rework' | 'rollback' | 'replan',
      reason: row.reason as string,
      evidence: row.evidence as string,
      suggestedAction: row.suggested_action as string | null,
      createdAt: row.created_at as number,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Portfolio Artifact Reference Operations (Phase 16)
  // ─────────────────────────────────────────────────────────────────────────────

  createArtifactReference(params: {
    projectId: string;
    artifactPath: string;
    artifactType: string;
  }): { id: string; projectId: string; artifactPath: string; artifactType: string; createdAt: number } {
    const id = `artifact-ref-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO portfolio_artifact_references (id, project_id, artifact_path, artifact_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, params.projectId, params.artifactPath, params.artifactType, now);
    return { id, ...params, createdAt: now };
  }

  listArtifactReferences(projectIds: string[]): Array<{
    id: string;
    projectId: string;
    artifactPath: string;
    artifactType: string;
    createdAt: number;
  }> {
    if (projectIds.length === 0) return [];
    const placeholders = projectIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT * FROM portfolio_artifact_references
      WHERE project_id IN (${placeholders})
      ORDER BY created_at DESC
    `).all(...projectIds) as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      projectId: row.project_id as string,
      artifactPath: row.artifact_path as string,
      artifactType: row.artifact_type as string,
      createdAt: row.created_at as number,
    }));
  }

  listArtifactReferencesByProject(projectId: string): Array<{
    id: string;
    projectId: string;
    artifactPath: string;
    artifactType: string;
    createdAt: number;
  }> {
    const rows = this.db.prepare(`
      SELECT * FROM portfolio_artifact_references
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(projectId) as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      projectId: row.project_id as string,
      artifactPath: row.artifact_path as string,
      artifactType: row.artifact_type as string,
      createdAt: row.created_at as number,
    }));
  }

  deleteArtifactReferencesByProject(projectId: string): void {
    this.db.prepare('DELETE FROM portfolio_artifact_references WHERE project_id = ?').run(projectId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Delivery Metrics Operations (Phase 17)
  // ─────────────────────────────────────────────────────────────────────────────

  createDeliveryMetrics(params: {
    runId: string;
    projectId: string;
    buildTimeMs: number | null;
    iterationCount: number;
    validationPassRate: number | null;
    operatorInterventionCount: number;
    outcome: DeliveryOutcome;
  }): DeliveryMetrics {
    const id = `dm-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO delivery_metrics (id, run_id, project_id, build_time_ms, iteration_count, validation_pass_rate, operator_intervention_count, outcome, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.runId,
      params.projectId,
      params.buildTimeMs,
      params.iterationCount,
      params.validationPassRate,
      params.operatorInterventionCount,
      params.outcome,
      now
    );
    return {
      id,
      runId: params.runId,
      projectId: params.projectId,
      buildTimeMs: params.buildTimeMs,
      iterationCount: params.iterationCount,
      validationPassRate: params.validationPassRate,
      operatorInterventionCount: params.operatorInterventionCount,
      outcome: params.outcome,
      createdAt: now,
    };
  }

  /**
   * Create delivery metrics and generate lessons learned in a single transaction.
   * This ensures atomicity - either both succeed or neither is committed.
   */
  recordDeliveryAndLessons(params: {
    runId: string;
    projectId: string;
    buildTimeMs: number | null;
    iterationCount: number;
    validationPassRate: number | null;
    operatorInterventionCount: number;
    outcome: DeliveryOutcome;
    lessonSummary: string;
    lessonPattern: string | null;
    lessonCountermeasure: string | null;
  }): { metrics: DeliveryMetrics; lesson: LessonsLearned } {
    const transaction = this.db.transaction(() => {
      const metrics = this.createDeliveryMetrics({
        runId: params.runId,
        projectId: params.projectId,
        buildTimeMs: params.buildTimeMs,
        iterationCount: params.iterationCount,
        validationPassRate: params.validationPassRate,
        operatorInterventionCount: params.operatorInterventionCount,
        outcome: params.outcome,
      });

      const lesson = this.createLessonsLearned({
        projectId: params.projectId,
        runId: params.runId,
        summary: params.lessonSummary,
        pattern: params.lessonPattern,
        countermeasure: params.lessonCountermeasure,
        outcome: params.outcome,
      });

      return { metrics, lesson };
    });

    return transaction();
  }

  getDeliveryMetrics(runId: string): DeliveryMetrics | null {
    const row = this.db.prepare('SELECT * FROM delivery_metrics WHERE run_id = ?').get(runId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToDeliveryMetrics(row);
  }

  listDeliveryMetrics(projectId: string, limit = 50): DeliveryMetrics[] {
    const rows = this.db.prepare(`
      SELECT * FROM delivery_metrics WHERE project_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(projectId, limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToDeliveryMetrics(row));
  }

  getLatestDeliveryMetrics(projectId: string): DeliveryMetrics | null {
    const row = this.db.prepare(`
      SELECT * FROM delivery_metrics WHERE project_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(projectId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToDeliveryMetrics(row);
  }

  private rowToDeliveryMetrics(row: Record<string, unknown>): DeliveryMetrics {
    return {
      id: row.id as string,
      runId: row.run_id as string,
      projectId: row.project_id as string,
      buildTimeMs: row.build_time_ms as number | null,
      iterationCount: row.iteration_count as number,
      validationPassRate: row.validation_pass_rate as number | null,
      operatorInterventionCount: row.operator_intervention_count as number,
      outcome: row.outcome as DeliveryOutcome,
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lessons Learned Operations (Phase 17)
  // ─────────────────────────────────────────────────────────────────────────────

  createLessonsLearned(params: {
    projectId: string;
    runId: string;
    summary: string;
    pattern: string | null;
    countermeasure: string | null;
    outcome: DeliveryOutcome;
  }): LessonsLearned {
    const id = `lesson-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO lessons_learned (id, project_id, run_id, summary, pattern, countermeasure, outcome, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.projectId,
      params.runId,
      params.summary,
      params.pattern,
      params.countermeasure,
      params.outcome,
      now
    );
    return {
      id,
      projectId: params.projectId,
      runId: params.runId,
      summary: params.summary,
      pattern: params.pattern,
      countermeasure: params.countermeasure,
      outcome: params.outcome,
      createdAt: now,
    };
  }

  listLessonsLearned(projectId: string, limit = 50): LessonsLearned[] {
    const rows = this.db.prepare(`
      SELECT * FROM lessons_learned WHERE project_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(projectId, limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToLessonsLearned(row));
  }

  listGlobalLessonsLearned(limit = 100): LessonsLearned[] {
    const rows = this.db.prepare(`
      SELECT * FROM lessons_learned ORDER BY created_at DESC LIMIT ?
    `).all(limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToLessonsLearned(row));
  }

  getLessonsLearnedByRun(runId: string): LessonsLearned[] {
    const rows = this.db.prepare(`
      SELECT * FROM lessons_learned WHERE run_id = ? ORDER BY created_at DESC
    `).all(runId) as Record<string, unknown>[];
    return rows.map(row => this.rowToLessonsLearned(row));
  }

  private rowToLessonsLearned(row: Record<string, unknown>): LessonsLearned {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      runId: row.run_id as string,
      summary: row.summary as string,
      pattern: row.pattern as string | null,
      countermeasure: row.countermeasure as string | null,
      outcome: row.outcome as DeliveryOutcome,
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompt Countermeasure Operations (Phase 17)
  // ─────────────────────────────────────────────────────────────────────────────

  createPromptCountermeasure(params: {
    projectId: string;
    pattern: string;
    countermeasure: string;
    threshold?: number;
    removalThreshold?: number;
    autoInject?: boolean;
  }): PromptCountermeasure {
    const id = `countermeasure-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO prompt_countermeasures (id, project_id, pattern, countermeasure, threshold, removal_threshold, consecutive_successes, auto_inject, active, injected_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, NULL, ?, ?)
    `).run(
      id,
      params.projectId,
      params.pattern,
      params.countermeasure,
      params.threshold ?? 3,
      params.removalThreshold ?? 5,
      (params.autoInject ?? true) ? 1 : 0,
      now,
      now
    );
    return {
      id,
      projectId: params.projectId,
      pattern: params.pattern,
      countermeasure: params.countermeasure,
      threshold: params.threshold ?? 3,
      removalThreshold: params.removalThreshold ?? 5,
      consecutiveSuccesses: 0,
      autoInject: params.autoInject ?? true,
      active: false,
      injectedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  getPromptCountermeasure(projectId: string, pattern: string): PromptCountermeasure | null {
    const row = this.db.prepare(`
      SELECT * FROM prompt_countermeasures WHERE project_id = ? AND pattern = ?
    `).get(projectId, pattern) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToPromptCountermeasure(row);
  }

  listPromptCountermeasures(projectId: string, activeOnly = false, limit = 0): PromptCountermeasure[] {
    const query = activeOnly
      ? 'SELECT * FROM prompt_countermeasures WHERE project_id = ? AND active = 1 ORDER BY created_at DESC'
      : 'SELECT * FROM prompt_countermeasures WHERE project_id = ? ORDER BY created_at DESC';
    const finalQuery = limit > 0 ? `${query} LIMIT ${limit}` : query;
    const rows = limit > 0
      ? this.db.prepare(finalQuery).all(projectId, limit) as Record<string, unknown>[]
      : this.db.prepare(query).all(projectId) as Record<string, unknown>[];
    return rows.map(row => this.rowToPromptCountermeasure(row));
  }

  listActivePromptCountermeasures(projectId: string): PromptCountermeasure[] {
    return this.listPromptCountermeasures(projectId, true);
  }

  updatePromptCountermeasure(id: string, updates: Partial<{
    consecutiveSuccesses: number;
    active: boolean;
    autoInject: boolean;
    injectedAt: number | null;
  }>): PromptCountermeasure | null {
    const existing = this.getPromptCountermeasureById(id);
    if (!existing) return null;

    const now = Date.now();
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.consecutiveSuccesses !== undefined) {
      setClauses.push('consecutive_successes = ?');
      values.push(updates.consecutiveSuccesses);
    }
    if (updates.active !== undefined) {
      setClauses.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }
    if (updates.autoInject !== undefined) {
      setClauses.push('auto_inject = ?');
      values.push(updates.autoInject ? 1 : 0);
    }
    if (updates.injectedAt !== undefined) {
      setClauses.push('injected_at = ?');
      values.push(updates.injectedAt);
    }

    values.push(id);
    this.db.prepare(`UPDATE prompt_countermeasures SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    return this.getPromptCountermeasureById(id);
  }

  getPromptCountermeasureById(id: string): PromptCountermeasure | null {
    const row = this.db.prepare('SELECT * FROM prompt_countermeasures WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToPromptCountermeasure(row);
  }

  private rowToPromptCountermeasure(row: Record<string, unknown>): PromptCountermeasure {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      pattern: row.pattern as string,
      countermeasure: row.countermeasure as string,
      threshold: row.threshold as number,
      removalThreshold: row.removal_threshold as number,
      consecutiveSuccesses: row.consecutive_successes as number,
      autoInject: (row.auto_inject as number) === 1,
      active: (row.active as number) === 1,
      injectedAt: row.injected_at as number | null,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // App Metadata Operations (Phase 18)
  // ─────────────────────────────────────────────────────────────────────────────

  createApp(params: {
    name: string;
    brief: string;
    platformTargets: PlatformTarget[];
    platformCategories: PlatformCategory[];
    deliveryFormat: string;
    successCriteria: string[];
    stackPreferences: string[];
    forbiddenPatterns: string[];
    maxBuildTime: number;
    supportedBrowsers: string[];
    workspaceId?: string | null;
  }): AppMetadata {
    const id = `app-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO apps (id, name, brief, platform_targets, platform_categories, delivery_format, success_criteria, stack_preferences, forbidden_patterns, max_build_time, supported_browsers, workspace_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.name,
      params.brief,
      JSON.stringify(params.platformTargets),
      JSON.stringify(params.platformCategories),
      params.deliveryFormat,
      JSON.stringify(params.successCriteria),
      JSON.stringify(params.stackPreferences),
      JSON.stringify(params.forbiddenPatterns),
      params.maxBuildTime,
      JSON.stringify(params.supportedBrowsers),
      params.workspaceId ?? null,
      now,
      now
    );
    return {
      id,
      name: params.name,
      brief: params.brief,
      platformTargets: params.platformTargets,
      platformCategories: params.platformCategories,
      deliveryFormat: params.deliveryFormat,
      successCriteria: params.successCriteria,
      stackPreferences: params.stackPreferences,
      forbiddenPatterns: params.forbiddenPatterns,
      maxBuildTime: params.maxBuildTime,
      supportedBrowsers: params.supportedBrowsers,
      workspaceId: params.workspaceId ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  getApp(id: string): AppMetadata | null {
    const row = this.db.prepare('SELECT * FROM apps WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToApp(row);
  }

  getAppByWorkspaceId(workspaceId: string): AppMetadata | null {
    const row = this.db.prepare('SELECT * FROM apps WHERE workspace_id = ?').get(workspaceId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToApp(row);
  }

  listApps(limit = 50): AppMetadata[] {
    const rows = this.db.prepare('SELECT * FROM apps ORDER BY created_at DESC LIMIT ?').all(limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToApp(row));
  }

  updateApp(id: string, updates: Partial<{
    name: string;
    brief: string;
    platformTargets: PlatformTarget[];
    platformCategories: PlatformCategory[];
    deliveryFormat: string;
    successCriteria: string[];
    stackPreferences: string[];
    forbiddenPatterns: string[];
    maxBuildTime: number;
    supportedBrowsers: string[];
  }>): AppMetadata | null {
    const existing = this.getApp(id);
    if (!existing) return null;

    const now = Date.now();
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }
    if (updates.brief !== undefined) {
      setClauses.push('brief = ?');
      values.push(updates.brief);
    }
    if (updates.platformTargets !== undefined) {
      setClauses.push('platform_targets = ?');
      values.push(JSON.stringify(updates.platformTargets));
    }
    if (updates.platformCategories !== undefined) {
      setClauses.push('platform_categories = ?');
      values.push(JSON.stringify(updates.platformCategories));
    }
    if (updates.deliveryFormat !== undefined) {
      setClauses.push('delivery_format = ?');
      values.push(updates.deliveryFormat);
    }
    if (updates.successCriteria !== undefined) {
      setClauses.push('success_criteria = ?');
      values.push(JSON.stringify(updates.successCriteria));
    }
    if (updates.stackPreferences !== undefined) {
      setClauses.push('stack_preferences = ?');
      values.push(JSON.stringify(updates.stackPreferences));
    }
    if (updates.forbiddenPatterns !== undefined) {
      setClauses.push('forbidden_patterns = ?');
      values.push(JSON.stringify(updates.forbiddenPatterns));
    }
    if (updates.maxBuildTime !== undefined) {
      setClauses.push('max_build_time = ?');
      values.push(updates.maxBuildTime);
    }
    if (updates.supportedBrowsers !== undefined) {
      setClauses.push('supported_browsers = ?');
      values.push(JSON.stringify(updates.supportedBrowsers));
    }

    values.push(id);
    this.db.prepare(`UPDATE apps SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    return this.getApp(id);
  }

  deleteApp(id: string): void {
    this.db.prepare('DELETE FROM apps WHERE id = ?').run(id);
  }

  private rowToApp(row: Record<string, unknown>): AppMetadata {
    return {
      id: row.id as string,
      name: row.name as string,
      brief: row.brief as string,
      platformTargets: JSON.parse(row.platform_targets as string || '[]'),
      platformCategories: JSON.parse(row.platform_categories as string || '[]'),
      deliveryFormat: row.delivery_format as string,
      successCriteria: JSON.parse(row.success_criteria as string || '[]'),
      stackPreferences: JSON.parse(row.stack_preferences as string || '[]'),
      forbiddenPatterns: JSON.parse(row.forbidden_patterns as string || '[]'),
      maxBuildTime: row.max_build_time as number,
      supportedBrowsers: JSON.parse(row.supported_browsers as string || '[]'),
      workspaceId: row.workspace_id as string | null,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // App Version Operations (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  createAppVersion(params: {
    appId: string;
    version: string;
    changelog?: string;
    channel?: ReleaseChannel;
    createdBy?: CreatedBy;
    runId?: string | null;
  }): AppVersion {
    const id = `version-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO app_versions (id, app_id, version, changelog, released_at, channel, created_by, run_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.appId,
      params.version,
      params.changelog ?? '',
      now,
      params.channel ?? 'internal',
      params.createdBy ?? 'operator',
      params.runId ?? null,
      now
    );
    return {
      id,
      appId: params.appId,
      version: params.version,
      changelog: params.changelog ?? '',
      releasedAt: now,
      channel: params.channel ?? 'internal',
      createdBy: params.createdBy ?? 'operator',
      runId: params.runId ?? null,
      createdAt: now,
    };
  }

  getAppVersion(id: string): AppVersion | null {
    const row = this.db.prepare('SELECT * FROM app_versions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToAppVersion(row);
  }

  getAppVersionByAppAndVersion(appId: string, version: string): AppVersion | null {
    const row = this.db.prepare('SELECT * FROM app_versions WHERE app_id = ? AND version = ?').get(appId, version) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToAppVersion(row);
  }

  listAppVersions(appId: string, limit = 50): AppVersion[] {
    const rows = this.db.prepare('SELECT * FROM app_versions WHERE app_id = ? ORDER BY released_at DESC LIMIT ?').all(appId, limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToAppVersion(row));
  }

  listAppVersionsByChannel(appId: string, channel: ReleaseChannel): AppVersion[] {
    const rows = this.db.prepare('SELECT * FROM app_versions WHERE app_id = ? AND channel = ? ORDER BY released_at DESC').all(appId, channel) as Record<string, unknown>[];
    return rows.map(row => this.rowToAppVersion(row));
  }

  promoteAppVersion(id: string, newChannel: ReleaseChannel): AppVersion | null {
    const existing = this.getAppVersion(id);
    if (!existing) return null;
    const now = Date.now();
    this.db.prepare('UPDATE app_versions SET channel = ? WHERE id = ?').run(newChannel, id);
    return { ...existing, channel: newChannel };
  }

  private rowToAppVersion(row: Record<string, unknown>): AppVersion {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      version: row.version as string,
      changelog: (row.changelog as string) || '',
      releasedAt: row.released_at as number,
      channel: row.channel as ReleaseChannel,
      createdBy: row.created_by as CreatedBy,
      runId: row.run_id as string | null,
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Monitoring Config Operations (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  createMonitoringConfig(appId: string): MonitoringConfig {
    const id = `monconfig-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO monitoring_config (id, app_id, enabled, check_interval_hours, check_build, check_lint, check_tests, check_vulnerabilities, auto_fix_trigger, alert_threshold, last_check_at, created_at, updated_at)
      VALUES (?, ?, 1, 6, 1, 1, 1, 1, 0, 1, NULL, ?, ?)
    `).run(id, appId, now, now);
    return {
      id,
      appId,
      enabled: true,
      checkIntervalHours: 6,
      checkBuild: true,
      checkLint: true,
      checkTests: true,
      checkVulnerabilities: true,
      autoFixTrigger: false,
      alertThreshold: 1,
      lastCheckAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  getMonitoringConfig(appId: string): MonitoringConfig | null {
    const row = this.db.prepare('SELECT * FROM monitoring_config WHERE app_id = ?').get(appId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToMonitoringConfig(row);
  }

  updateMonitoringConfig(appId: string, updates: Partial<{
    enabled: boolean;
    checkIntervalHours: number;
    checkBuild: boolean;
    checkLint: boolean;
    checkTests: boolean;
    checkVulnerabilities: boolean;
    autoFixTrigger: boolean;
    alertThreshold: number;
    lastCheckAt: number | null;
  }>): MonitoringConfig | null {
    const existing = this.getMonitoringConfig(appId);
    if (!existing) return null;
    const now = Date.now();
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.enabled !== undefined) {
      setClauses.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.checkIntervalHours !== undefined) {
      setClauses.push('check_interval_hours = ?');
      values.push(updates.checkIntervalHours);
    }
    if (updates.checkBuild !== undefined) {
      setClauses.push('check_build = ?');
      values.push(updates.checkBuild ? 1 : 0);
    }
    if (updates.checkLint !== undefined) {
      setClauses.push('check_lint = ?');
      values.push(updates.checkLint ? 1 : 0);
    }
    if (updates.checkTests !== undefined) {
      setClauses.push('check_tests = ?');
      values.push(updates.checkTests ? 1 : 0);
    }
    if (updates.checkVulnerabilities !== undefined) {
      setClauses.push('check_vulnerabilities = ?');
      values.push(updates.checkVulnerabilities ? 1 : 0);
    }
    if (updates.autoFixTrigger !== undefined) {
      setClauses.push('auto_fix_trigger = ?');
      values.push(updates.autoFixTrigger ? 1 : 0);
    }
    if (updates.alertThreshold !== undefined) {
      setClauses.push('alert_threshold = ?');
      values.push(updates.alertThreshold);
    }
    if (updates.lastCheckAt !== undefined) {
      setClauses.push('last_check_at = ?');
      values.push(updates.lastCheckAt);
    }

    values.push(appId);
    this.db.prepare(`UPDATE monitoring_config SET ${setClauses.join(', ')} WHERE app_id = ?`).run(...values);
    return this.getMonitoringConfig(appId);
  }

  private rowToMonitoringConfig(row: Record<string, unknown>): MonitoringConfig {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      enabled: (row.enabled as number) === 1,
      checkIntervalHours: row.check_interval_hours as number,
      checkBuild: (row.check_build as number) === 1,
      checkLint: (row.check_lint as number) === 1,
      checkTests: (row.check_tests as number) === 1,
      checkVulnerabilities: (row.check_vulnerabilities as number) === 1,
      autoFixTrigger: (row.auto_fix_trigger as number) === 1,
      alertThreshold: row.alert_threshold as number,
      lastCheckAt: row.last_check_at as number | null,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Monitoring Health Record Operations (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  createMonitoringHealthRecord(params: {
    appId: string;
    checkType: HealthCheckType;
    status: HealthStatus;
    message?: string | null;
    details?: string | null;
    regressed?: boolean;
  }): MonitoringHealthRecord {
    const id = `health-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO monitoring_health_records (id, app_id, check_type, status, message, details, regressed, checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.appId,
      params.checkType,
      params.status,
      params.message ?? null,
      params.details ?? null,
      params.regressed ? 1 : 0,
      now
    );
    return {
      id,
      appId: params.appId,
      checkType: params.checkType,
      status: params.status,
      message: params.message ?? null,
      details: params.details ?? null,
      regressed: params.regressed ?? false,
      checkedAt: now,
    };
  }

  listMonitoringHealthRecords(appId: string, limit = 100): MonitoringHealthRecord[] {
    const rows = this.db.prepare('SELECT * FROM monitoring_health_records WHERE app_id = ? ORDER BY checked_at DESC LIMIT ?').all(appId, limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToMonitoringHealthRecord(row));
  }

  getLatestHealthRecordByType(appId: string, checkType: HealthCheckType): MonitoringHealthRecord | null {
    const row = this.db.prepare('SELECT * FROM monitoring_health_records WHERE app_id = ? AND check_type = ? ORDER BY checked_at DESC LIMIT 1').get(appId, checkType) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToMonitoringHealthRecord(row);
  }

  listRegressedHealthRecords(appId: string): MonitoringHealthRecord[] {
    const rows = this.db.prepare('SELECT * FROM monitoring_health_records WHERE app_id = ? AND regressed = 1 ORDER BY checked_at DESC').all(appId) as Record<string, unknown>[];
    return rows.map(row => this.rowToMonitoringHealthRecord(row));
  }

  private rowToMonitoringHealthRecord(row: Record<string, unknown>): MonitoringHealthRecord {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      checkType: row.check_type as HealthCheckType,
      status: row.status as HealthStatus,
      message: row.message as string | null,
      details: row.details as string | null,
      regressed: (row.regressed as number) === 1,
      checkedAt: row.checked_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Maintenance Run Operations (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  createMaintenanceRun(params: {
    appId: string;
    runId?: string | null;
    triggerType: MaintenanceTriggerType;
    triggerReason: string;
    regressionIds?: string[];
  }): MaintenanceRun {
    const id = `maint-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO maintenance_run (id, app_id, run_id, trigger_type, trigger_reason, regression_ids, status, iteration_count, outcome, started_at, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, NULL, ?)
    `).run(
      id,
      params.appId,
      params.runId ?? null,
      params.triggerType,
      params.triggerReason,
      JSON.stringify(params.regressionIds ?? []),
      now
    );
    return {
      id,
      appId: params.appId,
      runId: params.runId ?? null,
      triggerType: params.triggerType,
      triggerReason: params.triggerReason,
      regressionIds: params.regressionIds ?? [],
      status: 'pending',
      iterationCount: 0,
      outcome: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
    };
  }

  getMaintenanceRun(id: string): MaintenanceRun | null {
    const row = this.db.prepare('SELECT * FROM maintenance_run WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToMaintenanceRun(row);
  }

  updateMaintenanceRun(id: string, updates: Partial<{
    runId: string | null;
    status: MaintenanceRun['status'];
    iterationCount: number;
    outcome: MaintenanceOutcome | null;
    startedAt: number | null;
    completedAt: number | null;
  }>): MaintenanceRun | null {
    const existing = this.getMaintenanceRun(id);
    if (!existing) return null;
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.iterationCount !== undefined) {
      setClauses.push('iteration_count = ?');
      values.push(updates.iterationCount);
    }
    if (updates.outcome !== undefined) {
      setClauses.push('outcome = ?');
      values.push(updates.outcome);
    }
    if (updates.startedAt !== undefined) {
      setClauses.push('started_at = ?');
      values.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt);
    }
    if (updates.runId !== undefined) {
      setClauses.push('run_id = ?');
      values.push(updates.runId);
    }

    if (setClauses.length === 0) return existing;

    values.push(id);
    this.db.prepare(`UPDATE maintenance_run SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    return this.getMaintenanceRun(id);
  }

  listMaintenanceRuns(appId: string, limit = 50): MaintenanceRun[] {
    const rows = this.db.prepare('SELECT * FROM maintenance_run WHERE app_id = ? ORDER BY created_at DESC LIMIT ?').all(appId, limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToMaintenanceRun(row));
  }

  listActiveMaintenanceRuns(): MaintenanceRun[] {
    const rows = this.db.prepare("SELECT * FROM maintenance_run WHERE status IN ('pending', 'running') ORDER BY created_at DESC").all() as Record<string, unknown>[];
    return rows.map(row => this.rowToMaintenanceRun(row));
  }

  private rowToMaintenanceRun(row: Record<string, unknown>): MaintenanceRun {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      runId: row.run_id as string | null,
      triggerType: row.trigger_type as MaintenanceTriggerType,
      triggerReason: row.trigger_reason as string,
      regressionIds: JSON.parse(row.regression_ids as string || '[]'),
      status: row.status as MaintenanceRun['status'],
      iterationCount: row.iteration_count as number,
      outcome: row.outcome as MaintenanceOutcome | null,
      startedAt: row.started_at as number | null,
      completedAt: row.completed_at as number | null,
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rollout Channel Operations (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  createRolloutChannel(params: {
    appId: string;
    channel: string;
    isDefault?: boolean;
    validationRequired?: boolean;
    autoPromote?: boolean;
    minBetaAdopters?: number;
  }): RolloutChannel {
    const id = `channel-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO rollout_channels (id, app_id, channel, is_default, validation_required, auto_promote, min_beta_adopters, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.appId,
      params.channel,
      (params.isDefault ?? false) ? 1 : 0,
      (params.validationRequired ?? true) ? 1 : 0,
      (params.autoPromote ?? false) ? 1 : 0,
      params.minBetaAdopters ?? 0,
      now,
      now
    );
    return {
      id,
      appId: params.appId,
      channel: params.channel,
      isDefault: params.isDefault ?? false,
      validationRequired: params.validationRequired ?? true,
      autoPromote: params.autoPromote ?? false,
      minBetaAdopters: params.minBetaAdopters ?? 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  getRolloutChannel(appId: string, channel: string): RolloutChannel | null {
    const row = this.db.prepare('SELECT * FROM rollout_channels WHERE app_id = ? AND channel = ?').get(appId, channel) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToRolloutChannel(row);
  }

  listRolloutChannels(appId: string): RolloutChannel[] {
    const rows = this.db.prepare('SELECT * FROM rollout_channels WHERE app_id = ? ORDER BY channel ASC').all(appId) as Record<string, unknown>[];
    return rows.map(row => this.rowToRolloutChannel(row));
  }

  updateRolloutChannel(id: string, updates: Partial<{
    isDefault: boolean;
    validationRequired: boolean;
    autoPromote: boolean;
    minBetaAdopters: number;
  }>): RolloutChannel | null {
    const now = Date.now();
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.isDefault !== undefined) {
      setClauses.push('is_default = ?');
      values.push(updates.isDefault ? 1 : 0);
    }
    if (updates.validationRequired !== undefined) {
      setClauses.push('validation_required = ?');
      values.push(updates.validationRequired ? 1 : 0);
    }
    if (updates.autoPromote !== undefined) {
      setClauses.push('auto_promote = ?');
      values.push(updates.autoPromote ? 1 : 0);
    }
    if (updates.minBetaAdopters !== undefined) {
      setClauses.push('min_beta_adopters = ?');
      values.push(updates.minBetaAdopters);
    }

    values.push(id);
    this.db.prepare(`UPDATE rollout_channels SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    // Fetch and return updated row
    const row = this.db.prepare('SELECT * FROM rollout_channels WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToRolloutChannel(row);
  }

  private rowToRolloutChannel(row: Record<string, unknown>): RolloutChannel {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      channel: row.channel as string,
      isDefault: (row.is_default as number) === 1,
      validationRequired: (row.validation_required as number) === 1,
      autoPromote: (row.auto_promote as number) === 1,
      minBetaAdopters: row.min_beta_adopters as number,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Channel Release Operations (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  createChannelRelease(params: {
    appId: string;
    versionId: string;
    channel: string;
    status?: ChannelReleaseStatus;
    promotedBy?: string | null;
    rollbackFromVersionId?: string | null;
  }): ChannelRelease {
    const id = `crelease-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO channel_releases (id, app_id, version_id, channel, status, promoted_at, promoted_by, rollback_from_version_id, created_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
    `).run(
      id,
      params.appId,
      params.versionId,
      params.channel,
      params.status ?? 'active',
      params.promotedBy ?? null,
      params.rollbackFromVersionId ?? null,
      now
    );
    return {
      id,
      appId: params.appId,
      versionId: params.versionId,
      channel: params.channel,
      status: params.status ?? 'active',
      promotedAt: null,
      promotedBy: params.promotedBy ?? null,
      rollbackFromVersionId: params.rollbackFromVersionId ?? null,
      createdAt: now,
    };
  }

  getChannelRelease(id: string): ChannelRelease | null {
    const row = this.db.prepare('SELECT * FROM channel_releases WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToChannelRelease(row);
  }

  getLatestChannelRelease(appId: string, channel: string): ChannelRelease | null {
    const row = this.db.prepare('SELECT * FROM channel_releases WHERE app_id = ? AND channel = ? AND status = \'active\' ORDER BY created_at DESC LIMIT 1').get(appId, channel) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToChannelRelease(row);
  }

  promoteChannelRelease(id: string, promotedBy: string): ChannelRelease | null {
    const now = Date.now();
    this.db.prepare("UPDATE channel_releases SET status = 'promoted', promoted_at = ?, promoted_by = ? WHERE id = ?").run(now, promotedBy, id);
    return this.getChannelRelease(id);
  }

  rollbackChannelRelease(id: string, rollbackVersionId: string): ChannelRelease | null {
    const existing = this.getChannelRelease(id);
    if (!existing) return null;
    const now = Date.now();
    this.db.prepare("UPDATE channel_releases SET status = 'rolled_back' WHERE id = ?").run(id);
    return this.getChannelRelease(id);
  }

  listChannelReleases(appId: string, channel?: string): ChannelRelease[] {
    const query = channel
      ? 'SELECT * FROM channel_releases WHERE app_id = ? AND channel = ? ORDER BY created_at DESC'
      : 'SELECT * FROM channel_releases WHERE app_id = ? ORDER BY created_at DESC';
    const rows = channel
      ? this.db.prepare(query).all(appId, channel) as Record<string, unknown>[]
      : this.db.prepare(query).all(appId) as Record<string, unknown>[];
    return rows.map(row => this.rowToChannelRelease(row));
  }

  private rowToChannelRelease(row: Record<string, unknown>): ChannelRelease {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      versionId: row.version_id as string,
      channel: row.channel as string,
      status: row.status as ChannelReleaseStatus,
      promotedAt: row.promoted_at as number | null,
      promotedBy: row.promoted_by as string | null,
      rollbackFromVersionId: row.rollback_from_version_id as string | null,
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Beta Tester Operations (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  createBetaTester(email: string, name?: string | null): BetaTester {
    const id = `tester-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO beta_testers (id, email, name, enabled, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(id, email, name ?? null, now, now);
    return {
      id,
      email,
      name: name ?? null,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  getBetaTester(id: string): BetaTester | null {
    const row = this.db.prepare('SELECT * FROM beta_testers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToBetaTester(row);
  }

  getBetaTesterByEmail(email: string): BetaTester | null {
    const row = this.db.prepare('SELECT * FROM beta_testers WHERE email = ?').get(email) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToBetaTester(row);
  }

  listBetaTesters(enabledOnly = false): BetaTester[] {
    const query = enabledOnly
      ? 'SELECT * FROM beta_testers WHERE enabled = 1 ORDER BY email ASC'
      : 'SELECT * FROM beta_testers ORDER BY email ASC';
    const rows = this.db.prepare(query).all() as Record<string, unknown>[];
    return rows.map(row => this.rowToBetaTester(row));
  }

  updateBetaTester(id: string, updates: Partial<{
    name: string | null;
    enabled: boolean;
  }>): BetaTester | null {
    const now = Date.now();
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }
    if (updates.enabled !== undefined) {
      setClauses.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }

    values.push(id);
    this.db.prepare(`UPDATE beta_testers SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const row = this.db.prepare('SELECT * FROM beta_testers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToBetaTester(row);
  }

  private rowToBetaTester(row: Record<string, unknown>): BetaTester {
    return {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string | null,
      enabled: (row.enabled as number) === 1,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Beta Tester Access Operations (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  createBetaTesterAccess(testerId: string, appId: string, channel = 'beta'): BetaTesterAccess {
    const id = `btaccess-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO beta_tester_access (id, tester_id, app_id, channel, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, testerId, appId, channel, now);
    return {
      id,
      testerId,
      appId,
      channel,
      createdAt: now,
    };
  }

  listBetaTesterAccess(testerId: string): BetaTesterAccess[] {
    const rows = this.db.prepare('SELECT * FROM beta_tester_access WHERE tester_id = ? ORDER BY created_at DESC').all(testerId) as Record<string, unknown>[];
    return rows.map(row => this.rowToBetaTesterAccess(row));
  }

  listBetaTestersForApp(appId: string): BetaTester[] {
    const rows = this.db.prepare(`
      SELECT bt.* FROM beta_testers bt
      INNER JOIN beta_tester_access bta ON bt.id = bta.tester_id
      WHERE bta.app_id = ? AND bt.enabled = 1
      ORDER BY bt.email ASC
    `).all(appId) as Record<string, unknown>[];
    return rows.map(row => this.rowToBetaTester(row));
  }

  removeBetaTesterAccess(id: string): void {
    this.db.prepare('DELETE FROM beta_tester_access WHERE id = ?').run(id);
  }

  private rowToBetaTesterAccess(row: Record<string, unknown>): BetaTesterAccess {
    return {
      id: row.id as string,
      testerId: row.tester_id as string,
      appId: row.app_id as string,
      channel: row.channel as string,
      createdAt: row.created_at as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rollout Metrics Operations (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  recordRolloutMetrics(params: {
    appId: string;
    versionId: string;
    channel: string;
    metricType: RolloutMetricType;
    metricValue: number;
  }): RolloutMetrics {
    const id = `rmetrics-${crypto.randomUUID()}`;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO rollout_metrics (id, app_id, version_id, channel, metric_type, metric_value, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, params.appId, params.versionId, params.channel, params.metricType, params.metricValue, now);
    return {
      id,
      appId: params.appId,
      versionId: params.versionId,
      channel: params.channel,
      metricType: params.metricType,
      metricValue: params.metricValue,
      recordedAt: now,
    };
  }

  listRolloutMetrics(appId: string, versionId?: string, channel?: string): RolloutMetrics[] {
    let query = 'SELECT * FROM rollout_metrics WHERE app_id = ?';
    const values: unknown[] = [appId];

    if (versionId) {
      query += ' AND version_id = ?';
      values.push(versionId);
    }
    if (channel) {
      query += ' AND channel = ?';
      values.push(channel);
    }

    query += ' ORDER BY recorded_at DESC';
    const rows = this.db.prepare(query).all(...values) as Record<string, unknown>[];
    return rows.map(row => this.rowToRolloutMetrics(row));
  }

  private rowToRolloutMetrics(row: Record<string, unknown>): RolloutMetrics {
    return {
      id: row.id as string,
      appId: row.app_id as string,
      versionId: row.version_id as string,
      channel: row.channel as string,
      metricType: row.metric_type as RolloutMetricType,
      metricValue: row.metric_value as number,
      recordedAt: row.recorded_at as number,
    };
  }

  close(): void {
    this.db.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton instance
// ─────────────────────────────────────────────────────────────────────────────

let dbInstance: SessionDatabase | null = null;

export function getDatabase(): SessionDatabase {
  if (!dbInstance) {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const dbPath = path.join(userDataPath, 'knuthflow.db');
    try {
      dbInstance = new SessionDatabase(dbPath);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to initialize database at ${dbPath}: ${err.message}`);
    }
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export { SessionDatabase };
