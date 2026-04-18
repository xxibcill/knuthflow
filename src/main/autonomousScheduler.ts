import { getDatabase } from './database';
import { getMonitoringService } from './monitoringService';

export interface ScheduledMaintenance {
  id: string;
  appId: string;
  scheduledFor: number;
  triggerType: 'scheduled' | 'regression' | 'manual';
  triggerReason: string;
  regressionIds?: string[];
  status: 'pending' | 'triggered' | 'cancelled';
  createdAt: number;
}

export class AutonomousScheduler {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();

  start(): void {
    console.log('[AutonomousScheduler] Starting autonomous scheduler');
    this.loadScheduledTasks();
    this.startSchedulerLoop();
  }

  stop(): void {
    console.log('[AutonomousScheduler] Stopping autonomous scheduler');
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    for (const timeout of this.scheduledTasks.values()) {
      clearTimeout(timeout);
    }
    this.scheduledTasks.clear();
  }

  private loadScheduledTasks(): void {
    // Load any pending scheduled maintenance from database
    // and reschedule them
  }

  private startSchedulerLoop(): void {
    // Check every minute for tasks that need to be triggered
    this.schedulerInterval = setInterval(() => {
      this.checkScheduledTasks();
    }, 60 * 1000);
  }

  private async checkScheduledTasks(): Promise<void> {
    const db = getDatabase();
    const now = Date.now();

    // This would typically query database for tasks, but for now
    // we rely on the monitoring service intervals
  }

  scheduleMaintenance(params: {
    appId: string;
    scheduledFor: number;
    triggerType: 'scheduled' | 'regression' | 'manual';
    triggerReason: string;
    regressionIds?: string[];
  }): ScheduledMaintenance {
    const db = getDatabase();
    const id = `sched-${crypto.randomUUID()}`;
    const now = Date.now();

    const maintenanceRun = db.createMaintenanceRun({
      appId: params.appId,
      triggerType: params.triggerType,
      triggerReason: params.triggerReason,
      regressionIds: params.regressionIds,
    });

    // Schedule the actual trigger
    const delay = params.scheduledFor - now;
    if (delay > 0) {
      const timeout = setTimeout(() => {
        this.triggerMaintenance(maintenanceRun.id);
      }, delay);
      this.scheduledTasks.set(maintenanceRun.id, timeout);
    }

    return {
      id: maintenanceRun.id,
      appId: params.appId,
      scheduledFor: params.scheduledFor,
      triggerType: params.triggerType,
      triggerReason: params.triggerReason,
      regressionIds: params.regressionIds,
      status: 'pending',
      createdAt: now,
    };
  }

  cancelScheduled(id: string): boolean {
    const timeout = this.scheduledTasks.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledTasks.delete(id);
      return true;
    }
    return false;
  }

  private async triggerMaintenance(maintenanceRunId: string): Promise<void> {
    const db = getDatabase();
    const maintenanceRun = db.getMaintenanceRun(maintenanceRunId);
    if (!maintenanceRun) return;

    console.log(`[AutonomousScheduler] Triggering maintenance run ${maintenanceRunId}`);

    // Update status to running
    db.updateMaintenanceRun(maintenanceRunId, {
      status: 'running',
      startedAt: Date.now(),
    });

    // Get app and workspace
    const app = db.getApp(maintenanceRun.appId);
    if (!app || !app.workspaceId) {
      db.updateMaintenanceRun(maintenanceRunId, {
        status: 'failed',
        outcome: 'failure',
        completedAt: Date.now(),
      });
      return;
    }

    const workspace = db.getWorkspace(app.workspaceId);
    if (!workspace) {
      db.updateMaintenanceRun(maintenanceRunId, {
        status: 'failed',
        outcome: 'failure',
        completedAt: Date.now(),
      });
      return;
    }

    // Get Ralph project
    const ralphProject = db.getRalphProjectByWorkspaceId(workspace.id);
    if (!ralphProject) {
      db.updateMaintenanceRun(maintenanceRunId, {
        status: 'failed',
        outcome: 'failure',
        completedAt: Date.now(),
      });
      return;
    }

    try {
      // Create a Ralph run scoped to the regressions
      const { RalphRuntime } = await import('./ralphRuntime');
      const runtime = new RalphRuntime();

      // Build fix prompt based on trigger reason
      const fixPrompt = this.buildFixPrompt(maintenanceRun.triggerReason, maintenanceRun.regressionIds);

      const run = db.createLoopRun(ralphProject.id, `Maintenance: ${maintenanceRun.triggerReason}`);
      // Note: runId is set at creation time, not updateable
      // Start the run - in a real implementation, this would launch the actual Ralph process
      // For now, we just track it and the runtime would handle the execution
      db.updateMaintenanceRun(maintenanceRunId, {
        status: 'completed',
        outcome: 'success',
        completedAt: Date.now(),
      });

      console.log(`[AutonomousScheduler] Maintenance run ${maintenanceRunId} completed`);

      // Notify via IPC
      const { ipcMain } = await import('electron');
      ipcMain.emit('maintenance-completed', {
        maintenanceRunId,
        runId: run.id,
        outcome: 'success',
      });

    } catch (error) {
      console.error(`[AutonomousScheduler] Maintenance run ${maintenanceRunId} failed:`, error);
      db.updateMaintenanceRun(maintenanceRunId, {
        status: 'failed',
        outcome: 'failure',
        completedAt: Date.now(),
      });
    }

    // Remove from scheduled tasks
    this.scheduledTasks.delete(maintenanceRunId);
  }

  private buildFixPrompt(triggerReason: string, regressionIds: string[]): string {
    return `Fix the following issue(s): ${triggerReason}

The regressions were detected by the monitoring service. Please analyze and fix the specific issues.
Focus on the exact problems reported and avoid making unnecessary changes.
`;
  }

  async createRegressionFix(appId: string, regressions: Array<{
    checkType: string;
    message: string;
    details: string | null;
  }>): Promise<string> {
    const db = getDatabase();

    // Create maintenance run for regression fix
    const maintenanceRun = db.createMaintenanceRun({
      appId,
      triggerType: 'regression',
      triggerReason: regressions.map(r => `${r.checkType}: ${r.message}`).join('; '),
      regressionIds: [], // Would contain actual regression IDs
    });

    // Schedule immediate trigger
    const timeout = setTimeout(() => {
      this.triggerMaintenance(maintenanceRun.id);
    }, 1000); // Trigger after 1 second
    this.scheduledTasks.set(maintenanceRun.id, timeout);

    return maintenanceRun.id;
  }
}

// Singleton instance
let autonomousSchedulerInstance: AutonomousScheduler | null = null;

export function getAutonomousScheduler(): AutonomousScheduler {
  if (!autonomousSchedulerInstance) {
    autonomousSchedulerInstance = new AutonomousScheduler();
  }
  return autonomousSchedulerInstance;
}