import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * Test workspace helper for Phase 15 E2E tests
 * Creates deterministic, lightweight workspaces for testing
 */

export interface TestWorkspace {
  path: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a minimal test workspace for delivery testing
 */
export async function createMinimalWorkspace(): Promise<TestWorkspace> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'knuthflow-test-workspace-'));

  // Create minimal package.json
  await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-app',
    version: '1.0.0',
    scripts: {
      dev: 'echo "dev"',
      build: 'echo "built"',
      test: 'echo "passed"'
    }
  }, null, 2));

  // Create minimal source file
  await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, 'src', 'index.ts'), 'console.log("hello");');

  return {
    path: tmpDir,
    cleanup: async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

/**
 * Create a bootstrapped Ralph workspace for testing
 */
export async function createBootstrappedWorkspace(): Promise<TestWorkspace> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'knuthflow-ralph-workspace-'));

  // Create minimal package.json
  await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-app',
    version: '1.0.0',
    scripts: {
      dev: 'echo "dev"',
      build: 'echo "built"',
      test: 'echo "passed"'
    }
  }, null, 2));

  // Create Ralph control files (bootstrap simulation)
  await fs.writeFile(path.join(tmpDir, 'PROMPT.md'), '# Prompt\nWork on the task.');
  await fs.writeFile(path.join(tmpDir, 'AGENT.md'), '# Agent\nExecute tasks.');
  await fs.writeFile(path.join(tmpDir, 'fix_plan.md'), '- [ ] Implement feature\n- [x] Setup complete');
  await fs.writeFile(path.join(tmpDir, 'SPEC.md'), '# Spec\nSimple test spec.');

  // Create .ralph directory
  await fs.mkdir(path.join(tmpDir, '.ralph'), { recursive: true });

  return {
    path: tmpDir,
    cleanup: async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

/**
 * Create a fully scaffolded workspace with build output
 */
export async function createFullScaffoldedWorkspace(): Promise<TestWorkspace> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'knuthflow-scaffolded-workspace-'));

  // Create minimal package.json
  await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-app',
    version: '1.0.0',
    scripts: {
      dev: 'echo "dev"',
      build: 'mkdir -p dist && echo "built" > dist/output.txt',
      test: 'echo "passed"'
    }
  }, null, 2));

  // Create SPEC.md
  await fs.writeFile(path.join(tmpDir, 'SPEC.md'), '# Test App Spec\n\nA test application.');

  // Create Ralph control files
  await fs.writeFile(path.join(tmpDir, 'PROMPT.md'), '# Prompt\nWork on the task.');
  await fs.writeFile(path.join(tmpDir, 'AGENT.md'), '# Agent\nExecute tasks.');
  await fs.writeFile(path.join(tmpDir, 'fix_plan.md'), '- [x] Task 1\n- [x] Task 2\n- [x] Task 3');

  // Create .ralph directory
  await fs.mkdir(path.join(tmpDir, '.ralph'), { recursive: true });

  // Create scaffold metadata
  await fs.writeFile(path.join(tmpDir, '.ralph.scaffold.json'), JSON.stringify({
    template: 'web',
    appName: 'test-app',
    scaffoldAt: Date.now()
  }, null, 2));

  // Create a build output (simulated)
  await fs.mkdir(path.join(tmpDir, 'dist'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, 'dist', 'output.txt'), 'built');

  // Create source files
  await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, 'src', 'index.ts'), 'console.log("hello");');

  return {
    path: tmpDir,
    cleanup: async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}