/**
 * Test Helper Utilities for Instrumentation Testing
 *
 * Provides reusable test utilities for verifying distributed tracing behavior.
 */

import { describe, expect, it, vi } from "vitest";
import type { InstrumentationProvider, Span } from "@snapback/contracts/observability";
import { NoOpInstrumentationProvider } from "@snapback/contracts/observability";
import { OTelInstrumentationProvider } from "../../src/tracing/otel-provider";

/**
 * Create a test instrumentation provider for unit tests.
 *
 * @param type - Provider type: "real" for OTel, "noop" for no-op
 * @returns InstrumentationProvider instance
 */
export function createTestProvider(
	type: "real" | "noop" = "real",
): InstrumentationProvider {
	if (type === "noop") {
		return new NoOpInstrumentationProvider();
	}

	return new OTelInstrumentationProvider({
		serviceName: "test-service",
		serviceVersion: "1.0.0-test",
		environment: "test",
	});
}

/**
 * Expect traceparent header to be valid W3C Trace Context format.
 *
 * Format: 00-{trace-id}-{span-id}-{flags}
 * - version: 00 (fixed)
 * - trace-id: 32 hex chars
 * - span-id: 16 hex chars
 * - flags: 01 (sampled) or 00 (not sampled)
 *
 * @param traceparent - traceparent header value
 */
export function expectValidTraceparent(traceparent: string): void {
	expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
}

/**
 * Extract trace ID from traceparent header.
 *
 * @param traceparent - traceparent header value
 * @returns Trace ID (32 hex chars)
 */
export function extractTraceId(traceparent: string): string {
	const parts = traceparent.split("-");
	return parts[1];
}

/**
 * Extract span ID from traceparent header.
 *
 * @param traceparent - traceparent header value
 * @returns Span ID (16 hex chars)
 */
export function extractSpanId(traceparent: string): string {
	const parts = traceparent.split("-");
	return parts[2];
}

/**
 * Expect two traceparent headers to have the same trace ID (distributed trace).
 *
 * @param parent - Parent traceparent header
 * @param child - Child traceparent header
 */
export function expectSameTraceId(parent: string, child: string): void {
	const parentTraceId = extractTraceId(parent);
	const childTraceId = extractTraceId(child);

	expect(childTraceId).toBe(parentTraceId);
}

/**
 * Expect two traceparent headers to have different span IDs (parent-child relationship).
 *
 * @param parent - Parent traceparent header
 * @param child - Child traceparent header
 */
export function expectDifferentSpanId(parent: string, child: string): void {
	const parentSpanId = extractSpanId(parent);
	const childSpanId = extractSpanId(child);

	expect(childSpanId).not.toBe(parentSpanId);
}

/**
 * Expect span to have been called with specific attributes.
 *
 * @param span - Mock span object
 * @param expectedAttributes - Expected attributes
 */
export function expectSpanAttributes(
	span: Span,
	expectedAttributes: Record<string, string | number | boolean>,
): void {
	for (const [key, value] of Object.entries(expectedAttributes)) {
		expect(span.setAttribute).toHaveBeenCalledWith(key, value);
	}
}

/**
 * Expect span to have recorded an event with specific attributes.
 *
 * @param span - Mock span object
 * @param eventName - Expected event name
 * @param attributes - Optional expected attributes
 */
export function expectSpanEvent(
	span: Span,
	eventName: string,
	attributes?: Record<string, unknown>,
): void {
	if (attributes) {
		expect(span.addEvent).toHaveBeenCalledWith(eventName, attributes);
	} else {
		expect(span.addEvent).toHaveBeenCalledWith(
			eventName,
			expect.anything(),
		);
	}
}

/**
 * Create a mock span for testing.
 *
 * @returns Mock span with jest.fn() methods
 */
export function createMockSpan(): Span {
	return {
		setAttribute: vi.fn(),
		setAttributes: vi.fn(),
		addEvent: vi.fn(),
		setStatus: vi.fn(),
		recordException: vi.fn(),
		end: vi.fn(),
		isRecording: vi.fn().mockReturnValue(true),
	};
}

/**
 * Wait for OpenTelemetry spans to be exported.
 * Useful for integration tests that verify span export.
 *
 * @param ms - Milliseconds to wait (default: 100ms)
 */
export async function waitForSpanExport(ms = 100): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Shutdown all test providers gracefully.
 *
 * @param providers - Array of providers to shutdown
 */
export async function shutdownProviders(
	...providers: InstrumentationProvider[]
): Promise<void> {
	await Promise.all(providers.map((p) => p.shutdown()));
}
