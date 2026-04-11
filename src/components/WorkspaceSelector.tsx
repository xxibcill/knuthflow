import { useState, useEffect } from 'react';
import type { Workspace } from '../preload';

interface WorkspaceSelectorProps {
  onSelect: (workspace: Workspace) => void;
  selectedWorkspace: Workspace | null;
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
      setError('Name and path are required');
      return;
    }

    const validation = await window.knuthflow.workspace.validatePath(newPath);
    if (!validation.valid) {
      setError(validation.error || 'Invalid path');
      return;
    }

    const result = await window.knuthflow.workspace.create(newName.trim(), newPath.trim());
    if (!result.success) {
      setError(result.error || 'Failed to create workspace');
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

  const handleDeleteWorkspace = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await window.knuthflow.workspace.delete(id);
    await loadWorkspaces();
  };

  const handleBrowsePath = async () => {
    const result = await window.knuthflow.dialog.openDirectory({ defaultPath: newPath || undefined });
    if (result && !result.canceled && result.directoryPath) {
      setNewPath(result.directoryPath);
    }
  };

  const handleSelectWorkspace = (workspace: Workspace) => {
    onSelect(workspace);
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading workspaces...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Select Workspace</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add Workspace'}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-gray-800 rounded-lg p-3 mb-3">
            <input
              type="text"
              placeholder="Workspace name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-2"
            />
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Directory path (e.g., /Users/jjae/projects/myapp)"
                value={newPath}
                onChange={e => setNewPath(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleBrowsePath}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                title="Browse"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button
              onClick={handleAddWorkspace}
              className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
            >
              Add Workspace
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {recentWorkspaces.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Recent</h3>
            <div className="space-y-1">
              {recentWorkspaces.map(ws => (
                <div
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedWorkspace?.id === ws.id
                      ? 'bg-blue-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{ws.name}</div>
                      <div className="text-sm text-gray-400 truncate">{ws.path}</div>
                    </div>
                    <button
                      onClick={e => handleDeleteWorkspace(e, ws.id)}
                      className="p-1 text-gray-400 hover:text-red-400"
                      title="Delete workspace"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {workspaces.length > 0 && (
          <div className="p-4 pt-0">
            <h3 className="text-sm font-medium text-gray-400 mb-2">All Workspaces</h3>
            <div className="space-y-1">
              {workspaces.map(ws => (
                <div
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedWorkspace?.id === ws.id
                      ? 'bg-blue-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{ws.name}</div>
                      <div className="text-sm text-gray-400 truncate">{ws.path}</div>
                    </div>
                    <button
                      onClick={e => handleDeleteWorkspace(e, ws.id)}
                      className="p-1 text-gray-400 hover:text-red-400"
                      title="Delete workspace"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {workspaces.length === 0 && recentWorkspaces.length === 0 && !showAddForm && (
          <div className="p-8 text-center text-gray-400">
            <p className="mb-2">No workspaces configured</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-blue-400 hover:text-blue-300"
            >
              Add your first workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
