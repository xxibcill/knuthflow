import { contextBridge, ipcRenderer } from 'electron';

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
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

export type ClaudeRunState = 'idle' | 'starting' | 'running' | 'exited' | 'failed';

export interface ClaudeLaunchResult {
  success: boolean;
  runId?: string;
  sessionId?: string;
  executablePath?: string;
  version?: string | null;
  error?: string;
}

export interface ClaudeRunInfo {
  runId: string;
  sessionId: string;
  state: ClaudeRunState;
  exitCode?: number;
  signal?: number;
  error?: string;
}

export interface Workspace {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  lastOpenedAt: number | null;
}

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
  app: {
    getVersion(): Promise<string>;
  };
  claude: {
    detect(): Promise<ClaudeCodeStatus>;
    launch(args?: string[]): Promise<ClaudeLaunchResult>;
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
};

// ─────────────────────────────────────────────────────────────────────────────
// Preload API - Secure IPC bridge
// ─────────────────────────────────────────────────────────────────────────────

const api: KnuthflowAPI = {
  process: {
    spawn: (args: string[], cwd?: string) =>
      ipcRenderer.invoke('process:spawn', args, cwd),
    send: (pid: number, input: string) =>
      ipcRenderer.invoke('process:send', pid, input),
    kill: (pid: number) =>
      ipcRenderer.invoke('process:kill', pid),
    list: () =>
      ipcRenderer.invoke('process:list'),
  },
  pty: {
    create: (options?: PtyOptions) =>
      ipcRenderer.invoke('pty:create', options),
    write: (sessionId: string, data: string) =>
      ipcRenderer.invoke('pty:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('pty:resize', sessionId, cols, rows),
    kill: (sessionId: string, signal?: string) =>
      ipcRenderer.invoke('pty:kill', sessionId, signal),
    list: () =>
      ipcRenderer.invoke('pty:list'),
    onData: (callback: (data: PtyDataEvent) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: PtyDataEvent) => callback(data);
      ipcRenderer.on('pty:data', handler);
      return () => ipcRenderer.removeListener('pty:data', handler);
    },
    onExit: (callback: (exit: PtyExitEvent) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, exit: PtyExitEvent) => callback(exit);
      ipcRenderer.on('pty:exit', handler);
      return () => ipcRenderer.removeListener('pty:exit', handler);
    },
  },
  storage: {
    get: <T = unknown>(key: string) =>
      ipcRenderer.invoke('storage:get', key) as Promise<T>,
    set: <T = unknown>(key: string, value: T) =>
      ipcRenderer.invoke('storage:set', key, value),
    delete: (key: string) =>
      ipcRenderer.invoke('storage:delete', key),
  },
  filesystem: {
    readFile: (path: string, encoding?: string) =>
      ipcRenderer.invoke('filesystem:readFile', path, encoding),
    writeFile: (path: string, content: string) =>
      ipcRenderer.invoke('filesystem:writeFile', path, content),
    exists: (path: string) =>
      ipcRenderer.invoke('filesystem:exists', path),
  },
  app: {
    getVersion: () =>
      ipcRenderer.invoke('app:getVersion'),
  },
  claude: {
    detect: () =>
      ipcRenderer.invoke('claude:detect'),
    launch: (args?: string[]) =>
      ipcRenderer.invoke('claude:launch', args),
    kill: (runId: string) =>
      ipcRenderer.invoke('claude:kill', runId),
    getRunState: (runId: string) =>
      ipcRenderer.invoke('claude:getRunState', runId),
    listRuns: () =>
      ipcRenderer.invoke('claude:listRuns'),
    onRunStateChanged: (callback: (data: { runId: string; state: ClaudeRunState; exitCode?: number; signal?: number; error?: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { runId: string; state: ClaudeRunState; exitCode?: number; signal?: number; error?: string }) => callback(data);
      ipcRenderer.on('claude:runStateChanged', handler);
      return () => ipcRenderer.removeListener('claude:runStateChanged', handler);
    },
  },
  workspace: {
    create: (name: string, path: string) =>
      ipcRenderer.invoke('workspace:create', name, path),
    get: (id: string) =>
      ipcRenderer.invoke('workspace:get', id),
    list: () =>
      ipcRenderer.invoke('workspace:list'),
    listRecent: (limit?: number) =>
      ipcRenderer.invoke('workspace:listRecent', limit),
    updateLastOpened: (id: string) =>
      ipcRenderer.invoke('workspace:updateLastOpened', id),
    delete: (id: string) =>
      ipcRenderer.invoke('workspace:delete', id),
    validatePath: (path: string) =>
      ipcRenderer.invoke('workspace:validatePath', path),
  },
  session: {
    create: (name: string, workspaceId: string | null, runId: string | null, ptySessionId: string | null) =>
      ipcRenderer.invoke('session:create', name, workspaceId, runId, ptySessionId),
    get: (id: string) =>
      ipcRenderer.invoke('session:get', id),
    updateEnd: (id: string, status: 'completed' | 'failed', exitCode: number | null, signal: number | null) =>
      ipcRenderer.invoke('session:updateEnd', id, status, exitCode, signal),
    list: (limit?: number) =>
      ipcRenderer.invoke('session:list', limit),
    listRecent: (workspaceId: string | null, limit?: number) =>
      ipcRenderer.invoke('session:listRecent', workspaceId, limit),
    listActive: () =>
      ipcRenderer.invoke('session:listActive'),
  },
  supervisor: {
    validateIntegrity: () =>
      ipcRenderer.invoke('supervisor:validateIntegrity'),
    cleanupOrphans: () =>
      ipcRenderer.invoke('supervisor:cleanupOrphans'),
    explainExit: (exitCode: number | null, signal?: number) =>
      ipcRenderer.invoke('supervisor:explainExit', exitCode, signal),
    onSessionCrashed: (callback: (data: SessionCrashedEvent) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: SessionCrashedEvent) => callback(data);
      ipcRenderer.on('supervisor:sessionCrashed', handler);
      return () => ipcRenderer.removeListener('supervisor:sessionCrashed', handler);
    },
    onRecoveryNeeded: (callback: (data: RecoveryNeededEvent) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: RecoveryNeededEvent) => callback(data);
      ipcRenderer.on('supervisor:recoveryNeeded', handler);
      return () => ipcRenderer.removeListener('supervisor:recoveryNeeded', handler);
    },
    onOrphanCleaned: (callback: (data: { sessionId: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { sessionId: string }) => callback(data);
      ipcRenderer.on('supervisor:orphanCleaned', handler);
      return () => ipcRenderer.removeListener('supervisor:orphanCleaned', handler);
    },
  },
  update: {
    check: () =>
      ipcRenderer.invoke('update:check'),
    getVersion: () =>
      ipcRenderer.invoke('update:getVersion'),
    openDownload: (downloadUrl: string) =>
      ipcRenderer.invoke('update:openDownload', downloadUrl),
    formatNotes: (notes: string | null) =>
      ipcRenderer.invoke('update:formatNotes', notes),
  },
  settings: {
    get: <K extends keyof AppSettings>(key: K) =>
      ipcRenderer.invoke('settings:get', key) as Promise<AppSettings[K] | null>,
    set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
      ipcRenderer.invoke('settings:set', key, value),
    setAll: (settings: Partial<AppSettings>) =>
      ipcRenderer.invoke('settings:setAll', settings),
    getAll: () =>
      ipcRenderer.invoke('settings:getAll') as Promise<AppSettings>,
  },
  profile: {
    create: (profile: Omit<LaunchProfile, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke('profile:create', profile),
    get: (id: string) =>
      ipcRenderer.invoke('profile:get', id) as Promise<LaunchProfile | null>,
    getDefault: () =>
      ipcRenderer.invoke('profile:getDefault') as Promise<LaunchProfile | null>,
    list: () =>
      ipcRenderer.invoke('profile:list') as Promise<LaunchProfile[]>,
    update: (id: string, updates: Partial<Omit<LaunchProfile, 'id' | 'createdAt'>>) =>
      ipcRenderer.invoke('profile:update', id, updates) as Promise<LaunchProfile | null>,
    delete: (id: string) =>
      ipcRenderer.invoke('profile:delete', id) as Promise<boolean>,
  },
  secureStorage: {
    get: (key: string) =>
      ipcRenderer.invoke('secureStorage:get', key) as Promise<string | null>,
    set: (key: string, value: string) =>
      ipcRenderer.invoke('secureStorage:set', key, value) as Promise<boolean>,
    delete: (key: string) =>
      ipcRenderer.invoke('secureStorage:delete', key) as Promise<boolean>,
    isUsingFallback: () =>
      ipcRenderer.invoke('secureStorage:isUsingFallback') as Promise<boolean>,
  },
  logs: {
    get: (limit?: number, level?: string) =>
      ipcRenderer.invoke('logs:get', limit, level) as Promise<LogEntry[]>,
    getByCategory: (category: string, limit?: number) =>
      ipcRenderer.invoke('logs:getByCategory', category, limit) as Promise<LogEntry[]>,
    export: (format?: 'json' | 'text') =>
      ipcRenderer.invoke('logs:export', format) as Promise<string>,
    getFilePaths: () =>
      ipcRenderer.invoke('logs:getFilePaths') as Promise<string[]>,
    clear: () =>
      ipcRenderer.invoke('logs:clear') as Promise<boolean>,
  },
  diagnostics: {
    getSystemInfo: () =>
      ipcRenderer.invoke('diagnostics:getSystemInfo') as Promise<SystemDiagnostics>,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Context Bridge - Expose API to renderer
// ─────────────────────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('knuthflow', api);

// Extend Window interface for TypeScript
declare global {
  interface Window {
    knuthflow: KnuthflowAPI;
  }
}