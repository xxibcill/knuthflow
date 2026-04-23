import { getDatabase } from './database';
import type { AnalyticsEvent, AnalyticsRollup, BottleneckDetection, Forecast, RecommendationRecord } from '../shared/ralphTypes';

/**
 * Analytics Service - Phase 31
 * Computes rollups, detects bottlenecks, generates forecasts and recommendations
 */

let instance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!instance) {
    instance = new AnalyticsService();
  }
  return instance;
}

export class AnalyticsService {
  private db = () => getDatabase();

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Recording
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Record an analytics event during a run
   */
  recordEvent(params: {
    projectId?: string | null;
    runId?: string | null;
    sessionId?: string | null;
    eventType: string;
    category: AnalyticsEvent['category'];
    metricName: string;
    metricValue: number;
    dimensions?: Record<string, unknown>;
  }): AnalyticsEvent {
    return this.db().createAnalyticsEvent(params);
  }

  /**
   * Record run completion metrics as analytics events
   */
  recordRunCompletionMetrics(runId: string, projectId: string, data: {
    durationMs: number;
    iterationCount: number;
    validationPassRate: number;
    operatorInterventionCount: number;
    outcome: 'success' | 'failure' | 'cancelled';
    blueprintId?: string;
    platformTargets?: string[];
  }): void {
    // Record duration
    this.recordEvent({
      projectId,
      runId,
      eventType: 'run_completed',
      category: 'performance',
      metricName: 'duration_ms',
      metricValue: data.durationMs,
      dimensions: {
        outcome: data.outcome,
        blueprintId: data.blueprintId,
        platformTargets: data.platformTargets,
      },
    });

    // Record iteration count
    this.recordEvent({
      projectId,
      runId,
      eventType: 'run_completed',
      category: 'performance',
      metricName: 'iteration_count',
      metricValue: data.iterationCount,
      dimensions: {
        outcome: data.outcome,
        blueprintId: data.blueprintId,
      },
    });

    // Record validation pass rate
    this.recordEvent({
      projectId,
      runId,
      eventType: 'run_completed',
      category: 'quality',
      metricName: 'validation_pass_rate',
      metricValue: data.validationPassRate,
      dimensions: {
        outcome: data.outcome,
      },
    });

    // Record operator interventions
    this.recordEvent({
      projectId,
      runId,
      eventType: 'run_completed',
      category: 'engagement',
      metricName: 'operator_intervention_count',
      metricValue: data.operatorInterventionCount,
      dimensions: {
        outcome: data.outcome,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rollup Computation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Compute rollups for a given time window and scope
   */
  computeRollups(params: {
    projectId?: string | null;
    blueprintId?: string | null;
    portfolioId?: string | null;
    timeWindow: string;
  }): AnalyticsRollup[] {
    const db = this.db();
    const { projectId, blueprintId, portfolioId, timeWindow } = params;
    const rollups: AnalyticsRollup[] = [];

    // Get recent events for the time window
    const windowMs = this.parseTimeWindow(timeWindow);
    const events = db.listAnalyticsEvents({
      projectId,
      startTime: Date.now() - windowMs,
    }, 10000);

    // Filter for completed run events
    const runEvents = events.filter((e: AnalyticsEvent) => e.eventType === 'run_completed');

    // Calculate aggregations for each metric
    const metrics = [
      { name: 'duration_ms', label: 'avg_duration_ms' },
      { name: 'iteration_count', label: 'avg_iteration_count' },
      { name: 'validation_pass_rate', label: 'avg_validation_pass_rate' },
      { name: 'operator_intervention_count', label: 'avg_operator_interventions' },
    ];

    for (const metric of metrics) {
      const metricEvents = runEvents.filter((e: AnalyticsEvent) => e.metricName === metric.name);

      if (metricEvents.length > 0) {
        const sum = metricEvents.reduce((acc: number, e: AnalyticsEvent) => acc + e.metricValue, 0);
        const rollup = db.createAnalyticsRollup({
          projectId,
          blueprintId,
          portfolioId,
          rollupType: 'run_aggregates',
          timeWindow,
          metricName: metric.label,
          metricValue: sum / metricEvents.length,
          sampleSize: metricEvents.length,
          dimensions: { source_metric: metric.name },
        });
        rollups.push(rollup);
      }
    }

    return rollups;
  }

  private parseTimeWindow(window: string): number {
    const match = window.match(/^(\d+)(h|d|w|m)$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Bottleneck Detection
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Detect bottlenecks from analytics events
   */
  detectBottlenecks(params?: {
    projectId?: string | null;
    blueprintId?: string | null;
  }): BottleneckDetection[] {
    const db = this.db();
    const { projectId, blueprintId } = params || {};

    // Get recent run events
    const events = db.listAnalyticsEvents({ projectId }, 1000);
    const bottlenecks: BottleneckDetection[] = [];

    // Analyze slow validation gates
    const validationEvents = events.filter((e: AnalyticsEvent) =>
      e.metricName === 'validation_pass_rate' && e.dimensions?.gate_type
    );

    if (validationEvents.length >= 3) {
      const lowPassRateEvents = validationEvents.filter((e: AnalyticsEvent) => e.metricValue < 0.7);
      if (lowPassRateEvents.length >= 2) {
        const avgPassRate = lowPassRateEvents.reduce((a: number, e: AnalyticsEvent) => a + e.metricValue, 0) / lowPassRateEvents.length;
        bottlenecks.push(db.createBottleneckDetection({
          projectId,
          blueprintId,
          bottleneckType: 'slow_validation_gate',
          description: 'Validation gates have low pass rate across multiple runs',
          severity: 'high',
          frequency: lowPassRateEvents.length,
          impactScore: lowPassRateEvents.length * (1 - avgPassRate),
          suggestion: 'Review and adjust validation gate thresholds or fix underlying issues',
        }));
      }
    }

    // Analyze high operator intervention rates
    const interventionEvents = events.filter((e: AnalyticsEvent) =>
      e.metricName === 'operator_intervention_count' && e.metricValue > 2
    );

    if (interventionEvents.length >= 3) {
      const avgInterventions = interventionEvents.reduce((a: number, e: AnalyticsEvent) => a + e.metricValue, 0) / interventionEvents.length;
      bottlenecks.push(db.createBottleneckDetection({
        projectId,
        blueprintId,
        bottleneckType: 'repeated_operator_intervention',
        description: 'Multiple runs required frequent operator interventions',
        severity: 'medium',
        frequency: interventionEvents.length,
        impactScore: avgInterventions,
        suggestion: 'Review operator override patterns and consider updating blueprints or policies',
      }));
    }

    return bottlenecks;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Forecasting
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate a forecast for a new run based on historical data
   */
  generateForecast(params: {
    projectId?: string | null;
    blueprintId?: string | null;
    appType?: string | null;
    platformTargets?: string[];
    stackPreferences?: string[];
  }): Forecast {
    const db = this.db();
    const { projectId, blueprintId, appType, platformTargets, stackPreferences } = params;

    // Get historical runs for context
    const events = db.listAnalyticsEvents({ projectId }, 100);
    const runEvents = events.filter((e: AnalyticsEvent) => e.eventType === 'run_completed');

    // Calculate estimates from historical data
    let estimatedDurationMs: number | null = null;
    let estimatedIterationCount: number | null = null;
    let confidenceScore: number | null = null;
    let caveats: string | null = null;

    const durationEvents = runEvents.filter((e: AnalyticsEvent) => e.metricName === 'duration_ms');
    const iterationEvents = runEvents.filter((e: AnalyticsEvent) => e.metricName === 'iteration_count');

    if (durationEvents.length >= 3) {
      estimatedDurationMs = durationEvents.reduce((a: number, e: AnalyticsEvent) => a + e.metricValue, 0) / durationEvents.length;
      confidenceScore = Math.min(0.9, durationEvents.length / 10);
    } else {
      // Fallback to heuristic estimates
      estimatedDurationMs = appType === 'web_app' ? 30 * 60 * 1000 : 45 * 60 * 1000;
      confidenceScore = 0.3;
      caveats = 'Forecast based on limited historical data - actual times may vary significantly';
    }

    if (iterationEvents.length >= 3) {
      estimatedIterationCount = Math.round(
        iterationEvents.reduce((a: number, e: AnalyticsEvent) => a + e.metricValue, 0) / iterationEvents.length
      );
    } else {
      estimatedIterationCount = 5;
      if (!caveats) {
        caveats = 'Forecast based on limited historical data - iteration count may vary';
      }
    }

    // Determine risk level based on variance
    let estimatedRiskLevel: Forecast['estimatedRiskLevel'] = 'medium';
    if (durationEvents.length >= 5) {
      const durations = durationEvents.map((e: AnalyticsEvent) => e.metricValue);
      const avg = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
      const variance = durations.reduce((a: number, b: number) => a + Math.pow(b - avg, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / avg; // coefficient of variation

      if (cv > 0.5) {
        estimatedRiskLevel = 'very_high';
      } else if (cv > 0.3) {
        estimatedRiskLevel = 'high';
      } else if (cv < 0.2) {
        estimatedRiskLevel = 'low';
      }
    }

    return db.createForecast({
      projectId,
      blueprintId,
      appType,
      platformTargets,
      stackPreferences,
      estimatedDurationMs,
      estimatedIterationCount,
      estimatedRiskLevel,
      confidenceScore,
      caveats,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Recommendations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate recommendations based on bottlenecks and patterns
   */
  generateRecommendations(params?: {
    projectId?: string | null;
  }): RecommendationRecord[] {
    const db = this.db();
    const { projectId } = params || {};
    const recommendations: RecommendationRecord[] = [];

    // Get bottlenecks
    const bottlenecks = db.listBottleneckDetections({ projectId, status: 'detected' }, 10);

    for (const bottleneck of bottlenecks) {
      let recommendationType: RecommendationRecord['recommendationType'];
      let targetEntityType: RecommendationRecord['targetEntityType'];
      let title: string;
      const description = bottleneck.description;
      let actionableSteps: string;

      switch (bottleneck.bottleneckType) {
        case 'slow_validation_gate':
          recommendationType = 'validation_gate_adjustment';
          targetEntityType = 'validation_gate';
          title = 'Adjust validation gate thresholds';
          actionableSteps = JSON.stringify([
            'Review current validation gate configuration',
            'Identify gates with consistently low pass rates',
            'Adjust thresholds based on project requirements',
            'Monitor pass rates after changes',
          ]);
          break;

        case 'repeated_build_failure':
          recommendationType = 'scaffold_improvement';
          targetEntityType = 'scaffold';
          title = 'Improve scaffold configuration';
          actionableSteps = JSON.stringify([
            'Review build failure logs',
            'Identify common failure patterns',
            'Update scaffold templates',
            'Add missing dependencies',
          ]);
          break;

        case 'frequent_policy_override':
          recommendationType = 'policy_change';
          targetEntityType = 'policy_rule';
          title = 'Review and adjust policy rules';
          actionableSteps = JSON.stringify([
            'Review policy override history',
            'Identify frequently overridden rules',
            'Consider adjusting rule severity or scope',
            'Document legitimate override reasons',
          ]);
          break;

        case 'repeated_operator_intervention':
          recommendationType = 'blueprint_update';
          targetEntityType = 'blueprint';
          title = 'Update blueprint to reduce interventions';
          actionableSteps = JSON.stringify([
            'Review intervention history',
            'Identify patterns triggering interventions',
            'Update blueprint specifications',
            'Add new policies for edge cases',
          ]);
          break;

        case 'failed_packaging_step':
          recommendationType = 'scaffold_improvement';
          targetEntityType = 'scaffold';
          title = 'Fix packaging configuration';
          actionableSteps = JSON.stringify([
            'Review packaging error logs',
            'Verify delivery format settings',
            'Check platform target compatibility',
            'Update packaging configuration',
          ]);
          break;

        default:
          recommendationType = 'blueprint_update';
          targetEntityType = 'blueprint';
          title = 'Address bottleneck';
          actionableSteps = JSON.stringify([
            'Investigate bottleneck root cause',
            'Develop fix plan',
            'Implement and test changes',
            'Monitor for recurrence',
          ]);
      }

      recommendations.push(db.createRecommendationRecord({
        projectId,
        recommendationType,
        targetEntityType,
        targetEntityId: bottleneck.blueprintId,
        title,
        description,
        actionableSteps,
      }));
    }

    return recommendations;
  }
}
