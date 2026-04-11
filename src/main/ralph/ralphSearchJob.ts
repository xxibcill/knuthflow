import * as fs from 'fs';
import * as path from 'path';

import { validateWorkspacePath } from './planPathValidator';

// ─────────────────────────────────────────────────────────────────────────────
// Search Job Types
// ─────────────────────────────────────────────────────────────────────────────

export type SearchScope = 'code' | 'tests' | 'docs' | 'specs' | 'all';

export type SearchJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SearchJob {
  id: string;
  scope: SearchScope;
  query: string;
  status: SearchJobStatus;
  startedAt: number | null;
  completedAt: number | null;
  results: SearchResult[];
  error: string | null;
}

export interface SearchResult {
  type: 'file' | 'symbol' | 'test' | 'doc' | 'spec';
  path: string;
  line: number;
  excerpt: string;
  relevanceScore: number;
}

export interface SearchResultSummary {
  totalResults: number;
  byType: Record<string, number>;
  topResults: SearchResult[];
  context: string; // Distilled context for injection into prompt
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Cache
// ─────────────────────────────────────────────────────────────────────────────

interface CachedSearch {
  key: string;
  results: SearchResult[];
  timestamp: number;
}

const searchCache: Map<string, CachedSearch> = new Map();
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached searches

function getSearchCacheKey(scope: SearchScope, query: string, workspacePath: string): string {
  return `${workspacePath}:${scope}:${query.toLowerCase().trim()}`;
}

function getCachedSearch(scope: SearchScope, query: string, workspacePath: string): SearchResult[] | null {
  const key = getSearchCacheKey(scope, query, workspacePath);
  const cached = searchCache.get(key);
  if (!cached) return null;

  // Check if cache is still valid
  if (Date.now() - cached.timestamp > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }

  return cached.results;
}

function setCachedSearch(scope: SearchScope, query: string, workspacePath: string, results: SearchResult[]): void {
  const key = getSearchCacheKey(scope, query, workspacePath);
  searchCache.set(key, {
    key,
    results,
    timestamp: Date.now(),
  });

  // Evict oldest entries if cache exceeds max size
  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries = [...searchCache.entries()];
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    // Remove oldest entries until we're back under the limit
    // +1 because we just added an entry that pushed us over
    const evictCount = searchCache.size - MAX_CACHE_SIZE + 1;
    const toRemove = entries.slice(0, evictCount);
    for (const [k] of toRemove) {
      searchCache.delete(k);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a bounded search job for context gathering.
 * Read-only - does not mutate workspace state.
 */
export async function runSearchJob(
  workspacePath: string,
  scope: SearchScope,
  query: string,
  maxResults = 20
): Promise<SearchResult[]> {
  // Validate workspace path
  if (!validateWorkspacePath(workspacePath)) {
    throw new Error(`Invalid workspace path: ${workspacePath}`);
  }

  // Check cache first
  const cached = getCachedSearch(scope, query, workspacePath);
  if (cached) {
    return cached.slice(0, maxResults);
  }

  // Perform search based on scope
  let results: SearchResult[] = [];

  switch (scope) {
    case 'code':
      results = await searchCode(workspacePath, query);
      break;
    case 'tests':
      results = await searchTests(workspacePath, query);
      break;
    case 'docs':
      results = await searchDocs(workspacePath, query);
      break;
    case 'specs':
      results = await searchSpecs(workspacePath, query);
      break;
    case 'all':
      results = await searchAll(workspacePath, query);
      break;
  }

  // Sort by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Cache results
  setCachedSearch(scope, query, workspacePath, results);

  return results.slice(0, maxResults);
}

/**
 * Search code files (ts, js, tsx, jsx)
 */
async function searchCode(workspacePath: string, query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];

  await traverseDirectory(workspacePath, async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!extensions.includes(ext)) return false;
    if (filePath.includes('node_modules') || filePath.includes('.git')) return false;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // Skip files that can't be read (permissions, binary, etc.)
      return false;
    }
    const lines = content.split('\n');
    const lowerQuery = query.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes(lowerQuery)) {
        // Calculate relevance score
        let score = 1;
        if (lowerLine.includes(` ${lowerQuery}`) || lowerLine.includes(`${lowerQuery} `)) {
          score += 1; // Word boundary match
        }
        if (lowerLine.startsWith(lowerQuery)) {
          score += 2; // Starts with query
        }
        if (lowerLine.includes(`function ${lowerQuery}`) || lowerLine.includes(`const ${lowerQuery}`) || lowerLine.includes(`class ${lowerQuery}`)) {
          score += 3; // Symbol definition
        }

        results.push({
          type: 'file',
          path: path.relative(workspacePath, filePath),
          line: i + 1,
          excerpt: line.trim().substring(0, 200),
          relevanceScore: score,
        });
      }
    }
    return false;
  });

  return results;
}

