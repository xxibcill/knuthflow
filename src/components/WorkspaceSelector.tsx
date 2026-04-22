import { useEffect, useState, type MouseEvent } from 'react';
import type { Workspace } from '../preload';

interface WorkspaceSelectorProps {
  onSelect: (workspace: Workspace) => void;
  selectedWorkspace: Workspace | null;
}

function WorkspaceCard({
  workspace,
  selected,
  onSelect,
  onDelete,
}: {
  workspace: Workspace;
  selected: boolean;
  onSelect: (workspace: Workspace) => void;
  onDelete: (id: string, event: MouseEvent) => void;
}) {
  return (
    <div
      onClick={() => onSelect(workspace)}
      className={`list-card cursor-pointer ${selected ? 'selected' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="list-card-title truncate">{workspace.name}</h3>
          {selected && <span className="badge badge-info">Active</span>}
        </div>
        <p className="list-card-path text-sm text-mono truncate" title={workspace.path}>
          {workspace.path}
        </p>
        <p className="mt-2 text-xs text-dim">
          Open this repository to launch or resume an operator session.
        </p>
      </div>

      <button
        onClick={(event) => onDelete(workspace.id, event)}
        className="btn btn-ghost btn-icon"
        title="Delete workspace"
      >
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function WorkspaceSelector({ onSelect, selectedWorkspace }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState<Workspace[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setLoading(true);
    const [all, recent] = await Promise.all([
      window.knuthflow.workspace.list(),
      window.knuthflow.workspace.listRecent(10),
    ]);
    setWorkspaces(all);
    setRecentWorkspaces(recent);
    setLoading(false);
  };

  const handleAddWorkspace = async () => {
    setError('');
    if (!newName.trim() || !newPath.trim()) {
      setError('Name and path are required.');
      return;
    }

    const validation = await window.knuthflow.workspace.validatePath(newPath);
    if (!validation.valid) {
      setError(validation.error || 'Invalid path.');
      return;
    }

    const result = await window.knuthflow.workspace.create(newName.trim(), newPath.trim());
    if (!result.success) {
      setError(result.error || 'Failed to create workspace.');
      return;
    }

    setNewName('');
    setNewPath('');
    setShowAddForm(false);
    await loadWorkspaces();

    if (result.workspace) {
      onSelect(result.workspace);
    }
  };

  const handleDeleteWorkspace = async (id: string, event: MouseEvent) => {
    event.stopPropagation();
    await window.knuthflow.workspace.delete(id);
    await loadWorkspaces();
  };

  const handleBrowsePath = async () => {
    const result = await window.knuthflow.dialog.openDirectory({ defaultPath: newPath || undefined });
    if (result && !result.canceled && result.directoryPath) {
      setNewPath(result.directoryPath);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div>
          <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold">Loading workspaces</h3>
          <p className="mt-2 text-sm text-muted">Reading recent repositories and saved paths.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Workspace Directory</h2>
          <p className="section-lead">
            Keep your repositories indexed and jump into the one you want to operate on next.
          </p>
        </div>
        <div className="toolbar-inline">
          <span className="badge badge-neutral">{workspaces.length} total</span>
          <button onClick={() => setShowAddForm(value => !value)} className={`btn ${showAddForm ? '' : 'btn-primary'}`}>
            {showAddForm ? 'Hide Form' : 'Add Workspace'}
          </button>
        </div>
      </div>

      <div className="list-pane">
        <div className="stack-lg">
          {showAddForm && (
            <div className="surface-panel-muted p-5">
              <div className="mb-4">
                <p className="metric-label">Register Workspace</p>
                <p className="m-0 text-sm text-muted">
                  Give this Ralph workspace a clear name and point it to the project root.
                </p>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Workspace Name</span>
                  <input
                    type="text"
                    placeholder="Inference Service"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    className="input"
                  />
                </label>

                <div className="field">
                  <span className="field-label">Directory Path</span>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="/Users/jjae/projects/knuthflow"
                      value={newPath}
                      onChange={(event) => setNewPath(event.target.value)}
                      className="input flex-1"
                    />
                    <button onClick={handleBrowsePath} className="btn" title="Browse for directory">
                      Browse
                    </button>
                  </div>
                  <span className="field-help">Use the project root so session state and file actions resolve correctly.</span>
                  {error && <span className="field-error">{error}</span>}
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowAddForm(false)} className="btn">Cancel</button>
                  <button onClick={handleAddWorkspace} className="btn btn-primary">Save Workspace</button>
                </div>
              </div>
            </div>
          )}

          {recentWorkspaces.length > 0 && (
            <section className="stack-md">
              <div className="toolbar-inline justify-between">
                <div>
                  <p className="metric-label">Recent</p>
                  <p className="m-0 text-sm text-muted">Repositories you touched most recently.</p>
                </div>
              </div>
              <div className="stack-md">
                {recentWorkspaces.map(workspace => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    selected={selectedWorkspace?.id === workspace.id}
                    onSelect={onSelect}
                    onDelete={handleDeleteWorkspace}
                  />
                ))}
              </div>
            </section>
          )}

          {workspaces.length > 0 && (
            <section className="stack-md">
              <div>
                <p className="metric-label">All Workspaces</p>
                <p className="m-0 text-sm text-muted">Saved repositories available to every session.</p>
              </div>
              <div className="stack-md">
                {workspaces.map(workspace => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    selected={selectedWorkspace?.id === workspace.id}
                    onSelect={onSelect}
                    onDelete={handleDeleteWorkspace}
                  />
                ))}
              </div>
            </section>
          )}

          {workspaces.length === 0 && recentWorkspaces.length === 0 && !showAddForm && (
            <div className="empty-state surface-panel-muted">
              <div>
                <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold">No Ralph workspaces yet</h3>
                <p className="mt-2 text-sm text-muted">
                  Add a repository to give Ralph a workspace to operate in.
                </p>
                <button onClick={() => setShowAddForm(true)} className="btn btn-primary mt-4">
                  Add Ralph Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
