import { SafetyStop } from '../../shared/ralphTypes';
import { ValidationResult } from './ralphArtifact';

// ─────────────────────────────────────────────────────────────────────────────
// Decision Types
// ─────────────────────────────────────────────────────────────────────────────

export type LoopDecision =
  | 'continue'   // More work to do, proceed to next iteration
  | 'replan'     // Plan needs updating, regenerate before continuing
  | 'pause'      // Wait for operator input
  | 'fail'       // Unrecoverable failure
  | 'complete';  // All work done

export interface DecisionFactors {
  decision: LoopDecision;
  confidence: number; // 0-1, how certain we are
  reasoning: string;
  evidence: string[];
  nextAction?: string;
}

export interface OutputAnalysis {
  completionSignals: CompletionSignal[];
  failureSignals: FailureSignal[];
  noProgressSignals: NoProgressSignal[];
  permissionDenialSignals: PermissionDenialSignal[];
  structuredData: Record<string, unknown>;
  rawText: string;
  distilledSummary: string;
}

export interface CompletionSignal {
  type: 'explicit_done' | 'all_tasks_checked' | 'goal_achieved' | 'clean_exit';
  confidence: number;
  evidence: string;
}

export interface FailureSignal {
  type: 'compilation_error' | 'test_failure' | 'runtime_error' | 'timeout' | 'crash';
  confidence: number;
  evidence: string;
  recoverable: boolean;
}

export interface NoProgressSignal {
  type: 'no_files_changed' | 'same_output' | 'repeated_blocker' | 'stuck_in_loop';
  confidence: number;
  evidence: string;
  iterationCount: number;
}

