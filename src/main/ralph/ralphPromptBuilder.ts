import type { LoopIterationContext, ScheduledItem } from '../../shared/ralphTypes';

/**
 * Build the Ralph loop prompt with pinned context
 */
export function buildLoopPrompt(
  context: LoopIterationContext,
  controlFiles: {
    promptMd: string;
    agentMd: string;
    fixPlanMd: string;
  }
): string {
  const parts: string[] = [];

  // Stack summary header
  parts.push('=== RALPH LOOP CONTEXT ===');
  parts.push(`Iteration: ${context.iteration}`);
  parts.push(`Started: ${new Date(context.startedAt).toISOString()}`);

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

  return parts.join('\n');
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
