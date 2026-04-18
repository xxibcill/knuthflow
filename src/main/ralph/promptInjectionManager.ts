import * as fs from 'fs';
import { getDatabase, PromptCountermeasure } from '../database';
import { getLoopLearning, MistakePattern } from './ralphLoopLearner';

// Default configuration
const DEFAULT_THRESHOLD = 3;
const DEFAULT_REMOVAL_THRESHOLD = 5;

/**
 * Prompt Injection Manager for Phase 17
 *
 * Manages automated PROMPT.md countermeasure injection when repeated mistake
 * patterns are detected. Reads existing countermeasures from PROMPT.md,
 * evaluates learning data, and injects/removes countermeasures.
 */

export interface PromptInjectionConfig {
  /** Project ID for scoping countermeasures */
  projectId: string;
  /** Workspace path where PROMPT.md lives */
  workspacePath: string;
  /** Path to PROMPT.md file */
  promptMdPath: string;
  /** Threshold for auto-inject (default: 3 occurrences) */
  threshold?: number;
  /** Threshold for auto-remove (default: 5 consecutive successes) */
  removalThreshold?: number;
  /** Whether to auto-inject without operator approval */
  autoInject?: boolean;
}

export interface InjectionResult {
  injected: string[];
  removed: string[];
  pending: string[];
  active: PromptCountermeasure[];
}

/**
 * Read existing countermeasures from PROMPT.md
 */
export function readExistingCountermeasures(promptMdPath: string): string[] {
  if (!fs.existsSync(promptMdPath)) {
    return [];
  }

  const content = fs.readFileSync(promptMdPath, 'utf-8');
  const lines = content.split('\n');
  const countermeasures: string[] = [];
  let inCountermeasureBlock = false;

  for (const line of lines) {
    if (line.trim() === '// ACTIVE COUNTERMEASURES') {
      inCountermeasureBlock = true;
      continue;
    }
    if (line.trim() === '// END COUNTERMEASURES') {
      inCountermeasureBlock = false;
      continue;
    }
    if (inCountermeasureBlock && line.startsWith('//')) {
      // Remove the // prefix and whitespace
      const countermeasure = line.replace(/^\/\/\s*/, '').trim();
      if (countermeasure) {
        countermeasures.push(countermeasure);
      }
    }
  }

  return countermeasures;
}

/**
 * Check if PROMPT.md has a countermeasures block
 */
export function hasCountermeasuresBlock(promptMdPath: string): boolean {
  if (!fs.existsSync(promptMdPath)) {
    return false;
  }
  const content = fs.readFileSync(promptMdPath, 'utf-8');
  return content.includes('// ACTIVE COUNTERMEASURES');
}

/**
 * Build the countermeasures comment block for PROMPT.md
 */
function buildCountermeasuresBlock(
  countermeasures: PromptCountermeasure[],
  version: number
): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('// ACTIVE COUNTERMEASURES');
  lines.push(`// Version: ${version} | Generated: ${new Date().toISOString()}`);
  lines.push('// ⚠️ Do not edit manually - use ralph:manageCountermeasures to modify');
  lines.push('');

  for (const cm of countermeasures) {
    const status = cm.active ? '[ACTIVE]' : '[PENDING]';
    lines.push(`// ${status} "${cm.pattern}": ${cm.countermeasure}`);
  }

  lines.push('');
  lines.push('// END COUNTERMEASURES');
  lines.push('');

  return lines.join('\n');
}

/**
 * Inject countermeasures into PROMPT.md
 */
