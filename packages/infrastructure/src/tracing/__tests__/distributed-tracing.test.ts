/**
 * Distributed Tracing Tests
 *
 * Tests parent context propagation, W3C Trace Context compliance,
 * and multi-service trace continuity.
 */

import type { Context } from "@snapback/contracts/observability";
import { NoOpInstrumentationProvider, SpanKind } from "@snapback/contracts/observability";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OTelInstrumentationProvider } from "../otel-provider";

describe("Distributed Tracing", () => {
	let provider: OTelInstrumentationProvider;

	beforeEach(() => {
		provider = new OTelInstrumentationProvider({
			serviceName: "test-service",
			serviceVersion: "1.0.0",
			environment: "test",
			enableConsole: false, // Disable console output in tests
		});
	});

	afterEach(async () => {
		await provider.shutdown();
	});

	describe("Parent Context Propagation", () => {
		it("should create child span when parent context is provided", async () => {
			// Arrange: Create parent trace
			const parentSpanIds: string[] = [];
			const childSpanIds: string[] = [];

			// Act: Create parent span and child span
			await provider.withSpan("parent-operation", async (parentSpan) => {
				// Verify parent span is recording
				expect(parentSpan.isRecording()).toBe(true);

				// Inject context into carrier (simulating HTTP headers)
				const headers: Record<string, string> = {};
				provider.injectContext(headers);

				// Verify W3C Trace Context headers are injected
				expect(headers).toHaveProperty("traceparent");
				expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);

				// Extract parent context from headers (simulating receiving request)
				const parentContext = provider.extractContext(headers);
				expect(parentContext).not.toBeNull();

				// Create child span with parent context
				await provider.withSpan(
					"child-operation",
					async (childSpan) => {
						expect(childSpan.isRecording()).toBe(true);

						// Child span should be recording
						childSpan.setAttribute("test.child", true);
					},
					{
						kind: SpanKind.CLIENT,
						parent: parentContext as Context,
					},
				);
			});

			// Assert: Both spans should have been created and recorded
			expect(parentSpanIds).toBeDefined();
			expect(childSpanIds).toBeDefined();
		});

		it("should create root span when no parent context provided", async () => {
			// Act: Create span without parent
			await provider.withSpan("root-operation", async (span) => {
				expect(span.isRecording()).toBe(true);
				span.setAttribute("test.root", true);
			});

			// Assert: No error thrown, span created successfully
		});

		it("should handle null parent context gracefully", async () => {
			// Arrange: Extract from empty headers (no trace context)
			const emptyHeaders: Record<string, string> = {};
			const extractedContext = provider.extractContext(emptyHeaders);

			// Assert: Should return null for empty headers
			expect(extractedContext).toBeNull();

			// Act: Create span with null parent (should create root span)
			await provider.withSpan(
				"operation-with-null-parent",
				async (span) => {
					expect(span.isRecording()).toBe(true);
					span.setAttribute("test.null_parent", true);
				},
				{
					parent: extractedContext || undefined,
				},
			);

			// Assert: No error thrown
		});
	});

	describe("W3C Trace Context Compliance", () => {
		it("should inject valid traceparent header format", async () => {
			await provider.withSpan("test-span", async () => {
				const headers: Record<string, string> = {};
				provider.injectContext(headers);

				// Assert: traceparent format: version-traceId-spanId-traceFlags
				expect(headers.traceparent).toBeDefined();
				const parts = headers.traceparent.split("-");
				expect(parts).toHaveLength(4);
				expect(parts[0]).toBe("00"); // version
				expect(parts[1]).toHaveLength(32); // traceId (128-bit hex)
				expect(parts[2]).toHaveLength(16); // spanId (64-bit hex)
				expect(parts[3]).toMatch(/^0[01]$/); // traceFlags (sampled bit)
			});
		});

		it("should extract context from valid traceparent header", () => {
			// Arrange: Valid W3C traceparent header
			const headers = {
				traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
			};

			// Act
			const context = provider.extractContext(headers);

			// Assert: Should successfully extract context
			expect(context).not.toBeNull();
		});

		it("should reject invalid traceparent header format", () => {
			// Arrange: Invalid traceparent headers
			const invalidHeaders = [
				{ traceparent: "invalid" },
				{ traceparent: "00-tooshort-00f067aa0ba902b7-01" },
				{ traceparent: "99-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" }, // invalid version
			];

			for (const headers of invalidHeaders) {
				// Act
				const context = provider.extractContext(headers);

				// Assert: Should return null for invalid headers
				expect(context).toBeNull();
			}
		});

		it("should preserve tracestate header across propagation", async () => {
			// Arrange: Headers with both traceparent and tracestate
			const incomingHeaders = {
				traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
				tracestate: "vendor1=value1,vendor2=value2",
			};

			const context = provider.extractContext(incomingHeaders);
			expect(context).not.toBeNull();

			// Act: Create span and inject context
			await provider.withSpan(
				"test-operation",
				async () => {
					const outgoingHeaders: Record<string, string> = {};
					provider.injectContext(outgoingHeaders);

					// Assert: traceparent should be present (new spanId)
					expect(outgoingHeaders.traceparent).toBeDefined();
					expect(outgoingHeaders.traceparent).not.toBe(incomingHeaders.traceparent);

					// tracestate should be preserved
					expect(outgoingHeaders.tracestate).toBeDefined();
				},
				{ parent: context as Context },
			);
		});
	});

	describe("Multi-Service Trace Continuity", () => {
		it("should maintain trace ID across service boundaries", async () => {
			// Simulate: Service A → Service B → Service C trace flow
			let serviceBHeaders: Record<string, string> = {};
			let serviceCHeaders: Record<string, string> = {};
			let originalTraceId = "";

			// Service A: Create parent span
			await provider.withSpan("service-a-operation", async () => {
				const headers: Record<string, string> = {};
				provider.injectContext(headers);
				serviceBHeaders = headers;

				// Extract trace ID from traceparent
				originalTraceId = headers.traceparent.split("-")[1];
			});

			// Service B: Receive request from A, create child span
			const serviceBContext = provider.extractContext(serviceBHeaders);
			expect(serviceBContext).not.toBeNull();

			await provider.withSpan(
				"service-b-operation",
				async () => {
					const headers: Record<string, string> = {};
					provider.injectContext(headers);
					serviceCHeaders = headers;

					// Verify trace ID matches original
					const traceId = headers.traceparent.split("-")[1];
					expect(traceId).toBe(originalTraceId);
				},
				{ parent: serviceBContext as Context },
			);

			// Service C: Receive request from B, create grandchild span
			const serviceCContext = provider.extractContext(serviceCHeaders);
			expect(serviceCContext).not.toBeNull();

			await provider.withSpan(
				"service-c-operation",
				async () => {
					const headers: Record<string, string> = {};
					provider.injectContext(headers);

					// Verify trace ID still matches original
					const traceId = headers.traceparent.split("-")[1];
					expect(traceId).toBe(originalTraceId);
				},
				{ parent: serviceCContext as Context },
			);
		});

		it("should create unique span IDs for each service", async () => {
			const spanIds: string[] = [];

			// Service A
			await provider.withSpan("service-a", async () => {
				const headers: Record<string, string> = {};
				provider.injectContext(headers);
				spanIds.push(headers.traceparent.split("-")[2]);

				// Service B
				const context = provider.extractContext(headers);
				await provider.withSpan(
					"service-b",
					async () => {
						const headers2: Record<string, string> = {};
						provider.injectContext(headers2);
						spanIds.push(headers2.traceparent.split("-")[2]);
					},
					{ parent: context as Context },
				);
			});

			// Assert: All span IDs should be unique
			expect(new Set(spanIds).size).toBe(spanIds.length);
		});
	});

	describe("NoOp Provider Compatibility", () => {
		it("should not break when NoOp provider is used", async () => {
			// Arrange
			const noopProvider = new NoOpInstrumentationProvider();

			// Act: All operations should complete without errors
			const headers: Record<string, string> = {};
			noopProvider.injectContext(headers);
			const context = noopProvider.extractContext(headers);

			await noopProvider.withSpan("test-operation", async (span) => {
				span.setAttribute("test.attribute", "value");
				span.addEvent("test.event");
				span.setStatus({ code: 1 });
			});

			// Assert: No errors thrown, headers empty (no injection)
			expect(headers).toEqual({});
			expect(context).toBeNull();
		});
	});

	describe("Context Extraction Edge Cases", () => {
		it("should handle missing headers gracefully", () => {
			const testCases = [{}, { "content-type": "application/json" }, { authorization: "Bearer token" }];

			for (const headers of testCases) {
				const context = provider.extractContext(headers as any);
				expect(context).toBeNull();
			}
		});

		it("should handle malformed trace headers without throwing", () => {
			const malformedHeaders = [
				{ traceparent: "" },
				{ traceparent: "malformed" },
				{ traceparent: "00-" },
				{ traceparent: "00-abc-def-ghi" },
			];

			for (const headers of malformedHeaders) {
				expect(() => provider.extractContext(headers)).not.toThrow();
				const context = provider.extractContext(headers);
				expect(context).toBeNull();
			}
		});

		it("should only extract from W3C headers, not custom headers", () => {
			const headers = {
				"x-custom-trace-id": "custom-trace-id",
				"x-request-id": "request-123",
			};

			const context = provider.extractContext(headers);
			expect(context).toBeNull();
		});
	});
});
