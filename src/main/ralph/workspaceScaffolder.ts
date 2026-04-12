import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TemplateType = 'web' | 'electron' | 'api' | 'mobile';

/**
 * Represents a supported starter template
 */
export interface AppTemplate {
  id: TemplateType;
  name: string;
  description: string;
  files: TemplateFile[];
  metadata: TemplateMetadata;
}

/**
 * A file within a template
 */
export interface TemplateFile {
  path: string;
  content: string;
  isExecutable?: boolean;
}

/**
 * Metadata about the template
 */
export interface TemplateMetadata {
  recommendedNodeVersion: string;
  packages: TemplatePackage[];
  buildCommands: TemplateBuildCommand[];
  devCommands: TemplateBuildCommand[];
  applicablePlatforms: string[];
}

/**
 * Package dependency for the template
 */
export interface TemplatePackage {
  name: string;
  version: string;
  isDev?: boolean;
}

/**
 * Build/run command for the template
 */
export interface TemplateBuildCommand {
  name: string;
  command: string;
  description: string;
}

/**
 * Result of scaffolding a workspace
 */
export interface ScaffoldingResult {
  success: boolean;
  createdFiles: string[];
  errors: string[];
  templateUsed: TemplateType | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supported Templates
// ─────────────────────────────────────────────────────────────────────────────

const WEB_TEMPLATE: AppTemplate = {
  id: 'web',
  name: 'Web App',
  description: 'A modern web application with React and TypeScript',
  metadata: {
    recommendedNodeVersion: '18.x',
    packages: [
      { name: 'react', version: '^18.2.0', isDev: false },
      { name: 'react-dom', version: '^18.2.0', isDev: false },
      { name: 'typescript', version: '^5.3.0', isDev: true },
      { name: '@types/react', version: '^18.2.0', isDev: true },
      { name: '@types/react-dom', version: '^18.2.0', isDev: true },
      { name: 'vite', version: '^5.0.0', isDev: true },
    ],
    buildCommands: [
      { name: 'build', command: 'npm run build', description: 'Build for production' },
      { name: 'preview', command: 'npm run preview', description: 'Preview production build' },
    ],
    devCommands: [
      { name: 'dev', command: 'npm run dev', description: 'Start development server' },
      { name: 'lint', command: 'npm run lint', description: 'Run linter' },
    ],
    applicablePlatforms: ['web'],
  },
  files: [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'app',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview',
          lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          typescript: '^5.3.0',
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.2.0',
          vite: '^5.0.0',
          eslint: '^8.50.0',
        },
      }, null, 2),
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }],
      }, null, 2),
    },
    {
      path: 'tsconfig.node.json',
      content: JSON.stringify({
        compilerOptions: {
          comdiropsite: true,
          skipLibCheck: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          allowSyntheticDefaultImports: true,
        },
        include: ['vite.config.ts'],
      }, null, 2),
    },
    {
      path: 'vite.config.ts',
      content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    },
    {
      path: 'src/main.tsx',
      content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
    },
    {
      path: 'src/App.tsx',
      content: `import './App.css'

function App() {
  return (
    <div className="App">
      <h1>Welcome to your new app</h1>
    </div>
  )
}

export default App`,
    },
    {
      path: 'src/App.css',
      content: `.App {
  padding: 2rem;
  text-align: center;
}`,
    },
  ],
};

