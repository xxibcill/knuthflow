// ─────────────────────────────────────────────────────────────────────────────
// OnboardingCompletion - Final screen when onboarding is complete
// Phase 27: P27-T1, P27-T5
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

interface OnboardingCompletionProps {
  isReplaying: boolean;
  onDismiss: () => void;
  onReplay: () => void;
}

export function OnboardingCompletion({ isReplaying, onDismiss, onReplay }: OnboardingCompletionProps) {
  return (
    <div className="onboarding-completion space-y-6 text-center py-8">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold">You're All Set!</h2>
      <p className="text-muted max-w-md mx-auto">
        {isReplaying
          ? 'Your onboarding replay is complete. You can replay this tour anytime from Help settings.'
          : 'Ralph is ready to help you build your first application. Check out the Resources section below to learn more.'}
      </p>

      <div className="surface-panel-muted p-4 rounded-lg text-left max-w-md mx-auto">
        <h3 className="font-semibold mb-3">Quick Tips:</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span>Use the Projects panel to manage your workspaces</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span>Start a new project from the Ralph dashboard</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span>Check Help &gt; Replay Onboarding if you need a refresher</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span>Your progress is saved automatically</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-3 justify-center pt-4">
        {isReplaying && (
          <button onClick={onReplay} className="btn btn-ghost">
            ↻ Replay Again
          </button>
        )}
        <button onClick={onDismiss} className="btn btn-primary">
          Go to Ralph
        </button>
      </div>
    </div>
  );
}

export default OnboardingCompletion;
