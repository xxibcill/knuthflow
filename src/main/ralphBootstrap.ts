import * as fs from 'fs';
import * as path from 'path';
import { getDatabase, SessionDatabase, RalphProject } from './database';
import type { RalphControlFiles, SharedBootstrapResult } from '../shared/ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Template Configuration
// ─────────────────────────────────────────────────────────────────────────────

const RALPH_METADATA_FILE = '.ralph';

interface RalphTemplateConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  maxRetries: number;
}

// Note: model is a default value for bootstrap templates.
// Future: could be made configurable via app settings or per-workspace config.
const RALPH_TEMPLATE_CONFIG: RalphTemplateConfig = {
  model: 'Claude Sonnet 4',
  temperature: 0.7,
  maxTokens: 4096,
  maxRetries: 3,
};

const DEFAULT_PROMPT_MD = `# Ralph Prompt

This is the main prompt file that guides Ralph's autonomous behavior.

## Instructions

Describe the task you want Ralph to perform:

1. **Task Definition**: What needs to be accomplished
2. **Constraints**: Any limitations or requirements
3. **Success Criteria**: How to measure completion

## Loop Behavior

- Ralph will read this file at the start of each iteration
- Modify this file to change Ralph's behavior mid-run
- The file is operator-authored and preserved across iterations
`;

const DEFAULT_AGENT_MD = `# Ralph Agent Configuration

This file configures Ralph's agent behavior.

## Model Settings

- Model: ${RALPH_TEMPLATE_CONFIG.model}
- Temperature: ${RALPH_TEMPLATE_CONFIG.temperature}
- Max tokens: ${RALPH_TEMPLATE_CONFIG.maxTokens}

## Tool Configuration

- Web search: enabled
- Code execution: enabled
- File operations: enabled

## Error Handling

- Max retries per iteration: ${RALPH_TEMPLATE_CONFIG.maxRetries}
- Fallback strategy: report and pause
`;

const DEFAULT_FIX_PLAN_MD = `# Fix Plan

This file tracks the current fix plan during Ralph execution.

## Current Issues

<!-- List issues to be addressed -->

## Proposed Changes

<!-- Describe proposed changes -->

## Status

- [ ] Issue 1 identified
- [ ] Issue 2 identified
- [ ] Changes implemented
- [ ] Changes verified
`;

const DEFAULT_SPECS_INDEX = `# Specifications

This directory contains specification documents for the project.

## Usage

Add markdown files here to define specifications that Ralph should follow.
Each file should describe a specific aspect of the system.

## Example

See \`specs/example.md\` for a template specification.
`;

const DEFAULT_SPECS_EXAMPLE = `# Example Specification

## Overview

Brief description of what this specification covers.

## Requirements

1. Requirement 1
2. Requirement 2
3. Requirement 3

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
`;

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap Result Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BootstrapResult extends SharedBootstrapResult {
  project?: RalphProject;
}

export interface BootstrapOptions {
  force?: boolean; // Force regeneration of existing files (with backup)
  workspaceId: string;
  workspacePath: string;
  platformTargets?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

export class RalphBootstrap {
  private db: SessionDatabase | null = null;

