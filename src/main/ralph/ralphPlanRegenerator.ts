import * as fs from 'fs';
import * as path from 'path';

import { getDatabase, LoopLearning, FollowUp } from '../database';
import { PlanTask } from '../../shared/ralphTypes';
import { validateWorkspacePath } from './planPathValidator';
import {
  parsePlanContent,
} from './planParser';
import { gatherContextForItem } from './ralphSearchJob';

// FollowUpItem is the type for creating follow-ups (before DB adds projectId, resolved, resolvedAt)
export type FollowUpItem = Omit<FollowUp, 'projectId' | 'resolved' | 'resolvedAt'>;

// ─────────────────────────────────────────────────────────────────────────────
// Plan Regeneration Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RegenerationResult {
  success: boolean;
  newPlanContent: string;
  changes: PlanChange[];
  reasoning: string;
  priorVersion: string;
  snapshots: {
    priorSnapshotId: string | null;
    newSnapshotId: string;
  };
}

export interface PlanChange {
  type: 'added' | 'removed' | 'reordered' | 'priority_changed' | 'description_updated' | 'split';
  taskId: string;
  taskTitle: string;
  before: string | null;
  after: string | null;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Regeneration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Regenerate the fix_plan.md from current repo evidence.
 * Rewrites or reorders tasks based on what was actually observed.
 */
export async function regeneratePlan(params: {
  workspacePath: string;
  projectId: string;
  runId: string;
  iteration: number;
  currentPlanContent: string;
  reason: string;
  learning?: LoopLearning[];
}): Promise<RegenerationResult> {
  const { workspacePath, projectId, runId, iteration, currentPlanContent, reason, learning = [] } = params;
  const db = getDatabase();

  // Validate workspace path
  if (!validateWorkspacePath(workspacePath)) {
    throw new Error(`Invalid workspace path: ${workspacePath}`);
  }

  // Snapshot current plan before modification
  const priorSnapshot = db.createPlanSnapshot(projectId, runId, iteration - 1, currentPlanContent);

  // Parse current plan
  const currentTasks = parsePlanContent(currentPlanContent);

  // Gather evidence from codebase and learning
  const evidence = await gatherRegenerationEvidence(workspacePath, currentTasks, learning);

  // Generate new plan content
  const { newContent, changes } = await generateNewPlan(
    workspacePath,
    currentPlanContent,
    currentTasks,
    evidence,
    reason
  );

  // Write new plan
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
  fs.writeFileSync(fixPlanPath, newContent, 'utf-8');

  // Create new snapshot
  const newSnapshot = db.createPlanSnapshot(projectId, runId, iteration, newContent);

  // Capture any new learning from this regeneration
  for (const change of changes) {
    if (change.type === 'removed' || change.type === 'priority_changed') {
      const followUp = createFollowUpFromChange(change);
      if (followUp) {
        db.createFollowUp(projectId, followUp);
      }
    }
  }

  return {
    success: true,
    newPlanContent: newContent,
    changes,
    reasoning: reason,
    priorVersion: priorSnapshot.id,
    snapshots: {
      priorSnapshotId: priorSnapshot.id,
      newSnapshotId: newSnapshot.id,
    },
  };
}

/**
 * Gather evidence for plan regeneration.
 */
async function gatherRegenerationEvidence(
  workspacePath: string,
  currentTasks: PlanTask[],
  learning: LoopLearning[]
): Promise<Map<string, string>> {
  const evidence = new Map<string, string>();

  // Add learning evidence
  for (const l of learning) {
    evidence.set(`learning:${l.pattern}`, l.countermeasure);
  }

  // Check which tasks are still relevant
  for (const task of currentTasks) {
    if (task.status === 'completed') {
      evidence.set(`task:${task.id}`, 'completed');
    } else if (task.status === 'deferred') {
      evidence.set(`task:${task.id}`, 'deferred');
    } else {
      // Check if task still makes sense given current codebase
      try {
        const { contextPack } = await gatherContextForItem(
          workspacePath,
          task.title,
          task.description
        );
        evidence.set(`task:${task.id}`, contextPack.substring(0, 500));
      } catch {
        evidence.set(`task:${task.id}`, 'context_gathering_failed');
      }
    }
  }

  return evidence;
}

/**
 * Generate new plan content based on evidence.
 */
async function generateNewPlan(
  workspacePath: string,
  currentContent: string,
  currentTasks: PlanTask[],
  evidence: Map<string, string>,
  reason: string
): Promise<{ newContent: string; changes: PlanChange[] }> {
  const changes: PlanChange[] = [];
  const lines = currentContent.split('\n');

  // Process each task line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match task lines
    const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)/);
    if (!taskMatch) continue;

    const [, , checkbox, title] = taskMatch;
    const taskIdMatch = line.match(/\{([a-f0-9-]{36})\}/);
    const taskId = taskIdMatch?.[1] || '';

    // Find matching task in currentTasks
    const task = currentTasks.find(t => t.id === taskId || t.title === title.trim());

    if (!task) continue;

    const taskEvidence = evidence.get(`task:${task.id}`) || '';

    // Check if task is now stale (no longer relevant based on evidence)
    if (taskEvidence === 'completed') {
      // Task was already marked complete
      continue;
    }

    // Check for context drift - if evidence suggests task is no longer relevant
    if (taskEvidence === 'context_gathering_failed' && task.priority > 2) {
      // Low priority task with failed context - might want to defer
      const newLine = line.replace(checkbox === ' ' ? '[-]' : '[x]', '[-]');
      if (newLine !== line) {
        changes.push({
          type: 'priority_changed',
          taskId: task.id,
          taskTitle: task.title,
          before: line.trim(),
          after: newLine.trim(),
          reason: 'Context gathering failed, lowering priority',
        });
        lines[i] = newLine;
      }
    }
  }

  // Add regeneration note at the top if there are significant changes
  if (changes.length > 0) {
    const note = `\n<!-- PLAN REGENERATED: ${reason} -->\n<!-- Changes: ${changes.length} -->\n`;
    lines.unshift(note);
  }

  return {
    newContent: lines.join('\n'),
    changes,
  };
}