export function injectCountermeasures(
  promptMdPath: string,
  countermeasures: PromptCountermeasure[],
  version: number
): void {
  const block = buildCountermeasuresBlock(countermeasures, version);

  if (!fs.existsSync(promptMdPath)) {
    throw new Error(`PROMPT.md not found at: ${promptMdPath}`);
  }

  let content = fs.readFileSync(promptMdPath, 'utf-8');

  // Remove existing countermeasures block if present
  content = removeCountermeasuresBlock(content);

  // Insert new block after the first heading (usually # Ralph or # Operator)
  const headingMatch = content.match(/^#+\s+.+$/m);
  let insertIndex = headingMatch ? content.indexOf(headingMatch[0]) + headingMatch[0].length : 0;

  // Find next newline after heading
  const nextNewline = content.indexOf('\n', insertIndex);
  if (nextNewline !== -1) {
    insertIndex = nextNewline + 1;
  }

  content = content.slice(0, insertIndex) + block + content.slice(insertIndex);

  fs.writeFileSync(promptMdPath, content, 'utf-8');
}

/**
 * Remove countermeasures block from content
 */
function removeCountermeasuresBlock(content: string): string {
  // Remove the countermeasures block
  const startMarker = '// ACTIVE COUNTERMEASURES';
  const endMarker = '// END COUNTERMEASURES';

  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    return content;
  }

  const endIdx = content.indexOf(endMarker);
  if (endIdx === -1) {
    return content;
  }

  // Include the newline before and after the block
  let removeStart = startIdx;
  while (removeStart > 0 && content[removeStart - 1] === '\n') {
    removeStart--;
  }

  let removeEnd = endIdx + endMarker.length;
  while (removeEnd < content.length && content[removeEnd] === '\n') {
    removeEnd++;
  }

  return content.slice(0, removeStart) + content.slice(removeEnd);
}

/**
 * Get or create a countermeasure record for a pattern
 */
export function getOrCreateCountermeasure(
  projectId: string,
  pattern: string,
  countermeasure: string,
  threshold = DEFAULT_THRESHOLD,
  removalThreshold = DEFAULT_REMOVAL_THRESHOLD
): PromptCountermeasure {
  const db = getDatabase();

  let cm = db.getPromptCountermeasure(projectId, pattern);
  if (!cm) {
    cm = db.createPromptCountermeasure({
      projectId,
      pattern,
      countermeasure,
      threshold,
      removalThreshold,
    });
  }

  return cm;
}

/**
 * Update countermeasure after pattern evaluation
 */
export function updateCountermeasureAfterEvaluation(
  countermeasure: PromptCountermeasure,
  patternSeen: boolean,
  autoInject: boolean,
  learning?: ReturnType<typeof getLoopLearning>
): { action: 'inject' | 'remove' | 'pending' | 'none'; needsApproval: boolean } {
  const db = getDatabase();

  if (patternSeen) {
    // Reset consecutive successes
    db.updatePromptCountermeasure(countermeasure.id, {
      consecutiveSuccesses: 0,
    });

    // Check if we should inject
    if (!countermeasure.active && countermeasure.autoInject) {
      // Use provided learning data to avoid repeated DB queries in loops
      const learningData = learning ?? getLoopLearning(countermeasure.projectId);
      const pattern = learningData.find(l => l.pattern === countermeasure.pattern);

      if (pattern && pattern.successCount >= countermeasure.threshold) {
        if (autoInject) {
          db.updatePromptCountermeasure(countermeasure.id, { active: true, injectedAt: Date.now() });
          return { action: 'inject', needsApproval: false };
        } else {
          return { action: 'pending', needsApproval: true };
        }
      }
    }
  } else {
    // Pattern did NOT repeat - increment consecutive successes
    const newConsecutive = countermeasure.consecutiveSuccesses + 1;
    db.updatePromptCountermeasure(countermeasure.id, {
      consecutiveSuccesses: newConsecutive,
    });

    // Check if we should remove
    if (countermeasure.active && newConsecutive >= countermeasure.removalThreshold) {
      db.updatePromptCountermeasure(countermeasure.id, { active: false });
      return { action: 'remove', needsApproval: false };
    }
  }

  return { action: 'none', needsApproval: false };
}

/**
 * Evaluate patterns and manage countermeasures (called at iteration end)
 */
