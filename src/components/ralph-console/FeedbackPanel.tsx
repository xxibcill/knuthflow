// ─────────────────────────────────────────────────────────────────────────────
// FeedbackPanel - Operator Feedback Submission and Review (Phase 26)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect } from 'react';

export interface FeedbackItem {
  id: string;
  appId: string | null;
  runId: string | null;
  type: string;
  content: string;
  rating: number | null;
  source: string | null;
  linkedBacklogId: string | null;
  createdAt: number;
}

export interface FeedbackPanelProps {
  appId?: string;
  runId?: string;
  className?: string;
}

const FEEDBACK_TYPES = [
  { value: 'observation', label: 'Observation' },
  { value: 'issue', label: 'Issue' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'success', label: 'Success Story' },
  { value: 'question', label: 'Question' },
];

export function FeedbackPanel({ appId, runId, className = '' }: FeedbackPanelProps) {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [type, setType] = useState('observation');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [source, setSource] = useState('');

  const loadFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.ralph.feedback.list(50) as { error?: string } | Array<FeedbackItem>;
      if ('error' in result) {
        setError(result.error || 'Failed to load feedback');
        setFeedbackList([]);
      } else {
        setFeedbackList(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
      setFeedbackList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await window.ralph.feedback.create({
        appId: appId || undefined,
        runId: runId || undefined,
        type,
        content: content.trim(),
        rating: rating > 0 ? rating : undefined,
        source: source.trim() || undefined,
      }) as { error?: string } | FeedbackItem;

      if ('error' in result) {
        setError(result.error || 'Failed to submit feedback');
      } else {
        setContent('');
        setRating(0);
        setSource('');
        setType('observation');
        await loadFeedback();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }, [appId, runId, type, content, rating, source, loadFeedback]);

  const getTypeBadge = (feedbackType: string) => {
    const styles: Record<string, string> = {
      observation: 'badge badge-neutral',
      issue: 'badge badge-error',
      suggestion: 'badge badge-info',
      success: 'badge badge-success',
      question: 'badge badge-warning',
    };
    return styles[feedbackType] || 'badge badge-neutral';
  };

  const getRatingStars = (r: number) => {
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  };

  return (
    <div className={`section-shell ${className}`}>
      <div className="section-header">
        <div>
          <h2 className="section-title">Operator Feedback</h2>
          <p className="section-lead">Record observations, issues, and suggestions from Ralph operations.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 border border-red-500 rounded">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Submission Form */}
      <div className="surface-panel p-4 mb-6">
        <h3 className="text-sm font-semibold mb-3">Submit Feedback</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-muted mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input input-sm w-full"
              >
                {FEEDBACK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Source (optional)</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. operator-console"
                className="input input-sm w-full"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">Rating (optional)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? 0 : star)}
                  className={`text-lg ${rating >= star ? 'text-yellow-400' : 'text-muted'}`}
                >
                  ★
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-muted ml-2">{getRatingStars(rating)}</span>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs text-muted mb-1">Feedback</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the observation, issue, or suggestion..."
              rows={3}
              className="input input-sm w-full"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="btn btn-sm"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>

      {/* Feedback List */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Feedback</h3>
        {isLoading && feedbackList.length === 0 ? (
          <div className="text-center p-8 text-muted">Loading feedback...</div>
        ) : feedbackList.length === 0 ? (
          <div className="text-center p-8 text-muted">
            No feedback recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((item) => (
              <div key={item.id} className="surface-panel p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={getTypeBadge(item.type)}>{item.type}</span>
                    {item.rating && (
                      <span className="text-yellow-400 text-sm">{getRatingStars(item.rating)}</span>
                    )}
                    {item.appId && (
                      <span className="text-xs text-muted">App: {item.appId}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                {item.runId && (
                  <p className="text-xs text-muted mt-2">Run: {item.runId.slice(0, 8)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackPanel;