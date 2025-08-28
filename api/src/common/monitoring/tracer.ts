import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace } from '@opentelemetry/api';

export class TracerService {
  private tracerProvider: NodeTracerProvider;
  private tracer: any;

  constructor() {
    this.initializeTracer();
  }

  private initializeTracer() {
    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'pitch-advisor-api',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'local',
    });

    // Create Jaeger exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });

    // Create tracer provider
    this.tracerProvider = new NodeTracerProvider({ resource });

    // Add span processor
    this.tracerProvider.addSpanProcessor(new SimpleSpanProcessor(jaegerExporter));

    // Register as global tracer provider
    this.tracerProvider.register();

    // Get tracer
    this.tracer = trace.getTracer('pitch-advisor-api', '1.0.0');
  }

  startSpan(name: string, attributes?: Record<string, string | number | boolean>) {
    const span = this.tracer.startSpan(name);
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }
    return span;
  }

  startActiveSpan(name: string, fn: (span: any) => Promise<any>, attributes?: Record<string, string | number | boolean>) {
    return this.tracer.startActiveSpan(name, async (span: any) => {
      try {
        if (attributes) {
          Object.entries(attributes).forEach(([key, value]) => {
            span.setAttribute(key, value);
          });
        }

        const result = await fn(span);
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    });
  }

  getTracer() {
    return this.tracer;
  }

  shutdown() {
    return this.tracerProvider.shutdown();
  }
}

// Global tracer instance
export const tracer = new TracerService();
