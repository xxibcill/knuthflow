import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDatabase } from '../database';
import { getPortfolioRuntime } from '../portfolioRuntime';

export function registerPortfolioRuntimeHandlers(): void {
  const portfolioRuntime = getPortfolioRuntime();

  ipcMain.handle('portfolioRuntime:start', async (_event: IpcMainInvokeEvent, portfolioId: string, projectId: string, name: string, sessionId: string, ptySessionId: string) => {
    return portfolioRuntime.start(portfolioId, projectId, name, sessionId, ptySessionId);
  });

  ipcMain.handle('portfolioRuntime:getQueuedRuns', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    return portfolioRuntime.getQueuedRuns(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:getQueueLength', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    return portfolioRuntime.getQueueLength(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:cancelQueuedRun', async (_event: IpcMainInvokeEvent, queuedRunId: string) => {
    return portfolioRuntime.cancelQueuedRun(queuedRunId);
  });

  ipcMain.handle('portfolioRuntime:getActiveRunCount', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    return portfolioRuntime.getActiveRunCount(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:getPortfolioActiveRuns', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    return portfolioRuntime.getPortfolioActiveRuns(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:updatePriority', async (_event: IpcMainInvokeEvent, portfolioProjectId: string, newPriority: number) => {
    portfolioRuntime.updatePriority(portfolioProjectId, newPriority);
  });

  ipcMain.handle('portfolioRuntime:setMaxConcurrentRuns', async (_event: IpcMainInvokeEvent, max: number) => {
    portfolioRuntime.setMaxConcurrentRuns(max);
  });

  ipcMain.handle('portfolioRuntime:getMaxConcurrentRuns', async (_event: IpcMainInvokeEvent) => {
    return portfolioRuntime.getMaxConcurrentRuns();
  });

  ipcMain.handle('portfolioRuntime:pauseAll', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    portfolioRuntime.pauseAll(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:resumeAll', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    portfolioRuntime.resumeAll(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:stopAll', async (_event: IpcMainInvokeEvent, portfolioId: string, reason?: 'user_stopped' | 'error' | 'completed') => {
    portfolioRuntime.stopAll(portfolioId, reason);
  });

  ipcMain.handle('portfolioRuntime:register', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    portfolioRuntime.registerPortfolio(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:unregister', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    portfolioRuntime.unregisterPortfolio(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:addProject', async (_event: IpcMainInvokeEvent, portfolioId: string, projectId: string) => {
    portfolioRuntime.addProjectToPortfolio(portfolioId, projectId);
  });

  ipcMain.handle('portfolioRuntime:removeProject', async (_event: IpcMainInvokeEvent, portfolioId: string, projectId: string) => {
    portfolioRuntime.removeProjectFromPortfolio(portfolioId, projectId);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Dependency Resolution (P16-T4)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('portfolioRuntime:getDependencyGraph', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    return portfolioRuntime.getDependencyGraph(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:detectCycles', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    return portfolioRuntime.detectDependencyCycles(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:getBuildOrder', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    return portfolioRuntime.getBuildOrder(portfolioId);
  });

  ipcMain.handle('portfolioRuntime:checkProjectCanStart', async (_event: IpcMainInvokeEvent, projectId: string, portfolioId: string) => {
    return portfolioRuntime.checkProjectCanStart(projectId, portfolioId);
  });

  ipcMain.handle('portfolioRuntime:parseAndStoreDependencies', async (_event: IpcMainInvokeEvent, portfolioProjectId: string, fixPlanContent: string) => {
    return portfolioRuntime.parseAndStoreDependencies(portfolioProjectId, fixPlanContent);
  });

  ipcMain.handle('portfolioRuntime:getAvailableArtifacts', async (_event: IpcMainInvokeEvent, projectId: string, portfolioId: string) => {
    return portfolioRuntime.getAvailableArtifacts(projectId, portfolioId);
  });

  ipcMain.handle('portfolioRuntime:propagateArtifact', async (_event: IpcMainInvokeEvent, projectId: string, artifactPath: string, artifactType: string) => {
    portfolioRuntime.propagateArtifact(projectId, artifactPath, artifactType);
  });

  ipcMain.handle('portfolioRuntime:clearProjectArtifacts', async (_event: IpcMainInvokeEvent, projectId: string) => {
    portfolioRuntime.clearProjectArtifacts(projectId);
  });
}
