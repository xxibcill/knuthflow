import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

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
// Ralph Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RalphProject {
  id: string;
  workspaceId: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export type LoopRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface LoopRun {
  id: string;
  projectId: string;
  name: string;
  status: LoopRunStatus;
  startTime: number | null;
  endTime: number | null;
  exitCode: number | null;
  signal: number | null;
  error: string | null;
  iterationCount: number;
  sessionId: string | null;
  ptySessionId: string | null;
  createdAt: number;
}

export interface LoopSummary {
  id: string;
  projectId: string;
  runId: string;
  iteration: number;
  prompt: string;
  response: string;
  selectedFiles: string[];
  createdAt: number;
}

export interface PlanSnapshot {
  id: string;
  projectId: string;
  runId: string;
  iteration: number;
  planContent: string;
  createdAt: number;
}

export interface RalphControlFiles {
  promptMd: string;
  agentMd: string;
  fixPlanMd: string;
  specsDir: string | null;
}

// Schema version for migrations
const SCHEMA_VERSION = 3;

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
    // Migrate from version 0 to 1
    if (fromVersion < 1) {
      this.migrateToV1();
    }

    // Migrate from version 1 to 2 (add settings and profiles)
    if (fromVersion < 2) {
      this.migrateToV2();
    }

    // Migrate from version 2 to 3 (add Ralph tables)
    if (fromVersion < 3) {
      this.migrateToV3();
    }

    // Update schema version
    this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
  }

  private migrateToV1(): void {
    // Create workspaces table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        last_opened_at INTEGER
      )
    `);

    // Create sessions table
    this.db.exec(`
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
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_workspace_id ON sessions(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_workspaces_last_opened ON workspaces(last_opened_at);
    `);
  }

  private migrateToV2(): void {
    // Create settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create launch_profiles table
    this.db.exec(`
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
    const insertSetting = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, JSON.stringify(value));
    }
  }

  private migrateToV3(): void {
    // Create ralph_projects table
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_loop_runs_project_id ON loop_runs(project_id);
      CREATE INDEX IF NOT EXISTS idx_loop_runs_status ON loop_runs(status);
      CREATE INDEX IF NOT EXISTS idx_loop_summaries_project_id ON loop_summaries(project_id);
      CREATE INDEX IF NOT EXISTS idx_loop_summaries_run_id ON loop_summaries(run_id);
      CREATE INDEX IF NOT EXISTS idx_plan_snapshots_project_id ON plan_snapshots(project_id);
      CREATE INDEX IF NOT EXISTS idx_plan_snapshots_run_id ON plan_snapshots(run_id);
    `);
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
    const id = `ralph-${crypto.randomUUID()}`;
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO ralph_projects (id, workspace_id, version, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?)
    `);
    stmt.run(id, workspaceId, now, now);
    return { id, workspaceId, version: 1, createdAt: now, updatedAt: now };
  }

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
    // Delete related data first
    this.db.prepare('DELETE FROM loop_summaries WHERE project_id = ?').run(id);
    this.db.prepare('DELETE FROM plan_snapshots WHERE project_id = ?').run(id);
    this.db.prepare('DELETE FROM loop_runs WHERE project_id = ?').run(id);
    this.db.prepare('DELETE FROM ralph_projects WHERE id = ?').run(id);
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