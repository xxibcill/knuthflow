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

export interface KnuthflowAPI {
  process: {
    spawn(args: string[], cwd?: string): Promise<ProcessSpawnResult>;
    send(pid: number, input: string): Promise<void>;
    kill(pid: number): Promise<void>;
    list(): Promise<ProcessInfo[]>;
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