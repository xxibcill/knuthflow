import type { OperatorControlAction, OperatorConfirmation, RalphPhase } from './RalphConsole.types';

interface RalphOperatorControlsProps {
  currentPhase: RalphPhase;
  isRunning: boolean;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  onAction: (action: OperatorControlAction) => void;
  pendingConfirmation?: OperatorConfirmation | null;
  onConfirm: () => void;
  onCancelConfirmation: () => void;
}

const actionLabels: Record<OperatorControlAction, string> = {
  pause: 'Pause',
  resume: 'Resume',
  stop: 'Stop',
  replan: 'Replan',
  validate: 'Validate Now',
};

const actionIcons: Record<OperatorControlAction, string> = {
  pause: 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z',
  resume: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  stop: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
  replan: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  validate: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
};

const actionColors: Record<OperatorControlAction, string> = {
  pause: 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500',
  resume: 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500',
  stop: 'bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500',
  replan: 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500',
  validate: 'bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500',
};

export function RalphOperatorControls({
  currentPhase,
  isRunning,
  canPause,
  canResume,
  canStop,
  onAction,
  pendingConfirmation,
  onConfirm,
  onCancelConfirmation,
}: RalphOperatorControlsProps) {
  const isDisabled = !isRunning && currentPhase === 'idle';

  const handleAction = (action: OperatorControlAction) => {
    // Check if action requires confirmation
    if (action === 'stop' || action === 'replan') {
      const confirmation: OperatorConfirmation = action === 'stop'
        ? {
            action: 'stop',
            title: 'Stop Ralph Run?',
            message: 'This will terminate the current Ralph run. Any in-progress work may be lost. This action cannot be undone.',
            confirmLabel: 'Stop Run',
            cancelLabel: 'Cancel',
            isDangerous: true,
          }
        : {
            action: 'replan',
            title: 'Replan Ralph Run?',
            message: 'This will regenerate the fix_plan.md and reset the loop state. Current progress on tasks will be preserved.',
            confirmLabel: 'Replan',
            cancelLabel: 'Cancel',
            isDangerous: false,
          };
      // Pass to parent to show confirmation dialog
      onAction('replan'); // This would need parent to handle via pendingConfirmation
      return;
    }
    onAction(action);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-medium text-white">Operator Controls</h3>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-2 p-3 bg-gray-850">
        {/* Pause/Resume */}
        {currentPhase === 'paused' ? (
          <button
            onClick={() => onAction('resume')}
            disabled={!canResume || isDisabled}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-white transition-colors ${actionColors.resume}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={actionIcons.resume} />
            </svg>
            Resume
          </button>
        ) : (
          <button
            onClick={() => handleAction('pause')}
            disabled={!canPause || isDisabled}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-white transition-colors ${actionColors.pause}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={actionIcons.pause} />
            </svg>
            Pause
          </button>
        )}

        {/* Stop */}
        <button
          onClick={() => handleAction('stop')}
          disabled={!canStop || isDisabled}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-white transition-colors ${actionColors.stop}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={actionIcons.stop} />
          </svg>
          Stop
        </button>

        {/* Replan */}
        <button
          onClick={() => handleAction('replan')}
          disabled={isDisabled}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-white transition-colors ${actionColors.replan}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={actionIcons.replan} />
          </svg>
          Replan
        </button>

        {/* Validate */}
        <button
          onClick={() => onAction('validate')}
          disabled={isDisabled}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-white transition-colors ${actionColors.validate}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={actionIcons.validate} />
          </svg>
          Validate
        </button>
      </div>

      {/* Confirmation modal */}
      {pendingConfirmation && (
        <div className="p-3 bg-gray-900 border-t border-gray-700">
          <div className={`
            p-3 rounded-lg border
            ${pendingConfirmation.isDangerous ? 'bg-red-900/50 border-red-700' : 'bg-blue-900/50 border-blue-700'}
          `}>
            <h4 className="text-sm font-medium text-white mb-1">{pendingConfirmation.title}</h4>
            <p className="text-xs text-gray-300 mb-3">{pendingConfirmation.message}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={onConfirm}
                className={`px-3 py-1.5 rounded text-sm font-medium text-white transition-colors ${
                  pendingConfirmation.isDangerous
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {pendingConfirmation.confirmLabel}
              </button>
              <button
                onClick={onCancelConfirmation}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium text-white transition-colors"
              >
                {pendingConfirmation.cancelLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase indicator */}
      <div className="px-3 py-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Current Phase:</span>
          <span className={`font-medium ${
            isRunning ? 'text-blue-400' :
            currentPhase === 'paused' ? 'text-yellow-400' :
            currentPhase === 'failed' ? 'text-red-400' :
            currentPhase === 'completed' ? 'text-green-400' :
            'text-gray-400'
          }`}>
            {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)}
          </span>
        </div>
      </div>
    </div>
  );
}