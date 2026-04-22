// ─────────────────────────────────────────────────────────────────────────────
// Delivery Panel - Review Packaging and Handoff UI (Phase 15)
// Phase 28: Visual Review Gates
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import type {
  AppBlueprint,
  AppBlueprintMilestone,
} from '../../shared/preloadTypes';
import type {
  DeliveryArtifact,
  ReleaseGate,
  HandoffBundle,
  DeliveryStatus,
} from '../../shared/deliveryTypes';

export type { DeliveryStatus, DeliveryArtifact, ReleaseGate, HandoffBundle };

export interface DeliveryPanelProps {
  blueprint: AppBlueprint | null;
  workspacePath: string | null;
  onOpenFile: (filePath: string, lineNumber?: number) => void;
  onRefresh?: () => void;
  projectId?: string;
  runId?: string;
  iteration?: number;
}

interface VisualGateState {
  status: 'pending' | 'capturing' | 'passed' | 'failed' | 'skipped' | 'overridden';
  lastCapturedAt?: number;
  screenshotCount?: number;
  errorCount?: number;
  overrideReason?: string;
  overrideBy?: string;
}

export function DeliveryPanel({
  blueprint,
  workspacePath,
  onOpenFile,
  onRefresh,
  projectId,
  runId,
  iteration,
}: DeliveryPanelProps) {
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('idle');
  const [handoffBundle, setHandoffBundle] = useState<HandoffBundle | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    action: 'package' | 'release' | 'capture_visual' | 'skip_visual' | 'override_visual';
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    isDangerous: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visualGate, setVisualGate] = useState<VisualGateState>({ status: 'pending' });
  const [showVisualSection, setShowVisualSection] = useState(false);

  // Gather delivery milestones from blueprint
  const deliveryMilestones = blueprint?.milestones
    ?.filter((m: AppBlueprintMilestone) => m.title.toLowerCase().includes('delivery') || m.title.toLowerCase().includes('package'))
    ?.sort((a: AppBlueprintMilestone, b: AppBlueprintMilestone) => a.order - b.order) ?? [];

  // Current acceptance gate for the delivery milestone
  const deliveryGate = deliveryMilestones[0]?.acceptanceGate ?? null;

  // Check if visual gate is required (for web delivery format that support preview)
  const requiresVisualGate = blueprint?.intake.deliveryFormat === 'web';
  const visualGateRequired = requiresVisualGate && visualGate.status !== 'skipped' && visualGate.status !== 'overridden';

  // Find visual gate in handoff bundle if available
  const visualGateFromBundle = handoffBundle?.gates.find(
    (g) => g.name.toLowerCase().includes('visual') || g.name.toLowerCase().includes('preview')
  );

  const handleCaptureVisualEvidence = useCallback(async () => {
    if (!workspacePath || !projectId || !runId) {
      setError('Missing workspace or run information for visual capture');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVisualGate({ status: 'capturing' });

    try {
      // First detect preview command
      const detectResult = await window.ralph.preview.detectCommand(workspacePath);
      if (!detectResult.success || !detectResult.result?.found) {
        setVisualGate({ status: 'skipped' });
        setError('No preview command detected. Visual validation skipped.');
        return;
      }

      // Start preview server
      const startResult = await window.ralph.preview.startPreview(workspacePath);
      if (!startResult.success || !startResult.result) {
        setVisualGate({ status: 'skipped' });
        setError('Could not start preview server. Visual validation skipped.');
        return;
      }

      const { url } = startResult.result;

      try {
        // Capture visual evidence
        const routes = detectResult.result?.preview?.routes ?? ['/'];
        const captureResult = await window.ralph.preview.captureAndStoreEvidence(
          projectId,
          runId,
          iteration ?? 0,
          url,
          routes,
          ['desktop', 'mobile']
        );

        if (captureResult.success && captureResult.result) {
          const result = captureResult.result;
          setVisualGate({
            status: result.smokeCheck.passed ? 'passed' : 'failed',
            lastCapturedAt: Date.now(),
            screenshotCount: result.screenshots.length,
            errorCount: result.smokeCheck.errors,
          });
        } else {
          setVisualGate({ status: 'skipped' });
          if (captureResult.result?.skipped) {
            setError(`Visual capture skipped: ${captureResult.result.skipReason}`);
          }
        }
      } finally {
        // Stop preview server
        await window.ralph.preview.stopPreview(startResult.result.processId);
      }
    } catch (err) {
      setVisualGate({ status: 'skipped' });
      setError(err instanceof Error ? err.message : 'Visual capture failed');
    } finally {
      setIsLoading(false);
    }
  }, [workspacePath, projectId, runId, iteration]);

  const handleSkipVisualGate = useCallback(() => {
    setPendingConfirmation({
      action: 'skip_visual',
      title: 'Skip Visual Validation?',
      message: 'Skipping visual validation is not recommended for web apps. Are you sure you want to skip?',
      confirmLabel: 'Skip',
      cancelLabel: 'Cancel',
      isDangerous: false,
    });
  }, []);

  const handleOverrideVisualGate = useCallback(() => {
    setPendingConfirmation({
      action: 'override_visual',
      title: 'Override Visual Gate?',
      message: 'Overriding the visual gate is a safety risk. Please provide a reason for this override.',
      confirmLabel: 'Override',
      cancelLabel: 'Cancel',
      isDangerous: true,
    });
  }, []);

  const handleInspect = useCallback(async () => {
    if (!workspacePath) return;
    setIsLoading(true);
    setError(null);
    setDeliveryStatus('inspecting');

    try {
      const result = await window.ralph.delivery.getHandoffBundle(workspacePath);
      if (result.success && result.bundle) {
        setHandoffBundle(result.bundle as HandoffBundle);
        setDeliveryStatus(result.bundle.gates.every(g => g.status === 'passed') ? 'complete' : 'blocked');
      } else {
        setError(result.error || 'Failed to gather delivery information');
        setDeliveryStatus('idle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to inspect delivery');
      setDeliveryStatus('idle');
    } finally {
      setIsLoading(false);
    }
  }, [workspacePath]);

  const handlePackage = useCallback(() => {
    if (!deliveryGate) return;
    setPendingConfirmation({
      action: 'package',
      title: 'Start Packaging?',
      message: `This will run the acceptance gate "${deliveryGate}" and package the app. This may take several minutes.`,
      confirmLabel: 'Start Packaging',
      cancelLabel: 'Cancel',
      isDangerous: false,
    });
  }, [deliveryGate]);

  const handleRelease = useCallback(() => {
    if (!handoffBundle) return;
    setPendingConfirmation({
      action: 'release',
      title: 'Confirm Release?',
      message: 'This will mark the delivery as complete and generate the final handoff bundle. This action cannot be undone.',
      confirmLabel: 'Release',
      cancelLabel: 'Cancel',
      isDangerous: true,
    });
  }, [handoffBundle]);

  const confirmAction = useCallback(async () => {
    if (!pendingConfirmation || !workspacePath) return;

    const action = pendingConfirmation.action;
    setPendingConfirmation(null);
    setIsLoading(true);
    setError(null);

    try {
      if (action === 'package') {
        setDeliveryStatus('packaging');
        const result = await window.ralph.delivery.runPackaging(workspacePath, blueprint?.intake.deliveryFormat ?? 'web');
        if (result.success) {
          setDeliveryStatus('complete');
          await handleInspect();
        } else {
          setError(result.error || 'Packaging failed');
          setDeliveryStatus('failed');
        }
      } else if (action === 'release') {
        // Check visual gate before release if required
        if (requiresVisualGate && visualGate.status !== 'passed' && visualGate.status !== 'skipped' && visualGate.status !== 'overridden') {
          setError('Visual validation must pass before release. Capture visual evidence or skip/override.');
          setDeliveryStatus('blocked');
          return;
        }

        setDeliveryStatus('releasing');
        const result = await window.ralph.delivery.confirmRelease(workspacePath);
        if (result.success) {
          setDeliveryStatus('complete');
          await handleInspect();
        } else {
          setError(result.error || 'Release failed');
          setDeliveryStatus('failed');
        }
      } else if (action === 'skip_visual') {
        setVisualGate({ status: 'skipped' });
      } else if (action === 'override_visual') {
        setVisualGate({
          ...visualGate,
          status: 'overridden',
          overrideReason: 'Operator override',
          overrideBy: 'Operator',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      setDeliveryStatus('failed');
    } finally {
      setIsLoading(false);
    }
  }, [pendingConfirmation, workspacePath, blueprint, handleInspect, requiresVisualGate, visualGate]);

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'idle': return 'badge badge-neutral';
      case 'inspecting': return 'badge badge-info';
      case 'packaging': return 'badge badge-info';
      case 'releasing': return 'badge badge-info';
      case 'complete': return 'badge badge-success';
      case 'blocked': return 'badge badge-warning';
      case 'failed': return 'badge badge-danger';
      default: return 'badge badge-neutral';
    }
  };

  return (
    <div className="delivery-panel">
      <div className="section-header">
        <div>
          <h3 className="section-title">Delivery & Handoff</h3>
          <p className="section-lead">Review generated app, run packaging, and release deliverables.</p>
        </div>
        <div className="toolbar-inline">
          <span className={getStatusBadge(deliveryStatus)}>{deliveryStatus}</span>
          <button onClick={() => void handleInspect()} disabled={!workspacePath || isLoading} className="btn">
            {isLoading ? 'Inspecting...' : 'Inspect'}
          </button>
          {onRefresh && (
            <button onClick={() => void onRefresh()} disabled={isLoading} className="btn btn-ghost">
              Refresh
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 border border-red-500 rounded">
          <p className="text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="btn btn-ghost mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Blueprint Summary */}
      {blueprint && (
        <div className="surface-panel-muted p-4 mt-4">
          <div className="info-grid">
            <div className="info-item">
              <label>App Name</label>
              <p className="font-semibold">{blueprint.intake.appName}</p>
            </div>
            <div className="info-item">
              <label>Delivery Format</label>
              <p className="font-semibold">{blueprint.intake.deliveryFormat}</p>
            </div>
            <div className="info-item">
              <label>Milestones</label>
              <p>{blueprint.milestones.length} total</p>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Milestones */}
      {deliveryMilestones.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Delivery Milestones</h4>
          <div className="space-y-2">
            {deliveryMilestones.map((milestone) => (
              <div key={milestone.id} className="surface-panel-inset p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="badge badge-info mr-2">{milestone.order}</span>
                    <span className="font-semibold">{milestone.title}</span>
                  </div>
                  <span className="badge badge-neutral">Gate: {milestone.acceptanceGate}</span>
                </div>
                <p className="text-sm text-muted mt-2">{milestone.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Evidence Section (Phase 28) */}
      {requiresVisualGate && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Visual Validation</h4>
            <button
              onClick={() => setShowVisualSection(!showVisualSection)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showVisualSection ? 'Hide' : 'Show'}
            </button>
          </div>

          {showVisualSection && (
            <div className="surface-panel-inset p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className={`badge ${
                  visualGate.status === 'passed' ? 'badge-success' :
                  visualGate.status === 'failed' ? 'badge-danger' :
                  visualGate.status === 'skipped' ? 'badge-warning' :
                  visualGate.status === 'overridden' ? 'badge-warning' :
                  visualGate.status === 'capturing' ? 'badge-info' : 'badge-neutral'
                }`}>
                  {visualGate.status}
                </span>
                <div className="flex-1">
                  <p className="text-sm">
                    {visualGate.status === 'pending' && 'Visual evidence not yet captured. Click "Capture" to validate the app renders correctly.'}
                    {visualGate.status === 'capturing' && 'Capturing visual evidence...'}
                    {visualGate.status === 'passed' && `Visual validation passed. ${visualGate.screenshotCount ?? 0} screenshots captured.`}
                    {visualGate.status === 'failed' && `Visual validation failed. ${visualGate.errorCount ?? 0} errors detected.`}
                    {visualGate.status === 'skipped' && 'Visual validation was skipped.'}
                    {visualGate.status === 'overridden' && `Visual validation was overridden by operator.`}
                  </p>
                  {visualGate.lastCapturedAt && (
                    <p className="text-xs text-muted mt-1">
                      Last captured: {new Date(visualGate.lastCapturedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {visualGate.status === 'failed' && (
                <div className="p-2 mb-3 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300">
                  <p className="font-semibold">Visual smoke checks failed. Review the screenshots and artifacts before releasing.</p>
                </div>
              )}

              {visualGate.status === 'overridden' && visualGate.overrideReason && (
                <div className="p-2 mb-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-300">
                  <p className="font-semibold">Override reason: {visualGate.overrideReason}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => void handleCaptureVisualEvidence()}
                  disabled={isLoading || visualGate.status === 'capturing'}
                  className="btn btn-primary btn-sm"
                >
                  {visualGate.status === 'capturing' ? 'Capturing...' : 'Capture Visual Evidence'}
                </button>

                {(visualGate.status === 'pending' || visualGate.status === 'failed') && (
                  <button
                    onClick={() => void handleSkipVisualGate()}
                    disabled={isLoading}
                    className="btn btn-ghost btn-sm"
                  >
                    Skip Visual Validation
                  </button>
                )}

                {visualGate.status === 'failed' && (
                  <button
                    onClick={() => void handleOverrideVisualGate()}
                    disabled={isLoading}
                    className="btn btn-warning btn-sm"
                  >
                    Override & Release
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Handoff Bundle */}
      {handoffBundle && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Handoff Bundle</h4>
          <div className="surface-panel-inset p-4">
            <div className="mb-4">
              <p className="text-sm text-muted">{handoffBundle.summary}</p>
            </div>

            {/* Artifacts */}
            <div className="mb-4">
              <label className="text-sm font-semibold">Artifacts ({handoffBundle.artifacts.length})</label>
              <div className="mt-2 space-y-2">
                {handoffBundle.artifacts.map((artifact) => (
                  <div key={artifact.id} className="flex items-center gap-3 p-2 surface-panel-muted">
                    <span className={`badge ${artifact.validated ? 'badge-success' : 'badge-warning'}`}>
                      {artifact.validated ? '✓' : '⚠'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{artifact.name}</p>
                      <p className="text-xs text-muted">{artifact.path}</p>
                    </div>
                    {artifact.size && <span className="text-xs text-muted">{artifact.size}</span>}
                    <button
                      onClick={() => onOpenFile(artifact.path)}
                      className="btn btn-ghost btn-sm"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Release Gates */}
            <div>
              <label className="text-sm font-semibold">Release Gates ({handoffBundle.gates.length})</label>
              <div className="mt-2 space-y-2">
                {handoffBundle.gates.map((gate) => (
                  <div key={gate.id} className="flex items-center gap-3 p-2 surface-panel-muted">
                    <span className={`badge ${
                      gate.status === 'passed' ? 'badge-success' :
                      gate.status === 'failed' ? 'badge-danger' :
                      gate.status === 'skipped' ? 'badge-warning' : 'badge-neutral'
                    }`}>
                      {gate.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{gate.name}</p>
                      <p className="text-xs text-muted">{gate.description}</p>
                    </div>
                    {gate.passedAt && (
                      <span className="text-xs text-muted">
                        Passed: {new Date(gate.passedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Packaging Controls */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => void handlePackage()}
          disabled={!workspacePath || !deliveryGate || isLoading || deliveryStatus === 'packaging'}
          className="btn btn-primary"
        >
          {deliveryStatus === 'packaging' ? 'Packaging...' : 'Run Packaging'}
        </button>

        {handoffBundle && handoffBundle.gates.every(g => g.status === 'passed') && (
          <button
            onClick={() => void handleRelease()}
            disabled={
              isLoading ||
              deliveryStatus === 'releasing' ||
              (requiresVisualGate &&
                visualGate.status !== 'passed' &&
                visualGate.status !== 'skipped' &&
                visualGate.status !== 'overridden')
            }
            className="btn btn-success"
            title={
              requiresVisualGate &&
              visualGate.status !== 'passed' &&
              visualGate.status !== 'skipped' &&
              visualGate.status !== 'overridden'
                ? 'Capture or skip visual evidence before releasing'
                : undefined
            }
          >
            {deliveryStatus === 'releasing' ? 'Releasing...' : 'Confirm Release'}
          </button>
        )}
      </div>

      {/* Visual Gate Warning */}
      {requiresVisualGate &&
        visualGate.status !== 'passed' &&
        visualGate.status !== 'skipped' &&
        visualGate.status !== 'overridden' &&
        handoffBundle &&
        handoffBundle.gates.every(g => g.status === 'passed') && (
          <div className="mt-3 p-3 border border-yellow-500/30 rounded bg-yellow-900/10">
            <p className="text-sm text-yellow-300">
              <span className="font-semibold">Visual validation required:</span> The app must pass visual smoke checks before release. Click "Capture Visual Evidence" to validate.
            </p>
          </div>
        )}

      {/* Confirmation Dialog */}
      {pendingConfirmation && (
        <div className="fixed inset-0 grid place-items-center bg-[rgba(6,14,28,0.5)] z-50">
          <div className="surface-panel-muted p-6 max-w-md w-full rounded-lg border border-[var(--border-subtle)]">
            <h3 className="text-lg font-semibold">{pendingConfirmation.title}</h3>
            <p className="mt-2 text-muted">{pendingConfirmation.message}</p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setPendingConfirmation(null)}
                className="btn btn-ghost"
              >
                {pendingConfirmation.cancelLabel}
              </button>
              <button
                onClick={() => void confirmAction()}
                className={pendingConfirmation.isDangerous ? 'btn btn-danger' : 'btn btn-primary'}
              >
                {pendingConfirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryPanel;