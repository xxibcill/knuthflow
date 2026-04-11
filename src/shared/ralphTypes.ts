// ─────────────────────────────────────────────────────────────────────────────
// Ralph Types - Shared between main and preload
// ─────────────────────────────────────────────────────────────────────────────

export type LoopRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface RalphProject {
  id: string;
  workspaceId: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

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

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  recovery: string;
  path?: string;
}

export interface ReadinessReport {
  ready: boolean;
  isFresh: boolean;
  isCorrupted: boolean;
  workspaceId: string;
  workspacePath: string;
  projectId: string | null;
  issues: ValidationIssue[];
  checkedAt: number;
}

export interface BootstrapResult {
  success: boolean;
  created: string[];
  skipped: string[];
  updated: string[];
  backups: string[];
  error?: string;
  /** Error code for programmatic error handling */
  code?: string;
}

// Alias for use in modules that extend BootstrapResult
export type SharedBootstrapResult = BootstrapResult;

export interface RalphControlFiles {
  promptMd: string;
  agentMd: string;
  fixPlanMd: string;
  specsDir: string | null;
}

// Stale run threshold in milliseconds (30 minutes)
export const STALE_RUN_THRESHOLD_MS = 30 * 60 * 1000;

// Bootstrap error class for typed error handling
export class BootstrapError extends Error {
  constructor(
    message: string,
    public code: string,
    public recovery: string
  ) {
    super(message);
    this.name = 'BootstrapError';
  }
}
