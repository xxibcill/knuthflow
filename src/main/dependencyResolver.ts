/**
 * Cross-App Dependency Resolution
 *
 * Handles dependency graph management for portfolio projects including:
 * - Parsing dependencies from fix_plan.md
 * - Topological sort for build order
 * - Cycle detection
 * - Artifact propagation between dependent projects
 */

import Database from 'better-sqlite3';
import { getDatabase } from './database';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DependencyGraph {
  [projectId: string]: string[]; // projectId -> array of projectIds it depends on
}

export interface DependencyNode {
  projectId: string;
  dependencies: string[];
  dependents: string[]; // projects that depend on this one
}

export interface DependencyCycle {
  path: string[];
  message: string;
}

export interface ArtifactReference {
  projectId: string;
  artifactPath: string;
  artifactType: string;
  createdAt: number;
}

export interface BuildOrderResult {
  order: string[];
  hasCycles: boolean;
  cycles: DependencyCycle[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependency Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse dependencies from fix_plan.md content
 *
 * Expected format in fix_plan.md:
 * ## Dependencies
 * - depends-on: @projectId
 * - depends-on: @projectId2
 *
 * Or inline:
 * - [ ] Task that depends on @projectId
 */
export function parseDependenciesFromFixPlan(content: string): string[] {
  const dependencies: string[] = [];
  const lines = content.split('\n');

  // Pattern 1: explicit depends-on section
  let inDependsSection = false;
  for (const line of lines) {
    const trimmed = line.trim();

    // Check for section header
    if (trimmed.toLowerCase() === '## dependencies' || trimmed.toLowerCase() === '### dependencies') {
      inDependsSection = true;
      continue;
    }

    // Exit depends section on next header or empty section end
    if (inDependsSection && trimmed.startsWith('#')) {
      inDependsSection = false;
    }

    // Parse depends-on entries in the section
    if (inDependsSection || trimmed.includes('depends-on:')) {
      const match = trimmed.match(/depends-on:\s*@(\S+)/);
      if (match) {
        const projectId = match[1];
        if (!dependencies.includes(projectId)) {
          dependencies.push(projectId);
        }
      }
    }

    // Also look for @projectId references in task descriptions
    const refMatch = trimmed.match(/@([a-zA-Z0-9_-]+)/g);
    if (refMatch && !trimmed.startsWith('- [')) {
      // Only in task-like lines or descriptions
      for (const ref of refMatch) {
        const projectId = ref.slice(1); // Remove @
        // Skip common keywords that start with @
        if (!['app', 'project', 'workspace', 'file', 'section'].includes(projectId.toLowerCase())) {
          if (!dependencies.includes(projectId) && isLikelyProjectReference(projectId)) {
            dependencies.push(projectId);
          }
        }
      }
    }
  }

  return dependencies;
}

/**
 * Heuristic to determine if a reference is likely a project ID vs a casual mention
 */
function isLikelyProjectReference(ref: string): boolean {
  // Project IDs in this system typically start with 'ralph-' or are UUID-like
  // or they might be short identifiers used in the fix_plan
  return ref.length >= 4 && (ref.startsWith('ralph-') || /^[a-zA-Z0-9_-]+$/.test(ref));
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a dependency graph from portfolio project data
 */
export function buildDependencyGraph(
  portfolioProjects: Array<{ projectId: string; dependencyGraph: DependencyGraph }>
): DependencyGraph {
  const graph: DependencyGraph = {};

  for (const pp of portfolioProjects) {
    // Use stored dependencyGraph if available, otherwise empty
    graph[pp.projectId] = pp.dependencyGraph[pp.projectId] || [];
  }

  return graph;
}

/**
 * Get all dependencies (including transitive) for a project
 */
export function getAllDependencies(graph: DependencyGraph, projectId: string): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function dfs(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const deps = graph[id] || [];
    for (const dep of deps) {
      dfs(dep);
      if (!result.includes(dep)) {
        result.push(dep);
      }
    }
  }

  dfs(projectId);
  return result;
}

/**
 * Get all dependents (projects that depend on this one, including transitive)
 */
export function getAllDependents(graph: DependencyGraph, projectId: string): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function dfs(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    // Find all projects that depend on `id`
    for (const [otherId, deps] of Object.entries(graph)) {
      if (deps.includes(id)) {
        dfs(otherId);
        if (!result.includes(otherId)) {
          result.push(otherId);
        }
      }
    }
  }

  dfs(projectId);
  return result;
}

/**
 * Detect cycles in the dependency graph using DFS
 */
export function detectCycles(graph: DependencyGraph): DependencyCycle[] {
  const cycles: DependencyCycle[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const deps = graph[nodeId] || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (dfs(dep)) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        // Found a cycle - extract it
        const cycleStart = path.indexOf(dep);
        const cyclePath = path.slice(cycleStart);
        cyclePath.push(dep); // Close the cycle

        cycles.push({
          path: cyclePath,
          message: `Cycle detected: ${cyclePath.join(' -> ')}`,
        });
        return true;
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }

  // Check all nodes (in case some are disconnected)
  for (const nodeId of Object.keys(graph)) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return cycles;
}

/**
 * Compute topological sort of projects based on dependencies
 * Uses Kahn's algorithm for stable ordering
 */
export function topologicalSort(graph: DependencyGraph): BuildOrderResult {
  const cycles = detectCycles(graph);

  if (cycles.length > 0) {
    return {
      order: [],
      hasCycles: true,
      cycles,
    };
  }

  // Build in-degree map and adjacency list
  const inDegree: Record<string, number> = {};
  const adjacencyList: Record<string, string[]> = {};

  // Initialize all nodes
  for (const [nodeId, deps] of Object.entries(graph)) {
    if (!(nodeId in inDegree)) {
      inDegree[nodeId] = 0;
    }
    if (!(nodeId in adjacencyList)) {
      adjacencyList[nodeId] = [];
    }

    for (const dep of deps) {
      // Ensure dependency node exists
      if (!(dep in inDegree)) {
        inDegree[dep] = 0;
      }
      if (!(dep in adjacencyList)) {
        adjacencyList[dep] = [];
      }

      // dep -> nodeId (edge from dep to nodeId means nodeId depends on dep)
      adjacencyList[dep].push(nodeId);
      inDegree[nodeId]++;
    }
  }

  // Start with nodes that have no dependencies (in-degree 0)
  const queue: string[] = [];
  for (const [nodeId, degree] of Object.entries(inDegree)) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Sort queue for deterministic output
  queue.sort();

  const result: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    // Reduce in-degree for all dependents
    for (const dependent of adjacencyList[nodeId] || []) {
      inDegree[dependent]--;
      if (inDegree[dependent] === 0) {
        queue.push(dependent);
        queue.sort(); // Maintain sorted order for determinism
      }
    }
  }