/**
 * Search test files
 */
async function searchTests(workspacePath: string, query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const testExtensions = ['.test.ts', '.test.tsx', '.test.js', '.spec.ts', '.spec.tsx', '.spec.js'];
  const testDirs = ['__tests__', 'test', 'tests'];

  await traverseDirectory(workspacePath, async (filePath) => {
    const baseName = path.basename(filePath);
    const isTestFile = testExtensions.some(e => baseName.endsWith(e)) ||
                       testDirs.some(d => filePath.includes(`/${d}/`) || filePath.includes(`\\${d}\\`));

    if (!isTestFile) return false;
    if (filePath.includes('node_modules') || filePath.includes('.git')) return false;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // Skip files that can't be read (permissions, binary, etc.)
      return false;
    }
    const lines = content.split('\n');
    const lowerQuery = query.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes(lowerQuery)) {
        results.push({
          type: 'test',
          path: path.relative(workspacePath, filePath),
          line: i + 1,
          excerpt: line.trim().substring(0, 200),
          relevanceScore: 1,
        });
      }
    }
    return false;
  });

  return results;
}

/**
 * Search documentation files
 */
async function searchDocs(workspacePath: string, query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const docExtensions = ['.md', '.txt', '.rst', '.adoc'];

  await traverseDirectory(workspacePath, async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!docExtensions.includes(ext)) return false;
    if (filePath.includes('node_modules') || filePath.includes('.git')) return false;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // Skip files that can't be read (permissions, binary, etc.)
      return false;
    }
    const lines = content.split('\n');
    const lowerQuery = query.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes(lowerQuery)) {
        results.push({
          type: 'doc',
          path: path.relative(workspacePath, filePath),
          line: i + 1,
          excerpt: line.trim().substring(0, 200),
          relevanceScore: 1,
        });
      }
    }
    return false;
  });

  return results;
}

/**
 * Search specs directory
 */
async function searchSpecs(workspacePath: string, query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const specsPath = path.join(workspacePath, 'specs');

  if (!fs.existsSync(specsPath)) {
    return results;
  }

  await traverseDirectory(specsPath, async (filePath) => {
    if (!filePath.endsWith('.md')) return false;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // Skip files that can't be read (permissions, binary, etc.)
      return false;
    }
    const lines = content.split('\n');
    const lowerQuery = query.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes(lowerQuery)) {
        results.push({
          type: 'spec',
          path: path.relative(workspacePath, filePath),
          line: i + 1,
          excerpt: line.trim().substring(0, 200),
          relevanceScore: 2, // Specs get higher relevance
        });
      }
    }
    return false;
  });

  return results;
}

/**
 * Search all sources
 */
async function searchAll(workspacePath: string, query: string): Promise<SearchResult[]> {
  const [code, tests, docs, specs] = await Promise.all([
    searchCode(workspacePath, query),
    searchTests(workspacePath, query),
    searchDocs(workspacePath, query),
    searchSpecs(workspacePath, query),
  ]);

  return [...code, ...tests, ...docs, ...specs];
}

/**
 * Traverse directory recursively
 */
