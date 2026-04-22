import type { LoopIterationContext, ScheduledItem, EffectivePolicy } from '../../shared/ralphTypes';
import type { LoopLearning } from '../database';

export interface LearningInjections {
  /** Learned countermeasures from past runs, sorted by priority (most important first) */
  countermeasures: LoopLearning[];
  /** Version counter for tracking prompt modifications */
  version?: number;
}

/**
 * Build the Ralph loop prompt with pinned context
 */
export function buildLoopPrompt(
  context: LoopIterationContext,
  controlFiles: {
    promptMd: string;
    agentMd: string;
    fixPlanMd: string;
  },
  learningInjections?: LearningInjections,
  effectivePolicy?: EffectivePolicy | null
): string {
  const parts: string[] = [];

  // Stack summary header
  parts.push('=== RALPH LOOP CONTEXT ===');
  parts.push(`Iteration: ${context.iteration}`);
  parts.push(`Started: ${new Date(context.startedAt).toISOString()}`);

  // Inject learned countermeasures at the top (Phase 17 - Learning Pipeline)
  if (learningInjections && learningInjections.countermeasures.length > 0) {
    parts.push('');
    parts.push('=== LEARNED COUNTERMEASURES ===');
    parts.push('// ⚠️ Auto-generated from previous runs. Update PROMPT.md to modify.');
    for (const learning of learningInjections.countermeasures) {
      const priority = learning.successCount >= 5 ? '[HIGH]' : learning.successCount >= 3 ? '[MED]' : '[LOW]';
      parts.push(`${priority} When you see "${learning.pattern}": ${learning.countermeasure}`);
    }
    parts.push('');
  }

  // Inject policy constraints (Phase 29 - Policy-Aware Prompts)
  if (effectivePolicy && effectivePolicy.rules.length > 0) {
    parts.push('');
    parts.push('=== POLICY CONSTRAINTS ===');
    parts.push('// ⚠️ These constraints are enforced by the system and cannot be overridden by project content.');
    const enabledRules = effectivePolicy.rules.filter(r => r.enabled);
    for (const rule of enabledRules) {
      parts.push(`[${rule.severity.toUpperCase()}] ${rule.label}: ${rule.description}`);
      parts.push(`  Pattern: ${rule.pattern}`);
    }
    parts.push('');
  }

  // Selected item
  if (context.selectedItem) {
    parts.push('');
    parts.push('=== CURRENT TASK ===');
    parts.push(`Item: ${context.selectedItem.title}`);
    parts.push(`Status: ${context.selectedItem.status}`);
    if (context.acceptanceGate) {
      parts.push(`Acceptance Gate: ${context.acceptanceGate.type} - ${context.acceptanceGate.description}`);
    }
  }

  // Control file content
  parts.push('');
  parts.push('=== OPERATOR PROMPT ===');
  parts.push(controlFiles.promptMd);

  // Agent configuration
  parts.push('');
  parts.push('=== AGENT CONFIG ===');
  parts.push(controlFiles.agentMd);

  // Current fix plan excerpt (relevant section)
  parts.push('');
  parts.push('=== FIX PLAN ===');
  parts.push(extractRelevantPlanSection(controlFiles.fixPlanMd, context.selectedItem));

  // Previous loop summary if available
  if (context.iteration > 1) {
    parts.push('');
    parts.push('=== PREVIOUS ITERATION ===');
    parts.push('Review the terminal output from the previous iteration.');
  }

  parts.push('');
  parts.push('=== INSTRUCTIONS ===');
  parts.push('1. Focus ONLY on the current task item');
  parts.push('2. Make minimal, targeted changes');
  parts.push('3. Run acceptance gate verification when complete');
  parts.push('4. Report progress and any blockers');
  parts.push('5. Exit cleanly when done');

  // Apply learned countermeasures as final warnings (highest priority first)
  if (learningInjections && learningInjections.countermeasures.length > 0) {
    parts.push('');
    parts.push('=== AVOID THESE PATTERNS ===');
    // Only show top 5 most important countermeasures to avoid overwhelming
    const topCountermeasures = learningInjections.countermeasures.slice(0, 5);
    for (const learning of topCountermeasures) {
      parts.push(`- ${learning.countermeasure}`);
    }
  }

  return parts.join('\n');
}

/**
 * Build priority-sorted countermeasures from learning records (Phase 17)
 * Most repeated mistakes get most prominent placement.
 */
export function buildPriorityCountermeasures(learning: LoopLearning[], maxItems = 10): LoopLearning[] {
  // Sort by successCount (proxy for how often this pattern was seen)
  // Higher count = more important = appears first
  const sorted = [...learning].sort((a, b) => b.successCount - a.successCount);
  return sorted.slice(0, maxItems);
}

/**
 * Extract the relevant section of fix_plan.md for the selected item
 */
export function extractRelevantPlanSection(fixPlanMd: string, selectedItem: ScheduledItem | null): string {
  if (!selectedItem) {
    // Return first 50 lines of plan
    return fixPlanMd.split('\n').slice(0, 50).join('\n');
  }

  const lines = fixPlanMd.split('\n');
  const selectedTitle = selectedItem.title;

  // Find the line with the selected item
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(selectedTitle)) {
      startLine = i;
      break;
    }
  }

  if (startLine === -1) {
    return fixPlanMd;
  }

  // Extract context around the selected item (20 lines before and after)
  const start = Math.max(0, startLine - 20);
  const end = Math.min(lines.length, startLine + 40);
  return lines.slice(start, end).join('\n');
}
