import { getDatabase } from './database';
import { getSecureStorage } from './secureStorage';
import {
  BUILT_IN_CONNECTOR_MANIFESTS,
  BUILT_IN_CONNECTORS,
  redactedConfig,
  type ConnectorManifest,
  type ConnectorConfig,
  type ConnectorHealth,
  type ConnectorCapability,
} from '../shared/connectorTypes';
import { captureConnectorInput, captureConnectorOutput, captureConnectorFailure } from './ralph/ralphArtifact';

// ─────────────────────────────────────────────────────────────────────────────
// Connector Registry Service
// ─────────────────────────────────────────────────────────────────────────────

interface ConnectorOperationContext {
  projectId?: string;
  runId?: string;
  iteration?: number;
  itemId?: string | null;
}

class ConnectorRegistry {
  private manifests: Map<string, ConnectorManifest> = new Map();
  private configs: Map<string, ConnectorConfig> = new Map();

  constructor() {
    // Load built-in connector manifests
    for (const manifest of BUILT_IN_CONNECTOR_MANIFESTS) {
      this.manifests.set(manifest.id, manifest);
    }
  }

  /**
   * Get all connector manifests
   */
  listManifests(): ConnectorManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Get manifest by connector ID
   */
  getManifest(connectorId: string): ConnectorManifest | undefined {
    return this.manifests.get(connectorId);
  }

  /**
   * Save a connector configuration
   */
  saveConfig(params: {
    connectorId: string;
    projectId?: string | null;
    scope?: 'global' | 'project';
    enabled?: boolean;
    configValues: Record<string, string>;
  }): ConnectorConfig {
    const db = getDatabase();
    const existingConfig = this.findConfigByConnectorAndProject(params.connectorId, params.projectId ?? null);

    const now = Date.now();
    const configId = existingConfig?.id || `conn-config-${crypto.randomUUID()}`;

    const config: ConnectorConfig = {
      id: configId,
      connectorId: params.connectorId,
      projectId: params.projectId ?? null,
      enabled: params.enabled ?? existingConfig?.enabled ?? true,
      scope: params.scope ?? existingConfig?.scope ?? (params.projectId ? 'project' : 'global'),
      configValues: params.configValues,
      createdAt: existingConfig?.createdAt ?? now,
      updatedAt: now,
    };

    // Store config in database
    db.saveConnectorConfig(config);

    // Store secrets in secure storage
    const secureStorage = getSecureStorage();
    for (const [key, value] of Object.entries(params.configValues)) {
      // Check if field is secret based on key name
      if (key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('key')) {
        secureStorage.set(`connector:${configId}:${key}`, value);
      }
    }

    this.configs.set(configId, config);
    return config;
  }

  /**
   * Get config by ID
   */
  getConfig(id: string): ConnectorConfig | null {
    // Check memory cache first
    if (this.configs.has(id)) {
      return this.configs.get(id)!;
    }

    // Load from database
    const db = getDatabase();
    const config = db.getConnectorConfig(id);
    if (config) {
      this.configs.set(id, config);
    }
    return config;
  }

  /**
   * List all configs, optionally filtered by project
   */
  listConfigs(projectId?: string | null): Array<ConnectorConfig & { health?: ConnectorHealth }> {
    const db = getDatabase();
    const configs = db.listConnectorConfigs(projectId);

    // Attach health status
    return configs.map(config => {
      const health = this.getHealthStatus(config);
      return { ...config, health };
    });
  }

  /**
   * Delete a connector config and its secrets
   */
  deleteConfig(id: string): boolean {
    const config = this.getConfig(id);
    if (!config) return false;

    // Remove secrets from secure storage
    const secureStorage = getSecureStorage();
    const manifest = this.getManifest(config.connectorId);
    if (manifest) {
      for (const field of manifest.configSchema) {
        if (field.secret || field.type === 'password') {
          secureStorage.delete(`connector:${id}:${field.key}`);
        }
      }
    }

    // Remove from database
    const db = getDatabase();
    db.deleteConnectorConfig(id);

    // Remove from cache
    this.configs.delete(id);

    return true;
  }

