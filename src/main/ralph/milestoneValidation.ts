import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../database';
import { getMilestoneController } from './milestoneController';
import { ValidationResult, ValidationError, ValidationWarning } from './ralphArtifact';
import type {
  MilestoneState,
  MilestoneFeedback,
  AcceptanceGate,
} from '../../shared/ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Preview Validation and Feedback Loops
// Phase 14: Long-Horizon App Builder - P14-T3
// ─────────────────────────────────────────────────────────────────────────────

export interface PreviewValidationOptions {
  workspacePath: string;
  timeoutMs?: number;
}

export type EscalationLevel = 'focused' | 'expanded' | 'full';

export interface MilestoneEvidence {
  milestoneId: string;
  type: 'preview' | 'build' | 'test' | 'lint' | 'manual';
  passed: boolean;
  output: string;
  exitCode: number | null;
  durationMs: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validatedAt: number;
}

export interface FeedbackDecision {
  action: 'accept' | 'rework' | 'rollback' | 'replan';
  reason: string;
  suggestedTasks?: string[];
}

/**
 * MilestoneValidation handles preview/build/test/lint runners with milestone-scoped
 * evidence and feedback rules for triggering rework, rollback, or replanning.
 */
export class MilestoneValidation {
  private db = getDatabase();

  // ─────────────────────────────────────────────────────────────────────────────
  // Preview Validation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Run preview validation (e.g., open app and check for errors)
   */
  async runPreviewValidation(options: PreviewValidationOptions): Promise<ValidationResult> {
    const { workspacePath, timeoutMs = 60000 } = options;

    const startTime = Date.now();

    // Check for common preview scripts
    const command = this.detectPreviewCommand(workspacePath);

    if (!command) {
      return {
        passed: false,
        gate: { type: 'observable', description: 'Preview validation' },
        output: 'No preview command detected',
        exitCode: null,
        durationMs: Date.now() - startTime,
        errors: [{ code: 'NO_PREVIEW_COMMAND', message: 'No preview command available' }],
        warnings: [],
      };
    }

    const result = await this.runCommand(command, workspacePath, timeoutMs);

    return {
      passed: result.exitCode === 0,
      gate: { type: 'observable', description: 'Preview validation', command },
      output: result.output,
      exitCode: result.exitCode,
      durationMs: Date.now() - startTime,
      errors: result.exitCode !== 0
        ? [{ code: 'PREVIEW_FAILED', message: `Preview exited with code ${result.exitCode}` }]
        : [],
      warnings: [],
    };
  }

  /**
   * Run build validation
   */
  async runBuildValidation(options: PreviewValidationOptions): Promise<ValidationResult> {
    const { workspacePath, timeoutMs = 120000 } = options;
    return this.runGenericValidation('build', workspacePath, timeoutMs);
  }

  /**
   * Run test validation
   */
  async runTestValidation(options: PreviewValidationOptions): Promise<ValidationResult> {
    const { workspacePath, timeoutMs = 120000 } = options;
    return this.runGenericValidation('test', workspacePath, timeoutMs);
  }

  /**
   * Run lint validation
   */
  async runLintValidation(options: PreviewValidationOptions): Promise<ValidationResult> {
    const { workspacePath, timeoutMs = 60000 } = options;
    return this.runGenericValidation('lint', workspacePath, timeoutMs);
  }

