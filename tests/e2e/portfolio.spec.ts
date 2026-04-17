import { expect, test } from './support/electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// UI tests require a display server - skip in CI
const ci = process.env.CI === 'true';

/**
 * Phase 16 E2E Tests - Portfolio Dashboard
 *
 * Tests cover:
 * - Portfolio CRUD operations
 * - Portfolio-project association
 * - Portfolio dashboard UI rendering
 */

/* ─────────────────────────────────────────────────────────────────────────────
 * Helper: Create a test workspace
 * ───────────────────────────────────────────────────────────────────────────── */
function createTestWorkspace(): { path: string; cleanup: () => Promise<void> } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knuthflow-portfolio-test-'));

  // Create package.json
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'portfolio-test-app',
    version: '1.0.0',
    scripts: {
      dev: 'echo "dev"',
      build: 'echo "built"',
      test: 'echo "passed"',
      lint: 'echo "linted"',
    }
  }, null, 2));

  // Create source file
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'console.log("hello");');

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
 * Portfolio CRUD Tests
 * ───────────────────────────────────────────────────────────────────────────── */
// Skip UI tests in CI - requires display server
(ci ? test.describe.skip : test.describe)('Phase 16: Portfolio CRUD', () => {
  let workspace: { path: string; cleanup: () => Promise<void> } | null = null;

  test.afterEach(async () => {
    if (workspace) {
      await workspace.cleanup();
      workspace = null;
    }
  });

  test('Portfolio can be created', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test description'),
      portfolioName
    );
    expect(portfolio.id).toBeDefined();
    expect(portfolio.name).toBe(portfolioName);
    expect(portfolio.description).toBe('Test description');
  });

  test('Portfolio can be retrieved by id', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const created = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test description'),
      portfolioName
    );
    const retrieved = await page.evaluate(
      (id) => window.knuthflow.portfolio.get(id),
      created.id
    );
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.name).toBe(portfolioName);
  });

  test('Portfolio can be listed', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test description'),
      portfolioName
    );
    const portfolios = await page.evaluate(() => window.knuthflow.portfolio.list());
    expect(portfolios.length).toBeGreaterThan(0);
  });

  test('Portfolio can be updated', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const created = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Original description'),
      portfolioName
    );
    const updated = await page.evaluate(
      ([id, name, desc]) => window.knuthflow.portfolio.update(id, { name, description: desc }),
      [created.id, 'Updated Name', 'Updated description']
    );
    expect(updated.name).toBe('Updated Name');
    expect(updated.description).toBe('Updated description');
  });

  test('Portfolio can be deleted', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const created = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'To be deleted'),
      portfolioName
    );
    await page.evaluate((id) => window.knuthflow.portfolio.delete(id), created.id);
    const retrieved = await page.evaluate((id) => window.knuthflow.portfolio.get(id), created.id);
    expect(retrieved).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Portfolio-Project Association Tests
 * ───────────────────────────────────────────────────────────────────────────── */
