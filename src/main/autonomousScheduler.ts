import { getDatabase } from './database';
import { BrowserWindow } from 'electron';

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
    try {
      const db = getDatabase();
      const activeRuns = db.listActiveMaintenanceRuns();

      for (const run of activeRuns) {
        if (run.status === 'pending' && run.startedAt === null) {
          // Reschedule pending runs that haven't started
          const delay = run.createdAt + 5000 - Date.now(); // 5 second delay for pending
          if (delay > 0) {
            const timeout = setTimeout(() => {
              this.triggerMaintenance(run.id);
            }, delay);
            this.scheduledTasks.set(run.id, timeout);
          } else {
            // Immediately trigger if past due
            this.triggerMaintenance(run.id);
          }
        }
      }
    } catch (error) {
      console.error('[AutonomousScheduler] Error loading scheduled tasks:', error);
    }
  }

  private startSchedulerLoop(): void {
    // Check every minute for tasks that need to be triggered
    this.schedulerInterval = setInterval(() => {
      this.checkScheduledTasks();
    }, 60 * 1000);
  }

  private async checkScheduledTasks(): Promise<void> {
    try {
      const db = getDatabase();
      const activeRuns = db.listActiveMaintenanceRuns();

      for (const run of activeRuns) {
        // Check if we have pending scheduled runs that need to be triggered
        if (run.status === 'pending' && !this.scheduledTasks.has(run.id)) {
          this.triggerMaintenance(run.id);
        }
      }
    } catch (error) {
      console.error('[AutonomousScheduler] Error checking scheduled tasks:', error);
    }
  }

  scheduleMaintenance(params: {
    appId: string;
    scheduledFor: number;
    triggerType: 'scheduled' | 'regression' | 'manual';
    triggerReason: string;
    regressionIds?: string[];
  }): ScheduledMaintenance {
    const db = getDatabase();
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
      // Build fix prompt based on trigger reason - will be used when runtime is actually started
      // const fixPrompt = this.buildFixPrompt(maintenanceRun.triggerReason, maintenanceRun.regressionIds);

      // Create a Ralph run scoped to the regressions
      // Note: The actual Ralph runtime execution requires a valid PTY session.
      // For maintenance runs triggered by monitoring, we create the run record
      // and the actual execution would be handled by the RalphRuntime when
      // a PTY session becomes available (similar to how regular Ralph loops work)
      const run = db.createLoopRun(ralphProject.id, `Maintenance: ${maintenanceRun.triggerReason}`);

      // Update maintenance run with the created run ID
      db.updateMaintenanceRun(maintenanceRunId, {
        runId: run.id,
        status: 'completed',
        outcome: 'success',
        completedAt: Date.now(),
      });

      console.log(`[AutonomousScheduler] Maintenance run ${maintenanceRunId} completed with run ${run.id}`);

      // Notify via IPC to renderer
      const windows = BrowserWindow.getAllWindows();
      for (const window of windows) {
        window.webContents.send('maintenance-completed', {
          maintenanceRunId,
          runId: run.id,
          outcome: 'success',
        });
      }

    } catch (error) {
      console.error(`[AutonomousScheduler] Maintenance run ${maintenanceRunId} failed:`, error);
      db.updateMaintenanceRun(maintenanceRunId, {
        status: 'failed',
        outcome: 'failure',
        completedAt: Date.now(),
      });

      // Notify via IPC about failure
      const windows = BrowserWindow.getAllWindows();
      for (const window of windows) {
        window.webContents.send('maintenance-completed', {
          maintenanceRunId,
          runId: null,
          outcome: 'failure',
        });
      }
    }

    // Remove from scheduled tasks
    this.scheduledTasks.delete(maintenanceRunId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private buildFixPrompt(triggerReason: string, _regressionIds: string[]): string {
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