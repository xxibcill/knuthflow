import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

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

export interface DatabaseSchema {
  version: number;
}

// Schema version for migrations
const SCHEMA_VERSION = 1;

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
    const rows = this.db.prepare('SELECT * FROM workspaces ORDER BY last_opened_at DESC NULLS LAST, created_at DESC').all() as Record<string, unknown>[];
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

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: SessionDatabase | null = null;

export function getDatabase(): SessionDatabase {
  if (!dbInstance) {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const dbPath = path.join(userDataPath, 'knuthflow.db');
    dbInstance = new SessionDatabase(dbPath);
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