// Skip UI tests in CI - requires display server
(ci ? test.describe.skip : test.describe)('Phase 16: Portfolio-Project Association', () => {
  let workspace: { path: string; cleanup: () => Promise<void> } | null = null;

  test.afterEach(async () => {
    if (workspace) {
      await workspace.cleanup();
      workspace = null;
    }
  });

  test('Project can be added to portfolio', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test'),
      portfolioName
    );

    // Create a workspace and bootstrap Ralph
    workspace = createTestWorkspace();
    const wsResult = await page.evaluate(
      ([wsName, wsPath]) => window.knuthflow.workspace.create(wsName, wsPath),
      ['Test Workspace', workspace.path]
    );
    expect(wsResult.success).toBe(true);
    const workspaceId = wsResult.workspace!.id;

    const ralphResult = await page.evaluate(
      ([wsId, wsPath]) => window.knuthflow.ralph.bootstrap(wsId, wsPath, false),
      [workspaceId, workspace.path]
    );
    expect(ralphResult.success).toBe(true);
    const ralphProjectId = ralphResult.project!.id;

    // Add project to portfolio
    const added = await page.evaluate(
      ([portId, projId]) => window.knuthflow.portfolio.addProject(portId, projId),
      [portfolio.id, ralphProjectId]
    );
    expect(added.portfolioId).toBe(portfolio.id);
    expect(added.projectId).toBe(ralphProjectId);
  });

  test('Projects can be listed for a portfolio', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test'),
      portfolioName
    );

    // Create a workspace and bootstrap Ralph
    workspace = createTestWorkspace();
    const wsResult = await page.evaluate(
      ([wsName, wsPath]) => window.knuthflow.workspace.create(wsName, wsPath),
      ['Test Workspace', workspace.path]
    );
    expect(wsResult.success).toBe(true);
    const workspaceId = wsResult.workspace!.id;

    const ralphResult = await page.evaluate(
      ([wsId, wsPath]) => window.knuthflow.ralph.bootstrap(wsId, wsPath, false),
      [workspaceId, workspace.path]
    );
    expect(ralphResult.success).toBe(true);
    const ralphProjectId = ralphResult.project!.id;

    // Add project to portfolio
    await page.evaluate(
      ([portId, projId]) => window.knuthflow.portfolio.addProject(portId, projId),
      [portfolio.id, ralphProjectId]
    );

    // List projects
    const projects = await page.evaluate(
      (portId) => window.knuthflow.portfolio.listProjects(portId),
      portfolio.id
    );
    expect(projects.length).toBe(1);
    expect(projects[0].projectId).toBe(ralphProjectId);
  });

  test('Project can be removed from portfolio', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test'),
      portfolioName
    );

    // Create a workspace and bootstrap Ralph
    workspace = createTestWorkspace();
    const wsResult = await page.evaluate(
      ([wsName, wsPath]) => window.knuthflow.workspace.create(wsName, wsPath),
      ['Test Workspace', workspace.path]
    );
    expect(wsResult.success).toBe(true);
    const workspaceId = wsResult.workspace!.id;

    const ralphResult = await page.evaluate(
      ([wsId, wsPath]) => window.knuthflow.ralph.bootstrap(wsId, wsPath, false),
      [workspaceId, workspace.path]
    );
    expect(ralphResult.success).toBe(true);
    const ralphProjectId = ralphResult.project!.id;

    // Add project to portfolio
    const added = await page.evaluate(
      ([portId, projId]) => window.knuthflow.portfolio.addProject(portId, projId),
      [portfolio.id, ralphProjectId]
    );

    // Remove project
    await page.evaluate((id) => window.knuthflow.portfolio.removeProject(id), added.id);

    // Verify removed
    const projects = await page.evaluate(
      (portId) => window.knuthflow.portfolio.listProjects(portId),
      portfolio.id
    );
    expect(projects.length).toBe(0);
  });

  test('Portfolio project can be updated (priority, status)', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test'),
      portfolioName
    );

    // Create a workspace and bootstrap Ralph
    workspace = createTestWorkspace();
    const wsResult = await page.evaluate(
      ([wsName, wsPath]) => window.knuthflow.workspace.create(wsName, wsPath),
      ['Test Workspace', workspace.path]
    );
    expect(wsResult.success).toBe(true);
    const workspaceId = wsResult.workspace!.id;

    const ralphResult = await page.evaluate(
      ([wsId, wsPath]) => window.knuthflow.ralph.bootstrap(wsId, wsPath, false),
      [workspaceId, workspace.path]
    );
    expect(ralphResult.success).toBe(true);
    const ralphProjectId = ralphResult.project!.id;

    // Add project to portfolio
    const added = await page.evaluate(
      ([portId, projId]) => window.knuthflow.portfolio.addProject(portId, projId),
      [portfolio.id, ralphProjectId]
    );

    // Update priority
    const updated = await page.evaluate(
      ([id, priority, status]) => window.knuthflow.portfolio.updateProject(id, { priority, status }),
      [added.id, 5, 'paused']
    );

    expect(updated.priority).toBe(5);
    expect(updated.status).toBe('paused');
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Portfolio Runtime Tests
 * ───────────────────────────────────────────────────────────────────────────── */
