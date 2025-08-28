import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { metrics, observeHistogram, incrementCounter } from '../monitoring/metrics';
import { tracer } from '../monitoring/tracer';
import { errorTracking } from '../monitoring/error-tracking';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count';
  labels?: Record<string, string>;
  timestamp: number;
}

export interface SLOMetric {
  name: string;
  target: number;
  actual: number;
  unit: string;
  status: 'good' | 'warning' | 'breach';
  period: string;
}

@Injectable()
export class PerformanceMonitorService {
  private sloTargets = {
    // Response time targets (95th percentile)
    http_request_duration: 5000, // 5 seconds
    deck_upload_duration: 30000, // 30 seconds
    analysis_duration: 45000, // 45 seconds
    qa_generation_duration: 30000, // 30 seconds
    export_generation_duration: 60000, // 60 seconds

    // Error rate targets (< 5%)
    error_rate: 0.05,

    // Availability targets (> 99.9%)
    availability: 0.999,

    // Throughput targets
    requests_per_second: 100,
    analyses_per_hour: 20,
  };

  constructor(private eventEmitter: EventEmitter2) {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring() {
    // Set up periodic SLO checks
    setInterval(() => {
      this.checkSLOMetrics();
    }, 60000); // Every minute

    // Set up performance alerts
    this.setupPerformanceAlerts();
  }

  /**
   * Track operation performance
   */
  async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();

    return tracer.startActiveSpan(operationName, async (span) => {
      try {
        span.setAttribute('operation.name', operationName);
        if (labels) {
          Object.entries(labels).forEach(([key, value]) => {
            span.setAttribute(key, value);
          });
        }

        const result = await operation();
        const duration = Date.now() - startTime;

        // Record metrics
        this.recordPerformanceMetric({
          name: operationName,
          value: duration,
          unit: 'ms',
          labels,
          timestamp: Date.now()
        });

        // Check against SLO targets
        this.checkSLO(operationName, duration);

        span.setAttribute('operation.duration_ms', duration);
        span.setAttribute('operation.success', true);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        span.recordException(error);
        span.setAttribute('operation.duration_ms', duration);
        span.setAttribute('operation.success', false);

        // Record error metrics
        incrementCounter(metrics.errorsTotal, {
          error_type: 'operation_error',
          component: 'performance_monitor',
          severity: 'error'
        });

        throw error;
      }
    }, labels);
  }

  /**
   * Record custom performance metric
   */
  recordPerformanceMetric(metric: PerformanceMetric) {
    // Store in metrics system
    switch (metric.unit) {
      case 'ms':
      case 's':
        observeHistogram(
          metrics.httpRequestDuration,
          metric.value / (metric.unit === 's' ? 1000 : 1),
          metric.labels
        );
        break;
      case 'bytes':
        // Record memory/disk usage
        break;
      case 'count':
        incrementCounter(metrics.httpRequestsTotal, metric.labels);
        break;
    }

    // Emit event for additional processing
    this.eventEmitter.emit('performance.metric.recorded', metric);
  }

  /**
   * Check operation against SLO targets
   */
  private checkSLO(operationName: string, duration: number) {
    const sloTarget = this.getSLOTarget(operationName);

    if (sloTarget) {
      const sloMetric: SLOMetric = {
        name: operationName,
        target: sloTarget,
        actual: duration,
        unit: 'ms',
        status: duration <= sloTarget ? 'good' : 'breach',
        period: 'current'
      };

      // Alert if SLO is breached
      if (sloMetric.status === 'breach') {
        this.handleSLOBreach(sloMetric);
      }

      this.eventEmitter.emit('slo.metric.calculated', sloMetric);
    }
  }

  /**
   * Get SLO target for operation
   */
  private getSLOTarget(operationName: string): number | null {
    const sloMap: Record<string, keyof typeof this.sloTargets> = {
      'deck_upload': 'deck_upload_duration',
      'deck_analysis': 'analysis_duration',
      'qa_generation': 'qa_generation_duration',
      'export_generation': 'export_generation_duration',
    };

    const sloKey = sloMap[operationName];
    return sloKey ? this.sloTargets[sloKey] : null;
  }

