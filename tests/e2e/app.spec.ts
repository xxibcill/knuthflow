import { expect, test } from './support/electron';

test('shows the main application shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Knuthflow/i);
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Operator Workspace' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Workspaces' })).toBeVisible();
});
