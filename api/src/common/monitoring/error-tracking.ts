import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export class ErrorTrackingService {
  constructor() {
    this.initializeSentry();
  }

  private initializeSentry() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version,
        integrations: [
          new ProfilingIntegration(),
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Console(),
          new Sentry.Integrations.OnUncaughtException(),
          new Sentry.Integrations.OnUnhandledRejection(),
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend: (event) => {
          // Filter out sensitive information
          return this.filterSensitiveData(event);
        },
        beforeSendTransaction: (event) => {
          // Add custom transaction tags
          return this.enhanceTransaction(event);
        },
      });

      console.log('✅ Sentry error tracking initialized');
    } else {
      console.log('⚠️  Sentry DSN not configured, error tracking disabled');
    }
  }

  captureException(error: Error, context?: Record<string, any>) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      // Set error level based on error type
      if (error.name === 'ValidationError') {
        scope.setLevel('warning');
      } else if (error.name === 'DatabaseError') {
        scope.setLevel('error');
        scope.setTag('component', 'database');
      } else if (error.message.includes('OpenAI')) {
        scope.setTag('component', 'openai');
      } else if (error.message.includes('S3') || error.message.includes('storage')) {
        scope.setTag('component', 'storage');
      }

      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
    Sentry.withScope((scope) => {
      scope.setLevel(level);

      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      Sentry.captureMessage(message);
    });
  }

  setUser(user: { id: string; email?: string; type?: string }) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      segment: user.type || 'user',
    });
  }

  setTags(tags: Record<string, string>) {
    Sentry.setTags(tags);
  }

  setContext(key: string, context: Record<string, any>) {
    Sentry.setContext(key, context);
  }

  startTransaction(name: string, op: string) {
    return Sentry.startTransaction({
      name,
      op,
    });
  }

  private filterSensitiveData(event: Sentry.Event): Sentry.Event | null {
    // Remove sensitive information from event
    if (event.request?.headers) {
      const headers = { ...event.request.headers };

      // Remove authorization headers
      delete headers.authorization;
      delete headers['x-api-key'];

      // Remove cookies
      delete headers.cookie;

      event.request.headers = headers;
    }

    // Filter sensitive data from extra/context
    if (event.extra) {
      const extra = { ...event.extra };

      // Remove API keys, passwords, tokens
      Object.keys(extra).forEach(key => {
        if (key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('key')) {
          extra[key] = '[FILTERED]';
        }
      });

      event.extra = extra;
    }

    return event;
  }

  private enhanceTransaction(event: Sentry.Event): Sentry.Event {
    // Add custom tags and context to transactions
    if (!event.tags) event.tags = {};

    // Add environment and version info
    event.tags.environment = process.env.NODE_ENV || 'development';
    event.tags.version = process.env.npm_package_version || 'unknown';

    // Add host information
    event.tags.host = process.env.HOSTNAME || 'unknown';

    return event;
  }

  async flush(timeout: number = 2000): Promise<boolean> {
    return await Sentry.flush(timeout);
  }

  async close(timeout: number = 2000): Promise<boolean> {
    return await Sentry.close(timeout);
  }
}

// Global error tracking instance
export const errorTracking = new ErrorTrackingService();

// Global error handlers
process.on('uncaughtException', (error) => {
  errorTracking.captureException(error, { type: 'uncaught_exception' });
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  errorTracking.captureException(error, {
    type: 'unhandled_rejection',
    promise: promise.toString()
  });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