const ELECTRON_TEMPLATE: AppTemplate = {
  id: 'electron',
  name: 'Electron App',
  description: 'A desktop application using Electron with TypeScript',
  metadata: {
    recommendedNodeVersion: '18.x',
    packages: [
      { name: 'electron', version: '^28.0.0', isDev: true },
      { name: 'typescript', version: '^5.3.0', isDev: true },
      { name: 'electron-builder', version: '^24.9.0', isDev: true },
    ],
    buildCommands: [
      { name: 'build', command: 'npm run build', description: 'Build for production' },
      { name: 'dist', command: 'npm run dist', description: 'Create distribution package' },
    ],
    devCommands: [
      { name: 'dev', command: 'npm run dev', description: 'Start development server' },
      { name: 'start', command: 'npm run start', description: 'Start Electron app' },
    ],
    applicablePlatforms: ['desktop'],
  },
  files: [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'app',
        version: '0.1.0',
        private: true,
        main: 'dist/main.js',
        scripts: {
          dev: 'npm run build && electron .',
          build: 'tsc',
          start: 'electron .',
          dist: 'electron-builder',
        },
        devDependencies: {
          electron: '^28.0.0',
          typescript: '^5.3.0',
          'electron-builder': '^24.9.0',
        },
      }, null, 2),
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'CommonJS',
          lib: ['ES2020'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules'],
      }, null, 2),
    },
    {
      path: 'src/main.ts',
      content: `import { app, BrowserWindow } from 'electron';

let mainWindow: Electron.BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: './preload.js',
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});`,
    },
    {
      path: 'src/preload.ts',
      content: `import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});`,
    },
    {
      path: 'src/renderer.ts',
      content: `console.log('Renderer loaded');`,
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <h1>Welcome to your Electron app</h1>
    <script src="src/renderer.ts"></script>
  </body>
</html>`,
    },
  ],
};

const API_TEMPLATE: AppTemplate = {
  id: 'api',
  name: 'API Backend',
  description: 'A REST API backend with Express and TypeScript',
  metadata: {
    recommendedNodeVersion: '18.x',
    packages: [
      { name: 'express', version: '^4.18.0', isDev: false },
      { name: 'typescript', version: '^5.3.0', isDev: true },
      { name: '@types/express', version: '^4.17.0', isDev: true },
    ],
    buildCommands: [
      { name: 'build', command: 'npm run build', description: 'Build for production' },
      { name: 'start', command: 'npm run start', description: 'Start production server' },
    ],
    devCommands: [
      { name: 'dev', command: 'npm run dev', description: 'Start development server' },
      { name: 'lint', command: 'npm run lint', description: 'Run linter' },
    ],
    applicablePlatforms: ['api'],
  },
  files: [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'app',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'ts-node src/index.ts',
          build: 'tsc',
          start: 'node dist/index.js',
          lint: 'eslint . --ext ts --report-unused-disable-directives --max-warnings 0',
        },
        dependencies: {
          express: '^4.18.0',
        },
        devDependencies: {
          typescript: '^5.3.0',
          '@types/express': '^4.17.0',
          'ts-node': '^10.9.0',
        },
      }, null, 2),
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['ES2020'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules'],
      }, null, 2),
    },
    {
      path: 'src/index.ts',
      content: `import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(\`API server running on port \${port}\`);
});`,
    },
    {
      path: 'src/routes/health.ts',
      content: `import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;`,
    },
  ],
};