async function traverseDirectory(
  dirPath: string,
  callback: (filePath: string) => Promise<boolean | void>
): Promise<void> {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Skip certain directories
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      if (entry.name === '.ralph') continue;

      await traverseDirectory(fullPath, callback);
    } else if (entry.isFile()) {
      const shouldContinue = await callback(fullPath);
      if (shouldContinue === true) {
        await traverseDirectory(fullPath, callback);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Pack Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a distilled context pack from search results.
 * Stays within token limits for prompt injection.
 */
export function generateContextPack(
  searchResults: SearchResult[],
  maxContextLength = 4000
): string {
  if (searchResults.length === 0) {
    return 'No relevant context found.';
  }

  const byType: Record<string, SearchResult[]> = {};
  for (const result of searchResults) {
    if (!byType[result.type]) {
      byType[result.type] = [];
    }
    byType[result.type].push(result);
  }

  const lines: string[] = ['=== CONTEXT GATHERING RESULTS ==='];
  lines.push(`Total: ${searchResults.length} results\n`);

  // Group by type
  for (const [type, results] of Object.entries(byType)) {
    lines.push(`--- ${type.toUpperCase()} (${results.length}) ---`);
    for (const result of results.slice(0, 5)) { // Max 5 per type
      lines.push(`${result.path}:${result.line} | ${result.excerpt}`);
    }
    if (results.length > 5) {
      lines.push(`... and ${results.length - 5} more ${type} results`);
    }
    lines.push('');
  }

  const context = lines.join('\n');

  // Truncate if too long
  if (context.length > maxContextLength) {
    return context.substring(0, maxContextLength) + '\n... (truncated)';
  }

  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parallel Search Execution
// ─────────────────────────────────────────────────────────────────────────────

export interface ParallelSearchOptions {
  workspacePath: string;
  queries: string[];
  scopes: SearchScope[];
  maxResultsPerQuery?: number;
  signal?: AbortSignal;
}

/**
 * Run multiple search queries in parallel.
 * Useful for gathering context before execution.
 */
export async function runParallelSearchJobs(
  options: ParallelSearchOptions
): Promise<Map<string, SearchResult[]>> {
  const { workspacePath, queries, scopes, maxResultsPerQuery = 20, signal } = options;
  const results = new Map<string, SearchResult[]>();

  // Create promises for all query/scope combinations
  const searchPromises: Array<{ key: string; promise: Promise<SearchResult[]> }> = [];

  for (const query of queries) {
    for (const scope of scopes) {
      const key = `${scope}:${query}`;
      searchPromises.push({
        key,
        promise: runSearchJob(workspacePath, scope, query, maxResultsPerQuery),
      });
    }
  }

  // Run all searches in parallel (bounded by event loop)
  // Using Promise.allSettled to handle partial failures
  const settled = await Promise.allSettled(
    searchPromises.map(p => p.promise)
  );

  for (let i = 0; i < searchPromises.length; i++) {
    const { key } = searchPromises[i];
    const result = settled[i];

    if (result.status === 'fulfilled') {
      results.set(key, result.value);
    } else {
      console.error(`[RalphSearch] Search failed for ${key}:`, result.reason);
      results.set(key, []);
    }

    // Check if aborted
    if (signal?.aborted) {
      break;
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-execution Context Gathering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gather context before Ralph acts on uncertain work.
 * Returns a distilled context pack suitable for prompt injection.
 */
export async function gatherContextForItem(
  workspacePath: string,
  itemTitle: string,
  itemDescription: string
): Promise<{
  contextPack: string;
  searchResults: SearchResultSummary;
}> {
  // Extract potential search terms from task
  const searchTerms = extractSearchTerms(itemTitle + ' ' + itemDescription);

  // Run parallel searches across multiple scopes
  const searchResults = await runParallelSearchJobs({
    workspacePath,
    queries: searchTerms.slice(0, 3), // Limit to 3 search terms
    scopes: ['code', 'specs', 'tests'],
    maxResultsPerQuery: 15,
  });

  // Flatten all results
  const allResults: SearchResult[] = [];
  for (const [, results] of searchResults) {
    allResults.push(...results);
  }

  // Dedupe by path+line
  const deduped = deduplicateResults(allResults);

  // Build summary
  const summary: SearchResultSummary = {
    totalResults: deduped.length,
    byType: {},
    topResults: deduped.slice(0, 10),
    context: generateContextPack(deduped),
  };

  for (const result of deduped) {
    summary.byType[result.type] = (summary.byType[result.type] || 0) + 1;
  }

  return {
    contextPack: summary.context,
    searchResults: summary,
  };
}

/**
 * Extract meaningful search terms from task description.
 */
function extractSearchTerms(text: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
  ]);

  // Extract words and filter
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Dedupe and return
  return [...new Set(words)].slice(0, 10);
}

/**
 * Deduplicate search results by path and line.
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];

  for (const result of results) {
    const key = `${result.path}:${result.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(result);
    }
  }

  return deduped;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clear search cache for a workspace.
 */
export function clearSearchCache(workspacePath?: string): void {
  if (workspacePath) {
    for (const [key] of searchCache) {
      if (key.startsWith(workspacePath)) {
        searchCache.delete(key);
      }
    }
  } else {
    searchCache.clear();
  }
}

/**
 * Get cache statistics.
 */
export function getSearchCacheStats(): { size: number; entries: string[] } {
  return {
    size: searchCache.size,
    entries: [...searchCache.keys()],
  };
}
