import { getDatabase } from './database';
import { getAnalyticsService } from './analyticsService';
import type { AnalyticsEvent, AnalyticsRollup, BottleneckDetection, Forecast, RecommendationRecord } from '../shared/ralphTypes';

/**
 * Report Generation Service - Phase 31
 * Generates exportable analytics reports in JSON or Markdown format
 */

let instance: ReportService | null = null;

export function getReportService(): ReportService {
  if (!instance) {
    instance = new ReportService();
  }
  return instance;
}

export interface ReportFilters {
  projectId?: string | null;
  blueprintId?: string | null;
  portfolioId?: string | null;
  startTime?: number;
  endTime?: number;
  dateRange?: '7d' | '30d' | '90d' | 'all';
}

export interface ReportData {
  generatedAt: number;
  filters: ReportFilters;
  summary: {
    totalRuns: number;
    successRate: number;
    avgDurationMs: number | null;
    avgIterations: number | null;
    avgValidationPassRate: number | null;
    avgInterventions: number | null;
  };
  trends: {
    timestamp: number;
    durationMs: number;
    iterationCount: number;
    validationPassRate: number;
    outcome: string;
  }[];
  bottlenecks: BottleneckDetection[];
  forecasts: Forecast[];
  recommendations: RecommendationRecord[];
}

export class ReportService {
  private db = () => getDatabase();
  private analytics = () => getAnalyticsService();

  /**
   * Generate a comprehensive analytics report
   */
  async generateReport(filters: ReportFilters): Promise<ReportData> {
    const db = this.db();
    const { projectId, blueprintId, portfolioId, startTime, endTime, dateRange } = filters;

    // Calculate time bounds
    let effectiveStartTime = startTime;
    if (dateRange && !effectiveStartTime) {
      const now = Date.now();
      switch (dateRange) {
        case '7d': effectiveStartTime = now - 7 * 24 * 60 * 60 * 1000; break;
        case '30d': effectiveStartTime = now - 30 * 24 * 60 * 60 * 1000; break;
        case '90d': effectiveStartTime = now - 90 * 24 * 60 * 60 * 1000; break;
      }
    }

    // Load events for the report
    const events = db.listAnalyticsEvents({
      projectId,
      startTime: effectiveStartTime,
      endTime,
    }, 10000);

    const runEvents = events.filter((e: AnalyticsEvent) => e.eventType === 'run_completed');

    // Calculate summary metrics
    const durationEvents = runEvents.filter((e: AnalyticsEvent) => e.metricName === 'duration_ms');
    const iterationEvents = runEvents.filter((e: AnalyticsEvent) => e.metricName === 'iteration_count');
    const validationEvents = runEvents.filter((e: AnalyticsEvent) => e.metricName === 'validation_pass_rate');
    const interventionEvents = runEvents.filter((e: AnalyticsEvent) => e.metricName === 'operator_intervention_count');

    const totalRuns = runEvents.length;
    const successRuns = runEvents.filter((e: AnalyticsEvent) => e.dimensions?.outcome === 'success').length;

    const summary = {
      totalRuns,
      successRate: totalRuns > 0 ? successRuns / totalRuns : 0,
      avgDurationMs: durationEvents.length > 0
        ? durationEvents.reduce((a: number, e: AnalyticsEvent) => a + e.metricValue, 0) / durationEvents.length
        : null,
      avgIterations: iterationEvents.length > 0
        ? iterationEvents.reduce((a: number, e: AnalyticsEvent) => a + e.metricValue, 0) / iterationEvents.length
        : null,
      avgValidationPassRate: validationEvents.length > 0
        ? validationEvents.reduce((a: number, e: AnalyticsEvent) => a + e.metricValue, 0) / validationEvents.length
        : null,
      avgInterventions: interventionEvents.length > 0
        ? interventionEvents.reduce((a: number, e: AnalyticsEvent) => a + e.metricValue, 0) / interventionEvents.length
        : null,
    };

    // Build trend data
    const trends = runEvents
      .slice(0, 100)
      .map((e: AnalyticsEvent) => ({
        timestamp: e.createdAt,
        durationMs: e.metricName === 'duration_ms' ? e.metricValue : 0,
        iterationCount: e.metricName === 'iteration_count' ? e.metricValue : 0,
        validationPassRate: e.metricName === 'validation_pass_rate' ? e.metricValue : 0,
        outcome: (e.dimensions?.outcome as string) || 'unknown',
      }));

    // Load bottlenecks
    const bottlenecks = db.listBottleneckDetections({
      projectId,
      blueprintId,
      status: 'detected',
    }, 20);

    // Load forecasts
    const forecasts = db.listForecasts({
      projectId,
      blueprintId,
      resolved: false,
    }, 20);

    // Load recommendations
    const recommendations = db.listRecommendationRecords({
      projectId,
      status: 'pending',
    }, 20);

    return {
      generatedAt: Date.now(),
      filters,
      summary,
      trends,
      bottlenecks,
      forecasts,
      recommendations,
    };
  }

