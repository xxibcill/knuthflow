import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import { registerUpdateHandlers } from './main/updateManager';
import {
  registerProcessHandlers,
  registerPtyHandlers,
  registerClaudeHandlers,
  registerStorageHandlers,
  registerFilesystemHandlers,
  registerAppHandlers,
  registerWorkspaceHandlers,
  registerSessionHandlers,
  registerSupervisorHandlers,
  registerSettingsHandlers,
  registerProfileHandlers,
  registerSecureStorageHandlers,
  registerLogsHandlers,
  registerRalphHandlers,
  registerRalphRuntimeHandlers,
  registerRalphSchedulerHandlers,
  registerRalphSafetyHandlers,
  registerAppIntakeHandlers,
  registerWorkspaceScaffoldingHandlers,
  registerDeliveryHandlers,
  registerMilestoneValidationHandlers,
  registerPortfolioHandlers,
  registerPortfolioRuntimeHandlers,
  registerMonitoringHandlers,
  registerBlueprintHandlers,
  registerHealthHandlers,
  registerFeedbackHandlers,
  registerDeliveredAppsHandlers,
  registerIterationBacklogHandlers,
  registerRunPatternsHandlers,
  registerPortfolioSummaryHandlers,
  registerPreviewHandlers,
  registerPolicyHandlers,
  registerConnectorHandlers,
  registerAnalyticsEventHandlers,
  registerAnalyticsRollupHandlers,
  registerBottleneckHandlers,
  registerForecastHandlers,
  registerRecommendationHandlers,
  registerReportHandlers,
  cleanupProcesses,
  ptyManager,
} from './main/ipc';
import { getDatabase, closeDatabase } from './main/database';
import { getSupervisor, resetSupervisor } from './main/supervisor';
import {
  resetRalphBootstrap,
  resetRalphValidator,
  resetRalphRuntime,
  resetRalphScheduler,
  resetRalphExecution,
  resetRalphSafety,
} from './main/index';
import { getMonitoringService } from './main/monitoringService';
import { getAutonomousScheduler } from './main/autonomousScheduler';

// Webpack magic constants
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Window reference for IPC
let mainWindow: BrowserWindow | null = null;

// Test isolation: allow overriding user data path via environment variable
// Supports both KNUTHFLOW_USER_DATA_DIR (legacy) and RALPH_USER_DATA_DIR (preferred)
const testUserDataPath = process.env.RALPH_USER_DATA_DIR ?? process.env.KNUTHFLOW_USER_DATA_DIR;
if (testUserDataPath) {
  fs.mkdirSync(testUserDataPath, { recursive: true });
  app.setPath('userData', testUserDataPath);
}

