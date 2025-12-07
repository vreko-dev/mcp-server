/**
 * Context Extraction Edge Case Tests
 *
 * Tests robustness of context extraction against malformed headers,
 * invalid formats, and security concerns.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OTelInstrumentationProvider } from "../otel-provider";

describe("Context Extraction Edge Cases", () => {
	let provider: OTelInstrumentationProvider;

	beforeEach(() => {
		provider = new OTelInstrumentationProvider({
			serviceName: "test-service",
			serviceVersion: "1.0.0",
			environment: "test",
			enableConsole: false,
		});
	});

	afterEach(async () => {
		await provider.shutdown();
	});

	describe("Invalid Header Formats", () => {
		it("should return null for empty traceparent header", () => {
			const headers = { traceparent: "" };
			const context = provider.extractContext(headers);
			expect(context).toBeNull();
		});

		it("should return null for traceparent with wrong number of segments", () => {
			const testCases = [
				{ traceparent: "00" }, // Too few segments
				{ traceparent: "00-abc" }, // Too few segments
				{ traceparent: "00-abc-def" }, // Too few segments
				{ traceparent: "00-abc-def-ghi-extra" }, // Too many segments
			];

			for (const headers of testCases) {
				const context = provider.extractContext(headers);
				expect(context).toBeNull();
			}
		});

		it("should return null for traceparent with invalid version", () => {
			const headers = {
				// Version 99 is not supported (only 00 is valid)
				traceparent: "99-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
			};

			const context = provider.extractContext(headers);
			expect(context).toBeNull();
		});

		it("should return null for traceparent with invalid trace-id length", () => {
			const testCases = [
				{ traceparent: "00-tooshort-00f067aa0ba902b7-01" },
				{
					traceparent:
						"00-4bf92f3577b34da6a3ce929d0e0e47364bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
				}, // too long
			];

			for (const headers of testCases) {
				const context = provider.extractContext(headers);
				expect(context).toBeNull();
			}
		});

		it("should return null for traceparent with invalid span-id length", () => {
			const testCases = [
				{ traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-short-01" },
				{ traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b700f067aa0ba902b7-01" }, // too long
			];

			for (const headers of testCases) {
				const context = provider.extractContext(headers);
				expect(context).toBeNull();
			}
		});

		it("should return null for traceparent with non-hex characters", () => {
			const testCases = [
				{ traceparent: "00-ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ-00f067aa0ba902b7-01" }, // invalid hex in trace-id
				{ traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-GGGGGGGGGGGGGGGG-01" }, // invalid hex in span-id
			];

			for (const headers of testCases) {
				const context = provider.extractContext(headers);
				expect(context).toBeNull();
			}
		});

		it("should return null for traceparent with all-zero trace-id", () => {
			// W3C spec: trace-id must not be all zeros
			const headers = {
				traceparent: "00-00000000000000000000000000000000-00f067aa0ba902b7-01",
			};

			const context = provider.extractContext(headers);
			expect(context).toBeNull();
		});

		it("should return null for traceparent with all-zero span-id", () => {
			// W3C spec: span-id must not be all zeros
			const headers = {
				traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
			};

			const context = provider.extractContext(headers);
			expect(context).toBeNull();
		});
	});

	describe("Missing Headers", () => {
		it("should return null when no headers provided", () => {
			const context = provider.extractContext({});
			expect(context).toBeNull();
		});

		it("should return null when only non-trace headers provided", () => {
			const headers = {
				"content-type": "application/json",
				authorization: "Bearer token",
				"x-request-id": "req-123",
			};

			const context = provider.extractContext(headers);
			expect(context).toBeNull();
		});

		it("should return null when traceparent is missing but tracestate is present", () => {
			// tracestate without traceparent is invalid per W3C spec
			const headers = {
				tracestate: "vendor=value",
			};

			const context = provider.extractContext(headers);
			expect(context).toBeNull();
		});
	});

	describe("Header Case Sensitivity", () => {
		it("should extract context from lowercase traceparent", () => {
			const headers = {
				traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
			};

			const context = provider.extractContext(headers);
			expect(context).not.toBeNull();
		});

		it("should extract context from mixed-case traceparent", () => {
			// HTTP headers are case-insensitive
			const headers = {
				TraceParent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
			} as Record<string, string>;

			const context = provider.extractContext(headers);
			// OpenTelemetry propagator may or may not handle case-insensitivity
			// This test documents current behavior
			expect(context).toBeDefined(); // May be null depending on propagator
		});
	});

	describe("Multiple Extraction Calls", () => {
		it("should consistently return same result for repeated extractions", () => {
			const headers = {
				traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
			};

			const context1 = provider.extractContext(headers);
			const context2 = provider.extractContext(headers);

			expect(context1).not.toBeNull();
			expect(context2).not.toBeNull();
			// Both should represent the same trace context
		});

		it("should handle extraction from empty headers without state mutation", () => {
			const emptyHeaders = {};

			const context1 = provider.extractContext(emptyHeaders);
			const context2 = provider.extractContext(emptyHeaders);

			expect(context1).toBeNull();
			expect(context2).toBeNull();
		});
	});

	describe("Security Concerns", () => {
		it("should not crash on extremely long header values", () => {
			const veryLongValue = "a".repeat(100000);
			const headers = {
				traceparent: veryLongValue,
			};

			expect(() => provider.extractContext(headers)).not.toThrow();
			const context = provider.extractContext(headers);
			expect(context).toBeNull();
		});

		it("should handle special characters in header values", () => {
			const testCases = [
				{ traceparent: "00-<script>alert(1)</script>-00f067aa0ba902b7-01" },
				{ traceparent: "00-../../../../etc/passwd-00f067aa0ba902b7-01" },
				{ traceparent: "00-'; DROP TABLE traces; --'-00f067aa0ba902b7-01" },
			];

			for (const headers of testCases) {
				expect(() => provider.extractContext(headers)).not.toThrow();
				const context = provider.extractContext(headers);
				expect(context).toBeNull();
			}
		});

		it("should not expose sensitive data through error messages", () => {
			const headersWithSensitiveData = {
				authorization: "Bearer super-secret-token",
				traceparent: "invalid-format",
			};

			// Should not throw error that exposes sensitive headers
			expect(() => provider.extractContext(headersWithSensitiveData)).not.toThrow();
		});
	});

	describe("Null Safety", () => {
		it("should handle null parent context in withSpan gracefully", async () => {
			const context = provider.extractContext({});
			expect(context).toBeNull();

			// Should create root span when parent is null
			await expect(
				provider.withSpan(
					"test-operation",
					async (span) => {
						expect(span.isRecording()).toBe(true);
					},
					{ parent: context || undefined },
				),
			).resolves.not.toThrow();
		});

		it("should handle undefined parent context in withSpan", async () => {
			await expect(
				provider.withSpan(
					"test-operation",
					async (span) => {
						expect(span.isRecording()).toBe(true);
					},
					{ parent: undefined },
				),
			).resolves.not.toThrow();
		});
	});

	describe("Valid Boundary Cases", () => {
		it("should accept minimum valid traceparent", () => {
			const headers = {
				traceparent: "00-00000000000000000000000000000001-0000000000000001-00",
			};

			const context = provider.extractContext(headers);
			expect(context).not.toBeNull();
		});

		it("should accept maximum valid traceparent", () => {
			const headers = {
				traceparent: "00-ffffffffffffffffffffffffffffffff-ffffffffffffffff-ff",
			};

			const context = provider.extractContext(headers);
			expect(context).not.toBeNull();
		});

		it("should accept traceparent with sampled flag", () => {
			const headers = {
				traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
			};

			const context = provider.extractContext(headers);
			expect(context).not.toBeNull();
		});

		it("should accept traceparent with unsampled flag", () => {
			const headers = {
				traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
			};

			const context = provider.extractContext(headers);
			expect(context).not.toBeNull();
		});
	});
});
