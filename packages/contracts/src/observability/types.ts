/**
 * Core Observability Types
 *
 * Vendor-neutral abstractions for instrumentation.
 * These types enable swapping implementations (OTel, Datadog, custom)
 * without changing business logic.
 */

/**
 * Span status codes (aligned with OpenTelemetry)
 * @see https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/status.ts
 */
export enum SpanStatusCode {
	/** The default status */
	UNSET = 0,
	/** The operation completed successfully */
	OK = 1,
	/** The operation contains an error */
	ERROR = 2,
}

/**
 * Span status with optional message
 */
export interface SpanStatus {
	code: SpanStatusCode;
	message?: string;
}

/**
 * Attribute value types supported by instrumentation
 */
export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * Key-value attributes for spans and events
 */
export type Attributes = Record<string, AttributeValue>;

/**
 * Span options for customizing span behavior
 */
export interface SpanOptions {
	/** Span kind (internal, server, client, producer, consumer) */
	kind?: SpanKind;
	/** Parent span or context */
	parent?: unknown;
	/** Initial attributes */
	attributes?: Attributes;
	/** Start time in milliseconds */
	startTime?: number;
}

/**
 * Span kinds aligned with OpenTelemetry
 */
export enum SpanKind {
	INTERNAL = 0,
	SERVER = 1,
	CLIENT = 2,
	PRODUCER = 3,
	CONSUMER = 4,
}

/**
 * Context carrier for propagation (HTTP headers, metadata, etc.)
 */
export type ContextCarrier = Record<string, string>;

/**
 * Opaque context object for propagation
 */
export interface Context {
	[key: string]: unknown;
}
