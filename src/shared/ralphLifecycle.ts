// ─────────────────────────────────────────────────────────────────────────────
// Ralph Project Lifecycle Model (Phase 23)
// ─────────────────────────────────────────────────────────────────────────────

import type { ReadinessReport, LoopRun } from './ralphTypes';

// Re-export for consumers
export type { ReadinessReport, LoopRun } from './ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle States
// ─────────────────────────────────────────────────────────────────────────────

export type RalphLifecycleState =
  | 'no_workspace'
  | 'workspace_selected_not_enabled'
  | 'needs_fresh_bootstrap'
  | 'needs_repair'
  | 'ready_no_active_run'
  | 'active_run'
  | 'paused_run'
  | 'failed_run'
  | 'completed_run'
  | 'delivery_ready'
  | 'delivered'
  | 'maintenance_tracked';

export interface RalphLifecycleContext {
  workspaceId: string | null;
  workspacePath: string | null;
  readiness: ReadinessReport | null;
  activeRuns: LoopRun[];
  completedRunsCount: number;
  isDelivered: boolean;
  isMaintenanceTracked: boolean;
  latestRun: LoopRun | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// State Metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface LifecycleStateInfo {
  state: RalphLifecycleState;
  label: string;
  description: string;
  primaryAction: string;
  primaryActionLabel: string;
  secondaryActions: string[];
  isBlocked: boolean;
  blockedReason?: string;
  dataSource: 'readiness' | 'workspace' | 'ralph_metadata' | 'active_runs' | 'runtime_state' | 'delivery_manifest' | 'maintenance_records';
}

