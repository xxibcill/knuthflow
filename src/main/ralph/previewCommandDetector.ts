import * as fs from 'fs';
import * as path from 'path';

export interface PreviewCommand {
  command: string;
  cwd: string;
  host: string;
  port: number;
  startupUrl: string;
  routes: string[];
  source: 'package_json' | 'blueprint' | 'ralph_config' | 'default';
  framework: string | null;
}

export interface PreviewDetectionResult {
  found: boolean;
  preview: PreviewCommand | null;
  reason: string;
  suggestion?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Common framework patterns for preview commands
// ─────────────────────────────────────────────────────────────────────────────

interface FrameworkPreviewConfig {
  framework: string;
  previewScript: string;
  defaultPort: number;
  defaultRoutes: string[];
}

const FRAMEWORK_PREVIEW_CONFIGS: FrameworkPreviewConfig[] = [
  {
    framework: 'vite',
    previewScript: 'vite preview',
    defaultPort: 4173,
    defaultRoutes: ['/'],
  },
  {
    framework: 'webpack',
    previewScript: 'webpack serve',
    defaultPort: 3000,
    defaultRoutes: ['/'],
  },
  {
    framework: 'create-react-app',
    previewScript: 'react-scripts start',
    defaultPort: 3000,
    defaultRoutes: ['/'],
  },
  {
    framework: 'next',
    previewScript: 'next start',
    defaultPort: 3000,
    defaultRoutes: ['/'],
  },
  {
    framework: 'nuxt',
    previewScript: 'nuxt start',
    defaultPort: 3000,
    defaultRoutes: ['/'],
  },
  {
    framework: 'remix',
    previewScript: 'remix-serve',
    defaultPort: 3000,
    defaultRoutes: ['/'],
  },
  {
    framework: 'astro',
    previewScript: 'astro preview',
    defaultPort: 4321,
    defaultRoutes: ['/'],
  },
  {
    framework: 'gatsby',
    previewScript: 'gatsby serve',
    defaultPort: 9000,
    defaultRoutes: ['/'],
  },
  {
    framework: 'svelte',
    previewScript: 'vite preview',
    defaultPort: 4173,
    defaultRoutes: ['/'],
  },
  {
    framework: 'vue',
    previewScript: 'vite preview',
    defaultPort: 5173,
    defaultRoutes: ['/'],
  },
  {
    framework: 'angular',
    previewScript: 'ng serve',
    defaultPort: 4200,
    defaultRoutes: ['/'],
  },
  {
    framework: 'electron',
    previewScript: 'electron .',
    defaultPort: 0, // Electron doesn't have a preview server
    defaultRoutes: [],
  },
  {
    framework: 'express',
    previewScript: 'node dist/index.js',
    defaultPort: 3000,
    defaultRoutes: ['/'],
  },
  {
    framework: 'fastify',
    previewScript: 'fastify start',
    defaultPort: 3000,
    defaultRoutes: ['/'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Preview Command Detector
// ─────────────────────────────────────────────────────────────────────────────

export class PreviewCommandDetector {
  /**
   * Detect preview command for a workspace
   */
  detect(workspacePath: string, config?: {
    blueprintPreviewCommand?: string;
    ralphProjectPreviewCommand?: string;
    forcedPort?: number;
    forcedRoutes?: string[];
  }): PreviewDetectionResult {
    // 1. Check explicit configuration first (blueprint or ralph project settings)
    if (config?.blueprintPreviewCommand) {
      const preview = this.parseExplicitCommand(
        workspacePath,
        config.blueprintPreviewCommand,
        'blueprint',
        config.forcedPort,
        config.forcedRoutes
      );
      if (preview) {
        return { found: true, preview, reason: 'Configured via blueprint' };
      }
    }

    if (config?.ralphProjectPreviewCommand) {
      const preview = this.parseExplicitCommand(
        workspacePath,
        config.ralphProjectPreviewCommand,
        'ralph_config',
        config.forcedPort,
        config.forcedRoutes
      );
      if (preview) {
        return { found: true, preview, reason: 'Configured via Ralph project settings' };
      }
    }

    // 2. Detect from package.json scripts
    const fromPackageJson = this.detectFromPackageJson(workspacePath);
    if (fromPackageJson.found) {
      return fromPackageJson;
    }

    // 3. Detect framework and use default preview
    const framework = this.detectFramework(workspacePath);
    if (framework) {
      const frameworkConfig = FRAMEWORK_PREVIEW_CONFIGS.find(
        c => c.framework === framework
      );
      if (frameworkConfig && frameworkConfig.defaultPort > 0) {
        return {
          found: true,
          preview: {
            command: frameworkConfig.previewScript,
            cwd: workspacePath,
            host: 'localhost',
            port: config?.forcedPort ?? frameworkConfig.defaultPort,
            startupUrl: `http://localhost:${config?.forcedPort ?? frameworkConfig.defaultPort}`,
            routes: config?.forcedRoutes ?? frameworkConfig.defaultRoutes,
            source: 'default',
            framework,
          },
          reason: `Detected ${framework} framework with default preview command`,
        };
      }
    }

    // 4. No preview command available
    return {
      found: false,
      preview: null,
      reason: 'No preview command detected',
      suggestion: this.getConfigurationSuggestion(workspacePath),
    };
  }

  /**
   * Detect preview from package.json scripts
   */
  private detectFromPackageJson(workspacePath: string): PreviewDetectionResult {
    const packageJsonPath = path.join(workspacePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return {
        found: false,
        preview: null,
        reason: 'No package.json found',
        suggestion: 'Add a preview command to package.json scripts or configure via blueprint',
      };
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Look for explicit preview command
      if (scripts.preview) {
        const framework = this.detectFrameworkFromDeps(deps);
        return {
          found: true,
          preview: this.createPreviewCommand(
            workspacePath,
            'npm run preview',
            framework,
            scripts.preview,
            'package_json'
          ),
          reason: 'Found "preview" script in package.json',
        };
      }

      // Look for dev command (common for development servers)
      if (scripts.dev) {
        const framework = this.detectFrameworkFromDeps(deps);
        return {
          found: true,
          preview: this.createPreviewCommand(
            workspacePath,
            'npm run dev',
            framework,
            scripts.dev,
            'package_json'
          ),
          reason: 'Found "dev" script in package.json (used as preview)',
        };
      }

      // Look for start command
      if (scripts.start && scripts.start !== 'node server.js') {
        const framework = this.detectFrameworkFromDeps(deps);
        return {
          found: true,
          preview: this.createPreviewCommand(
            workspacePath,
            'npm start',
            framework,
            scripts.start,
            'package_json'
          ),
          reason: 'Found "start" script in package.json',
        };
      }

      // Look for serve command
      if (scripts.serve) {
        const framework = this.detectFrameworkFromDeps(deps);
        return {
          found: true,
          preview: this.createPreviewCommand(
            workspacePath,
            'npm run serve',
            framework,
            scripts.serve,
            'package_json'
          ),
          reason: 'Found "serve" script in package.json',
        };
      }

      return {
        found: false,
        preview: null,
        reason: 'No preview-related scripts found in package.json',
        suggestion: 'Add a "preview" script to package.json, e.g., "preview": "vite preview"',
      };
    } catch (error) {
      return {
        found: false,
        preview: null,
        reason: `Failed to parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check package.json syntax',
      };
    }
  }

  /**
   * Create a PreviewCommand from explicit configuration
   */
  private parseExplicitCommand(
    workspacePath: string,
    command: string,
    source: 'blueprint' | 'ralph_config',
    forcedPort?: number,
    forcedRoutes?: string[]
  ): PreviewCommand | null {
    const framework = this.detectFramework(workspacePath);
    const port = forcedPort ?? this.inferPortFromCommand(command) ?? 3000;

    return {
      command,
      cwd: workspacePath,
      host: 'localhost',
      port,
      startupUrl: `http://localhost:${port}`,
      routes: forcedRoutes ?? ['/'],
      source,
      framework,
    };
  }

  /**
   * Create a PreviewCommand from detected script
   */
  private createPreviewCommand(
    workspacePath: string,
    npmCommand: string,
    framework: string | null,
    rawScript: string,
    source: 'package_json' | 'blueprint' | 'ralph_config' | 'default'
  ): PreviewCommand {
    const port = this.inferPortFromScript(rawScript) ?? this.inferPortFromCommand(rawScript) ?? 3000;
    const routes = this.inferRoutesFromScript(rawScript);

    return {
      command: npmCommand,
      cwd: workspacePath,
      host: 'localhost',
      port,
      startupUrl: `http://localhost:${port}`,
      routes,
      source,
      framework,
    };
  }

  /**
   * Infer port from command string
   */
  private inferPortFromCommand(command: string): number | null {
    // Look for common port patterns in commands
    const portPattern = /--port\s+(\d+)|-p\s+(\d+)|PORT=(\d+)/i;
    const match = command.match(portPattern);
    if (match) {
      return parseInt(match[1] || match[2] || match[3], 10);
    }
    return null;
  }

  /**
   * Infer port from script string
   */
  private inferPortFromScript(script: string): number | null {
    return this.inferPortFromCommand(script);
  }

  /**
   * Infer routes from script string
   */
  private inferRoutesFromScript(script: string): string[] {
    // Check for common route patterns
    if (script.includes('next') || script.includes('nuxt')) {
      return ['/'];
    }
    if (script.includes('gatsby')) {
      return ['/'];
    }
    return ['/'];
  }

  /**
   * Detect framework from package.json dependencies
   */
  private detectFramework(workspacePath: string): string | null {
    const packageJsonPath = path.join(workspacePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      return this.detectFrameworkFromDeps(deps);
    } catch {
      return null;
    }
  }

  /**
   * Detect framework from dependencies
   */
  private detectFrameworkFromDeps(deps: Record<string, string>): string | null {
    const depList = Object.keys(deps);

    if (depList.includes('next')) return 'next';
    if (depList.includes('nuxt')) return 'nuxt';
    if (depList.includes('@remix-run/react')) return 'remix';
    if (depList.includes('gatsby')) return 'gatsby';
    if (depList.includes('astro')) return 'astro';
    if (depList.includes('@angular/core')) return 'angular';
    if (depList.includes('svelte')) return 'svelte';
    if (depList.includes('vue')) return 'vue';
    if (depList.includes('react')) return 'react';
    if (depList.includes('webpack')) return 'webpack';
    if (depList.includes('vite')) return 'vite';
    if (depList.includes('electron')) return 'electron';
    if (depList.includes('express')) return 'express';
    if (depList.includes('fastify')) return 'fastify';

    return null;
  }

  /**
   * Get configuration suggestion based on workspace
   */
  private getConfigurationSuggestion(workspacePath: string): string {
    const hasSrc = fs.existsSync(path.join(workspacePath, 'src'));
    const hasPublic = fs.existsSync(path.join(workspacePath, 'public'));
    const hasPages = fs.existsSync(path.join(workspacePath, 'pages'));
    const hasApp = fs.existsSync(path.join(workspacePath, 'app'));

    if (hasApp || hasPages || hasSrc) {
      return 'Consider adding a "preview" script to package.json, e.g., "preview": "vite preview" or "preview": "next start"';
    }

    return 'Configure preview command in blueprint metadata or Ralph project settings with host, port, and routes';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let instance: PreviewCommandDetector | null = null;

export function getPreviewCommandDetector(): PreviewCommandDetector {
  if (!instance) {
    instance = new PreviewCommandDetector();
  }
  return instance;
}