export interface PermissionDenialSignal {
  type: 'git_denied' | 'npm_denied' | 'file_denied' | 'command_not_found';
  confidence: number;
  evidence: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse Ralph iteration output and extract structured signals.
 */
export function analyzeOutput(
  output: string,
  context: {
    iteration: number;
    selectedItemTitle?: string;
    previousOutputs?: string[];
    validationResult?: ValidationResult;
    safetyStop?: SafetyStop | null;
  }
): OutputAnalysis {
  const signals: OutputAnalysis = {
    completionSignals: [],
    failureSignals: [],
    noProgressSignals: [],
    permissionDenialSignals: [],
    structuredData: {},
    rawText: output,
    distilledSummary: '',
  };

  const lowerOutput = output.toLowerCase();

  // ── Completion Signals ──────────────────────────────────────────────────

  // Explicit "done" statements
  if (/done|completed|finished|all\s+done/i.test(output)) {
    const confidence = extractConfidence(output, ['done', 'completed', 'finished']);
    signals.completionSignals.push({
      type: 'explicit_done',
      confidence,
      evidence: extractEvidence(output, ['done', 'completed', 'finished']),
    });
  }

  // All tasks checked off (in fix_plan.md context)
  if (/all\s+(tasks?|items?)\s+(?:are\s+)?(?:complete|done|checked)/i.test(output)) {
    signals.completionSignals.push({
      type: 'all_tasks_checked',
      confidence: 0.9,
      evidence: 'Output indicates all tasks completed',
    });
  }

  // Clean exit without errors
  if (/no\s+(?:errors?|issues?|failures?)|clean\s+(?:run|exit|completion)/i.test(lowerOutput)) {
    signals.completionSignals.push({
      type: 'clean_exit',
      confidence: 0.7,
      evidence: 'Output indicates clean execution',
    });
  }

  // ── Failure Signals ─────────────────────────────────────────────────────

  // Compilation errors
  if (/error\s+ts\d+|compile\s+error|compilation\s+failed|typescript\s+error/i.test(lowerOutput) ||
      /cannot\s+find\s+(?:name|module|type)/i.test(lowerOutput)) {
    signals.failureSignals.push({
      type: 'compilation_error',
      confidence: 0.9,
      evidence: extractEvidence(output, ['error', 'ts', 'compile']),
      recoverable: true,
    });
  }

  // Test failures
  if (/test\s+(?:s\s+)?failed|(\d+)\s+tests?\s+failed|failing\s+(?:\d+)\s+tests?/i.test(lowerOutput) ||
      /✗|fail\s+(!)?/i.test(output)) {
    signals.failureSignals.push({
      type: 'test_failure',
      confidence: 0.85,
      evidence: extractEvidence(output, ['fail', 'test', 'failed']),
      recoverable: true,
    });
  }

  // Runtime errors
  if (/runtime\s+error|uncaught\s+exception|process\s+crashed|segmentation\s+fault/i.test(lowerOutput) ||
      /referenceerror|typeerror|rangeerror/i.test(output)) {
    signals.failureSignals.push({
      type: 'runtime_error',
      confidence: 0.8,
      evidence: extractEvidence(output, ['error', 'exception', 'crash']),
      recoverable: false,
    });
  }

  // Timeout
  if (context.safetyStop?.reason === 'timeout_iteration' || context.safetyStop?.reason === 'timeout_idle') {
    signals.failureSignals.push({
      type: 'timeout',
      confidence: 1.0,
      evidence: context.safetyStop.message,
      recoverable: true,
    });
  }

  // Crash
  if (/killed\s+by\s+signal|sig(kill|segv|term)|exit\s+code\s+(1|137|139|143)/i.test(lowerOutput)) {
    signals.failureSignals.push({
      type: 'crash',
      confidence: 0.9,
      evidence: extractEvidence(output, ['killed', 'signal', 'crash']),
      recoverable: false,
    });
  }

  // ── No Progress Signals ─────────────────────────────────────────────────

  // No files changed
  if (/no\s+(?:files?|changes?)\s+(?:to|modified|changed|updated)|nothing\s+to\s+commit/i.test(lowerOutput)) {
    signals.noProgressSignals.push({
      type: 'no_files_changed',
      confidence: 0.8,
      evidence: 'Output indicates no files were modified',
      iterationCount: context.iteration,
    });
  }

  // Repeated blocker detection: same error appearing multiple times
  // Check if error/blocked/cannot phrases appear frequently with low diversity
  const blockerRegex = /(?:error|blocked|cannot)/gi;
  const matches = output.match(blockerRegex) || [];
  const totalCount = matches.length;

  // Count unique phrase types (error, blocked, cannot)
  const uniquePhrases = new Set(matches.map(m => m.toLowerCase()));
  const uniqueCount = uniquePhrases.size;

  // If we have many matches but only a few unique types, it's likely a blocker
  // e.g., "error" appearing 6 times = totalCount:6, uniqueCount:1 → blocker
  // e.g., "error" and "cannot" appearing 6 times = totalCount:6, uniqueCount:2 → blocker
  if (totalCount >= 4 && uniqueCount <= 2) {
    signals.noProgressSignals.push({
      type: 'repeated_blocker',
      confidence: 0.7,
      evidence: `Detected repeated blocker phrases (${uniqueCount} unique types: [${[...uniquePhrases].join(', ')}], ${totalCount} total occurrences)`,
      iterationCount: context.iteration,
    });
  }

  // Check for stuck in loop (iteration data suggests same outcome)
  if (context.previousOutputs && context.previousOutputs.length >= 2) {
    const similarity = calculateTextSimilarity(
      context.previousOutputs[context.previousOutputs.length - 1],
      output
    );
    if (similarity > 0.85) {
      signals.noProgressSignals.push({
        type: 'stuck_in_loop',
        confidence: 0.75,
        evidence: `Output similarity ${(similarity * 100).toFixed(0)}% to previous iteration`,
        iterationCount: context.iteration,
      });
    }
  }

  // ── Permission Denial Signals ───────────────────────────────────────────

  // Git permission denied
  if (/git\s+(?:push|pull|commit)\s+.*denied|permission\s+denied.*git/i.test(lowerOutput) ||
      /fatal\s+:?\s+could\s+not\s+(?:create|read|write).*\.git/i.test(lowerOutput)) {
    signals.permissionDenialSignals.push({
      type: 'git_denied',
      confidence: 0.9,
      evidence: extractEvidence(output, ['denied', 'permission', 'git']),
    });
  }

  // npm permission denied
  if (/npm\s+.*denied|eperm\s+|permission\s+denied.*npm/i.test(lowerOutput)) {
    signals.permissionDenialSignals.push({
      type: 'npm_denied',
      confidence: 0.9,
      evidence: extractEvidence(output, ['denied', 'permission', 'npm']),
    });
  }

  // File permission denied
  if (/eacces\s+|permission\s+denied| cannot\s+.*:\s+permission\s+denied/i.test(lowerOutput)) {
    signals.permissionDenialSignals.push({
      type: 'file_denied',
      confidence: 0.9,
      evidence: extractEvidence(output, ['permission', 'denied']),
    });
  }

  // Command not found
  if (/command\s+not\s+found|command\s+(?:is\s+)?not\s+(?:found|recognized)|`.*`\s+not\s+found/i.test(lowerOutput)) {
    signals.permissionDenialSignals.push({
      type: 'command_not_found',
      confidence: 0.8,
      evidence: extractEvidence(output, ['not found', 'command']),
    });
  }

  // ── Structured Data Extraction ─────────────────────────────────────────

  // Try to extract JSON data from output
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      signals.structuredData = JSON.parse(jsonMatch[0]);
    } catch {
      // Not valid JSON, ignore
    }
  }

  // ── Distilled Summary ───────────────────────────────────────────────────

  signals.distilledSummary = distillSummary(signals, context);

  return signals;
}

