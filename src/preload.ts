import { contextBridge, ipcRenderer } from 'electron';
import type {
  ProcessSpawnResult,
  ProcessInfo,
  ClaudeCodeStatus,
  PtyOptions,
  PtySessionInfo,
  PtyDataEvent,
  PtyExitEvent,
  ClaudeRunState,
  ClaudeLaunchOptions,
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
  RalphDesktopAPI,
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
  ArtifactType,
  AppIntakeDraft,
  AppBlueprint,
  Portfolio,
  PortfolioProject,
  LoopState,
  PolicyRule,
  PolicyOverride,
  PolicyAuditEntry,
  EffectivePolicy,
} from './shared/preloadTypes';
export type {
  ProcessSpawnResult,
  ProcessInfo,
  ClaudeCodeStatus,
  PtyOptions,
  PtySessionInfo,
  PtyDataEvent,
  PtyExitEvent,
  ClaudeRunState,
  ClaudeLaunchOptions,
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
  RalphDesktopAPI,
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
  ArtifactType,
  AppIntakeDraft,
  AppBlueprint,
  Portfolio,
  PortfolioProject,
  LoopState,
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
    launch: (options?: ClaudeLaunchOptions) =>
      ipcRenderer.invoke('claude:launch', options),
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
    bootstrap: (workspaceId: string, workspacePath: string, force?: boolean, platformTargets?: AppIntakeDraft['targetPlatform']) =>
      ipcRenderer.invoke('ralph:bootstrap', workspaceId, workspacePath, force, platformTargets),
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
    // Extended APIs for Ralph Console
    listArtifacts: (options: { runId: string }) =>
      ipcRenderer.invoke('ralph:listArtifacts', options) as Promise<Array<{
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
      }>>,
    pauseRun: (runId: string) =>
      ipcRenderer.invoke('ralphRuntime:pause', runId),
    resumeRun: (runId: string) =>
      ipcRenderer.invoke('ralphRuntime:resume', runId),
    stopRun: (runId: string) =>
      ipcRenderer.invoke('ralphRuntime:stop', runId, 'user_stopped', 'Stopped by operator', false),
    replanRun: (runId: string) =>
      ipcRenderer.invoke('ralph:replanRun', runId),
    validateRun: (runId: string) =>
      ipcRenderer.invoke('ralph:validateRun', runId),
  },
  ralphRuntime: {
    start: (projectId: string, name: string, sessionId: string, ptySessionId: string) =>
      ipcRenderer.invoke('ralphRuntime:start', projectId, name, sessionId, ptySessionId),
    getState: (runId: string) =>
      ipcRenderer.invoke('ralphRuntime:getState', runId),
  },
  appintake: {
    generateBlueprint: (intake: AppIntakeDraft) =>
      ipcRenderer.invoke('appintake:generateBlueprint', intake),
    writeBlueprintFiles: (workspacePath: string, blueprint: AppBlueprint) =>
      ipcRenderer.invoke('appintake:writeBlueprintFiles', workspacePath, blueprint),
    validateIntake: (intake: Pick<AppIntakeDraft,
      'appName' |
      'appBrief' |
      'targetPlatform' |
      'deliveryFormat' |
      'maxBuildTime'
    >) =>
      ipcRenderer.invoke('appintake:validateIntake', intake),
  },
  scaffolding: {
    getTemplates: () =>
      ipcRenderer.invoke('scaffolding:getTemplates'),
    scaffold: (workspacePath: string, templateType: string, appName: string) =>
      ipcRenderer.invoke('scaffolding:scaffold', workspacePath, templateType, appName),
    getMetadata: (workspacePath: string) =>
      ipcRenderer.invoke('scaffolding:getMetadata', workspacePath),
    isScaffolded: (workspacePath: string) =>
      ipcRenderer.invoke('scaffolding:isScaffolded', workspacePath),
    getBuildCommands: (workspacePath: string) =>
      ipcRenderer.invoke('scaffolding:getBuildCommands', workspacePath),
  },
  delivery: {
    getHandoffBundle: (workspacePath: string) =>
      ipcRenderer.invoke('delivery:getHandoffBundle', workspacePath),
    runPackaging: (workspacePath: string, deliveryFormat: string) =>
      ipcRenderer.invoke('delivery:runPackaging', workspacePath, deliveryFormat),
    confirmRelease: (workspacePath: string) =>
      ipcRenderer.invoke('delivery:confirmRelease', workspacePath),
  },
  milestoneValidation: {
    runPreviewValidation: (workspacePath: string, timeoutMs?: number) =>
      ipcRenderer.invoke('milestoneValidation:runPreviewValidation', workspacePath, timeoutMs),
    runBuildValidation: (workspacePath: string, timeoutMs?: number) =>
      ipcRenderer.invoke('milestoneValidation:runBuildValidation', workspacePath, timeoutMs),
    runTestValidation: (workspacePath: string, timeoutMs?: number) =>
      ipcRenderer.invoke('milestoneValidation:runTestValidation', workspacePath, timeoutMs),
    runLintValidation: (workspacePath: string, timeoutMs?: number) =>
      ipcRenderer.invoke('milestoneValidation:runLintValidation', workspacePath, timeoutMs),
    runMilestoneValidation: (projectId: string, runId: string, milestoneId: string, workspacePath: string, timeoutMs?: number) =>
      ipcRenderer.invoke('milestoneValidation:runMilestoneValidation', projectId, runId, milestoneId, workspacePath, timeoutMs),
    determineFeedback: (evidence: unknown) =>
      ipcRenderer.invoke('milestoneValidation:determineFeedback', evidence),
    canCompleteMilestone: (projectId: string, runId: string, milestoneId: string) =>
      ipcRenderer.invoke('milestoneValidation:canCompleteMilestone', projectId, runId, milestoneId),
    completeMilestone: (projectId: string, runId: string, milestoneId: string) =>
      ipcRenderer.invoke('milestoneValidation:completeMilestone', projectId, runId, milestoneId),
  },
  portfolio: {
    create: (name: string, description?: string) =>
      ipcRenderer.invoke('portfolio:create', name, description),
    get: (id: string) =>
      ipcRenderer.invoke('portfolio:get', id),
    list: () =>
      ipcRenderer.invoke('portfolio:list'),
    update: (id: string, updates: { name?: string; description?: string }) =>
      ipcRenderer.invoke('portfolio:update', id, updates),
    delete: (id: string) =>
      ipcRenderer.invoke('portfolio:delete', id),
    addProject: (portfolioId: string, projectId: string, priority?: number) =>
      ipcRenderer.invoke('portfolio:addProject', portfolioId, projectId, priority),
    getProject: (id: string) =>
      ipcRenderer.invoke('portfolio:getProject', id),
    listProjects: (portfolioId: string) =>
      ipcRenderer.invoke('portfolio:listProjects', portfolioId),
    updateProject: (id: string, updates: {
      priority?: number;
      status?: 'active' | 'paused' | 'completed' | 'archived';
      dependencyGraph?: Record<string, string[]>;
    }) =>
      ipcRenderer.invoke('portfolio:updateProject', id, updates),
    removeProject: (id: string) =>
      ipcRenderer.invoke('portfolio:removeProject', id),
    getProjectByProjectId: (portfolioId: string, projectId: string) =>
      ipcRenderer.invoke('portfolio:getProjectByProjectId', portfolioId, projectId),
    listPortfoliosByProject: (projectId: string) =>
      ipcRenderer.invoke('portfolio:listPortfoliosByProject', projectId),
  },
  portfolioRuntime: {
    start: (portfolioId: string, projectId: string, name: string, sessionId: string, ptySessionId: string) =>
      ipcRenderer.invoke('portfolioRuntime:start', portfolioId, projectId, name, sessionId, ptySessionId),
    getQueuedRuns: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:getQueuedRuns', portfolioId),
    getQueueLength: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:getQueueLength', portfolioId),
    cancelQueuedRun: (queuedRunId: string) =>
      ipcRenderer.invoke('portfolioRuntime:cancelQueuedRun', queuedRunId),
    getActiveRunCount: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:getActiveRunCount', portfolioId),
    getPortfolioActiveRuns: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:getPortfolioActiveRuns', portfolioId),
    updatePriority: (portfolioProjectId: string, newPriority: number) =>
      ipcRenderer.invoke('portfolioRuntime:updatePriority', portfolioProjectId, newPriority),
    setMaxConcurrentRuns: (max: number) =>
      ipcRenderer.invoke('portfolioRuntime:setMaxConcurrentRuns', max),
    getMaxConcurrentRuns: () =>
      ipcRenderer.invoke('portfolioRuntime:getMaxConcurrentRuns'),
    pauseAll: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:pauseAll', portfolioId),
    resumeAll: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:resumeAll', portfolioId),
    stopAll: (portfolioId: string, reason?: 'user_stopped' | 'error' | 'completed') =>
      ipcRenderer.invoke('portfolioRuntime:stopAll', portfolioId, reason),
    register: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:register', portfolioId),
    unregister: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:unregister', portfolioId),
    addProject: (portfolioId: string, projectId: string) =>
      ipcRenderer.invoke('portfolioRuntime:addProject', portfolioId, projectId),
    removeProject: (portfolioId: string, projectId: string) =>
      ipcRenderer.invoke('portfolioRuntime:removeProject', portfolioId, projectId),
    // Dependency Resolution (P16-T4)
    getDependencyGraph: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:getDependencyGraph', portfolioId),
    detectCycles: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:detectCycles', portfolioId),
    getBuildOrder: (portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:getBuildOrder', portfolioId),
    checkProjectCanStart: (projectId: string, portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:checkProjectCanStart', projectId, portfolioId),
    parseAndStoreDependencies: (portfolioProjectId: string, fixPlanContent: string) =>
      ipcRenderer.invoke('portfolioRuntime:parseAndStoreDependencies', portfolioProjectId, fixPlanContent),
    getAvailableArtifacts: (projectId: string, portfolioId: string) =>
      ipcRenderer.invoke('portfolioRuntime:getAvailableArtifacts', projectId, portfolioId),
    propagateArtifact: (projectId: string, artifactPath: string, artifactType: string) =>
      ipcRenderer.invoke('portfolioRuntime:propagateArtifact', projectId, artifactPath, artifactType),
    clearProjectArtifacts: (projectId: string) =>
      ipcRenderer.invoke('portfolioRuntime:clearProjectArtifacts', projectId),
  },
  monitoring: {
    createConfig: (appId: string) =>
      ipcRenderer.invoke('monitoring:create-config', appId),
    getConfig: (appId: string) =>
      ipcRenderer.invoke('monitoring:get-config', appId),
    updateConfig: (appId: string, updates: {
      enabled?: boolean;
      checkIntervalHours?: number;
      checkBuild?: boolean;
      checkLint?: boolean;
      checkTests?: boolean;
      checkVulnerabilities?: boolean;
      autoFixTrigger?: boolean;
      alertThreshold?: number;
    }) =>
      ipcRenderer.invoke('monitoring:update-config', appId, updates),
    forceCheck: (appId: string) =>
      ipcRenderer.invoke('monitoring:force-check', appId),
    getHealthStatus: (appId: string) =>
      ipcRenderer.invoke('monitoring:get-health-status', appId),
    listHealthRecords: (appId: string, limit?: number) =>
      ipcRenderer.invoke('monitoring:list-health-records', appId, limit),
    getRegressedRecords: (appId: string) =>
      ipcRenderer.invoke('monitoring:get-regressed-records', appId),
    triggerAutoFix: (appId: string) =>
      ipcRenderer.invoke('monitoring:trigger-auto-fix', appId),
  },
  maintenance: {
    create: (params: {
      appId: string;
      runId?: string | null;
      triggerType: 'scheduled' | 'regression' | 'manual';
      triggerReason: string;
      regressionIds?: string[];
    }) =>
      ipcRenderer.invoke('maintenance:create', params),
    get: (id: string) =>
      ipcRenderer.invoke('maintenance:get', id),
    update: (id: string, updates: {
      status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      iterationCount?: number;
      outcome?: 'success' | 'failure' | 'cancelled' | null;
      startedAt?: number | null;
      completedAt?: number | null;
    }) =>
      ipcRenderer.invoke('maintenance:update', id, updates),
    list: (appId: string, limit?: number) =>
      ipcRenderer.invoke('maintenance:list', appId, limit),
    listActive: () =>
      ipcRenderer.invoke('maintenance:list-active'),
  },
  appVersion: {
    create: (params: {
      appId: string;
      version: string;
      changelog?: string;
      channel?: 'internal' | 'beta' | 'stable';
      createdBy?: 'operator' | 'auto';
      runId?: string | null;
    }) =>
      ipcRenderer.invoke('app-version:create', params),
    get: (id: string) =>
      ipcRenderer.invoke('app-version:get', id),
    list: (appId: string, limit?: number) =>
      ipcRenderer.invoke('app-version:list', appId, limit),
    listByChannel: (appId: string, channel: 'internal' | 'beta' | 'stable') =>
      ipcRenderer.invoke('app-version:list-by-channel', appId, channel),
    promote: (id: string, newChannel: 'internal' | 'beta' | 'stable') =>
      ipcRenderer.invoke('app-version:promote', id, newChannel),
  },
  rollout: {
    createChannel: (params: {
      appId: string;
      channel: string;
      isDefault?: boolean;
      validationRequired?: boolean;
      autoPromote?: boolean;
      minBetaAdopters?: number;
    }) =>
      ipcRenderer.invoke('rollout:create-channel', params),
    getChannel: (appId: string, channel: string) =>
      ipcRenderer.invoke('rollout:get-channel', appId, channel),
    listChannels: (appId: string) =>
      ipcRenderer.invoke('rollout:list-channels', appId),
    updateChannel: (id: string, updates: {
      isDefault?: boolean;
      validationRequired?: boolean;
      autoPromote?: boolean;
      minBetaAdopters?: number;
    }) =>
      ipcRenderer.invoke('rollout:update-channel', id, updates),
    createRelease: (params: {
      appId: string;
      versionId: string;
      channel: string;
      status?: 'active' | 'promoted' | 'rolled_back' | 'archived';
      promotedBy?: string | null;
      rollbackFromVersionId?: string | null;
    }) =>
      ipcRenderer.invoke('rollout:create-release', params),
    getRelease: (id: string) =>
      ipcRenderer.invoke('rollout:get-release', id),
    getLatest: (appId: string, channel: string) =>
      ipcRenderer.invoke('rollout:get-latest', appId, channel),
    promoteRelease: (id: string, promotedBy: string) =>
      ipcRenderer.invoke('rollout:promote-release', id, promotedBy),
    rollbackRelease: (id: string, rollbackVersionId: string) =>
      ipcRenderer.invoke('rollout:rollback-release', id, rollbackVersionId),
    listReleases: (appId: string, channel?: string) =>
      ipcRenderer.invoke('rollout:list-releases', appId, channel),
    recordMetrics: (params: {
      appId: string;
      versionId: string;
      channel: string;
      metricType: 'installs' | 'crashes' | 'active_users' | 'crash_rate' | 'feedback_score';
      metricValue: number;
    }) =>
      ipcRenderer.invoke('rollout:record-metrics', params),
    listMetrics: (appId: string, versionId?: string, channel?: string) =>
      ipcRenderer.invoke('rollout:list-metrics', appId, versionId, channel),
  },
  beta: {
    createTester: (email: string, name?: string | null) =>
      ipcRenderer.invoke('beta:create-tester', email, name),
    getTester: (id: string) =>
      ipcRenderer.invoke('beta:get-tester', id),
    getTesterByEmail: (email: string) =>
      ipcRenderer.invoke('beta:get-tester-by-email', email),
    listTesters: (enabledOnly?: boolean) =>
      ipcRenderer.invoke('beta:list-testers', enabledOnly),
    updateTester: (id: string, updates: { name?: string | null; enabled?: boolean }) =>
      ipcRenderer.invoke('beta:update-tester', id, updates),
    grantAccess: (testerId: string, appId: string, channel?: string) =>
      ipcRenderer.invoke('beta:grant-access', testerId, appId, channel),
    listAccess: (testerId: string) =>
      ipcRenderer.invoke('beta:list-access', testerId),
    listTestersForApp: (appId: string) =>
      ipcRenderer.invoke('beta:list-testers-for-app', appId),
    revokeAccess: (id: string) =>
      ipcRenderer.invoke('beta:revoke-access', id),
  },
  blueprint: {
    // Blueprint CRUD
    create: (params: { name: string; description?: string | null; category?: string; isPublished?: boolean; parentBlueprintId?: string | null }) =>
      ipcRenderer.invoke('blueprint:create', params),
    get: (id: string) =>
      ipcRenderer.invoke('blueprint:get', id),
    getByName: (name: string) =>
      ipcRenderer.invoke('blueprint:getByName', name),
    list: (options?: { category?: string; isPublished?: boolean; limit?: number }) =>
      ipcRenderer.invoke('blueprint:list', options),
    listCategories: () =>
      ipcRenderer.invoke('blueprint:listCategories'),
    update: (id: string, updates: { name?: string; description?: string | null; category?: string; isPublished?: boolean }) =>
      ipcRenderer.invoke('blueprint:update', id, updates),
    delete: (id: string) =>
      ipcRenderer.invoke('blueprint:delete', id),
    incrementUsage: (id: string) =>
      ipcRenderer.invoke('blueprint:incrementUsage', id),
    getUsageStats: (blueprintId: string, limit?: number) =>
      ipcRenderer.invoke('blueprint:getUsageStats', blueprintId, limit),
    calculateSuccessRate: (blueprintId: string) =>
      ipcRenderer.invoke('blueprint:calculateSuccessRate', blueprintId),
    recordUsage: (params: { blueprintId: string; versionId?: string | null; appId?: string | null; outcome: 'success' | 'failure' | 'cancelled'; buildTimeMs?: number | null; iterationCount?: number }) =>
      ipcRenderer.invoke('blueprint:recordUsage', params),

    // Blueprint Version
    createVersion: (params: { blueprintId: string; version: string; specContent?: Record<string, unknown>; starterTemplate?: string | null; acceptanceGates?: string[]; learnedRules?: string[] }) =>
      ipcRenderer.invoke('blueprint:createVersion', params),
    getVersion: (id: string) =>
      ipcRenderer.invoke('blueprint:getVersion', id),
    getVersionByVersion: (blueprintId: string, version: string) =>
      ipcRenderer.invoke('blueprint:getVersionByVersion', blueprintId, version),
    getLatestVersion: (blueprintId: string) =>
      ipcRenderer.invoke('blueprint:getLatestVersion', blueprintId),
    listVersions: (blueprintId: string) =>
      ipcRenderer.invoke('blueprint:listVersions', blueprintId),
    listAllVersions: () =>
      ipcRenderer.invoke('blueprint:listAllVersions'),
    updateVersion: (id: string, updates: { specContent?: Record<string, unknown>; starterTemplate?: string | null; acceptanceGates?: string[]; learnedRules?: string[] }) =>
      ipcRenderer.invoke('blueprint:updateVersion', id, updates),
    deleteVersion: (id: string) =>
      ipcRenderer.invoke('blueprint:deleteVersion', id),
    incrementVersionUsage: (id: string) =>
      ipcRenderer.invoke('blueprint:incrementVersionUsage', id),

    // Import/Export
    validateSpec: (spec: unknown) =>
      ipcRenderer.invoke('blueprint:validateSpec', spec),
    import: (params: { spec: Record<string, unknown>; isPublished?: boolean; parentBlueprintId?: string | null }) =>
      ipcRenderer.invoke('blueprint:import', params),
    export: (blueprintId: string, versionId?: string) =>
      ipcRenderer.invoke('blueprint:export', blueprintId, versionId),
    importAs: (params: { spec: Record<string, unknown>; isPublished?: boolean; parentBlueprintId?: string | null }, newName: string) =>
      ipcRenderer.invoke('blueprint:importAs', params, newName),
    createNewVersion: (blueprintId: string, newVersion: string, specContent?: Record<string, unknown>) =>
      ipcRenderer.invoke('blueprint:createNewVersion', blueprintId, newVersion, specContent),
    compareVersions: (versionId1: string, versionId2: string) =>
      ipcRenderer.invoke('blueprint:compareVersions', versionId1, versionId2),
    getInheritanceChain: (blueprintId: string) =>
      ipcRenderer.invoke('blueprint:getInheritanceChain', blueprintId),
    extend: (
      parentBlueprintId: string,
      name: string,
      description: string | null,
      overrides: {
        specContent?: Record<string, unknown>;
        starterTemplate?: string | null;
        acceptanceGates?: string[];
        learnedRules?: string[];
      }
    ) =>
      ipcRenderer.invoke('blueprint:extend', parentBlueprintId, name, description, overrides),
  },
  health: {
    createEvent: (params: {
      eventType: string;
      appId?: string;
      workspaceId?: string;
      runId?: string;
      status: string;
      message?: string;
      details?: string;
      triggeredAt: number;
    }) =>
      ipcRenderer.invoke('health:createEvent', params),
    listEvents: (limit?: number) =>
      ipcRenderer.invoke('health:listEvents', limit) as Promise<Array<{
        id: string;
        eventType: string;
        appId: string | null;
        workspaceId: string | null;
        runId: string | null;
        status: string;
        message: string | null;
        details: string | null;
        triggeredAt: number;
        createdAt: number;
      }>>,
  },
  feedback: {
    create: (params: {
      appId?: string;
      runId?: string;
      type: string;
      content: string;
      rating?: number;
      source?: string;
      linkedBacklogId?: string;
    }) =>
      ipcRenderer.invoke('feedback:create', params),
    list: (limit?: number) =>
      ipcRenderer.invoke('feedback:list', limit) as Promise<Array<{
        id: string;
        appId: string | null;
        runId: string | null;
        type: string;
        content: string;
        rating: number | null;
        source: string | null;
        linkedBacklogId: string | null;
        createdAt: number;
      }>>,
    getByRunId: (runId: string) =>
      ipcRenderer.invoke('feedback:getByRunId', runId) as Promise<Array<{
        id: string;
        appId: string | null;
        runId: string | null;
        type: string;
        content: string;
        rating: number | null;
        source: string | null;
        linkedBacklogId: string | null;
        createdAt: number;
      }>>,
    linkToBacklog: (feedbackId: string, backlogId: string) =>
      ipcRenderer.invoke('feedback:linkToBacklog', feedbackId, backlogId),
  },
  deliveredApps: {
    create: (params: {
      appId: string;
      workspacePath: string;
      deliveryFormat: string;
      bundlePath?: string;
      runId?: string;
      metadata?: Record<string, unknown>;
    }) =>
      ipcRenderer.invoke('deliveredApps:create', params),
    get: (id: string) =>
      ipcRenderer.invoke('deliveredApps:get', id) as Promise<{
        id: string;
        appId: string;
        workspacePath: string;
        deliveryFormat: string;
        healthStatus: string;
        bundlePath: string | null;
        runId: string | null;
        metadata: Record<string, unknown>;
        deliveredAt: number;
        lastSeenAt: number | null;
        followUpSignal: string | null;
        followUpNotes: string | null;
        createdAt: number;
        updatedAt: number;
      } | null>,
    getByAppId: (appId: string) =>
      ipcRenderer.invoke('deliveredApps:getByAppId', appId) as Promise<{
        id: string;
        appId: string;
        workspacePath: string;
        deliveryFormat: string;
        healthStatus: string;
        bundlePath: string | null;
        runId: string | null;
        metadata: Record<string, unknown>;
        deliveredAt: number;
        lastSeenAt: number | null;
        followUpSignal: string | null;
        followUpNotes: string | null;
        createdAt: number;
        updatedAt: number;
      } | null>,
    list: (limit?: number) =>
      ipcRenderer.invoke('deliveredApps:list', limit) as Promise<Array<{
        id: string;
        appId: string;
        workspacePath: string;
        deliveryFormat: string;
        healthStatus: string;
        bundlePath: string | null;
        runId: string | null;
        metadata: Record<string, unknown>;
        deliveredAt: number;
        lastSeenAt: number | null;
        followUpSignal: string | null;
        followUpNotes: string | null;
        createdAt: number;
        updatedAt: number;
      }>>,
    updateHealth: (id: string, healthStatus: string) =>
      ipcRenderer.invoke('deliveredApps:updateHealth', id, healthStatus),
    updateFollowUp: (id: string, followUpSignal: string, followUpNotes?: string) =>
      ipcRenderer.invoke('deliveredApps:updateFollowUp', id, followUpSignal, followUpNotes),
    updateLastSeen: (id: string) =>
      ipcRenderer.invoke('deliveredApps:updateLastSeen', id),
  },
  iterationBacklog: {
    create: (params: {
      title: string;
      description: string;
      source: string;
      priority?: 'high' | 'medium' | 'low';
      linkedFeedbackId?: string;
    }) =>
      ipcRenderer.invoke('iterationBacklog:create', params),
    get: (id: string) =>
      ipcRenderer.invoke('iterationBacklog:get', id) as Promise<{
        id: string;
        title: string;
        description: string;
        source: string;
        priority: string;
        status: string;
        createdAt: number;
        updatedAt: number;
        startedAt: number | null;
        completedAt: number | null;
        linkedFeedbackId: string | null;
      } | null>,
    list: (options?: { status?: string; priority?: string; limit?: number }) =>
      ipcRenderer.invoke('iterationBacklog:list', options) as Promise<Array<{
        id: string;
        title: string;
        description: string;
        source: string;
        priority: string;
        status: string;
        createdAt: number;
        updatedAt: number;
        startedAt: number | null;
        completedAt: number | null;
        linkedFeedbackId: string | null;
      }>>,
    update: (id: string, updates: { status?: string; priority?: string }) =>
      ipcRenderer.invoke('iterationBacklog:update', id, updates),
  },
  runPatterns: {
    create: (params: {
      projectId: string;
      runId?: string;
      goalType?: string;
      blueprintId?: string;
      blueprintVersion?: string;
      milestoneCount?: number;
      validationResult?: string;
      deliveryStatus?: string;
      patternTags?: string[];
    }) =>
      ipcRenderer.invoke('runPatterns:create', params),
    list: (projectId: string, limit?: number) =>
      ipcRenderer.invoke('runPatterns:list', projectId, limit) as Promise<Array<{
        id: string;
        projectId: string;
        runId: string | null;
        goalType: string | null;
        blueprintId: string | null;
        blueprintVersion: string | null;
        milestoneCount: number;
        validationResult: string | null;
        deliveryStatus: string | null;
        patternTags: string[];
        createdAt: number;
      }>>,
    getSummary: () =>
      ipcRenderer.invoke('runPatterns:getSummary') as Promise<Array<{
        goalType: string;
        count: number;
        successCount: number;
        avgMilestones: number;
      }>>,
  },
  portfolioSummary: {
    get: () =>
      ipcRenderer.invoke('portfolio:getSummary') as Promise<{
        totalApps: number;
        healthyCount: number;
        recentDeliveries: number;
        aggregateSuccessRate: number;
      }>,
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // Preview & Visual Validation (Phase 28)
  // ─────────────────────────────────────────────────────────────────────────────
  preview: {
    detectCommand: (
      workspacePath: string,
      config?: {
        blueprintPreviewCommand?: string;
        ralphProjectPreviewCommand?: string;
        forcedPort?: number;
        forcedRoutes?: string[];
      }
    ) =>
      ipcRenderer.invoke('preview:detectCommand', workspacePath, config),
    startPreview: (
      workspacePath: string,
      config?: {
        blueprintPreviewCommand?: string;
        ralphProjectPreviewCommand?: string;
        forcedPort?: number;
        forcedRoutes?: string[];
      }
    ) =>
      ipcRenderer.invoke('preview:startPreview', workspacePath, config),
    stopPreview: (processId: string) =>
      ipcRenderer.invoke('preview:stopPreview', processId),
    getProcessStatus: (processId: string) =>
      ipcRenderer.invoke('preview:getProcessStatus', processId),
    stopAllPreviews: () =>
      ipcRenderer.invoke('preview:stopAllPreviews'),
    captureEvidence: (
      previewUrl: string,
      routes: string[],
      viewports?: Array<'desktop' | 'mobile' | 'tablet'>
    ) =>
      ipcRenderer.invoke('preview:captureEvidence', previewUrl, routes, viewports),
    captureAndStoreEvidence: (
      projectId: string,
      runId: string,
      iteration: number,
      previewUrl: string,
      routes: string[],
      viewports?: Array<'desktop' | 'mobile' | 'tablet'>
    ) =>
      ipcRenderer.invoke(
        'preview:captureAndStoreEvidence',
        projectId,
        runId,
        iteration,
        previewUrl,
        routes,
        viewports
      ),
    runVisualSmokeChecks: (
      screenshots: Array<{
        route: string;
        viewport: string;
        screenshotBase64: string | null;
        errors: Array<{ code: string; message: string }>;
        warnings: Array<{ code: string; message: string }>;
      }>,
      consoleEvidence: Array<{
        route: string;
        viewport: string;
        consoleErrors: string[];
        consoleWarnings: string[];
        pageErrors: string[];
        failedRequests: Array<{ url: string; status: number; failureReason: string }>;
      }>,
      options?: { checkOverflow?: boolean; allowedConsoleErrors?: string[] }
    ) =>
      ipcRenderer.invoke('preview:runVisualSmokeChecks', screenshots, consoleEvidence, options),
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // Policy & Governance (Phase 29)
  // ─────────────────────────────────────────────────────────────────────────────
  policy: {
    getEffective: (projectId: string) =>
      ipcRenderer.invoke('policy:getEffective', projectId),
    listRules: (projectId: string) =>
      ipcRenderer.invoke('policy:listRules', projectId),
    createRule: (params: {
      projectId: string;
      type: PolicyRule['type'];
      label: string;
      description: string;
      pattern: string;
      enabled?: boolean;
      scope?: string | null;
      severity?: 'error' | 'warning';
      inheritable?: boolean;
    }) =>
      ipcRenderer.invoke('policy:createRule', params),
    updateRule: (id: string, updates: Partial<PolicyRule>) =>
      ipcRenderer.invoke('policy:updateRule', id, updates),
    deleteRule: (id: string) =>
      ipcRenderer.invoke('policy:deleteRule', id),
    check: (projectId: string, enforcementPoint: string, action: string, context?: { filePath?: string; command?: string }) =>
      ipcRenderer.invoke('policy:check', projectId, enforcementPoint, action, context),
    getSummary: (projectId: string) =>
      ipcRenderer.invoke('policy:getSummary', projectId),
    createOverride: (params: {
      projectId: string;
      ruleId: string;
      action: string;
      reason: string;
      scope: PolicyOverride['scope'];
      expiresAt?: number | null;
    }) =>
      ipcRenderer.invoke('policy:createOverride', params),
    listOverrides: (projectId: string) =>
      ipcRenderer.invoke('policy:listOverrides', projectId),
    pendingOverrides: (projectId: string) =>
      ipcRenderer.invoke('policy:pendingOverrides', projectId),
    approveOverride: (id: string, approver: string) =>
      ipcRenderer.invoke('policy:approveOverride', id, approver),
    rejectOverride: (id: string, approver: string) =>
      ipcRenderer.invoke('policy:rejectOverride', id, approver),
    listAuditEntries: (projectId: string, limit?: number) =>
      ipcRenderer.invoke('policy:listAuditEntries', projectId, limit),
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // Connector Types (Phase 30)
  // ─────────────────────────────────────────────────────────────────────────────
  connector: {
    listManifests: () =>
      ipcRenderer.invoke('connector:listManifests'),
    listConfigs: (projectId?: string | null) =>
      ipcRenderer.invoke('connector:listConfigs', projectId),
    getConfig: (id: string) =>
      ipcRenderer.invoke('connector:getConfig', id),
    saveConfig: (params: {
      connectorId: string;
      projectId?: string | null;
      scope?: 'global' | 'project';
      enabled?: boolean;
      configValues: Record<string, string>;
    }) =>
      ipcRenderer.invoke('connector:saveConfig', params),
    deleteConfig: (id: string) =>
      ipcRenderer.invoke('connector:deleteConfig', id),
    testConnection: (id: string) =>
      ipcRenderer.invoke('connector:testConnection', id),
    call: (params: {
      connectorId: string;
      capability: string;
      operation: 'read' | 'write' | 'delete' | 'publish' | 'deploy';
      targetScope?: string;
      resourceId?: string;
      params?: Record<string, unknown>;
      projectId?: string;
    }) =>
      ipcRenderer.invoke('connector:call', params),
    redactedConfig: (configId: string) =>
      ipcRenderer.invoke('connector:redactedConfig', configId),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Context Bridge - Expose API to renderer
// ─────────────────────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('ralph', api);
contextBridge.exposeInMainWorld('knuthflow', api);

// Extend Window interface for TypeScript
declare global {
  interface Window {
    /**
     * Ralph desktop API - preferred interface for renderer code.
     * @deprecated Use window.ralph for new code. window.knuthflow is retained for backward compatibility.
     */
    knuthflow: typeof api;
    ralph: typeof api;
  }
}
