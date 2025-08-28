import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { metrics, setGauge } from '../monitoring/metrics';
import { errorTracking } from '../monitoring/error-tracking';

export interface AutoscalingConfig {
  minWorkers: number;
  maxWorkers: number;
  targetQueueSize: number;
  scaleUpThreshold: number; // percentage above target
  scaleDownThreshold: number; // percentage below target
  cooldownPeriod: number; // milliseconds
  evaluationPeriod: number; // milliseconds
}

export interface WorkerMetrics {
  queueSize: number;
  activeWorkers: number;
  averageProcessingTime: number;
  errorRate: number;
  lastScaleEvent: Date;
  cooldownUntil: Date;
}

@Injectable()
export class WorkerAutoscalingService implements OnModuleDestroy {
  private readonly defaultConfig: AutoscalingConfig = {
    minWorkers: 2,
    maxWorkers: 20,
    targetQueueSize: 10,
    scaleUpThreshold: 0.8, // 80% above target
    scaleDownThreshold: 0.3, // 30% below target
    cooldownPeriod: 300000, // 5 minutes
    evaluationPeriod: 60000 // 1 minute
  };

  private configs = new Map<string, AutoscalingConfig>();
  private workerMetrics = new Map<string, WorkerMetrics>();
  private evaluationIntervals = new Map<string, NodeJS.Timeout>();
  private scalingInProgress = new Set<string>();

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private eventEmitter: EventEmitter2
  ) {}

  /**
   * Configure autoscaling for a worker type
   */
  configureAutoscaling(
    workerType: string,
    config: Partial<AutoscalingConfig>
  ): void {
    const finalConfig = { ...this.defaultConfig, ...config };
    this.configs.set(workerType, finalConfig);

    // Initialize metrics
    this.workerMetrics.set(workerType, {
      queueSize: 0,
      activeWorkers: finalConfig.minWorkers,
      averageProcessingTime: 0,
      errorRate: 0,
      lastScaleEvent: new Date(),
      cooldownUntil: new Date()
    });

    // Start evaluation loop
    this.startEvaluationLoop(workerType);
  }

  /**
   * Start evaluation loop for a worker type
   */
  private startEvaluationLoop(workerType: string): void {
    const config = this.configs.get(workerType);
    if (!config) return;

    const interval = setInterval(() => {
      this.evaluateScaling(workerType).catch(error => {
        errorTracking.captureException(error, {
          component: 'autoscaling_evaluator',
          workerType
        });
      });
    }, config.evaluationPeriod);

    this.evaluationIntervals.set(workerType, interval);
  }

  /**
   * Evaluate if scaling is needed
   */
  private async evaluateScaling(workerType: string): Promise<void> {
    if (this.scalingInProgress.has(workerType)) return;

    const config = this.configs.get(workerType);
    const metrics = this.workerMetrics.get(workerType);

    if (!config || !metrics) return;

    // Check if we're in cooldown period
    if (new Date() < metrics.cooldownUntil) return;

    try {
      // Get current queue size
      const queueSize = await this.getQueueSize(workerType);
      metrics.queueSize = queueSize;

      // Get active worker count
      const activeWorkers = await this.getActiveWorkerCount(workerType);
      metrics.activeWorkers = activeWorkers;

      // Calculate scaling decision
      const targetSize = config.targetQueueSize;
      const scaleUpThreshold = targetSize * (1 + config.scaleUpThreshold);
      const scaleDownThreshold = targetSize * (1 - config.scaleDownThreshold);

      let scalingDecision: 'scale_up' | 'scale_down' | 'no_change' = 'no_change';

      if (queueSize > scaleUpThreshold && activeWorkers < config.maxWorkers) {
        scalingDecision = 'scale_up';
      } else if (queueSize < scaleDownThreshold && activeWorkers > config.minWorkers) {
        scalingDecision = 'scale_down';
      }

      if (scalingDecision !== 'no_change') {
        this.scalingInProgress.add(workerType);
        await this.executeScaling(workerType, scalingDecision, metrics);

        // Update cooldown
        metrics.cooldownUntil = new Date(Date.now() + config.cooldownPeriod);
        metrics.lastScaleEvent = new Date();

        this.scalingInProgress.delete(workerType);
      }

      // Update metrics
      setGauge(metrics.activeWorkers, activeWorkers, { worker_type: workerType });
      setGauge(metrics.queueSize, queueSize, { queue_type: workerType });

    } catch (error) {
      errorTracking.captureException(error, {
        component: 'autoscaling_evaluation',
        workerType
      });
    }
  }

  /**
   * Execute scaling operation
   */
  private async executeScaling(
    workerType: string,
    decision: 'scale_up' | 'scale_down',
    metrics: WorkerMetrics
  ): Promise<void> {
    const config = this.configs.get(workerType);
    if (!config) return;

    const currentWorkers = metrics.activeWorkers;
    let targetWorkers: number;

    if (decision === 'scale_up') {
      // Scale up by 50% or to max, whichever is smaller
      targetWorkers = Math.min(
        Math.ceil(currentWorkers * 1.5),
        config.maxWorkers
      );
    } else {
      // Scale down by 25% or to min, whichever is larger
      targetWorkers = Math.max(
        Math.floor(currentWorkers * 0.75),
        config.minWorkers
      );
    }

    const workerDelta = targetWorkers - currentWorkers;

    if (workerDelta === 0) return;

    try {
      // Execute scaling via Kubernetes API or container orchestration
      await this.scaleWorkers(workerType, targetWorkers);

      // Update metrics
      metrics.activeWorkers = targetWorkers;

      // Emit event
      this.eventEmitter.emit('autoscaling.scaled', {
        workerType,
        previousWorkers: currentWorkers,
        newWorkers: targetWorkers,
        decision,
        reason: decision === 'scale_up' ? 'high_queue_size' : 'low_queue_size'
      });

      errorTracking.captureMessage(
        `Autoscaled ${workerType}: ${currentWorkers} → ${targetWorkers}`,
        'info',
        {
          workerType,
          previousWorkers: currentWorkers,
          newWorkers: targetWorkers,
          decision,
          queueSize: metrics.queueSize
        }
      );

    } catch (error) {
      errorTracking.captureException(error, {
        component: 'autoscaling_execution',
        workerType,
        decision,
        targetWorkers
      });
    }
  }

  /**
   * Scale workers via orchestration system
   */
  private async scaleWorkers(workerType: string, targetCount: number): Promise<void> {
    // This would integrate with Kubernetes HPA or container orchestration
    // For now, we'll simulate the scaling

    const scalingCommand = {
      workerType,
      targetReplicas: targetCount,
      timestamp: new Date().toISOString()
    };

    // Store scaling command in Redis for worker coordination
    await this.redis.setex(
      `scaling:${workerType}`,
      300, // 5 minutes
      JSON.stringify(scalingCommand)
    );

    // In a real implementation, this would call:
    // - Kubernetes API to scale deployments
    // - Docker Swarm to scale services
    // - AWS ECS to scale tasks
    // - etc.
  }

  /**
   * Get current queue size
   */
  private async getQueueSize(queueType: string): Promise<number> {
    try {
      const queueLength = await this.redis.llen(queueType);
      return queueLength;
    } catch (error) {
      errorTracking.captureException(error, {
        component: 'queue_size_check',
        queueType
      });
      return 0;
    }
  }

  /**
   * Get active worker count
   */
  private async getActiveWorkerCount(workerType: string): Promise<number> {
    try {
      // Get worker heartbeat count from Redis
      const workerKeys = await this.redis.keys(`worker:${workerType}:*:heartbeat`);
      return workerKeys.length;
    } catch (error) {
      errorTracking.captureException(error, {
        component: 'worker_count_check',
        workerType
      });
      return this.defaultConfig.minWorkers;
    }
  }

  /**
   * Get autoscaling metrics for monitoring
   */
  getAutoscalingMetrics(workerType?: string): any {
    if (workerType) {
      return this.workerMetrics.get(workerType) || null;
    }

    const allMetrics: any = {};
    for (const [type, metrics] of this.workerMetrics.entries()) {
      allMetrics[type] = metrics;
    }
    return allMetrics;
  }

  /**
   * Manually trigger scaling for testing
   */
  async manualScale(workerType: string, targetWorkers: number): Promise<boolean> {
    try {
      const config = this.configs.get(workerType);
      const metrics = this.workerMetrics.get(workerType);

      if (!config || !metrics) return false;

      // Validate target
      if (targetWorkers < config.minWorkers || targetWorkers > config.maxWorkers) {
        return false;
      }

      await this.scaleWorkers(workerType, targetWorkers);
      metrics.activeWorkers = targetWorkers;
      metrics.lastScaleEvent = new Date();

      this.eventEmitter.emit('autoscaling.manual_scale', {
        workerType,
        targetWorkers,
        triggeredBy: 'manual'
      });

      return true;
    } catch (error) {
      errorTracking.captureException(error, {
        component: 'manual_scaling',
        workerType,
        targetWorkers
      });
      return false;
    }
  }

  /**
   * Get scaling recommendations
   */
  getScalingRecommendations(workerType: string): any {
    const config = this.configs.get(workerType);
    const metrics = this.workerMetrics.get(workerType);

    if (!config || !metrics) return null;

    const recommendations = {
      currentWorkers: metrics.activeWorkers,
      recommendedWorkers: metrics.activeWorkers,
      reason: 'optimal',
      confidence: 'high'
    };

    const utilizationRatio = metrics.queueSize / config.targetQueueSize;

    if (utilizationRatio > 1.5) {
      recommendations.recommendedWorkers = Math.min(
        Math.ceil(metrics.activeWorkers * 1.5),
        config.maxWorkers
      );
      recommendations.reason = 'high_queue_utilization';
      recommendations.confidence = 'high';
    } else if (utilizationRatio < 0.5) {
      recommendations.recommendedWorkers = Math.max(
        Math.floor(metrics.activeWorkers * 0.8),
        config.minWorkers
      );
      recommendations.reason = 'low_queue_utilization';
      recommendations.confidence = 'medium';
    }

    return recommendations;
  }

  /**
   * Reset autoscaling for a worker type
   */
  resetAutoscaling(workerType: string): void {
    const interval = this.evaluationIntervals.get(workerType);
    if (interval) {
      clearInterval(interval);
      this.evaluationIntervals.delete(workerType);
    }

    this.workerMetrics.delete(workerType);
    this.configs.delete(workerType);
    this.scalingInProgress.delete(workerType);
  }

  /**
   * Health check for autoscaling system
   */
  async healthCheck(): Promise<any> {
    const health: any = {
      status: 'healthy',
      workerTypes: [],
      issues: []
    };

    for (const [workerType, metrics] of this.workerMetrics.entries()) {
      const config = this.configs.get(workerType);

      health.workerTypes.push({
        type: workerType,
        activeWorkers: metrics.activeWorkers,
        queueSize: metrics.queueSize,
        lastScaleEvent: metrics.lastScaleEvent
      });

      // Check for issues
      if (metrics.activeWorkers === 0) {
        health.issues.push(`${workerType}: No active workers`);
        health.status = 'unhealthy';
      }

      if (metrics.queueSize > (config?.targetQueueSize || 0) * 2) {
        health.issues.push(`${workerType}: High queue backlog`);
        health.status = 'warning';
      }
    }

    return health;
  }

  async onModuleDestroy(): Promise<void> {
    // Clean up intervals
    for (const interval of this.evaluationIntervals.values()) {
      clearInterval(interval);
    }

    this.evaluationIntervals.clear();
    this.workerMetrics.clear();
    this.configs.clear();
    this.scalingInProgress.clear();
  }
}
