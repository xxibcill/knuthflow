import * as fs from 'fs';
import * as path from 'path';
import { getDatabase, RalphProject, RalphControlFiles } from './database';

// ─────────────────────────────────────────────────────────────────────────────
// Template Content
// ─────────────────────────────────────────────────────────────────────────────

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

- Model: Claude Sonnet 4
- Temperature: 0.7
- Max tokens: 4096

## Tool Configuration

- Web search: enabled
- Code execution: enabled
- File operations: enabled

## Error Handling

- Max retries per iteration: 3
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

const RALPH_METADATA_FILE = '.ralph';

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap Result Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BootstrapResult {
  success: boolean;
  project?: RalphProject;
  created: string[];
  skipped: string[];
  updated: string[];
  backups: string[];
  error?: string;
}

export interface BootstrapOptions {
  force?: boolean; // Force regeneration of existing files (with backup)
  workspaceId: string;
  workspacePath: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

export class RalphBootstrap {
  private db = getDatabase();

  /**
   * Bootstrap a workspace as a Ralph project
   */
  bootstrap(options: BootstrapOptions): BootstrapResult {
    const { workspaceId, workspacePath, force = false } = options;

    // Validate workspace exists
    if (!fs.existsSync(workspacePath)) {
      return { success: false, error: 'Workspace path does not exist', created: [], skipped: [], updated: [], backups: [] };
    }

    if (!fs.statSync(workspacePath).isDirectory()) {
      return { success: false, error: 'Workspace path is not a directory', created: [], skipped: [], updated: [], backups: [] };
    }

    // Check if workspace already has Ralph project
    let project = this.db.getRalphProjectByWorkspaceId(workspaceId);
    const created: string[] = [];
    const skipped: string[] = [];
    const updated: string[] = [];
    const backups: string[] = [];

    // If force is true and project exists, create backups of existing files
    if (force && project) {
      const existingFiles = this.getRalphControlFiles(workspacePath);
      for (const file of existingFiles) {
        const backupPath = this.createBackup(file);
        if (backupPath) {
          backups.push(backupPath);
        }
      }
    }

    // Get or create Ralph project
    if (!project) {
      project = this.db.createRalphProject(workspaceId);
    }

    // Bootstrap control files
    const result = this.bootstrapControlFiles(workspacePath, force);

    return {
      success: true,
      project,
      created: result.created,
      skipped: result.skipped,
      updated: result.updated,
      backups,
    };
  }

  /**
   * Bootstrap Ralph control files without creating a project
   * Used for repair scenarios
   */
  bootstrapControlFiles(workspacePath: string, force = false): { created: string[]; skipped: string[]; updated: string[] } {
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

    // Write Ralph metadata file
    const metadataPath = path.join(workspacePath, RALPH_METADATA_FILE);
    const metadata = {
      version: 1,
      bootstrappedAt: Date.now(),
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
      specsDir: fs.existsSync(specsDir) ? specsDir : '',
    };
  }

  /**
   * Create a timestamped backup of a file
   */
  private createBackup(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);

    try {
      fs.copyFileSync(filePath, backupPath);
      return backupPath;
    } catch {
      return null;
    }
  }

  /**
   * Check if a workspace is Ralph-enabled
   */
  isRalphEnabled(workspacePath: string): boolean {
    const metadataPath = path.join(workspacePath, RALPH_METADATA_FILE);
    if (!fs.existsSync(metadataPath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      JSON.parse(content);
      return true;
    } catch {
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
