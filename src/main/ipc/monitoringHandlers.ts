import { ipcMain } from 'electron';
import { getDatabase } from '../database';
import type {
  MonitoringConfig,
  MonitoringHealthRecord,
  MaintenanceRun,
  ReleaseChannel,
  RolloutChannel,
  ChannelRelease,
  BetaTester,
  AppVersion,
} from '../database';

export function registerMonitoringHandlers(): void {
  // ─────────────────────────────────────────────────────────────────────────────
  // App Version Handlers (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('app-version:create', async (_event, params: {
    appId: string;
    version: string;
    changelog?: string;
    channel?: ReleaseChannel;
    createdBy?: 'operator' | 'auto';
    runId?: string | null;
  }) => {
    const db = getDatabase();
    return db.createAppVersion(params);
  });

  ipcMain.handle('app-version:get', async (_event, id: string) => {
    const db = getDatabase();
    return db.getAppVersion(id);
  });

  ipcMain.handle('app-version:list', async (_event, appId: string, limit?: number) => {
    const db = getDatabase();
    return db.listAppVersions(appId, limit);
  });

  ipcMain.handle('app-version:list-by-channel', async (_event, appId: string, channel: ReleaseChannel) => {
    const db = getDatabase();
    return db.listAppVersionsByChannel(appId, channel);
  });

  ipcMain.handle('app-version:promote', async (_event, id: string, newChannel: ReleaseChannel) => {
    const db = getDatabase();
    return db.promoteAppVersion(id, newChannel);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Monitoring Config Handlers (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('monitoring:create-config', async (_event, appId: string) => {
    const db = getDatabase();
    return db.createMonitoringConfig(appId);
  });

  ipcMain.handle('monitoring:get-config', async (_event, appId: string) => {
    const db = getDatabase();
    return db.getMonitoringConfig(appId);
  });

  ipcMain.handle('monitoring:update-config', async (_event, appId: string, updates: Partial<{
    enabled: boolean;
    checkIntervalHours: number;
    checkBuild: boolean;
    checkLint: boolean;
    checkTests: boolean;
    checkVulnerabilities: boolean;
    autoFixTrigger: boolean;
    alertThreshold: number;
  }>) => {
    const db = getDatabase();
    return db.updateMonitoringConfig(appId, updates);
  });

  ipcMain.handle('monitoring:force-check', async (_event, appId: string) => {
    const { getMonitoringService } = require('../monitoringService');
    const service = getMonitoringService();
    return service.forceCheck(appId);
  });

  ipcMain.handle('monitoring:get-health-status', async (_event, appId: string) => {
    const { getMonitoringService } = require('../monitoringService');
    const service = getMonitoringService();
    return service.getHealthStatus(appId);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Monitoring Health Record Handlers (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('monitoring:list-health-records', async (_event, appId: string, limit?: number) => {
    const db = getDatabase();
    return db.listMonitoringHealthRecords(appId, limit);
  });

  ipcMain.handle('monitoring:get-regressed-records', async (_event, appId: string) => {
    const db = getDatabase();
    return db.listRegressedHealthRecords(appId);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Maintenance Run Handlers (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('maintenance:create', async (_event, params: {
    appId: string;
    runId?: string | null;
    triggerType: 'scheduled' | 'regression' | 'manual';
    triggerReason: string;
    regressionIds?: string[];
  }) => {
    const db = getDatabase();
    return db.createMaintenanceRun(params);
  });

  ipcMain.handle('maintenance:get', async (_event, id: string) => {
    const db = getDatabase();
    return db.getMaintenanceRun(id);
  });

  ipcMain.handle('maintenance:update', async (_event, id: string, updates: Partial<{
    status: MaintenanceRun['status'];
    iterationCount: number;
    outcome: 'success' | 'failure' | 'cancelled' | null;
    startedAt: number | null;
    completedAt: number | null;
  }>) => {
    const db = getDatabase();
    return db.updateMaintenanceRun(id, updates);
  });

  ipcMain.handle('maintenance:list', async (_event, appId: string, limit?: number) => {
    const db = getDatabase();
    return db.listMaintenanceRuns(appId, limit);
  });

  ipcMain.handle('maintenance:list-active', async () => {
    const db = getDatabase();
    return db.listActiveMaintenanceRuns();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Rollout Channel Handlers (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('rollout:create-channel', async (_event, params: {
    appId: string;
    channel: string;
    isDefault?: boolean;
    validationRequired?: boolean;
    autoPromote?: boolean;
    minBetaAdopters?: number;
  }) => {
    const db = getDatabase();
    return db.createRolloutChannel(params);
  });

  ipcMain.handle('rollout:get-channel', async (_event, appId: string, channel: string) => {
    const db = getDatabase();
    return db.getRolloutChannel(appId, channel);
  });

  ipcMain.handle('rollout:list-channels', async (_event, appId: string) => {
    const db = getDatabase();
    return db.listRolloutChannels(appId);
  });

  ipcMain.handle('rollout:update-channel', async (_event, id: string, updates: Partial<{
    isDefault: boolean;
    validationRequired: boolean;
    autoPromote: boolean;
    minBetaAdopters: number;
  }>) => {
    const db = getDatabase();
    return db.updateRolloutChannel(id, updates);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Channel Release Handlers (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('rollout:create-release', async (_event, params: {
    appId: string;
    versionId: string;
    channel: string;
    status?: 'active' | 'promoted' | 'rolled_back' | 'archived';
    promotedBy?: string | null;
    rollbackFromVersionId?: string | null;
  }) => {
    const db = getDatabase();
    return db.createChannelRelease(params);
  });

  ipcMain.handle('rollout:get-release', async (_event, id: string) => {
    const db = getDatabase();
    return db.getChannelRelease(id);
  });

  ipcMain.handle('rollout:get-latest', async (_event, appId: string, channel: string) => {
    const db = getDatabase();
    return db.getLatestChannelRelease(appId, channel);
  });

  ipcMain.handle('rollout:promote-release', async (_event, id: string, promotedBy: string) => {
    const db = getDatabase();
    return db.promoteChannelRelease(id, promotedBy);
  });

  ipcMain.handle('rollout:rollback-release', async (_event, id: string, rollbackVersionId: string) => {
    const db = getDatabase();
    return db.rollbackChannelRelease(id, rollbackVersionId);
  });

  ipcMain.handle('rollout:list-releases', async (_event, appId: string, channel?: string) => {
    const db = getDatabase();
    return db.listChannelReleases(appId, channel);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Beta Tester Handlers (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('beta:create-tester', async (_event, email: string, name?: string | null) => {
    const db = getDatabase();
    return db.createBetaTester(email, name);
  });

  ipcMain.handle('beta:get-tester', async (_event, id: string) => {
    const db = getDatabase();
    return db.getBetaTester(id);
  });

  ipcMain.handle('beta:get-tester-by-email', async (_event, email: string) => {
    const db = getDatabase();
    return db.getBetaTesterByEmail(email);
  });

  ipcMain.handle('beta:list-testers', async (_event, enabledOnly?: boolean) => {
    const db = getDatabase();
    return db.listBetaTesters(enabledOnly);
  });

  ipcMain.handle('beta:update-tester', async (_event, id: string, updates: Partial<{
    name: string | null;
    enabled: boolean;
  }>) => {
    const db = getDatabase();
    return db.updateBetaTester(id, updates);
  });

  ipcMain.handle('beta:grant-access', async (_event, testerId: string, appId: string, channel?: string) => {
    const db = getDatabase();
    return db.createBetaTesterAccess(testerId, appId, channel);
  });

  ipcMain.handle('beta:list-access', async (_event, testerId: string) => {
    const db = getDatabase();
    return db.listBetaTesterAccess(testerId);
  });

  ipcMain.handle('beta:list-testers-for-app', async (_event, appId: string) => {
    const db = getDatabase();
    return db.listBetaTestersForApp(appId);
  });

  ipcMain.handle('beta:revoke-access', async (_event, id: string) => {
    const db = getDatabase();
    db.removeBetaTesterAccess(id);
    return { success: true };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Rollout Metrics Handlers (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('rollout:record-metrics', async (_event, params: {
    appId: string;
    versionId: string;
    channel: string;
    metricType: 'installs' | 'crashes' | 'active_users' | 'crash_rate' | 'feedback_score';
    metricValue: number;
  }) => {
    const db = getDatabase();
    return db.recordRolloutMetrics(params);
  });

  ipcMain.handle('rollout:list-metrics', async (_event, appId: string, versionId?: string, channel?: string) => {
    const db = getDatabase();
    return db.listRolloutMetrics(appId, versionId, channel);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-fix Trigger Handler (Phase 19)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('monitoring:trigger-auto-fix', async (_event, appId: string) => {
    const { getMonitoringService } = require('../monitoringService');
    const service = getMonitoringService();
    const results = await service.forceCheck(appId);
    return results;
  });
}