  return {
    order: result,
    hasCycles: false,
    cycles: [],
  };
}

/**
 * Check if a project can start (its dependencies have completed)
 */
export function canProjectStart(
  graph: DependencyGraph,
  projectId: string,
  completedProjects: Set<string>
): { canStart: boolean; blockingDependencies: string[] } {
  const deps = graph[projectId] || [];
  const blocking: string[] = [];

  for (const dep of deps) {
    if (!completedProjects.has(dep)) {
      blocking.push(dep);
    }
  }

  return {
    canStart: blocking.length === 0,
    blockingDependencies: blocking,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Propagation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Store artifact references for propagation to dependent projects
 */
export function storeArtifactReference(
  projectId: string,
  artifactPath: string,
  artifactType: string
): ArtifactReference {
  const db = getDatabase();
  return db.createArtifactReference({ projectId, artifactPath, artifactType });
}

/**
 * Get artifact references for a project (including from its dependencies)
 */
export function getArtifactReferences(projectId: string, graph: DependencyGraph): ArtifactReference[] {
  const db = getDatabase();

  // Get all dependencies (including transitive)
  const allDependencies = getAllDependencies(graph, projectId);
  const projectsToQuery = [projectId, ...allDependencies];

  return db.listArtifactReferences(projectsToQuery);
}

/**
 * Get paths to artifacts from a specific project
 */
export function getArtifactsByProject(projectId: string): ArtifactReference[] {
  const db = getDatabase();
  return db.listArtifactReferencesByProject(projectId);
}

/**
 * Clear artifact references for a project (when it restarts)
 */
export function clearArtifactReferences(projectId: string): void {
  const db = getDatabase();
  db.deleteArtifactReferencesByProject(projectId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Schema for Artifact References
// ─────────────────────────────────────────────────────────────────────────────

export function ensureArtifactReferencesTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_artifact_references (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      artifact_path TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artifact_references_project_id
    ON portfolio_artifact_references(project_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_artifact_references_created_at
    ON portfolio_artifact_references(created_at)
  `);
}