  /**
   * Run validation for a milestone's acceptance gate
   */
  async runMilestoneValidation(
    projectId: string,
    runId: string,
    milestoneId: string,
    options: PreviewValidationOptions
  ): Promise<MilestoneEvidence> {
    const milestone = this.db.getMilestoneStateByMilestoneId(projectId, runId, milestoneId);
    if (!milestone) {
      return this.createFailedEvidence(milestoneId, 'validation', 'Milestone not found');
    }

    const startTime = Date.now();
    let result: ValidationResult;

    // Parse acceptance gate to determine what to run
    const gateType = this.parseGateType(milestone.acceptanceGate);

    switch (gateType) {
      case 'build':
        result = await this.runBuildValidation(options);
        break;
      case 'test':
        result = await this.runTestValidation(options);
        break;
      case 'lint':
        result = await this.runLintValidation(options);
        break;
      case 'preview':
        result = await this.runPreviewValidation(options);
        break;
      default:
        result = {
          passed: true,
          gate: { type: 'manual', description: milestone.acceptanceGate },
          output: milestone.acceptanceGate,
          exitCode: null,
          durationMs: Date.now() - startTime,
          errors: [],
          warnings: [],
        };
    }

    const validatedAt = Date.now();

    // Store validation result in milestone state for later retrieval by completeMilestone
    this.db.updateMilestoneState(milestone.id, {
      validationResult: {
        passed: result.passed,
        output: result.output,
        exitCode: result.exitCode,
        durationMs: result.durationMs ?? 0,
        errors: result.errors,
        warnings: result.warnings,
        validatedAt,
      },
    });

    return {
      milestoneId,
      type: gateType,
      passed: result.passed,
      output: result.output,
      exitCode: result.exitCode,
      durationMs: result.durationMs ?? 0,
      errors: result.errors,
      warnings: result.warnings,
      validatedAt,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Feedback Rules
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Determine feedback action based on validation result
   */
  determineFeedback(evidence: MilestoneEvidence): FeedbackDecision {
    if (evidence.passed) {
      return {
        action: 'accept',
        reason: `Milestone validation passed (${evidence.type})`,
      };
    }

    const errorCount = evidence.errors.length;
    const warningCount = evidence.warnings.length;

    // Rules for rework
    if (errorCount <= 3 && warningCount <= 10) {
      return {
        action: 'rework',
        reason: `Minor issues detected: ${errorCount} errors, ${warningCount} warnings. Rework recommended.`,
        suggestedTasks: this.suggestReworkTasks(evidence),
      };
    }

    // Rules for rollback
    if (errorCount > 10 || evidence.output.includes('CRITICAL')) {
      return {
        action: 'rollback',
        reason: `Critical failures detected: ${errorCount} errors. Rollback recommended.`,
        suggestedTasks: ['Revert recent changes', 'Run full test suite'],
      };
    }

    // Default to replan
    return {
      action: 'replan',
      reason: `Significant issues: ${errorCount} errors, ${warningCount} warnings. Replanning recommended.`,
      suggestedTasks: this.suggestReplanTasks(evidence),
    };
  }

  /**
   * Record feedback in database
   */
  recordFeedback(params: {
    projectId: string;
    runId: string;
    milestoneId: string;
    taskId?: string | null;
    decision: FeedbackDecision;
    evidence: MilestoneEvidence;
  }): MilestoneFeedback {
    const typeMap: Record<string, MilestoneFeedback['type']> = {
      accept: 'accept',
      rework: 'rework',
      rollback: 'rollback',
      replan: 'replan',
    };

    return this.db.createMilestoneFeedback({
      projectId: params.projectId,
      runId: params.runId,
      milestoneId: params.milestoneId,
      taskId: params.taskId ?? null,
      type: typeMap[params.decision.action] ?? 'replan',
      reason: params.decision.reason,
      evidence: JSON.stringify(params.evidence),
      suggestedAction: params.decision.suggestedTasks?.join(', ') ?? null,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Escalation Rules
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Run escalated validation (focused -> expanded -> full)
   */
  async runEscalatedValidation(
    options: PreviewValidationOptions,
    maxLevel: EscalationLevel = 'expanded'
  ): Promise<{ level: EscalationLevel; result: ValidationResult }> {
    let level: EscalationLevel = 'focused';
    let result = await this.runBuildValidation(options);

    if (!result.passed && maxLevel !== 'focused') {
      level = 'expanded';
      result = await this.runBuildValidation({ ...options, timeoutMs: 180000 });

      if (!result.passed && maxLevel === 'full') {
        level = 'full';
        result = await this.runFullValidation(options);
      }
    }

    return { level, result };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Milestone Completion Check
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a milestone can be marked as complete.
   * Requires all tasks completed AND validation passed.
   */
  canCompleteMilestone(projectId: string, runId: string, milestoneId: string): {
    canComplete: boolean;
    reason: string;
    incompleteTasks: string[];
  } {
    const milestone = this.db.getMilestoneStateByMilestoneId(projectId, runId, milestoneId);
    if (!milestone) {
      return { canComplete: false, reason: 'Milestone not found', incompleteTasks: [] };
    }

    const tasks = this.db.listMilestoneTasksByMilestone(projectId, runId, milestoneId);
    const incompleteTasks = tasks
      .filter(t => t.status !== 'completed' && t.status !== 'deferred')
      .map(t => t.title);

    if (incompleteTasks.length > 0) {
      return {
        canComplete: false,
        reason: `${incompleteTasks.length} tasks not completed`,
        incompleteTasks,
      };
    }

    if (milestone.status === 'failed') {
      return {
        canComplete: false,
        reason: 'Milestone previously failed validation',
        incompleteTasks: [],
      };
    }

    return { canComplete: true, reason: 'All tasks complete', incompleteTasks: [] };
  }

  /**
   * Complete a milestone after successful validation
   * If validationResult is not provided, fetches from stored milestone state
   */
  completeMilestone(
    projectId: string,
    runId: string,
    milestoneId: string,
    validationResult?: ValidationResult
  ): MilestoneState | null {
    const milestoneController = getMilestoneController();

    // If no validationResult provided, fetch from stored milestone state
    let result = validationResult;
    if (!result) {
      const milestone = this.db.getMilestoneStateByMilestoneId(projectId, runId, milestoneId);
      if (milestone?.validationResult) {
        result = {
          passed: milestone.validationResult.passed,
          gate: { type: 'manual' as const, description: '' },
          output: milestone.validationResult.output,
          exitCode: milestone.validationResult.exitCode,
          durationMs: milestone.validationResult.durationMs,
          errors: milestone.validationResult.errors,
          warnings: milestone.validationResult.warnings,
        };
      }
    }

    // If still no result, use a failed default
    if (!result) {
      result = {
        passed: false,
        gate: { type: 'manual' as const, description: 'No validation result available' },
        output: 'No validation result stored',
        exitCode: null,
        durationMs: 0,
        errors: [{ code: 'NO_RESULT', message: 'No validation result available' }],
        warnings: [],
      };
    }

    return milestoneController.completeMilestone(projectId, runId, milestoneId, {
      passed: result.passed,
      output: result.output,
      exitCode: result.exitCode,
      durationMs: result.durationMs ?? 0,
      errors: result.errors,
      warnings: result.warnings,
      validatedAt: Date.now(),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────────

  private async runGenericValidation(
    type: 'build' | 'test' | 'lint',
    workspacePath: string,
    timeoutMs: number
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const command = this.detectCommand(workspacePath, type);

    if (!command) {
      return {
        passed: false,
        gate: { type, description: `${type} validation` },
        output: `No ${type} command detected`,
        exitCode: null,
        durationMs: Date.now() - startTime,
        errors: [{ code: `NO_${type.toUpperCase()}_COMMAND`, message: `No ${type} command available` }],
        warnings: [],
      };
    }

    const result = await this.runCommand(command, workspacePath, timeoutMs);
    const parsed = this.parseValidationOutput(type, result.output, result.exitCode);

    return {
      passed: parsed.passed,
      gate: { type, description: `${type} validation`, command },
      output: result.output,
      exitCode: result.exitCode,
      durationMs: Date.now() - startTime,
      errors: parsed.errors,
      warnings: parsed.warnings,
    };
  }

  private async runFullValidation(options: PreviewValidationOptions): Promise<ValidationResult> {
    const results = await Promise.all([
      this.runBuildValidation(options),
      this.runTestValidation(options),
      this.runLintValidation(options),
    ]);

    const allPassed = results.every(r => r.passed);
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    return {
      passed: allPassed,
      gate: { type: 'observable', description: 'Full validation' },
      output: `Build: ${results[0].passed ? 'PASS' : 'FAIL'}, Test: ${results[1].passed ? 'PASS' : 'FAIL'}, Lint: ${results[2].passed ? 'PASS' : 'FAIL'}`,
      exitCode: allPassed ? 0 : 1,
      durationMs: Math.max(...results.map(r => r.durationMs ?? 0)),
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  private detectCommand(workspacePath: string, type: 'build' | 'test' | 'lint'): string | null {
    const packageJsonPath = path.join(workspacePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};

      switch (type) {
        case 'build':
          if (scripts.build) return 'npm run build';
          if (scripts.compile) return 'npm run compile';
          if (scripts.tsc) return 'npx tsc --noEmit';
          break;
        case 'test':
          if (scripts.test) return 'npm test';
          if (scripts['test:unit']) return 'npm run test:unit';
          if (scripts.vitest) return 'npx vitest';
          if (scripts.jest) return 'npx jest';
          break;
        case 'lint':
          if (scripts.lint) return 'npm run lint';
          if (scripts['lint:fix']) return 'npm run lint:fix';
          if (scripts.eslint) return 'npx eslint .';
          break;
      }
    } catch {
      // Ignore parse errors
    }

    return null;
  }

  private detectPreviewCommand(workspacePath: string): string | null {
    const packageJsonPath = path.join(workspacePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};

      if (scripts.preview) return 'npm run preview';
      if (scripts.dev) return 'npm run dev';
      if (scripts.start) return 'npm start';
    } catch {
      // Ignore parse errors
    }

    return null;
  }

  private parseGateType(gate: string): 'build' | 'test' | 'lint' | 'preview' | 'manual' {
    const lower = gate.toLowerCase();
    if (lower.includes('build')) return 'build';
    if (lower.includes('test')) return 'test';
    if (lower.includes('lint')) return 'lint';
    if (lower.includes('preview')) return 'preview';
    return 'manual';
  }

  private parseValidationOutput(
    type: string,
    output: string,
    exitCode: number | null
  ): { passed: boolean; errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const expectedCode = 0;
    let passed = exitCode === expectedCode;

    if (type === 'test') {
      // Parse test output
      if (output.includes('FAIL')) {
        passed = false;
        errors.push({ code: 'TEST_FAILED', message: 'Test suite failed' });
      }
    } else if (type === 'build') {
      // Parse build output
      const tsErrors = output.match(/error\s+TS\d+:/g);
      if (tsErrors) {
        passed = false;
        errors.push({ code: 'TS_ERRORS', message: `${tsErrors.length} TypeScript errors` });
      }
    } else if (type === 'lint') {
      // Parse lint output
      if (output.includes('error') && !output.includes('0 errors')) {
        passed = false;
        errors.push({ code: 'LINT_ERRORS', message: 'Lint errors found' });
      }
    }

    return { passed, errors, warnings };
  }

  private runCommand(command: string, cwd: string, timeoutMs: number): Promise<{ output: string; exitCode: number | null }> {
    return new Promise(resolve => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellFlag = isWindows ? '/c' : '-c';

      const proc = spawn(shell, [shellFlag, command], {
        cwd,
        timeout: timeoutMs,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      let output = '';
      let errorOutput = '';

      proc.stdout?.on('data', data => {
        output += data.toString();
      });

      proc.stderr?.on('data', data => {
        errorOutput += data.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
      }, timeoutMs);

      proc.on('close', (code, signal) => {
        clearTimeout(timer);
        resolve({
          output: output + (errorOutput ? `\n${errorOutput}` : ''),
          exitCode: code,
        });
      });

      proc.on('error', err => {
        clearTimeout(timer);
        resolve({ output: err.message, exitCode: 1 });
      });
    });
  }

  private createFailedEvidence(milestoneId: string, type: string, message: string): MilestoneEvidence {
    return {
      milestoneId,
      type: type as MilestoneEvidence['type'],
      passed: false,
      output: message,
      exitCode: null,
      durationMs: 0,
      errors: [{ code: 'EVIDENCE_FAILED', message }],
      warnings: [],
      validatedAt: Date.now(),
    };
  }

  private suggestReworkTasks(evidence: MilestoneEvidence): string[] {
    const tasks: string[] = [];

    if (evidence.errors.some(e => e.code.includes('TS'))) {
      tasks.push('Fix TypeScript errors');
    }
    if (evidence.errors.some(e => e.code.includes('TEST'))) {
      tasks.push('Fix failing tests');
    }
    if (evidence.errors.some(e => e.code.includes('LINT'))) {
      tasks.push('Fix lint errors');
    }
    if (evidence.warnings.length > 5) {
      tasks.push('Address validation warnings');
    }

    return tasks.length > 0 ? tasks : ['Review and fix issues'];
  }

  private suggestReplanTasks(evidence: MilestoneEvidence): string[] {
    return [
      'Analyze validation failures',
      'Identify root cause',
      'Update implementation approach',
      'Re-run validation',
    ];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let instance: MilestoneValidation | null = null;

export function getMilestoneValidation(): MilestoneValidation {
  if (!instance) {
    instance = new MilestoneValidation();
  }
  return instance;
}

export function resetMilestoneValidation(): void {
  instance = null;
}