  private getDatabase(): SessionDatabase {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  /**
   * Bootstrap a workspace as a Ralph project
   *
   * Transaction ordering: DB record is created first, then control files are written.
   * If file writes fail after DB record is created, the validator will detect
   * incomplete state (missing files but project exists) as corrupted, and repair
   * can re-generate the missing files.
   */
  bootstrap(options: BootstrapOptions): BootstrapResult {
    const { workspaceId, workspacePath, force = false, platformTargets = [] } = options;

    // Validate workspace exists
    if (!fs.existsSync(workspacePath)) {
      return { success: false, error: 'WORKSPACE_NOT_FOUND', created: [], skipped: [], updated: [], backups: [] };
    }

    if (!fs.statSync(workspacePath).isDirectory()) {
      return { success: false, error: 'WORKSPACE_NOT_DIRECTORY', created: [], skipped: [], updated: [], backups: [] };
    }

    // Security: ensure path is absolute to prevent path traversal
    if (!path.isAbsolute(workspacePath)) {
      return { success: false, error: 'WORKSPACE_PATH_NOT_ABSOLUTE', created: [], skipped: [], updated: [], backups: [] };
    }

    // Check if workspace already has Ralph project
    let project = this.getDatabase().getRalphProjectByWorkspaceId(workspaceId);
    let backups: string[] = [];

    try {
      if (force) {
        backups = this.createBackups(this.getRalphControlFiles(workspacePath));
      }

      // Create DB record first. If this succeeds but file writes fail,
      // the validator will detect the inconsistency and repair can fix it.
      if (!project) {
        project = this.getDatabase().createRalphProject(workspaceId);
      }

      // Now write control files to disk
      const result = this.bootstrapControlFiles(workspacePath, force, platformTargets);

      return {
        success: true,
        project,
        created: result.created,
        skipped: result.skipped,
        updated: result.updated,
        backups,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
        code: 'BOOTSTRAP_FAILED',
        created: [],
        skipped: [],
        updated: [],
        backups,
      };
    }
  }

  /**
   * Bootstrap Ralph control files without creating a project
   * Used for repair scenarios
   */
  bootstrapControlFiles(workspacePath: string, force = false, platformTargets: string[] = []): { created: string[]; skipped: string[]; updated: string[] } {
    const created: string[] = [];
    const skipped: string[] = [];
    const updated: string[] = [];

    // PROMPT.md
    const promptPath = path.join(workspacePath, 'PROMPT.md');
    if (fs.existsSync(promptPath)) {
      skipped.push('PROMPT.md');
      if (force) {
        fs.writeFileSync(promptPath, DEFAULT_PROMPT_MD, 'utf-8');
        updated.push('PROMPT.md');
      }
    } else {
      fs.writeFileSync(promptPath, DEFAULT_PROMPT_MD, 'utf-8');
      created.push('PROMPT.md');
    }

    // AGENT.md
    const agentPath = path.join(workspacePath, 'AGENT.md');
    if (fs.existsSync(agentPath)) {
      skipped.push('AGENT.md');
      if (force) {
        fs.writeFileSync(agentPath, DEFAULT_AGENT_MD, 'utf-8');
        updated.push('AGENT.md');
      }
    } else {
      fs.writeFileSync(agentPath, DEFAULT_AGENT_MD, 'utf-8');
      created.push('AGENT.md');
    }

    // fix_plan.md
    const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
    if (fs.existsSync(fixPlanPath)) {
      skipped.push('fix_plan.md');
      if (force) {
        fs.writeFileSync(fixPlanPath, DEFAULT_FIX_PLAN_MD, 'utf-8');
        updated.push('fix_plan.md');
      }
    } else {
      fs.writeFileSync(fixPlanPath, DEFAULT_FIX_PLAN_MD, 'utf-8');
      created.push('fix_plan.md');
    }

    // specs/ directory
    const specsDir = path.join(workspacePath, 'specs');
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
      created.push('specs/');
    } else {
      skipped.push('specs/');
    }

    // specs/index.md
    const specsIndexPath = path.join(specsDir, 'index.md');
    if (fs.existsSync(specsIndexPath)) {
      if (force) {
        fs.writeFileSync(specsIndexPath, DEFAULT_SPECS_INDEX, 'utf-8');
        updated.push('specs/index.md');
      }
    } else {
      fs.writeFileSync(specsIndexPath, DEFAULT_SPECS_INDEX, 'utf-8');
      created.push('specs/index.md');
    }

    // specs/example.md
    const specsExamplePath = path.join(specsDir, 'example.md');
    if (fs.existsSync(specsExamplePath)) {
      if (force) {
        fs.writeFileSync(specsExamplePath, DEFAULT_SPECS_EXAMPLE, 'utf-8');
        updated.push('specs/example.md');
      }
    } else {
      fs.writeFileSync(specsExamplePath, DEFAULT_SPECS_EXAMPLE, 'utf-8');
      created.push('specs/example.md');
    }

    // Platform-specific specs
    if (platformTargets.includes('ios') || platformTargets.includes('android')) {
      const mobileSpecPath = path.join(specsDir, 'mobile-ux.md');
      const mobileSpecContent = `# Mobile UX Specification

## Platform Targets
${platformTargets.includes('ios') ? '- iOS' : ''}${platformTargets.includes('android') ? '- Android' : ''}

## Mobile Considerations
- Touch-friendly interface with appropriate tap targets (min 44x44 points)
- Safe area handling for notched devices
- Native feel with platform-appropriate transitions
- Offline capability consideration
`;
      if (fs.existsSync(mobileSpecPath)) {
        skipped.push('specs/mobile-ux.md');
      } else {
        fs.writeFileSync(mobileSpecPath, mobileSpecContent, 'utf-8');
        created.push('specs/mobile-ux.md');
      }
    }

    if (platformTargets.includes('pwa')) {
      const pwaSpecPath = path.join(specsDir, 'pwa-offline.md');
      const pwaSpecContent = `# PWA Offline Specification

## PWA Requirements
- Service worker for offline operation
- Web app manifest with proper icons
- Cache-first strategy for app shell
- Network-first for dynamic content
`;
      if (fs.existsSync(pwaSpecPath)) {
        skipped.push('specs/pwa-offline.md');
      } else {
        fs.writeFileSync(pwaSpecPath, pwaSpecContent, 'utf-8');
        created.push('specs/pwa-offline.md');
      }
    }

    if (platformTargets.some(t => ['macos', 'windows', 'linux'].includes(t))) {
      const desktopSpecPath = path.join(specsDir, 'desktop-ux.md');
      const desktopSpecContent = `# Desktop UX Specification

## Platform Targets
${platformTargets.includes('macos') ? '- macOS\n' : ''}${platformTargets.includes('windows') ? '- Windows\n' : ''}${platformTargets.includes('linux') ? '- Linux\n' : ''}

## Desktop Considerations
- Window management (minimize, maximize, resize)
- Keyboard shortcuts
- Native menu bar or equivalent
- Desktop notifications
`;
      if (fs.existsSync(desktopSpecPath)) {
        skipped.push('specs/desktop-ux.md');
      } else {
        fs.writeFileSync(desktopSpecPath, desktopSpecContent, 'utf-8');
        created.push('specs/desktop-ux.md');
      }
    }

    // Write Ralph metadata file
    const metadataPath = path.join(workspacePath, RALPH_METADATA_FILE);
    const metadata = {
      version: 1,
      bootstrappedAt: Date.now(),
      platformTargets,
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    return { created, skipped, updated };
  }

  /**
   * Get list of Ralph control files in a workspace
   */
  getRalphControlFiles(workspacePath: string): string[] {
    const files: string[] = [];
    const controlFiles = ['PROMPT.md', 'AGENT.md', 'fix_plan.md'];

    for (const file of controlFiles) {
      const filePath = path.join(workspacePath, file);
      if (fs.existsSync(filePath)) {
        files.push(filePath);
      }
    }

    const specsDir = path.join(workspacePath, 'specs');
    if (fs.existsSync(specsDir) && fs.statSync(specsDir).isDirectory()) {
      const specFiles = fs.readdirSync(specsDir);
      for (const file of specFiles) {
        if (file.endsWith('.md')) {
          files.push(path.join(specsDir, file));
        }
      }
    }

    return files;
  }

  /**
   * Read Ralph control files content
   */
  readControlFiles(workspacePath: string): RalphControlFiles | null {
    const promptPath = path.join(workspacePath, 'PROMPT.md');
    const agentPath = path.join(workspacePath, 'AGENT.md');
    const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
    const specsDir = path.join(workspacePath, 'specs');

    return {
      promptMd: fs.existsSync(promptPath) ? fs.readFileSync(promptPath, 'utf-8') : '',
      agentMd: fs.existsSync(agentPath) ? fs.readFileSync(agentPath, 'utf-8') : '',
      fixPlanMd: fs.existsSync(fixPlanPath) ? fs.readFileSync(fixPlanPath, 'utf-8') : '',
      specsDir: fs.existsSync(specsDir) ? specsDir : null,
    };
  }

  /**
   * Create backups for files that will be overwritten during a forced bootstrap.
   */
  private createBackups(filePaths: string[]): string[] {
    const backups: string[] = [];

    for (const filePath of filePaths) {
      backups.push(this.createBackup(filePath));
    }

    return backups;
  }

  /**
   * Create a timestamped backup of a file
   */
  private createBackup(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Cannot back up missing file: ${filePath}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);

    try {
      fs.copyFileSync(filePath, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup for ${filePath}: ${this.getErrorMessage(error)}`);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Check if a workspace is Ralph-enabled by validating the metadata file exists
   * and contains valid JSON with required fields.
   * Returns false if metadata is missing, malformed, or lacks required fields.
   */
  isRalphEnabled(workspacePath: string): boolean {
    const metadataPath = path.join(workspacePath, RALPH_METADATA_FILE);
    if (!fs.existsSync(metadataPath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);

      // Validate required fields exist
      if (typeof metadata.version !== 'number' || typeof metadata.bootstrappedAt !== 'number') {
        console.warn(`[RalphBootstrap] Metadata file ${metadataPath} missing required fields`);
        return false;
      }

      return true;
    } catch (err) {
      console.error(`[RalphBootstrap] Failed to parse metadata file ${metadataPath}:`, err);
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton instance
// ─────────────────────────────────────────────────────────────────────────────

let ralphBootstrapInstance: RalphBootstrap | null = null;

export function getRalphBootstrap(): RalphBootstrap {
  if (!ralphBootstrapInstance) {
    ralphBootstrapInstance = new RalphBootstrap();
  }
  return ralphBootstrapInstance;
}

export function resetRalphBootstrap(): void {
  ralphBootstrapInstance = null;
}