/**
 * Create a follow-up item from a plan change.
 */
function createFollowUpFromChange(change: PlanChange): FollowUpItem | null {
  if (change.type === 'removed') {
    return {
      id: `followup-${Date.now()}`,
      taskId: null,
      title: `Investigate: ${change.taskTitle}`,
      description: `Task was removed during plan regeneration. Reason: ${change.reason}`,
      priority: 'medium',
      createdAt: Date.now(),
      reason: `Removed from plan: ${change.reason}`,
    };
  }

  if (change.type === 'priority_changed') {
    return {
      id: `followup-${Date.now()}`,
      taskId: change.taskId,
      title: `Re-evaluate: ${change.taskTitle}`,
      description: `Task priority was adjusted during plan regeneration. ${change.reason}`,
      priority: 'low',
      createdAt: Date.now(),
      reason: `Priority changed: ${change.reason}`,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reorder Plan by Priority
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reorder tasks in fix_plan.md by current priority.
 */
export function reorderPlanByPriority(params: {
  workspacePath: string;
  projectId: string;
  runId: string;
  iteration: number;
  currentPlanContent: string;
}): { newContent: string; changes: PlanChange[] } {
  const { projectId, runId, iteration, currentPlanContent } = params;
  const db = getDatabase();

  const tasks = parsePlanContent(currentPlanContent);

  // Sort pending tasks by priority
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  pendingTasks.sort((a, b) => a.priority - b.priority);

  const changes: PlanChange[] = [];

  // Rebuild plan with reordered tasks
  const newContent = rebuildPlanWithReorderedTasks(currentPlanContent, pendingTasks, tasks, changes);

  // Snapshot if changed
  if (changes.length > 0) {
    db.createPlanSnapshot(projectId, runId, iteration, newContent);
  }

  return { newContent, changes };
}

/**
 * Rebuild plan content with reordered tasks.
 */
function rebuildPlanWithReorderedTasks(
  currentContent: string,
  reorderedTasks: PlanTask[],
  allTasks: PlanTask[],
  changes: PlanChange[]
): string {
  const lines = currentContent.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    // Keep header/comments intact
    if (line.startsWith('#') || line.startsWith('<!--') || line.trim() === '') {
      result.push(line);
      continue;
    }

    // Task lines - keep completed/deferred in place
    const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)/);
    if (taskMatch) {
      const [, , , title] = taskMatch;
      const taskIdMatch = line.match(/\{([a-f0-9-]{36})\}/);
      const taskId = taskIdMatch?.[1] || '';
      const task = allTasks.find(t => t.id === taskId || t.title === title.trim());

      // Keep completed and deferred tasks in their original position
      if (task && (task.status === 'completed' || task.status === 'deferred')) {
        result.push(line);
        continue;
      }

      // Skip pending tasks here - they'll be added in priority order later
      if (task && (task.status === 'pending' || task.status === 'in_progress')) {
        continue;
      }
    }

    result.push(line);
  }

  // Insert pending tasks in priority order after header
  const pendingSection: string[] = [];
  for (const task of reorderedTasks) {
    const originalLine = lines.find(l => l.includes(task.title));
    if (originalLine) {
      pendingSection.push(originalLine);
      // Note: For reorders, before/after show position indices, not content
      // since the line content itself doesn't change - only its position does
      changes.push({
        type: 'reordered',
        taskId: task.id,
        taskTitle: task.title,
        before: null, // Position in original list - not tracked here
        after: null,  // Position in reordered list - not tracked here
        reason: 'Reordered by priority',
      });
    }
  }

  // Insert pending tasks at appropriate position (after header)
  const insertIndex = result.findIndex(l => !l.startsWith('#') && !l.startsWith('<!--') && l.trim() !== '');
  if (insertIndex >= 0) {
    result.splice(insertIndex, 0, ...pendingSection);
  } else {
    result.push(...pendingSection);
  }

  return result.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Loop Learning Capture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Capture a loop learning item (repeated mistake -> new rule).
 */
export function captureLoopLearning(params: {
  projectId: string;
  pattern: string;
  countermeasure: string;
  metadata?: Record<string, unknown>;
}): LoopLearning {
  const db = getDatabase();
  const learning = db.upsertLoopLearning({
    projectId: params.projectId,
    pattern: params.pattern,
    countermeasure: params.countermeasure,
    metadata: params.metadata || {},
  });
  return learning;
}

/**
 * Record that a mistake pattern was seen again.
 */
export function recordMistakePattern(projectId: string, pattern: string): void {
  const db = getDatabase();
  const existing = db.getLoopLearningByPattern(projectId, pattern);

  if (existing) {
    db.updateLoopLearningSuccessCount(existing.id, existing.successCount + 1);
  }
}

/**
 * Get all learning for a project.
 */
export function getProjectLearning(projectId: string): LoopLearning[] {
  const db = getDatabase();
  return db.listLoopLearning(projectId);
}

/**
 * Get high-confidence learning items that should inform replanning.
 */
export function getActionableLearning(projectId: string, minSuccessCount = 2): LoopLearning[] {
  const db = getDatabase();
  const all = db.listLoopLearning(projectId);
  return all.filter(l => l.successCount >= minSuccessCount);
}

/**
 * Generate operator-visible notes explaining why plan was regenerated.
 */
export function generateRegenerationNotes(result: RegenerationResult): string {
  const lines: string[] = [];

  lines.push('## Plan Regeneration Notes');
  lines.push('');
  lines.push(`**Reason:** ${result.reasoning}`);
  lines.push(`**Changes:** ${result.changes.length} task(s) modified`);
  lines.push('');

  if (result.changes.length > 0) {
    lines.push('### Changes Made');
    lines.push('');

    const byType: Record<string, PlanChange[]> = {};
    for (const change of result.changes) {
      if (!byType[change.type]) {
        byType[change.type] = [];
      }
      byType[change.type].push(change);
    }

    for (const [type, changes] of Object.entries(byType)) {
      lines.push(`**${type.replace('_', ' ')}** (${changes.length})`);
      for (const change of changes) {
        lines.push(`- \`${change.taskTitle}\`: ${change.reason}`);
      }
      lines.push('');
    }
  }

  lines.push(`_Generated at ${new Date().toISOString()}_`);

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Follow-up Items
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a follow-up item from a deferred or failed task.
 */
export function createFollowUp(params: {
  projectId: string;
  taskId: string;
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  reason: string;
}): FollowUpItem {
  const db = getDatabase();

  const followUp: FollowUpItem = {
    id: `followup-${Date.now()}`,
    taskId: params.taskId,
    title: params.title,
    description: params.description,
    priority: params.priority || 'medium',
    createdAt: Date.now(),
    reason: params.reason,
  };

  return db.createFollowUp(params.projectId, followUp);
}

/**
 * Get pending follow-up items for a project.
 */
export function getPendingFollowUps(projectId: string): FollowUpItem[] {
  const db = getDatabase();
  return db.listFollowUps(projectId);
}

/**
 * Mark a follow-up as addressed.
 */
export function resolveFollowUp(projectId: string, followUpId: string): void {
  const db = getDatabase();
  db.resolveFollowUp(followUpId);
}