export function evaluateAndUpdateCountermeasures(
  config: PromptInjectionConfig,
  patterns: MistakePattern[]
): InjectionResult {
  const db = getDatabase();
  const threshold = config.threshold ?? DEFAULT_THRESHOLD;
  const removalThreshold = config.removalThreshold ?? DEFAULT_REMOVAL_THRESHOLD;

  const injected: string[] = [];
  const removed: string[] = [];
  const pending: string[] = [];
  const active: PromptCountermeasure[] = [];

  // Get existing countermeasures from database
  const existingCountermeasures = db.listPromptCountermeasures(config.projectId, false);
  const existingByPattern = new Map(existingCountermeasures.map(cm => [cm.pattern, cm]));

  // Fetch learning data once to avoid repeated DB queries in loop (Issue #4)
  const learning = getLoopLearning(config.projectId);

  // Evaluate each detected pattern
  for (const pattern of patterns) {
    const countermeasureText = `Avoid ${pattern.type}: ${pattern.description}`;

    let cm = existingByPattern.get(pattern.description);

    if (!cm) {
      // Create new countermeasure record
      cm = db.createPromptCountermeasure({
        projectId: config.projectId,
        pattern: pattern.description,
        countermeasure: countermeasureText,
        threshold,
        removalThreshold,
        autoInject: config.autoInject ?? true,
      });
    }

    // Update based on pattern occurrence (pass learning to avoid repeated DB queries)
    const result = updateCountermeasureAfterEvaluation(cm, true, config.autoInject ?? true, learning);

    if (result.action === 'inject') {
      injected.push(pattern.description);
    } else if (result.action === 'pending') {
      pending.push(pattern.description);
    }

    // Reload from DB to get updated state
    const updated = db.getPromptCountermeasure(config.projectId, pattern.description);
    if (updated && updated.active) {
      active.push(updated);
    }
  }

  // Check for patterns that should be removed (not seen recently)
  for (const cm of existingCountermeasures) {
    if (!cm.active) continue;

    const patternStillPresent = patterns.some(p => p.description === cm.pattern);
    if (!patternStillPresent) {
      const result = updateCountermeasureAfterEvaluation(cm, false, config.autoInject ?? true, learning);
      if (result.action === 'remove') {
        removed.push(cm.pattern);
        // Reload to get updated state
        const updated = db.getPromptCountermeasure(config.projectId, cm.pattern);
        if (updated && !updated.active) {
          // Already removed
        }
      }
    }
  }

  // Get current active countermeasures
  const currentActive = db.listActivePromptCountermeasures(config.projectId);

  // Inject into PROMPT.md if there are changes
  if (injected.length > 0 || removed.length > 0) {
    try {
      injectCountermeasures(config.promptMdPath, currentActive, Date.now());
    } catch (err) {
      console.error('[PromptInjection] Failed to inject countermeasures:', err);
    }
  }

  return {
    injected,
    removed,
    pending,
    active: currentActive,
  };
}

/**
 * Get current PROMPT.md version counter
 */
export function getPromptVersion(promptMdPath: string): number {
  if (!fs.existsSync(promptMdPath)) {
    return 0;
  }

  const content = fs.readFileSync(promptMdPath, 'utf-8');
  const versionMatch = content.match(/Version:\s*(\d+)/);

  if (versionMatch) {
    return parseInt(versionMatch[1], 10);
  }

  return 0;
}

/**
 * Check if auto-inject is enabled for a project
 */
export function isAutoInjectEnabled(projectId: string): boolean {
  const db = getDatabase();
  const countermeasures = db.listPromptCountermeasures(projectId, false);

  // If any countermeasure has autoInject enabled, consider it enabled
  return countermeasures.some(cm => cm.autoInject);
}

/**
 * Set auto-inject preference for a project
 */
export function setAutoInjectEnabled(projectId: string, enabled: boolean): void {
  const db = getDatabase();
  const countermeasures = db.listPromptCountermeasures(projectId, false);

  for (const cm of countermeasures) {
    db.updatePromptCountermeasure(cm.id, { autoInject: enabled });
  }
}

/**
 * Get all countermeasures for a project
 */
export function getAllCountermeasures(projectId: string): PromptCountermeasure[] {
  const db = getDatabase();
  return db.listPromptCountermeasures(projectId, false);
}

/**
 * Get active countermeasures for a project
 */
export function getActiveCountermeasures(projectId: string): PromptCountermeasure[] {
  const db = getDatabase();
  return db.listActivePromptCountermeasures(projectId);
}

/**
 * Approve a pending countermeasure for injection
 */
export function approveCountermeasure(countermeasureId: string): void {
  const db = getDatabase();
  db.updatePromptCountermeasure(countermeasureId, {
    active: true,
    injectedAt: Date.now(),
  });
}
