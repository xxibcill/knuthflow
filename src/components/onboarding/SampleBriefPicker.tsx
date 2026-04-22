// ─────────────────────────────────────────────────────────────────────────────
// SampleBriefPicker - Guided sample brief templates for first-time operators
// Phase 27: P27-T3
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useState } from 'react';
import type { Workspace } from '../../preload';
import type { AppIntakeDraft, PlatformTarget, PlatformTargetConfig } from '../../shared/preloadTypes';

export interface SampleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  intake: Partial<AppIntakeDraft>;
}

const SAMPLE_TEMPLATES: SampleTemplate[] = [
  {
    id: 'web-app',
    name: 'Simple Web App',
    description: 'A basic web application with a frontend and basic functionality',
    icon: '🌐',
    intake: {
      appName: 'My Web App',
      appBrief: 'A simple web application with a clean UI, basic navigation, and local data storage.',
      targetPlatform: ['pwa'],
      platformConfig: { categories: ['web'], targets: ['pwa'] },
      successCriteria: [
        'Application loads without errors',
        'Basic user interactions work',
        'Application builds successfully',
      ],
      stackPreferences: ['react', 'typescript', 'tailwind'],
      forbiddenPatterns: [],
      maxBuildTime: 30,
      supportedBrowsers: ['chrome', 'firefox', 'safari'],
      deliveryFormat: 'web',
    },
  },
  {
    id: 'desktop-utility',
    name: 'Desktop Utility',
    description: 'A standalone desktop application for a specific task',
    icon: '🖥️',
    intake: {
      appName: 'My Desktop Utility',
      appBrief: 'A desktop utility app that helps users accomplish a specific task with a simple interface.',
      targetPlatform: ['macos'],
      platformConfig: { categories: ['desktop'], targets: ['macos'] },
      successCriteria: [
        'Application launches without errors',
        'Core functionality works as expected',
        'Application packages successfully',
      ],
      stackPreferences: ['electron', 'typescript'],
      forbiddenPatterns: [],
      maxBuildTime: 45,
      supportedBrowsers: [],
      deliveryFormat: 'electron',
    },
  },
  {
    id: 'api-service',
    name: 'API Service',
    description: 'A backend API service with standard endpoints',
    icon: '⚡',
    intake: {
      appName: 'My API Service',
      appBrief: 'A RESTful API service with standard CRUD endpoints and basic authentication.',
      targetPlatform: ['linux'],
      platformConfig: { categories: ['desktop'], targets: ['linux'] },
      successCriteria: [
        'API starts without errors',
        'Health check endpoint responds',
        'Basic endpoints are functional',
      ],
      stackPreferences: ['express', 'typescript', 'node'],
      forbiddenPatterns: [],
      maxBuildTime: 30,
      supportedBrowsers: [],
      deliveryFormat: 'api',
    },
  },
];

interface SampleBriefPickerProps {
  onComplete: (workspaceId: string) => void;
  onLaunchClaudeSession: (options: {
    name: string;
    workspace: Workspace;
  }) => Promise<{
    success: boolean;
    claudeRunId?: string;
    ptySessionId?: string;
    sessionRecordId?: string;
    error?: string;
  }>;
}

