/**
 * OpenTelemetry Implementation of InstrumentationProvider
 *
 * Production-ready instrumentation using OpenTelemetry SDK.
 * Supports distributed tracing, context propagation, and metrics.
 */

import type { Tracer } from "@opentelemetry/api";
import {
	context,
	type Context as OTelContext,
	type Span as OTelSpan,
	SpanStatusCode as OTelSpanStatusCode,
	propagation,
	ROOT_CONTEXT,
	trace,
} from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
	type SpanProcessor,
	TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import type {
	Attributes,
	Context,
	ContextCarrier,
	InstrumentationProvider,
	Span,
	SpanOptions,
	SpanStatusCode,
} from "@snapback/contracts";

export interface OTelConfig {
	/** Service name (e.g., 'snapback-api', 'snapback-vscode') */
	serviceName: string;
	/** Service version */
	serviceVersion?: string;
	/** Environment (dev, staging, production) */
	environment?: string;
	/** OTLP collector URL (e.g., 'http://localhost:4318/v1/traces') */
	collectorUrl?: string;
	/** Enable console exporter (for debugging) */
	enableConsole?: boolean;
	/** Sampling rate (0.0 - 1.0) */
	sampleRate?: number;
}

/**
 * OpenTelemetry Span Adapter
 * Wraps OTel span to match our Span interface
 */
class OTelSpanAdapter implements Span {
	constructor(private otelSpan: OTelSpan) {}

	setAttribute(key: string, value: string | number | boolean): void {
		this.otelSpan.setAttribute(key, value);
	}

	setAttributes(attributes: Attributes): void {
		this.otelSpan.setAttributes(attributes);
	}

	addEvent(name: string, attributes?: Attributes): void {
		this.otelSpan.addEvent(name, attributes);
	}

	setStatus(status: { code: SpanStatusCode; message?: string }): void {
		this.otelSpan.setStatus({
			code: status.code,
			message: status.message,
		});
	}

	recordException(error: Error): void {
		this.otelSpan.recordException(error);
	}

	end(): void {
		this.otelSpan.end();
	}

	isRecording(): boolean {
		return this.otelSpan.isRecording();
	}
}

/**
 * OpenTelemetry Instrumentation Provider
 */
export class OTelInstrumentationProvider implements InstrumentationProvider {
	private tracer: Tracer;
	private provider: NodeTracerProvider;

	constructor(config: OTelConfig) {
		// Create resource with service metadata
		const resource = resourceFromAttributes({
			[ATTR_SERVICE_NAME]: config.serviceName,
			[ATTR_SERVICE_VERSION]: config.serviceVersion || "unknown",
			"deployment.environment": config.environment || "development",
			"service.instance.id": process.pid.toString(),
			"host.name": process.env.HOSTNAME || "unknown",
			"process.pid": process.pid,
		});

		// Build span processors array (SDK 2.0 uses constructor option instead of addSpanProcessor)
		const spanProcessors: SpanProcessor[] = [];

		if (config.collectorUrl) {
			// OTLP exporter for Jaeger/Grafana
			const otlpExporter = new OTLPTraceExporter({
				url: config.collectorUrl,
			});
			spanProcessors.push(new BatchSpanProcessor(otlpExporter));
		}

		if (config.enableConsole) {
			// Console exporter for debugging
			const consoleExporter = new ConsoleSpanExporter();
			spanProcessors.push(new BatchSpanProcessor(consoleExporter));
		}

		// Initialize tracer provider with optional sampling
		const samplingRate = config.sampleRate ?? 1.0;
		const sampler = new TraceIdRatioBasedSampler(samplingRate);

		this.provider = new NodeTracerProvider({
			resource,
			sampler,
			spanProcessors,
		});

		// Register provider globally
		this.provider.register();

		// Get tracer instance
		this.tracer = trace.getTracer(config.serviceName, config.serviceVersion);
	}

	startSpan(name: string, options?: SpanOptions): Span {
		const otelSpan = this.tracer.startSpan(name, {
			kind: options?.kind,
			attributes: options?.attributes,
			startTime: options?.startTime,
		});
		return new OTelSpanAdapter(otelSpan);
	}

	async withSpan<T>(name: string, fn: (span: Span) => Promise<T>, options?: SpanOptions): Promise<T> {
		// Use parent context if provided, otherwise use active context
		const parentCtx = options?.parent ? (options.parent as OTelContext) : context.active();

		return await this.tracer.startActiveSpan(
			name,
			{
				kind: options?.kind,
				attributes: options?.attributes,
				startTime: options?.startTime,
			},
			parentCtx, // Pass parent context here
			async (otelSpan) => {
				const span = new OTelSpanAdapter(otelSpan);
				try {
					const result = await fn(span);
					otelSpan.setStatus({ code: OTelSpanStatusCode.OK });
					return result;
				} catch (error) {
					otelSpan.recordException(error as Error);
					otelSpan.setStatus({
						code: OTelSpanStatusCode.ERROR,
						message: error instanceof Error ? error.message : String(error),
					});
					throw error;
				} finally {
					otelSpan.end();
				}
			},
		);
	}

	injectContext(carrier: ContextCarrier): void {
		// Inject current context into carrier (HTTP headers)
		propagation.inject(context.active(), carrier);
	}

	extractContext(carrier: ContextCarrier): Context | null {
		// Extract context from carrier using ROOT_CONTEXT as base to avoid pollution
		const extractedContext = propagation.extract(ROOT_CONTEXT, carrier);

		// Check if context has trace information
		const span = trace.getSpan(extractedContext);
		if (span?.spanContext().traceId) {
			return extractedContext as unknown as Context;
		}

		return null;
	}

	recordMetric(_name: string, _value: number, _attributes?: Attributes): void {
		// TODO: Implement metrics when needed
		// For now, focus on tracing only
	}

	recordEvent(_name: string, _attributes?: Attributes): void {
		// TODO: Implement standalone events if needed
		// Most events should be added to active span via span.addEvent()
	}

	async shutdown(): Promise<void> {
		await this.provider.shutdown();
	}
}
