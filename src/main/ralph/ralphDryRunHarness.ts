import type { SafetyStop } from '../../shared/ralphTypes';
import type { OutputAnalysis, LoopDecision } from './ralphOutputAnalyzer';

// ─────────────────────────────────────────────────────────────────────────────
// Fixture Types
// ─────────────────────────────────────────────────────────────────────────────

export type FixtureType =
  | 'success'
  | 'no_progress'
  | 'permission_denied'
  | 'stale_plan'
  | 'timeout'
  | 'validation_failure'
  | 'compilation_error'
  | 'test_failure';

export interface RalphLoopFixture {
  type: FixtureType;
  iteration: number;
  /** Simulated output from the Ralph iteration */
  output: string;
  /** Simulated validation result */
  validationPassed: boolean;
  /** Simulated safety stop (if any) */
  safetyStop?: SafetyStop | null;
  /** Simulated decision based on this output */
  expectedDecision: LoopDecision;
  /** Metadata for debugging */
  metadata?: Record<string, unknown>;
}

export interface DryRunScenario {
  name: string;
  description: string;
  fixtures: RalphLoopFixture[];
  /** Expected final state after running all fixtures */
  expectedFinalDecision: LoopDecision;
  /** Initial context for the scenario */
  initialContext: {
    iteration: number;
    selectedItemTitle: string;
    pendingTaskCount: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture Factories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a success fixture.
 */
export function createSuccessFixture(
  iteration: number,
  itemTitle: string,
  options?: { metadata?: Record<string, unknown> }
): RalphLoopFixture {
  return {
    type: 'success',
    iteration,
    output: `✓ Completed task: ${itemTitle}
All checks passed.
No errors found.
Everything is working correctly.`,
    validationPassed: true,
    expectedDecision: 'continue',
    metadata: options?.metadata,
  };
}

/**
 * Create a no-progress fixture.
 */
export function createNoProgressFixture(
  iteration: number,
  iterationCount = 1
): RalphLoopFixture {
  return {
    type: 'no_progress',
    iteration,
    output: `Running task...
No files were modified.
Nothing to commit.
Working tree clean.`,
    validationPassed: false,
    expectedDecision: iterationCount >= 3 ? 'fail' : 'continue',
    metadata: { noProgressCount: iterationCount },
  };
}

/**
 * Create a permission denied fixture.
 */
export function createPermissionDeniedFixture(iteration: number): RalphLoopFixture {
  return {
    type: 'permission_denied',
    iteration,
    output: `Error: git push denied
fatal: could not read from remote repository
Permission denied (publickey).
Please ensure you have correct access rights.`,
    validationPassed: false,
    expectedDecision: 'fail',
    metadata: { permissionType: 'git_push' },
  };
}

/**
 * Create a stale plan fixture (plan needs updating but not critical).
 */
export function createStalePlanFixture(
  iteration: number,
  allowReplan = true
): RalphLoopFixture {
  return {
    type: 'stale_plan',
    iteration,
    output: `Task partially completed.
Some files modified but not all.
Warning: plan may be outdated.
Please review and update the plan.`,
    validationPassed: false,
    expectedDecision: allowReplan ? 'replan' : 'continue',
    metadata: { planStaleness: 'moderate' },
  };
}

/**
 * Create a timeout fixture.
 */
export function createTimeoutFixture(iteration: number, idle = true): RalphLoopFixture {
  return {
    type: 'timeout',
    iteration,
    output: idle
      ? `Running... [no output for 5 minutes]
Idle timeout triggered.
No activity detected.`
      : `Processing...
Task taking longer than expected.
Iteration timeout approaching.`,
    validationPassed: false,
    safetyStop: {
      reason: idle ? 'timeout_idle' : 'timeout_iteration',
      message: idle
        ? 'Idle timeout after 30 minutes'
        : 'Iteration timeout after 5 minutes',
      triggeredAt: Date.now(),
      canResume: true,
    },
    expectedDecision: 'continue', // Timeout is recoverable
    metadata: { idle },
  };
}

/**
 * Create a validation failure fixture.
 */
export function createValidationFailureFixture(
  iteration: number,
  reason = 'Test command exited with code 1'
): RalphLoopFixture {
  return {
    type: 'validation_failure',
    iteration,
    output: `Task completed but validation failed:
${reason}
Test failures detected.
Please review the output.`,
    validationPassed: false,
    expectedDecision: 'replan',
    metadata: { validationType: 'test' },
  };
}

/**
 * Create a compilation error fixture.
 */
export function createCompilationErrorFixture(iteration: number): RalphLoopFixture {
  return {
    type: 'compilation_error',
    iteration,
    output: `src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/app.ts(15,20): error TS2339: Property 'foo' does not exist on type 'Bar'.
Compilation failed with 2 errors.`,
    validationPassed: false,
    expectedDecision: 'replan',
    metadata: { errorCount: 2, errorTypes: ['TS2322', 'TS2339'] },
  };
}

/**
 * Create a test failure fixture.
 */
export function createTestFailureFixture(iteration: number): RalphLoopFixture {
  return {
    type: 'test_failure',
    iteration,
    output: `FAIL src/components/Button.test.ts
  Button renders correctly
    expect(received).toBe(expected)
    Expected: "Click me"
    Received: ""

Test Suites: 1 failed, 1 passed
Tests: 1 failed, 5 passed`,
    validationPassed: false,
    expectedDecision: 'replan',
    metadata: { failedTests: 1, totalTests: 6 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario Builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a happy-path scenario with successful iterations.
 */
export function buildHappyPathScenario(
  iterations = 3,
  itemTitle = 'Implement feature X'
): DryRunScenario {
  const fixtures: RalphLoopFixture[] = [];

  for (let i = 1; i <= iterations; i++) {
    if (i < iterations) {
      fixtures.push(createSuccessFixture(i, `Task ${i}: ${itemTitle}`));
    } else {
      // Final iteration signals completion
      fixtures.push({
        type: 'success',
        iteration: i,
        output: `✓ Completed all tasks for: ${itemTitle}
All tasks checked off.
No pending items remain.
Loop can terminate cleanly.`,
        validationPassed: true,
        expectedDecision: 'complete',
        metadata: { finalIteration: true },
      });
    }
  }

  return {
    name: 'happy_path',
    description: 'Successful iterations completing all tasks',
    fixtures,
    expectedFinalDecision: 'complete',
    initialContext: {
      iteration: 1,
      selectedItemTitle: itemTitle,
      pendingTaskCount: iterations,
    },
  };
}

/**
 * Build a scenario with permission denial early on.
 */
export function buildPermissionDeniedScenario(): DryRunScenario {
  return {
    name: 'permission_denied',
    description: 'Permission denial stops the loop',
    fixtures: [
      createSuccessFixture(1, 'Setup task'),
      createPermissionDeniedFixture(2),
    ],
    expectedFinalDecision: 'fail',
    initialContext: {
      iteration: 1,
      selectedItemTitle: 'Setup and configure',
      pendingTaskCount: 5,
    },
  };
}

/**
 * Build a scenario with no progress leading to failure.
 */
export function buildNoProgressScenario(iterationsUntilFail = 3): DryRunScenario {
  const fixtures: RalphLoopFixture[] = [];

  for (let i = 1; i <= iterationsUntilFail + 1; i++) {
    fixtures.push(createNoProgressFixture(i, i));
  }

  return {
    name: 'no_progress',
    description: `No progress for ${iterationsUntilFail + 1} iterations leads to failure`,
    fixtures,
    expectedFinalDecision: 'fail',
    initialContext: {
      iteration: 1,
      selectedItemTitle: 'Implement complex feature',
      pendingTaskCount: 10,
    },
  };
}

/**
 * Build a scenario with validation failures and replanning.
 */
export function buildValidationFailureScenario(): DryRunScenario {
  return {
    name: 'validation_failure_then_success',
    description: 'Validation fails initially, then succeeds after replanning',
    fixtures: [
      createValidationFailureFixture(1, 'Test command failed: npm test returned exit code 1'),
      createStalePlanFixture(2, true),
      createSuccessFixture(3, 'Implement feature X (retry)'),
      createSuccessFixture(4, 'Implement feature Y'),
    ],
    expectedFinalDecision: 'continue',
    initialContext: {
      iteration: 1,
      selectedItemTitle: 'Implement feature X',
      pendingTaskCount: 5,
    },
  };
}

/**
 * Build a recovery scenario after timeout.
 */
export function buildTimeoutRecoveryScenario(): DryRunScenario {
  return {
    name: 'timeout_recovery',
    description: 'Timeout occurs but loop recovers and continues',
    fixtures: [
      createSuccessFixture(1, 'Task 1'),
      createTimeoutFixture(2, false), // iteration timeout
      createSuccessFixture(3, 'Task 2 (retry)'),
    ],
    expectedFinalDecision: 'continue',
    initialContext: {
      iteration: 1,
      selectedItemTitle: 'Long running task',
      pendingTaskCount: 5,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dry Run Harness
// ─────────────────────────────────────────────────────────────────────────────

export interface DryRunResult {
  scenario: string;
  passed: boolean;
  steps: Array<{
    iteration: number;
    fixtureType: FixtureType;
    decision: LoopDecision;
    expectedDecision: LoopDecision;
    match: boolean;
  }>;
  finalDecision: LoopDecision;
  errors: string[];
}

/**
 * Run a dry-run scenario without actually calling Claude API.
 * Useful for validating Ralph loop logic and state transitions.
 */
export async function runDryRun(
  scenario: DryRunScenario,
  decisionFn: (
    analysis: OutputAnalysis,
    options: { maxIterations: number; maxNoProgressIterations: number; allowReplan: boolean },
    context: { iteration: number; noProgressCount: number; validationPassed?: boolean; safetyStop?: SafetyStop | null; pendingTaskCount?: number }
  ) => { decision: LoopDecision; confidence: number; reasoning: string; evidence: string[] }
): Promise<DryRunResult> {
  const steps: DryRunResult['steps'] = [];
  const errors: string[] = [];
  let noProgressCount = 0;
  let currentDecision: LoopDecision = 'continue';

  const decisionOptions = {
    maxIterations: 50,
    maxNoProgressIterations: 3,
    allowReplan: true,
  };

  for (const fixture of scenario.fixtures) {
    // Build context for this iteration
    const context = {
      iteration: fixture.iteration,
      noProgressCount,
      validationPassed: fixture.validationPassed,
      safetyStop: fixture.safetyStop,
      pendingTaskCount: scenario.initialContext.pendingTaskCount - fixture.iteration,
    };

    // Analyze the fixture output
    const analysis: OutputAnalysis = {
      completionSignals: [],
      failureSignals: [],
      noProgressSignals: [],
      permissionDenialSignals: [],
      structuredData: {},
      rawText: fixture.output,
      distilledSummary: '',
    };

    // Parse completion/failure signals based on fixture type
    if (fixture.type === 'success') {
      analysis.completionSignals.push({
        type: 'explicit_done',
        confidence: 0.9,
        evidence: fixture.output,
      });
    } else if (fixture.type === 'no_progress') {
      analysis.noProgressSignals.push({
        type: 'no_files_changed',
        confidence: 0.8,
        evidence: fixture.output,
        iterationCount: fixture.iteration,
      });
    } else if (fixture.type === 'permission_denied') {
      analysis.permissionDenialSignals.push({
        type: 'git_denied',
        confidence: 0.9,
        evidence: fixture.output,
      });
    } else if (fixture.type === 'timeout') {
      if (fixture.safetyStop) {
        analysis.failureSignals.push({
          type: 'timeout',
          confidence: 1.0,
          evidence: fixture.safetyStop.message,
          recoverable: true,
        });
      }
    }

    // Make decision
    const result = decisionFn(analysis, decisionOptions, context);
    currentDecision = result.decision;

    // Check if decision matches expected
    const match = result.decision === fixture.expectedDecision;

    steps.push({
      iteration: fixture.iteration,
      fixtureType: fixture.type,
      decision: result.decision,
      expectedDecision: fixture.expectedDecision,
      match,
    });

    if (!match) {
      errors.push(
        `Iteration ${fixture.iteration}: Expected ${fixture.expectedDecision} but got ${result.decision}`
      );
    }

    // Track no progress
    if (fixture.type === 'no_progress') {
      noProgressCount++;
    } else {
      noProgressCount = 0;
    }

    // Stop if we hit a terminal state
    if (result.decision === 'complete' || result.decision === 'fail') {
      break;
    }
  }

  return {
    scenario: scenario.name,
    passed: errors.length === 0,
    steps,
    finalDecision: currentDecision,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QA Matrix
// ─────────────────────────────────────────────────────────────────────────────

export interface QAMatrixEntry {
  scenario: string;
  description: string;
  path: string[];
  expectedOutcome: string;
  tags: string[];
}

export function buildQAMatrix(): QAMatrixEntry[] {
  return [
    // Happy path
    {
      scenario: 'HP-1',
      description: 'Single successful iteration',
      path: ['start', 'execute', 'validate', 'checkpoint', 'complete'],
      expectedOutcome: 'Loop completes successfully',
      tags: ['happy-path', 'single-iteration'],
    },
    {
      scenario: 'HP-2',
      description: 'Multiple successful iterations',
      path: ['start', 'execute', 'validate', 'checkpoint', 'continue', '...', 'complete'],
      expectedOutcome: 'Loop completes after all tasks done',
      tags: ['happy-path', 'multi-iteration'],
    },

    // No progress
    {
      scenario: 'NP-1',
      description: 'No progress detected after 3 iterations',
      path: ['start', 'execute', 'no-progress', 'execute', 'no-progress', 'execute', 'no-progress', 'fail'],
      expectedOutcome: 'Loop fails after no_progress threshold',
      tags: ['no-progress', 'failure'],
    },

    // Permission denied
    {
      scenario: 'PD-1',
      description: 'Git permission denied',
      path: ['start', 'execute', 'permission-denied', 'fail'],
      expectedOutcome: 'Loop fails with permission_denied reason',
      tags: ['permission-denied', 'failure', 'git'],
    },

    // Timeout recovery
    {
      scenario: 'TO-1',
      description: 'Iteration timeout but recovers',
      path: ['start', 'execute', 'timeout', 'resume', 'execute', 'complete'],
      expectedOutcome: 'Loop resumes after timeout',
      tags: ['timeout', 'recovery'],
    },

    // Validation failure with replan
    {
      scenario: 'VF-1',
      description: 'Validation fails, replan, then succeeds',
      path: ['start', 'execute', 'validation-fail', 'replan', 'execute', 'validate', 'checkpoint', 'continue'],
      expectedOutcome: 'Loop replans and continues',
      tags: ['validation', 'replan'],
    },

    // Stale plan
    {
      scenario: 'SP-1',
      description: 'Stale plan detected and replanned',
      path: ['start', 'execute', 'stale-plan', 'replan', 'execute', 'complete'],
      expectedOutcome: 'Loop regenerates plan and continues',
      tags: ['stale-plan', 'replan'],
    },

    // Crash recovery
    {
      scenario: 'CR-1',
      description: 'Session crashes and is recovered',
      path: ['start', 'execute', 'crash', 'recover', 'resume', 'complete'],
      expectedOutcome: 'Loop recovers from crash',
      tags: ['crash', 'recovery'],
    },
  ];
}

/**
 * Run all QA matrix scenarios (dry-run mode).
 */
export async function runQAMatrix(
  decisionFn: DryRunScenario['fixtures'] extends RalphLoopFixture[] ?
    (analysis: OutputAnalysis, options: any, context: any) => { decision: LoopDecision; confidence: number; reasoning: string; evidence: string[] } :
    never
): Promise<{ passed: number; failed: number; results: DryRunResult[] }> {
  const scenarios: DryRunScenario[] = [
    buildHappyPathScenario(3, 'Implement feature'),
    buildPermissionDeniedScenario(),
    buildNoProgressScenario(3),
    buildValidationFailureScenario(),
    buildTimeoutRecoveryScenario(),
  ];

  const results: DryRunResult[] = [];

  for (const scenario of scenarios) {
    const result = await runDryRun(scenario, decisionFn);
    results.push(result);
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return { passed, failed, results };
}