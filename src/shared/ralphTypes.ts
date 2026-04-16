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

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Runtime Types (Phase 8)
// ─────────────────────────────────────────────────────────────────────────────

export type LoopState =
  | 'idle'
  | 'starting'
  | 'planning'
  | 'executing'
  | 'validating'
  | 'paused'
  | 'failed'
  | 'cancelled'
  | 'completed';

// Stop reasons - derived from array to ensure type/array stay in sync
const STOP_REASONS = [
  'user_stopped',
  'rate_limit',
  'circuit_open',
  'timeout_idle',
  'timeout_iteration',
  'no_progress',
  'permission_denied',
  'session_expired',
  'validation_failed',
  'error',
] as const;

export type StopReason = typeof STOP_REASONS[number];

// Array of valid stop reasons for validation
export const VALID_STOP_REASONS: StopReason[] = [...STOP_REASONS];

export interface LoopIterationContext {
  iteration: number;
  selectedItem: ScheduledItem | null;
  acceptanceGate: AcceptanceGate | null;
  prompt: string;
  sessionId: string | null;
  startedAt: number;
}

export interface ScheduledItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  priority: number;
  metadata?: Record<string, unknown>;
  selectedAt: number | null;
  completedAt: number | null;
}

export interface AcceptanceGate {
  type: 'test' | 'build' | 'lint' | 'observable' | 'manual';
  description: string;
  command?: string;
  expectedExitCode?: number;
  timeoutMs?: number;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  checkbox: string;
  lineNumber: number;
  indentLevel: number;
  priority: number;
  children: PlanTask[];
  parentId: string | null;
}

export interface RateLimitState {
  callCount: number;
  tokenCount: number;
  windowStartMs: number;
  callsRemaining: number;
  tokensRemaining: number;
}

export interface CircuitBreakerState {
  failureCount: number;
  noProgressCount: number;
  permissionDenialCount: number;
  lastFailureAt: number | null;
  lastNoProgressAt: number | null;
  lastPermissionDenialAt: number | null;
  isOpen: boolean;
  openedAt: number | null;
  cooldownUntil: number | null;
}

export interface SafetyStop {
  reason: StopReason;
  message: string;
  triggeredAt: number;
  canResume: boolean;
  metadata?: Record<string, unknown>;
}

export interface RalphRuntimeConfig {
  maxIterations?: number;
  iterationTimeoutMs?: number;
  idleTimeoutMs?: number;
  maxCallCountPerWindow?: number;
  maxTokenCountPerWindow?: number;
  rateLimitWindowMs?: number;
  circuitBreakerFailureThreshold?: number;
  circuitBreakerNoProgressThreshold?: number;
  circuitBreakerCooldownMs?: number;
  shellReadyTimeoutMs?: number;
}

export const DEFAULT_RALPH_RUNTIME_CONFIG: Required<RalphRuntimeConfig> = {
  maxIterations: 50,
  iterationTimeoutMs: 5 * 60 * 1000,
  idleTimeoutMs: 30 * 60 * 1000,
  maxCallCountPerWindow: 100,
  maxTokenCountPerWindow: 500000,
  rateLimitWindowMs: 60 * 60 * 1000,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerNoProgressThreshold: 3,
  circuitBreakerCooldownMs: 15 * 60 * 1000,
  shellReadyTimeoutMs: 3000,
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Milestone Controller Types
// ─────────────────────────────────────────────────────────────────────────────

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  file?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  line?: number;
  column?: number;
  file?: string;
}

export interface MilestoneState {
  id: string;
  projectId: string;
  runId: string;
  milestoneId: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  acceptanceGate: string;
  order: number;
  tasks: string[]; // task IDs that belong to this milestone
  completedTasks: string[];
  blockedTasks: string[];
  startedAt: number | null;
  completedAt: number | null;
  validationResult: MilestoneValidationResult | null;
  createdAt: number;
  updatedAt: number;
}

export interface MilestoneValidationResult {
  passed: boolean;
  output: string;
  exitCode: number | null;
  durationMs: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validatedAt: number;
}

export interface TaskDependency {
  id: string;
  projectId: string;
  taskId: string;
  dependsOnTaskId: string;
  milestoneId: string | null;
  createdAt: number;
}

export interface MilestoneTask {
  id: string;
  projectId: string;
  runId: string;
  milestoneId: string;
  taskId: string; // maps to PlanTask.id or ScheduledItem.id
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred' | 'blocked';
  priority: number;
  dependencies: string[]; // task IDs this task depends on
  blockedReason: string | null;
  selectedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface MilestoneSnapshot {
  id: string;
  projectId: string;
  runId: string;
  iteration: number;
  milestones: MilestoneState[];
  taskGraph: MilestoneTask[];
  compressedContext: CompressedContext | null;
  createdAt: number;
}

export interface CompressedContext {
  productIntent: string;
  currentArchitecture: string;
  recentChanges: string;
  blockers: string[];
  openMilestones: string[];
  boundedPrompt: string;
  compressedAt: number;
}

export interface MilestoneScheduleResult {
  selectedTask: MilestoneTask | null;
  milestone: MilestoneState | null;
  reason: string;
  availableTasks: MilestoneTask[];
  blockedTasks: MilestoneTask[];
}

export interface MilestoneFeedback {
  id: string;
  projectId: string;
  runId: string;
  milestoneId: string;
  taskId: string | null;
  type: 'accept' | 'reject' | 'rework' | 'rollback' | 'replan';
  reason: string;
  evidence: string;
  suggestedAction: string | null;
  createdAt: number;
}
