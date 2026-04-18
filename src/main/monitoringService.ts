import { getDatabase } from './database';
import type { HealthCheckType, HealthStatus } from './database';

export interface HealthCheckResult {
  checkType: HealthCheckType;
  status: HealthStatus;
  message: string | null;
  details: string | null;
  regressed: boolean;
}

export interface MonitoringCheckContext {
  appId: string;
  workspacePath: string;
}

export class MonitoringService {
  private checkInterval: NodeJS.Timeout | null = null;
  private appIntervals: Map<string, NodeJS.Timeout> = new Map();

  start(): void {
    console.log('[MonitoringService] Starting monitoring service');
    this.scheduleAllApps();
  }

  stop(): void {
    console.log('[MonitoringService] Stopping monitoring service');
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    for (const interval of this.appIntervals.values()) {
      clearTimeout(interval);
    }
    this.appIntervals.clear();
  }

  private scheduleAllApps(): void {
    const db = getDatabase();
    const apps = db.listApps();

    for (const app of apps) {
      this.scheduleAppChecks(app.id);
    }

    // Check every hour for new apps or config changes
    this.checkInterval = setInterval(() => {
      this.scheduleAllApps();
    }, 60 * 60 * 1000);
  }

  scheduleAppChecks(appId: string): void {
    const db = getDatabase();
    const config = db.getMonitoringConfig(appId);

    if (!config || !config.enabled) {
      return;
    }

    // Clear existing interval for this app
    const existing = this.appIntervals.get(appId);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule next check
    const intervalMs = config.checkIntervalHours * 60 * 60 * 1000;
    const timeout = setTimeout(() => {
      this.runHealthChecks(appId).catch(console.error);
    }, intervalMs);

    this.appIntervals.set(appId, timeout);
  }

  async runHealthChecks(appId: string): Promise<HealthCheckResult[]> {
    const db = getDatabase();
    const app = db.getApp(appId);

    if (!app || !app.workspaceId) {
      return [];
    }

    const workspace = db.getWorkspace(app.workspaceId);
    if (!workspace) {
      return [];
    }

    const config = db.getMonitoringConfig(appId);
    if (!config) {
      return [];
    }

    const results: HealthCheckResult[] = [];
    const now = Date.now();

    // Update last check time
    db.updateMonitoringConfig(appId, { lastCheckAt: now });

    // Run build check
    if (config.checkBuild) {
      const result = await this.checkBuild(workspace.path);
      results.push(result);
      db.createMonitoringHealthRecord({
        appId,
        checkType: 'build',
        status: result.status,
        message: result.message,
        details: result.details,
        regressed: result.regressed,
      });
    }

    // Run lint check
    if (config.checkLint) {
      const result = await this.checkLint(workspace.path);
      results.push(result);
      db.createMonitoringHealthRecord({
        appId,
        checkType: 'lint',
        status: result.status,
        message: result.message,
        details: result.details,
        regressed: result.regressed,
      });
    }

    // Run tests check
    if (config.checkTests) {
      const result = await this.checkTests(workspace.path);
      results.push(result);
      db.createMonitoringHealthRecord({
        appId,
        checkType: 'tests',
        status: result.status,
        message: result.message,
        details: result.details,
        regressed: result.regressed,
      });
    }

    // Run vulnerability check
    if (config.checkVulnerabilities) {
      const result = await this.checkVulnerabilities(workspace.path);
      results.push(result);
      db.createMonitoringHealthRecord({
        appId,
        checkType: 'vulnerabilities',
        status: result.status,
        message: result.message,
        details: result.details,
        regressed: result.regressed,
      });
    }

    // Check for regressions and trigger auto-fix if enabled
    const regressed = results.filter(r => r.regressed);
    if (regressed.length > 0 && config.autoFixTrigger) {
      await this.triggerAutoFix(appId, regressed);
    }

    return results;
  }

