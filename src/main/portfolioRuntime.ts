import { EventEmitter } from 'events';
import { getDatabase, Portfolio, PortfolioProject } from './database';
import { RalphRuntime, getRalphRuntime, getRuntimeForRunId, getAllRalphRuntimes } from './ralphRuntime';
import type { LoopRun, LoopState } from '../shared/ralphTypes';
import {
  detectCycles,
  topologicalSort,
  canProjectStart,
  getAllDependencies,
  buildDependencyGraph,
  parseDependenciesFromFixPlan,
  getArtifactReferences,
  storeArtifactReference,
  clearArtifactReferences,
  type DependencyGraph,
  type DependencyCycle,
} from './dependencyResolver';

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Runtime Events
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioRuntimeEvents {
  runQueued: (run: QueuedRun) => void;
  runDequeued: (runId: string) => void;
  runStarted: (portfolioId: string, runId: string, projectId: string) => void;
  runStopped: (portfolioId: string, runId: string) => void;
  priorityChanged: (portfolioProjectId: string, newPriority: number) => void;
}

export interface QueuedRun {
  id: string;
  portfolioId: string;
  projectId: string;
  runName: string;
  sessionId: string;
  ptySessionId: string;
  priority: number;
  queuedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Runtime
// Manages multiple RalphRuntime instances at portfolio level with queueing and priority
// ─────────────────────────────────────────────────────────────────────────────

export class PortfolioRuntime extends EventEmitter {
  private db = getDatabase();

  // Portfolio ID -> set of active project IDs
  private portfolioProjects: Map<string, Set<string>> = new Map();

  // Run queue for deferred starts (when resources constrained)
  private runQueue: QueuedRun[] = [];

  // Maximum concurrent runs per portfolio (configurable)
  private maxConcurrentRunsPerPortfolio = 3;

  // Portfolio-key to track active run count
  private portfolioActiveRunCount: Map<string, number> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Portfolio Registration
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Register a portfolio for runtime management
   */
  registerPortfolio(portfolioId: string): void {
    if (!this.portfolioProjects.has(portfolioId)) {
      this.portfolioProjects.set(portfolioId, new Set());
    }
  }

  /**
   * Unregister a portfolio
   */
  unregisterPortfolio(portfolioId: string): void {
    // Cancel all queued runs for this portfolio
    this.runQueue = this.runQueue.filter(q => q.portfolioId !== portfolioId);
    this.portfolioProjects.delete(portfolioId);
    this.portfolioActiveRunCount.delete(portfolioId);
  }

  /**
   * Add a project to portfolio tracking
   */
  addProjectToPortfolio(portfolioId: string, projectId: string): void {
    let projects = this.portfolioProjects.get(portfolioId);
    if (!projects) {
      projects = new Set();
      this.portfolioProjects.set(portfolioId, projects);
    }
    projects.add(projectId);

    // Initialize run count if needed
    if (!this.portfolioActiveRunCount.has(portfolioId)) {
      this.portfolioActiveRunCount.set(portfolioId, 0);
    }
  }

