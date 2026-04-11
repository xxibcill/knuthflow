import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import electronBinary from 'electron';
import { _electron as electron, expect, test as base, type ElectronApplication, type Page } from '@playwright/test';

import { resolvePackagedAppAsar } from './packagedApp';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  page: Page;
};

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({ browserName }, use, testInfo) => {
    void browserName;
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'knuthflow-playwright-'));
    const app = await electron.launch({
      executablePath: electronBinary,
      args: [resolvePackagedAppAsar()],
      artifactsDir: testInfo.outputPath('artifacts'),
      env: {
        ...process.env,
        KNUTHFLOW_USER_DATA_DIR: userDataDir,
      },
    });

    try {
      await use(app);
    } finally {
      await app.close();
      await fs.rm(userDataDir, { recursive: true, force: true });
    }
  },
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await use(page);
  },
});

export { expect };