const MOBILE_TEMPLATE: AppTemplate = {
  id: 'mobile',
  name: 'Mobile App',
  description: 'A React Native mobile application',
  metadata: {
    recommendedNodeVersion: '18.x',
    packages: [
      { name: 'react', version: '^18.2.0', isDev: false },
      { name: 'react-native', version: '^0.73.0', isDev: false },
      { name: 'expo', version: '~50.0.0', isDev: false },
    ],
    buildCommands: [
      { name: 'build', command: 'eas build', description: 'Build for production' },
      { name: 'build:android', command: 'eas build --platform android', description: 'Build for Android' },
      { name: 'build:ios', command: 'eas build --platform ios', description: 'Build for iOS' },
    ],
    devCommands: [
      { name: 'start', command: 'expo start', description: 'Start Expo development server' },
      { name: 'android', command: 'expo start --android', description: 'Start on Android emulator' },
      { name: 'ios', command: 'expo start --ios', description: 'Start on iOS simulator' },
    ],
    applicablePlatforms: ['mobile'],
  },
  files: [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'app',
        version: '0.1.0',
        private: true,
        main: 'node_modules/expo/AppEntry.js',
        scripts: {
          start: 'expo start',
          android: 'expo start --android',
          ios: 'expo start --ios',
          web: 'expo start --web',
        },
        dependencies: {
          expo: '~50.0.0',
          'react': '18.2.0',
          'react-native': '0.73.0',
        },
        devDependencies: {
          '@babel/core': '^7.20.0',
          '@types/react': '~18.2.0',
          typescript: '^5.1.0',
        },
      }, null, 2),
    },
    {
      path: 'app.json',
      content: JSON.stringify({
        expo: {
          name: 'app',
          slug: 'app',
          version: '0.1.0',
          orientation: 'portrait',
          icon: './assets/icon.png',
          userInterfaceStyle: 'light',
          splash: {
            image: './assets/splash.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
          },
          assetPatterns: ['**/*'],
          ios: {
            supportsTablet: true,
          },
          android: {
            adaptiveIcon: {
              foregroundImage: './assets/adaptive-icon.png',
              backgroundColor: '#ffffff',
            },
          },
          web: {
            favicon: './assets/favicon.png',
          },
        },
      }, null, 2),
    },
    {
      path: 'App.tsx',
      content: `import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});`,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Template Catalog
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATES: AppTemplate[] = [
  WEB_TEMPLATE,
  ELECTRON_TEMPLATE,
  API_TEMPLATE,
  MOBILE_TEMPLATE,
];

// ─────────────────────────────────────────────────────────────────────────────
// Workspace Scaffolder
// ─────────────────────────────────────────────────────────────────────────────

export class WorkspaceScaffolder {
  /**
   * Get all available templates
   */
  getTemplates(): AppTemplate[] {
    return TEMPLATES;
  }

  /**
   * Get template by type
   */
  getTemplate(type: TemplateType): AppTemplate | null {
    return TEMPLATES.find(t => t.id === type) ?? null;
  }

  /**
   * Scaffold a workspace with the given template
   */
  scaffold(workspacePath: string, templateType: TemplateType, appName: string): ScaffoldingResult {
    const template = this.getTemplate(templateType);

    if (!template) {
      return {
        success: false,
        createdFiles: [],
        errors: [`Unknown template type: ${templateType}`],
        templateUsed: null,
      };
    }

    const createdFiles: string[] = [];
    const errors: string[] = [];

    try {
      // Create all directories first
      const directories = new Set<string>();
      for (const file of template.files) {
        const dir = path.dirname(file.path);
        if (dir && dir !== '.') {
          directories.add(dir);
        }
      }

      for (const dir of directories) {
        const fullPath = path.join(workspacePath, dir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      }

      // Write all template files
      for (const file of template.files) {
        const fullPath = path.join(workspacePath, file.path);

        // Substitute app name placeholder if present
        let content = file.content.replace(/\${APP_NAME}/g, appName).replace(/APP_NAME/g, appName.replace(/[^a-zA-Z0-9]/g, '_'));

        fs.writeFileSync(fullPath, content, 'utf-8');
        createdFiles.push(file.path);

        // Make executable if specified
        if (file.isExecutable) {
          try {
            fs.chmodSync(fullPath, 0o755);
          } catch {
            // Ignore chmod errors on non-Unix systems
          }
        }
      }

      // Write template metadata for audit trail
      const metadataPath = path.join(workspacePath, '.ralph', 'scaffold.json');
      const metadataDir = path.dirname(metadataPath);
      if (!fs.existsSync(metadataDir)) {
        fs.mkdirSync(metadataDir, { recursive: true });
      }

      const metadata = {
        template: templateType,
        scaffoldAt: Date.now(),
        appName,
        packages: template.metadata.packages,
        buildCommands: template.metadata.buildCommands,
      };

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      createdFiles.push('.ralph/scaffold.json');

      return {
        success: true,
        createdFiles,
        errors: [],
        templateUsed: templateType,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        createdFiles,
        errors,
        templateUsed: templateType,
      };
    }
  }

  /**
   * Get scaffold metadata from a workspace
   */
  getScaffoldMetadata(workspacePath: string): { template: TemplateType; scaffoldAt: number; appName: string } | null {
    const metadataPath = path.join(workspacePath, '.ralph', 'scaffold.json');

    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);
      return {
        template: metadata.template as TemplateType,
        scaffoldAt: metadata.scaffoldAt,
        appName: metadata.appName,
      };
    } catch {
      return null;
    }
  }

  /**
   * Validate that a workspace has been scaffolded
   */
  isScaffolded(workspacePath: string): boolean {
    const metadataPath = path.join(workspacePath, '.ralph', 'scaffold.json');
    return fs.existsSync(metadataPath);
  }

  /**
   * Get the build commands available for a scaffolded workspace
   */
  getBuildCommands(workspacePath: string): TemplateBuildCommand[] {
    const template = this.guessTemplate(workspacePath);
    if (template) {
      return template.metadata.buildCommands;
    }
    return [];
  }

  /**
   * Guess the template type from a scaffolded workspace
   */
  guessTemplate(workspacePath: string): AppTemplate | null {
    const pkgPath = path.join(workspacePath, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['electron']) {
        return ELECTRON_TEMPLATE;
      }
      if (deps['react-native']) {
        return MOBILE_TEMPLATE;
      }
      if (deps['expo']) {
        return MOBILE_TEMPLATE;
      }
      if (deps['express']) {
        return API_TEMPLATE;
      }
      if (deps['react']) {
        return WEB_TEMPLATE;
      }
      if (deps['vite']) {
        return WEB_TEMPLATE;
      }

      return null;
    } catch {
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let instance: WorkspaceScaffolder | null = null;

export function getWorkspaceScaffolder(): WorkspaceScaffolder {
  if (!instance) {
    instance = new WorkspaceScaffolder();
  }
  return instance;
}
