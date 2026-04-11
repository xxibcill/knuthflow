import { getDatabase, LoopLearning, FollowUp } from '../database';
import * as crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Mistake Pattern Detection
// ─────────────────────────────────────────────────────────────────────────────

const PATTERN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export interface MistakePattern {
  type: 'repeated_error' | 'same_fix_failed' | 'path_wrong' | 'timeout_pattern';
  description: string;
  occurrences: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

interface PatternOccurrence {
  iteration: number;
  evidence: string;
  timestamp: number;
}

/**
 * Track mistake patterns across iterations.
 * Exportable for injection in tests or custom implementations.
 */
export class MistakeTracker {
  private patterns: Map<string, PatternOccurrence[]> = new Map();

  /**
   * Record an occurrence of a potential mistake pattern.
   */
  recordOccurrence(patternKey: string, iteration: number, evidence: string): void {
    const now = Date.now();

    if (!this.patterns.has(patternKey)) {
      this.patterns.set(patternKey, []);
    }

    const occurrences = this.patterns.get(patternKey)!;

    // Clean old occurrences
    const validOccurrences = occurrences.filter(o => now - o.timestamp < PATTERN_WINDOW_MS);

    validOccurrences.push({
      iteration,
      evidence,
      timestamp: now,
    });

    this.patterns.set(patternKey, validOccurrences);
  }

  /**
   * Get all detected patterns with their occurrence count.
   */
  getPatterns(): MistakePattern[] {
    const now = Date.now();
    const patterns: MistakePattern[] = [];

    for (const [key, occurrences] of this.patterns) {
      const validOccurrences = occurrences.filter(o => now - o.timestamp < PATTERN_WINDOW_MS);

      if (validOccurrences.length >= 2) {
        const [type, ...descParts] = key.split(':');
        patterns.push({
          type: type as MistakePattern['type'],
          description: descParts.join(':'),
          occurrences: validOccurrences.length,
          firstSeenAt: validOccurrences[0].timestamp,
          lastSeenAt: validOccurrences[validOccurrences.length - 1].timestamp,
        });
      }
    }

    return patterns;
  }

  /**
   * Clear old patterns.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, occurrences] of this.patterns) {
      const validOccurrences = occurrences.filter(o => now - o.timestamp < PATTERN_WINDOW_MS);
      if (validOccurrences.length === 0) {
        this.patterns.delete(key);
      } else {
        this.patterns.set(key, validOccurrences);
      }
    }
  }

  /**
   * Reset all tracked patterns. Useful for testing or when starting a new run.
   */
  reset(): void {
    this.patterns.clear();
  }
}

// Default instance for production use
const defaultMistakeTracker = new MistakeTracker();

/**
 * Get the default MistakeTracker instance.
 * Override with setMistakeTracker() for testing.
 */
let activeTracker: MistakeTracker = defaultMistakeTracker;

/**
 * Set a custom MistakeTracker instance (useful for testing).
 */
export function setMistakeTracker(tracker: MistakeTracker): void {
  activeTracker = tracker;
}

/**
 * Get the active MistakeTracker instance.
 */
export function getMistakeTracker(): MistakeTracker {
  return activeTracker;
}

/**
 * Detect common mistake patterns from output.
 */
export function detectMistakePatterns(params: {
  projectId: string;
  iteration: number;
  output: string;
  previousOutputs: string[];
}): MistakePattern[] {
  const { projectId, iteration, output, previousOutputs } = params;
  const tracker = getMistakeTracker();

  // Check for repeated errors
  if (previousOutputs.length >= 2) {
    const recentOutputs = previousOutputs.slice(-3);
    const repeatedErrors = findRepeatedErrors(output, recentOutputs);

    for (const error of repeatedErrors) {
      const patternKey = `repeated_error:${error}`;
      tracker.recordOccurrence(patternKey, iteration, error);
    }
  }

  // Check for same fix pattern (same diff applied multiple times)
  if (params.output.includes('no files changed') || params.output.includes('nothing to commit')) {
    tracker.recordOccurrence(`same_fix_failed:${params.iteration}`, iteration, 'No progress made');
  }

  // Get all detected patterns
  const detectedPatterns = tracker.getPatterns();

  // Persist patterns to database
  if (detectedPatterns.length > 0) {
    const db = getDatabase();
    for (const pattern of detectedPatterns) {
      db.upsertLoopLearning({
        projectId,
        pattern: pattern.description,
        countermeasure: `Detected ${pattern.occurrences}x - requires operator review`,
        metadata: { type: pattern.type, occurrences: pattern.occurrences },
      });
    }
  }

  // Cleanup old patterns
  tracker.cleanup();

  return detectedPatterns;
}

/**
 * Find errors that appear in current output and recent outputs.
 */
function findRepeatedErrors(currentOutput: string, previousOutputs: string[]): string[] {
  const errors: string[] = [];

  // Extract error lines
  const errorRegex = /error\s+.*|Error:\s*.*|failed.*/gi;
  const currentErrors = (currentOutput.match(errorRegex) || []).map(e => e.toLowerCase().trim());

  for (const prevOutput of previousOutputs) {
    const prevErrors = (prevOutput.match(errorRegex) || []).map(e => e.toLowerCase().trim());

    // Find intersection
    for (const err of currentErrors) {
      if (prevErrors.some(pe => pe.includes(err) || err.includes(pe))) {
        if (!errors.includes(err)) {
          errors.push(err);
        }
      }
    }
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Learning Storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all learning for a project.
 */
export function getLoopLearning(projectId: string): LoopLearning[] {
  const db = getDatabase();
  return db.listLoopLearning(projectId);
}

/**
 * Get actionable (frequent) learning items.
 */
export function getActionableLearning(projectId: string, minOccurrences = 2): LoopLearning[] {
  const db = getDatabase();
  const all = db.listLoopLearning(projectId);
  return all.filter(l => l.successCount >= minOccurrences);
}

/**
 * Generate prompt rules from learning.
 */
export function generateLearningRules(learning: LoopLearning[]): string[] {
  const rules: string[] = [];

  for (const item of learning) {
    rules.push(`When you see "${item.pattern}", ${item.countermeasure}`);
  }

  return rules;
}

/**
 * Generate a learning summary for operator visibility.
 */
export function generateLearningSummary(projectId: string): string {
  const learning = getLoopLearning(projectId);

  if (learning.length === 0) {
    return 'No learning recorded yet.';
  }

  const lines: string[] = [];
  lines.push('## Loop Learning Summary');
  lines.push('');

  for (const item of learning.slice(0, 10)) {
    lines.push(`**${item.pattern}** (seen ${item.successCount}x)`);
    lines.push(`  Countermeasure: ${item.countermeasure}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Follow-up Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get pending follow-ups for a project.
 */
export function getPendingFollowUps(projectId: string): FollowUp[] {
  const db = getDatabase();
  return db.listFollowUps(projectId);
}

/**
 * Resolve a follow-up item.
 */
export function resolveFollowUp(followUpId: string): void {
  const db = getDatabase();
  db.resolveFollowUp(followUpId);
}

/**
 * Create a follow-up from a failed task.
 */
export function createFollowUpFromFailure(params: {
  projectId: string;
  taskId: string;
  taskTitle: string;
  failureReason: string;
}): FollowUp {
  const db = getDatabase();
  const followUp: Omit<FollowUp, 'projectId' | 'resolved' | 'resolvedAt'> = {
    id: `followup-${crypto.randomUUID()}`,
    taskId: params.taskId,
    title: `Re-examine: ${params.taskTitle}`,
    description: `Task failed during execution. Reason: ${params.failureReason}`,
    priority: 'medium',
    createdAt: Date.now(),
    reason: params.failureReason,
  };
  return db.createFollowUp(params.projectId, followUp);
}

/**
 * Generate follow-up report for operator.
 */
export function generateFollowUpReport(projectId: string): string {
  const followUps = getPendingFollowUps(projectId);

  if (followUps.length === 0) {
    return 'No pending follow-ups.';
  }

  const lines: string[] = [];
  lines.push('## Pending Follow-ups');
  lines.push('');

  for (const followUp of followUps) {
    const priorityMarker = followUp.priority === 'high' ? '[HIGH]' :
                           followUp.priority === 'medium' ? '[MED]' : '[LOW]';
    lines.push(`${priorityMarker} **${followUp.title}**`);
    lines.push(`   ${followUp.description}`);
    lines.push('');
  }

  return lines.join('\n');
}