/**
 * Distill a brief summary from the analysis.
 */
function distillSummary(
  signals: OutputAnalysis,
  context: { iteration: number; selectedItemTitle?: string }
): string {
  const parts: string[] = [];

  parts.push(`Iteration ${context.iteration}`);

  if (context.selectedItemTitle) {
    parts.push(`Task: ${context.selectedItemTitle}`);
  }

  if (signals.completionSignals.length > 0) {
    const top = signals.completionSignals.reduce((a, b) => a.confidence > b.confidence ? a : b);
    parts.push(`Completion: ${top.type} (${(top.confidence * 100).toFixed(0)}% confidence)`);
  }

  if (signals.failureSignals.length > 0) {
    const top = signals.failureSignals.reduce((a, b) => a.confidence > b.confidence ? a : b);
    parts.push(`Failure: ${top.type} (${(top.confidence * 100).toFixed(0)}% confidence)`);
  }

  if (signals.noProgressSignals.length > 0) {
    const top = signals.noProgressSignals.reduce((a, b) => a.confidence > b.confidence ? a : b);
    parts.push(`No Progress: ${top.type} (${(top.confidence * 100).toFixed(0)}% confidence)`);
  }

  if (signals.permissionDenialSignals.length > 0) {
    const top = signals.permissionDenialSignals.reduce((a, b) => a.confidence > b.confidence ? a : b);
    parts.push(`Permission Issue: ${top.type} (${(top.confidence * 100).toFixed(0)}% confidence)`);
  }

  return parts.join(' | ');
}

/**
 * Extract evidence snippet from output.
 */
function extractEvidence(output: string, keywords: string[]): string {
  for (const keyword of keywords) {
    const regex = new RegExp(`.{0,40}${keyword}.{0,40}`, 'i');
    const match = output.match(regex);
    if (match) {
      return match[0].trim().substring(0, 100);
    }
  }
  return output.substring(0, 100);
}

/**
 * Extract confidence score from output.
 */
function extractConfidence(output: string, keywords: string[]): number {
  let base = 0.5;

  for (const keyword of keywords) {
    const count = (output.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
    base += Math.min(count * 0.1, 0.3);
  }

  return Math.min(base, 1.0);
}

/**
 * Calculate text similarity (0-1).
 */
function calculateTextSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const aWords = new Set(a.toLowerCase().split(/\s+/));
  const bWords = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...aWords].filter(x => bWords.has(x)));
  const union = new Set([...aWords, ...bWords]);

  return intersection.size / union.size;
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface DecisionEngineOptions {
  maxIterations: number;
  maxNoProgressIterations: number;
  allowReplan: boolean;
}

/**
 * Make a decision based on output analysis and context.
 */
