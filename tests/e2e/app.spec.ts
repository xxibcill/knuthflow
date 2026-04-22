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
