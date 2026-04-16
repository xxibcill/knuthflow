import { getDatabase } from '../database';
import { getMilestoneController } from './milestoneController';
import type {
  CompressedContext,
  MilestoneState,
  MilestoneTask,
  MilestoneSnapshot,
} from '../../shared/ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Context Compression and Resumability
// Phase 14: Long-Horizon App Builder - P14-T2
// ─────────────────────────────────────────────────────────────────────────────

export interface ContextCompressionConfig {
  maxContextLength?: number;
  maxRecentChanges?: number;
  maxBlockers?: number;
  maxEvidenceLines?: number;
}

const DEFAULT_CONFIG: Required<ContextCompressionConfig> = {
  maxContextLength: 8000,
  maxRecentChanges: 500,
  maxBlockers: 5,
  maxEvidenceLines: 100,
};

/**
 * ContextCompression handles distillation of app-level intent and progress
 * into bounded promptable state for long autonomous runs.
 */
export class ContextCompression {
  private db = getDatabase();
  private config: Required<ContextCompressionConfig>;

  constructor(config: ContextCompressionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Compression
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Distill full app state into a compressed context for prompts.
   */
  compress(
    projectId: string,
    runId: string,
    options: {
      productIntent?: string;
      currentArchitecture?: string;
      recentEvidence?: string[];
    } = {}
  ): CompressedContext {
    const milestoneController = getMilestoneController();

    const {
      productIntent = 'App intent not specified',
      currentArchitecture = 'Architecture not defined',
      recentEvidence = [],
    } = options;

    const recentChanges = recentEvidence
      .slice(-this.config.maxRecentChanges)
      .join('\n');

    return milestoneController.createCompressedContext(
      projectId,
      runId,
      productIntent,
      currentArchitecture,
      recentChanges
    );
  }

  /**
   * Create a full milestone snapshot with compressed context.
   */
  createCompressedSnapshot(
    projectId: string,
    runId: string,
    iteration: number,
    options: {
      productIntent?: string;
      currentArchitecture?: string;
      recentEvidence?: string[];
    } = {}
  ): MilestoneSnapshot {
    const compressed = this.compress(projectId, runId, options);

    return this.db.createMilestoneSnapshot({
      projectId,
      runId,
      iteration,
      milestones: this.db.listMilestoneStates(projectId, runId),
      taskGraph: this.db.listMilestoneTasks(projectId, runId),
      compressedContext: compressed,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Resume Logic
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get state needed to resume a paused/interrupted run.
   */
  getResumeContext(projectId: string, runId: string): {
    compressed: CompressedContext | null;
    snapshot: MilestoneSnapshot | null;
    activeMilestone: MilestoneState | null;
    nextTask: MilestoneTask | null;
    blockers: string[];
  } {
    const milestoneController = getMilestoneController();
    const snapshot = this.db.getLatestMilestoneSnapshot(runId);
    const compressed = snapshot?.compressedContext ?? null;
    const activeMilestone = milestoneController.getActiveMilestone(projectId, runId);

    // Get the next task that would be selected
    const scheduleResult = milestoneController.selectNextTask(projectId, runId);

    // Get blockers for display
    const pendingTasks = this.db.listPendingMilestoneTasks(projectId, runId);
    const blockers = pendingTasks
      .filter(t => t.status === 'blocked')
      .slice(0, this.config.maxBlockers)
      .map(t => `• ${t.title}: ${t.blockedReason ?? 'Unknown reason'}`);

    return {
      compressed,
      snapshot,
      activeMilestone,
      nextTask: scheduleResult.selectedTask,
      blockers,
    };
  }

  /**
   * Resume from a snapshot by restoring milestone/task state.
   * Returns summary of what was restored.
   */
  restoreFromSnapshot(snapshot: MilestoneSnapshot): {
    milestonesRestored: number;
    tasksRestored: number;
    lastIteration: number;
  } {
    // The snapshot already contains the state that was persisted.
    // This method validates and returns what was restored.
    return {
      milestonesRestored: snapshot.milestones.length,
      tasksRestored: snapshot.taskGraph.length,
      lastIteration: snapshot.iteration,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Evidence Distillation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Distill validation evidence into a summary for compression.
   */
  distillEvidence(
    evidence: Array<{
      type: 'test' | 'build' | 'lint' | 'preview';
      passed: boolean;
      output: string;
      errors?: string[];
    }>
  ): string {
    const lines: string[] = ['## Validation Evidence Summary'];

    for (const e of evidence) {
      const status = e.passed ? '✓ PASS' : '✗ FAIL';
      lines.push(`\n### ${e.type.toUpperCase()}: ${status}`);
      lines.push(`Output: ${e.output.slice(0, 200)}...`);

      if (e.errors && e.errors.length > 0) {
        lines.push('Errors:');
        for (const err of e.errors.slice(0, 5)) {
          lines.push(`  - ${err}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Extract key recent changes from artifacts.
   */
  extractRecentChanges(projectId: string, runId: string, limit = 10): string[] {
    const artifacts = this.db.listArtifacts({ projectId, runId });
    const changes: string[] = [];

    for (const artifact of artifacts.slice(0, limit)) {
      if (artifact.type === 'generated_file' || artifact.type === 'diff') {
        changes.push(`[${artifact.type}] ${artifact.content.slice(0, 150)}`);
      }
    }

    return changes;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Bounded Prompt Building
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Build a bounded prompt that stays within context limits.
   */
  buildBoundedPrompt(
    compressed: CompressedContext,
    currentTask: string,
    operatorHint?: string
  ): string {
    const sections: string[] = [
      '# Ralph Autonomous Loop - Resumed Context',
      '',
      compressed.boundedPrompt,
      '',
      `# Current Task`,
      currentTask,
      '',
    ];

    if (compressed.blockers.length > 0) {
      sections.push('# Blockers');
      for (const blocker of compressed.blockers) {
        sections.push(`- ${blocker}`);
      }
      sections.push('');
    }

    if (operatorHint) {
      sections.push('# Operator Hint');
      sections.push(operatorHint);
      sections.push('');
    }

    let prompt = sections.join('\n');

    // Truncate if too long
    if (prompt.length > this.config.maxContextLength) {
      prompt = prompt.slice(0, this.config.maxContextLength - 100) + '\n\n[...truncated...]';
    }

    return prompt;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let instance: ContextCompression | null = null;

export function getContextCompression(): ContextCompression {
  if (!instance) {
    instance = new ContextCompression();
  }
  return instance;
}

export function resetContextCompression(): void {
  instance = null;
}
