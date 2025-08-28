import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { errorTracking } from '../monitoring/error-tracking';
import { metrics, incrementCounter } from '../monitoring/metrics';

export interface FailedMessage {
  id: string;
  queue: string;
  message: any;
  error: string;
  stackTrace?: string;
  retryCount: number;
  maxRetries: number;
  failedAt: Date;
  nextRetryAt?: Date;
  lastProcessedBy?: string;
  metadata?: Record<string, any>;
}

export interface DLQConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffFactor: number;
  enableJitter: boolean;
  retentionPeriod: number; // in days
  alertThreshold: number; // number of failed messages to trigger alert
}

@Injectable()
export class DeadLetterQueueService implements OnModuleDestroy {
  private readonly defaultConfig: DLQConfig = {
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 3600000, // 1 hour
    backoffFactor: 2,
    enableJitter: true,
    retentionPeriod: 7, // 7 days
    alertThreshold: 10
  };

  private configs = new Map<string, DLQConfig>();
  private processing = new Set<string>();

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private eventEmitter: EventEmitter2
  ) {
    this.initializeDLQProcessing();
  }

  /**
   * Add failed message to DLQ with retry logic
   */
  async addToDLQ(
    queue: string,
    message: any,
    error: Error,
    currentRetryCount: number = 0,
    config?: Partial<DLQConfig>
  ): Promise<void> {
    const dlqConfig = { ...this.defaultConfig, ...this.configs.get(queue), ...config };
    const messageId = this.generateMessageId();

    const failedMessage: FailedMessage = {
      id: messageId,
      queue,
      message,
      error: error.message,
      stackTrace: error.stack,
      retryCount: currentRetryCount,
      maxRetries: dlqConfig.maxRetries,
      failedAt: new Date(),
      metadata: {
        originalMessageId: message.id,
        correlationId: message.correlationId,
        userId: message.userId
      }
    };

    // Check if we should retry
    if (currentRetryCount < dlqConfig.maxRetries) {
      failedMessage.nextRetryAt = this.calculateNextRetryTime(
        currentRetryCount,
        dlqConfig
      );

      // Schedule retry
      await this.scheduleRetry(failedMessage, dlqConfig);
    } else {
      // Max retries reached, move to permanent DLQ
      await this.moveToPermanentDLQ(failedMessage);

      // Alert if threshold exceeded
      await this.checkAlertThreshold(queue);
    }

    // Store in Redis with TTL
    const key = `dlq:${queue}:${messageId}`;
    await this.redis.setex(
      key,
      dlqConfig.retentionPeriod * 24 * 60 * 60, // Convert days to seconds
      JSON.stringify(failedMessage)
    );

    // Record metrics
    incrementCounter(metrics.errorsTotal, {
      error_type: 'dlq_message',
      component: 'dead_letter_queue',
      severity: 'warning'
    });

    // Emit event
    this.eventEmitter.emit('dlq.message.added', {
      queue,
      messageId,
      error: error.message,
      retryCount: currentRetryCount
    });

    errorTracking.captureMessage(
      `Message added to DLQ: ${queue}`,
      'warning',
      {
        queue,
        messageId,
        error: error.message,
        retryCount: currentRetryCount,
        maxRetries: dlqConfig.maxRetries
      }
    );
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    const retryKeys = await this.redis.keys('dlq:*:retry:*');

    for (const key of retryKeys) {
      if (this.processing.has(key)) continue;

      this.processing.add(key);

      try {
        const retryData = await this.redis.get(key);
        if (!retryData) continue;

        const retryInfo = JSON.parse(retryData);
        const now = new Date();

        if (new Date(retryInfo.nextRetryAt) <= now) {
          await this.executeRetry(retryInfo);
          await this.redis.del(key);
        }
      } catch (error) {
        errorTracking.captureException(error as Error, {
          component: 'dlq_retry_processor',
          key
        });
      } finally {
        this.processing.delete(key);
      }
    }
  }

  /**
   * Execute retry for failed message
   */
  private async executeRetry(retryInfo: any): Promise<void> {
    try {
      // Get the original failed message
      const messageKey = `dlq:${retryInfo.queue}:${retryInfo.messageId}`;
      const messageData = await this.redis.get(messageKey);

      if (!messageData) return;

      const failedMessage: FailedMessage = JSON.parse(messageData);

      // Publish back to original queue
      await this.redis.lpush(retryInfo.queue, JSON.stringify(failedMessage.message));

      // Update retry count
      failedMessage.retryCount++;
      await this.redis.setex(
        messageKey,
        this.defaultConfig.retentionPeriod * 24 * 60 * 60,
        JSON.stringify(failedMessage)
      );

      // Record successful retry
      incrementCounter(metrics.errorsTotal, {
        error_type: 'retry_successful',
        component: 'dead_letter_queue',
        severity: 'info'
      });

      this.eventEmitter.emit('dlq.retry.successful', {
        queue: retryInfo.queue,
        messageId: retryInfo.messageId,
        retryCount: failedMessage.retryCount
      });

    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'dlq_retry_executor',
        messageId: retryInfo.messageId
      });
    }
  }

  /**
   * Move message to permanent DLQ
   */
  private async moveToPermanentDLQ(failedMessage: FailedMessage): Promise<void> {
    const permanentKey = `dlq:permanent:${failedMessage.queue}:${failedMessage.id}`;

    await this.redis.setex(
      permanentKey,
      this.defaultConfig.retentionPeriod * 24 * 60 * 60,
      JSON.stringify(failedMessage)
    );

    // Remove from regular DLQ
    const regularKey = `dlq:${failedMessage.queue}:${failedMessage.id}`;
    await this.redis.del(regularKey);

    // Emit event
    this.eventEmitter.emit('dlq.message.permanent', {
      queue: failedMessage.queue,
      messageId: failedMessage.id,
      error: failedMessage.error
    });

    errorTracking.captureMessage(
      `Message moved to permanent DLQ: ${failedMessage.queue}`,
      'error',
      {
        queue: failedMessage.queue,
        messageId: failedMessage.id,
        error: failedMessage.error,
        finalRetryCount: failedMessage.retryCount
      }
    );
  }

  /**
   * Check alert threshold for failed messages
   */
  private async checkAlertThreshold(queue: string): Promise<void> {
    const permanentKeys = await this.redis.keys(`dlq:permanent:${queue}:*`);
    const config = this.configs.get(queue) || this.defaultConfig;

    if (permanentKeys.length >= config.alertThreshold) {
      errorTracking.captureMessage(
        `DLQ alert threshold exceeded for queue: ${queue}`,
        'error',
        {
          queue,
          failedMessageCount: permanentKeys.length,
          threshold: config.alertThreshold
        }
      );

      this.eventEmitter.emit('dlq.threshold.exceeded', {
        queue,
        count: permanentKeys.length,
        threshold: config.alertThreshold
      });
    }
  }

  /**
   * Calculate next retry time with exponential backoff and jitter
   */
  private calculateNextRetryTime(retryCount: number, config: DLQConfig): Date {
    // Exponential backoff: baseDelay * (backoffFactor ^ retryCount)
    let delay = config.baseDelay * Math.pow(config.backoffFactor, retryCount);

    // Cap at maxDelay
    delay = Math.min(delay, config.maxDelay);

    // Add jitter if enabled
    if (config.enableJitter) {
      const jitterRange = delay * 0.25; // ±25% jitter
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return new Date(Date.now() + Math.floor(delay));
  }

  /**
   * Schedule retry for failed message
   */
  private async scheduleRetry(failedMessage: FailedMessage, config: DLQConfig): Promise<void> {
    const retryKey = `dlq:${failedMessage.queue}:retry:${failedMessage.id}`;
    const retryInfo = {
      messageId: failedMessage.id,
      queue: failedMessage.queue,
      nextRetryAt: failedMessage.nextRetryAt?.toISOString(),
      retryCount: failedMessage.retryCount
    };

    await this.redis.setex(
      retryKey,
      Math.ceil(config.maxDelay / 1000), // TTL in seconds
      JSON.stringify(retryInfo)
    );
  }

  /**
   * Configure DLQ settings for specific queue
   */
  configureQueue(queue: string, config: Partial<DLQConfig>): void {
    this.configs.set(queue, { ...this.defaultConfig, ...config });
  }

  /**
   * Get DLQ statistics
   */
  async getDLQStats(queue?: string): Promise<any> {
    const stats: any = {
      total: 0,
      byQueue: {},
      permanent: 0,
      retryScheduled: 0
    };

    let pattern = 'dlq:*';
    if (queue) {
      pattern = `dlq:${queue}:*`;
    }

    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (!data) continue;

      const message = JSON.parse(data);

      if (key.includes(':permanent:')) {
        stats.permanent++;
      } else if (key.includes(':retry:')) {
        stats.retryScheduled++;
      } else {
        stats.total++;
      }

      // Group by queue
      const queueName = key.split(':')[1];
      if (!stats.byQueue[queueName]) {
        stats.byQueue[queueName] = { total: 0, permanent: 0, retry: 0 };
      }

      if (key.includes(':permanent:')) {
        stats.byQueue[queueName].permanent++;
      } else if (key.includes(':retry:')) {
        stats.byQueue[queueName].retry++;
      } else {
        stats.byQueue[queueName].total++;
      }
    }

    return stats;
  }

  /**
   * Manually retry failed message
   */
  async retryMessage(queue: string, messageId: string): Promise<boolean> {
    try {
      const key = `dlq:${queue}:${messageId}`;
      const data = await this.redis.get(key);

      if (!data) return false;

      const failedMessage: FailedMessage = JSON.parse(data);

      // Publish back to original queue
      await this.redis.lpush(queue, JSON.stringify(failedMessage.message));

      // Update retry count
      failedMessage.retryCount++;
      await this.redis.setex(
        key,
        this.defaultConfig.retentionPeriod * 24 * 60 * 60,
        JSON.stringify(failedMessage)
      );

      this.eventEmitter.emit('dlq.message.manual_retry', {
        queue,
        messageId,
        newRetryCount: failedMessage.retryCount
      });

      return true;
    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'dlq_manual_retry',
        queue,
        messageId
      });
      return false;
    }
  }

  /**
   * Delete message from DLQ
   */
  async deleteMessage(queue: string, messageId: string): Promise<boolean> {
    try {
      const key = `dlq:${queue}:${messageId}`;
      const deleted = await this.redis.del(key);

      if (deleted > 0) {
        this.eventEmitter.emit('dlq.message.deleted', { queue, messageId });
        return true;
      }

      return false;
    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'dlq_delete',
        queue,
        messageId
      });
      return false;
    }
  }

  /**
   * Initialize DLQ processing
   */
  private initializeDLQProcessing(): void {
    // Process retry queue every 30 seconds
    setInterval(() => {
      this.processRetryQueue().catch(error => {
        errorTracking.captureException(error, {
          component: 'dlq_processor'
        });
      });
    }, 30000);

    // Clean up expired messages daily
    setInterval(() => {
      this.cleanupExpiredMessages().catch(error => {
        errorTracking.captureException(error, {
          component: 'dlq_cleanup'
        });
      });
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Clean up expired messages
   */
  private async cleanupExpiredMessages(): Promise<void> {
    // This is handled automatically by Redis TTL
    // But we can add additional cleanup logic here if needed
    const stats = await this.getDLQStats();
    errorTracking.captureMessage(
      'DLQ cleanup completed',
      'info',
      { stats }
    );
  }

  private generateMessageId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async onModuleDestroy(): Promise<void> {
    // Cleanup on shutdown
    this.processing.clear();
  }
}
