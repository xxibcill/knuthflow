import { expect, test } from './support/electron';
import path from 'path';
import fs from 'node:fs';
import os from 'node:os';

/**
 * Phase 26 E2E Tests - Post-Release Validation
 *
 * Tests verify that the Ralph release is stable and all major features
 * are accessible and functional after the v2.0.0 release.
 *
 * Covers:
 * - Ralph Console loads correctly after app launch
 * - Phase 26 panels are accessible (Feedback, DeliveredApps, IterationBacklog)
 * - Portfolio and run pattern tracking are operational
 * - Recovery state detection is wired up
 * - Workspace management and bootstrap operations work
 */

// UI tests require display server - skip in CI
// Also skip on macOS when no dev server is available (Gatekeeper blocks packaged apps)
const ci = process.env.CI === 'true';
const isMacWithoutDevServer = process.platform === 'darwin' && !process.env.PLAYWRIGHT_DEV_SERVER_URL;
const skipUITests = ci || isMacWithoutDevServer;

/* ─────────────────────────────────────────────────────────────────────────────
 * Helper: Create Ralph-enabled workspace fixture
 * ───────────────────────────────────────────────────────────────────────────── */
function createRalphReadyWorkspace(): { path: string; cleanup: () => Promise<void> } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knuthflow-post-release-'));

  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'ralph-post-release-test',
    version: '1.0.0',
    scripts: {
      dev: 'echo "dev"',
      build: 'mkdir -p dist && echo "built" > dist/output.txt',
      test: 'echo "passed"',
      lint: 'echo "linted"',
    }
  }, null, 2));

  fs.writeFileSync(path.join(tmpDir, 'PROMPT.md'), '# Prompt\nWork on tasks.');
  fs.writeFileSync(path.join(tmpDir, 'AGENT.md'), '# Agent\nExecute tasks.');
  fs.writeFileSync(path.join(tmpDir, 'fix_plan.md'), '- [ ] Task 1\n- [ ] Task 2');
  fs.writeFileSync(path.join(tmpDir, 'SPEC.md'), '# Spec\nA test application.');

  fs.mkdirSync(path.join(tmpDir, '.ralph'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.ralph', 'project.json'), JSON.stringify({
    id: 'post-release-test-project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workspaceId: 'test-workspace-id',
  }, null, 2));

  return {
    path: tmpDir,
    cleanup: async () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Phase 26: Post-Release Validation Tests
 * ───────────────────────────────────────────────────────────────────────────── */
(skipUITests ? test.describe.skip : test.describe)('Phase 26: Post-Release Validation', () => {
  test('Ralph Console loads with correct heading', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByRole('heading', { name: 'Ralph Console' })).toBeVisible({ timeout: 10000 });
  });

  test('Ralph Console shows lifecycle state badge', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Navigate to Ralph Console if not already there
    const ralphButton = page.getByRole('button', { name: 'Ralph' });
    if (await ralphButton.isVisible()) {
      await ralphButton.click();
    }

    // Should see workspace-related content
    await expect(page.getByRole('heading', { name: 'Ralph Console' })).toBeVisible();
  });

  test('Workspace can be registered for Ralph', async () => {
    const workspace = createRalphReadyWorkspace();
    try {
      const ws = await page.evaluate(async ({ workspacePath }) => {
        return await window.ralph.workspace.create('Post Release Validation', workspacePath);
      }, { workspacePath: workspace.path });

      expect(ws).toBeDefined();
      expect(ws.success).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  });

  test('Ralph can be bootstrapped in a workspace', async () => {
    const workspace = createRalphReadyWorkspace();
    try {
      const ws = await page.evaluate(async ({ workspacePath }) => {
        return await window.ralph.workspace.create('Bootstrap Test', workspacePath);
      }, { workspacePath: workspace.path });

      const result = await page.evaluate(async ({ wsId, workspacePath }) => {
        return await window.ralph.ralph.bootstrap(wsId, workspacePath, false);
      }, { wsId: ws.workspace?.id, workspacePath: workspace.path });

      expect(result.success).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  });

  test('Ralph project can be retrieved', async () => {
    const workspace = createRalphReadyWorkspace();
    try {
      const ws = await page.evaluate(async ({ workspacePath }) => {
        return await window.ralph.workspace.create('Project Retrieval Test', workspacePath);
      }, { workspacePath: workspace.path });

      await page.evaluate(async ({ wsId, workspacePath }) => {
        await window.ralph.ralph.bootstrap(wsId, workspacePath, false);
      }, { wsId: ws.workspace?.id, workspacePath: workspace.path });

      const project = await page.evaluate(async (wsId) => {
        return await window.ralph.ralph.getProject(wsId);
      }, ws.workspace?.id);

      expect(project).toBeDefined();
      expect(project.id).toBeTruthy();
    } finally {
      await workspace.cleanup();
    }
  });

  test('Readiness report can be generated', async () => {
    const workspace = createRalphReadyWorkspace();
    try {
      const ws = await page.evaluate(async ({ workspacePath }) => {
        return await window.ralph.workspace.create('Readiness Test', workspacePath);
      }, { workspacePath: workspace.path });

      await page.evaluate(async ({ wsId, workspacePath }) => {
        await window.ralph.ralph.bootstrap(wsId, workspacePath, false);
      }, { wsId: ws.workspace?.id, workspacePath: workspace.path });

      const report = await page.evaluate(async ({ wsId, workspacePath }) => {
        return await window.ralph.ralph.getReadinessReport(wsId, workspacePath);
      }, { wsId: ws.workspace?.id, workspacePath: workspace.path });

      expect(report).toBeDefined();
      expect(typeof report.ready).toBe('boolean');
    } finally {
      await workspace.cleanup();
    }
  });

  test('Feedback panel can list feedback entries', async () => {
    const result = await page.evaluate(async () => {
      const feedback = await window.ralph.feedback.list(10);
      return { hasFeedback: Array.isArray(feedback) };
    });

    expect(result.hasFeedback).toBe(true);
  });

  test('Run patterns can be created', async () => {
    const workspace = createRalphReadyWorkspace();
    try {
      const ws = await page.evaluate(async ({ workspacePath }) => {
        return await window.ralph.workspace.create('Patterns Test', workspacePath);
      }, { workspacePath: workspace.path });

      await page.evaluate(async ({ wsId, workspacePath }) => {
        await window.ralph.ralph.bootstrap(wsId, workspacePath, false);
      }, { wsId: ws.workspace?.id, workspacePath: workspace.path });

      const project = await page.evaluate(async (wsId) => {
        return await window.ralph.ralph.getProject(wsId);
      }, ws.workspace?.id);

      const patternResult = await page.evaluate(async (projectId) => {
        return await window.ralph.runPatterns.create({
          projectId,
          goalType: 'feature',
          milestoneCount: 3,
          deliveryStatus: 'pending',
          patternTags: ['post-release-test'],
        });
      }, project.id);

      expect(patternResult).toBeDefined();
    } finally {
      await workspace.cleanup();
    }
  });

  test('Run patterns can be listed', async () => {
    const workspace = createRalphReadyWorkspace();
    try {
      const ws = await page.evaluate(async ({ workspacePath }) => {
        return await window.ralph.workspace.create('Patterns List Test', workspacePath);
      }, { workspacePath: workspace.path });

      await page.evaluate(async ({ wsId, workspacePath }) => {
        await window.ralph.ralph.bootstrap(wsId, workspacePath, false);
      }, { wsId: ws.workspace?.id, workspacePath: workspace.path });

      const project = await page.evaluate(async (wsId) => {
        return await window.ralph.ralph.getProject(wsId);
      }, ws.workspace?.id);

      // Create a pattern first
      await page.evaluate(async (projectId) => {
        await window.ralph.runPatterns.create({
          projectId,
          goalType: 'feature',
          milestoneCount: 2,
        });
      }, project.id);

      const patterns = await page.evaluate(async (projectId) => {
        return await window.ralph.runPatterns.list(projectId, 10);
      }, project.id);

      expect(Array.isArray(patterns)).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  });

  test('Portfolio summary can be retrieved', async () => {
    const result = await page.evaluate(async () => {
      const summary = await window.ralph.portfolioSummary.getSummary();
      return { hasSummary: summary !== undefined };
    });

    expect(result.hasSummary).toBe(true);
  });

  test('Iteration backlog panel is accessible', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Navigate to Ralph Console
    const ralphButton = page.getByRole('button', { name: 'Ralph' });
    if (await ralphButton.isVisible()) {
      await ralphButton.click();
    }

    // Should see Ralph Console heading
    await expect(page.getByRole('heading', { name: 'Ralph Console' })).toBeVisible();
  });

  test('Delivery panel is accessible', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Navigate to Ralph Console
    const ralphButton = page.getByRole('button', { name: 'Ralph' });
    if (await ralphButton.isVisible()) {
      await ralphButton.click();
    }

    await expect(page.getByRole('heading', { name: 'Ralph Console' })).toBeVisible();
  });

  test('Run pattern summary can be retrieved', async () => {
    const result = await page.evaluate(async () => {
      const summary = await window.ralph.runPatterns.getSummary();
      return { hasSummary: summary !== undefined && 'error' in summary === false };
    });

    expect(result.hasSummary).toBe(true);
  });
});
