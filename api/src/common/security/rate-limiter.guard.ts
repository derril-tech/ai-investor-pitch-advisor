import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RateLimitingService, rateLimitConfigs, ipRateLimitConfigs, userRateLimitConfigs } from './rate-limiting';

@Injectable()
export class RateLimiterGuard extends ThrottlerGuard {
  constructor(private rateLimitingService: RateLimitingService) {
    super();
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.url;

    // Skip rate limiting for health checks and static assets
    return path.includes('/health') || path.includes('/metrics') || path.includes('/assets');
  }

  protected async getTracker(req: any): Promise<string> {
    // Use combination of IP and user ID for tracking
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.user?.id || 'anonymous';

    return `${ip}:${userId}`;
  }

  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const path = request.route?.path || request.url;

    // Determine rate limit based on endpoint and user type
    if (path.includes('/deck/upload')) {
      return rateLimitConfigs.upload.limit;
    } else if (path.includes('/analysis')) {
      return rateLimitConfigs.analysis.limit;
    } else if (path.includes('/qa')) {
      return rateLimitConfigs.qa.limit;
    } else if (path.includes('/suggestion')) {
      return rateLimitConfigs.suggestions.limit;
    } else if (path.includes('/export')) {
      return rateLimitConfigs.export.limit;
    }

    // Default to general limit
    return rateLimitConfigs.general.limit;
  }

  protected async getTtl(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.url;

    // Determine TTL based on endpoint
    if (path.includes('/deck/upload')) {
      return rateLimitConfigs.upload.ttl;
    } else if (path.includes('/analysis')) {
      return rateLimitConfigs.analysis.ttl;
    } else if (path.includes('/qa')) {
      return rateLimitConfigs.qa.ttl;
    } else if (path.includes('/suggestion')) {
      return rateLimitConfigs.suggestions.ttl;
    } else if (path.includes('/export')) {
      return rateLimitConfigs.export.ttl;
    }

    return rateLimitConfigs.general.ttl;
  }
}
