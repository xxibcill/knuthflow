import { expect, test } from './support/electron';

// UI smoke tests require a display server and working Electron app
// Skip in CI or when running on macOS without a dev server (Gatekeeper issue)
const ci = process.env.CI === 'true';
const isMacWithoutDevServer = process.platform === 'darwin' && !process.env.PLAYWRIGHT_DEV_SERVER_URL;
const skipUITests = ci || isMacWithoutDevServer;

test.skip(skipUITests, 'requires display server and working Electron launch');

test('shows the main application shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Ralph/i);
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ralph' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terminal' })).toBeVisible();
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Phase 24: API Compatibility Tests
 * ───────────────────────────────────────────────────────────────────────────── */
(skipUITests ? test.describe.skip : test.describe)('Phase 24: Preload API Alias Compatibility', () => {
  test('window.ralph is the preferred API and works for read-only calls', async ({ page }) => {
    // window.ralph should be the preferred API
    const workspaces = await page.evaluate(() => window.ralph.workspace.list());
    expect(Array.isArray(workspaces)).toBe(true);
  });

  test('window.knuthflow is retained as a deprecated compatibility alias', async ({ page }) => {
    // window.knuthflow should still work for backward compatibility
    const workspaces = await page.evaluate(() => window.knuthflow.workspace.list());
    expect(Array.isArray(workspaces)).toBe(true);
  });

  test('both window.ralph and window.knuthflow point to the same API implementation', async ({ page }) => {
    // Both should return the same data for the same call
    const [ralphResult, knuthflowResult] = await page.evaluate(async () => {
      const ralphWorkspaces = await window.ralph.workspace.list();
      const knuthflowWorkspaces = await window.knuthflow.workspace.list();
      return { ralphWorkspaces, knuthflowWorkspaces };
    });
    expect(ralphResult).toEqual(knuthflowResult);
  });
});