  /**
   * Export report as JSON string
   */
  async exportAsJson(filters: ReportFilters): Promise<string> {
    const report = await this.generateReport(filters);
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report as Markdown string
   */
  async exportAsMarkdown(filters: ReportFilters): Promise<string> {
    const report = await this.generateReport(filters);
    const lines: string[] = [];

    lines.push('# Ralph Analytics Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push('');

    if (report.filters.projectId) {
      lines.push(`**Project ID:** ${report.filters.projectId}`);
    }
    if (report.filters.dateRange) {
      lines.push(`**Date Range:** ${report.filters.dateRange}`);
    }
    lines.push('');

    // Summary Section
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Runs | ${report.summary.totalRuns} |`);
    lines.push(`| Success Rate | ${(report.summary.successRate * 100).toFixed(1)}% |`);
    lines.push(`| Avg Duration | ${report.summary.avgDurationMs ? this.formatDuration(report.summary.avgDurationMs) : '—'} |`);
    lines.push(`| Avg Iterations | ${report.summary.avgIterations?.toFixed(1) ?? '—'} |`);
    lines.push(`| Avg Validation Pass Rate | ${report.summary.avgValidationPassRate ? `${(report.summary.avgValidationPassRate * 100).toFixed(0)}%` : '—'} |`);
    lines.push(`| Avg Interventions | ${report.summary.avgInterventions?.toFixed(1) ?? '—'} |`);
    lines.push('');

    // Bottlenecks Section
    if (report.bottlenecks.length > 0) {
      lines.push('## Detected Bottlenecks');
      lines.push('');
      for (const bottleneck of report.bottlenecks) {
        lines.push(`### ${bottleneck.bottleneckType.replace(/_/g, ' ')}`);
        lines.push('');
        lines.push(`- **Severity:** ${bottleneck.severity}`);
        lines.push(`- **Frequency:** ${bottleneck.frequency} occurrences`);
        lines.push(`- **Description:** ${bottleneck.description}`);
        lines.push(`- **Suggestion:** ${bottleneck.suggestion}`);
        lines.push('');
      }
    }

    // Active Forecasts Section
    if (report.forecasts.length > 0) {
      lines.push('## Active Forecasts');
      lines.push('');
      for (const forecast of report.forecasts) {
        lines.push(`### ${forecast.appType || 'Unknown App Type'}`);
        lines.push('');
        lines.push(`- **Risk Level:** ${forecast.estimatedRiskLevel || 'unknown'}`);
        lines.push(`- **Estimated Duration:** ${forecast.estimatedDurationMs ? this.formatDuration(forecast.estimatedDurationMs) : '—'}`);
        lines.push(`- **Estimated Iterations:** ${forecast.estimatedIterationCount ?? '—'}`);
        lines.push(`- **Confidence:** ${forecast.confidenceScore ? `${(forecast.confidenceScore * 100).toFixed(0)}%` : '—'}`);
        if (forecast.caveats) {
          lines.push(`- **Caveats:** ${forecast.caveats}`);
        }
        lines.push('');
      }
    }

    // Recommendations Section
    if (report.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');
      for (const rec of report.recommendations) {
        lines.push(`### ${rec.title}`);
        lines.push('');
        lines.push(`- **Type:** ${rec.recommendationType.replace(/_/g, ' ')}`);
        lines.push(`- **Target:** ${rec.targetEntityType}: ${rec.targetEntityId || 'general'}`);
        lines.push(`- **Description:** ${rec.description}`);
        if (rec.actionableSteps) {
          lines.push('- **Actionable Steps:**');
          const steps = JSON.parse(rec.actionableSteps);
          for (const step of steps) {
            lines.push(`  1. ${step}`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private formatDuration(ms: number): string {
    if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(0)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }
}
