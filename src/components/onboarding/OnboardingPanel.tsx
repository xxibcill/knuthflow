// ─────────────────────────────────────────────────────────────────────────────
// OnboardingPanel - Guided first-run experience for new Ralph operators
// Phase 27: P27-T1, P27-T2, P27-T3, P27-T4, P27-T5
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import type { AppSettings, OnboardingState } from '../../shared/preloadTypes';
import type { Workspace } from '../../preload';
import { DependencyChecklist } from './DependencyChecklist';
import { SampleBriefPicker } from './SampleBriefPicker';
import { OnboardingWorkspaceSetup } from './OnboardingWorkspaceSetup';
import { OnboardingCompletion } from './OnboardingCompletion';

export interface OnboardingPanelProps {
  settings: AppSettings;
  onComplete: (firstWorkspaceId: string) => void;
  onDismiss: () => void;
  onReplay: () => void;
  onOpenWorkspace: (workspacePath: string) => void;
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

export type OnboardingStep = 'welcome' | 'dependencies' | 'workspace' | 'sample_brief' | 'complete';

export function OnboardingPanel({
  settings,
  onComplete,
  onDismiss,
  onReplay,
  onOpenWorkspace,
  onLaunchClaudeSession,
}: OnboardingPanelProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isReplaying, setIsReplaying] = useState(settings.onboardingState === 'completed');

  // Track if we're in replay mode (user has completed onboarding before)
  useEffect(() => {
    if (settings.onboardingState === 'completed') {
      setIsReplaying(true);
    }
  }, [settings.onboardingState]);

  const handleStepComplete = useCallback(
    (step: OnboardingStep, data?: { workspaceId?: string }) => {
      switch (step) {
        case 'welcome':
          setCurrentStep('dependencies');
          break;
        case 'dependencies':
          setCurrentStep('workspace');
          break;
        case 'workspace':
          if (data?.workspaceId) {
            onComplete(data.workspaceId);
          }
          setCurrentStep('sample_brief');
          break;
        case 'sample_brief':
          setCurrentStep('complete');
          break;
        case 'complete':
          break;
      }
    },
    [onComplete],
  );

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleReplay = useCallback(() => {
    setIsReplaying(true);
    setCurrentStep('welcome');
    onReplay();
  }, [onReplay]);

  const getStepTitle = (step: OnboardingStep): string => {
    switch (step) {
      case 'welcome':
        return isReplaying ? 'Welcome Back to Ralph' : 'Welcome to Ralph';
      case 'dependencies':
        return 'Check Dependencies';
      case 'workspace':
        return 'Set Up Workspace';
      case 'sample_brief':
        return 'Create Your First App';
      case 'complete':
        return 'You\'re All Set!';
    }
  };

  const getStepDescription = (step: OnboardingStep): string => {
    switch (step) {
      case 'welcome':
        return isReplaying
          ? 'Let\'s take another guided tour of Ralph.'
          : 'Ralph builds software autonomously. Let\'s get you set up for your first project.';
      case 'dependencies':
        return 'Ralph needs a few tools to be available on your system.';
      case 'workspace':
        return 'Choose or create a workspace where Ralph will build your app.';
      case 'sample_brief':
        return 'Let\'s create your first app brief. You can use a template or start from scratch.';
      case 'complete':
        return 'You\'re ready to start building!';
    }
  };

  const renderStep = (step: OnboardingStep) => {
    switch (step) {
      case 'welcome':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold mb-2">
                {isReplaying ? 'Welcome Back to Ralph' : 'Welcome to Ralph'}
              </h2>
              <p className="text-muted max-w-md mx-auto">
                {isReplaying
                  ? 'Let\'s take another guided tour. You can skip if you already know the ropes.'
                  : 'Ralph is an autonomous coding assistant that builds complete applications. Let\'s set up your first project together.'}
              </p>
            </div>

            <div className="surface-panel-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-3">What Ralph does:</h3>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Understands your app idea from a brief description</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Creates a project plan and builds it step by step</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Runs tests and fixes issues automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Delivers a packaged, ready-to-use application</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              {isReplaying && (
                <button onClick={handleDismiss} className="btn btn-ghost">
                  Skip Tour
                </button>
              )}
              <button onClick={() => handleStepComplete('welcome')} className="btn btn-primary">
                Get Started
              </button>
            </div>
          </div>
        );

      case 'dependencies':
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Check Dependencies</h2>
              <p className="text-muted text-sm">
                Ralph needs these tools to be available on your system.
              </p>
            </div>

            <DependencyChecklist />

            <div className="flex gap-3 justify-end pt-4">
              <button onClick={handleDismiss} className="btn btn-ghost">
                Skip for Now
              </button>
              <button onClick={() => handleStepComplete('dependencies')} className="btn btn-primary">
                Continue
              </button>
            </div>
          </div>
        );

      case 'workspace':
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Set Up Workspace</h2>
              <p className="text-muted text-sm">
                Choose or create a folder where Ralph will build your app.
              </p>
            </div>

            <OnboardingWorkspaceSetup
              onWorkspaceSelected={(workspaceId) => handleStepComplete('workspace', { workspaceId })}
              onOpenWorkspace={onOpenWorkspace}
            />
          </div>
        );

      case 'sample_brief':
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Create Your First App</h2>
              <p className="text-muted text-sm">
                Start with a template or enter your own app description.
              </p>
            </div>

            <SampleBriefPicker
              onComplete={(workspaceId) => handleStepComplete('sample_brief', { workspaceId })}
              onLaunchClaudeSession={onLaunchClaudeSession}
            />
          </div>
        );

      case 'complete':
        return (
          <OnboardingCompletion
            isReplaying={isReplaying}
            onDismiss={handleDismiss}
            onReplay={handleReplay}
          />
        );
    }
  };

  return (
    <div className="onboarding-panel h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{getStepTitle(currentStep)}</h1>
            <p className="text-sm text-muted">{getStepDescription(currentStep)}</p>
          </div>
          <div className="flex items-center gap-2">
            {currentStep !== 'complete' && (
              <button
                onClick={handleDismiss}
                className="btn btn-ghost btn-sm"
                title={isReplaying ? 'Exit replay' : 'Skip onboarding'}
              >
                {isReplaying ? 'Exit' : 'Skip'}
              </button>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        {currentStep !== 'complete' && (
          <div className="flex gap-1 mt-4">
            {(['welcome', 'dependencies', 'workspace', 'sample_brief'] as OnboardingStep[]).map(
              (step, index) => (
                <div
                  key={step}
                  className={`h-1 flex-1 rounded ${
                    index <= ['welcome', 'dependencies', 'workspace', 'sample_brief'].indexOf(currentStep)
                      ? 'bg-primary'
                      : 'bg-[var(--border-subtle)]'
                  }`}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">{renderStep(currentStep)}</div>
    </div>
  );
}

export default OnboardingPanel;
