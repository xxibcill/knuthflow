import { ipcMain } from 'electron';
import { getBlueprintGenerator, type AppIntakeForm, type AppBlueprint } from '../ralph/blueprintGenerator';

export interface IntakeGenerationResult {
  success: boolean;
  blueprint?: AppBlueprint;
  filesCreated?: string[];
  error?: string;
  code?: string;
}

/**
 * Register handlers for the app intake and blueprint generation workflow
 */
export function registerAppIntakeHandlers(): void {
  const generator = getBlueprintGenerator();

  ipcMain.handle('appintake:generateBlueprint', async (_event: IpcMainInvokeEvent, intake: AppIntakeForm) => {
    try {
      // Validate intake form
      if (!intake.appName?.trim()) {
        return { success: false, error: 'App name is required', code: 'MISSING_APP_NAME' };
      }
      if (!intake.appBrief?.trim()) {
        return { success: false, error: 'App brief is required', code: 'MISSING_APP_BRIEF' };
      }
      if (!intake.targetPlatform) {
        return { success: false, error: 'Target platform is required', code: 'MISSING_PLATFORM' };
      }

      const blueprint = generator.generateBlueprint(intake);
      return { success: true, blueprint };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: 'BLUEPRINT_GENERATION_FAILED',
      };
    }
  });

  ipcMain.handle('appintake:writeBlueprintFiles', async (_event: IpcMainInvokeEvent, workspacePath: string, blueprint: AppBlueprint) => {
    try {
      const result = generator.writeBlueprintFiles(workspacePath, blueprint);
      if (result.errors.length > 0) {
        return {
          success: false,
          filesCreated: result.created,
          error: result.errors.join('; '),
          code: 'FILE_WRITE_FAILED',
        };
      }
      return { success: true, filesCreated: result.created };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: 'FILE_WRITE_FAILED',
      };
    }
  });

  ipcMain.handle('appintake:validateIntake', async (_event: IpcMainInvokeEvent, intake: AppIntakeForm) => {
    const issues: string[] = [];

    if (!intake.appName?.trim()) {
      issues.push('App name is required');
    }
    if (!intake.appBrief?.trim()) {
      issues.push('App brief is required');
    }
    if (!intake.targetPlatform) {
      issues.push('Target platform is required');
    }
    if (!intake.deliveryFormat) {
      issues.push('Delivery format is required');
    }
    if (intake.maxBuildTime <= 0) {
      issues.push('Max build time must be positive');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  });
}
