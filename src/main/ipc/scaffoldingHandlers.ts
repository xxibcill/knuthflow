import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getWorkspaceScaffolder, type TemplateType } from '../ralph/workspaceScaffolder';

export interface ScaffoldResult {
  success: boolean;
  createdFiles?: string[];
  errors?: string[];
  templateUsed?: TemplateType | null;
}

/**
 * Register handlers for workspace scaffolding
 */
export function registerWorkspaceScaffoldingHandlers(): void {
  const scaffolder = getWorkspaceScaffolder();

  ipcMain.handle('scaffolding:getTemplates', async () => {
    return scaffolder.getTemplates().map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      applicablePlatforms: t.metadata.applicablePlatforms,
    }));
  });

  ipcMain.handle('scaffolding:scaffold', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string,
    templateType: TemplateType,
    appName: string
  ) => {
    try {
      const result = scaffolder.scaffold(workspacePath, templateType, appName);
      return result;
    } catch (error) {
      return {
        success: false,
        createdFiles: [],
        errors: [error instanceof Error ? error.message : String(error)],
        templateUsed: null,
      };
    }
  });

  ipcMain.handle('scaffolding:getMetadata', async (_event: IpcMainInvokeEvent, workspacePath: string) => {
    return scaffolder.getScaffoldMetadata(workspacePath);
  });

  ipcMain.handle('scaffolding:isScaffolded', async (_event: IpcMainInvokeEvent, workspacePath: string) => {
    return scaffolder.isScaffolded(workspacePath);
  });

  ipcMain.handle('scaffolding:getBuildCommands', async (_event: IpcMainInvokeEvent, workspacePath: string) => {
    return scaffolder.getBuildCommands(workspacePath);
  });
}
