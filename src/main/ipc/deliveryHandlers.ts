import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import {
  getHandoffBundle,
  runPackaging,
  confirmRelease,
} from '../ralph/deliveryService';
import type { HandoffBundle } from '../../shared/deliveryTypes';

/**
 * Register handlers for delivery and handoff
 */
export function registerDeliveryHandlers(): void {
  ipcMain.handle('delivery:getHandoffBundle', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string
  ): Promise<{ success: boolean; bundle?: HandoffBundle; error?: string }> => {
    try {
      const result = getHandoffBundle(workspacePath);
      return { success: result.success, bundle: result.bundle, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('delivery:runPackaging', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string,
    deliveryFormat: string
  ): Promise<{ success: boolean; bundle?: HandoffBundle; error?: string }> => {
    try {
      const result = await runPackaging(workspacePath, deliveryFormat);
      return { success: result.success, bundle: result.bundle, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('delivery:confirmRelease', async (
    _event: IpcMainInvokeEvent,
    workspacePath: string
  ): Promise<{ success: boolean; bundle?: HandoffBundle; error?: string }> => {
    try {
      const result = confirmRelease(workspacePath);
      return { success: result.success, bundle: result.bundle, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}