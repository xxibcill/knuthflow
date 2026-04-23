import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getConnectorRegistry } from '../connectorRegistry';
import { checkPolicy, recordPolicyViolation } from '../ralph/policyEnforcement';
import type { ConnectorCapability } from '../../shared/connectorTypes';

/**
 * Map capability to policy enforcement action pattern
 */
function getCapabilityPolicyPattern(capability: ConnectorCapability): string {
  switch (capability) {
    case 'issues:read':
      return 'issues:read';
    case 'issues:write':
      return 'issues:write';
    case 'repository:read':
      return 'repository:read';
    case 'repository:write':
      return 'repository:write';
    case 'repository:branch':
      return 'repository:branch';
    case 'design:read':
      return 'design:read';
    case 'design:import':
      return 'design:import';
    case 'registry:read':
      return 'registry:read';
    case 'registry:write':
      return 'registry:write';
    case 'registry:publish':
      return 'registry:publish';
    case 'deployment:read':
      return 'deployment:read';
    case 'deployment:write':
      return 'deployment:write';
    case 'monitoring:read':
      return 'monitoring:read';
    case 'monitoring:write':
      return 'monitoring:write';
    default:
      return capability;
  }
}

export function registerConnectorHandlers(): void {
  const registry = getConnectorRegistry();

  // List all available connector manifests
  ipcMain.handle('connector:listManifests', async () => {
    try {
      const manifests = registry.listManifests();
      return { success: true, connectors: manifests };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // List connector configurations
  ipcMain.handle('connector:listConfigs', async (_event: IpcMainInvokeEvent, projectId?: string | null) => {
    try {
      const configs = registry.listConfigs(projectId);
      return { success: true, configs };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Get a single connector configuration
  ipcMain.handle('connector:getConfig', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      const config = registry.getConfig(id);
      if (!config) {
        return { success: false, error: 'Configuration not found' };
      }
      const manifest = registry.getManifest(config.connectorId);
      return { success: true, config: { ...config, manifest }, health: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Save connector configuration
  ipcMain.handle('connector:saveConfig', async (_event: IpcMainInvokeEvent, params: {
    connectorId: string;
    projectId?: string | null;
    scope?: 'global' | 'project';
    enabled?: boolean;
    configValues: Record<string, string>;
  }) => {
    try {
      const config = registry.saveConfig(params);
      return { success: true, config };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Delete connector configuration
  ipcMain.handle('connector:deleteConfig', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      const result = registry.deleteConfig(id);
      if (!result) {
        return { success: false, error: 'Configuration not found' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Test connector connection
  ipcMain.handle('connector:testConnection', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      const result = registry.testConnection(id);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Call a connector operation with policy enforcement
  ipcMain.handle('connector:call', async (_event: IpcMainInvokeEvent, params: {
    connectorId: string;
    capability: ConnectorCapability;
    operation: 'read' | 'write' | 'delete' | 'publish' | 'deploy';
    targetScope?: string;
    resourceId?: string;
    params?: Record<string, unknown>;
    projectId?: string;
    runId?: string;
    iteration?: number;
    itemId?: string | null;
  }) => {
    try {
      // First check policy if projectId is provided
      if (params.projectId) {
        const policyResult = checkPolicy(
          params.projectId,
          'connector_call',
          getCapabilityPolicyPattern(params.capability),
          {}
        );

        if (!policyResult.allowed) {
          // Record the policy violation
          for (const violation of policyResult.violations) {
            recordPolicyViolation(params.projectId, violation);
          }
          return {
            success: false,
            error: {
              code: 'permission_denied',
              message: `Policy denied: ${policyResult.violations[0]?.message || 'Access blocked'}`,
              retryable: false,
            }
          };
        }
      }

      // Perform the connector call
      const result = await registry.call({
        connectorId: params.connectorId,
        capability: params.capability,
        operation: params.operation,
        targetScope: params.targetScope,
        resourceId: params.resourceId,
        params: params.params,
        projectId: params.projectId,
        runId: params.runId,
        iteration: params.iteration,
        itemId: params.itemId,
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'unknown',
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        }
      };
    }
  });

  // Get redacted config for UI display
  ipcMain.handle('connector:redactedConfig', async (_event: IpcMainInvokeEvent, configId: string) => {
    try {
      const configValues = registry.getRedactedConfig(configId);
      return { success: true, configValues };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
