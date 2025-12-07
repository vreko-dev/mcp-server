/**
 * InstrumentationProvider Interface
 *
 * Core abstraction for distributed tracing and observability.
 * Enables vendor-neutral instrumentation across SnapBack services.
 *
 * @example
 * ```typescript
 * const provider = new OTelInstrumentationProvider({
 *   serviceName: 'snapback-api',
 *   collectorUrl: 'http://localhost:4318',
 * });
 *
 * await provider.withSpan('create_snapshot', async (span) => {
 *   span.setAttribute('snapshot.id', id);
 *   const result = await createSnapshot(files);
 *   return result;
 * });
 * ```
 */

import type { Attributes, Context, ContextCarrier, SpanOptions, SpanStatus } from "./types";

/**
 * Span interface for recording operation telemetry
 */
export interface Span {
	/**
	 * Set a single attribute on the span
	 * @param key - Attribute name (use SemanticConventions for standard attributes)
	 * @param value - Attribute value
	 */
	setAttribute(key: string, value: string | number | boolean): void;

	/**
	 * Set multiple attributes at once
	 * @param attributes - Key-value pairs to set
	 */
	setAttributes(attributes: Attributes): void;

	/**
	 * Add an event to the span timeline
	 * @param name - Event name (e.g., 'validation.start', 'cache.hit')
	 * @param attributes - Optional event attributes
	 */
	addEvent(name: string, attributes?: Attributes): void;

	/**
	 * Set the span status
	 * @param status - Status object with code and optional message
	 */
	setStatus(status: SpanStatus): void;

	/**
	 * Record an exception on the span
	 * @param error - Error object to record
	 */
	recordException(error: Error): void;

	/**
	 * End the span (MUST be called to export telemetry)
	 */
	end(): void;

	/**
	 * Check if span is recording (for performance optimization)
	 */
	isRecording(): boolean;
}

/**
 * Instrumentation provider interface
 *
 * Implementations: OTelInstrumentationProvider, DatadogProvider, MockProvider
 */
export interface InstrumentationProvider {
	/**
	 * Start a new span
	 * @param name - Span name (e.g., 'HTTP POST /snapshots', 'db.query')
	 * @param options - Span configuration
	 * @returns Span instance (caller MUST call span.end())
	 */
	startSpan(name: string, options?: SpanOptions): Span;

	/**
	 * Execute a function within a span (auto-manages span lifecycle)
	 * @param name - Span name
	 * @param fn - Function to execute
	 * @returns Function result
	 *
	 * @example
	 * ```typescript
	 * const result = await provider.withSpan('calculate_checksum', async (span) => {
	 *   span.setAttribute('file.size', fileSize);
	 *   const checksum = await computeChecksum(file);
	 *   span.addEvent('checksum.complete');
	 *   return checksum;
	 * });
	 * ```
	 */
	withSpan<T>(name: string, fn: (span: Span) => Promise<T>, options?: SpanOptions): Promise<T>;

	/**
	 * Inject context into carrier (for HTTP headers, message metadata)
	 * @param carrier - Target carrier (e.g., HTTP headers object)
	 *
	 * @example
	 * ```typescript
	 * const headers: Record<string, string> = {};
	 * provider.injectContext(headers);
	 * // headers now contains: { traceparent: '00-...', tracestate: '...' }
	 * fetch(url, { headers });
	 * ```
	 */
	injectContext(carrier: ContextCarrier): void;

	/**
	 * Extract context from carrier (from HTTP headers, message metadata)
	 * @param carrier - Source carrier
	 * @returns Extracted context or null if not found
	 *
	 * @example
	 * ```typescript
	 * // Hono middleware
	 * const context = provider.extractContext(c.req.raw.headers);
	 * if (context) {
	 *   // Continue trace from upstream
	 * }
	 * ```
	 */
	extractContext(carrier: ContextCarrier): Context | null;

	/**
	 * Record a metric value
	 * @param name - Metric name (e.g., 'snapshots.created', 'api.latency')
	 * @param value - Numeric value
	 * @param attributes - Optional attributes for metric dimensions
	 */
	recordMetric(name: string, value: number, attributes?: Attributes): void;

	/**
	 * Record an event without creating a span
	 * @param name - Event name
	 * @param attributes - Event attributes
	 */
	recordEvent(name: string, attributes?: Attributes): void;

	/**
	 * Flush pending telemetry and shutdown provider
	 * Call before process exit to ensure data export
	 */
	shutdown(): Promise<void>;
}

/**
 * No-op implementation for testing or disabled instrumentation
 */
export class NoOpInstrumentationProvider implements InstrumentationProvider {
	private static noopSpan: Span = {
		setAttribute: () => {},
		setAttributes: () => {},
		addEvent: () => {},
		setStatus: () => {},
		recordException: () => {},
		end: () => {},
		isRecording: () => false,
	};

	startSpan(_name: string, _options?: SpanOptions): Span {
		return NoOpInstrumentationProvider.noopSpan;
	}

	async withSpan<T>(_name: string, fn: (span: Span) => Promise<T>, _options?: SpanOptions): Promise<T> {
		return await fn(NoOpInstrumentationProvider.noopSpan);
	}

	injectContext(_carrier: ContextCarrier): void {
		// No-op
	}

	extractContext(_carrier: ContextCarrier): Context | null {
		return null;
	}

	recordMetric(_name: string, _value: number, _attributes?: Attributes): void {
		// No-op
	}

	recordEvent(_name: string, _attributes?: Attributes): void {
		// No-op
	}

	async shutdown(): Promise<void> {
		// No-op
	}
}
