// ─────────────────────────────────────────────────────────────────────────────
// Connector Types - Phase 30 Tool Connector Hub
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Connector capability types
 */
export type ConnectorCapability =
  | 'issues:read'
  | 'issues:write'
  | 'repository:read'
  | 'repository:write'
  | 'repository:branch'
  | 'design:read'
  | 'design:import'
  | 'registry:read'
  | 'registry:write'
  | 'registry:publish'
  | 'deployment:read'
  | 'deployment:write'
  | 'monitoring:read'
  | 'monitoring:write';

/**
 * Connector health status
 */
export type ConnectorHealthStatus = 'unknown' | 'healthy' | 'degraded' | 'error' | 'needs_auth';

/**
 * Connector configuration schema field
 */
export interface ConnectorConfigField {
  key: string;
  label: string;
  description: string;
  type: 'string' | 'password' | 'number' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: string | number | boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  secret?: boolean;
}

/**
 * Connector manifest - describes a connector's capabilities and requirements
 */
export interface ConnectorManifest {
  id: string;
  name: string;
  version: string;
  provider: string;
  description: string;
  capabilities: ConnectorCapability[];
  permissionRequirements: string[];
  configSchema: ConnectorConfigField[];
  healthCheckEndpoint?: string;
  unsupportedCapabilities?: string[];
}

/**
 * Connector instance configuration (per project/workspace)
 */
export interface ConnectorConfig {
  id: string;
  connectorId: string;
  projectId: string | null; // null = global scope
  enabled: boolean;
  scope: 'global' | 'project';
  configValues: Record<string, string>; // redacted in UI - secrets stored separately
  createdAt: number;
  updatedAt: number;
}

/**
 * Connector health status
 */
export interface ConnectorHealth {
  connectorId: string;
  configId: string;
  status: ConnectorHealthStatus;
  message: string | null;
  lastCheckedAt: number | null;
  errorCode?: string;
}

/**
 * Connector operation result
 */
export interface ConnectorOperationResult {
  success: boolean;
  data?: unknown;
  error?: ConnectorError;
}

/**
 * Connector error types
 */