const getMainWindow = (): BrowserWindow | null => mainWindow;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation Constraints - Prevent renderer from navigating to untrusted origins
  // ─────────────────────────────────────────────────────────────────────────────

  // Block window.open calls from renderer
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Block renderer from navigating to arbitrary URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    // Only allow navigation within the app's origin
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Use session.setContentSecurityPolicy if available (Electron 28+)
  if ('setContentSecurityPolicy' in mainWindow.webContents.session) {
    (mainWindow.webContents.session as any).setContentSecurityPolicy(
      "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' ws://localhost:* http://localhost:* https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; worker-src 'self' blob: data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;"
    );
  }

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Register IPC Handlers
// ─────────────────────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  // Process handlers
  registerProcessHandlers();

  // PTY handlers
  registerPtyHandlers(getMainWindow);

  // Claude handlers
  registerClaudeHandlers(getMainWindow);

  // Storage handlers
  registerStorageHandlers();

  // Filesystem handlers
  registerFilesystemHandlers(getMainWindow);

  // App handlers
  registerAppHandlers();

  // Workspace handlers
  registerWorkspaceHandlers();

  // Session handlers
  registerSessionHandlers();

  // Supervisor handlers
  registerSupervisorHandlers();

  // Settings handlers
  registerSettingsHandlers();

  // Profile handlers
  registerProfileHandlers();

  // Secure storage handlers
  registerSecureStorageHandlers();

  // Logs handlers
  registerLogsHandlers();

  // Ralph handlers
  registerRalphHandlers();

  // Ralph runtime handlers
  registerRalphRuntimeHandlers();

  // Ralph scheduler handlers
  registerRalphSchedulerHandlers();

  // Ralph safety handlers
  registerRalphSafetyHandlers();

  // App intake handlers
  registerAppIntakeHandlers();

  // Workspace scaffolding handlers
  registerWorkspaceScaffoldingHandlers();

  // Delivery handlers
  registerDeliveryHandlers();

  // Milestone validation handlers
  registerMilestoneValidationHandlers();

  // Preview handlers (Phase 28 - Visual Validation)
  registerPreviewHandlers();

  // Portfolio handlers
  registerPortfolioHandlers();

  // Portfolio runtime handlers
  registerPortfolioRuntimeHandlers();

  // Monitoring handlers (Phase 19)
  registerMonitoringHandlers();

  // Blueprint handlers (Phase 20)
  registerBlueprintHandlers();

  // Phase 26 handlers (health, feedback, delivered apps, iteration backlog, run patterns)
  registerHealthHandlers();
  registerFeedbackHandlers();
  registerDeliveredAppsHandlers();
  registerIterationBacklogHandlers();
  registerRunPatternsHandlers();
  registerPortfolioSummaryHandlers();

  // Policy handlers (Phase 29)
  registerPolicyHandlers();

  // Connector handlers (Phase 30)
  registerConnectorHandlers();

  // Analytics and reporting handlers (Phase 31)
  registerAnalyticsEventHandlers();
  registerAnalyticsRollupHandlers();
  registerBottleneckHandlers();
  registerForecastHandlers();
  registerRecommendationHandlers();
  registerReportHandlers();
}

// ─────────────────────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

app.on('ready', () => {
  // Initialize database first
  getDatabase();

  // Register update handlers
  registerUpdateHandlers();

  // Register IPC handlers
  registerIpcHandlers();

  // Validate session integrity on startup and clean up orphaned sessions
  const supervisor = getSupervisor();
  const integrity = supervisor.validateSessionIntegrity();
  if (!integrity.valid) {
    console.log('[Supervisor] Session integrity issues found:', integrity.issues);
  }
  if (integrity.cleaned > 0) {
    console.log(`[Supervisor] Cleaned up ${integrity.cleaned} orphaned sessions`);
  }

  // Start the supervision loop
  supervisor.start();

  // Forward supervisor events to renderer
  supervisor.on('sessionCrashed', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('supervisor:sessionCrashed', data);
    }
  });

  supervisor.on('recoveryNeeded', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('supervisor:recoveryNeeded', data);
    }
  });

  supervisor.on('orphanCleaned', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('supervisor:orphanCleaned', data);
    }
  });

  // Start monitoring service (Phase 19)
  const monitoringService = getMonitoringService();
  monitoringService.start();

  // Start autonomous scheduler (Phase 19)
  const autonomousScheduler = getAutonomousScheduler();
  autonomousScheduler.start();

  // Create the main window
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cleanup processes on quit
app.on('will-quit', () => {
  // Cleanup process handlers
  cleanupProcesses();

  // Stop the supervisor
  resetSupervisor();

  // Reset Ralph singletons
  resetRalphBootstrap();
  resetRalphValidator();
  resetRalphRuntime();
  resetRalphScheduler();
  resetRalphExecution();
  resetRalphSafety();

  // Cleanup PTY manager
  ptyManager.dispose();

  // Stop monitoring service (Phase 19)
  getMonitoringService().stop();

  // Stop autonomous scheduler (Phase 19)
  getAutonomousScheduler().stop();

  // Cleanup database
  closeDatabase();
});
