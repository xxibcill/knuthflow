import type { OperatorConfirmation, OperatorControlAction, RalphPhase } from './RalphConsole.types';

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

const ACTION_COPY: Record<OperatorControlAction, { label: string; className: string }> = {
  pause: { label: 'Pause', className: 'btn' },
  resume: { label: 'Resume', className: 'btn btn-primary' },
  stop: { label: 'Stop', className: 'btn btn-danger' },
  replan: { label: 'Replan', className: 'btn' },
  validate: { label: 'Validate', className: 'btn btn-primary' },
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

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Operator Controls</h2>
          <p className="section-lead">Pause, resume, or stop the selected run. Replan and validation are not wired in this build yet.</p>
        </div>
        <div className="toolbar-inline">
          <span className="badge badge-neutral">Phase {currentPhase}</span>
        </div>
      </div>

      <div className="list-pane">
        <div className="stack-lg">
          <div className="surface-panel-muted p-5">
            <div className="toolbar-inline">
              {currentPhase === 'paused' ? (
                <button
                  onClick={() => onAction('resume')}
                  disabled={!canResume || isDisabled}
                  className={ACTION_COPY.resume.className}
                >
                  {ACTION_COPY.resume.label}
                </button>
              ) : (
                <button
                  onClick={() => onAction('pause')}
                  disabled={!canPause || isDisabled}
                  className={ACTION_COPY.pause.className}
                >
                  {ACTION_COPY.pause.label}
                </button>
              )}

              <button
                onClick={() => onAction('stop')}
                disabled={!canStop || isDisabled}
                className={ACTION_COPY.stop.className}
              >
                {ACTION_COPY.stop.label}
              </button>

              <button
                onClick={() => onAction('replan')}
                disabled
                className={ACTION_COPY.replan.className}
                title="Not yet implemented"
              >
                {ACTION_COPY.replan.label}
              </button>

              <button
                onClick={() => onAction('validate')}
                disabled
                className={ACTION_COPY.validate.className}
                title="Not yet implemented"
              >
                {ACTION_COPY.validate.label}
              </button>
            </div>
          </div>

          {pendingConfirmation && (
            <div className="surface-panel-muted p-5">
              <div className="mb-4">
                <p className="metric-label">Confirmation Required</p>
                <h3 className="m-0 text-lg font-semibold">{pendingConfirmation.title}</h3>
                <p className="mt-2 text-sm text-muted">{pendingConfirmation.message}</p>
              </div>
              <div className="toolbar-inline">
                <button
                  onClick={onConfirm}
                  className={pendingConfirmation.isDangerous ? 'btn btn-danger' : 'btn btn-primary'}
                >
                  {pendingConfirmation.confirmLabel}
                </button>
                <button onClick={onCancelConfirmation} className="btn">
                  {pendingConfirmation.cancelLabel}
                </button>
              </div>
            </div>
          )}

          <div className="metrics-grid">
            <div className="metric-card">
              <p className="metric-label">Current Phase</p>
              <p className="metric-value">{currentPhase}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Run State</p>
              <p className="metric-value">{isRunning ? 'Running' : 'Idle'}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Controls Available</p>
              <p className="metric-value">{[canPause, canResume, canStop].filter(Boolean).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
