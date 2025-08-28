import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { metrics, incrementCounter } from '../monitoring/metrics';
import { errorTracking } from '../monitoring/error-tracking';

export interface EmbeddingCacheEntry {
  key: string;
  embedding: number[];
  metadata: {
    model: string;
    textHash: string;
    dimensions: number;
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    ttl: number;
  };
}

export interface CacheConfig {
  defaultTtl: number; // in seconds
  maxMemoryUsage: number; // in MB
  evictionPolicy: 'lru' | 'lfu' | 'random';
  compressionEnabled: boolean;
  clusterMode: boolean;
}

@Injectable()
export class EmbeddingCacheService {
  private readonly defaultConfig: CacheConfig = {
    defaultTtl: 7 * 24 * 60 * 60, // 7 days
    maxMemoryUsage: 1024, // 1GB
    evictionPolicy: 'lru',
    compressionEnabled: true,
    clusterMode: false
  };

  private config: CacheConfig;

  constructor(@InjectRedis() private readonly redis: Redis) {
    this.config = { ...this.defaultConfig };
    this.initializeCacheMonitoring();
  }

  /**
   * Store embedding in cache
   */
  async setEmbedding(
    key: string,
    embedding: number[],
    metadata: Partial<EmbeddingCacheEntry['metadata']> = {},
    ttl?: number
  ): Promise<void> {
    try {
      const cacheEntry: EmbeddingCacheEntry = {
        key,
        embedding,
        metadata: {
          model: metadata.model || 'unknown',
          textHash: this.hashText(key),
          dimensions: embedding.length,
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          ttl: ttl || this.config.defaultTtl,
          ...metadata
        }
      };

      const serializedEntry = JSON.stringify(cacheEntry);
      const finalTtl = ttl || this.config.defaultTtl;

      // Store in Redis with TTL
      await this.redis.setex(
        `embedding:${key}`,
        finalTtl,
        serializedEntry
      );

      // Update cache statistics
      await this.updateCacheStats('set', embedding.length);

      // Record metrics
      incrementCounter(metrics.cacheMisses, { cache_type: 'embedding' });

    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'embedding_cache_set',
        key
      });
    }
  }

  /**
   * Retrieve embedding from cache
   */
  async getEmbedding(key: string): Promise<number[] | null> {
    try {
      const cachedData = await this.redis.get(`embedding:${key}`);

      if (!cachedData) {
        incrementCounter(metrics.cacheMisses, { cache_type: 'embedding' });
        return null;
      }

      const cacheEntry: EmbeddingCacheEntry = JSON.parse(cachedData);

      // Update access statistics
      cacheEntry.metadata.lastAccessed = new Date();
      cacheEntry.metadata.accessCount++;

      // Update cache entry with new stats
      await this.redis.setex(
        `embedding:${key}`,
        cacheEntry.metadata.ttl,
        JSON.stringify(cacheEntry)
      );

      // Update cache statistics
      await this.updateCacheStats('get', cacheEntry.embedding.length);

      // Record metrics
      incrementCounter(metrics.cacheHits, { cache_type: 'embedding' });

      return cacheEntry.embedding;

    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'embedding_cache_get',
        key
      });
      return null;
    }
  }

  /**
   * Check if embedding exists in cache
   */
  async hasEmbedding(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(`embedding:${key}`);
      return exists === 1;
    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'embedding_cache_exists',
        key
      });
      return false;
    }
  }

  /**
   * Delete embedding from cache
   */
  async deleteEmbedding(key: string): Promise<boolean> {
    try {
      const deleted = await this.redis.del(`embedding:${key}`);

      if (deleted > 0) {
        await this.updateCacheStats('delete', 0);
        return true;
      }

      return false;
    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'embedding_cache_delete',
        key
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const keys = await this.redis.keys('embedding:*');
      const totalKeys = keys.length;

      let totalSize = 0;
      let totalAccessCount = 0;
      let oldestEntry = new Date();
      let newestEntry = new Date(0);

      for (const key of keys.slice(0, 100)) { // Sample first 100 keys for performance
        const data = await this.redis.get(key);
        if (data) {
          const entry: EmbeddingCacheEntry = JSON.parse(data);
          totalSize += JSON.stringify(entry.embedding).length;
          totalAccessCount += entry.metadata.accessCount;

          if (entry.metadata.createdAt < oldestEntry) {
            oldestEntry = entry.metadata.createdAt;
          }
          if (entry.metadata.createdAt > newestEntry) {
            newestEntry = entry.metadata.createdAt;
          }
        }
      }

      const memoryInfo = await this.redis.info('memory');
      const usedMemory = parseInt(memoryInfo.match(/used_memory:(\d+)/)?.[1] || '0');

      return {
        totalEntries: totalKeys,
        estimatedSizeBytes: totalSize * (totalKeys / Math.min(100, totalKeys)),
        averageAccessCount: totalAccessCount / Math.max(1, Math.min(100, totalKeys)),
        oldestEntry: oldestEntry.toISOString(),
        newestEntry: newestEntry.toISOString(),
        redisMemoryUsage: usedMemory,
        hitRate: await this.calculateHitRate()
      };
    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'cache_stats'
      });
      return { error: 'Failed to get cache statistics' };
    }
  }

  /**
   * Batch operations for multiple embeddings
   */
  async batchGetEmbeddings(keys: string[]): Promise<Map<string, number[]>> {
    try {
      const pipeline = this.redis.pipeline();

      keys.forEach(key => {
        pipeline.get(`embedding:${key}`);
      });

      const results = await pipeline.exec();
      const embeddingMap = new Map<string, number[]>();

      keys.forEach((key, index) => {
        const result = results?.[index];
        if (result && result[1]) {
          const cacheEntry: EmbeddingCacheEntry = JSON.parse(result[1]);
          embeddingMap.set(key, cacheEntry.embedding);
        }
      });

      return embeddingMap;
    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'batch_get_embeddings',
        keyCount: keys.length
      });
      return new Map();
    }
  }

  async batchSetEmbeddings(
    entries: Array<{ key: string; embedding: number[]; ttl?: number }>
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      entries.forEach(({ key, embedding, ttl }) => {
        const cacheEntry: EmbeddingCacheEntry = {
          key,
          embedding,
          metadata: {
            model: 'batch',
            textHash: this.hashText(key),
            dimensions: embedding.length,
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            ttl: ttl || this.config.defaultTtl
          }
        };

        pipeline.setex(
          `embedding:${key}`,
          cacheEntry.metadata.ttl,
          JSON.stringify(cacheEntry)
        );
      });

      await pipeline.exec();

      // Update cache statistics
      const totalDimensions = entries.reduce((sum, entry) => sum + entry.embedding.length, 0);
      await this.updateCacheStats('batch_set', totalDimensions);

    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'batch_set_embeddings',
        entryCount: entries.length
      });
    }
  }

  /**
   * Cache warming for frequently used embeddings
   */
  async warmCache(frequentKeys: string[]): Promise<void> {
    try {
      const existingKeys = [];
      const pipeline = this.redis.pipeline();

      frequentKeys.forEach(key => {
        pipeline.exists(`embedding:${key}`);
      });

      const results = await pipeline.exec();

      results?.forEach((result, index) => {
        if (result && result[1] === 1) {
          existingKeys.push(frequentKeys[index]);
        }
      });

      // Extend TTL for existing frequently used keys
      const extendPipeline = this.redis.pipeline();
      existingKeys.forEach(key => {
        extendPipeline.expire(`embedding:${key}`, this.config.defaultTtl * 2);
      });

      await extendPipeline.exec();

      errorTracking.captureMessage(
        `Cache warmed for ${existingKeys.length} frequent keys`,
        'info',
        {
          totalRequested: frequentKeys.length,
          existingKeys: existingKeys.length
        }
      );

    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'cache_warming'
      });
    }
  }

  /**
   * Cache invalidation patterns
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(`embedding:*${pattern}*`);
      if (keys.length === 0) return 0;

      const deleted = await this.redis.del(...keys);

      await this.updateCacheStats('invalidate', 0);

      errorTracking.captureMessage(
        `Invalidated ${deleted} cache entries matching pattern: ${pattern}`,
        'info',
        { pattern, deleted }
      );

      return deleted;
    } catch (error) {
      errorTracking.captureException(error as Error, {
        component: 'cache_invalidation',
        pattern
      });
      return 0;
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<any> {
    try {
      // Test basic Redis connectivity
      await this.redis.ping();

      // Test embedding operations
      const testKey = `health_check_${Date.now()}`;
      const testEmbedding = [0.1, 0.2, 0.3];

      await this.setEmbedding(testKey, testEmbedding, {}, 60);
      const retrieved = await this.getEmbedding(testKey);
      await this.deleteEmbedding(testKey);

      const isWorking = retrieved && retrieved.length === testEmbedding.length;

      return {
        status: isWorking ? 'healthy' : 'unhealthy',
        redisConnected: true,
        operationsWorking: isWorking,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private helper methods
  private hashText(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private async updateCacheStats(operation: string, dataSize: number): Promise<void> {
    try {
      const statsKey = 'embedding_cache:stats';
      const stats = await this.redis.hgetall(statsKey) || {};

      // Update operation counts
      const opKey = `${operation}_count`;
      stats[opKey] = (parseInt(stats[opKey] || '0') + 1).toString();

      // Update data size
      if (dataSize > 0) {
        stats.total_data_size = (parseInt(stats.total_data_size || '0') + dataSize).toString();
      }

      // Update last operation timestamp
      stats.last_operation = Date.now().toString();

      await this.redis.hmset(statsKey, stats);
      await this.redis.expire(statsKey, 30 * 24 * 60 * 60); // 30 days
    } catch (error) {
      // Don't fail the main operation due to stats update failure
      console.error('Failed to update cache stats:', error);
    }
  }

  private async calculateHitRate(): Promise<number> {
    try {
      const stats = await this.redis.hgetall('embedding_cache:stats') || {};
      const hits = parseInt(stats.get_count || '0');
      const misses = parseInt(stats.miss_count || '0');

      if (hits + misses === 0) return 0;
      return hits / (hits + misses);
    } catch (error) {
      return 0;
    }
  }

  private initializeCacheMonitoring(): void {
    // Periodic cache cleanup and monitoring
    setInterval(async () => {
      try {
        const stats = await this.getCacheStats();

        // Log cache statistics
        errorTracking.captureMessage(
          'Embedding cache statistics',
          'info',
          {
            totalEntries: stats.totalEntries,
            estimatedSizeMB: Math.round(stats.estimatedSizeBytes / 1024 / 1024),
            hitRate: Math.round(stats.hitRate * 100)
          }
        );

        // Check memory usage
        if (stats.redisMemoryUsage > this.config.maxMemoryUsage * 1024 * 1024) {
          errorTracking.captureMessage(
            'Embedding cache memory usage high',
            'warning',
            {
              usedMB: Math.round(stats.redisMemoryUsage / 1024 / 1024),
              limitMB: this.config.maxMemoryUsage
            }
          );
        }
      } catch (error) {
        errorTracking.captureException(error as Error, {
          component: 'cache_monitoring'
        });
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }
}