  /**
   * Remove a project from portfolio tracking
   */
  removeProjectFromPortfolio(portfolioId: string, projectId: string): void {
    const projects = this.portfolioProjects.get(portfolioId);
    if (projects) {
      projects.delete(projectId);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Run Lifecycle with Queueing
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start a new run with portfolio-level coordination
   * If concurrent limit reached, queues the run
   */
  start(
    portfolioId: string,
    projectId: string,
    name: string,
    sessionId: string,
    ptySessionId: string
  ): { started: boolean; queued: boolean; run?: LoopRun; queuedRun?: QueuedRun } {
    const portfolio = this.db.getPortfolio(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const portfolioProject = this.db.getPortfolioProjectByProjectId(portfolioId, projectId);
    if (!portfolioProject) {
      throw new Error(`Project ${projectId} not in portfolio ${portfolioId}`);
    }

    const priority = portfolioProject.priority;
    const currentRunCount = this.portfolioActiveRunCount.get(portfolioId) ?? 0;

    // Check if we can start immediately
    if (currentRunCount < this.maxConcurrentRunsPerPortfolio) {
      const runtime = getRalphRuntime(projectId);
      const run = runtime.start(projectId, name, sessionId, ptySessionId);

      this.portfolioActiveRunCount.set(portfolioId, currentRunCount + 1);
      this.emit('runStarted', portfolioId, run.id, projectId);

      // Set up listener to decrement count when run ends
      runtime.once('stopped', () => {
        const count = this.portfolioActiveRunCount.get(portfolioId) ?? 1;
        this.portfolioActiveRunCount.set(portfolioId, Math.max(0, count - 1));
        this.emit('runStopped', portfolioId, run.id);
        this.processQueue(portfolioId);
      });

      return { started: true, queued: false, run };
    }

    // Queue the run
    const queuedRun: QueuedRun = {
      id: `queued-${crypto.randomUUID()}`,
      portfolioId,
      projectId,
      runName: name,
      sessionId,
      ptySessionId,
      priority,
      queuedAt: Date.now(),
    };

    this.runQueue.push(queuedRun);
    // Sort by priority (higher priority first)
    this.runQueue.sort((a, b) => b.priority - a.priority);

    this.emit('runQueued', queuedRun);
    return { started: false, queued: true, queuedRun };
  }

  /**
   * Process queue for a portfolio, starting any queued runs if capacity available
   */
  private processQueue(portfolioId: string): void {
    const currentRunCount = this.portfolioActiveRunCount.get(portfolioId) ?? 0;
    if (currentRunCount >= this.maxConcurrentRunsPerPortfolio) {
      return;
    }

    // Find next run for this portfolio in queue
    const queueIndex = this.runQueue.findIndex(q => q.portfolioId === portfolioId);
    if (queueIndex === -1) {
      return;
    }

    const queuedRun = this.runQueue.splice(queueIndex, 1)[0];
    this.emit('runDequeued', queuedRun.id);

    const runtime = getRalphRuntime(queuedRun.projectId);
    const run = runtime.start(
      queuedRun.projectId,
      queuedRun.runName,
      queuedRun.sessionId,
      queuedRun.ptySessionId
    );

    const count = this.portfolioActiveRunCount.get(portfolioId) ?? 0;
    this.portfolioActiveRunCount.set(portfolioId, count + 1);
    this.emit('runStarted', portfolioId, run.id, queuedRun.projectId);

    // Set up listener for this run too
    runtime.once('stopped', () => {
      const c = this.portfolioActiveRunCount.get(portfolioId) ?? 1;
      this.portfolioActiveRunCount.set(portfolioId, Math.max(0, c - 1));
      this.emit('runStopped', portfolioId, run.id);
      this.processQueue(portfolioId);
    });
  }

  /**
   * Get queued runs for a portfolio
   */
  getQueuedRuns(portfolioId: string): QueuedRun[] {
    return this.runQueue.filter(q => q.portfolioId === portfolioId);
  }

  /**
   * Get number of queued runs for a portfolio
   */
  getQueueLength(portfolioId: string): number {
    return this.runQueue.filter(q => q.portfolioId === portfolioId).length;
  }

  /**
   * Cancel a queued run
   */
  cancelQueuedRun(queuedRunId: string): boolean {
    const index = this.runQueue.findIndex(q => q.id === queuedRunId);
    if (index !== -1) {
      this.runQueue.splice(index, 1);
      this.emit('runDequeued', queuedRunId);
      return true;
    }
    return false;
  }

  /**
   * Get active run count for a portfolio
   */
  getActiveRunCount(portfolioId: string): number {
    return this.portfolioActiveRunCount.get(portfolioId) ?? 0;
  }

  /**
   * Get all active runs across all projects in a portfolio
   */
  getPortfolioActiveRuns(portfolioId: string): Array<{ run: LoopRun; state: LoopState; projectId: string }> {
    const projects = this.portfolioProjects.get(portfolioId);
    if (!projects) {
      return [];
    }

    const activeRuns: Array<{ run: LoopRun; state: LoopState; projectId: string }> = [];
    for (const projectId of projects) {
      const runtime = getAllRalphRuntimes().get(projectId);
      if (runtime) {
        const runIds = runtime.getActiveRunIds(projectId);
        for (const runId of runIds) {
          const state = runtime.getRuntimeState(runId);
          const run = this.db.getLoopRun(runId);
          if (run && state) {
            activeRuns.push({ run, state, projectId });
          }
        }
      }
    }
    return activeRuns;
  }

  /**
   * Update priority for a portfolio project - re-sorts queue
   */
  updatePriority(portfolioProjectId: string, newPriority: number): void {
    const portfolioProject = this.db.getPortfolioProject(portfolioProjectId);
    if (portfolioProject) {
      this.db.updatePortfolioProject(portfolioProjectId, { priority: newPriority });
      // Re-sort queue
      this.runQueue.sort((a, b) => b.priority - a.priority);
      this.emit('priorityChanged', portfolioProjectId, newPriority);
    }
  }

  /**
   * Set max concurrent runs per portfolio
   */
  setMaxConcurrentRuns(max: number): void {
    this.maxConcurrentRunsPerPortfolio = max;
  }

  /**
   * Get max concurrent runs per portfolio
   */
  getMaxConcurrentRuns(): number {
    return this.maxConcurrentRunsPerPortfolio;
  }

  /**
   * Pause all runs in a portfolio
   */
  pauseAll(portfolioId: string): void {
    const projects = this.portfolioProjects.get(portfolioId);
    if (!projects) return;

    for (const projectId of projects) {
      const runtime = getAllRalphRuntimes().get(projectId);
      if (runtime) {
        const runIds = runtime.getActiveRunIds(projectId);
        for (const runId of runIds) {
          try {
            runtime.pause(runId);
          } catch {
            // Ignore errors if run can't be paused
          }
        }
      }
    }
  }

  /**
   * Resume all runs in a portfolio
   */
  resumeAll(portfolioId: string): void {
    const projects = this.portfolioProjects.get(portfolioId);
    if (!projects) return;

    for (const projectId of projects) {
      const runtime = getAllRalphRuntimes().get(projectId);
      if (runtime) {
        const runIds = runtime.getActiveRunIds(projectId);
        for (const runId of runIds) {
          try {
            runtime.resume(runId);
          } catch {
            // Ignore errors if run can't be resumed
          }
        }
      }
    }
  }

  /**
   * Stop all runs in a portfolio
   */
  stopAll(portfolioId: string, reason: 'user_stopped' | 'error' | 'completed' = 'user_stopped'): void {
    const projects = this.portfolioProjects.get(portfolioId);
    if (!projects) return;

    // Map portfolio reason to RalphRuntime StopReason
    // 'completed' is not a valid StopReason, so we use 'user_stopped' as fallback for normal completion
    const runtimeReason: 'user_stopped' | 'error' = reason === 'error' ? 'error' : 'user_stopped';

    for (const projectId of projects) {
      const runtime = getAllRalphRuntimes().get(projectId);
      if (runtime) {
        const runIds = runtime.getActiveRunIds(projectId);
        for (const runId of runIds) {
          try {
            runtime.stop(runId, runtimeReason, `Stopped by portfolio ${portfolioId}`, false);
          } catch {
            // Ignore errors if run can't be stopped
          }
        }
      }
    }

    // Cancel queued runs too
    this.runQueue = this.runQueue.filter(q => {
      if (q.portfolioId === portfolioId) {
        this.emit('runDequeued', q.id);
        return false;
      }
      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Dependency Resolution
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the dependency graph for a portfolio
   */
  getDependencyGraph(portfolioId: string): DependencyGraph {
    const projects = this.db.listPortfolioProjects(portfolioId);
    return buildDependencyGraph(projects.map(p => ({
      projectId: p.projectId,
      dependencyGraph: p.dependencyGraph,
    })));
  }

  /**
   * Detect cycles in portfolio dependencies
   */
  detectDependencyCycles(portfolioId: string): DependencyCycle[] {
    const graph = this.getDependencyGraph(portfolioId);
    return detectCycles(graph);
  }

  /**
   * Get topologically sorted build order for a portfolio
   */
  getBuildOrder(portfolioId: string): { order: string[]; hasCycles: boolean; cycles: DependencyCycle[] } {
    const graph = this.getDependencyGraph(portfolioId);
    return topologicalSort(graph);
  }

  /**
   * Check if a project can start based on its dependencies
   * Returns { canStart, blockingDependencies }
   */
  checkProjectCanStart(projectId: string, portfolioId: string): { canStart: boolean; blockingDependencies: string[] } {
    const graph = this.getDependencyGraph(portfolioId);

    // Get all completed projects (those with no active runs and completed status)
    const completedProjects = new Set<string>();
    const projects = this.db.listPortfolioProjects(portfolioId);

    for (const pp of projects) {
      if (pp.status === 'completed' || pp.status === 'archived') {
        completedProjects.add(pp.projectId);
      }
    }

    // Also check if there are any active runs
    const activeRuns = this.getPortfolioActiveRuns(portfolioId);
    for (const { projectId: activeProjectId } of activeRuns) {
      // If there's an active run, the project is NOT completed
      completedProjects.delete(activeProjectId);
    }

    return canProjectStart(graph, projectId, completedProjects);
  }

  /**
   * Parse dependencies from fix_plan.md content and store in portfolio_project
   */
  parseAndStoreDependencies(portfolioProjectId: string, fixPlanContent: string): { success: boolean; dependencies: string[]; error?: string } {
    const portfolioProject = this.db.getPortfolioProject(portfolioProjectId);
    if (!portfolioProject) {
      return { success: false, dependencies: [], error: 'Portfolio project not found' };
    }

    const dependencies = parseDependenciesFromFixPlan(fixPlanContent);

    // Build new dependency graph for this project
    const newGraph: DependencyGraph = {
      ...portfolioProject.dependencyGraph,
      [portfolioProject.projectId]: dependencies,
    };

    // Check for cycles with the new dependencies
    const tempGraph: DependencyGraph = {};
    const allProjects = this.db.listPortfolioProjects(portfolioProject.portfolioId);

    for (const pp of allProjects) {
      if (pp.id === portfolioProjectId) {
        tempGraph[pp.projectId] = dependencies;
      } else {
        tempGraph[pp.projectId] = pp.dependencyGraph[pp.projectId] || [];
      }
    }

    const cycles = detectCycles(tempGraph);
    if (cycles.length > 0) {
      return {
        success: false,
        dependencies,
        error: `Cycle detected: ${cycles[0].message}`,
      };
    }

    // Update the dependency graph in the database
    this.db.updatePortfolioProject(portfolioProjectId, { dependencyGraph: newGraph });

    return { success: true, dependencies };
  }

  /**
   * Get available artifact references for a project (from itself and its dependencies)
   */
  getAvailableArtifacts(projectId: string, portfolioId: string): Array<{ projectId: string; artifactPath: string; artifactType: string; createdAt: number }> {
    const graph = this.getDependencyGraph(portfolioId);
    return getArtifactReferences(projectId, graph);
  }

  /**
   * Store an artifact reference for propagation to dependent projects
   */
  propagateArtifact(projectId: string, artifactPath: string, artifactType: string): void {
    storeArtifactReference(projectId, artifactPath, artifactType);
  }

  /**
   * Clear artifacts for a project (when it restarts)
   */
  clearProjectArtifacts(projectId: string): void {
    clearArtifactReferences(projectId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton instance
// ─────────────────────────────────────────────────────────────────────────────

let portfolioRuntimeInstance: PortfolioRuntime | null = null;

export function getPortfolioRuntime(): PortfolioRuntime {
  if (!portfolioRuntimeInstance) {
    portfolioRuntimeInstance = new PortfolioRuntime();
  }
  return portfolioRuntimeInstance;
}

export function resetPortfolioRuntime(): void {
  if (portfolioRuntimeInstance) {
    // Stop all runs first
    for (const portfolioId of portfolioRuntimeInstance['portfolioProjects'].keys()) {
      portfolioRuntimeInstance.stopAll(portfolioId);
    }
    portfolioRuntimeInstance.removeAllListeners();
    portfolioRuntimeInstance = null;
  }
}
