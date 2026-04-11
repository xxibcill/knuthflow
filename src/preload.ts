import { contextBridge, ipcRenderer } from 'electron';

// Re-export all types from shared module
export type {
  ProcessSpawnResult,
  ProcessInfo,
  ClaudeCodeStatus,
  PtyOptions,
  PtySessionInfo,
  PtyDataEvent,
  PtyExitEvent,
  ClaudeRunState,
  ClaudeLaunchResult,
  ClaudeRunInfo,
  Workspace,
  Session,
  SessionCrashedEvent,
  RecoveryNeededEvent,
  LogLevel,
  LogEntry,
  SystemDiagnostics,
  IntegrityValidationResult,
  UpdateInfo,
  AppSettings,
  LaunchProfile,
  KnuthflowAPI,
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
} from './shared/preloadTypes';

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
  dialog: {
    openFile: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
      ipcRenderer.invoke('dialog:openFile', options),
    openDirectory: (options?: { defaultPath?: string }) =>
      ipcRenderer.invoke('dialog:openDirectory', options),
    saveFile: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
      ipcRenderer.invoke('dialog:saveFile', options),
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
  ralph: {
    bootstrap: (workspaceId: string, workspacePath: string, force?: boolean) =>
      ipcRenderer.invoke('ralph:bootstrap', workspaceId, workspacePath, force),
    getReadinessReport: (workspaceId: string, workspacePath: string) =>
      ipcRenderer.invoke('ralph:getReadinessReport', workspaceId, workspacePath),
    validateBeforeStart: (workspaceId: string, workspacePath: string) =>
      ipcRenderer.invoke('ralph:validateBeforeStart', workspaceId, workspacePath),
    validateBeforeResume: (workspaceId: string, workspacePath: string) =>
      ipcRenderer.invoke('ralph:validateBeforeResume', workspaceId, workspacePath),
    validateBeforeRepair: (workspacePath: string) =>
      ipcRenderer.invoke('ralph:validateBeforeRepair', workspacePath),
    isRalphEnabled: (workspacePath: string) =>
      ipcRenderer.invoke('ralph:isRalphEnabled', workspacePath),
    isFreshWorkspace: (workspaceId: string, workspacePath: string) =>
      ipcRenderer.invoke('ralph:isFreshWorkspace', workspaceId, workspacePath),
    readControlFiles: (workspacePath: string) =>
      ipcRenderer.invoke('ralph:readControlFiles', workspacePath) as Promise<RalphControlFiles | null>,
    getProject: (workspaceId: string) =>
      ipcRenderer.invoke('ralph:getProject', workspaceId) as Promise<RalphProject | null>,
    getProjectRuns: (projectId: string, limit?: number) =>
      ipcRenderer.invoke('ralph:getProjectRuns', projectId, limit) as Promise<LoopRun[]>,
    getActiveRuns: (projectId: string) =>
      ipcRenderer.invoke('ralph:getActiveRuns', projectId) as Promise<LoopRun[]>,
    createRun: (projectId: string, name: string) =>
      ipcRenderer.invoke('ralph:createRun', projectId, name) as Promise<LoopRun>,
    startRun: (runId: string, sessionId: string, ptySessionId: string) =>
      ipcRenderer.invoke('ralph:startRun', runId, sessionId, ptySessionId),
    endRun: (runId: string, status: 'completed' | 'failed' | 'cancelled', exitCode: number | null, signal: number | null, error: string | null) =>
      ipcRenderer.invoke('ralph:endRun', runId, status, exitCode, signal, error),
    incrementRunIteration: (runId: string) =>
      ipcRenderer.invoke('ralph:incrementRunIteration', runId),
    getRunSummaries: (runId: string) =>
      ipcRenderer.invoke('ralph:getRunSummaries', runId) as Promise<LoopSummary[]>,
    addRunSummary: (projectId: string, runId: string, iteration: number, prompt: string, response: string, selectedFiles: string[]) =>
      ipcRenderer.invoke('ralph:addRunSummary', projectId, runId, iteration, prompt, response, selectedFiles) as Promise<LoopSummary>,
    getRunSnapshots: (runId: string) =>
      ipcRenderer.invoke('ralph:getRunSnapshots', runId) as Promise<PlanSnapshot[]>,
    addRunSnapshot: (projectId: string, runId: string, iteration: number, planContent: string) =>
      ipcRenderer.invoke('ralph:addRunSnapshot', projectId, runId, iteration, planContent) as Promise<PlanSnapshot>,
    deleteProject: (projectId: string) =>
      ipcRenderer.invoke('ralph:deleteProject', projectId),
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
