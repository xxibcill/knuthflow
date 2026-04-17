import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import electronBinary from 'electron';
import { _electron as electron, expect, test as base, type ElectronApplication, type Page } from '@playwright/test';

import { resolvePackagedAppPath, resolvePackagedAppAsar } from './packagedApp';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  page: Page;
};

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({ browserName }, use, testInfo) => {
    void browserName;
    const userDataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'knuthflow-playwright-'));

    // Check if we have a packaged app available
    // On macOS, packaged apps may fail to launch due to Gatekeeper without code signing
    // Use packaged app in CI (Linux) or when E2E_TEST_USE_PACKAGED is explicitly set
    const asarPath = resolvePackagedAppAsar();
    const isCI = process.env.CI === 'true';
    const forcePackaged = process.env.E2E_TEST_USE_PACKAGED === 'true';
    const usePackagedApp = (isCI || forcePackaged) && fs.existsSync(asarPath);

    let app: ElectronApplication;

    if (usePackagedApp) {
      // CI environment (Linux): use packaged app
      const executablePath = resolvePackagedAppPath();
      console.error(`[E2E] Launching packaged app: ${executablePath}`);
      app = await electron.launch({
        executablePath,
        args: [asarPath],
        artifactsDir: testInfo.outputPath('artifacts'),
        env: {
          ...process.env,
          KNUTHFLOW_USER_DATA_DIR: userDataDir,
        },
      });
    } else {
      // No packaged app or local dev: use electron binary with webpack dev server URL
      const devServerUrl = process.env.PLAYWRIGHT_DEV_SERVER_URL;
      if (!devServerUrl) {
        throw new Error(
          `No packaged app found (CI=${isCI}) and PLAYWRIGHT_DEV_SERVER_URL not set.\n` +
          `Either run 'npm run package' first, or set PLAYWRIGHT_DEV_SERVER_URL (e.g., http://localhost:9000)`
        );
      }
      console.error(`[E2E] Launching with dev server: ${devServerUrl}`);
      app = await electron.launch({
        executablePath: String(electronBinary),
        args: [devServerUrl],
        artifactsDir: testInfo.outputPath('artifacts'),
        env: {
          ...process.env,
          KNUTHFLOW_USER_DATA_DIR: userDataDir,
        },
      });
    }

    try {
      await use(app);
    } finally {
      await app.close();
      await fsp.rm(userDataDir, { recursive: true, force: true });
    }
  },
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await use(page);
  },
});

export { expect };
