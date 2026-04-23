import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { getDatabase } from '../database';

/**
 * Register Phase 26 IPC handlers for health events, feedback, delivered apps, backlog, and patterns
 */
export function registerHealthHandlers(): void {
  ipcMain.handle('health:createEvent', async (
    _event: IpcMainInvokeEvent,
    params: {
      eventType: string;
      appId?: string;
      workspaceId?: string;
      runId?: string;
      status: string;
      message?: string;
      details?: string;
      triggeredAt: number;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createHealthEvent(params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('health:listEvents', async (
    _event: IpcMainInvokeEvent,
    limit?: number
  ) => {
    try {
      const db = getDatabase();
      return db.listHealthEvents(limit);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerFeedbackHandlers(): void {
  ipcMain.handle('feedback:create', async (
    _event: IpcMainInvokeEvent,
    params: {
      appId?: string;
      runId?: string;
      type: string;
      content: string;
      rating?: number;
      source?: string;
      linkedBacklogId?: string;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createFeedback(params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('feedback:list', async (
    _event: IpcMainInvokeEvent,
    limit?: number
  ) => {
    try {
      const db = getDatabase();
      return db.listFeedback(limit);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('feedback:getByRunId', async (
    _event: IpcMainInvokeEvent,
    runId: string
  ) => {
    try {
      const db = getDatabase();
      return db.getFeedbackByRunId(runId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('feedback:linkToBacklog', async (
    _event: IpcMainInvokeEvent,
    feedbackId: string,
    backlogId: string
  ) => {
    try {
      const db = getDatabase();
      db.linkFeedbackToBacklog(feedbackId, backlogId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerDeliveredAppsHandlers(): void {
  ipcMain.handle('deliveredApps:create', async (
    _event: IpcMainInvokeEvent,
    params: {
      appId: string;
      workspacePath: string;
      deliveryFormat: string;
      bundlePath?: string;
      runId?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createDeliveredApp(params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('deliveredApps:get', async (
    _event: IpcMainInvokeEvent,
    id: string
  ) => {
    try {
      const db = getDatabase();
      return db.getDeliveredApp(id);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('deliveredApps:getByAppId', async (
    _event: IpcMainInvokeEvent,
    appId: string
  ) => {
    try {
      const db = getDatabase();
      return db.getDeliveredAppByAppId(appId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('deliveredApps:list', async (
    _event: IpcMainInvokeEvent,
    limit?: number
  ) => {
    try {
      const db = getDatabase();
      return db.listDeliveredApps(limit);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('deliveredApps:updateHealth', async (
    _event: IpcMainInvokeEvent,
    id: string,
    healthStatus: string
  ) => {
    try {
      const db = getDatabase();
      db.updateDeliveredAppHealth(id, healthStatus);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('deliveredApps:updateFollowUp', async (
    _event: IpcMainInvokeEvent,
    id: string,
    followUpSignal: string,
    followUpNotes?: string
  ) => {
    try {
      const db = getDatabase();
      db.updateDeliveredAppFollowUp(id, followUpSignal, followUpNotes);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('deliveredApps:updateLastSeen', async (
    _event: IpcMainInvokeEvent,
    id: string
  ) => {
    try {
      const db = getDatabase();
      db.updateDeliveredAppLastSeen(id);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerIterationBacklogHandlers(): void {
  ipcMain.handle('iterationBacklog:create', async (
    _event: IpcMainInvokeEvent,
    params: {
      title: string;
      description: string;
      source: string;
      priority?: 'high' | 'medium' | 'low';
      linkedFeedbackId?: string;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createIterationBacklogItem(params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('iterationBacklog:get', async (
    _event: IpcMainInvokeEvent,
    id: string
  ) => {
    try {
      const db = getDatabase();
      return db.getIterationBacklogItem(id);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('iterationBacklog:list', async (
    _event: IpcMainInvokeEvent,
    options?: { status?: string; priority?: string; limit?: number }
  ) => {
    try {
      const db = getDatabase();
      return db.listIterationBacklog(options);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('iterationBacklog:update', async (
    _event: IpcMainInvokeEvent,
    id: string,
    updates: { status?: string; priority?: string }
  ) => {
    try {
      const db = getDatabase();
      db.updateIterationBacklogItem(id, updates);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerRunPatternsHandlers(): void {
  ipcMain.handle('runPatterns:create', async (
    _event: IpcMainInvokeEvent,
    params: {
      projectId: string;
      runId?: string;
      goalType?: string;
      blueprintId?: string;
      blueprintVersion?: string;
      milestoneCount?: number;
      validationResult?: string;
      deliveryStatus?: string;
      patternTags?: string[];
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createRunPattern(params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('runPatterns:list', async (
    _event: IpcMainInvokeEvent,
    projectId: string,
    limit?: number
  ) => {
    try {
      const db = getDatabase();
      return db.listRunPatterns(projectId, limit);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('runPatterns:getSummary', async (_event: IpcMainInvokeEvent) => {
    try {
      const db = getDatabase();
      return db.getRunPatternSummary();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerPortfolioSummaryHandlers(): void {
  ipcMain.handle('portfolio:getSummary', async (_event: IpcMainInvokeEvent) => {
    try {
      const db = getDatabase();
      return db.getPortfolioSummary();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
