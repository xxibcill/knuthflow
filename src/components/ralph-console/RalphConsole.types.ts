import type { LoopState } from '../../shared/ralphTypes';

// RalphPhase is an alias for LoopState from ralphTypes
export type RalphPhase = LoopState;

export type RalphRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface ScheduledItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  priority: number;
  selectedAt: number | null;
  completedAt: number | null;
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

export type ArtifactType =
  | 'compiler_output'
  | 'test_log'
  | 'diff'
  | 'exit_metadata'
  | 'generated_file'
  | 'validation_result'
  | 'loop_summary'
  | 'prompt'
  | 'agent_output'
  | 'preview_screenshot'
  | 'visual_smoke_check'
  | 'console_evidence';

export type ArtifactSeverity = 'error' | 'warning' | 'info';

export interface RalphArtifact {
  id: string;
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  type: ArtifactType;
  content: string;
  exitCode: number | null;
  durationMs: number | null;
  severity: ArtifactSeverity;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface RalphSafetyState {
  rateLimitCallsRemaining: number;
  rateLimitTokensRemaining: number;
  circuitBreakerOpen: boolean;
  circuitBreakerCooldownUntil: number | null;
  permissionDenials: number;
  noProgressCount: number;
}

export type OperatorControlAction = 'pause' | 'resume' | 'stop' | 'replan' | 'validate';

export interface SafetyAlert {
  id: string;
  type: 'circuit_open' | 'rate_limit' | 'permission_denied' | 'timeout' | 'error';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  canResume: boolean;
  metadata?: Record<string, unknown>;
}

export interface RalphRunDashboardItem {
  runId: string;
  projectId: string;
  sessionId: string | null;
  ptySessionId: string | null;
  workspaceName: string;
  workspacePath: string;
  name: string;
  status: RalphRunStatus;
  phase: LoopState;
  selectedItem: ScheduledItem | null;
  iterationCount: number;
  loopCount: number;
  safetyState: RalphSafetyState | null;
  startTime: number | null;
  endTime: number | null;
  error: string | null;
}

export interface OperatorConfirmation {
  action: OperatorControlAction;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isDangerous: boolean;
}
