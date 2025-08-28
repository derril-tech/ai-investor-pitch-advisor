import { register, collectDefaultMetrics, Gauge, Counter, Histogram, Summary } from 'prom-client';

collectDefaultMetrics();

// Business Metrics
export const metrics = {
  // HTTP Request Metrics
  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'user_type']
  }),

  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  }),

  activeConnections: new Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
  }),

  // Business Logic Metrics
  decksProcessed: new Counter({
    name: 'decks_processed_total',
    help: 'Total number of decks processed',
    labelNames: ['status', 'processing_time']
  }),

  analysesCompleted: new Counter({
    name: 'analyses_completed_total',
    help: 'Total number of analyses completed',
    labelNames: ['result_type']
  }),

  qaSessionsCreated: new Counter({
    name: 'qa_sessions_created_total',
    help: 'Total number of Q&A sessions created',
    labelNames: ['session_type']
  }),

  suggestionsGenerated: new Counter({
    name: 'suggestions_generated_total',
    help: 'Total number of suggestions generated',
    labelNames: ['suggestion_type', 'confidence_level']
  }),

  exportsGenerated: new Counter({
    name: 'exports_generated_total',
    help: 'Total number of exports generated',
    labelNames: ['format', 'export_type']
  }),

  // Performance Metrics
  deckProcessingDuration: new Histogram({
    name: 'deck_processing_duration_seconds',
    help: 'Time taken to process a deck',
    labelNames: ['deck_size'],
    buckets: [1, 5, 10, 30, 60, 120, 300]
  }),

  analysisDuration: new Histogram({
    name: 'analysis_duration_seconds',
    help: 'Time taken to complete analysis',
    labelNames: ['analysis_type'],
    buckets: [5, 10, 30, 60, 120, 300]
  }),

  qaGenerationDuration: new Histogram({
    name: 'qa_generation_duration_seconds',
    help: 'Time taken to generate Q&A',
    labelNames: ['question_count', 'stage', 'sector'],
    buckets: [5, 10, 30, 60, 120, 300]
  }),

  // System Health Metrics
  databaseConnectionPoolSize: new Gauge({
    name: 'database_connection_pool_size',
    help: 'Current database connection pool size'
  }),

  redisConnectionStatus: new Gauge({
    name: 'redis_connection_status',
    help: 'Redis connection status (1=connected, 0=disconnected)'
  }),

  workerQueueSize: new Gauge({
    name: 'worker_queue_size',
    help: 'Current worker queue size',
    labelNames: ['worker_type']
  }),

  memoryUsage: new Gauge({
    name: 'memory_usage_bytes',
    help: 'Current memory usage in bytes',
    labelNames: ['type'] // heap, external, rss
  }),

  // Error Metrics
  errorsTotal: new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['error_type', 'component', 'severity']
  }),

  validationErrors: new Counter({
    name: 'validation_errors_total',
    help: 'Total number of validation errors',
    labelNames: ['field', 'endpoint']
  }),

  // Cache Metrics
  cacheHits: new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type']
  }),

  cacheMisses: new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type']
  }),

  cacheHitRatio: new Gauge({
    name: 'cache_hit_ratio',
    help: 'Cache hit ratio (0-1)',
    labelNames: ['cache_type']
  }),

  // External Service Metrics
  openaiRequests: new Counter({
    name: 'openai_requests_total',
    help: 'Total number of OpenAI API requests',
    labelNames: ['endpoint', 'status']
  }),

  openaiRequestDuration: new Histogram({
    name: 'openai_request_duration_seconds',
    help: 'Duration of OpenAI API requests',
    labelNames: ['endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  }),

  s3Operations: new Counter({
    name: 's3_operations_total',
    help: 'Total number of S3 operations',
    labelNames: ['operation', 'status']
  }),

  // User Experience Metrics
  userSessionDuration: new Histogram({
    name: 'user_session_duration_seconds',
    help: 'Duration of user sessions',
    buckets: [60, 300, 900, 1800, 3600, 7200]
  }),

  featureUsage: new Counter({
    name: 'feature_usage_total',
    help: 'Total usage of specific features',
    labelNames: ['feature_name', 'user_type']
  }),

  // SLO Metrics (Service Level Objectives)
  sloHttpRequestDuration: new Histogram({
    name: 'slo_http_request_duration_seconds',
    help: 'HTTP request duration for SLO measurement',
    labelNames: ['route', 'method'],
    buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  }),

  sloErrorRate: new Counter({
    name: 'slo_error_rate_total',
    help: 'Error rate for SLO measurement',
    labelNames: ['route', 'method', 'status_code']
  })
};

// Utility functions
export function incrementCounter(counter: Counter, labels?: Record<string, string | number>) {
  if (labels) {
    counter.inc(labels);
  } else {
    counter.inc();
  }
}

export function observeHistogram(histogram: Histogram, value: number, labels?: Record<string, string | number>) {
  if (labels) {
    histogram.observe(labels, value);
  } else {
    histogram.observe(value);
  }
}

export function setGauge(gauge: Gauge, value: number, labels?: Record<string, string | number>) {
  if (labels) {
    gauge.set(labels, value);
  } else {
    gauge.set(value);
  }
}

// Middleware for automatic metrics collection
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;

      // Record HTTP metrics
      metrics.httpRequestsTotal
        .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
        .inc();

      metrics.httpRequestDuration
        .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
        .observe(duration);
    });

    next();
  };
}
