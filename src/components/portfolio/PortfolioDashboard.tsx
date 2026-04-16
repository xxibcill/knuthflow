import React, { useCallback, useEffect, useState } from 'react';
import type { Portfolio, PortfolioProject, LoopRun, LoopState } from '../../preload';
import type { Workspace } from '../../preload';

interface ActivePortfolioRun {
  run: LoopRun;
  state: LoopState;
  projectId: string;
}

interface QueuedRun {
  id: string;
  portfolioId: string;
  projectId: string;
  runName: string;
  sessionId: string;
  ptySessionId: string;
  priority: number;
  queuedAt: number;
}

interface PortfolioWithProjects extends Portfolio {
  projects: Array<PortfolioProject & { workspace?: Workspace }>;
}

interface DependencyEdge {
  from: string;
  to: string;
}

function getStatusBadgeClass(status: string): string {
  if (status === 'completed') return 'badge badge-success';
  if (status === 'failed') return 'badge badge-danger';
  if (status === 'paused' || status === 'cancelled') return 'badge badge-warning';
  if (status === 'running') return 'badge badge-info';
  return 'badge badge-neutral';
}

function getStateBadgeClass(state: LoopState): string {
  if (state === 'completed') return 'badge badge-success';
  if (state === 'failed') return 'badge badge-danger';
  if (state === 'paused' || state === 'cancelled') return 'badge badge-warning';
  if (state === 'idle' || state === 'starting') return 'badge badge-neutral';
  return 'badge badge-info';
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function DependencyGraph({ dependencies, projectNames }: { dependencies: DependencyEdge[]; projectNames: Map<string, string> }) {
  if (dependencies.length === 0) {
    return (
      <div className="text-sm text-muted italic">No dependencies configured</div>
    );
  }

  return (
    <div className="space-y-2">
      {dependencies.map((dep, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-inset)]">
            {projectNames.get(dep.from) || dep.from.slice(0, 8)}
          </span>
          <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-inset)]">
            {projectNames.get(dep.to) || dep.to.slice(0, 8)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ProjectCardProps {
  portfolioProject: PortfolioProject & { workspace?: Workspace };
  activeRuns: ActivePortfolioRun[];
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onUpdateDependency: () => void;
}

function ProjectCard({ portfolioProject, activeRuns, onPause, onResume, onStop, onUpdateDependency }: ProjectCardProps) {
  const hasRunning = activeRuns.some(r => r.state === 'executing' || r.state === 'starting');
  const hasPaused = activeRuns.some(r => r.state === 'paused');

  return (
    <div className="surface-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold truncate">
              {portfolioProject.workspace?.name || portfolioProject.projectId.slice(0, 12)}
            </h4>
            <span className={getStatusBadgeClass(portfolioProject.status)}>
              {portfolioProject.status}
            </span>
          </div>
          {portfolioProject.workspace && (
            <p className="mt-1 text-xs text-muted font-mono truncate">
              {portfolioProject.workspace.path}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-muted">
            <span>Priority: {portfolioProject.priority}</span>
            <span>Project: {portfolioProject.projectId.slice(0, 8)}...</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {hasRunning ? (
            <>
              <button onClick={onPause} className="btn btn-ghost text-xs" title="Pause all runs">
                Pause
              </button>
              <button onClick={onStop} className="btn btn-ghost text-xs text-red-400" title="Stop all runs">
                Stop
              </button>
            </>
          ) : hasPaused ? (
            <>
              <button onClick={onResume} className="btn btn-ghost text-xs" title="Resume all runs">
                Resume
              </button>
              <button onClick={onStop} className="btn btn-ghost text-xs text-red-400" title="Stop all runs">
                Stop
              </button>
            </>
          ) : (
            <span className="text-xs text-muted px-2">No active runs</span>
          )}
        </div>
      </div>

      {activeRuns.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-muted">Active Runs</p>
          {activeRuns.map((run) => (
            <div key={run.run.id} className="flex items-center justify-between text-sm bg-[var(--bg-inset)] p-2 rounded">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs">{run.run.name}</p>
                <p className="text-xs text-muted">
                  Iteration {run.run.iterationCount} • {run.state}
                </p>
              </div>
              <span className={getStateBadgeClass(run.state)}>{run.state}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onUpdateDependency}
        className="mt-3 text-xs text-muted hover:text-[var(--text-primary)] transition-colors"
      >
        Edit Dependencies
      </button>
    </div>
  );
}

export function PortfolioDashboard() {
  const [portfolios, setPortfolios] = useState<PortfolioWithProjects[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioWithProjects | null>(null);
  const [activeRuns, setActiveRuns] = useState<Map<string, ActivePortfolioRun[]>>(new Map());
  const [queuedRuns, setQueuedRuns] = useState<QueuedRun[]>([]);
  const [maxConcurrentRuns, setMaxConcurrentRuns] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');
  const [availableProjects, setAvailableProjects] = useState<Array<{ project: { id: string; workspaceId: string }; workspace?: Workspace }>>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadPortfolios = useCallback(async () => {
    setIsLoading(true);
    try {
      const portfolioList = await window.knuthflow.portfolio.list();
      const portfoliosWithProjects: PortfolioWithProjects[] = [];

      for (const portfolio of portfolioList) {
        const projects = await window.knuthflow.portfolio.listProjects(portfolio.id);
        const projectsWithWorkspace: Array<PortfolioProject & { workspace?: Workspace }> = [];

        for (const pp of projects) {
          const workspace = await window.knuthflow.workspace.get(pp.projectId.replace('ralph-', ''));
          projectsWithWorkspace.push({ ...pp, workspace: workspace ?? undefined });
        }

        portfoliosWithProjects.push({ ...portfolio, projects: projectsWithWorkspace });
      }

      setPortfolios(portfoliosWithProjects);

      if (selectedPortfolio) {
        const updated = portfoliosWithProjects.find(p => p.id === selectedPortfolio.id);
        if (updated) {
          setSelectedPortfolio(updated);
        }
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      showNotification('error', 'Failed to load portfolios');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPortfolio]);

  const loadActiveRuns = useCallback(async (portfolioId: string) => {
    try {
      const runs = await window.knuthflow.portfolioRuntime.getPortfolioActiveRuns(portfolioId);
      const runsMap = new Map<string, ActivePortfolioRun[]>();

      for (const run of runs) {
        const existing = runsMap.get(run.projectId) || [];
        existing.push({ run: run.run, state: run.state, projectId: run.projectId });
        runsMap.set(run.projectId, existing);
      }

      setActiveRuns(runsMap);
    } catch (error) {
      console.error('Failed to load active runs:', error);
    }
  }, []);

  const loadQueuedRuns = useCallback(async (portfolioId: string) => {
    try {
      const queued = await window.knuthflow.portfolioRuntime.getQueuedRuns(portfolioId);
      setQueuedRuns(queued);
    } catch (error) {
      console.error('Failed to load queued runs:', error);
    }
  }, []);

  const loadMaxConcurrentRuns = useCallback(async () => {
    try {
      const max = await window.knuthflow.portfolioRuntime.getMaxConcurrentRuns();
      setMaxConcurrentRuns(max);
    } catch (error) {
      console.error('Failed to load max concurrent runs:', error);
    }
  }, []);

  const loadAvailableProjects = useCallback(async () => {
    try {
      const workspaces = await window.knuthflow.workspace.list();
      const projects: Array<{ project: { id: string; workspaceId: string }; workspace?: Workspace }> = [];

      for (const workspace of workspaces) {
        const ralphProject = await window.knuthflow.ralph.getProject(workspace.id);
        if (ralphProject) {
          projects.push({ project: ralphProject, workspace });
        }
      }

      setAvailableProjects(projects);
    } catch (error) {
      console.error('Failed to load available projects:', error);
    }
  }, []);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleCreatePortfolio = useCallback(async () => {
    if (!newPortfolioName.trim()) {
      showNotification('error', 'Portfolio name is required');
      return;
    }

    try {
      const portfolio = await window.knuthflow.portfolio.create(newPortfolioName.trim(), newPortfolioDescription.trim());
      await window.knuthflow.portfolioRuntime.register(portfolio.id);
      await loadPortfolios();
      setShowCreateDialog(false);
      setNewPortfolioName('');
      setNewPortfolioDescription('');
      showNotification('success', `Portfolio "${portfolio.name}" created`);
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to create portfolio');
    }
  }, [newPortfolioName, newPortfolioDescription, loadPortfolios, showNotification]);

  const handleDeletePortfolio = useCallback(async (portfolioId: string) => {
    try {
      await window.knuthflow.portfolioRuntime.unregister(portfolioId);
      await window.knuthflow.portfolio.delete(portfolioId);
      if (selectedPortfolio?.id === portfolioId) {
        setSelectedPortfolio(null);
      }
      await loadPortfolios();
      showNotification('success', 'Portfolio deleted');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to delete portfolio');
    }
  }, [selectedPortfolio, loadPortfolios, showNotification]);

  const handleAddProject = useCallback(async (projectId: string) => {
    if (!selectedPortfolio) return;

    try {
      await window.knuthflow.portfolio.addProject(selectedPortfolio.id, projectId);
      await window.knuthflow.portfolioRuntime.addProject(selectedPortfolio.id, projectId);
      await loadPortfolios();
      setShowAddProjectDialog(false);
      showNotification('success', 'Project added to portfolio');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to add project');
    }
  }, [selectedPortfolio, loadPortfolios, showNotification]);

  const handleRemoveProject = useCallback(async (portfolioProjectId: string, projectId: string) => {
    if (!selectedPortfolio) return;

    try {
      await window.knuthflow.portfolioRuntime.removeProject(selectedPortfolio.id, projectId);
      await window.knuthflow.portfolio.removeProject(portfolioProjectId);
      await loadPortfolios();
      showNotification('success', 'Project removed from portfolio');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to remove project');
    }
  }, [selectedPortfolio, loadPortfolios, showNotification]);

  const handlePauseAll = useCallback(async () => {
    if (!selectedPortfolio) return;
    try {
      await window.knuthflow.portfolioRuntime.pauseAll(selectedPortfolio.id);
      await loadActiveRuns(selectedPortfolio.id);
      showNotification('success', 'All runs paused');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to pause runs');
    }
  }, [selectedPortfolio, loadActiveRuns, showNotification]);

  const handleResumeAll = useCallback(async () => {
    if (!selectedPortfolio) return;
    try {
      await window.knuthflow.portfolioRuntime.resumeAll(selectedPortfolio.id);
      await loadActiveRuns(selectedPortfolio.id);
      showNotification('success', 'All runs resumed');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to resume runs');
    }
  }, [selectedPortfolio, loadActiveRuns, showNotification]);

  const handleStopAll = useCallback(async () => {
    if (!selectedPortfolio) return;
    try {
      await window.knuthflow.portfolioRuntime.stopAll(selectedPortfolio.id, 'user_stopped');
      await loadActiveRuns(selectedPortfolio.id);
      await loadQueuedRuns(selectedPortfolio.id);
      showNotification('success', 'All runs stopped');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to stop runs');
    }
  }, [selectedPortfolio, loadActiveRuns, loadQueuedRuns, showNotification]);

  const handleCancelQueuedRun = useCallback(async (queuedRunId: string) => {
    if (!selectedPortfolio) return;
    try {
      await window.knuthflow.portfolioRuntime.cancelQueuedRun(queuedRunId);
      await loadQueuedRuns(selectedPortfolio.id);
      showNotification('success', 'Queued run cancelled');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to cancel queued run');
    }
  }, [selectedPortfolio, loadQueuedRuns, showNotification]);

  const handleUpdatePriority = useCallback(async (portfolioProjectId: string, newPriority: number) => {
    try {
      await window.knuthflow.portfolioRuntime.updatePriority(portfolioProjectId, newPriority);
      await loadPortfolios();
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to update priority');
    }
  }, [loadPortfolios, showNotification]);

  const handleSetMaxConcurrent = useCallback(async (max: number) => {
    try {
      await window.knuthflow.portfolioRuntime.setMaxConcurrentRuns(max);
      setMaxConcurrentRuns(max);
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to update setting');
    }
  }, [showNotification]);

  // Initial load
  useEffect(() => {
    void loadPortfolios();
    void loadMaxConcurrentRuns();
  }, [loadPortfolios, loadMaxConcurrentRuns]);

  // Load active runs when portfolio is selected
  useEffect(() => {
    if (selectedPortfolio) {
      void loadActiveRuns(selectedPortfolio.id);
      void loadQueuedRuns(selectedPortfolio.id);
    }
  }, [selectedPortfolio, loadActiveRuns, loadQueuedRuns]);

  // Calculate dependency edges
  const dependencyEdges: DependencyEdge[] = [];
  const projectNames = new Map<string, string>();

  if (selectedPortfolio) {
    for (const pp of selectedPortfolio.projects) {
      if (pp.workspace) {
        projectNames.set(pp.projectId, pp.workspace.name);
      }
      for (const [target, deps] of Object.entries(pp.dependencyGraph)) {
        for (const dep of deps) {
          dependencyEdges.push({ from: dep, to: target });
        }
      }
    }
  }

  const totalActiveRuns = Array.from(activeRuns.values()).reduce((sum, runs) => sum + runs.length, 0);

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Portfolio Dashboard</h2>
          <p className="section-lead">Manage multiple concurrent Ralph projects and track portfolio-level progress.</p>
        </div>
        <div className="toolbar-inline">
          <button onClick={() => setShowCreateDialog(true)} className="btn btn-primary">
            New Portfolio
          </button>
          <button onClick={() => void loadPortfolios()} disabled={isLoading} className="btn">
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {notification && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded border ${
          notification.type === 'success' ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'
        }`}>
          <p className={notification.type === 'success' ? 'text-green-300' : 'text-red-300'}>
            {notification.message}
          </p>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Portfolio List Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-[var(--border-subtle)]">
          <div className="section-header !border-b-0">
            <p className="metric-label">Portfolios</p>
          </div>
          <div className="list-pane !pt-0">
            {portfolios.length === 0 ? (
              <div className="empty-state surface-panel-muted">
                <div>
                  <h3 className="text-lg font-semibold">No portfolios</h3>
                  <p className="mt-2 text-sm text-muted">Create a portfolio to manage multiple Ralph projects.</p>
                </div>
              </div>
            ) : (
              <div className="stack-sm">
                {portfolios.map((portfolio) => (
                  <div
                    key={portfolio.id}
                    onClick={() => setSelectedPortfolio(portfolio)}
                    className={`surface-panel p-3 cursor-pointer transition-colors ${
                      selectedPortfolio?.id === portfolio.id ? 'ring-2 ring-[var(--accent)]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold truncate">{portfolio.name}</h4>
                        {portfolio.description && (
                          <p className="mt-1 text-xs text-muted truncate">{portfolio.description}</p>
                        )}
                        <p className="mt-2 text-xs text-muted">
                          {portfolio.projects.length} project{portfolio.projects.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePortfolio(portfolio.id);
                        }}
                        className="btn btn-ghost btn-icon h-6 w-6 text-muted hover:text-red-400"
                        title="Delete portfolio"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex min-h-0 flex-1 flex-col">
          {selectedPortfolio ? (
            <>
              {/* Portfolio Header */}
              <div className="surface-panel-muted p-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedPortfolio.name}</h3>
                    {selectedPortfolio.description && (
                      <p className="mt-1 text-sm text-muted">{selectedPortfolio.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-neutral">
                      {totalActiveRuns} active run{totalActiveRuns !== 1 ? 's' : ''}
                    </span>
                    <span className="badge badge-neutral">
                      {queuedRuns.length} queued
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => void handlePauseAll()} className="btn" disabled={totalActiveRuns === 0}>
                    Pause All
                  </button>
                  <button onClick={() => void handleResumeAll()} className="btn" disabled={totalActiveRuns === 0}>
                    Resume All
                  </button>
                  <button onClick={() => void handleStopAll()} className="btn btn-danger" disabled={totalActiveRuns === 0}>
                    Stop All
                  </button>
                  <button onClick={() => {
                    void loadAvailableProjects();
                    setShowAddProjectDialog(true);
                  }} className="btn">
                    Add Project
                  </button>
                </div>

                {/* Resource Usage */}
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-sm text-muted">Max concurrent runs:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 5].map((max) => (
                      <button
                        key={max}
                        onClick={() => void handleSetMaxConcurrent(max)}
                        className={`px-2 py-1 text-xs rounded ${
                          maxConcurrentRuns === max
                            ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                            : 'bg-[var(--bg-inset)] hover:bg-[var(--border-subtle)]'
                        }`}
                      >
                        {max}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 max-w-xs">
                    <div className="h-2 bg-[var(--bg-inset)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] transition-all"
                        style={{ width: `${Math.min(100, (totalActiveRuns / maxConcurrentRuns) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted">
                    {totalActiveRuns} / {maxConcurrentRuns}
                  </span>
                </div>
              </div>

              {/* Dependency Graph */}
              {dependencyEdges.length > 0 && (
                <div className="surface-panel-muted p-4 border-b border-[var(--border-subtle)]">
                  <h4 className="text-sm font-semibold mb-2">Dependency Graph</h4>
                  <DependencyGraph dependencies={dependencyEdges} projectNames={projectNames} />
                </div>
              )}

              {/* Queued Runs */}
              {queuedRuns.length > 0 && (
                <div className="surface-panel-muted p-4 border-b border-[var(--border-subtle)]">
                  <h4 className="text-sm font-semibold mb-2">Queued Runs</h4>
                  <div className="space-y-2">
                    {queuedRuns.map((qr) => (
                      <div key={qr.id} className="flex items-center justify-between bg-[var(--bg-inset)] p-2 rounded">
                        <div>
                          <p className="text-sm font-mono">{qr.runName}</p>
                          <p className="text-xs text-muted">Priority: {qr.priority}</p>
                        </div>
                        <button
                          onClick={() => void handleCancelQueuedRun(qr.id)}
                          className="btn btn-ghost text-xs text-red-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Project List */}
              <div className="flex-1 overflow-auto p-4">
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {selectedPortfolio.projects.map((pp) => (
                    <ProjectCard
                      key={pp.id}
                      portfolioProject={pp}
                      activeRuns={activeRuns.get(pp.projectId) || []}
                      onPause={() => void handlePauseAll()}
                      onResume={() => void handleResumeAll()}
                      onStop={() => void handleStopAll()}
                      onUpdateDependency={() => console.debug('Update dependency for', pp.id)}
                    />
                  ))}
                </div>

                {selectedPortfolio.projects.length === 0 && (
                  <div className="empty-state">
                    <div>
                      <h3 className="text-lg font-semibold">No projects in portfolio</h3>
                      <p className="mt-2 text-sm text-muted">Add Ralph projects to this portfolio to track their progress.</p>
                      <button
                        onClick={() => {
                          void loadAvailableProjects();
                          setShowAddProjectDialog(true);
                        }}
                        className="btn btn-primary mt-4"
                      >
                        Add Project
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Select a portfolio</h3>
                <p className="mt-2 text-sm text-muted">Choose a portfolio from the sidebar or create a new one.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Portfolio Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="surface-panel-muted w-full max-w-md p-6">
            <h3 className="text-lg font-semibold">Create Portfolio</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder="My Portfolio"
                  className="w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border-subtle)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={newPortfolioDescription}
                  onChange={(e) => setNewPortfolioDescription(e.target.value)}
                  placeholder="Portfolio description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--bg-inset)] border border-[var(--border-subtle)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowCreateDialog(false)} className="btn">
                Cancel
              </button>
              <button onClick={() => void handleCreatePortfolio()} className="btn btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Dialog */}
      {showAddProjectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="surface-panel-muted w-full max-w-md p-6">
            <h3 className="text-lg font-semibold">Add Project to Portfolio</h3>
            <p className="mt-1 text-sm text-muted">Select a Ralph project to add to {selectedPortfolio?.name}</p>

            <div className="mt-4 space-y-2 max-h-64 overflow-auto">
              {availableProjects.length === 0 ? (
                <p className="text-sm text-muted italic">No Ralph projects available. Create a workspace and bootstrap Ralph first.</p>
              ) : (
                availableProjects.map(({ project, workspace }) => {
                  const alreadyAdded = selectedPortfolio?.projects.some(p => p.projectId === project.id);
                  return (
                    <div
                      key={project.id}
                      className={`flex items-center justify-between p-3 rounded ${
                        alreadyAdded ? 'opacity-50' : 'bg-[var(--bg-inset)]'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{workspace?.name || project.id.slice(0, 12)}</p>
                        {workspace && (
                          <p className="text-xs text-muted font-mono truncate">{workspace.path}</p>
                        )}
                      </div>
                      {alreadyAdded ? (
                        <span className="text-xs text-muted">Already added</span>
                      ) : (
                        <button
                          onClick={() => void handleAddProject(project.id)}
                          className="btn btn-ghost text-xs"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowAddProjectDialog(false)} className="btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
