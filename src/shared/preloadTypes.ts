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
import type { PlatformCategory, PlatformTarget, PlatformTargetConfig } from './deliveryTypes';
import type { Blueprint, BlueprintVersion } from './blueprintTypes';
import type { ArtifactType } from '../components/ralph-console/RalphConsole.types';
export type { ArtifactType };
export type { Blueprint, BlueprintVersion } from './blueprintTypes';

export type { PlatformTarget, PlatformCategory, PlatformTargetConfig } from './deliveryTypes';

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

export interface AppIntakeDraft {
  appName: string;
  appBrief: string;
  targetPlatform: PlatformTarget[];
  platformConfig: PlatformTargetConfig;
  successCriteria: string[];
  stackPreferences: string[];
  forbiddenPatterns: string[];
  maxBuildTime: number;
  supportedBrowsers: string[];
  deliveryFormat: 'electron' | 'web' | 'mobile' | 'api';
}

export interface AppBlueprintSpec {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'high' | 'medium' | 'low';
  relatedSpecIds: string[];
}

export interface AppBlueprintMilestone {
  id: string;
  title: string;
  description: string;
  tasks: string[];
  acceptanceGate: string;
  order: number;
}

export interface AppBlueprint {
  version: string;
  generatedAt: number;
  intake: AppIntakeDraft;
  specs: AppBlueprintSpec[];
  milestones: AppBlueprintMilestone[];
  fixPlan: string;
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
  LoopState,
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
    bootstrap(
      workspaceId: string,
      workspacePath: string,
      force?: boolean,
      platformTargets?: PlatformTarget[],
    ): Promise<BootstrapResult>;
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
    replanRun(runId: string): Promise<{
      success: boolean;
      message?: string;
      completedTasks?: number;
      pendingTasks?: number;
      error?: string;
    }>;
    validateRun(runId: string): Promise<{
      success: boolean;
      passed: boolean;
      build?: { passed: boolean; output: string; errors: Array<{ code: string; message: string }> };
      test?: { passed: boolean; output: string; errors: Array<{ code: string; message: string }> };
      lint?: { passed: boolean; output: string; errors: Array<{ code: string; message: string }> };
      error?: string;
    }>;
  };
  appintake: {
    generateBlueprint(intake: AppIntakeDraft): Promise<{
      success: boolean;
      blueprint?: AppBlueprint;
      error?: string;
      code?: string;
    }>;
    writeBlueprintFiles(workspacePath: string, blueprint: AppBlueprint): Promise<{
      success: boolean;
      filesCreated?: string[];
      error?: string;
      code?: string;
    }>;
    validateIntake(intake: Pick<AppIntakeDraft,
      'appName' |
      'appBrief' |
      'targetPlatform' |
      'deliveryFormat' |
      'maxBuildTime'
    >): Promise<{
      valid: boolean;
      issues: string[];
    }>;
  };
  scaffolding: {
    getTemplates(): Promise<Array<{
      id: string;
      name: string;
      description: string;
      applicablePlatforms: string[];
    }>>;
    scaffold(workspacePath: string, templateType: string, appName: string): Promise<{
      success: boolean;
      createdFiles?: string[];
      errors?: string[];
      templateUsed?: string | null;
    }>;
    getMetadata(workspacePath: string): Promise<{
      template: string;
      scaffoldAt: number;
      appName: string;
    } | null>;
    isScaffolded(workspacePath: string): Promise<boolean>;
    getBuildCommands(workspacePath: string): Promise<Array<{
      name: string;
      command: string;
      description: string;
    }>>;
  };
  ralphRuntime?: {
    start(projectId: string, name: string, sessionId: string, ptySessionId: string): Promise<{ success: boolean; run?: LoopRun; error?: string }>;
    getState(runId: string): Promise<{ success: boolean; state?: LoopState }>;
  };
  delivery: {
    getHandoffBundle(workspacePath: string): Promise<{
      success: boolean;
      bundle?: {
        appName: string;
        deliveryFormat: string;
        platformTargets: string[];
        artifacts: Array<{
          id: string;
          name: string;
          type: string;
          path: string;
          size?: string;
          validated: boolean;
          validatedAt?: number;
          gate?: string;
          platformTarget?: string;
        }>;
        gates: Array<{
          id: string;
          name: string;
          description: string;
          status: string;
          evidence?: string;
          passedAt?: number;
          platformTarget?: string;
        }>;
        platformHandoffs: Array<{
          platformTarget: string;
          artifacts: Array<{
            id: string;
            name: string;
            type: string;
            path: string;
            size?: string;
            validated: boolean;
            validatedAt?: number;
            gate?: string;
            platformTarget?: string;
          }>;
          gates: Array<{
            id: string;
            name: string;
            description: string;
            status: string;
            evidence?: string;
            passedAt?: number;
            platformTarget?: string;
          }>;
          status: string;
        }>;
        completedAt?: number;
        summary: string;
      };
      error?: string;
    }>;
    runPackaging(workspacePath: string, deliveryFormat: string): Promise<{
      success: boolean;
      bundle?: {
        appName: string;
        deliveryFormat: string;
        platformTargets: string[];
        artifacts: Array<{
          id: string;
          name: string;
          type: string;
          path: string;
          size?: string;
          validated: boolean;
          validatedAt?: number;
          gate?: string;
          platformTarget?: string;
        }>;
        gates: Array<{
          id: string;
          name: string;
          description: string;
          status: string;
          evidence?: string;
          passedAt?: number;
          platformTarget?: string;
        }>;
        platformHandoffs: Array<{
          platformTarget: string;
          artifacts: Array<{
            id: string;
            name: string;
            type: string;
            path: string;
            size?: string;
            validated: boolean;
            validatedAt?: number;
            gate?: string;
            platformTarget?: string;
          }>;
          gates: Array<{
            id: string;
            name: string;
            description: string;
            status: string;
            evidence?: string;
            passedAt?: number;
            platformTarget?: string;
          }>;
          status: string;
        }>;
        completedAt?: number;
        summary: string;
      };
      error?: string;
    }>;
    confirmRelease(workspacePath: string): Promise<{
      success: boolean;
      bundle?: {
        appName: string;
        deliveryFormat: string;
        platformTargets: string[];
        artifacts: Array<{
          id: string;
          name: string;
          type: string;
          path: string;
          size?: string;
          validated: boolean;
          validatedAt?: number;
          gate?: string;
          platformTarget?: string;
        }>;
        gates: Array<{
          id: string;
          name: string;
          description: string;
          status: string;
          evidence?: string;
          passedAt?: number;
          platformTarget?: string;
        }>;
        platformHandoffs: Array<{
          platformTarget: string;
          artifacts: Array<{
            id: string;
            name: string;
            type: string;
            path: string;
            size?: string;
            validated: boolean;
            validatedAt?: number;
            gate?: string;
            platformTarget?: string;
          }>;
          gates: Array<{
            id: string;
            name: string;
            description: string;
            status: string;
            evidence?: string;
            passedAt?: number;
            platformTarget?: string;
          }>;
          status: string;
        }>;
        completedAt?: number;
        summary: string;
      };
      error?: string;
    }>;
  };
  milestoneValidation: {
    runPreviewValidation(workspacePath: string, timeoutMs?: number): Promise<{
      success: boolean;
      result?: {
        passed: boolean;
        output: string;
        exitCode: number | null;
        durationMs: number;
        errors: Array<{ code: string; message: string }>;
        warnings: Array<{ code: string; message: string }>;
      };
      error?: string;
    }>;
    runBuildValidation(workspacePath: string, timeoutMs?: number): Promise<{
      success: boolean;
      result?: {
        passed: boolean;
        output: string;
        exitCode: number | null;
        durationMs: number;
        errors: Array<{ code: string; message: string }>;
        warnings: Array<{ code: string; message: string }>;
      };
      error?: string;
    }>;
    runTestValidation(workspacePath: string, timeoutMs?: number): Promise<{
      success: boolean;
      result?: {
        passed: boolean;
        output: string;
        exitCode: number | null;
        durationMs: number;
        errors: Array<{ code: string; message: string }>;
        warnings: Array<{ code: string; message: string }>;
      };
      error?: string;
    }>;
    runLintValidation(workspacePath: string, timeoutMs?: number): Promise<{
      success: boolean;
      result?: {
        passed: boolean;
        output: string;
        exitCode: number | null;
        durationMs: number;
        errors: Array<{ code: string; message: string }>;
        warnings: Array<{ code: string; message: string }>;
      };
      error?: string;
    }>;
    runMilestoneValidation(
      projectId: string,
      runId: string,
      milestoneId: string,
      workspacePath: string,
      timeoutMs?: number
    ): Promise<{
      success: boolean;
      result?: {
        milestoneId: string;
        validatedAt: number;
        evidence: Array<{
          type: string;
          passed: boolean;
          output: string;
          exitCode: number | null;
          durationMs: number;
        }>;
      };
      error?: string;
    }>;
    determineFeedback(evidence: {
      milestoneId: string;
      type: string;
      passed: boolean;
      output: string;
      exitCode: number | null;
      durationMs: number;
      errors: Array<{ code: string; message: string }>;
      warnings: Array<{ code: string; message: string }>;
      validatedAt: number;
    }): Promise<{
      success: boolean;
      feedback?: {
        action: string;
        reason: string;
        suggestedTasks?: string[];
      };
      error?: string;
    }>;
    canCompleteMilestone(
      projectId: string,
      runId: string,
      milestoneId: string
    ): Promise<{
      success: boolean;
      canComplete: boolean;
      reason?: string;
      error?: string;
    }>;
    completeMilestone(
      projectId: string,
      runId: string,
      milestoneId: string
    ): Promise<{
      success: boolean;
      result?: {
        completed: boolean;
        milestoneId: string;
        completedAt: number;
      };
      error?: string;
    }>;
  };
  portfolio: {
    create(name: string, description?: string): Promise<Portfolio>;
    get(id: string): Promise<Portfolio | null>;
    list(): Promise<Portfolio[]>;
    update(id: string, updates: { name?: string; description?: string }): Promise<Portfolio | null>;
    delete(id: string): Promise<void>;
    addProject(portfolioId: string, projectId: string, priority?: number): Promise<PortfolioProject>;
    getProject(id: string): Promise<PortfolioProject | null>;
    listProjects(portfolioId: string): Promise<PortfolioProject[]>;
    updateProject(id: string, updates: {
      priority?: number;
      status?: PortfolioProject['status'];
      dependencyGraph?: Record<string, string[]>;
    }): Promise<PortfolioProject | null>;
    removeProject(id: string): Promise<void>;
    getProjectByProjectId(portfolioId: string, projectId: string): Promise<PortfolioProject | null>;
    listPortfoliosByProject(projectId: string): Promise<Portfolio[]>;
  };
  portfolioRuntime: {
    start(portfolioId: string, projectId: string, name: string, sessionId: string, ptySessionId: string): Promise<{
      started: boolean;
      queued: boolean;
      run?: LoopRun;
      queuedRun?: {
        id: string;
        portfolioId: string;
        projectId: string;
        runName: string;
        sessionId: string;
        ptySessionId: string;
        priority: number;
        queuedAt: number;
      };
    }>;
    getQueuedRuns(portfolioId: string): Promise<Array<{
      id: string;
      portfolioId: string;
      projectId: string;
      runName: string;
      sessionId: string;
      ptySessionId: string;
      priority: number;
      queuedAt: number;
    }>>;
    getQueueLength(portfolioId: string): Promise<number>;
    cancelQueuedRun(queuedRunId: string): Promise<boolean>;
    getActiveRunCount(portfolioId: string): Promise<number>;
    getPortfolioActiveRuns(portfolioId: string): Promise<Array<{ run: LoopRun; state: LoopState; projectId: string }>>;
    updatePriority(portfolioProjectId: string, newPriority: number): Promise<void>;
    setMaxConcurrentRuns(max: number): Promise<void>;
    getMaxConcurrentRuns(): Promise<number>;
    pauseAll(portfolioId: string): Promise<void>;
    resumeAll(portfolioId: string): Promise<void>;
    stopAll(portfolioId: string, reason?: 'user_stopped' | 'error' | 'completed'): Promise<void>;
    register(portfolioId: string): Promise<void>;
    unregister(portfolioId: string): Promise<void>;
    addProject(portfolioId: string, projectId: string): Promise<void>;
    removeProject(portfolioId: string, projectId: string): Promise<void>;
    // Dependency Resolution (P16-T4)
    getDependencyGraph(portfolioId: string): Promise<Record<string, string[]>>;
    detectCycles(portfolioId: string): Promise<Array<{ path: string[]; message: string }>>;
    getBuildOrder(portfolioId: string): Promise<{ order: string[]; hasCycles: boolean; cycles: Array<{ path: string[]; message: string }> }>;
    checkProjectCanStart(projectId: string, portfolioId: string): Promise<{ canStart: boolean; blockingDependencies: string[] }>;
    parseAndStoreDependencies(portfolioProjectId: string, fixPlanContent: string): Promise<{ success: boolean; dependencies: string[]; error?: string }>;
    getAvailableArtifacts(projectId: string, portfolioId: string): Promise<Array<{ projectId: string; artifactPath: string; artifactType: string; createdAt: number }>>;
    propagateArtifact(projectId: string, artifactPath: string, artifactType: string): Promise<void>;
    clearProjectArtifacts(projectId: string): Promise<void>;
  };
  // ─────────────────────────────────────────────────────────────────────────────
  // Monitoring & Maintenance Types (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────
  monitoring: {
    createConfig(appId: string): Promise<{
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
    } | null>;
    getConfig(appId: string): Promise<{
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
    } | null>;
    updateConfig(appId: string, updates: {
      enabled?: boolean;
      checkIntervalHours?: number;
      checkBuild?: boolean;
      checkLint?: boolean;
      checkTests?: boolean;
      checkVulnerabilities?: boolean;
      autoFixTrigger?: boolean;
      alertThreshold?: number;
    }): Promise<{
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
    } | null>;
    forceCheck(appId: string): Promise<Array<{
      checkType: 'build' | 'lint' | 'tests' | 'vulnerabilities';
      status: 'healthy' | 'degraded' | 'failing';
      message: string | null;
      details: string | null;
      regressed: boolean;
    }>>;
    getHealthStatus(appId: string): Promise<{
      overall: 'healthy' | 'degraded' | 'failing';
      checks: Record<string, 'healthy' | 'degraded' | 'failing'>;
    }>;
    listHealthRecords(appId: string, limit?: number): Promise<Array<{
      id: string;
      appId: string;
      checkType: 'build' | 'lint' | 'tests' | 'vulnerabilities';
      status: 'healthy' | 'degraded' | 'failing';
      message: string | null;
      details: string | null;
      regressed: boolean;
      checkedAt: number;
    }>>;
    getRegressedRecords(appId: string): Promise<Array<{
      id: string;
      appId: string;
      checkType: 'build' | 'lint' | 'tests' | 'vulnerabilities';
      status: 'healthy' | 'degraded' | 'failing';
      message: string | null;
      details: string | null;
      regressed: boolean;
      checkedAt: number;
    }>>;
    triggerAutoFix(appId: string): Promise<Array<{
      checkType: 'build' | 'lint' | 'tests' | 'vulnerabilities';
      status: 'healthy' | 'degraded' | 'failing';
      message: string | null;
      details: string | null;
      regressed: boolean;
    }>>;
  };
  maintenance: {
    create(params: {
      appId: string;
      runId?: string | null;
      triggerType: 'scheduled' | 'regression' | 'manual';
      triggerReason: string;
      regressionIds?: string[];
    }): Promise<{
      id: string;
      appId: string;
      runId: string | null;
      triggerType: 'scheduled' | 'regression' | 'manual';
      triggerReason: string;
      regressionIds: string[];
      status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      iterationCount: number;
      outcome: 'success' | 'failure' | 'cancelled' | null;
      startedAt: number | null;
      completedAt: number | null;
      createdAt: number;
    }>;
    get(id: string): Promise<{
      id: string;
      appId: string;
      runId: string | null;
      triggerType: 'scheduled' | 'regression' | 'manual';
      triggerReason: string;
      regressionIds: string[];
      status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      iterationCount: number;
      outcome: 'success' | 'failure' | 'cancelled' | null;
      startedAt: number | null;
      completedAt: number | null;
      createdAt: number;
    } | null>;
    update(id: string, updates: {
      status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      iterationCount?: number;
      outcome?: 'success' | 'failure' | 'cancelled' | null;
      startedAt?: number | null;
      completedAt?: number | null;
    }): Promise<{
      id: string;
      appId: string;
      runId: string | null;
      triggerType: 'scheduled' | 'regression' | 'manual';
      triggerReason: string;
      regressionIds: string[];
      status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      iterationCount: number;
      outcome: 'success' | 'failure' | 'cancelled' | null;
      startedAt: number | null;
      completedAt: number | null;
      createdAt: number;
    } | null>;
    list(appId: string, limit?: number): Promise<Array<{
      id: string;
      appId: string;
      runId: string | null;
      triggerType: 'scheduled' | 'regression' | 'manual';
      triggerReason: string;
      regressionIds: string[];
      status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      iterationCount: number;
      outcome: 'success' | 'failure' | 'cancelled' | null;
      startedAt: number | null;
      completedAt: number | null;
      createdAt: number;
    }>>;
    listActive(): Promise<Array<{
      id: string;
      appId: string;
      runId: string | null;
      triggerType: 'scheduled' | 'regression' | 'manual';
      triggerReason: string;
      regressionIds: string[];
      status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      iterationCount: number;
      outcome: 'success' | 'failure' | 'cancelled' | null;
      startedAt: number | null;
      completedAt: number | null;
      createdAt: number;
    }>>;
  };
  appVersion: {
    create(params: {
      appId: string;
      version: string;
      changelog?: string;
      channel?: 'internal' | 'beta' | 'stable';
      createdBy?: 'operator' | 'auto';
      runId?: string | null;
    }): Promise<{
      id: string;
      appId: string;
      version: string;
      changelog: string;
      releasedAt: number;
      channel: 'internal' | 'beta' | 'stable';
      createdBy: 'operator' | 'auto';
      runId: string | null;
      createdAt: number;
    }>;
    get(id: string): Promise<{
      id: string;
      appId: string;
      version: string;
      changelog: string;
      releasedAt: number;
      channel: 'internal' | 'beta' | 'stable';
      createdBy: 'operator' | 'auto';
      runId: string | null;
      createdAt: number;
    } | null>;
    list(appId: string, limit?: number): Promise<Array<{
      id: string;
      appId: string;
      version: string;
      changelog: string;
      releasedAt: number;
      channel: 'internal' | 'beta' | 'stable';
      createdBy: 'operator' | 'auto';
      runId: string | null;
      createdAt: number;
    }>>;
    listByChannel(appId: string, channel: 'internal' | 'beta' | 'stable'): Promise<Array<{
      id: string;
      appId: string;
      version: string;
      changelog: string;
      releasedAt: number;
      channel: 'internal' | 'beta' | 'stable';
      createdBy: 'operator' | 'auto';
      runId: string | null;
      createdAt: number;
    }>>;
    promote(id: string, newChannel: 'internal' | 'beta' | 'stable'): Promise<{
      id: string;
      appId: string;
      version: string;
      changelog: string;
      releasedAt: number;
      channel: 'internal' | 'beta' | 'stable';
      createdBy: 'operator' | 'auto';
      runId: string | null;
      createdAt: number;
    } | null>;
  };
  rollout: {
    createChannel(params: {
      appId: string;
      channel: string;
      isDefault?: boolean;
      validationRequired?: boolean;
      autoPromote?: boolean;
      minBetaAdopters?: number;
    }): Promise<{
      id: string;
      appId: string;
      channel: string;
      isDefault: boolean;
      validationRequired: boolean;
      autoPromote: boolean;
      minBetaAdopters: number;
      createdAt: number;
      updatedAt: number;
    }>;
    getChannel(appId: string, channel: string): Promise<{
      id: string;
      appId: string;
      channel: string;
      isDefault: boolean;
      validationRequired: boolean;
      autoPromote: boolean;
      minBetaAdopters: number;
      createdAt: number;
      updatedAt: number;
    } | null>;
    listChannels(appId: string): Promise<Array<{
      id: string;
      appId: string;
      channel: string;
      isDefault: boolean;
      validationRequired: boolean;
      autoPromote: boolean;
      minBetaAdopters: number;
      createdAt: number;
      updatedAt: number;
    }>>;
    updateChannel(id: string, updates: {
      isDefault?: boolean;
      validationRequired?: boolean;
      autoPromote?: boolean;
      minBetaAdopters?: number;
    }): Promise<{
      id: string;
      appId: string;
      channel: string;
      isDefault: boolean;
      validationRequired: boolean;
      autoPromote: boolean;
      minBetaAdopters: number;
      createdAt: number;
      updatedAt: number;
    } | null>;
    createRelease(params: {
      appId: string;
      versionId: string;
      channel: string;
      status?: 'active' | 'promoted' | 'rolled_back' | 'archived';
      promotedBy?: string | null;
      rollbackFromVersionId?: string | null;
    }): Promise<{
      id: string;
      appId: string;
      versionId: string;
      channel: string;
      status: 'active' | 'promoted' | 'rolled_back' | 'archived';
      promotedAt: number | null;
      promotedBy: string | null;
      rollbackFromVersionId: string | null;
      createdAt: number;
    }>;
    getRelease(id: string): Promise<{
      id: string;
      appId: string;
      versionId: string;
      channel: string;
      status: 'active' | 'promoted' | 'rolled_back' | 'archived';
      promotedAt: number | null;
      promotedBy: string | null;
      rollbackFromVersionId: string | null;
      createdAt: number;
    } | null>;
    getLatest(appId: string, channel: string): Promise<{
      id: string;
      appId: string;
      versionId: string;
      channel: string;
      status: 'active' | 'promoted' | 'rolled_back' | 'archived';
      promotedAt: number | null;
      promotedBy: string | null;
      rollbackFromVersionId: string | null;
      createdAt: number;
    } | null>;
    promoteRelease(id: string, promotedBy: string): Promise<{
      id: string;
      appId: string;
      versionId: string;
      channel: string;
      status: 'active' | 'promoted' | 'rolled_back' | 'archived';
      promotedAt: number | null;
      promotedBy: string | null;
      rollbackFromVersionId: string | null;
      createdAt: number;
    } | null>;
    rollbackRelease(id: string, rollbackVersionId: string): Promise<{
      id: string;
      appId: string;
      versionId: string;
      channel: string;
      status: 'active' | 'promoted' | 'rolled_back' | 'archived';
      promotedAt: number | null;
      promotedBy: string | null;
      rollbackFromVersionId: string | null;
      createdAt: number;
    } | null>;
    listReleases(appId: string, channel?: string): Promise<Array<{
      id: string;
      appId: string;
      versionId: string;
      channel: string;
      status: 'active' | 'promoted' | 'rolled_back' | 'archived';
      promotedAt: number | null;
      promotedBy: string | null;
      rollbackFromVersionId: string | null;
      createdAt: number;
    }>>;
    recordMetrics(params: {
      appId: string;
      versionId: string;
      channel: string;
      metricType: 'installs' | 'crashes' | 'active_users' | 'crash_rate' | 'feedback_score';
      metricValue: number;
    }): Promise<{
      id: string;
      appId: string;
      versionId: string;
      channel: string;
      metricType: 'installs' | 'crashes' | 'active_users' | 'crash_rate' | 'feedback_score';
      metricValue: number;
      recordedAt: number;
    }>;
    listMetrics(appId: string, versionId?: string, channel?: string): Promise<Array<{
      id: string;
      appId: string;
      versionId: string;
      channel: string;
      metricType: 'installs' | 'crashes' | 'active_users' | 'crash_rate' | 'feedback_score';
      metricValue: number;
      recordedAt: number;
    }>>;
  };
  beta: {
    createTester(email: string, name?: string | null): Promise<{
      id: string;
      email: string;
      name: string | null;
      enabled: boolean;
      createdAt: number;
      updatedAt: number;
    }>;
    getTester(id: string): Promise<{
      id: string;
      email: string;
      name: string | null;
      enabled: boolean;
      createdAt: number;
      updatedAt: number;
    } | null>;
    getTesterByEmail(email: string): Promise<{
      id: string;
      email: string;
      name: string | null;
      enabled: boolean;
      createdAt: number;
      updatedAt: number;
    } | null>;
    listTesters(enabledOnly?: boolean): Promise<Array<{
      id: string;
      email: string;
      name: string | null;
      enabled: boolean;
      createdAt: number;
      updatedAt: number;
    }>>;
    updateTester(id: string, updates: { name?: string | null; enabled?: boolean }): Promise<{
      id: string;
      email: string;
      name: string | null;
      enabled: boolean;
      createdAt: number;
      updatedAt: number;
    } | null>;
    grantAccess(testerId: string, appId: string, channel?: string): Promise<{
      id: string;
      testerId: string;
      appId: string;
      channel: string;
      createdAt: number;
    }>;
    listAccess(testerId: string): Promise<Array<{
      id: string;
      testerId: string;
      appId: string;
      channel: string;
      createdAt: number;
    }>>;
    listTestersForApp(appId: string): Promise<Array<{
      id: string;
      email: string;
      name: string | null;
      enabled: boolean;
      createdAt: number;
      updatedAt: number;
    }>>;
    revokeAccess(id: string): Promise<{ success: boolean }>;
  };
  // ─────────────────────────────────────────────────────────────────────────────
  // Blueprint Types (Phase 20)
  // ─────────────────────────────────────────────────────────────────────────────
  blueprint: {
    create(params: { name: string; description?: string | null; category?: string; isPublished?: boolean; parentBlueprintId?: string | null }): Promise<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      isPublished: boolean;
      parentBlueprintId: string | null;
      usageCount: number;
      successRate: number | null;
      createdAt: number;
      updatedAt: number;
    }>;
    get(id: string): Promise<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      isPublished: boolean;
      parentBlueprintId: string | null;
      usageCount: number;
      successRate: number | null;
      createdAt: number;
      updatedAt: number;
    } | null>;
    getByName(name: string): Promise<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      isPublished: boolean;
      parentBlueprintId: string | null;
      usageCount: number;
      successRate: number | null;
      createdAt: number;
      updatedAt: number;
    } | null>;
    list(options?: { category?: string; isPublished?: boolean; limit?: number }): Promise<Array<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      isPublished: boolean;
      parentBlueprintId: string | null;
      usageCount: number;
      successRate: number | null;
      createdAt: number;
      updatedAt: number;
    }>>;
    listCategories(): Promise<string[]>;
    update(id: string, updates: { name?: string; description?: string | null; category?: string; isPublished?: boolean }): Promise<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      isPublished: boolean;
      parentBlueprintId: string | null;
      usageCount: number;
      successRate: number | null;
      createdAt: number;
      updatedAt: number;
    } | null>;
    delete(id: string): Promise<boolean>;
    incrementUsage(id: string): Promise<{ success: boolean }>;
    getUsageStats(blueprintId: string, limit?: number): Promise<Array<{
      id: string;
      blueprintId: string;
      versionId: string | null;
      appId: string | null;
      outcome: 'success' | 'failure' | 'cancelled';
      buildTimeMs: number | null;
      iterationCount: number;
      createdAt: number;
    }>>;
    calculateSuccessRate(blueprintId: string): Promise<number | null>;
    recordUsage(params: { blueprintId: string; versionId?: string | null; appId?: string | null; outcome: 'success' | 'failure' | 'cancelled'; buildTimeMs?: number | null; iterationCount?: number }): Promise<{
      id: string;
      blueprintId: string;
      versionId: string | null;
      appId: string | null;
      outcome: 'success' | 'failure' | 'cancelled';
      buildTimeMs: number | null;
      iterationCount: number;
      createdAt: number;
    }>;
    createVersion(params: { blueprintId: string; version: string; specContent?: Record<string, unknown>; starterTemplate?: string | null; acceptanceGates?: string[]; learnedRules?: string[] }): Promise<{
      id: string;
      blueprintId: string;
      version: string;
      specContent: Record<string, unknown>;
      starterTemplate: string | null;
      acceptanceGates: string[];
      learnedRules: string[];
      usageCount: number;
      createdAt: number;
    }>;
    getVersion(id: string): Promise<{
      id: string;
      blueprintId: string;
      version: string;
      specContent: Record<string, unknown>;
      starterTemplate: string | null;
      acceptanceGates: string[];
      learnedRules: string[];
      usageCount: number;
      createdAt: number;
    } | null>;
    getVersionByVersion(blueprintId: string, version: string): Promise<{
      id: string;
      blueprintId: string;
      version: string;
      specContent: Record<string, unknown>;
      starterTemplate: string | null;
      acceptanceGates: string[];
      learnedRules: string[];
      usageCount: number;
      createdAt: number;
    } | null>;
    getLatestVersion(blueprintId: string): Promise<{
      id: string;
      blueprintId: string;
      version: string;
      specContent: Record<string, unknown>;
      starterTemplate: string | null;
      acceptanceGates: string[];
      learnedRules: string[];
      usageCount: number;
      createdAt: number;
    } | null>;
    listVersions(blueprintId: string): Promise<Array<{
      id: string;
      blueprintId: string;
      version: string;
      specContent: Record<string, unknown>;
      starterTemplate: string | null;
      acceptanceGates: string[];
      learnedRules: string[];
      usageCount: number;
      createdAt: number;
    }>>;
    listAllVersions(): Promise<Array<{
      id: string;
      blueprintId: string;
      version: string;
      specContent: Record<string, unknown>;
      starterTemplate: string | null;
      acceptanceGates: string[];
      learnedRules: string[];
      usageCount: number;
      createdAt: number;
    } & { blueprintName: string; blueprintCategory: string }>>;
    updateVersion(id: string, updates: { specContent?: Record<string, unknown>; starterTemplate?: string | null; acceptanceGates?: string[]; learnedRules?: string[] }): Promise<{
      id: string;
      blueprintId: string;
      version: string;
      specContent: Record<string, unknown>;
      starterTemplate: string | null;
      acceptanceGates: string[];
      learnedRules: string[];
      usageCount: number;
      createdAt: number;
    } | null>;
    deleteVersion(id: string): Promise<boolean>;
    incrementVersionUsage(id: string): Promise<{ success: boolean }>;
    validateSpec(spec: unknown): Promise<{ valid: boolean; errors: string[] }>;
    import(params: { spec: Record<string, unknown>; isPublished?: boolean; parentBlueprintId?: string | null }): Promise<{
      success: boolean;
      blueprint?: {
        id: string;
        name: string;
        description: string | null;
        category: string;
        isPublished: boolean;
        parentBlueprintId: string | null;
        usageCount: number;
        successRate: number | null;
        createdAt: number;
        updatedAt: number;
      };
      version?: {
        id: string;
        blueprintId: string;
        version: string;
        specContent: Record<string, unknown>;
        starterTemplate: string | null;
        acceptanceGates: string[];
        learnedRules: string[];
        usageCount: number;
        createdAt: number;
      };
      error?: string;
      existingBlueprintId?: string;
    }>;
    export(blueprintId: string, versionId?: string): Promise<{
      success: boolean;
      spec?: {
        version: string;
        name: string;
        description: string;
        category: string;
        starterTemplate: { files: Record<string, string>; packageJson?: Record<string, unknown>; tsConfig?: Record<string, unknown> };
        specFileTemplates: Array<{ id: string; title: string; description: string; content: string }>;
        taskPatternDefaults: Array<{ id: string; title: string; pattern: string; fixPlanTemplate: string }>;
        acceptanceGateTemplates: Array<{ id: string; name: string; description: string; gate: string }>;
        learnedRules: string[];
      };
      error?: string;
    }>;
    importAs(params: { spec: Record<string, unknown>; isPublished?: boolean; parentBlueprintId?: string | null }, newName: string): Promise<{
      success: boolean;
      blueprint?: {
        id: string;
        name: string;
        description: string | null;
        category: string;
        isPublished: boolean;
        parentBlueprintId: string | null;
        usageCount: number;
        successRate: number | null;
        createdAt: number;
        updatedAt: number;
      };
      version?: {
        id: string;
        blueprintId: string;
        version: string;
        specContent: Record<string, unknown>;
        starterTemplate: string | null;
        acceptanceGates: string[];
        learnedRules: string[];
        usageCount: number;
        createdAt: number;
      };
    }>;
    createNewVersion(blueprintId: string, newVersion: string, specContent?: Record<string, unknown>): Promise<{
      success: boolean;
      version?: {
        id: string;
        blueprintId: string;
        version: string;
        specContent: Record<string, unknown>;
        starterTemplate: string | null;
        acceptanceGates: string[];
        learnedRules: string[];
        usageCount: number;
        createdAt: number;
      };
      error?: string;
    }>;
    compareVersions(versionId1: string, versionId2: string): Promise<{
      success: boolean;
      comparison?: {
        version1: string;
        version2: string;
        differences: {
          specContent: boolean;
          starterTemplate: boolean;
          acceptanceGates: boolean;
          learnedRules: boolean;
        };
        version1Spec: Record<string, unknown>;
        version2Spec: Record<string, unknown>;
      };
      error?: string;
    }>;
    getInheritanceChain(blueprintId: string): Promise<{
      success: boolean;
      chain: Array<{ id: string; name: string; version: string }>;
      error?: string;
    }>;
    extend(
      parentBlueprintId: string,
      name: string,
      description: string | null,
      overrides: {
        specContent?: Record<string, unknown>;
        starterTemplate?: string | null;
        acceptanceGates?: string[];
        learnedRules?: string[];
      }
    ): Promise<{
      success: boolean;
      blueprint?: Blueprint;
      version?: BlueprintVersion;
      parentBlueprintId?: string;
      error?: string;
    }>;
  };
}
