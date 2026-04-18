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
    throw new Error('Replan is not implemented yet');
  });

  ipcMain.handle('ralph:validateRun', async (_event: IpcMainInvokeEvent, runId: string) => {
    getRunOrThrow(runId);
    throw new Error('Validation is not implemented yet');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Learning Pipeline (Phase 17)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('ralph:getLearning', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const db = getDatabase();
    return db.listLoopLearning(projectId);
  });

  ipcMain.handle('ralph:getLearningRules', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const { generateLearningRules } = await import('../ralph/ralphLoopLearner');
    const db = getDatabase();
    const learning = db.listLoopLearning(projectId);
    return generateLearningRules(learning);
  });

  ipcMain.handle('ralph:getLearningSummary', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const { generateLearningSummary } = await import('../ralph/ralphLoopLearner');
    return generateLearningSummary(projectId);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Delivery Metrics (Phase 17)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('ralph:getDeliveryMetrics', async (_event: IpcMainInvokeEvent, projectId: string, limit?: number) => {
    const db = getDatabase();
    return db.listDeliveryMetrics(projectId, limit ?? 50);
  });

  ipcMain.handle('ralph:getLatestDeliveryMetrics', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const db = getDatabase();
    return db.getLatestDeliveryMetrics(projectId);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Lessons Learned (Phase 17)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('ralph:getLessonsLearned', async (_event: IpcMainInvokeEvent, projectId: string, limit?: number) => {
    const db = getDatabase();
    return db.listLessonsLearned(projectId, limit ?? 50);
  });

  ipcMain.handle('ralph:getGlobalLessonsLearned', async (_event: IpcMainInvokeEvent, limit?: number) => {
    const db = getDatabase();
    return db.listGlobalLessonsLearned(limit ?? 100);
  });

  ipcMain.handle('ralph:getLessonsByRun', async (_event: IpcMainInvokeEvent, runId: string) => {
    const db = getDatabase();
    return db.getLessonsLearnedByRun(runId);
  });

  ipcMain.handle('ralph:generateLessonsSummary', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const { getLessonsSummary } = await import('../ralph/lessonsLearnedGenerator');
    return getLessonsSummary(projectId);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompt Countermeasures (Phase 17)
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('ralph:getCountermeasures', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const { getAllCountermeasures } = await import('../ralph/promptInjectionManager');
    return getAllCountermeasures(projectId);
  });

  ipcMain.handle('ralph:getActiveCountermeasures', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const { getActiveCountermeasures } = await import('../ralph/promptInjectionManager');
    return getActiveCountermeasures(projectId);
  });

  ipcMain.handle('ralph:setAutoInject', async (_event: IpcMainInvokeEvent, projectId: string, enabled: boolean) => {
    const { setAutoInjectEnabled } = await import('../ralph/promptInjectionManager');
    setAutoInjectEnabled(projectId, enabled);
    return { success: true };
  });

  ipcMain.handle('ralph:isAutoInjectEnabled', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const { isAutoInjectEnabled } = await import('../ralph/promptInjectionManager');
    return isAutoInjectEnabled(projectId);
  });

  ipcMain.handle('ralph:approveCountermeasure', async (_event: IpcMainInvokeEvent, countermeasureId: string) => {
    const { approveCountermeasure } = await import('../ralph/promptInjectionManager');
    approveCountermeasure(countermeasureId);
    return { success: true };
  });

  ipcMain.handle('ralph:readPromptCountermeasures', async (_event: IpcMainInvokeEvent, promptMdPath: string) => {
    const { readExistingCountermeasures } = await import('../ralph/promptInjectionManager');
    return readExistingCountermeasures(promptMdPath);
  });
}