export function SampleBriefPicker({ onComplete, onLaunchClaudeSession }: SampleBriefPickerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<SampleTemplate | null>(null);
  const [customBrief, setCustomBrief] = useState('');
  const [appName, setAppName] = useState('');
  const [mode, setMode] = useState<'templates' | 'custom'>('templates');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateSelect = (template: SampleTemplate) => {
    setSelectedTemplate(template);
    setAppName(template.intake.appName || '');
    setCustomBrief(template.intake.appBrief || '');
  };

  const handleCreateProject = useCallback(async () => {
    if (!appName.trim()) {
      setError('Please enter an app name');
      return;
    }

    if (!customBrief.trim()) {
      setError('Please enter a brief description');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create a workspace for the project
      const workspaceName = appName.toLowerCase().replace(/\s+/g, '-');
      const result = await window.knuthflow.workspace.create(
        workspaceName,
        `${process.env.HOME}/Documents/Ralph/${workspaceName}`,
      );

      if (!result.success) {
        setError(result.error || 'Failed to create workspace');
        setIsCreating(false);
        return;
      }

      const workspace = result.workspace!;

      // Bootstrap Ralph in the workspace
      const bootstrapResult = await window.knuthflow.ralph.bootstrap(
        workspace.id,
        workspace.path,
        false,
        selectedTemplate?.intake.targetPlatform || [],
      );

      if (!bootstrapResult.success) {
        setError(bootstrapResult.error || 'Failed to bootstrap Ralph');
        setIsCreating(false);
        return;
      }

      // Launch a Claude session to start the project
      await onLaunchClaudeSession({ name: `${appName} Session`, workspace });

      onComplete(workspace.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setIsCreating(false);
    }
  }, [appName, customBrief, selectedTemplate, onComplete, onLaunchClaudeSession]);

  return (
    <div className="sample-brief-picker space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-[var(--surface-muted)] rounded-lg w-fit">
        <button
          onClick={() => setMode('templates')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'templates'
              ? 'bg-[var(--surface-panel)] text-[var(--text-primary)]'
              : 'text-muted hover:text-[var(--text-primary)]'
          }`}
        >
          Use Template
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'custom'
              ? 'bg-[var(--surface-panel)] text-[var(--text-primary)]'
              : 'text-muted hover:text-[var(--text-primary)]'
          }`}
        >
          Custom Brief
        </button>
      </div>

      {mode === 'templates' && (
        <>
          {/* Template selection */}
          <div className="grid gap-3">
            {SAMPLE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`surface-panel-muted p-4 rounded-lg text-left transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'ring-2 ring-primary'
                    : 'hover:border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{template.icon}</span>
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted mt-1">{template.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected template preview */}
          {selectedTemplate && (
            <div className="surface-panel-inset p-4 rounded-lg">
              <h4 className="font-medium mb-2">Template Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted">Platform:</span>
                  <span className="ml-2">{selectedTemplate.intake.targetPlatform?.join(', ')}</span>
                </div>
                <div>
                  <span className="text-muted">Format:</span>
                  <span className="ml-2">{selectedTemplate.intake.deliveryFormat}</span>
                </div>
                <div>
                  <span className="text-muted">Stack:</span>
                  <span className="ml-2">{selectedTemplate.intake.stackPreferences?.join(', ')}</span>
                </div>
                <div>
                  <span className="text-muted">Max Build:</span>
                  <span className="ml-2">{selectedTemplate.intake.maxBuildTime} min</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'custom' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Describe your app idea in plain language. Ralph will understand your intent and create a plan.
          </p>
        </div>
      )}

      {/* App name and brief input */}
      {(selectedTemplate || mode === 'custom') && (
        <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
          <div>
            <label htmlFor="appName" className="form-label">
              App Name
            </label>
            <input
              id="appName"
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="My Awesome App"
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="appBrief" className="form-label">
              What should the app do?
            </label>
            <textarea
              id="appBrief"
              value={customBrief}
              onChange={(e) => setCustomBrief(e.target.value)}
              placeholder={mode === 'templates' ? 'Describe any modifications to the template...' : 'A web app that helps users track their daily tasks with categories and priorities...'}
              rows={4}
              className="form-input resize-none"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end pt-4">
        <button onClick={() => setSelectedTemplate(null)} className="btn btn-ghost" disabled={isCreating}>
          Back
        </button>
        <button
          onClick={() => void handleCreateProject()}
          className="btn btn-primary"
          disabled={isCreating || !appName.trim() || !customBrief.trim()}
        >
          {isCreating ? 'Creating...' : 'Create Project & Start'}
        </button>
      </div>
    </div>
  );
}

export default SampleBriefPicker;
