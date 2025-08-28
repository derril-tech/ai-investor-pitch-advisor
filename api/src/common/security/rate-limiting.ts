import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

@Injectable()
export class RateLimitingService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;

    // Use Redis sorted set to track requests
    const score = now;
    await this.redis.zadd(windowKey, score, `${now}-${Math.random()}`);

    // Count requests in current window
    const requestCount = await this.redis.zcount(windowKey, now - windowMs, now);

    // Set expiration on the window key
    await this.redis.expire(windowKey, Math.ceil(windowMs / 1000) * 2);

    const allowed = requestCount <= limit;
    const remaining = Math.max(0, limit - requestCount);
    const resetTime = Math.floor(now / windowMs) * windowMs + windowMs;

    return { allowed, remaining, resetTime };
  }

  async getRateLimitStatus(
    key: string,
    windowMs: number
  ): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;

    const count = await this.redis.zcount(windowKey, now - windowMs, now);
    const resetTime = Math.floor(now / windowMs) * windowMs + windowMs;

    return { count, resetTime };
  }
}

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip rate limiting for health checks
    const request = context.switchToHttp().getRequest();
    return request.url.includes('/health');
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}

// Rate limiting configurations
export const rateLimitConfigs = {
  // General API limits
  general: {
    ttl: 60 * 1000, // 1 minute
    limit: 100, // 100 requests per minute
  },

  // Authentication endpoints
  auth: {
    ttl: 60 * 1000, // 1 minute
    limit: 5, // 5 login attempts per minute
  },

  // File upload endpoints
  upload: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 10, // 10 uploads per hour
  },

  // Analysis endpoints
  analysis: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 20, // 20 analyses per hour
  },

  // Q&A generation
  qa: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 15, // 15 Q&A generations per hour
  },

  // Suggestions
  suggestions: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 25, // 25 suggestion runs per hour
  },

  // Export generation
  export: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 30, // 30 exports per hour
  },
};

// IP-based rate limiting
export const ipRateLimitConfigs = {
  // Stricter limits for unauthenticated requests
  unauthenticated: {
    ttl: 60 * 1000, // 1 minute
    limit: 30, // 30 requests per minute
  },

  // More lenient for authenticated users
  authenticated: {
    ttl: 60 * 1000, // 1 minute
    limit: 200, // 200 requests per minute
  },
};

// User-based rate limiting (per user ID)
export const userRateLimitConfigs = {
  free: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 50, // 50 requests per hour
  },

  premium: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 500, // 500 requests per hour
  },

  enterprise: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 2000, // 2000 requests per hour
  },
};