// ─────────────────────────────────────────────────────────────────────────────
// State Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const LIFECYCLE_STATES: Record<RalphLifecycleState, LifecycleStateInfo> = {
  no_workspace: {
    state: 'no_workspace',
    label: 'No Workspace',
    description: 'No workspace is selected.',
    primaryAction: 'select_workspace',
    primaryActionLabel: 'Select Workspace',
    secondaryActions: ['create_workspace'],
    isBlocked: false,
    dataSource: 'workspace',
  },

  workspace_selected_not_enabled: {
    state: 'workspace_selected_not_enabled',
    label: 'Not Ralph-Enabled',
    description: 'A workspace is selected but Ralph control files are not present.',
    primaryAction: 'bootstrap_ralph',
    primaryActionLabel: 'Bootstrap Ralph',
    secondaryActions: ['open_terminal', 'inspect_workspace'],
    isBlocked: false,
    dataSource: 'workspace',
  },

  needs_fresh_bootstrap: {
    state: 'needs_fresh_bootstrap',
    label: 'Needs Bootstrap',
    description: 'Ralph is enabled but missing required control files.',
    primaryAction: 'bootstrap_ralph',
    primaryActionLabel: 'Bootstrap Ralph',
    secondaryActions: ['repair_files', 'open_terminal'],
    isBlocked: false,
    dataSource: 'readiness',
  },

  needs_repair: {
    state: 'needs_repair',
    label: 'Needs Repair',
    description: 'Ralph control files exist but are corrupted or incomplete.',
    primaryAction: 'repair_files',
    primaryActionLabel: 'Repair Files',
    secondaryActions: ['bootstrap_ralph', 'inspect_readiness'],
    isBlocked: false,
    dataSource: 'readiness',
  },

  ready_no_active_run: {
    state: 'ready_no_active_run',
    label: 'Ready',
    description: 'Workspace is Ralph-ready with no active run.',
    primaryAction: 'start_loop',
    primaryActionLabel: 'Start Loop',
    secondaryActions: ['edit_prompt', 'edit_agent', 'edit_fix_plan', 'view_history'],
    isBlocked: false,
    dataSource: 'readiness',
  },

  active_run: {
    state: 'active_run',
    label: 'Run Active',
    description: 'A Ralph run is currently executing.',
    primaryAction: 'monitor_run',
    primaryActionLabel: 'View Dashboard',
    secondaryActions: ['pause_run', 'stop_run', 'view_plan', 'view_artifacts'],
    isBlocked: false,
    dataSource: 'active_runs',
  },

  paused_run: {
    state: 'paused_run',
    label: 'Run Paused',
    description: 'A Ralph run is paused and can be resumed.',
    primaryAction: 'resume_run',
    primaryActionLabel: 'Resume',
    secondaryActions: ['stop_run', 'replan', 'inspect_state'],
    isBlocked: false,
    dataSource: 'runtime_state',
  },

  failed_run: {
    state: 'failed_run',
    label: 'Run Failed',
    description: 'A Ralph run failed during execution.',
    primaryAction: 'inspect_failure',
    primaryActionLabel: 'View Errors',
    secondaryActions: ['retry_run', 'replan', 'bootstrap_repair', 'view_logs'],
    isBlocked: false,
    dataSource: 'runtime_state',
  },

  completed_run: {
    state: 'completed_run',
    label: 'Run Complete',
    description: 'A Ralph run completed successfully.',
    primaryAction: 'review_run',
    primaryActionLabel: 'View Results',
    secondaryActions: ['start_new_run', 'deliver_app', 'view_artifacts', 'view_history'],
    isBlocked: false,
    dataSource: 'active_runs',
  },

  delivery_ready: {
    state: 'delivery_ready',
    label: 'Delivery Ready',
    description: 'A run completed and the app is ready for packaging and handoff.',
    primaryAction: 'deliver_app',
    primaryActionLabel: 'Deliver App',
    secondaryActions: ['start_new_run', 'inspect_artifacts', 'run_packaging', 'view_metrics'],
    isBlocked: false,
    dataSource: 'delivery_manifest',
  },

  delivered: {
    state: 'delivered',
    label: 'Delivered',
    description: 'The app has been successfully delivered.',
    primaryAction: 'view_delivery',
    primaryActionLabel: 'View Delivery',
    secondaryActions: ['start_new_run', 'track_maintenance', 'view_history'],
    isBlocked: false,
    dataSource: 'delivery_manifest',
  },

  maintenance_tracked: {
    state: 'maintenance_tracked',
    label: 'Maintenance',
    description: 'The delivered app is being monitored for issues and updates.',
    primaryAction: 'view_maintenance',
    primaryActionLabel: 'View Status',
    secondaryActions: ['start_new_run', 'deliver_update', 'view_metrics'],
    isBlocked: false,
    dataSource: 'maintenance_records',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Ambiguous States
// ─────────────────────────────────────────────────────────────────────────────

export interface AmbiguousState {
  type: 'stale_active_run' | 'missing_folder' | 'malformed_metadata' | 'missing_claude_code';
  message: string;
  recovery: string;
  primaryAction: string;
}

export const AMBIGUOUS_STATES: AmbiguousState[] = [
  {
    type: 'stale_active_run',
    message: 'An active run exists but has not reported progress recently.',
    recovery: 'Check if the terminal session is still alive. You can stop and restart the run.',
    primaryAction: 'inspect_stale_run',
  },
  {
    type: 'missing_folder',
    message: 'The workspace folder no longer exists or is inaccessible.',
    recovery: 'Verify the workspace path is correct. You may need to relocate or re-create the workspace.',
    primaryAction: 'recover_workspace',
  },
  {
    type: 'malformed_metadata',
    message: 'The .ralph metadata file exists but contains invalid data.',
    recovery: 'Run Repair Files to regenerate the metadata from existing control files.',
    primaryAction: 'repair_metadata',
  },
  {
    type: 'missing_claude_code',
    message: 'Claude Code CLI is not installed or not found in PATH.',
    recovery: 'Install Claude Code CLI and ensure it is accessible from the terminal.',
    primaryAction: 'install_claude_code',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle Selector
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the current lifecycle state from workspace context.
 * This is the single source of truth for the Ralph console's primary action.
 */
export function getRalphLifecycleState(ctx: RalphLifecycleContext): RalphLifecycleState {
  const {
    workspacePath,
    readiness,
    activeRuns,
    latestRun,
    isDelivered,
    isMaintenanceTracked,
  } = ctx;

  // No workspace selected
  if (!workspacePath || !ctx.workspaceId) {
    return 'no_workspace';
  }

  // Check for active runs first
  const runningRun = activeRuns.find(r => r.status === 'running');
  if (runningRun) {
    return 'active_run';
  }

  // Note: 'paused' status may not be in LoopRunStatus but RalphConsole.types defines it
  const pausedRun = activeRuns.find(r => (r.status as string) === 'paused');
  if (pausedRun) {
    return 'paused_run';
  }

  const failedRun = activeRuns.find(r => r.status === 'failed');
  if (failedRun) {
    return 'failed_run';
  }

  const completedRun = activeRuns.find(r => r.status === 'completed');
  if (completedRun) {
    // Check if delivery is ready
    if (readiness?.ready && latestRun?.status === 'completed') {
      return 'delivery_ready';
    }
    return 'completed_run';
  }

  // Check if workspace path exists
  if (!readiness) {
    return 'workspace_selected_not_enabled';
  }

  // Workspace not found
  if (!readiness.workspacePath) {
    return 'workspace_selected_not_enabled';
  }

  // Check delivery/maintenance states
  if (isDelivered) {
    return isMaintenanceTracked ? 'maintenance_tracked' : 'delivered';
  }

  // Check readiness state
  if (!readiness.ready) {
    // Fresh workspace needs bootstrap (no issues = missing files)
    if (readiness.isFresh && readiness.issues.length === 0) {
      return 'needs_fresh_bootstrap';
    }

    // Has readiness issues but not fresh - needs repair
    return 'needs_repair';
  }

  // Ready with no active run
  return 'ready_no_active_run';
}

/**
 * Get full state info including metadata for the current lifecycle state.
 */
export function getLifecycleStateInfo(ctx: RalphLifecycleContext): LifecycleStateInfo {
  const state = getRalphLifecycleState(ctx);
  return LIFECYCLE_STATES[state];
}

/**
 * Get ambiguous state detection results.
 */
export function detectAmbiguousStates(
  ctx: RalphLifecycleContext,
  activePtySessionIds: Set<string>
): AmbiguousState[] {
  const ambiguous: AmbiguousState[] = [];
  const readiness = ctx.readiness;

  // Check for stale active run
  const runningRun = ctx.activeRuns.find(r => r.status === 'running');
  if (runningRun && runningRun.ptySessionId) {
    if (!activePtySessionIds.has(runningRun.ptySessionId)) {
      const staleState = AMBIGUOUS_STATES.find(a => a.type === 'stale_active_run');
      if (staleState) ambiguous.push(staleState);
    }
  }

  // Check for missing folder
  if (ctx.workspacePath && readiness?.workspacePath !== ctx.workspacePath) {
    // workspacePath in readiness report doesn't match
    const missingFolderState = AMBIGUOUS_STATES.find(a => a.type === 'missing_folder');
    if (missingFolderState) ambiguous.push(missingFolderState);
  }

  // Check for malformed metadata
  if (readiness?.isCorrupted) {
    const malformedState = AMBIGUOUS_STATES.find(a => a.type === 'malformed_metadata');
    if (malformedState) ambiguous.push(malformedState);
  }

  return ambiguous;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Messaging
// ─────────────────────────────────────────────────────────────────────────────

export type RecoveryActionType =
  | 'repair_files'
  | 'recheck_readiness'
  | 'stop_stale_run'
  | 'reopen_folder'
  | 'install_claude_code'
  | 'retry_bootstrap'
  | 'inspect_logs';

export interface RecoveryMessage {
  title: string;
  description: string;
  action: RecoveryActionType;
  actionLabel: string;
  isBlocking: boolean;
  technicalDetails?: string;
}

export function getRecoveryMessage(
  state: RalphLifecycleState,
  issues: { code: string; message: string; recovery: string }[]
): RecoveryMessage | null {
  switch (state) {
    case 'needs_repair':
      return {
        title: 'Repair Needed',
        description: issues[0]?.message ?? 'Ralph control files need repair.',
        action: 'repair_files',
        actionLabel: 'Repair Files',
        isBlocking: true,
        technicalDetails: issues.map(i => `${i.code}: ${i.message}`).join('\n'),
      };

    case 'needs_fresh_bootstrap':
      return {
        title: 'Bootstrap Required',
        description: 'This workspace is not yet configured for Ralph.',
        action: 'retry_bootstrap',
        actionLabel: 'Bootstrap Ralph',
        isBlocking: false,
      };

    case 'failed_run':
      return {
        title: 'Run Failed',
        description: issues[0]?.message ?? 'The Ralph run encountered an error.',
        action: 'inspect_logs',
        actionLabel: 'View Errors',
        isBlocking: false,
        technicalDetails: issues.map(i => i.message).join('\n'),
      };

    case 'workspace_selected_not_enabled':
      return {
        title: 'Not Ralph-Enabled',
        description: 'This workspace does not have Ralph control files.',
        action: 'retry_bootstrap',
        actionLabel: 'Bootstrap Ralph',
        isBlocking: false,
      };

    default:
      return null;
  }
}