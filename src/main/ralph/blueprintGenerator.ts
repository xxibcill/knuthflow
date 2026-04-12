import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AppIntakeForm {
  // Product intent
  appName: string;
  appBrief: string;
  targetPlatform: 'web' | 'desktop' | 'mobile' | 'api';
  successCriteria: string[];

  // Technical constraints
  stackPreferences: string[];
  forbiddenPatterns: string[];

  // Delivery constraints
  maxBuildTime: number; // in minutes
  supportedBrowsers: string[];
  deliveryFormat: 'electron' | 'web' | 'mobile' | 'api';
}

export interface BlueprintSpec {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'high' | 'medium' | 'low';
  relatedSpecIds: string[];
}

export interface AppBlueprint {
  version: string;
  generatedAt: number;
  intake: AppIntakeForm;
  specs: BlueprintSpec[];
  milestones: Milestone[];
  fixPlan: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  tasks: string[];
  acceptanceGate: string;
  order: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic ID generation
// ─────────────────────────────────────────────────────────────────────────────

function generateDeterministicId(input: string, salt: string): string {
  let hash = 0;
  const combined = `${input}:${salt}:${Date.now()}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// Blueprint Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a content-based hash for version string
 */
function generateContentHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

export class BlueprintGenerator {
  /**
   * Generate a deterministic app blueprint from intake form data
   */
  generateBlueprint(intake: AppIntakeForm): AppBlueprint {
    const now = Date.now();
    // Use content hash instead of timestamp for meaningful version comparison
    const contentHash = generateContentHash(`${intake.appName}:${intake.appBrief}:${intake.targetPlatform}`);
    const version = `1.0.0-${contentHash}`;

    // Generate specs from the brief and success criteria
    const specs = this.generateSpecs(intake);

    // Generate milestones from specs
    const milestones = this.generateMilestones(specs, intake);

    // Generate fix_plan.md content
    const fixPlan = this.generateFixPlan(intake, milestones);

    return {
      version,
      generatedAt: now,
      intake,
      specs,
      milestones,
      fixPlan,
    };
  }

  /**
   * Generate deterministic specs from intake data
   */
  private generateSpecs(intake: AppIntakeForm): BlueprintSpec[] {
    const specs: BlueprintSpec[] = [];

    // Core functionality spec
    const coreSpecId = generateDeterministicId('core-spec', intake.appBrief);
    specs.push({
      id: coreSpecId,
      title: `Core Functionality: ${intake.appName}`,
      description: intake.appBrief,
      acceptanceCriteria: intake.successCriteria.slice(0, 5),
      priority: 'high',
      relatedSpecIds: [],
    });

    // Platform-specific spec
    const platformSpecId = generateDeterministicId('platform-spec', intake.targetPlatform);
    specs.push({
      id: platformSpecId,
      title: `${intake.targetPlatform.charAt(0).toUpperCase() + intake.targetPlatform.slice(1)} Platform Implementation`,
      description: `Target platform: ${intake.targetPlatform}`,
      acceptanceCriteria: this.getPlatformAcceptanceCriteria(intake),
      priority: 'high',
      relatedSpecIds: [coreSpecId],
    });

    // UI/UX spec if web or desktop
    if (intake.targetPlatform === 'web' || intake.targetPlatform === 'desktop') {
      const uiSpecId = generateDeterministicId('ui-spec', intake.appName);
      specs.push({
        id: uiSpecId,
        title: 'User Interface Requirements',
        description: 'UI/UX implementation requirements',
        acceptanceCriteria: [
          'Responsive layout adapts to viewport',
          'Accessible color contrast ratios',
          'Keyboard navigation support',
        ],
        priority: 'medium',
        relatedSpecIds: [coreSpecId],
      });
    }

    // Stack-specific spec
    if (intake.stackPreferences.length > 0) {
      const stackSpecId = generateDeterministicId('stack-spec', intake.stackPreferences.join(','));
      specs.push({
        id: stackSpecId,
        title: `Technology Stack: ${intake.stackPreferences.join(', ')}`,
        description: `Required technologies: ${intake.stackPreferences.join(', ')}`,
        acceptanceCriteria: intake.stackPreferences.map(stack => `${stack} dependencies configured`),
        priority: 'high',
        relatedSpecIds: [platformSpecId],
      });
    }

    // Delivery spec
    const deliverySpecId = generateDeterministicId('delivery-spec', intake.deliveryFormat);
    specs.push({
      id: deliverySpecId,
      title: `Delivery: ${intake.deliveryFormat.toUpperCase()} Package`,
      description: `Delivery format: ${intake.deliveryFormat}`,
      acceptanceCriteria: [
        `Builds complete without errors`,
        `Package produced in ${intake.deliveryFormat} format`,
        `Executable or deployable artifact available`,
      ],
      priority: 'high',
      relatedSpecIds: [coreSpecId, platformSpecId],
    });

    return specs;
  }

  /**
   * Generate milestones from specs
   */
  private generateMilestones(specs: BlueprintSpec[], intake: AppIntakeForm): Milestone[] {
    const milestones: Milestone[] = [];

    // Foundation milestone
    const foundationTasks = this.getFoundationTasks(intake);
    milestones.push({
      id: generateDeterministicId('milestone-foundation', intake.appName),
      title: 'Foundation',
      description: 'Set up project structure and core dependencies',
      tasks: foundationTasks,
      acceptanceGate: 'npm install succeeds; project builds without errors',
      order: 1,
    });

    // Core Features milestone
    const coreSpec = specs.find(s => s.title.includes('Core Functionality'));
    if (coreSpec) {
      milestones.push({
        id: generateDeterministicId('milestone-core', intake.appBrief),
        title: 'Core Features',
        description: coreSpec.description,
        tasks: coreSpec.acceptanceCriteria.slice(0, 3).map((c, i) => `Implement: ${c}`),
        acceptanceGate: 'Core features functional and testable',
        order: 2,
      });
    }

    // UI milestone (if applicable)
    const uiSpec = specs.find(s => s.title.includes('User Interface'));
    if (uiSpec) {
      milestones.push({
        id: generateDeterministicId('milestone-ui', intake.appName),
        title: 'User Interface',
        description: 'Implement user-facing components',
        tasks: uiSpec.acceptanceCriteria.map(c => `Implement: ${c}`),
        acceptanceGate: 'UI renders correctly; basic interactions work',
        order: 3,
      });
    }

    // Integration milestone
    milestones.push({
      id: generateDeterministicId('milestone-integration', intake.appName),
      title: 'Integration & Polish',
      description: 'Integrate features and polish the application',
      tasks: [
        'Run full test suite',
        'Verify all acceptance criteria',
        'Performance check',
      ],
      acceptanceGate: 'All tests pass; no critical bugs',
      order: 4,
    });

    // Delivery milestone
    milestones.push({
      id: generateDeterministicId('milestone-delivery', intake.appName),
      title: 'Delivery',
      description: 'Package and prepare for delivery',
      tasks: [
        `Build ${intake.deliveryFormat} package`,
        'Verify executable or deployable artifact',
        'Generate release notes',
      ],
      acceptanceGate: `Package builds successfully in ${intake.deliveryFormat} format`,
      order: 5,
    });

    return milestones;
  }

  /**
   * Get platform-specific acceptance criteria
   */
  private getPlatformAcceptanceCriteria(intake: AppIntakeForm): string[] {
    const criteria: string[] = [];

    switch (intake.targetPlatform) {
      case 'web':
        criteria.push('Renders in target browsers');
        if (intake.supportedBrowsers.length > 0) {
          criteria.push(`Tested on: ${intake.supportedBrowsers.join(', ')}`);
        }
        break;
      case 'desktop':
        criteria.push('Electron app launches without errors');
        criteria.push('Window management works correctly');
        break;
      case 'mobile':
        criteria.push('Builds for iOS and/or Android');
        criteria.push('Touch interactions functional');
        break;
      case 'api':
        criteria.push('API endpoints respond correctly');
        criteria.push('Authentication works');
        break;
    }

    return criteria;
  }

  /**
   * Get foundation tasks based on stack preferences
   */
  private getFoundationTasks(intake: AppIntakeForm): string[] {
    const tasks = [
      'Initialize project with package.json',
      'Configure build tooling',
      'Set up linting and formatting',
      'Create basic project structure',
    ];

    if (intake.stackPreferences.length > 0) {
      tasks.push(`Install ${intake.stackPreferences[0]} and core dependencies`);
    }

    if (intake.forbiddenPatterns.length > 0) {
      tasks.push(`Configure linting to detect: ${intake.forbiddenPatterns.slice(0, 2).join(', ')}`);
    }

    return tasks;
  }

  /**
   * Generate fix_plan.md content
   */
  private generateFixPlan(intake: AppIntakeForm, milestones: Milestone[]): string {
    const lines: string[] = [
      '# Fix Plan',
      '',
      `## App: ${intake.appName}`,
      '',
      intake.appBrief,
      '',
      '## Target Platform',
      `- ${intake.targetPlatform}`,
      '',
      '## Delivery Format',
      `- ${intake.deliveryFormat}`,
      '',
      '## Milestones',
      '',
    ];

