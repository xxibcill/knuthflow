import { getDatabase, DeliveryOutcome, LessonsLearned } from '../database';
import { getLoopLearning } from './ralphLoopLearner';

/**
 * Generate lessons learned from a completed run.
 * Called at run completion to create a persistent lesson.
 */
export function generateLessonsFromRun(
  projectId: string,
  runId: string,
  outcome: DeliveryOutcome
): LessonsLearned[] {
  const db = getDatabase();
  const lessons: LessonsLearned[] = [];

  // Get learning records for this project
  const learning = getLoopLearning(projectId);

  // Get delivery metrics for this run
  const metrics = db.getDeliveryMetrics(runId);

  // Generate summary based on outcome
  let summary: string;
  if (outcome === 'success') {
    summary = generateSuccessLesson(learning, metrics);
  } else if (outcome === 'failure') {
    summary = generateFailureLesson(learning, metrics);
  } else {
    summary = generateCancellationLesson(learning, metrics);
  }

  // Create main lesson for the run
  const topPattern = learning.length > 0 ? learning[0] : null;
  const mainLesson = db.createLessonsLearned({
    projectId,
    runId,
    summary,
    pattern: topPattern?.pattern ?? null,
    countermeasure: topPattern?.countermeasure ?? null,
    outcome,
  });
  lessons.push(mainLesson);

  // If there were significant patterns, create individual lessons for each
  if (learning.length > 0 && outcome !== 'success') {
    // Create individual lessons for patterns that appeared frequently
    const significantPatterns = learning.filter(l => l.successCount >= 3);
    for (const pattern of significantPatterns.slice(0, 5)) {
      const patternLesson = db.createLessonsLearned({
        projectId,
        runId,
        summary: `Pattern detected: "${pattern.pattern}" - ${pattern.countermeasure}`,
        pattern: pattern.pattern,
        countermeasure: pattern.countermeasure,
        outcome,
      });
      lessons.push(patternLesson);
    }
  }

  return lessons;
}

/**
 * Generate a lesson summary for successful runs
 */
function generateSuccessLesson(
  learning: ReturnType<typeof getLoopLearning>,
  metrics: { iterationCount?: number; validationPassRate?: number | null } | null
): string {
  const lines: string[] = [];

  lines.push('## Run Completed Successfully');

  if (metrics) {
    lines.push(`- Iterations: ${metrics.iterationCount ?? 'N/A'}`);
    if (metrics.validationPassRate !== null && metrics.validationPassRate !== undefined) {
      lines.push(`- Validation pass rate: ${(metrics.validationPassRate * 100).toFixed(0)}%`);
    }
  }

  if (learning.length > 0) {
    lines.push('');
    lines.push('### Patterns Avoided');
    for (const item of learning.slice(0, 3)) {
      lines.push(`- "${item.pattern}": ${item.countermeasure}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate a lesson summary for failed runs
 */
function generateFailureLesson(
  learning: ReturnType<typeof getLoopLearning>,
  metrics: { iterationCount?: number; validationPassRate?: number | null } | null
): string {
  const lines: string[] = [];

  lines.push('## Run Failed');

  if (metrics) {
    lines.push(`- Iterations completed: ${metrics.iterationCount ?? 'N/A'}`);
    if (metrics.validationPassRate !== null && metrics.validationPassRate !== undefined) {
      lines.push(`- Validation pass rate: ${(metrics.validationPassRate * 100).toFixed(0)}%`);
    }
  }

  if (learning.length > 0) {
    lines.push('');
    lines.push('### Recurring Patterns to Address');
    for (const item of learning.slice(0, 5)) {
      lines.push(`- "${item.pattern}" (seen ${item.successCount}x): ${item.countermeasure}`);
    }
    lines.push('');
    lines.push('Consider updating PROMPT.md with countermeasures for these patterns.');
  } else {
    lines.push('');
    lines.push('No clear patterns detected. Review the run artifacts for specific failure causes.');
  }

  return lines.join('\n');
}

/**
 * Generate a lesson summary for cancelled runs
 */
function generateCancellationLesson(
  learning: ReturnType<typeof getLoopLearning>,
  metrics: { iterationCount?: number } | null
): string {
  const lines: string[] = [];

  lines.push('## Run Cancelled');

  if (metrics) {
    lines.push(`- Iterations completed before cancellation: ${metrics.iterationCount ?? 0}`);
  }

  if (learning.length > 0) {
    lines.push('');
    lines.push('### Patterns Observed Before Cancellation');
    for (const item of learning.slice(0, 3)) {
      lines.push(`- "${item.pattern}": ${item.countermeasure}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get lessons learned summary for operator display
 */
export function getLessonsSummary(projectId: string): string {
  const db = getDatabase();
  const lessons = db.listLessonsLearned(projectId, 10);

  if (lessons.length === 0) {
    return 'No lessons learned yet for this project.';
  }

  const lines: string[] = [];
  lines.push('## Lessons Learned Summary');
  lines.push('');

  for (const lesson of lessons) {
    const outcomeMarker = lesson.outcome === 'success' ? '[OK]' :
                          lesson.outcome === 'failure' ? '[FAIL]' : '[CANCEL]';
    lines.push(`${outcomeMarker} ${lesson.summary.split('\n')[0]}`);
    if (lesson.pattern) {
      lines.push(`   Pattern: ${lesson.pattern}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
