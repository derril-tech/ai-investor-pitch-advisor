import { Injectable } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthIndicatorResult } from '@nestjs/terminus';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../cache/redis.service';
import { NatsService } from '../messaging/nats.service';
import { S3Service } from '../storage/s3.service';
import { OpenAIService } from '../ai/openai.service';

@Injectable()
export class HealthCheckService {
  constructor(
    private health: HealthCheckService,
    private databaseService: DatabaseService,
    private redisService: RedisService,
    private natsService: NatsService,
    private s3Service: S3Service,
    private openAIService: OpenAIService,
  ) {}

  @HealthCheck()
  async check() {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkRedis(),
      () => this.checkNATS(),
      () => this.checkS3(),
      () => this.checkOpenAI(),
      () => this.checkMemoryUsage(),
      () => this.checkDiskSpace(),
      () => this.checkResponseTime(),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();

      // Simple database query to test connection
      await this.databaseService.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      return {
        database: {
          status: 'up',
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        database: {
          status: 'down',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();

      // Test Redis connection with ping
      await this.redisService.ping();

      const responseTime = Date.now() - startTime;

      return {
        redis: {
          status: 'up',
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        redis: {
          status: 'down',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async checkNATS(): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();

      // Test NATS connection
      const isConnected = await this.natsService.isConnected();

      const responseTime = Date.now() - startTime;

      return {
        nats: {
          status: isConnected ? 'up' : 'down',
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        nats: {
          status: 'down',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async checkS3(): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();

      // Test S3 connection by listing objects (with limit)
      await this.s3Service.listObjects('', 1);

      const responseTime = Date.now() - startTime;

      return {
        s3: {
          status: 'up',
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        s3: {
          status: 'down',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async checkOpenAI(): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();

      // Test OpenAI connection with a simple request
      await this.openAIService.testConnection();

      const responseTime = Date.now() - startTime;

      return {
        openai: {
          status: 'up',
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        openai: {
          status: 'down',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private checkMemoryUsage(): HealthIndicatorResult {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);

    // Consider unhealthy if heap usage > 90%
    const heapUsageRatio = heapUsedMB / heapTotalMB;
    const status = heapUsageRatio > 0.9 ? 'down' : 'up';

    return {
      memory: {
        status,
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        external: `${externalMB}MB`,
        usage: `${Math.round(heapUsageRatio * 100)}%`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private checkDiskSpace(): HealthIndicatorResult {
    // This would typically check disk usage
    // For now, return a placeholder
    return {
      disk: {
        status: 'up',
        available: 'N/A',
        total: 'N/A',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async checkResponseTime(): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    // Simulate a simple operation
    await new Promise(resolve => setTimeout(resolve, 10));

    const responseTime = Date.now() - startTime;
    const status = responseTime > 1000 ? 'down' : 'up'; // Unhealthy if > 1s

    return {
      response_time: {
        status,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Additional health check endpoints
  async getDetailedHealth() {
    const basicHealth = await this.check();

    // Add more detailed metrics
    const detailedHealth = {
      ...basicHealth,
      details: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        pid: process.pid,
        platform: process.platform,
      },
      timestamp: new Date().toISOString(),
    };

    return detailedHealth;
  }

  async getReadiness() {
    // Readiness check - can the service accept traffic?
    try {
      await this.databaseService.query('SELECT 1');
      await this.redisService.ping();

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not ready',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getLiveness() {
    // Liveness check - is the service running properly?
    const memUsage = process.memoryUsage();
    const heapUsageRatio = memUsage.heapUsed / memUsage.heapTotal;

    if (heapUsageRatio > 0.95) {
      return {
        status: 'unhealthy',
        reason: 'High memory usage',
        heapUsage: `${Math.round(heapUsageRatio * 100)}%`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