export function makeDecision(
  analysis: OutputAnalysis,
  options: DecisionEngineOptions,
  context: {
    iteration: number;
    noProgressCount: number;
    validationPassed?: boolean;
    safetyStop?: SafetyStop | null;
    pendingTaskCount?: number;
  }
): DecisionFactors {
  // ── Check for Safety Stops ─────────────────────────────────────────────

  if (context.safetyStop) {
    return makeSafetyDecision(context.safetyStop);
  }

  // ── Check for Completion ───────────────────────────────────────────────

  const strongCompletionSignal = analysis.completionSignals.find(
    s => s.confidence >= 0.8
  );

  if (strongCompletionSignal && context.validationPassed !== false) {
    // Verify no failure signals contradict the completion
    const strongFailureSignal = analysis.failureSignals.find(
      s => s.confidence >= 0.8 && !s.recoverable
    );

    if (!strongFailureSignal) {
      if (context.pendingTaskCount === 0) {
        return {
          decision: 'complete',
          confidence: strongCompletionSignal.confidence,
          reasoning: `Completion signal detected: ${strongCompletionSignal.type}`,
          evidence: [strongCompletionSignal.evidence],
          nextAction: 'All tasks completed, loop can terminate',
        };
      } else {
        return {
          decision: 'continue',
          confidence: strongCompletionSignal.confidence * 0.8,
          reasoning: `Completion signal detected but ${context.pendingTaskCount} tasks remain`,
          evidence: [strongCompletionSignal.evidence],
          nextAction: 'Continue to next pending task',
        };
      }
    }
  }

  // ── Check for Permission Denials ──────────────────────────────────────

  const strongPermissionSignal = analysis.permissionDenialSignals.find(
    s => s.confidence >= 0.8
  );

  if (strongPermissionSignal) {
    return {
      decision: 'fail',
      confidence: strongPermissionSignal.confidence,
      reasoning: `Permission denial detected: ${strongPermissionSignal.type}`,
      evidence: [strongPermissionSignal.evidence],
      nextAction: 'Requires operator intervention - cannot continue without permissions',
    };
  }

  // ── Check for Unrecoverable Failures ───────────────────────────────────

  const unrecoverableFailure = analysis.failureSignals.find(
    s => s.confidence >= 0.7 && !s.recoverable
  );

  if (unrecoverableFailure) {
    return {
      decision: 'fail',
      confidence: unrecoverableFailure.confidence,
      reasoning: `Unrecoverable failure detected: ${unrecoverableFailure.type}`,
      evidence: [unrecoverableFailure.evidence],
      nextAction: 'Requires operator intervention',
    };
  }

  // ── Check for Recoverable Failures ─────────────────────────────────────

  const recoverableFailure = analysis.failureSignals.find(
    s => s.confidence >= 0.7 && s.recoverable
  );

  if (recoverableFailure) {
    // Could replan or continue depending on options
    if (options.allowReplan) {
      return {
        decision: 'replan',
        confidence: recoverableFailure.confidence,
        reasoning: `Recoverable failure detected: ${recoverableFailure.type}. Plan needs adjustment.`,
        evidence: [recoverableFailure.evidence],
        nextAction: 'Regenerate plan with learned constraints',
      };
    } else {
      return {
        decision: 'continue',
        confidence: recoverableFailure.confidence * 0.6,
        reasoning: `Recoverable failure but replanning disabled: ${recoverableFailure.type}`,
        evidence: [recoverableFailure.evidence],
        nextAction: 'Continue iteration despite failure',
      };
    }
  }

  // ── Check for No Progress ──────────────────────────────────────────────

  const strongNoProgressSignal = analysis.noProgressSignals.find(
    s => s.confidence >= 0.7
  );

  if (strongNoProgressSignal) {
    const totalNoProgress = context.noProgressCount + 1;

    if (totalNoProgress >= options.maxNoProgressIterations) {
      return {
        decision: 'fail',
        confidence: strongNoProgressSignal.confidence,
        reasoning: `No progress for ${totalNoProgress} iterations: ${strongNoProgressSignal.type}`,
        evidence: [strongNoProgressSignal.evidence],
        nextAction: 'Stop loop - stuck in no-progress state',
      };
    }

    if (options.allowReplan && totalNoProgress >= 2) {
      return {
        decision: 'replan',
        confidence: strongNoProgressSignal.confidence,
        reasoning: `No progress detected: ${strongNoProgressSignal.type}. Plan needs regeneration.`,
        evidence: [strongNoProgressSignal.evidence],
        nextAction: 'Regenerate plan or skip stale items',
      };
    }

    return {
      decision: 'continue',
      confidence: strongNoProgressSignal.confidence * 0.5,
      reasoning: `No progress detected but will retry: ${strongNoProgressSignal.type}`,
      evidence: [strongNoProgressSignal.evidence],
      nextAction: `Continue (no progress count: ${totalNoProgress})`,
    };
  }

  // ── Check for Validation Failure ─────────────────────────────────────

  if (context.validationPassed === false) {
    if (options.allowReplan) {
      return {
        decision: 'replan',
        confidence: 0.8,
        reasoning: 'Validation failed for current task',
        evidence: ['Acceptance gate did not pass'],
        nextAction: 'Replan with updated acceptance criteria',
      };
    } else {
      return {
        decision: 'continue',
        confidence: 0.5,
        reasoning: 'Validation failed but replanning disabled',
        evidence: ['Acceptance gate did not pass'],
        nextAction: 'Continue to next task despite validation failure',
      };
    }
  }

  // ── Check for Max Iterations ───────────────────────────────────────────

  if (context.iteration >= options.maxIterations) {
    return {
      decision: 'complete',
      confidence: 1.0,
      reasoning: 'Reached maximum iteration limit',
      evidence: [`Iteration ${context.iteration} of ${options.maxIterations}`],
      nextAction: 'Loop complete - reached iteration limit',
    };
  }

  // ── Default: Continue ─────────────────────────────────────────────────

  return {
    decision: 'continue',
    confidence: 0.6,
    reasoning: 'No strong signals detected, continuing iteration',
    evidence: ['Default continuation'],
    nextAction: 'Proceed to next iteration',
  };
}

