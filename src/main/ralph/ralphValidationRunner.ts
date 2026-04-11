import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { AcceptanceGate } from '../../shared/ralphTypes';
import { ValidationResult, ValidationError, ValidationWarning } from './ralphArtifact';

// ─────────────────────────────────────────────────────────────────────────────
// Validation Runner
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationRunnerOptions {
  workspacePath: string;
  timeoutMs?: number;
}

/**
 * Run acceptance gate validation.
 * Starts narrow and broadens only when needed (escalation rules).
 */
export async function runValidation(
  gate: AcceptanceGate,
  options: ValidationRunnerOptions
): Promise<ValidationResult> {
  const { workspacePath, timeoutMs = 120000 } = options; // 2 minute default

  const startTime = Date.now();

  switch (gate.type) {
    case 'test':
      return runTestValidation(gate, workspacePath, timeoutMs, startTime);
    case 'build':
      return runBuildValidation(gate, workspacePath, timeoutMs, startTime);
    case 'lint':
      return runLintValidation(gate, workspacePath, timeoutMs, startTime);
    case 'observable':
      return runObservableValidation(gate, workspacePath, timeoutMs, startTime);
    case 'manual':
      return runManualValidation(gate, startTime);
    default:
      return {
        passed: false,
        gate,
        output: `Unknown gate type: ${(gate as AcceptanceGate).type}`,
        exitCode: null,
        durationMs: Date.now() - startTime,
        errors: [{ code: 'UNKNOWN_GATE_TYPE', message: `Unknown gate type` }],
        warnings: [],
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Validation
// ─────────────────────────────────────────────────────────────────────────────

async function runTestValidation(
  gate: AcceptanceGate,
  workspacePath: string,
  timeoutMs: number,
  startTime: number
): Promise<ValidationResult> {
  const command = gate.command || detectTestCommand(workspacePath);

  if (!command) {
    return {
      passed: false,
      gate,
      output: 'No test command detected and none specified',
      exitCode: null,
      durationMs: Date.now() - startTime,
      errors: [{ code: 'NO_TEST_COMMAND', message: 'No test command available' }],
      warnings: [],
    };
  }

  const result = await runCommand(command, workspacePath, timeoutMs);
  const durationMs = Date.now() - startTime;

  // Parse test output
  const { passed, errors, warnings } = parseTestOutput(result.output, result.exitCode, gate.expectedExitCode);

  return {
    passed,
    gate,
    output: result.output,
    exitCode: result.exitCode,
    durationMs,
    errors,
    warnings,
  };
}

/**
 * Detect available test command in workspace.
 */
function detectTestCommand(workspacePath: string): string | null {
  const packageJsonPath = path.join(workspacePath, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};

      // Priority order for test commands
      if (scripts.test) return 'npm test';
      if (scripts['test:unit']) return 'npm run test:unit';
      if (scripts['test:ci']) return 'npm run test:ci';
      if (scripts.vitest) return 'npx vitest';
      if (scripts.jest) return 'npx jest';
    } catch (err) {
      console.warn('[ValidationRunner] Failed to parse package.json for test command detection:', err);
    }
  }

  // Check for common test frameworks
  if (fs.existsSync(path.join(workspacePath, 'vitest.config.ts')) ||
      fs.existsSync(path.join(workspacePath, 'vitest.config.js'))) {
    return 'npx vitest';
  }

  if (fs.existsSync(path.join(workspacePath, 'jest.config.js')) ||
      fs.existsSync(path.join(workspacePath, 'jest.config.ts'))) {
    return 'npx jest';
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Validation
// ─────────────────────────────────────────────────────────────────────────────

async function runBuildValidation(
  gate: AcceptanceGate,
  workspacePath: string,
  timeoutMs: number,
  startTime: number
): Promise<ValidationResult> {
  const command = gate.command || detectBuildCommand(workspacePath);

  if (!command) {
    return {
      passed: false,
      gate,
      output: 'No build command detected and none specified',
      exitCode: null,
      durationMs: Date.now() - startTime,
      errors: [{ code: 'NO_BUILD_COMMAND', message: 'No build command available' }],
      warnings: [],
    };
  }

  const result = await runCommand(command, workspacePath, timeoutMs);
  const durationMs = Date.now() - startTime;

  // Parse build output
  const { passed, errors, warnings } = parseBuildOutput(result.output, result.exitCode, gate.expectedExitCode);

  return {
    passed,
    gate,
    output: result.output,
    exitCode: result.exitCode,
    durationMs,
    errors,
    warnings,
  };
}

/**
 * Detect available build command in workspace.
 */
function detectBuildCommand(workspacePath: string): string | null {
  const packageJsonPath = path.join(workspacePath, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};

      // Priority order for build commands
      if (scripts.build) return 'npm run build';
      if (scripts.compile) return 'npm run compile';
      if (scripts['build:prod']) return 'npm run build:prod';
      if (scripts.tsc) return 'npx tsc --noEmit';
    } catch (err) {
      console.warn('[ValidationRunner] Failed to parse package.json for build command detection:', err);
    }
  }

  // TypeScript project
  if (fs.existsSync(path.join(workspacePath, 'tsconfig.json'))) {
    return 'npx tsc --noEmit';
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lint Validation
// ─────────────────────────────────────────────────────────────────────────────

async function runLintValidation(
  gate: AcceptanceGate,
  workspacePath: string,
  timeoutMs: number,
  startTime: number
): Promise<ValidationResult> {
  const command = gate.command || detectLintCommand(workspacePath);

  if (!command) {
    return {
      passed: false,
      gate,
      output: 'No lint command detected and none specified',
      exitCode: null,
      durationMs: Date.now() - startTime,
      errors: [{ code: 'NO_LINT_COMMAND', message: 'No lint command available' }],
      warnings: [],
    };
  }

  const result = await runCommand(command, workspacePath, timeoutMs);
  const durationMs = Date.now() - startTime;

  // Parse lint output
  const { passed, errors, warnings } = parseLintOutput(result.output, result.exitCode, gate.expectedExitCode);

  return {
    passed,
    gate,
    output: result.output,
    exitCode: result.exitCode,
    durationMs,
    errors,
    warnings,
  };
}

/**
 * Detect available lint command in workspace.
 */
function detectLintCommand(workspacePath: string): string | null {
  const packageJsonPath = path.join(workspacePath, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};

      // Priority order for lint commands
      if (scripts.lint) return 'npm run lint';
      if (scripts['lint:fix']) return 'npm run lint:fix';
      if (scripts.eslint) return 'npx eslint .';
    } catch (err) {
      console.warn('[ValidationRunner] Failed to parse package.json for lint command detection:', err);
    }
  }

  // ESLint config
  if (fs.existsSync(path.join(workspacePath, '.eslintrc.js')) ||
      fs.existsSync(path.join(workspacePath, '.eslintrc.json')) ||
      fs.existsSync(path.join(workspacePath, '.eslintrc'))) {
    return 'npx eslint .';
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Observable Validation
// ─────────────────────────────────────────────────────────────────────────────

async function runObservableValidation(
  gate: AcceptanceGate,
  workspacePath: string,
  timeoutMs: number,
  startTime: number
): Promise<ValidationResult> {
  // Observable gates run a custom command and check for specific output patterns
  if (!gate.command) {
    return {
      passed: false,
      gate,
      output: 'Observable gate requires a command',
      exitCode: null,
      durationMs: Date.now() - startTime,
      errors: [{ code: 'NO_OBSERVABLE_COMMAND', message: 'Observable gate requires a command' }],
      warnings: [],
    };
  }

  const result = await runCommand(gate.command, workspacePath, timeoutMs);
  const durationMs = Date.now() - startTime;

  // Observable gates just check exit code
  const expectedCode = gate.expectedExitCode ?? 0;
  const passed = result.exitCode === expectedCode;

  return {
    passed,
    gate,
    output: result.output,
    exitCode: result.exitCode,
    durationMs,
    errors: passed ? [] : [{ code: 'OBSERVABLE_FAILED', message: `Observable check failed with exit code ${result.exitCode}` }],
    warnings: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Validation
// ─────────────────────────────────────────────────────────────────────────────

async function runManualValidation(
  gate: AcceptanceGate,
  startTime: number
): Promise<ValidationResult> {
  return {
    passed: true, // Manual gates are always "passed" - operator decides
    gate,
    output: gate.description || 'Manual acceptance gate - operator verification required',
    exitCode: null,
    durationMs: Date.now() - startTime,
    errors: [],
    warnings: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Execution
// ─────────────────────────────────────────────────────────────────────────────

interface CommandResult {
  output: string;
  exitCode: number | null;
  signal?: number | null;
}

function runCommand(command: string, cwd: string, timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve) => {
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

    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr?.on('data', (data) => {
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
        signal: signal ? (isWindows ? null : 1) : null,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        output: err.message,
        exitCode: 1,
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Output Parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseTestOutput(
  output: string,
  exitCode: number | null,
  expectedExitCode?: number
): { passed: boolean; errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let passed = true;

  const expectedCode = expectedExitCode ?? 0;

  // Check exit code
  if (exitCode !== expectedCode) {
    passed = false;
    errors.push({
      code: 'TEST_FAILED',
      message: `Test command exited with code ${exitCode}, expected ${expectedCode}`,
    });
  }

  // Try to parse test framework output
  // Vitest
  if (output.includes('✓') || output.includes('✗') || output.includes('FAIL')) {
    const testResults = output.match(/(✓|✗|×|PASS|FAIL)\s+.*/g);
    if (testResults) {
      for (const result of testResults) {
        if (result.includes('✗') || result.includes('×') || result.includes('FAIL')) {
          errors.push({
            code: 'TEST_CASE_FAILED',
            message: result.trim().substring(0, 200),
          });
          passed = false;
        }
      }
    }
  }

  // Jest
  const jestMatch = output.match(/Tests:\s+(?:(\d+)\s+passed,\s+)?(\d+)\s+failed/);
  if (jestMatch) {
    const failed = parseInt(jestMatch[2], 10);
    if (failed > 0) {
      passed = false;
      errors.push({
        code: 'JEST_TESTS_FAILED',
        message: `${failed} test(s) failed`,
      });
    }
  }

  // Test count
  const testCountMatch = output.match(/(\d+)\s+(?:test|spec)s?\s+(?:passed|failed)/i);
  if (testCountMatch && exitCode === expectedCode) {
    passed = true; // Override if exit code matches
  }

  return { passed, errors, warnings };
}

function parseBuildOutput(
  output: string,
  exitCode: number | null,
  expectedExitCode?: number
): { passed: boolean; errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let passed = true;

  const expectedCode = expectedExitCode ?? 0;

  // Check exit code
  if (exitCode !== expectedCode) {
    passed = false;
    errors.push({
      code: 'BUILD_FAILED',
      message: `Build command exited with code ${exitCode}, expected ${expectedCode}`,
    });
  }

  // TypeScript errors
  const tsErrors = output.match(/error\s+TS\d+:\s+.+/g);
  if (tsErrors) {
    for (const error of tsErrors) {
      passed = false;
      const match = error.match(/(.+)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.+)/);
      if (match) {
        errors.push({
          code: `TS${match[4]}`,
          message: match[5],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
        });
      } else {
        errors.push({
          code: 'TSC_ERROR',
          message: error,
        });
      }
    }
  }

  // ESBuild errors
  const esbuildErrors = output.match(/✗\s+.+/g);
  if (esbuildErrors) {
    for (const error of esbuildErrors) {
      passed = false;
      errors.push({
        code: 'ESBUILD_ERROR',
        message: error.replace('✗ ', '').trim(),
      });
    }
  }

  return { passed, errors, warnings };
}

function parseLintOutput(
  output: string,
  exitCode: number | null,
  expectedExitCode?: number
): { passed: boolean; errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let passed = true;

  const expectedCode = expectedExitCode ?? 0;

  // ESLint exits with 1 if there are errors, 0 if clean
  if (exitCode !== expectedCode) {
    passed = false;
    errors.push({
      code: 'LINT_FAILED',
      message: `Lint command exited with code ${exitCode}, expected ${expectedCode}`,
    });
  }

  // Parse ESLint errors
  const eslintErrors = output.match(/.+\[\d+m\s+(error|warning)\s+\d+:\d+\s+(.+?)\s+(.+?)(\s+\d+:\d+)?\s+\[.+?\]/g);
  if (eslintErrors) {
    for (const error of eslintErrors) {
      const match = error.match(/.+\[\d+m\s+(error|warning)\s+\d+:\d+\s+(.+?)\s+(.+?)(\s+\d+:\d+)?\s+\[.+?\]/);
      if (match) {
        if (match[1] === 'error') {
          errors.push({
            code: 'ESLINT_ERROR',
            message: `${match[2]}: ${match[3]}`,
          });
        } else {
          warnings.push({
            code: 'ESLINT_WARNING',
            message: `${match[2]}: ${match[3]}`,
          });
        }
      }
    }
  }

  // Check for "0 errors" pattern
  if (output.includes('0 errors') || output.includes('No ESLint errors')) {
    passed = true;
  }

  return { passed, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Escalation Rules
// ─────────────────────────────────────────────────────────────────────────────

export type EscalationLevel = 'focused' | 'expanded' | 'full';

export interface EscalationResult {
  level: EscalationLevel;
  validation: ValidationResult;
  escalatedFrom: EscalationLevel | null;
}

/**
 * Escalate validation from focused to broader checks.
 * Only escalates when focused validation fails and we need more context.
 */
export async function runEscalatedValidation(
  gate: AcceptanceGate,
  options: ValidationRunnerOptions,
  maxLevel: EscalationLevel = 'expanded'
): Promise<EscalationResult> {
  // Start with focused validation (if applicable)
  let currentLevel: EscalationLevel = 'focused';
  let validation = await runValidation(gate, options);

  if (validation.passed) {
    return { level: currentLevel, validation, escalatedFrom: null };
  }

  // If focused failed and we can escalate, try expanded
  if (currentLevel === 'focused' && maxLevel !== 'focused') {
    currentLevel = 'expanded';
    // Re-run with expanded scope - for now, just re-run the same validation
    validation = await runValidation(gate, options);
  }

  // If expanded failed and we can escalate to full
  if (currentLevel === 'expanded' && maxLevel === 'full') {
    currentLevel = 'full';
    // Full validation runs all checks - for now, just re-run
    validation = await runValidation(gate, options);
  }

  return { level: currentLevel, validation, escalatedFrom: currentLevel === 'focused' ? null : 'focused' };
}
