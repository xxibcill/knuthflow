import React, { useState, useEffect, useCallback, Component, ReactNode } from 'react';
import type { AnalyticsEvent, AnalyticsRollup, BottleneckDetection, Forecast, RecommendationRecord } from '../../shared/ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AnalyticsErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-700 font-medium">Analytics Error</h3>
          <p className="text-red-600 text-sm mt-1">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-3 py-1.5 text-sm border border-red-300 rounded hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AnalyticsDashboardProps {
  projectId?: string | null;
  portfolioId?: string | null;
}

interface DateRangeOption {
  startTime?: number;
  endTime?: number;
  label: string;
}

const DATE_RANGES: DateRangeOption[] = [
  { label: '7 days', startTime: Date.now() - 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', startTime: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { label: '90 days', startTime: Date.now() - 90 * 24 * 60 * 60 * 1000 },
  { label: 'All time' },
];

const METRIC_CARDS = [
  { key: 'avg_duration_ms', label: 'Avg Duration', format: (v: number) => formatDuration(v), icon: '⏱' },
  { key: 'avg_iteration_count', label: 'Avg Iterations', format: (v: number) => v.toFixed(1), icon: '🔄' },
  { key: 'avg_validation_pass_rate', label: 'Validation Pass Rate', format: (v: number) => `${(v * 100).toFixed(0)}%`, icon: '✓' },
  { key: 'avg_operator_interventions', label: 'Avg Interventions', format: (v: number) => v.toFixed(1), icon: '👆' },
];

function formatDuration(ms: number): string {
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(0)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ projectId, portfolioId }) => {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>(DATE_RANGES[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [rollups, setRollups] = useState<AnalyticsRollup[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckDetection[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bottlenecks' | 'forecasts' | 'recommendations'>('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ralph = window.ralph ?? window.knuthflow;

      // Load all data in parallel
      const [eventsResult, rollupsResult, bottlenecksResult, forecastsResult, recsResult] = await Promise.all([
        ralph.analytics.listEvents({
          projectId: projectId || undefined,
          startTime: selectedDateRange.startTime,
          category: selectedCategory !== 'all' ? selectedCategory as 'performance' | 'quality' | 'engagement' | 'business' : undefined,
        }),
        ralph.analytics.listRollups({
          projectId: projectId || undefined,
          portfolioId: portfolioId || undefined,
          startTime: selectedDateRange.startTime,
        }),
        ralph.analytics.listBottlenecks({
          projectId: projectId || undefined,
          status: 'detected',
        }),
        ralph.analytics.listForecasts({
          projectId: projectId || undefined,
          resolved: false,
        }),
        ralph.analytics.listRecommendations({
          projectId: projectId || undefined,
          status: 'pending',
        }),
      ]);

      if (eventsResult && 'events' in eventsResult) {
        setEvents(eventsResult.events);
      }
      if (rollupsResult && 'rollups' in rollupsResult) {
        setRollups(rollupsResult.rollups);
      }
      if (bottlenecksResult && 'bottlenecks' in bottlenecksResult) {
        setBottlenecks(bottlenecksResult.bottlenecks);
      }
      if (forecastsResult && 'forecasts' in forecastsResult) {
        setForecasts(forecastsResult.forecasts);
      }
      if (recsResult && 'recommendations' in recsResult) {
        setRecommendations(recsResult.recommendations);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, portfolioId, selectedDateRange, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDismissBottleneck = async (id: string) => {
    try {
      const ralph = window.ralph ?? window.knuthflow;
      await ralph.analytics.updateBottleneck(id, { status: 'dismissed' });
      loadData();
    } catch (error) {
      console.error('Failed to dismiss bottleneck:', error);
    }
  };

  const handleAddressBottleneck = async (id: string) => {
    try {
      const ralph = window.ralph ?? window.knuthflow;
      await ralph.analytics.updateBottleneck(id, { status: 'addressed' });
      loadData();
    } catch (error) {
      console.error('Failed to address bottleneck:', error);
    }
  };

  const handleDismissRecommendation = async (id: string) => {
    try {
      const ralph = window.ralph ?? window.knuthflow;
      await ralph.analytics.updateRecommendation(id, { status: 'dismissed' });
      loadData();
    } catch (error) {
      console.error('Failed to dismiss recommendation:', error);
    }
  };

  // Compute summary metrics from rollups
  const summaryMetrics = METRIC_CARDS.map(card => {
    const rollup = rollups.find(r => r.metricName === card.key);
    return {
      ...card,
      value: rollup?.metricValue ?? null,
    };
  });

  // Compute trend data from events
  const trendData = events
    .filter(e => e.eventType === 'run_completed')
    .slice(0, 50)
    .reverse()
    .map(e => ({
      timestamp: e.createdAt,
      value: e.metricValue,
      metricName: e.metricName,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Run Analytics</h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedDateRange.label}
            onChange={(e) => {
              const range = DATE_RANGES.find(r => r.label === e.target.value);
              if (range) setSelectedDateRange(range);
            }}
            className="px-3 py-1.5 border rounded text-sm"
          >
            {DATE_RANGES.map(range => (
              <option key={range.label} value={range.label}>{range.label}</option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          >
            <option value="all">All Categories</option>
            <option value="performance">Performance</option>
            <option value="quality">Quality</option>
            <option value="engagement">Engagement</option>
            <option value="business">Business</option>
          </select>
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(['overview', 'bottlenecks', 'forecasts', 'recommendations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab}
            {tab === 'bottlenecks' && bottlenecks.length > 0 && (
              <span className="ml-1 text-xs bg-warning text-warning-foreground rounded-full px-1.5">
                {bottlenecks.length}
              </span>
            )}
            {tab === 'recommendations' && recommendations.length > 0 && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                {recommendations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryMetrics.map(metric => (
              <div key={metric.key} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted text-sm">
                  <span>{metric.icon}</span>
                  <span>{metric.label}</span>
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {metric.value !== null ? metric.format(metric.value) : '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Trend Chart */}
          {trendData.length > 0 ? (
            <div className="p-4 border rounded-lg">
              <h3 className="text-sm font-medium mb-4">Run Metrics Trend</h3>
              <div className="h-48 flex items-end gap-1">
                {trendData.map((point, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary rounded-t"
                    style={{
                      height: `${Math.max(4, (point.value / (Math.max(...trendData.map(p => p.value), 1))) * 100)}%`,
                    }}
                    title={`${point.metricName}: ${point.value.toFixed(2)}`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted">
                <span>{new Date(trendData[0]?.timestamp || Date.now()).toLocaleDateString()}</span>
                <span>{new Date(trendData[trendData.length - 1]?.timestamp || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 border rounded-lg text-center text-muted">
              <p>No run data available yet.</p>
              <p className="text-sm mt-1">Run some projects to see analytics trends.</p>
            </div>
          )}

          {/* Active Forecasts */}
          {forecasts.length > 0 && (
            <div className="p-4 border rounded-lg">
              <h3 className="text-sm font-medium mb-3">Active Forecasts</h3>
              <div className="space-y-3">
                {forecasts.slice(0, 3).map(forecast => (
                  <div key={forecast.id} className="p-3 bg-muted rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {forecast.appType || 'Unknown App Type'}
                      </span>
                      <span className={`text-sm px-2 py-0.5 rounded ${
                        forecast.estimatedRiskLevel === 'low' ? 'bg-green-100 text-green-800' :
                        forecast.estimatedRiskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        forecast.estimatedRiskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {forecast.estimatedRiskLevel || 'unknown'} risk
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted">Duration:</span>{' '}
                        {forecast.estimatedDurationMs ? formatDuration(forecast.estimatedDurationMs) : '—'}
                      </div>
                      <div>
                        <span className="text-muted">Iterations:</span>{' '}
                        {forecast.estimatedIterationCount ?? '—'}
                      </div>
                      <div>
                        <span className="text-muted">Confidence:</span>{' '}
                        {forecast.confidenceScore ? `${(forecast.confidenceScore * 100).toFixed(0)}%` : '—'}
                      </div>
                    </div>
                    {forecast.caveats && (
                      <p className="mt-2 text-xs text-muted">{forecast.caveats}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bottlenecks' && (
        <div className="space-y-4">
          {bottlenecks.length > 0 ? (
            bottlenecks.map(bottleneck => (
              <div key={bottleneck.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        bottleneck.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        bottleneck.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        bottleneck.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bottleneck.severity}
                      </span>
                      <span className="text-sm text-muted">{bottleneck.bottleneckType.replace(/_/g, ' ')}</span>
                      <span className="text-sm text-muted">• {bottleneck.frequency} occurrences</span>
                    </div>
                    <p className="mt-2">{bottleneck.description}</p>
                    <div className="mt-3 p-2 bg-muted rounded text-sm">
                      <span className="font-medium">Suggestion:</span> {bottleneck.suggestion}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleAddressBottleneck(bottleneck.id)}
                      className="px-3 py-1 text-sm border rounded hover:bg-muted"
                    >
                      Mark Addressed
                    </button>
                    <button
                      onClick={() => handleDismissBottleneck(bottleneck.id)}
                      className="px-3 py-1 text-sm border rounded hover:bg-muted text-muted"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 border rounded-lg text-center text-muted">
              <p>No bottlenecks detected.</p>
              <p className="text-sm mt-1">Ralph will automatically detect performance and quality issues.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'forecasts' && (
        <div className="space-y-4">
          {forecasts.length > 0 ? (
            forecasts.map(forecast => (
              <div key={forecast.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{forecast.appType || 'Unknown App Type'}</h4>
                    <p className="text-sm text-muted">
                      Created {new Date(forecast.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${
                      forecast.estimatedRiskLevel === 'low' ? 'text-green-600' :
                      forecast.estimatedRiskLevel === 'medium' ? 'text-yellow-600' :
                      forecast.estimatedRiskLevel === 'high' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {forecast.estimatedRiskLevel || 'unknown'}
                    </div>
                    <div className="text-sm text-muted">estimated risk</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted">Est. Duration</div>
                    <div className="text-lg font-medium">
                      {forecast.estimatedDurationMs ? formatDuration(forecast.estimatedDurationMs) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted">Est. Iterations</div>
                    <div className="text-lg font-medium">
                      {forecast.estimatedIterationCount ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted">Confidence</div>
                    <div className="text-lg font-medium">
                      {forecast.confidenceScore ? `${(forecast.confidenceScore * 100).toFixed(0)}%` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted">Platform</div>
                    <div className="text-lg font-medium">
                      {forecast.platformTargets?.join(', ') || '—'}
                    </div>
                  </div>
                </div>
                {forecast.caveats && (
                  <p className="mt-3 text-sm text-muted">{forecast.caveats}</p>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 border rounded-lg text-center text-muted">
              <p>No forecasts available.</p>
              <p className="text-sm mt-1">Forecasts are generated before new runs based on historical data.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map(rec => (
              <div key={rec.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                        {rec.recommendationType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-muted">
                        {rec.targetEntityType}: {rec.targetEntityId || 'general'}
                      </span>
                    </div>
                    <h4 className="mt-2 font-medium">{rec.title}</h4>
                    <p className="mt-1 text-sm text-muted">{rec.description}</p>
                    {rec.actionableSteps && (
                      <ol className="mt-3 space-y-1 text-sm">
                        {JSON.parse(rec.actionableSteps).map((step: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {/* Approve and apply */}}
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDismissRecommendation(rec.id)}
                      className="px-3 py-1 text-sm border rounded hover:bg-muted text-muted"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 border rounded-lg text-center text-muted">
              <p>No pending recommendations.</p>
              <p className="text-sm mt-1">Recommendations will appear based on detected bottlenecks.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Wrap with error boundary for export
export const AnalyticsDashboardWithErrorBoundary: React.FC<AnalyticsDashboardProps> = (props) => (
  <AnalyticsErrorBoundary>
    <AnalyticsDashboard {...props} />
  </AnalyticsErrorBoundary>
);

export default AnalyticsDashboardWithErrorBoundary;