/**
 * Make decision based on safety stop.
 */
function makeSafetyDecision(safetyStop: SafetyStop): DecisionFactors {
  const reason = safetyStop.reason;
  const message = safetyStop.message;

  let decision: LoopDecision;
  let reasoning: string;

  switch (reason) {
    case 'user_stopped':
      decision = 'pause';
      reasoning = 'User manually stopped the loop';
      break;

    case 'rate_limit':
    case 'circuit_open':
      decision = 'pause';
      reasoning = `Safety circuit engaged: ${message}`;
      break;

    case 'timeout_iteration':
    case 'timeout_idle':
      decision = 'continue'; // Timeout during iteration is recoverable
      reasoning = `Timeout: ${message}. Will retry or move on.`;
      break;

    case 'no_progress':
      decision = 'fail';
      reasoning = `No progress threshold reached: ${message}`;
      break;

    case 'permission_denied':
      decision = 'fail';
      reasoning = `Permission denied: ${message}`;
      break;

    case 'session_expired':
      decision = 'replan'; // Can attempt to create new session
      reasoning = `Session expired: ${message}. Will attempt recovery.`;
      break;

    case 'validation_failed':
      decision = 'replan';
      reasoning = `Validation failed: ${message}`;
      break;

    case 'error':
    default:
      decision = 'fail';
      reasoning = `Error: ${message}`;
      break;
  }

  return {
    decision,
    confidence: 1.0,
    reasoning,
    evidence: [message],
    nextAction: `Safety stop: ${reason}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Loop Summary Generator
// ─────────────────────────────────────────────────────────────────────────────

export interface LoopSummary {
  iteration: number;
  decision: LoopDecision;
  taskTitle: string | null;
  validationPassed: boolean | null;
  completionSummary: string;
  artifactsSummary: string;
  nextSteps: string;
}

/**
 * Generate a concise loop summary for context injection.
 */
export function generateLoopSummary(summary: LoopSummary): string {
  const lines: string[] = [];

  lines.push(`=== LOOP SUMMARY (Iteration ${summary.iteration}) ===`);

  // Format decision with descriptive suffix for clarity
  const decisionLabels: Record<LoopDecision, string> = {
    continue: 'CONTINUE',
    replan: 'REPLAN',
    pause: 'PAUSE',
    fail: 'FAIL',
    complete: 'COMPLETE',
  };
  lines.push(`Decision: ${decisionLabels[summary.decision] || summary.decision.toUpperCase()}`);
  lines.push(`Task: ${summary.taskTitle || 'N/A'}`);

  if (summary.validationPassed !== null) {
    lines.push(`Validation: ${summary.validationPassed ? 'PASSED' : 'FAILED'}`);
  }

  if (summary.completionSummary) {
    lines.push(`Summary: ${summary.completionSummary}`);
  }

  if (summary.artifactsSummary) {
    lines.push(`Artifacts: ${summary.artifactsSummary}`);
  }

  lines.push(`Next: ${summary.nextSteps}`);

  return lines.join('\n');
}
