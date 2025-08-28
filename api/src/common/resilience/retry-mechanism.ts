import { Injectable } from '@nestjs/common';
import { errorTracking } from '../monitoring/error-tracking';
import { metrics, incrementCounter } from '../monitoring/metrics';

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffFactor: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number; // in milliseconds
  monitoringPeriod: number; // in milliseconds
}

@Injectable()
export class RetryMechanismService {
  private readonly defaultRetryOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffFactor: 2,
    jitter: true,
  };

  private circuitBreakers = new Map<string, CircuitBreakerState>();

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    operationName: string = 'unknown_operation'
  ): Promise<T> {
    const config = { ...this.defaultRetryOptions, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        // Check circuit breaker
        if (this.isCircuitOpen(operationName)) {
          throw new Error(`Circuit breaker is open for ${operationName}`);
        }

        const result = await operation();

        // Record success
        this.recordCircuitBreakerSuccess(operationName);

        return result;
      } catch (error) {
        lastError = error as Error;

        // Record failure
        this.recordCircuitBreakerFailure(operationName);

        // Check if we should retry
        if (attempt === config.maxAttempts) {
          break;
        }

        // Check retry condition
        if (config.retryCondition && !config.retryCondition(error as Error)) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config);

        // Record retry metrics
        incrementCounter(metrics.errorsTotal, {
          error_type: 'retry_attempt',
          component: 'retry_mechanism',
          severity: 'info'
        });

        // Log retry attempt
        errorTracking.captureMessage(
          `Retrying operation ${operationName} (attempt ${attempt}/${config.maxAttempts})`,
          'info',
          {
            operation: operationName,
            attempt,
            max_attempts: config.maxAttempts,
            delay,
            error: error.message
          }
        );

        // Wait before retrying
        await this.delay(delay);
      }
    }

    // All retries exhausted
    incrementCounter(metrics.errorsTotal, {
      error_type: 'retry_exhausted',
      component: 'retry_mechanism',
      severity: 'error'
    });

    errorTracking.captureException(lastError, {
      operation: operationName,
      attempts: config.maxAttempts,
      final_error: true
    });

    throw lastError;
  }

  private calculateDelay(attempt: number, config: RetryOptions): number {
    // Exponential backoff: baseDelay * (backoffFactor ^ (attempt - 1))
    let delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);

    // Cap at maxDelay
    delay = Math.min(delay, config.maxDelay);

    // Add jitter if enabled
    if (config.jitter) {
      // Add random jitter of ±25%
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.max(0, Math.floor(delay));
  }

  private isRetryableError(error: Error): boolean {
    // Define which errors are retryable
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EAI_AGAIN',
      'Network Error',
      'Request timeout',
      'Service Unavailable',
      'Internal Server Error',
      'Bad Gateway',
      'Gateway Timeout'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit Breaker Implementation
  private isCircuitOpen(operationName: string): boolean {
    const state = this.circuitBreakers.get(operationName);
    if (!state) return false;

    if (state.status === 'open') {
      // Check if recovery timeout has passed
      if (Date.now() - state.lastFailureTime > state.recoveryTimeout) {
        // Transition to half-open
        state.status = 'half-open';
        state.successCount = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private recordCircuitBreakerSuccess(operationName: string) {
    const state = this.getOrCreateCircuitBreakerState(operationName);

    if (state.status === 'half-open') {
      state.successCount++;
      // If we have enough successes, close the circuit
      if (state.successCount >= 3) { // Require 3 consecutive successes
        state.status = 'closed';
        state.failureCount = 0;
        state.successCount = 0;
      }
    }
  }

  private recordCircuitBreakerFailure(operationName: string) {
    const state = this.getOrCreateCircuitBreakerState(operationName);

    state.failureCount++;
    state.lastFailureTime = Date.now();

    // Check if we should open the circuit
    if (state.status === 'closed' && state.failureCount >= state.failureThreshold) {
      state.status = 'open';
    } else if (state.status === 'half-open') {
      // If we're in half-open and get a failure, go back to open
      state.status = 'open';
      state.successCount = 0;
    }
  }

  private getOrCreateCircuitBreakerState(operationName: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(operationName, {
        status: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        failureThreshold: 5, // 5 failures to open circuit
        recoveryTimeout: 60000, // 1 minute recovery timeout
      });
    }
    return this.circuitBreakers.get(operationName)!;
  }

  // Configure circuit breaker for specific operations
  configureCircuitBreaker(operationName: string, options: Partial<CircuitBreakerOptions>) {
    const state = this.getOrCreateCircuitBreakerState(operationName);

    if (options.failureThreshold) {
      state.failureThreshold = options.failureThreshold;
    }
    if (options.recoveryTimeout) {
      state.recoveryTimeout = options.recoveryTimeout;
    }
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(operationName: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(operationName) || null;
  }

  // Reset circuit breaker
  resetCircuitBreaker(operationName: string) {
    this.circuitBreakers.delete(operationName);
  }
}

interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  failureThreshold: number;
  recoveryTimeout: number;
}

// Decorator for automatic retry
export function Retry(options: Partial<RetryOptions> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const retryService = new RetryMechanismService();

    descriptor.value = async function (...args: any[]) {
      return retryService.executeWithRetry(
        () => method.apply(this, args),
        options,
        `${target.constructor.name}.${propertyName}`
      );
    };
  };
}

// Decorator for circuit breaker
export function CircuitBreaker(options: Partial<CircuitBreakerOptions> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const retryService = new RetryMechanismService();
    const operationName = `${target.constructor.name}.${propertyName}`;

    // Configure circuit breaker
    retryService.configureCircuitBreaker(operationName, options);

    descriptor.value = async function (...args: any[]) {
      return retryService.executeWithRetry(
        () => method.apply(this, args),
        { maxAttempts: 1 }, // Circuit breaker handles retries
        operationName
      );
    };
  };
}

// Utility functions for common retry patterns
export class RetryUtils {
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError: string = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    );

    return Promise.race([promise, timeoutPromise]);
  }

  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: Partial<CircuitBreakerOptions> = {}
  ): Promise<T> {
    const retryService = new RetryMechanismService();
    retryService.configureCircuitBreaker(operationName, options);

    return retryService.executeWithRetry(
      operation,
      { maxAttempts: 1 },
      operationName
    );
  }

  static async withTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 30000,
    retryOptions: Partial<RetryOptions> = {}
  ): Promise<T> {
    const retryService = new RetryMechanismService();
    const config = { ...retryService['defaultRetryOptions'], ...retryOptions };

    return retryService.executeWithRetry(
      () => this.withTimeout(operation(), timeoutMs),
      config,
      'timeout_retry_operation'
    );
  }
}
