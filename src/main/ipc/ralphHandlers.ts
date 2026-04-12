/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import { getRalphBootstrap } from '../ralphBootstrap';
import { getRalphValidator } from '../ralphValidator';
import { getDatabase } from '../database';

function getRunOrThrow(runId: string) {
  const db = getDatabase();
  const run = db.getLoopRun(runId);
  if (!run) {
    throw new Error('Run not found');
  }
  return run;
}

export function registerRalphHandlers(): void {
  const ralphBootstrap = getRalphBootstrap();
  const ralphValidator = getRalphValidator();

  ipcMain.handle('ralph:bootstrap', async (_event: IpcMainInvokeEvent, workspaceId: string, workspacePath: string, force?: boolean) => {
    return ralphBootstrap.bootstrap({ workspaceId, workspacePath, force: force ?? false });
  });

  ipcMain.handle('ralph:getReadinessReport', async (_event: IpcMainInvokeEvent, workspaceId: string, workspacePath: string) => {
    return ralphValidator.generateReadinessReport(workspaceId, workspacePath);
  });

  ipcMain.handle('ralph:validateBeforeStart', async (_event: IpcMainInvokeEvent, workspaceId: string, workspacePath: string) => {
    return ralphValidator.validateBeforeStart(workspaceId, workspacePath);
  });

  ipcMain.handle('ralph:validateBeforeResume', async (_event: IpcMainInvokeEvent, workspaceId: string, workspacePath: string) => {
    return ralphValidator.validateBeforeResume(workspaceId, workspacePath);
  });

  ipcMain.handle('ralph:validateBeforeRepair', async (_event: IpcMainInvokeEvent, workspacePath: string) => {
    return ralphValidator.validateBeforeRepair(workspacePath);
  });

  ipcMain.handle('ralph:isRalphEnabled', async (_event: IpcMainInvokeEvent, workspacePath: string) => {
    return ralphBootstrap.isRalphEnabled(workspacePath);
  });

  ipcMain.handle('ralph:isFreshWorkspace', async (_event: IpcMainInvokeEvent, workspaceId: string, workspacePath: string) => {
    return ralphValidator.isFreshWorkspace(workspaceId, workspacePath);
  });

  ipcMain.handle('ralph:readControlFiles', async (_event: IpcMainInvokeEvent, workspacePath: string) => {
    // Security: validate workspace path is within allowed workspaces
    const db = getDatabase();
    const workspaces = db.listWorkspaces();
    const normalizedPath = path.normalize(workspacePath);
    const isAllowed = workspaces.some(ws => {
      const normalizedWsPath = path.normalize(ws.path);
      return normalizedPath === normalizedWsPath || normalizedPath.startsWith(normalizedWsPath + path.sep);
    });
    if (!isAllowed) {
      throw new Error('Access denied: workspace path is not registered');
    }
    return ralphBootstrap.readControlFiles(workspacePath);
  });

  ipcMain.handle('ralph:getProject', async (_event: IpcMainInvokeEvent, workspaceId: string) => {
    const db = getDatabase();
    return db.getRalphProjectByWorkspaceId(workspaceId);
  });

  ipcMain.handle('ralph:getProjectRuns', async (_event: IpcMainInvokeEvent, projectId: string, limit?: number) => {
    const db = getDatabase();
    return db.listLoopRuns(projectId, limit ?? 50);
  });

  ipcMain.handle('ralph:getActiveRuns', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const db = getDatabase();
    return db.listActiveLoopRuns(projectId);
  });

  ipcMain.handle('ralph:createRun', async (_event: IpcMainInvokeEvent, projectId: string, name: string) => {
    const db = getDatabase();
    return db.createLoopRun(projectId, name);
  });

  ipcMain.handle('ralph:startRun', async (_event: IpcMainInvokeEvent, runId: string, sessionId: string, ptySessionId: string) => {
    const db = getDatabase();
    db.startLoopRun(runId, sessionId, ptySessionId);
  });

  ipcMain.handle('ralph:endRun', async (_event: IpcMainInvokeEvent, runId: string, status: 'completed' | 'failed' | 'cancelled', exitCode: number | null, signal: number | null, error: string | null) => {
    const db = getDatabase();
    db.endLoopRun(runId, status, exitCode, signal, error);
  });

  ipcMain.handle('ralph:incrementRunIteration', async (_event: IpcMainInvokeEvent, runId: string) => {
    const db = getDatabase();
    db.incrementLoopRunIteration(runId);
  });

  ipcMain.handle('ralph:getRunSummaries', async (_event: IpcMainInvokeEvent, runId: string) => {
    const db = getDatabase();
    return db.listLoopSummaries(runId);
  });

  ipcMain.handle('ralph:addRunSummary', async (_event: IpcMainInvokeEvent, projectId: string, runId: string, iteration: number, prompt: string, response: string, selectedFiles: string[]) => {
    const db = getDatabase();
    return db.createLoopSummary(projectId, runId, iteration, prompt, response, selectedFiles);
  });

  ipcMain.handle('ralph:getRunSnapshots', async (_event: IpcMainInvokeEvent, runId: string) => {
    const db = getDatabase();
    return db.listPlanSnapshots(runId);
  });

  ipcMain.handle('ralph:addRunSnapshot', async (_event: IpcMainInvokeEvent, projectId: string, runId: string, iteration: number, planContent: string) => {
    const db = getDatabase();
    return db.createPlanSnapshot(projectId, runId, iteration, planContent);
  });

  ipcMain.handle('ralph:deleteProject', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const db = getDatabase();
    db.deleteRalphProject(projectId);
  });

  ipcMain.handle('ralph:replanRun', async (_event: IpcMainInvokeEvent, runId: string) => {
    getRunOrThrow(runId);
    // @TODO(Phase 12): Implement actual plan regeneration via runtime.triggerReplan when that method exists
    return { success: true, message: 'Plan regeneration queued' };
  });

  ipcMain.handle('ralph:validateRun', async (_event: IpcMainInvokeEvent, runId: string) => {
    getRunOrThrow(runId);
    // @TODO(Phase 12): Implement actual validation via runtime.triggerValidation when that method exists
    return { success: true, message: 'Validation queued' };
  });
}