export interface ConnectorError {
  code: ConnectorErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * Connector error codes
 */
export type ConnectorErrorCode =
  | 'auth_failure'
  | 'permission_denied'
  | 'rate_limit'
  | 'network_failure'
  | 'unsupported_capability'
  | 'not_found'
  | 'configuration_error'
  | 'unknown';

/**
 * Connector call context for policy enforcement
 */
export interface ConnectorCallContext {
  connectorId: string;
  capability: ConnectorCapability;
  targetScope?: string;
  resourceId?: string;
  operation: 'read' | 'write' | 'delete' | 'publish' | 'deploy';
}

/**
 * Built-in connector IDs
 */
export const BUILT_IN_CONNECTORS = {
  REPOSITORY: 'builtin:repository',
  ISSUES: 'builtin:issues',
  DESIGN: 'builtin:design',
  REGISTRY: 'builtin:registry',
  MONITORING: 'builtin:monitoring',
} as const;

/**
 * All built-in connector manifests
 */
export const BUILT_IN_CONNECTOR_MANIFESTS: ConnectorManifest[] = [
  {
    id: BUILT_IN_CONNECTORS.REPOSITORY,
    name: 'Repository',
    version: '1.0.0',
    provider: 'knuthflow',
    description: 'Repository operations for branch management, status checks, and metadata',
    capabilities: ['repository:read', 'repository:write', 'repository:branch'],
    permissionRequirements: ['read_repository', 'write_repository'],
    configSchema: [
      {
        key: 'defaultBranch',
        label: 'Default Branch',
        description: 'The default branch name (e.g., main, master)',
        type: 'string',
        required: false,
        defaultValue: 'main',
        placeholder: 'main',
      },
    ],
  },
  {
    id: BUILT_IN_CONNECTORS.ISSUES,
    name: 'Issue Tracker',
    version: '1.0.0',
    provider: 'knuthflow',
    description: 'Issue tracker integration for reading app requests and posting summaries',
    capabilities: ['issues:read', 'issues:write'],
    permissionRequirements: ['read_issues', 'write_issues'],
    configSchema: [
      {
        key: 'trackerUrl',
        label: 'Tracker URL',
        description: 'Base URL of the issue tracker (e.g., https://github.com)',
        type: 'string',
        required: true,
        placeholder: 'https://github.com',
      },
      {
        key: 'repository',
        label: 'Repository',
        description: 'Owner/repository slug (e.g., owner/repo)',
        type: 'string',
        required: true,
        placeholder: 'owner/repo',
      },
    ],
  },
  {
    id: BUILT_IN_CONNECTORS.DESIGN,
    name: 'Design Source',
    version: '1.0.0',
    provider: 'knuthflow',
    description: 'Design source integration for linking or importing design context',
    capabilities: ['design:read', 'design:import'],
    permissionRequirements: ['read_designs'],
    configSchema: [
      {
        key: 'designTool',
        label: 'Design Tool',
        description: 'The design tool to integrate with',
        type: 'select',
        required: true,
        options: [
          { label: 'Figma', value: 'figma' },
          { label: 'Sketch', value: 'sketch' },
        ],
      },
      {
        key: 'fileUrl',
        label: 'File URL',
        description: 'URL to the design file',
        type: 'string',
        required: false,
        placeholder: 'https://figma.com/file/...',
      },
    ],
  },
  {
    id: BUILT_IN_CONNECTORS.REGISTRY,
    name: 'Package Registry',
    version: '1.0.0',
    provider: 'knuthflow',
    description: 'Package registry for publishing and validating package targets',
    capabilities: ['registry:read', 'registry:write', 'registry:publish'],
    permissionRequirements: ['read_registry', 'write_registry'],
    configSchema: [
      {
        key: 'registryUrl',
        label: 'Registry URL',
        description: 'URL of the package registry',
        type: 'string',
        required: true,
        placeholder: 'https://npm.pkg.github.com',
      },
      {
        key: 'scope',
        label: 'Package Scope',
        description: 'Scope for published packages (e.g., @myorg)',
        type: 'string',
        required: false,
        placeholder: '@myorg',
      },
    ],
  },
  {
    id: BUILT_IN_CONNECTORS.MONITORING,
    name: 'Monitoring',
    version: '1.0.0',
    provider: 'knuthflow',
    description: 'Monitoring connector for fetching delivered-app health signals',
    capabilities: ['monitoring:read', 'monitoring:write'],
    permissionRequirements: ['read_monitoring', 'write_monitoring'],
    configSchema: [
      {
        key: 'monitoringEndpoint',
        label: 'Monitoring Endpoint',
        description: 'URL for health monitoring API',
        type: 'string',
        required: true,
        placeholder: 'https://api.example.com/monitor',
      },
      {
        key: 'healthCheckInterval',
        label: 'Check Interval (seconds)',
        description: 'How often to check health status',
        type: 'number',
        required: false,
        defaultValue: 60,
      },
    ],
  },
];

/**
 * Redact sensitive values from connector config for UI display
 */
export function redactedConfig(config: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    if (key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('auth')) {
      redacted[key] = '********';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Check if a connector supports a capability
 */
export function connectorSupports(manifest: ConnectorManifest, capability: ConnectorCapability): boolean {
  return manifest.capabilities.includes(capability);
}

/**
 * Get the error recovery message for a connector error code
 */
export function getConnectorErrorRecovery(code: ConnectorErrorCode): string {
  switch (code) {
    case 'auth_failure':
      return 'Check your credentials in connector settings and re-authenticate if needed.';
    case 'permission_denied':
      return 'Verify that your account has the required permissions for this operation.';
    case 'rate_limit':
      return 'Wait a moment and retry, or reduce the frequency of connector operations.';
    case 'network_failure':
      return 'Check your network connection and ensure the service is reachable.';
    case 'unsupported_capability':
      return 'This connector does not support the requested operation.';
    case 'not_found':
      return 'Verify the resource identifier and try again.';
    case 'configuration_error':
      return 'Review the connector configuration in settings.';
    default:
      return 'Retry the operation or check connector settings.';
  }
}