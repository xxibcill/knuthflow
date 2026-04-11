import { getDatabase } from '../database';
import { getRalphRuntime } from '../ralphRuntime';
import { STALE_RUN_THRESHOLD_MS, type LoopRun } from '../../shared/ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Result Types
// ─────────────────────────────────────────────────────────────────────────────

export type RecoveryAction = 'resumed' | 'cleaned_up' | 'failed' | 'unrecoverable';

export interface RecoveryResult {
  action: RecoveryAction;
  runId: string;
  message: string;
  canResume: boolean;
  /** Metadata about what was recovered or why it failed */
  metadata?: Record<string, unknown>;
}

export interface RecoveryReport {
  totalRuns: number;
  resumed: number;
  cleanedUp: number;
  failed: number;
  unrecoverable: number;
  results: RecoveryResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Stale Run Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a run is considered stale based on last activity time.
 * A stale run has no activity for STALE_RUN_THRESHOLD_MS (30 minutes by default).
 */
export function isRunStale(run: LoopRun, thresholdMs = STALE_RUN_THRESHOLD_MS): boolean {
  if (run.status !== 'running') {
    return false; // Only running runs can be stale
  }

  if (!run.startTime) {
    return true; // Running but never started - suspicious
  }

  const now = Date.now();
  const lastActivity = run.endTime ?? run.startTime;
  return now - lastActivity > thresholdMs;
}

/**
 * Check if a run has an active PTY session that is still alive.
 * This is checked via the runtime state, not directly via PTY manager
 * to avoid importing PTY-specific logic here.
 */
export function hasActiveSession(run: LoopRun, activePtySessionIds: Set<string>): boolean {
  return run.ptySessionId !== null && activePtySessionIds.has(run.ptySessionId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to recover a single stale run.
 */
export async function recoverRun(
  run: LoopRun,
  workspacePath: string,
  activePtySessionIds: Set<string>
): Promise<RecoveryResult> {
  const runtime = getRalphRuntime(run.projectId);

  // Check if we have an active session for this run
  const hasSession = hasActiveSession(run, activePtySessionIds);

  // Check if runtime still has this run active
  const runtimeState = runtime.getRuntimeState(run.id);

  if (runtimeState && ['starting', 'planning', 'executing', 'validating', 'paused'].includes(runtimeState)) {
    // Run is active in runtime - check if session is still alive
    if (hasSession) {
      // Run is alive and session is valid - can resume
      return {
        action: 'resumed',
        runId: run.id,
        message: `Run ${run.id} is active and session is valid - ready to resume`,
        canResume: true,
        metadata: {
          sessionId: run.sessionId,
          ptySessionId: run.ptySessionId,
          iterationCount: run.iterationCount,
        },
      };
    } else {
      // Runtime is active but PTY is dead - try to recover
      return {
        action: 'resumed',
        runId: run.id,
        message: `Run ${run.id} has active runtime but PTY session is dead - resuming with new session`,
        canResume: true,
        metadata: {
          sessionId: run.sessionId,
          ptySessionId: run.ptySessionId,
          iterationCount: run.iterationCount,
          newSession: true,
        },
      };
    }
  }

  // Check if run ended cleanly in database
  if (run.status === 'completed' || run.status === 'failed') {
    // Run already finished - nothing to do
    return {
      action: 'cleaned_up',
      runId: run.id,
      message: `Run ${run.id} already ended with status ${run.status}`,
      canResume: false,
      metadata: {
        status: run.status,
        endTime: run.endTime,
        error: run.error,
      },
    };
  }

  // Run is orphaned (running but no runtime state, no active session)
  // This is an unrecoverable state - we should clean it up
  return {
    action: 'unrecoverable',
    runId: run.id,
    message: `Run ${run.id} is orphaned - no runtime state and no active session`,
    canResume: false,
    metadata: {
      status: run.status,
      sessionId: run.sessionId,
      ptySessionId: run.ptySessionId,
      lastActivity: run.endTime ?? run.startTime,
    },
  };
}

/**
 * Clean up an unrecoverable run by marking it as failed with appropriate error.
 */
export function cleanupRun(runId: string, projectId: string, reason: string): void {
  const db = getDatabase();
  db.endLoopRun(runId, 'failed', null, null, reason);

  // Clean up runtime state if it exists
  const runtime = getRalphRuntime(projectId);
  if (runtime.ownsRun(runId)) {
    runtime.cleanupRun(runId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Startup Recovery
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Perform startup recovery for all stale runs in a project.
 * This is called when RalphRuntime is initialized to clean up any
 * leftover state from previous sessions.
 */
export async function performStartupRecovery(
  projectId: string,
  workspacePath: string,
  activePtySessionIds: Set<string>
): Promise<RecoveryReport> {
  const db = getDatabase();

  const report: RecoveryReport = {
    totalRuns: 0,
    resumed: 0,
    cleanedUp: 0,
    failed: 0,
    unrecoverable: 0,
    results: [],
  };

  // Get all active runs for this project
  const activeRuns = db.listActiveLoopRuns(projectId);
  report.totalRuns = activeRuns.length;

  for (const run of activeRuns) {
    // Skip non-stale runs
    if (!isRunStale(run)) {
      continue;
    }

    const result = await recoverRun(run, workspacePath, activePtySessionIds);
    report.results.push(result);

    switch (result.action) {
      case 'resumed':
        report.resumed++;
        break;
      case 'cleaned_up':
        report.cleanedUp++;
        break;
      case 'failed':
        report.failed++;
        break;
      case 'unrecoverable':
        report.unrecoverable++;
        // Clean up unrecoverable runs
        cleanupRun(run.id, run.projectId, result.message);
        break;
    }
  }

  // Log recovery summary
  if (report.results.length > 0) {
    console.log(
      `[RalphRecovery] Startup recovery for project ${projectId}: ` +
      `${report.resumed} resumed, ${report.cleanedUp} cleaned, ` +
      `${report.unrecoverable} unrecoverable`
    );
  }

  return report;
}

/**
 * Get the current recovery status for a project.
 */
export function getRecoveryStatus(projectId: string): {
  hasStaleRuns: boolean;
  staleRunCount: number;
  lastRecoveryAt: number | null;
} {
  const db = getDatabase();
  const activeRuns = db.listActiveLoopRuns(projectId);
  const staleRuns = activeRuns.filter(run => isRunStale(run));

  return {
    hasStaleRuns: staleRuns.length > 0,
    staleRunCount: staleRuns.length,
    lastRecoveryAt: null, // Could be stored in project metadata if needed
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orphan Cleanup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clean up orphaned artifacts that are not associated with any valid run.
 * This is a maintenance operation that can be run periodically.
 */
export function cleanupOrphanedArtifacts(projectId: string): { deleted: number; errors: string[] } {
  const db = getDatabase();
  let deleted = 0;
  const errors: string[] = [];

  try {
    // Get all runs for this project
    const runs = db.listLoopRuns(projectId);
    const validRunIds = new Set(runs.map(r => r.id));

    // Get all artifacts for this project
    const artifacts = db.listArtifacts({ projectId });

    for (const artifact of artifacts) {
      if (!validRunIds.has(artifact.runId)) {
        try {
          db.deleteArtifact(artifact.id);
          deleted++;
        } catch (err) {
          errors.push(`Failed to delete artifact ${artifact.id}: ${err}`);
        }
      }
    }
  } catch (err) {
    errors.push(`Failed to list artifacts: ${err}`);
  }

  return { deleted, errors };
}

/**
 * Validate runtime state consistency.
 * Returns a list of inconsistencies found.
 */
export function validateRuntimeState(projectId: string): {
  consistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const runtime = getRalphRuntime(projectId);
  const db = getDatabase();

  // Get all active runs from database
  const activeRuns = db.listActiveLoopRuns(projectId);
  const activeRunIds = new Set(activeRuns.map(r => r.id));

  // Get all active runs from runtime
  const runtimeRunIds = runtime.getActiveRunIds(projectId);

  // Check for runs in database but not in runtime
  for (const runId of activeRunIds) {
    if (!runtimeRunIds.includes(runId)) {
      // This is expected if the run is stale and hasn't been cleaned up yet
      const run = activeRuns.find(r => r.id === runId);
      if (run && isRunStale(run)) {
        issues.push(`Run ${runId} is stale but not in runtime`);
      }
    }
  }

  // Check for runs in runtime but not in database
  for (const runId of runtimeRunIds) {
    if (!activeRunIds.has(runId)) {
      issues.push(`Run ${runId} is in runtime but not in database`);
      // Clean up orphaned runtime state
      runtime.cleanupRun(runId);
    }
  }

  return {
    consistent: issues.length === 0,
    issues,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Messaging
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a recovery result for display to the operator.
 */
export function formatRecoveryMessage(result: RecoveryResult): string {
  const lines = [
    `[${result.action.toUpperCase()}] Run ${result.runId}`,
    `  ${result.message}`,
    `  Can resume: ${result.canResume}`,
  ];

  if (result.metadata) {
    for (const [key, value] of Object.entries(result.metadata)) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Check if a run can be automatically resumed or requires manual intervention.
 */
export function canAutoResume(run: LoopRun, activePtySessionIds: Set<string>): {
  canResume: boolean;
  reason: string;
  requiresIntervention: boolean;
} {
  // Check if run is in a resumable state
  if (run.status !== 'running') {
    return {
      canResume: false,
      reason: `Run is not running (status: ${run.status})`,
      requiresIntervention: true,
    };
  }

  // Check if session is active
  if (run.sessionId && run.ptySessionId) {
    if (activePtySessionIds.has(run.ptySessionId)) {
      return {
        canResume: true,
        reason: 'Session is active and valid',
        requiresIntervention: false,
      };
    }
  }

  // Check if run is too stale
  if (isRunStale(run, STALE_RUN_THRESHOLD_MS * 2)) {
    return {
      canResume: false,
      reason: 'Run is too stale to safely resume',
      requiresIntervention: true,
    };
  }

  // Run is in a state where we can attempt resume
  return {
    canResume: true,
    reason: 'Can attempt resume with new session',
    requiresIntervention: false,
  };
}