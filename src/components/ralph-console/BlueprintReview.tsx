import { useState } from 'react';
import type { AppBlueprint } from '../../shared/preloadTypes';

export interface BlueprintReviewProps {
  blueprint: AppBlueprint;
  onApprove: () => void;
  onEdit: (section: 'intake' | 'specs' | 'milestones' | 'fixPlan') => void;
  onCancel: () => void;
  isApproved: boolean;
  isSubmitting: boolean;
}

export function BlueprintReview({
  blueprint,
  onApprove,
  onEdit,
  onCancel,
  isApproved,
  isSubmitting,
}: BlueprintReviewProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('intake');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="blueprint-review">
      <div className="section-header">
        <h2 className="section-title">App Blueprint Review</h2>
        <p className="section-lead">Review and approve the generated app plan before starting the build loop.</p>
      </div>

      <div className="blueprint-meta">
        <span className="badge badge-neutral">
          Version: {blueprint.version.slice(0, 12)}...
        </span>
        <span className="badge badge-neutral">
          Generated: {new Date(blueprint.generatedAt).toLocaleString()}
        </span>
        {isApproved && <span className="badge badge-success">Approved</span>}
      </div>

      {/* Intake Section */}
      <div className="blueprint-section">
        <div
          className="blueprint-section-header"
          onClick={() => toggleSection('intake')}
        >
          <div>
            <h3>App Intake</h3>
            <p className="text-sm text-muted">{blueprint.intake.appName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit('intake');
              }}
              className="btn btn-ghost btn-sm"
              disabled={isSubmitting}
            >
              Edit Intake
            </button>
            <span className={`badge ${expandedSection === 'intake' ? 'badge-info' : 'badge-neutral'}`}>
              {expandedSection === 'intake' ? 'Expanded' : 'View'}
            </span>
          </div>
        </div>

        {expandedSection === 'intake' && (
          <div className="blueprint-section-content">
            <div className="info-grid">
              <div className="info-item">
                <label>App Name</label>
                <p>{blueprint.intake.appName}</p>
              </div>
              <div className="info-item">
                <label>Target Platform</label>
                <p>{blueprint.intake.targetPlatform}</p>
              </div>
              <div className="info-item">
                <label>Delivery Format</label>
                <p>{blueprint.intake.deliveryFormat}</p>
              </div>
            </div>

            <div className="info-item">
              <label>App Brief</label>
              <p className="text-mono">{blueprint.intake.appBrief}</p>
            </div>

            {blueprint.intake.stackPreferences.length > 0 && (
              <div className="info-item">
                <label>Stack Preferences</label>
                <div className="flex flex-wrap gap-2">
                  {blueprint.intake.stackPreferences.map((stack, i) => (
                    <span key={i} className="badge badge-info">{stack}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Specs Section */}
      <div className="blueprint-section">
        <div
          className="blueprint-section-header"
          onClick={() => toggleSection('specs')}
        >
          <div>
            <h3>Specifications ({blueprint.specs.length})</h3>
            <p className="text-sm text-muted">Technical requirements and acceptance criteria</p>
          </div>
          <span className={`badge ${expandedSection === 'specs' ? 'badge-info' : 'badge-neutral'}`}>
            {expandedSection === 'specs' ? 'Expanded' : 'View'}
          </span>
        </div>

        {expandedSection === 'specs' && (
          <div className="blueprint-section-content">
            {blueprint.specs.map((spec) => (
              <div key={spec.id} className="spec-card">
                <h4>{spec.title}</h4>
                <p className="text-sm text-muted">{spec.description}</p>
                <div className="mt-3">
                  <label className="text-sm font-semibold">Acceptance Criteria</label>
                  <ul className="mt-2 space-y-1">
                    {spec.acceptanceCriteria.map((criterion, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-muted">-</span>
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestones Section */}
      <div className="blueprint-section">
        <div
          className="blueprint-section-header"
          onClick={() => toggleSection('milestones')}
        >
          <div>
            <h3>Milestones ({blueprint.milestones.length})</h3>
            <p className="text-sm text-muted">Execution phases and tasks</p>
          </div>
          <span className={`badge ${expandedSection === 'milestones' ? 'badge-info' : 'badge-neutral'}`}>
            {expandedSection === 'milestones' ? 'Expanded' : 'View'}
          </span>
        </div>

        {expandedSection === 'milestones' && (
          <div className="blueprint-section-content">
            {[...blueprint.milestones]
              .sort((a, b) => a.order - b.order)
              .map((milestone) => (
                <div key={milestone.id} className="milestone-card">
                  <div className="milestone-header">
                    <span className="badge badge-info">{milestone.order}</span>
                    <h4>{milestone.title}</h4>
                  </div>
                  <p className="text-sm text-muted mt-2">{milestone.description}</p>

                  <div className="mt-3">
                    <label className="text-sm font-semibold">Tasks</label>
                    <ul className="mt-2 space-y-1">
                      {milestone.tasks.map((task, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-muted">- [ ]</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 p-3 surface-panel-inset">
                    <label className="text-sm font-semibold">Acceptance Gate</label>
                    <p className="text-sm mt-1">{milestone.acceptanceGate}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Success Criteria Section */}
      <div className="blueprint-section">
        <div
          className="blueprint-section-header"
          onClick={() => toggleSection('criteria')}
        >
          <div>
            <h3>Success Criteria ({blueprint.intake.successCriteria.length})</h3>
            <p className="text-sm text-muted">How we measure app completion</p>
          </div>
          <span className={`badge ${expandedSection === 'criteria' ? 'badge-info' : 'badge-neutral'}`}>
            {expandedSection === 'criteria' ? 'Expanded' : 'View'}
          </span>
        </div>

        {expandedSection === 'criteria' && (
          <div className="blueprint-section-content">
            <ul className="criteria-list">
              {blueprint.intake.successCriteria.map((criterion, i) => (
                <li key={i} className="flex items-start gap-2 p-2">
                  <span className="badge badge-success">✓</span>
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Approval Actions */}
      <div className="blueprint-actions">
        <button
          onClick={onCancel}
          className="btn btn-ghost"
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => onEdit('intake')}
            className="btn"
            disabled={isSubmitting}
          >
            Revise Intake
          </button>

          <button
            onClick={onApprove}
            className="btn btn-primary"
            disabled={isApproved || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : isApproved ? 'Approved' : 'Approve & Start Build'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlueprintReview;
