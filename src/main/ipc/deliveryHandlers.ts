import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import {
  getHandoffBundle,
  runPackaging,
  confirmRelease,
} from '../ralph/deliveryService';
import { getDatabase } from '../database';
import type { HandoffBundle } from '../../shared/deliveryTypes';

/**
 * Register handlers for delivery and handoff
 */
export function registerDeliveryHandlers(): void {
  ipcMain.handle('delivery:getHandoffBundle', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string
  ): Promise<{ success: boolean; bundle?: HandoffBundle; error?: string }> => {
    try {
      const result = await getHandoffBundle(workspacePath);
      return { success: result.success, bundle: result.bundle, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('delivery:runPackaging', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string,
    deliveryFormat: string
  ): Promise<{ success: boolean; bundle?: HandoffBundle; error?: string }> => {
    try {
      const result = await runPackaging(workspacePath, deliveryFormat);
      return { success: result.success, bundle: result.bundle, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('delivery:confirmRelease', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string
  ): Promise<{ success: boolean; bundle?: HandoffBundle; error?: string }> => {
    try {
      const result = await confirmRelease(workspacePath);

      // Phase 26: Seed delivered app registry and portfolio on successful release
      if (result.success && result.bundle) {
        try {
          const db = getDatabase();

          // Get workspace by path to find workspace ID
          const workspace = db.getWorkspaceByPath(workspacePath);
          if (!workspace) {
            console.warn('[delivery:confirmRelease] No workspace found for path:', workspacePath);
            return { success: result.success, bundle: result.bundle };
          }

          // Get Ralph project by workspace ID
          const ralphProject = db.getRalphProjectByWorkspaceId(workspace.id);
          if (!ralphProject) {
            console.warn('[delivery:confirmRelease] No Ralph project found for workspace:', workspace.id);
            return { success: result.success, bundle: result.bundle };
          }

          // Get the latest run for this project to link as runId
          const runs = db.listLoopRuns(ralphProject.id, 1);
          const latestRunId = runs.length > 0 ? runs[0].id : undefined;

          // Create delivered app entry (Phase 26 p26-t3)
          db.createDeliveredApp({
            appId: result.bundle.appName,
            workspacePath,
            deliveryFormat: result.bundle.deliveryFormat,
            runId: latestRunId,
            metadata: {
              platformTargets: result.bundle.platformTargets,
              artifactCount: result.bundle.artifacts.length,
            },
          });

          // Seed portfolio visibility (Phase 26 p26-t9)
          // Get or create default portfolio
          const portfolios = db.listPortfolios();
          let defaultPortfolio = portfolios.find(p => p.name === 'Default Portfolio');

          if (!defaultPortfolio) {
            const created = db.createPortfolio('Default Portfolio', 'Auto-generated portfolio for delivered Ralph apps');
            defaultPortfolio = created;
          }

          // Check if project already in portfolio
          const existingLink = db.getPortfolioProjectByProjectId(defaultPortfolio.id, ralphProject.id);
          if (!existingLink) {
            db.addProjectToPortfolio(defaultPortfolio.id, ralphProject.id, 0);
          }

          console.log('[delivery:confirmRelease] Seeded delivered app and portfolio for:', workspacePath);
        } catch (seedError) {
          // Non-critical: log but don't fail the release
          console.error('[delivery:confirmRelease] Failed to seed delivered app/portfolio:', seedError);
        }
      }

      return { success: result.success, bundle: result.bundle, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
