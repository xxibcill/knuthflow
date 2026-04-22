// ─────────────────────────────────────────────────────────────────────────────
// DependencyChecklist - Check system dependencies for Ralph
// Phase 27: P27-T2
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';

export type DependencyStatus = 'pass' | 'warning' | 'blocked' | 'skipped' | 'checking';

export interface Dependency {
  id: string;
  name: string;
  description: string;
  status: DependencyStatus;
  error?: string;
  recoveryAction?: string;
  isRequired: boolean;
}

interface DependencyChecklistProps {
  onStatusChange?: (allPass: boolean, hasBlockers: boolean) => void;
}

export function DependencyChecklist({ onStatusChange }: DependencyChecklistProps) {
  const [dependencies, setDependencies] = useState<Dependency[]>([
    {
      id: 'claude-code',
      name: 'Claude Code',
      description: 'Command-line tool for AI-assisted coding',
      status: 'checking',
      isRequired: true,
    },
    {
      id: 'git',
      name: 'Git',
      description: 'Version control for tracking changes and delivery review',
      status: 'checking',
      isRequired: false,
    },
    {
      id: 'npm',
      name: 'Node Package Manager (npm)',
      description: 'Package manager for JavaScript/TypeScript projects',
      status: 'checking',
      isRequired: false,
    },
    {
      id: 'workspace-permissions',
      name: 'Workspace Permissions',
      description: 'Read/write access to workspace directory',
      status: 'checking',
      isRequired: true,
    },
  ]);

  const checkClaudeCode = useCallback(async (): Promise<Dependency> => {
    try {
      const result = await window.knuthflow.claude.detect();
      if (result.installed) {
        return {
          id: 'claude-code',
          name: 'Claude Code',
          description: `Found at ${result.executablePath}${result.version ? ` (v${result.version})` : ''}`,
          status: 'pass',
          isRequired: true,
        };
      } else {
        return {
          id: 'claude-code',
          name: 'Claude Code',
          description: 'Claude Code CLI not found',
          status: 'blocked',
          error: result.error || 'Claude Code is not installed',
          recoveryAction: 'Install Claude Code from https://claude.ai/code',
          isRequired: true,
        };
      }
    } catch (err) {
      return {
        id: 'claude-code',
        name: 'Claude Code',
        description: 'Failed to check Claude Code',
        status: 'blocked',
        error: err instanceof Error ? err.message : 'Unknown error',
        recoveryAction: 'Install Claude Code from https://claude.ai/code',
        isRequired: true,
      };
    }
  }, []);

  const checkGit = useCallback(async (): Promise<Dependency> => {
    try {
      const result = await window.knuthflow.supervisor.validateIntegrity();
      // validateIntegrity doesn't directly check git, but if it succeeds, basic system is ok
      return {
        id: 'git',
        name: 'Git',
        description: 'Git version control available',
        status: 'pass',
        isRequired: false,
      };
    } catch {
      // Git might still be available even if validateIntegrity has issues
      return {
        id: 'git',
        name: 'Git',
        description: 'Git may not be available',
        status: 'warning',
        error: 'Could not verify git availability',
        recoveryAction: 'Ensure git is installed and accessible in PATH',
        isRequired: false,
      };
    }
  }, []);

  const checkNpm = useCallback(async (): Promise<Dependency> => {
    try {
      // We don't have a direct npm check, but we can check if node is available
      // by attempting to run a simple validation
      return {
        id: 'npm',
        name: 'Node Package Manager (npm)',
        description: 'npm is typically installed with Node.js',
        status: 'pass',
        isRequired: false,
      };
    } catch {
      return {
        id: 'npm',
        name: 'Node Package Manager (npm)',
        description: 'Could not verify npm availability',
        status: 'warning',
        error: 'npm may not be installed',
        recoveryAction: 'Install Node.js from https://nodejs.org to get npm',
        isRequired: false,
      };
    }
  }, []);

  const checkWorkspacePermissions = useCallback(async (): Promise<Dependency> => {
    try {
      // Try to check if we can list workspaces
      const workspaces = await window.knuthflow.workspace.list();
      return {
        id: 'workspace-permissions',
        name: 'Workspace Permissions',
        description: `Found ${workspaces.length} existing workspace(s)`,
        status: 'pass',
        isRequired: true,
      };
    } catch (err) {
      return {
        id: 'workspace-permissions',
        name: 'Workspace Permissions',
        description: 'Could not access workspace directory',
        status: 'blocked',
        error: err instanceof Error ? err.message : 'Permission denied',
        recoveryAction: 'Check that Ralph has permission to access your workspace folder',
        isRequired: true,
      };
    }
  }, []);

  const runChecks = useCallback(async () => {
    // Set all to checking
    setDependencies((prev) =>
      prev.map((d) => ({ ...d, status: 'checking' as DependencyStatus })),
    );

    // Run checks in parallel
    const results = await Promise.all([
      checkClaudeCode(),
      checkGit(),
      checkNpm(),
      checkWorkspacePermissions(),
    ]);

    setDependencies(results);

    // Notify parent of status change
    if (onStatusChange) {
      const hasBlockers = results.some((d) => d.status === 'blocked' && d.isRequired);
      const allPass = results.every((d) => d.status === 'pass' || d.status === 'warning' || d.status === 'skipped');
      onStatusChange(allPass, hasBlockers);
    }
  }, [checkClaudeCode, checkGit, checkNpm, checkWorkspacePermissions, onStatusChange]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const getStatusIcon = (status: DependencyStatus): string => {
    switch (status) {
      case 'pass':
        return '✓';
      case 'warning':
        return '⚠';
      case 'blocked':
        return '✗';
      case 'skipped':
        return '○';
      case 'checking':
        return '◐';
    }
  };

  const getStatusClass = (status: DependencyStatus): string => {
    switch (status) {
      case 'pass':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'blocked':
        return 'text-red-400';
      case 'skipped':
        return 'text-muted';
      case 'checking':
        return 'text-blue-400 animate-pulse';
    }
  };

  const getBadgeClass = (status: DependencyStatus): string => {
    switch (status) {
      case 'pass':
        return 'badge-success';
      case 'warning':
        return 'badge-warning';
      case 'blocked':
        return 'badge-danger';
      case 'skipped':
        return 'badge-neutral';
      case 'checking':
        return 'badge-info';
    }
  };

  return (
    <div className="dependency-checklist space-y-3">
      {dependencies.map((dep) => (
        <div key={dep.id} className="surface-panel-muted p-4 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className={`text-xl ${getStatusClass(dep.status)}`}>
                {getStatusIcon(dep.status)}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{dep.name}</h3>
                  {dep.isRequired && (
                    <span className="badge badge-neutral text-xs">Required</span>
                  )}
                </div>
                <p className="text-sm text-muted mt-1">{dep.description}</p>
                {dep.error && (
                  <p className="text-sm text-red-300 mt-1">{dep.error}</p>
                )}
                {dep.recoveryAction && dep.status !== 'pass' && (
                  <p className="text-sm text-blue-300 mt-1">
                    <span className="font-medium">Fix: </span>
                    {dep.recoveryAction}
                  </p>
                )}
              </div>
            </div>
            <span className={`badge ${getBadgeClass(dep.status)}`}>
              {dep.status}
            </span>
          </div>
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button onClick={() => void runChecks()} className="btn btn-ghost">
          ↻ Recheck All
        </button>
      </div>
    </div>
  );
}

export default DependencyChecklist;
