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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 29: Policy Types
// ─────────────────────────────────────────────────────────────────────────────

export type PolicyRuleType = 'protected_path' | 'forbidden_command' | 'dependency_limit' | 'connector_access' | 'delivery_gate' | 'approval_required';

export interface PolicyRule {
  id: string;
  projectId: string;
  type: PolicyRuleType;
  /** Human-readable label */
  label: string;
  /** Detailed explanation shown in UI */
  description: string;
  /** Pattern or path this rule applies to (glob-style for paths) */
  pattern: string;
  /** Whether this rule is currently active */
  enabled: boolean;
  /** Rule applies only within this scope, or globally if null */
  scope: string | null;
  /** Severity when violated: error blocks, warning logs */
  severity: 'error' | 'warning';
  /** For inherited rules - if true, project can override */
  inheritable: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PolicyOverride {
  id: string;
  projectId: string;
  ruleId: string;
  /** What action triggered this override request */
  action: string;
  /** Why the override is needed */
  reason: string;
  /** Narrow scope: 'command' | 'file' | 'run' | 'delivery' | 'permanent' */
  scope: 'command' | 'file' | 'run' | 'delivery' | 'permanent';
  /** Timestamp when override expires */
  expiresAt: number | null;
  /** Who approved this override */
  approver: string | null;
  /** 'pending' | 'approved' | 'rejected' | 'expired' */
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: number;
  updatedAt: number;
}

export interface PolicyAuditEntry {
  id: string;
  projectId: string;
  /** 'policy_edit' | 'blocked_action' | 'override_approved' | 'override_rejected' | 'override_expired' */
  eventType: 'policy_edit' | 'blocked_action' | 'override_approved' | 'override_rejected' | 'override_expired';
  /** ID of related entity (rule ID, override ID, etc.) */
  entityId: string | null;
  /** Human-readable summary without exposing secrets */
  summary: string;
  /** JSON metadata - no secrets */
  metadata: string;
  createdAt: number;
}

/** Resolved effective policy for a project */
export interface EffectivePolicy {
  projectId: string;
  rules: PolicyRule[];
  overrides: PolicyOverride[];
  /** Merge of default + project-specific rules */
  inheritedRuleIds: string[];
  version: number;
  updatedAt: number;
}

/** Default safe policy settings */
export const DEFAULT_POLICY_RULES: Omit<PolicyRule, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'protected_path',
    label: 'Protect package.json',
    description: 'Block modifications to package.json unless through proper dependency management',
    pattern: 'package.json',
    enabled: true,
    scope: null,
    severity: 'error',
    inheritable: true,
  },
  {
    type: 'protected_path',
    label: 'Protect lock files',
    description: 'Block direct edits to lockfiles (package-lock.json, yarn.lock, pnpm-lock.yaml)',
    pattern: '*-lock.{json,yaml,yml}',
    enabled: true,
    scope: null,
    severity: 'error',
    inheritable: true,
  },
  {
    type: 'forbidden_command',
    label: 'Block destructive commands',
    description: 'Block rm -rf, git push --force, and other destructive operations',
    pattern: 'rm +-rf|git push --force|--force-with-lease',
    enabled: true,
    scope: null,
    severity: 'error',
    inheritable: true,
  },
  {
    type: 'approval_required',
    label: 'Approval for git push',
    description: 'Require operator approval before git push',
    pattern: 'git push',
    enabled: true,
    scope: null,
    severity: 'warning',
    inheritable: true,
  },
  {
    type: 'delivery_gate',
    label: 'Delivery requires validation',
    description: 'Block delivery if build or tests have not passed',
    pattern: 'delivery',
    enabled: true,
    scope: null,
    severity: 'error',
    inheritable: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Phase 31: Analytics Types
// ─────────────────────────────────────────────────────────────────────────────

export type AnalyticsCategory = 'performance' | 'quality' | 'engagement' | 'business';

export interface AnalyticsEvent {
  id: string;
  projectId: string | null;
  runId: string | null;
  sessionId: string | null;
  eventType: string;
  category: AnalyticsCategory;
  metricName: string;
  metricValue: number;
  dimensions: Record<string, unknown>;
  createdAt: number;
}

export interface AnalyticsRollup {
  id: string;
  projectId: string | null;
  blueprintId: string | null;
  portfolioId: string | null;
  rollupType: string;
  timeWindow: string;
  metricName: string;
  metricValue: number;
  sampleSize: number;
  dimensions: Record<string, unknown>;
  computedAt: number;
}

export type BottleneckType =
  | 'slow_validation_gate'
  | 'repeated_build_failure'
  | 'frequent_policy_override'
  | 'repeated_operator_intervention'
  | 'failed_packaging_step';

export type BottleneckSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BottleneckDetection {
  id: string;
  projectId: string | null;
  blueprintId: string | null;
  bottleneckType: BottleneckType;
  description: string;
  severity: BottleneckSeverity;
  frequency: number;
  impactScore: number;
  exampleRunIds: string[];
  suggestion: string;
  status: 'detected' | 'addressed' | 'dismissed';
  dismissedAt: number | null;
  addressedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Forecast {
  id: string;
  projectId: string | null;
  blueprintId: string | null;
  appType: string | null;
  platformTargets: string[];
  stackPreferences: string[];
  estimatedDurationMs: number | null;
  estimatedIterationCount: number | null;
  estimatedRiskLevel: 'low' | 'medium' | 'high' | 'very_high' | null;
  confidenceScore: number | null;
  caveats: string | null;
  actualDurationMs: number | null;
  actualIterationCount: number | null;
  actualOutcome: 'success' | 'failure' | 'cancelled' | null;
  createdAt: number;
  resolvedAt: number | null;
}

export type RecommendationType =
  | 'blueprint_update'
  | 'validation_gate_adjustment'
  | 'policy_change'
  | 'scaffold_improvement';

export type RecommendationEntityType = 'blueprint' | 'policy_rule' | 'validation_gate' | 'scaffold';

export type RecommendationStatus =
  | 'pending'
  | 'approved'
  | 'dismissed'
  | 'deferred'
  | 'applied'
  | 'superseded';

export interface RecommendationRecord {
  id: string;
  projectId: string | null;
  recommendationType: RecommendationType;
  targetEntityType: RecommendationEntityType;
  targetEntityId: string | null;
  title: string;
  description: string;
  actionableSteps: string;
  status: RecommendationStatus;
  approvedAt: number | null;
  dismissedAt: number | null;
  deferredUntil: number | null;
  outcome: string | null;
  outcomeNotes: string | null;
  createdAt: number;
  updatedAt: number;
}

