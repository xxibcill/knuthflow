import type {
  RalphProject,
  LoopRun,
  LoopSummary,
  PlanSnapshot,
  ValidationIssue,
  ReadinessReport,
  BootstrapResult,
  RalphControlFiles,
  LoopState,
} from './ralphTypes';
import type { ArtifactType } from '../components/ralph-console/RalphConsole.types';
export type { ArtifactType };

// ─────────────────────────────────────────────────────────────────────────────
// Process Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcessSpawnResult {
  pid: number;
}

export interface ProcessInfo {
  pid: number;
  status: string;
}

export interface ClaudeCodeStatus {
  installed: boolean;
  executablePath: string | null;
  version: string | null;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PTY Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PtyOptions {
  cwd?: string;
  cols?: number;
  rows?: number;
  env?: Record<string, string | undefined>;
  name?: string;
}

export interface PtySessionInfo {
  id: string;
  pid: number;
  createdAt: number;
}

export interface PtyDataEvent {
  sessionId: string;
  data: string;
}

export interface PtyExitEvent {
  sessionId: string;
  exitCode: number;
  signal?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude Types
// ─────────────────────────────────────────────────────────────────────────────

export type ClaudeRunState = 'idle' | 'starting' | 'running' | 'exited' | 'failed';

export interface ClaudeLaunchResult {
  success: boolean;
  runId?: string;
  sessionId?: string;
  executablePath?: string;
  version?: string | null;
  error?: string;
}

export interface ClaudeLaunchOptions {
  args?: string[];
  cwd?: string;
}

export interface ClaudeRunInfo {
  runId: string;
  sessionId: string;
  state: ClaudeRunState;
  exitCode?: number;
  signal?: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace & Session Types
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

export interface SessionCrashedEvent {
  sessionId: string;
  ptySessionId: string;
  exitCode: number | null;
  signal: number | null;
  error?: string;
  timestamp: number;
}

export interface RecoveryNeededEvent {
  type: 'restart' | 'cleanup' | 'notify' | 'none';
  sessionId: string;
  reason: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Types
// ─────────────────────────────────────────────────────────────────────────────

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// System & Update Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemDiagnostics {
  app: {
    version: string;
    platform: string;
    arch: string;
    electronVersion: string;
    nodeVersion: string;
    chromeVersion: string;
  };
  claude: {
    installed: boolean;
    path: string | null;
    version: string | null;
    error: string | null;
  };
  storage: {
    usingFallback: boolean;
    backend: string;
  };
  database: {
    workspaceCount: number;
    recentSessionCount: number;
  };
  logFiles: string[];
}

export interface IntegrityValidationResult {
  valid: boolean;
  cleaned: number;
  issues: string[];
}

export interface UpdateInfo {
  available: boolean;
  version: string | null;
  releaseDate: string | null;
  releaseNotes: string | null;
  downloadUrl: string | null;
  isMandatory: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AppSettings {
  cliPath: string | null;
  defaultArgs: string[];
  launchOnStartup: boolean;
  restoreLastWorkspace: boolean;
  defaultWorkspaceId: string | null;
  confirmBeforeExit: boolean;
  confirmBeforeKill: boolean;
  autoSaveSessions: boolean;
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'block' | 'underline' | 'bar';
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

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Types (re-exported from ralphTypes)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  LoopRunStatus,
  RalphProject,
  LoopRun,
  LoopSummary,
  PlanSnapshot,
  ValidationSeverity,
  ValidationIssue,
  ReadinessReport,
  BootstrapResult,
  RalphControlFiles,
} from './ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// KnuthflowAPI Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface KnuthflowAPI {
  process: {
    spawn(args: string[], cwd?: string): Promise<ProcessSpawnResult>;
    send(pid: number, input: string): Promise<void>;
    kill(pid: number): Promise<void>;
    list(): Promise<ProcessInfo[]>;
  };
  pty: {
    create(options?: PtyOptions): Promise<string>;
    write(sessionId: string, data: string): Promise<void>;
    resize(sessionId: string, cols: number, rows: number): Promise<void>;
    kill(sessionId: string, signal?: string): Promise<void>;
    list(): Promise<PtySessionInfo[]>;
    onData(callback: (data: PtyDataEvent) => void): () => void;
    onExit(callback: (exit: PtyExitEvent) => void): () => void;
  };
  storage: {
    get<T = unknown>(key: string): Promise<T>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };
  filesystem: {
    readFile(path: string, encoding?: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
  };
  dialog: {
    openFile(options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }): Promise<{ canceled: boolean; filePath: string | null }>;
    openDirectory(options?: { defaultPath?: string }): Promise<{ canceled: boolean; directoryPath: string | null }>;
    saveFile(options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }): Promise<{ canceled: boolean; filePath: string | null }>;
  };
  app: {
    getVersion(): Promise<string>;
  };
  claude: {
    detect(): Promise<ClaudeCodeStatus>;
    launch(options?: ClaudeLaunchOptions): Promise<ClaudeLaunchResult>;
    kill(runId: string): Promise<{ success: boolean; error?: string }>;
    getRunState(runId: string): Promise<{ state: ClaudeRunState; sessionId: string | null; exitCode?: number; signal?: number; error?: string }>;
    listRuns(): Promise<ClaudeRunInfo[]>;
    onRunStateChanged(callback: (data: { runId: string; state: ClaudeRunState; exitCode?: number; signal?: number; error?: string }) => void): () => void;
  };
  workspace: {
    create(name: string, path: string): Promise<{ success: boolean; workspace?: Workspace; error?: string }>;
    get(id: string): Promise<Workspace | null>;
    list(): Promise<Workspace[]>;
    listRecent(limit?: number): Promise<Workspace[]>;
    updateLastOpened(id: string): Promise<void>;
    delete(id: string): Promise<void>;
    validatePath(path: string): Promise<{ valid: boolean; error?: string }>;
  };
  session: {
    create(name: string, workspaceId: string | null, runId: string | null, ptySessionId: string | null): Promise<Session>;
    get(id: string): Promise<Session | null>;
    updateEnd(id: string, status: 'completed' | 'failed', exitCode: number | null, signal: number | null): Promise<void>;
    list(limit?: number): Promise<Session[]>;
    listRecent(workspaceId: string | null, limit?: number): Promise<Session[]>;
    listActive(): Promise<Session[]>;
  };
  supervisor: {
    validateIntegrity(): Promise<IntegrityValidationResult>;
    cleanupOrphans(): Promise<{ success: boolean }>;
    explainExit(exitCode: number | null, signal?: number): Promise<string>;
    onSessionCrashed(callback: (data: SessionCrashedEvent) => void): () => void;
    onRecoveryNeeded(callback: (data: RecoveryNeededEvent) => void): () => void;
    onOrphanCleaned(callback: (data: { sessionId: string }) => void): () => void;
  };
  update: {
    check(): Promise<UpdateInfo>;
    getVersion(): Promise<string>;
    openDownload(downloadUrl: string): Promise<{ success: boolean }>;
    formatNotes(notes: string | null): Promise<string | null>;
  };
  settings: {
    get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K] | null>;
    set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
    setAll(settings: Partial<AppSettings>): Promise<void>;
    getAll(): Promise<AppSettings>;
  };
  profile: {
    create(profile: Omit<LaunchProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<LaunchProfile>;
    get(id: string): Promise<LaunchProfile | null>;
    getDefault(): Promise<LaunchProfile | null>;
    list(): Promise<LaunchProfile[]>;
    update(id: string, updates: Partial<Omit<LaunchProfile, 'id' | 'createdAt'>>): Promise<LaunchProfile | null>;
    delete(id: string): Promise<boolean>;
  };
  secureStorage: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    isUsingFallback(): Promise<boolean>;
  };
  logs: {
    get(limit?: number, level?: string): Promise<LogEntry[]>;
    getByCategory(category: string, limit?: number): Promise<LogEntry[]>;
    export(format?: 'json' | 'text'): Promise<string>;
    getFilePaths(): Promise<string[]>;
    clear(): Promise<boolean>;
  };
  diagnostics: {
    getSystemInfo(): Promise<SystemDiagnostics>;
  };
  ralph: {
    bootstrap(workspaceId: string, workspacePath: string, force?: boolean): Promise<BootstrapResult>;
    getReadinessReport(workspaceId: string, workspacePath: string): Promise<ReadinessReport>;
    validateBeforeStart(workspaceId: string, workspacePath: string): Promise<{ valid: boolean; issues: ValidationIssue[] }>;
    validateBeforeResume(workspaceId: string, workspacePath: string): Promise<{ valid: boolean; issues: ValidationIssue[] }>;
    validateBeforeRepair(workspacePath: string): Promise<{ valid: boolean; issues: ValidationIssue[] }>;
    isRalphEnabled(workspacePath: string): Promise<boolean>;
    isFreshWorkspace(workspaceId: string, workspacePath: string): Promise<boolean>;
    readControlFiles(workspacePath: string): Promise<RalphControlFiles | null>;
    getProject(workspaceId: string): Promise<RalphProject | null>;
    getProjectRuns(projectId: string, limit?: number): Promise<LoopRun[]>;
    getActiveRuns(projectId: string): Promise<LoopRun[]>;
    createRun(projectId: string, name: string): Promise<LoopRun>;
    startRun(runId: string, sessionId: string, ptySessionId: string): Promise<void>;
    endRun(runId: string, status: 'completed' | 'failed' | 'cancelled', exitCode: number | null, signal: number | null, error: string | null): Promise<void>;
    incrementRunIteration(runId: string): Promise<void>;
    getRunSummaries(runId: string): Promise<LoopSummary[]>;
    addRunSummary(projectId: string, runId: string, iteration: number, prompt: string, response: string, selectedFiles: string[]): Promise<LoopSummary>;
    getRunSnapshots(runId: string): Promise<PlanSnapshot[]>;
    addRunSnapshot(projectId: string, runId: string, iteration: number, planContent: string): Promise<PlanSnapshot>;
    deleteProject(projectId: string): Promise<void>;
    // Extended APIs for Ralph Console
    listArtifacts(options: { runId: string }): Promise<Array<{
      id: string;
      projectId: string;
      runId: string;
      iteration: number;
      itemId: string | null;
      type: ArtifactType;
      content: string;
      exitCode: number | null;
      durationMs: number | null;
      severity: 'error' | 'warning' | 'info';
      createdAt: number;
      metadata: Record<string, unknown>;
    }>>;
    pauseRun(runId: string): Promise<void>;
    resumeRun(runId: string): Promise<void>;
    stopRun(runId: string): Promise<void>;
    replanRun(runId: string): Promise<void>;
    validateRun(runId: string): Promise<void>;
  };
  ralphRuntime?: {
    start(projectId: string, name: string, sessionId: string, ptySessionId: string): Promise<{ success: boolean; run?: LoopRun; error?: string }>;
    getState(runId: string): Promise<{ success: boolean; state?: LoopState }>;
  };
}
