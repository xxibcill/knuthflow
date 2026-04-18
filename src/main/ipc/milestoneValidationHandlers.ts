import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { getMilestoneValidation } from '../ralph/milestoneValidation';
import type { MilestoneEvidence } from '../ralph/milestoneValidation';

/**
 * Register handlers for milestone validation
 */
export function registerMilestoneValidationHandlers(): void {
  const validation = getMilestoneValidation();

  ipcMain.handle('milestoneValidation:runPreviewValidation', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string,
    timeoutMs?: number
  ) => {
    try {
      const result = await validation.runPreviewValidation({ workspacePath, timeoutMs });
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('milestoneValidation:runBuildValidation', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string,
    timeoutMs?: number
  ) => {
    try {
      const result = await validation.runBuildValidation({ workspacePath, timeoutMs });
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('milestoneValidation:runTestValidation', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string,
    timeoutMs?: number
  ) => {
    try {
      const result = await validation.runTestValidation({ workspacePath, timeoutMs });
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('milestoneValidation:runLintValidation', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string,
    timeoutMs?: number
  ) => {
    try {
      const result = await validation.runLintValidation({ workspacePath, timeoutMs });
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('milestoneValidation:runMilestoneValidation', async (
    _event: IpcMainInvokeEvent,
    projectId: string,
    runId: string,
    milestoneId: string,
    workspacePath: string,
    timeoutMs?: number
  ) => {
    try {
      const evidence = await validation.runMilestoneValidation(
        projectId,
        runId,
        milestoneId,
        { workspacePath, timeoutMs }
      );
      return { success: true, result: evidence };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('milestoneValidation:determineFeedback', async (
    _event: IpcMainInvokeEvent,
    evidence: MilestoneEvidence
  ) => {
    try {
      const feedback = validation.determineFeedback(evidence);
      return { success: true, feedback };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('milestoneValidation:canCompleteMilestone', async (
    _event: IpcMainInvokeEvent,
    projectId: string,
    runId: string,
    milestoneId: string
  ) => {
    try {
      const result = await validation.canCompleteMilestone(projectId, runId, milestoneId);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('milestoneValidation:completeMilestone', async (
    _event: IpcMainInvokeEvent,
    projectId: string,
    runId: string,
    milestoneId: string
  ) => {
    try {
      const result = await validation.completeMilestone(projectId, runId, milestoneId);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}