    for (const milestone of milestones) {
      lines.push(`### ${milestone.order}. ${milestone.title}`);
      lines.push('');
      lines.push(milestone.description);
      lines.push('');
      lines.push('**Tasks:**');
      for (const task of milestone.tasks) {
        lines.push(`- [ ] ${task}`);
      }
      lines.push('');
      lines.push(`**Acceptance Gate:** ${milestone.acceptanceGate}`);
      lines.push('');
    }

    lines.push('## Success Criteria');
    lines.push('');
    for (const criterion of intake.successCriteria) {
      lines.push(`- [ ] ${criterion}`);
    }
    lines.push('');
    lines.push('## Technical Constraints');
    lines.push('');

    if (intake.stackPreferences.length > 0) {
      lines.push('**Allowed Stacks:**');
      for (const stack of intake.stackPreferences) {
        lines.push(`- ${stack}`);
      }
      lines.push('');
    }

    if (intake.forbiddenPatterns.length > 0) {
      lines.push('**Forbidden Patterns:**');
      for (const pattern of intake.forbiddenPatterns) {
        lines.push(`- ${pattern}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate updated PROMPT.md based on blueprint
   */
  generatePromptMd(blueprint: AppBlueprint): string {
    return `# Ralph Prompt

This is the main prompt file that guides Ralph's autonomous behavior for building ${blueprint.intake.appName}.

## App Goal

${blueprint.intake.appBrief}

## Target Platform

${blueprint.intake.targetPlatform}

## Success Criteria

${blueprint.intake.successCriteria.map(c => `- ${c}`).join('\n')}

## Milestones

${blueprint.milestones.map(m => `- ${m.order}. ${m.title}: ${m.description}`).join('\n')}

## Loop Behavior

- Ralph will read this file at the start of each iteration
- Modify this file to change Ralph's behavior mid-run
- The file is operator-authored and preserved across iterations
- Always refer to the specs in \`specs/\` for detailed requirements
`;
  }

  /**
   * Generate updated AGENT.md based on blueprint
   */
  generateAgentMd(blueprint: AppBlueprint): string {
    const stackInfo = blueprint.intake.stackPreferences.length > 0
      ? blueprint.intake.stackPreferences.join(', ')
      : 'Not specified';

    return `# Ralph Agent Configuration

This file configures Ralph's agent behavior for building ${blueprint.intake.appName}.

## Model Settings

- Model: Claude Sonnet 4
- Temperature: 0.7
- Max tokens: 4096

## Technology Stack

${stackInfo}

## Tool Configuration

- Web search: enabled
- Code execution: enabled
- File operations: enabled

## Platform Target

${blueprint.intake.targetPlatform}

## Error Handling

- Max retries per iteration: 3
- Fallback strategy: report and pause

## Constraints

${
  blueprint.intake.forbiddenPatterns.length > 0
    ? blueprint.intake.forbiddenPatterns.map(p => `- DO NOT use: ${p}`).join('\n')
    : '- No forbidden patterns specified'
}
`;
  }

  /**
   * Write blueprint files to workspace atomically with rollback on failure
   */
  writeBlueprintFiles(workspacePath: string, blueprint: AppBlueprint): {
    created: string[];
    errors: string[];
  } {
    const created: string[] = [];
    const errors: string[] = [];
    const tempFiles: Array<{ path: string; isNew: boolean }> = [];

    // Helper to write atomically (write to temp then rename)
    const atomicWrite = (filePath: string, content: string, isNew: boolean): boolean => {
      const fullPath = path.join(workspacePath, filePath);
      const dir = path.dirname(fullPath);

      try {
        // Ensure directory exists
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write to temp file first
        const tempPath = `${fullPath}.tmp.${Date.now()}`;
        fs.writeFileSync(tempPath, content, 'utf-8');

        // Rename to final location (atomic on most filesystems)
        fs.renameSync(tempPath, fullPath);
        tempFiles.push({ path: fullPath, isNew });
        return true;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        return false;
      }
    };

    try {
      // Write PROMPT.md
      if (!atomicWrite('PROMPT.md', this.generatePromptMd(blueprint), true)) {
        this.rollbackFiles(tempFiles);
        return { created, errors };
      }
      created.push('PROMPT.md');

      // Write AGENT.md
      if (!atomicWrite('AGENT.md', this.generateAgentMd(blueprint), true)) {
        this.rollbackFiles(tempFiles);
        return { created, errors };
      }
      created.push('AGENT.md');

      // Write fix_plan.md
      if (!atomicWrite('fix_plan.md', blueprint.fixPlan, true)) {
        this.rollbackFiles(tempFiles);
        return { created, errors };
      }
      created.push('fix_plan.md');

      // Write specs/
      const specsDir = 'specs';
      const specsDirFull = path.join(workspacePath, specsDir);
      if (!fs.existsSync(specsDirFull)) {
        fs.mkdirSync(specsDirFull, { recursive: true });
      }

      // Write index
      if (!atomicWrite(`${specsDir}/index.md`, this.generateSpecsIndex(blueprint), true)) {
        this.rollbackFiles(tempFiles);
        return { created, errors };
      }
      created.push(`${specsDir}/index.md`);

      // Write individual spec files
      for (const spec of blueprint.specs) {
        if (!atomicWrite(`${specsDir}/${spec.id}.md`, this.generateSpecContent(spec), true)) {
          this.rollbackFiles(tempFiles);
          return { created, errors };
        }
        created.push(`${specsDir}/${spec.id}.md`);
      }

      // Write milestones
      if (!atomicWrite(`${specsDir}/milestones.md`, this.generateMilestonesContent(blueprint.milestones), true)) {
        this.rollbackFiles(tempFiles);
        return { created, errors };
      }
      created.push(`${specsDir}/milestones.md`);

      // Write blueprint metadata
      const blueprintMeta = {
        version: blueprint.version,
        generatedAt: blueprint.generatedAt,
        appName: blueprint.intake.appName,
        platform: blueprint.intake.targetPlatform,
      };
      if (!atomicWrite('.ralph/blueprint.json', JSON.stringify(blueprintMeta, null, 2), true)) {
        this.rollbackFiles(tempFiles);
        return { created, errors };
      }
      created.push('.ralph/blueprint.json');

    } catch (error) {
      this.rollbackFiles(tempFiles);
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return { created, errors };
  }

  /**
   * Rollback created files on failure
   */
  private rollbackFiles(files: Array<{ path: string; isNew: boolean }>): void {
    // Remove files in reverse order (new files only)
    for (const file of files.reverse()) {
      if (file.isNew) {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch {
          // Best effort rollback
        }
      }
    }
  }

  /**
   * Generate specs/index.md content
   */
  private generateSpecsIndex(blueprint: AppBlueprint): string {
    const lines = [
      '# Specifications',
      '',
      `App: ${blueprint.intake.appName}`,
      `Generated: ${new Date(blueprint.generatedAt).toISOString()}`,
      '',
      '## Specs',
      '',
    ];

    for (const spec of blueprint.specs) {
      lines.push(`- [${spec.priority.toUpperCase()}] ${spec.title}: ${spec.id}.md`);
    }

    lines.push('');
    lines.push('See individual spec files for detailed requirements.');

    return lines.join('\n');
  }

  /**
   * Generate individual spec file content
   */
  private generateSpecContent(spec: BlueprintSpec): string {
    const lines = [
      `# ${spec.title}`,
      '',
      '## Description',
      '',
      spec.description,
      '',
      '## Acceptance Criteria',
      '',
    ];

    for (const criterion of spec.acceptanceCriteria) {
      lines.push(`- [ ] ${criterion}`);
    }

    if (spec.relatedSpecIds.length > 0) {
      lines.push('');
      lines.push('## Related Specs');
      lines.push('');
      for (const relatedId of spec.relatedSpecIds) {
        lines.push(`- ${relatedId}.md`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate milestones.md content
   */
  private generateMilestonesContent(milestones: Milestone[]): string {
    const lines = [
      '# Milestones',
      '',
    ];

    for (const milestone of milestones) {
      lines.push(`## ${milestone.order}. ${milestone.title}`);
      lines.push('');
      lines.push(milestone.description);
      lines.push('');
      lines.push('**Tasks:**');
      for (const task of milestone.tasks) {
        lines.push(`- [ ] ${task}`);
      }
      lines.push('');
      lines.push(`**Acceptance Gate:** ${milestone.acceptanceGate}`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let instance: BlueprintGenerator | null = null;

export function getBlueprintGenerator(): BlueprintGenerator {
  if (!instance) {
    instance = new BlueprintGenerator();
  }
  return instance;
}
