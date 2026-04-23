import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { getDatabase } from '../database';
import { getReportService } from '../reportService';
import type { AnalyticsCategory, BottleneckType, BottleneckSeverity, RecommendationType, RecommendationEntityType, RecommendationStatus } from '../../shared/ralphTypes';

/**
 * Register Phase 31 IPC handlers for analytics events, rollups, bottlenecks, forecasts, and recommendations
 */
export function registerAnalyticsEventHandlers(): void {
  ipcMain.handle('analytics:createEvent', async (
    _event: IpcMainInvokeEvent,
    params: {
      projectId?: string | null;
      runId?: string | null;
      sessionId?: string | null;
      eventType: string;
      category: AnalyticsCategory;
      metricName: string;
      metricValue: number;
      dimensions?: Record<string, unknown>;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createAnalyticsEvent(params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('analytics:listEvents', async (
    _event: IpcMainInvokeEvent,
    filter?: {
      projectId?: string | null;
      runId?: string | null;
      eventType?: string;
      category?: AnalyticsCategory;
      metricName?: string;
      startTime?: number;
      endTime?: number;
    },
    limit?: number
  ) => {
    try {
      const db = getDatabase();
      return db.listAnalyticsEvents(filter, limit);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('analytics:getEvent', async (
    _event: IpcMainInvokeEvent,
    id: string
  ) => {
    try {
      const db = getDatabase();
      return db.getAnalyticsEvent(id);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerAnalyticsRollupHandlers(): void {
  ipcMain.handle('analytics:createRollup', async (
    _event: IpcMainInvokeEvent,
    params: {
      projectId?: string | null;
      blueprintId?: string | null;
      portfolioId?: string | null;
      rollupType: string;
      timeWindow: string;
      metricName: string;
      metricValue: number;
      sampleSize: number;
      dimensions?: Record<string, unknown>;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createAnalyticsRollup(params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('analytics:listRollups', async (
    _event: IpcMainInvokeEvent,
    filter?: {
      projectId?: string | null;
      blueprintId?: string | null;
      portfolioId?: string | null;
      rollupType?: string;
      timeWindow?: string;
      metricName?: string;
      startTime?: number;
      endTime?: number;
    },
    limit?: number
  ) => {
    try {
      const db = getDatabase();
      return db.listAnalyticsRollups(filter, limit);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerBottleneckHandlers(): void {
  ipcMain.handle('bottleneck:create', async (
    _event: IpcMainInvokeEvent,
    params: {
      projectId?: string | null;
      blueprintId?: string | null;
      bottleneckType: BottleneckType;
      description: string;
      severity: BottleneckSeverity;
      frequency: number;
      impactScore: number;
      exampleRunIds?: string[];
      suggestion: string;
      status?: 'detected' | 'addressed' | 'dismissed';
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createBottleneckDetection(params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bottleneck:list', async (
    _event: IpcMainInvokeEvent,
    filter?: {
      projectId?: string | null;
      blueprintId?: string | null;
      bottleneckType?: BottleneckType;
      severity?: BottleneckSeverity;
      status?: 'detected' | 'addressed' | 'dismissed';
    },
    limit?: number
  ) => {
    try {
      const db = getDatabase();
      return db.listBottleneckDetections(filter, limit);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('bottleneck:update', async (
    _event: IpcMainInvokeEvent,
    id: string,
    updates: { status?: 'detected' | 'addressed' | 'dismissed'; suggestion?: string }
  ) => {
    try {
      const db = getDatabase();
      return db.updateBottleneckDetection(id, updates);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerForecastHandlers(): void {
  ipcMain.handle('forecast:create', async (
    _event: IpcMainInvokeEvent,
    params: {
      projectId?: string | null;
      blueprintId?: string | null;
      appType?: string | null;
      platformTargets?: string[];
      stackPreferences?: string[];
      estimatedDurationMs?: number | null;
      estimatedIterationCount?: number | null;
      estimatedRiskLevel?: 'low' | 'medium' | 'high' | 'very_high' | null;
      confidenceScore?: number | null;
      caveats?: string | null;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createForecast(params);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('forecast:list', async (
    _event: IpcMainInvokeEvent,
    filter?: {
      projectId?: string | null;
      blueprintId?: string | null;
      resolved?: boolean;
    },
    limit?: number
  ) => {
    try {
      const db = getDatabase();
      return db.listForecasts(filter, limit);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('forecast:resolve', async (
    _event: IpcMainInvokeEvent,
    id: string,
    actuals: {
      actualDurationMs: number;
      actualIterationCount: number;
      actualOutcome: 'success' | 'failure' | 'cancelled' | null;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.resolveForecast(id, actuals);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerRecommendationHandlers(): void {
  ipcMain.handle('recommendation:create', async (
    _event: IpcMainInvokeEvent,
    params: {
      projectId?: string | null;
      recommendationType: RecommendationType;
      targetEntityType: RecommendationEntityType;
      targetEntityId?: string | null;
      title: string;
      description: string;
      actionableSteps: string[];
      status?: RecommendationStatus;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.createRecommendationRecord({
        ...params,
        actionableSteps: JSON.stringify(params.actionableSteps),
      });
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('recommendation:list', async (
    _event: IpcMainInvokeEvent,
    filter?: {
      projectId?: string | null;
      recommendationType?: RecommendationType;
      targetEntityType?: RecommendationEntityType;
      targetEntityId?: string | null;
      status?: RecommendationStatus;
    },
    limit?: number
  ) => {
    try {
      const db = getDatabase();
      return db.listRecommendationRecords(filter, limit);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('recommendation:update', async (
    _event: IpcMainInvokeEvent,
    id: string,
    updates: {
      status?: RecommendationStatus;
      outcome?: string | null;
      outcomeNotes?: string | null;
      deferredUntil?: number | null;
    }
  ) => {
    try {
      const db = getDatabase();
      return db.updateRecommendationRecord(id, updates);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

export function registerReportHandlers(): void {
  ipcMain.handle('report:generate', async (
    _event: IpcMainInvokeEvent,
    filters: {
      projectId?: string | null;
      blueprintId?: string | null;
      portfolioId?: string | null;
      startTime?: number;
      endTime?: number;
      dateRange?: '7d' | '30d' | '90d' | 'all';
    }
  ) => {
    try {
      const reportService = getReportService();
      return await reportService.generateReport(filters);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('report:exportJson', async (
    _event: IpcMainInvokeEvent,
    filters: {
      projectId?: string | null;
      blueprintId?: string | null;
      portfolioId?: string | null;
      startTime?: number;
      endTime?: number;
      dateRange?: '7d' | '30d' | '90d' | 'all';
    }
  ) => {
    try {
      const reportService = getReportService();
      return await reportService.exportAsJson(filters);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('report:exportMarkdown', async (
    _event: IpcMainInvokeEvent,
    filters: {
      projectId?: string | null;
      blueprintId?: string | null;
      portfolioId?: string | null;
      startTime?: number;
      endTime?: number;
      dateRange?: '7d' | '30d' | '90d' | 'all';
    }
  ) => {
    try {
      const reportService = getReportService();
      return await reportService.exportAsMarkdown(filters);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
