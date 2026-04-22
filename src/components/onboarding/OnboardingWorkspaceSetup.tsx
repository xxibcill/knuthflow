// ─────────────────────────────────────────────────────────────────────────────
// OnboardingWorkspaceSetup - Workspace selection for onboarding
// Phase 27: P27-T1
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import type { Workspace } from '../../preload';

interface OnboardingWorkspaceSetupProps {
  onWorkspaceSelected: (workspaceId: string) => void;
  onOpenWorkspace: (workspacePath: string) => void;
}

export function OnboardingWorkspaceSetup({
  onWorkspaceSelected,
  onOpenWorkspace,
}: OnboardingWorkspaceSetupProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const list = await window.knuthflow.workspace.list();
        setWorkspaces(list);
      } catch (err) {
        console.error('Failed to load workspaces:', err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadWorkspaces();
  }, []);

  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setError(null);
  };

  const handleCreateWorkspace = useCallback(async () => {
    if (!newWorkspaceName.trim()) {
      setError('Please enter a workspace name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const workspacePath = `${process.env.HOME}/Documents/Ralph/${newWorkspaceName.trim()}`;
      const result = await window.knuthflow.workspace.create(
        newWorkspaceName.trim(),
        workspacePath,
      );

      if (!result.success) {
        setError(result.error || 'Failed to create workspace');
        setIsCreating(false);
        return;
      }

      const workspace = result.workspace!;
      setWorkspaces((prev) => [...prev, workspace]);
      setSelectedWorkspace(workspace);
      setNewWorkspaceName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      setIsCreating(false);
    }
  }, [newWorkspaceName]);

  const handleContinue = () => {
    if (selectedWorkspace) {
      onWorkspaceSelected(selectedWorkspace.id);
    }
  };

  const handleOpenExisting = () => {
    // This would trigger the system file picker
    // For now, we'll just show a message
    setError('Use the Projects panel to open an existing workspace');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted">Loading workspaces...</span>
      </div>
    );
  }

  return (
    <div className="workspace-setup space-y-4">
      {/* Existing workspaces */}
      {workspaces.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted">Existing Workspaces</h3>
          <div className="space-y-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleSelectWorkspace(workspace)}
                className={`w-full surface-panel-muted p-3 rounded-lg text-left transition-all ${
                  selectedWorkspace?.id === workspace.id
                    ? 'ring-2 ring-primary'
                    : 'hover:border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{workspace.name}</h4>
                    <p className="text-xs text-muted truncate">{workspace.path}</p>
                  </div>
                  {selectedWorkspace?.id === workspace.id && (
                    <span className="badge badge-primary">Selected</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create new workspace */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <h3 className="font-medium text-sm text-muted mb-2">Create New Workspace</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="my-first-app"
            className="form-input flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleCreateWorkspace();
              }
            }}
          />
          <button
            onClick={() => void handleCreateWorkspace()}
            className="btn btn-ghost"
            disabled={isCreating || !newWorkspaceName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
        <p className="text-xs text-muted mt-1">
          Workspace will be created in ~/Documents/Ralph/
        </p>
      </div>

      {/* Open existing */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <button onClick={handleOpenExisting} className="btn btn-ghost w-full">
          Open Existing Workspace...
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Continue button */}
      <div className="flex gap-3 justify-end pt-4">
        <button
          onClick={handleContinue}
          className="btn btn-primary"
          disabled={!selectedWorkspace}
        >
          Continue with Selected
        </button>
      </div>
    </div>
  );
}

export default OnboardingWorkspaceSetup;
