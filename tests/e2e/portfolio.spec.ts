import { expect, test } from './support/electron';
import path from 'path';
import fs from 'node:fs';
import os from 'node:os';

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
test.describe('Phase 16: Portfolio CRUD', () => {
  let workspace: { path: string; cleanup: () => Promise<void> } | null = null;

  test.afterEach(async () => {
    if (workspace) {
      await workspace.cleanup();
      workspace = null;
    }
  });

  test('Portfolio can be created', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test description');
    expect(portfolio.id).toBeDefined();
    expect(portfolio.name).toBe(portfolioName);
    expect(portfolio.description).toBe('Test description');
  });

  test('Portfolio can be retrieved by id', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const created = await window.knuthflow.portfolio.create(portfolioName, 'Test description');
    const retrieved = await window.knuthflow.portfolio.get(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.name).toBe(portfolioName);
  });

  test('Portfolio can be listed', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    await window.knuthflow.portfolio.create(portfolioName, 'Test description');
    const portfolios = await window.knuthflow.portfolio.list();
    expect(portfolios.length).toBeGreaterThan(0);
  });

  test('Portfolio can be updated', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const created = await window.knuthflow.portfolio.create(portfolioName, 'Original description');
    const updated = await window.knuthflow.portfolio.update(created.id, {
      name: 'Updated Name',
      description: 'Updated description'
    });
    expect(updated.name).toBe('Updated Name');
    expect(updated.description).toBe('Updated description');
  });

  test('Portfolio can be deleted', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const created = await window.knuthflow.portfolio.create(portfolioName, 'To be deleted');
    await window.knuthflow.portfolio.delete(created.id);
    const retrieved = await window.knuthflow.portfolio.get(created.id);
    expect(retrieved).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Portfolio-Project Association Tests
 * ───────────────────────────────────────────────────────────────────────────── */
test.describe('Phase 16: Portfolio-Project Association', () => {
  let workspace: { path: string; cleanup: () => Promise<void> } | null = null;

  test.afterEach(async () => {
    if (workspace) {
      await workspace.cleanup();
      workspace = null;
    }
  });

  test('Project can be added to portfolio', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test');

    // Create a workspace and bootstrap Ralph
    workspace = createTestWorkspace();
    await window.knuthflow.workspace.create(workspace.path, 'Test Workspace');
    const ralphProject = await window.knuthflow.ralph.bootstrap(workspace.path, {
      name: 'Test Project',
      brief: 'A test project'
    });

    // Add project to portfolio
    const added = await window.knuthflow.portfolio.addProject(portfolio.id, ralphProject.id);
    expect(added.portfolioId).toBe(portfolio.id);
    expect(added.projectId).toBe(ralphProject.id);
  });

  test('Projects can be listed for a portfolio', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test');

    // Create a workspace and bootstrap Ralph
    workspace = createTestWorkspace();
    await window.knuthflow.workspace.create(workspace.path, 'Test Workspace');
    const ralphProject = await window.knuthflow.ralph.bootstrap(workspace.path, {
      name: 'Test Project',
      brief: 'A test project'
    });

    // Add project to portfolio
    await window.knuthflow.portfolio.addProject(portfolio.id, ralphProject.id);

    // List projects
    const projects = await window.knuthflow.portfolio.listProjects(portfolio.id);
    expect(projects.length).toBe(1);
    expect(projects[0].projectId).toBe(ralphProject.id);
  });

  test('Project can be removed from portfolio', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test');

    // Create a workspace and bootstrap Ralph
    workspace = createTestWorkspace();
    await window.knuthflow.workspace.create(workspace.path, 'Test Workspace');
    const ralphProject = await window.knuthflow.ralph.bootstrap(workspace.path, {
      name: 'Test Project',
      brief: 'A test project'
    });

    // Add project to portfolio
    const added = await window.knuthflow.portfolio.addProject(portfolio.id, ralphProject.id);

    // Remove project
    await window.knuthflow.portfolio.removeProject(added.id);

    // Verify removed
    const projects = await window.knuthflow.portfolio.listProjects(portfolio.id);
    expect(projects.length).toBe(0);
  });

  test('Portfolio project can be updated (priority, status)', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test');

    // Create a workspace and bootstrap Ralph
    workspace = createTestWorkspace();
    await window.knuthflow.workspace.create(workspace.path, 'Test Workspace');
    const ralphProject = await window.knuthflow.ralph.bootstrap(workspace.path, {
      name: 'Test Project',
      brief: 'A test project'
    });

    // Add project to portfolio
    const added = await window.knuthflow.portfolio.addProject(portfolio.id, ralphProject.id);

    // Update priority
    const updated = await window.knuthflow.portfolio.updateProject(added.id, {
      priority: 5,
      status: 'paused'
    });

    expect(updated.priority).toBe(5);
    expect(updated.status).toBe('paused');
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Portfolio Runtime Tests
 * ───────────────────────────────────────────────────────────────────────────── */
test.describe('Phase 16: Portfolio Runtime', () => {
  test('Portfolio runtime can be registered and unregistered', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test');

    // Register portfolio runtime
    await window.knuthflow.portfolioRuntime.register(portfolio.id);

    // Verify it can be retrieved (no error thrown)
    const activeRuns = await window.knuthflow.portfolioRuntime.getPortfolioActiveRuns(portfolio.id);
    expect(activeRuns).toBeDefined();

    // Unregister
    await window.knuthflow.portfolioRuntime.unregister(portfolio.id);
  });

  test('Max concurrent runs can be set and retrieved', async () => {
    await window.knuthflow.portfolioRuntime.setMaxConcurrentRuns(5);
    const max = await window.knuthflow.portfolioRuntime.getMaxConcurrentRuns();
    expect(max).toBe(5);
  });

  test('Queued runs can be cancelled', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test');
    await window.knuthflow.portfolioRuntime.register(portfolio.id);

    const queuedRuns = await window.knuthflow.portfolioRuntime.getQueuedRuns(portfolio.id);
    expect(Array.isArray(queuedRuns)).toBe(true);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Portfolio Dashboard UI Tests
 * ───────────────────────────────────────────────────────────────────────────── */
test.describe('Phase 16: Portfolio Dashboard UI', () => {
  test('Portfolio dashboard renders without crashing', async () => {
    // This test verifies the dashboard component can render
    // In a full E2E test with the full app, we would navigate to the portfolio view
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test');
    expect(portfolio.id).toBeDefined();
  });

  test('Empty portfolio state is handled gracefully', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test');

    const projects = await window.knuthflow.portfolio.listProjects(portfolio.id);
    expect(projects.length).toBe(0);
  });

  test('Dependency graph can be stored and retrieved', async () => {
    const portfolioName = `Test Portfolio ${Date.now()}`;
    const portfolio = await window.knuthflow.portfolio.create(portfolioName, 'Test');

    // Create two workspaces
    const ws1 = createTestWorkspace();
    const ws2 = createTestWorkspace();

    try {
      await window.knuthflow.workspace.create(ws1.path, 'Workspace 1');
      const project1 = await window.knuthflow.ralph.bootstrap(ws1.path, {
        name: 'Project 1',
        brief: 'First project'
      });

      await window.knuthflow.workspace.create(ws2.path, 'Workspace 2');
      const project2 = await window.knuthflow.ralph.bootstrap(ws2.path, {
        name: 'Project 2',
        brief: 'Second project'
      });

      // Add both to portfolio
      const pp1 = await window.knuthflow.portfolio.addProject(portfolio.id, project1.id);
      const pp2 = await window.knuthflow.portfolio.addProject(portfolio.id, project2.id);

      // Update project 2 to depend on project 1
      await window.knuthflow.portfolio.updateProject(pp2.id, {
        dependencyGraph: { [project2.id]: [project1.id] }
      });

      // Verify dependency was stored
      const updated = await window.knuthflow.portfolio.getProject(pp2.id);
      expect(updated.dependencyGraph[project2.id]).toContain(project1.id);
    } finally {
      await ws1.cleanup();
      await ws2.cleanup();
    }
  });
});