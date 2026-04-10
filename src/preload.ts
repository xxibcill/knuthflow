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
}

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