  /**
   * Test connection health for a connector config
   */
  testConnection(id: string): { status: 'healthy' | 'degraded' | 'error' | 'needs_auth'; message: string; latencyMs?: number } {
    const config = this.getConfig(id);
    if (!config) {
      return { status: 'error', message: 'Configuration not found' };
    }

    const manifest = this.getManifest(config.connectorId);
    if (!manifest) {
      return { status: 'error', message: 'Connector manifest not found' };
    }

    // Check if required auth fields are present (in secure storage)
    const secureStorage = getSecureStorage();
    const missingSecrets: string[] = [];

    for (const field of manifest.configSchema) {
      if (field.required && (field.secret || field.type === 'password')) {
        const secret = secureStorage.get(`connector:${id}:${field.key}`);
        if (!secret) {
          missingSecrets.push(field.label);
        }
      }
    }

    if (missingSecrets.length > 0) {
      return { status: 'needs_auth', message: `Missing credentials: ${missingSecrets.join(', ')}` };
    }

    // For built-in connectors, perform basic validation
    const startTime = Date.now();
    try {
      switch (config.connectorId) {
        case BUILT_IN_CONNECTORS.REPOSITORY:
          // Basic repository config check
          if (!config.configValues.defaultBranch) {
            return { status: 'degraded', message: 'Default branch not configured', latencyMs: Date.now() - startTime };
          }
          return { status: 'healthy', message: 'Repository connector is configured', latencyMs: Date.now() - startTime };

        case BUILT_IN_CONNECTORS.ISSUES:
          // Check tracker URL format
          if (!config.configValues.trackerUrl) {
            return { status: 'degraded', message: 'Tracker URL not configured', latencyMs: Date.now() - startTime };
          }
          return { status: 'healthy', message: 'Issue tracker connector is configured', latencyMs: Date.now() - startTime };

        case BUILT_IN_CONNECTORS.MONITORING:
          // Check monitoring endpoint
          if (!config.configValues.monitoringEndpoint) {
            return { status: 'degraded', message: 'Monitoring endpoint not configured', latencyMs: Date.now() - startTime };
          }
          return { status: 'healthy', message: 'Monitoring connector is configured', latencyMs: Date.now() - startTime };

        default:
          return { status: 'healthy', message: 'Connector is configured', latencyMs: Date.now() - startTime };
      }
    } catch (err) {
      return { status: 'error', message: `Health check failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  }

  /**
   * Get health status for a config
   */
  private getHealthStatus(config: ConnectorConfig): ConnectorHealth {
    const result = this.testConnection(config.id);
    return {
      connectorId: config.connectorId,
      configId: config.id,
      status: result.status,
      message: result.message,
      lastCheckedAt: Date.now(),
    };
  }

  /**
   * Get redacted config values for UI display
   */
  getRedactedConfig(id: string): Record<string, string> {
    const config = this.getConfig(id);
    if (!config) return {};
    return redactedConfig(config.configValues);
  }

  /**
   * Find config by connector ID and project
   */
  private findConfigByConnectorAndProject(connectorId: string, projectId: string | null): ConnectorConfig | undefined {
    const configs = this.listConfigs(projectId);
    return configs.find(c => c.connectorId === connectorId);
  }

  /**
   * Perform a connector operation with built-in implementations
   */
  async call(params: {
    connectorId: string;
    capability: ConnectorCapability;
    operation: 'read' | 'write' | 'delete' | 'publish' | 'deploy';
    targetScope?: string;
    resourceId?: string;
    params?: Record<string, unknown>;
  } & ConnectorOperationContext): Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string; retryable: boolean } }> {
    const config = this.findConfigByConnectorAndProject(params.connectorId, null) ||
                   this.findConfigByConnectorAndProject(params.connectorId, params.targetScope ?? null);

    if (!config) {
      return {
        success: false,
        error: { code: 'configuration_error', message: 'Connector not configured', retryable: false }
      };
    }

    const manifest = this.getManifest(params.connectorId);
    if (!manifest) {
      return {
        success: false,
        error: { code: 'unsupported_capability', message: 'Connector not found', retryable: false }
      };
    }

    // Check capability support
    if (!manifest.capabilities.includes(params.capability)) {
      return {
        success: false,
        error: { code: 'unsupported_capability', message: `Connector does not support ${params.capability}`, retryable: false }
      };
    }

    // Capture connector input artifact if context is provided
    if (params.projectId && params.runId && params.iteration !== undefined) {
      captureConnectorInput({
        projectId: params.projectId,
        runId: params.runId,
        iteration: params.iteration,
        itemId: params.itemId ?? null,
        connectorId: params.connectorId,
        capability: params.capability,
        operation: params.operation,
        targetScope: params.targetScope,
        resourceId: params.resourceId,
        inputParams: params.params ?? {},
      });
    }

    // Execute the built-in connector operation
    let result: { success: boolean; data?: unknown; error?: { code: string; message: string; retryable: boolean } };

    switch (params.connectorId) {
      case BUILT_IN_CONNECTORS.REPOSITORY:
        result = await this.executeRepositoryConnector(params);
        break;
      case BUILT_IN_CONNECTORS.ISSUES:
        result = await this.executeIssuesConnector(params);
        break;
      case BUILT_IN_CONNECTORS.DESIGN:
        result = await this.executeDesignConnector(params);
        break;
      case BUILT_IN_CONNECTORS.REGISTRY:
        result = await this.executeRegistryConnector(params);
        break;
      case BUILT_IN_CONNECTORS.MONITORING:
        result = await this.executeMonitoringConnector(params);
        break;
      default:
        result = {
          success: false,
          error: { code: 'unsupported_capability', message: 'Built-in connector operation not implemented', retryable: false }
        };
    }

    // Capture output or failure artifact
    if (params.projectId && params.runId && params.iteration !== undefined) {
      if (result.success) {
        captureConnectorOutput({
          projectId: params.projectId,
          runId: params.runId,
          iteration: params.iteration,
          itemId: params.itemId ?? null,
          connectorId: params.connectorId,
          capability: params.capability,
          operation: params.operation,
          success: true,
          outputData: result.data,
        });
      } else if (result.error) {
        captureConnectorFailure({
          projectId: params.projectId,
          runId: params.runId,
          iteration: params.iteration,
          itemId: params.itemId ?? null,
          connectorId: params.connectorId,
          capability: params.capability,
          operation: params.operation,
          errorCode: result.error.code,
          errorMessage: result.error.message,
          retryable: result.error.retryable,
        });
      }
    }

    return result;
  }

  /**
   * Execute repository connector operations (stub implementation)
   */
  private async executeRepositoryConnector(params: {
    capability: ConnectorCapability;
    operation: string;
    resourceId?: string;
    params?: Record<string, unknown>;
  }): Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string; retryable: boolean } }> {
    // Stub: return mock data for repository operations
    if (params.capability === 'repository:read') {
      return {
        success: true,
        data: { branches: ['main'], currentBranch: 'main', status: 'clean' }
      };
    }
    if (params.capability === 'repository:branch') {
      return {
        success: true,
        data: { branch: params.params?.branchName ?? 'feature-branch', created: true }
      };
    }
    return {
      success: false,
      error: { code: 'unsupported_capability', message: `Repository does not support ${params.capability}`, retryable: false }
    };
  }

  /**
   * Execute issues connector operations (stub implementation)
   */
  private async executeIssuesConnector(params: {
    capability: ConnectorCapability;
    operation: string;
    resourceId?: string;
    params?: Record<string, unknown>;
  }): Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string; retryable: boolean } }> {
    // Stub: return mock data for issue tracker operations
    if (params.capability === 'issues:read') {
      return {
        success: true,
        data: { issues: [], totalCount: 0 }
      };
    }
    if (params.capability === 'issues:write') {
      return {
        success: true,
        data: { issueId: `local-issue-${Date.now()}`, created: true }
      };
    }
    return {
      success: false,
      error: { code: 'unsupported_capability', message: `Issue tracker does not support ${params.capability}`, retryable: false }
    };
  }

  /**
   * Execute design connector operations (stub implementation)
   */
  private async executeDesignConnector(params: {
    capability: ConnectorCapability;
    operation: string;
    resourceId?: string;
    params?: Record<string, unknown>;
  }): Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string; retryable: boolean } }> {
    // Stub: return mock data for design source operations
    if (params.capability === 'design:read') {
      return {
        success: true,
        data: { frames: [], componentCount: 0 }
      };
    }
    if (params.capability === 'design:import') {
      return {
        success: true,
        data: { importedFrames: 0, notes: 'Design import is a stub in local mode' }
      };
    }
    return {
      success: false,
      error: { code: 'unsupported_capability', message: `Design source does not support ${params.capability}`, retryable: false }
    };
  }

  /**
   * Execute registry connector operations (stub implementation)
   */
  private async executeRegistryConnector(params: {
    capability: ConnectorCapability;
    operation: string;
    resourceId?: string;
    params?: Record<string, unknown>;
  }): Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string; retryable: boolean } }> {
    // Stub: return mock data for registry operations
    if (params.capability === 'registry:read') {
      return {
        success: true,
        data: { packages: [], totalCount: 0 }
      };
    }
    if (params.capability === 'registry:publish') {
      return {
        success: true,
        data: { published: true, version: params.params?.version ?? '1.0.0' }
      };
    }
    return {
      success: false,
      error: { code: 'unsupported_capability', message: `Registry does not support ${params.capability}`, retryable: false }
    };
  }

  /**
   * Execute monitoring connector operations (stub implementation)
   */
  private async executeMonitoringConnector(params: {
    capability: ConnectorCapability;
    operation: string;
    resourceId?: string;
    params?: Record<string, unknown>;
  }): Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string; retryable: boolean } }> {
    // Stub: return mock data for monitoring operations
    if (params.capability === 'monitoring:read') {
      return {
        success: true,
        data: { status: 'healthy', checks: {}, lastCheckAt: Date.now() }
      };
    }
    if (params.capability === 'monitoring:write') {
      return {
        success: true,
        data: { updated: true }
      };
    }
    return {
      success: false,
      error: { code: 'unsupported_capability', message: `Monitoring does not support ${params.capability}`, retryable: false }
    };
  }
}

// Singleton instance
let connectorRegistryInstance: ConnectorRegistry | null = null;

export function getConnectorRegistry(): ConnectorRegistry {
  if (!connectorRegistryInstance) {
    connectorRegistryInstance = new ConnectorRegistry();
  }
  return connectorRegistryInstance;
}

/**
 * Reset the connector registry singleton. For testing purposes only.
 */
export function resetConnectorRegistry(): void {
  connectorRegistryInstance = null;
}