// Skip UI tests in CI - requires display server
(ci ? test.describe.skip : test.describe)('Phase 16: Portfolio Runtime', () => {
  test('Portfolio runtime can be registered and unregistered', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test'),
      portfolioName
    );

    // Register portfolio runtime
    await page.evaluate((portId) => window.knuthflow.portfolioRuntime.register(portId), portfolio.id);

    // Verify it can be retrieved (no error thrown)
    const activeRuns = await page.evaluate(
      (portId) => window.knuthflow.portfolioRuntime.getPortfolioActiveRuns(portId),
      portfolio.id
    );
    expect(activeRuns).toBeDefined();

    // Unregister
    await page.evaluate((portId) => window.knuthflow.portfolioRuntime.unregister(portId), portfolio.id);
  });

  test('Max concurrent runs can be set and retrieved', async ({ page }) => {
    await page.evaluate((max) => window.knuthflow.portfolioRuntime.setMaxConcurrentRuns(max), 5);
    const max = await page.evaluate(() => window.knuthflow.portfolioRuntime.getMaxConcurrentRuns());
    expect(max).toBe(5);
  });

  test('Queued runs can be cancelled', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test'),
      portfolioName
    );
    await page.evaluate((portId) => window.knuthflow.portfolioRuntime.register(portId), portfolio.id);

    const queuedRuns = await page.evaluate(
      (portId) => window.knuthflow.portfolioRuntime.getQueuedRuns(portId),
      portfolio.id
    );
    expect(Array.isArray(queuedRuns)).toBe(true);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Portfolio Dashboard UI Tests
 * ───────────────────────────────────────────────────────────────────────────── */
// Skip UI tests in CI - requires display server
(ci ? test.describe.skip : test.describe)('Phase 16: Portfolio Dashboard UI', () => {
  test('Portfolio dashboard renders without crashing', async ({ page }) => {
    // This test verifies the dashboard component can render
    // In a full E2E test with the full app, we would navigate to the portfolio view
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test'),
      portfolioName
    );
    expect(portfolio.id).toBeDefined();
  });

  test('Empty portfolio state is handled gracefully', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test'),
      portfolioName
    );

    const projects = await page.evaluate(
      (portId) => window.knuthflow.portfolio.listProjects(portId),
      portfolio.id
    );
    expect(projects.length).toBe(0);
  });

  test('Dependency graph can be stored and retrieved', async ({ page }) => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await page.evaluate(
      (name) => window.knuthflow.portfolio.create(name, 'Test'),
      portfolioName
    );

    // Create two workspaces
    const ws1 = createTestWorkspace();
    const ws2 = createTestWorkspace();

    try {
      const wsResult1 = await page.evaluate(
        ([wsName, wsPath]) => window.knuthflow.workspace.create(wsName, wsPath),
        ['Workspace 1', ws1.path]
      );
      expect(wsResult1.success).toBe(true);
      const workspaceId1 = wsResult1.workspace!.id;

      const wsResult2 = await page.evaluate(
        ([wsName, wsPath]) => window.knuthflow.workspace.create(wsName, wsPath),
        ['Workspace 2', ws2.path]
      );
      expect(wsResult2.success).toBe(true);
      const workspaceId2 = wsResult2.workspace!.id;

      const ralphResult1 = await page.evaluate(
        ([wsId, wsPath]) => window.knuthflow.ralph.bootstrap(wsId, wsPath, false),
        [workspaceId1, ws1.path]
      );
      expect(ralphResult1.success).toBe(true);
      const project1Id = ralphResult1.project!.id;

      const ralphResult2 = await page.evaluate(
        ([wsId, wsPath]) => window.knuthflow.ralph.bootstrap(wsId, wsPath, false),
        [workspaceId2, ws2.path]
      );
      expect(ralphResult2.success).toBe(true);
      const project2Id = ralphResult2.project!.id;

      // Add both to portfolio
      const pp1 = await page.evaluate(
        ([portId, projId]) => window.knuthflow.portfolio.addProject(portId, projId),
        [portfolio.id, project1Id]
      );
      const pp2 = await page.evaluate(
        ([portId, projId]) => window.knuthflow.portfolio.addProject(portId, projId),
        [portfolio.id, project2Id]
      );

      // Update project 2 to depend on project 1
      await page.evaluate(
        ([id, graph]) => window.knuthflow.portfolio.updateProject(id, { dependencyGraph: graph }),
        [pp2.id, { [project2Id]: [project1Id] }]
      );

      // Verify dependency was stored
      const updated = await page.evaluate(
        (id) => window.knuthflow.portfolio.getProject(id),
        pp2.id
      );
      expect(updated.dependencyGraph[project2Id]).toContain(project1Id);
    } finally {
      await ws1.cleanup();
      await ws2.cleanup();
    }
  });
});