  private async checkBuild(workspacePath: string): Promise<HealthCheckResult> {
    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      // Check if package.json exists
      const packageJsonPath = `${workspacePath}/package.json`;
      if (!fs.existsSync(packageJsonPath)) {
        return {
          checkType: 'build',
          status: 'degraded',
          message: 'No package.json found',
          details: null,
          regressed: false,
        };
      }

      // Run build command
      try {
        execSync('npm run build', { cwd: workspacePath, timeout: 120000, stdio: 'pipe' });
        return {
          checkType: 'build',
          status: 'healthy',
          message: 'Build successful',
          details: null,
          regressed: false,
        };
      } catch (buildError) {
        return {
          checkType: 'build',
          status: 'failing',
          message: 'Build failed',
          details: buildError instanceof Error ? buildError.message : String(buildError),
          regressed: false, // Will be determined by comparing with previous
        };
      }
    } catch (error) {
      return {
        checkType: 'build',
        status: 'degraded',
        message: 'Build check error',
        details: error instanceof Error ? error.message : String(error),
        regressed: false,
      };
    }
  }

  private async checkLint(workspacePath: string): Promise<HealthCheckResult> {
    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      const packageJsonPath = `${workspacePath}/package.json`;
      if (!fs.existsSync(packageJsonPath)) {
        return {
          checkType: 'lint',
          status: 'degraded',
          message: 'No package.json found',
          details: null,
          regressed: false,
        };
      }

      try {
        execSync('npm run lint', { cwd: workspacePath, timeout: 60000, stdio: 'pipe' });
        return {
          checkType: 'lint',
          status: 'healthy',
          message: 'Lint passed',
          details: null,
          regressed: false,
        };
      } catch (lintError) {
        return {
          checkType: 'lint',
          status: 'failing',
          message: 'Lint failed',
          details: lintError instanceof Error ? lintError.message : String(lintError),
          regressed: false,
        };
      }
    } catch (error) {
      return {
        checkType: 'lint',
        status: 'degraded',
        message: 'Lint check error',
        details: error instanceof Error ? error.message : String(error),
        regressed: false,
      };
    }
  }

  private async checkTests(workspacePath: string): Promise<HealthCheckResult> {
    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      const packageJsonPath = `${workspacePath}/package.json`;
      if (!fs.existsSync(packageJsonPath)) {
        return {
          checkType: 'tests',
          status: 'degraded',
          message: 'No package.json found',
          details: null,
          regressed: false,
        };
      }

      try {
        execSync('npm test', { cwd: workspacePath, timeout: 120000, stdio: 'pipe' });
        return {
          checkType: 'tests',
          status: 'healthy',
          message: 'Tests passed',
          details: null,
          regressed: false,
        };
      } catch (testError) {
        return {
          checkType: 'tests',
          status: 'failing',
          message: 'Tests failed',
          details: testError instanceof Error ? testError.message : String(testError),
          regressed: false,
        };
      }
    } catch (error) {
      return {
        checkType: 'tests',
        status: 'degraded',
        message: 'Test check error',
        details: error instanceof Error ? error.message : String(error),
        regressed: false,
      };
    }
  }

  private async checkVulnerabilities(workspacePath: string): Promise<HealthCheckResult> {
    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      const packageJsonPath = `${workspacePath}/package.json`;
      if (!fs.existsSync(packageJsonPath)) {
        return {
          checkType: 'vulnerabilities',
          status: 'degraded',
          message: 'No package.json found',
          details: null,
          regressed: false,
        };
      }

      try {
        const output = execSync('npm audit --json', { cwd: workspacePath, timeout: 60000, stdio: 'pipe' }).toString();
        const auditResult = JSON.parse(output);

        if (auditResult.metadata?.vulnerabilities) {
          const vulns = auditResult.metadata.vulnerabilities;
          const total = (vulns.critical || 0) + (vulns.high || 0) + (vulns.medium || 0) + (vulns.low || 0);

          if (total === 0) {
            return {
              checkType: 'vulnerabilities',
              status: 'healthy',
              message: 'No vulnerabilities found',
              details: null,
              regressed: false,
            };
          }

          return {
            checkType: 'vulnerabilities',
            status: total >= 5 ? 'failing' : 'degraded',
            message: `${total} vulnerabilities found (${vulns.critical || 0} critical, ${vulns.high || 0} high)`,
            details: JSON.stringify(vulns),
            regressed: false,
          };
        }

        return {
          checkType: 'vulnerabilities',
          status: 'healthy',
          message: 'Audit completed',
          details: null,
          regressed: false,
        };
      } catch (auditError) {
        return {
          checkType: 'vulnerabilities',
          status: 'failing',
          message: 'npm audit failed',
          details: auditError instanceof Error ? auditError.message : String(auditError),
          regressed: false,
        };
      }
    } catch (error) {
      return {
        checkType: 'vulnerabilities',
        status: 'degraded',
        message: 'Vulnerability check error',
        details: error instanceof Error ? error.message : String(error),
        regressed: false,
      };
    }
  }

  private async triggerAutoFix(appId: string, regressed: HealthCheckResult[]): Promise<void> {
    console.log(`[MonitoringService] Triggering auto-fix for app ${appId} due to ${regressed.length} regressions`);

    const db = getDatabase();
    const app = db.getApp(appId);
    if (!app) return;

    // Get workspace for this app
    if (!app.workspaceId) return;
    const workspace = db.getWorkspace(app.workspaceId);
    if (!workspace) return;

    // Get Ralph project for workspace
    const ralphProject = db.getRalphProjectByWorkspaceId(workspace.id);
    if (!ralphProject) return;

    // Get regressed health record IDs
    const regressionIds = regressed.map(r => {
      const record = db.getLatestHealthRecordByType(appId, r.checkType);
      return record?.id || '';
    }).filter(Boolean);

    // Create maintenance run
    const maintenanceRun = db.createMaintenanceRun({
      appId,
      triggerType: 'regression',
      triggerReason: regressed.map(r => `${r.checkType}: ${r.message}`).join('; '),
      regressionIds,
    });

    // Notify about auto-fix trigger (this would be sent to renderer via IPC)
    const { ipcMain } = await import('electron');
    ipcMain.emit('maintenance-triggered', {
      appId,
      maintenanceRunId: maintenanceRun.id,
      regressions: regressed,
    });
  }

  async forceCheck(appId: string): Promise<HealthCheckResult[]> {
    return this.runHealthChecks(appId);
  }

  getHealthStatus(appId: string): { overall: HealthStatus; checks: Map<HealthCheckType, HealthStatus> } {
    const db = getDatabase();
    const records = db.listMonitoringHealthRecords(appId, 10);

    const checkStatuses = new Map<HealthCheckType, HealthStatus>();
    for (const record of records) {
      const current = checkStatuses.get(record.checkType);
      if (!current || this.compareStatus(record.status, current) > 0) {
        checkStatuses.set(record.checkType, record.status);
      }
    }

    let overall: HealthStatus = 'healthy';
    for (const status of checkStatuses.values()) {
      if (this.compareStatus(status, overall) > 0) {
        overall = status;
      }
    }

    return { overall, checks: checkStatuses };
  }

  private compareStatus(a: HealthStatus, b: HealthStatus): number {
    const order: Record<HealthStatus, number> = { healthy: 0, degraded: 1, failing: 2 };
    return order[a] - order[b];
  }
}

// Singleton instance
let monitoringServiceInstance: MonitoringService | null = null;

export function getMonitoringService(): MonitoringService {
  if (!monitoringServiceInstance) {
    monitoringServiceInstance = new MonitoringService();
  }
  return monitoringServiceInstance;
}