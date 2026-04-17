import { expect, test } from './support/electron';

// UI smoke tests require a display server - skip in CI
const ci = process.env.CI === 'true';

test.skip(ci, 'requires display server');

test('shows the main application shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Knuthflow/i);
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Operator Workspace' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Workspaces' })).toBeVisible();
});