  /**
   * Handle SLO breach
   */
  private handleSLOBreach(sloMetric: SLOMetric) {
    // Log breach
    errorTracking.captureMessage(
      `SLO Breach: ${sloMetric.name} exceeded target`,
      'warning',
      {
        slo_name: sloMetric.name,
        target: sloMetric.target,
        actual: sloMetric.actual,
        unit: sloMetric.unit
      }
    );

    // Emit alert event
    this.eventEmitter.emit('slo.breach.detected', sloMetric);

    // Increment breach counter
    incrementCounter(metrics.errorsTotal, {
      error_type: 'slo_breach',
      component: 'performance_monitor',
      severity: 'warning'
    });
  }

  /**
   * Check all SLO metrics periodically
   */
  private async checkSLOMetrics() {
    // This would typically query metrics from the last hour/day
    // For now, we'll use placeholder logic

    const sloMetrics = await this.calculateCurrentSLOMetrics();

    sloMetrics.forEach(metric => {
      if (metric.status === 'breach') {
        this.handleSLOBreach(metric);
      }
    });

    this.eventEmitter.emit('slo.metrics.checked', sloMetrics);
  }

  /**
   * Calculate current SLO metrics
   */
  private async calculateCurrentSLOMetrics(): Promise<SLOMetric[]> {
    // Placeholder implementation
    // In a real implementation, this would query Prometheus/monitoring system
    return [
      {
        name: 'http_request_duration',
        target: this.sloTargets.http_request_duration,
        actual: 3000, // Example: 3 seconds average
        unit: 'ms',
        status: 'good',
        period: '1h'
      },
      {
        name: 'error_rate',
        target: this.sloTargets.error_rate,
        actual: 0.02, // Example: 2% error rate
        unit: 'ratio',
        status: 'good',
        period: '1h'
      }
    ];
  }

  /**
   * Setup performance alerts
   */
  private setupPerformanceAlerts() {
    // Memory usage alert
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsageMB = memUsage.heapUsed / 1024 / 1024;

      if (heapUsageMB > 500) { // Alert if > 500MB
        errorTracking.captureMessage(
          'High memory usage detected',
          'warning',
          {
            heap_used_mb: heapUsageMB,
            heap_total_mb: memUsage.heapTotal / 1024 / 1024
          }
        );
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(timeRange: string = '1h'): Promise<any> {
    // This would aggregate metrics from the monitoring system
    const report = {
      timeRange,
      timestamp: new Date().toISOString(),
      metrics: {
        averageResponseTime: await this.getAverageResponseTime(timeRange),
        errorRate: await this.getErrorRate(timeRange),
        throughput: await this.getThroughput(timeRange),
        sloCompliance: await this.getSLOCompliance(timeRange)
      },
      alerts: await this.getRecentAlerts(timeRange),
      recommendations: await this.generatePerformanceRecommendations()
    };

    return report;
  }

  private async getAverageResponseTime(timeRange: string): Promise<number> {
    // Placeholder - would query metrics database
    return 1500; // 1.5 seconds
  }

  private async getErrorRate(timeRange: string): Promise<number> {
    // Placeholder - would query metrics database
    return 0.02; // 2%
  }

  private async getThroughput(timeRange: string): Promise<number> {
    // Placeholder - would query metrics database
    return 50; // 50 requests per minute
  }

  private async getSLOCompliance(timeRange: string): Promise<Record<string, number>> {
    // Placeholder - would calculate SLO compliance percentages
    return {
      http_request_duration: 0.98, // 98% compliance
      error_rate: 0.95, // 95% compliance
      availability: 0.999 // 99.9% compliance
    };
  }

  private async getRecentAlerts(timeRange: string): Promise<any[]> {
    // Placeholder - would query alert history
    return [
      {
        id: 'alert-1',
        type: 'slo_breach',
        message: 'HTTP response time exceeded 5s',
        severity: 'warning',
        timestamp: new Date().toISOString()
      }
    ];
  }

  private async generatePerformanceRecommendations(): Promise<string[]> {
    // Placeholder - would analyze metrics and generate recommendations
    return [
      'Consider implementing Redis caching for frequently accessed data',
      'Optimize database queries with proper indexing',
      'Implement connection pooling for external services'
    ];
  }
}
