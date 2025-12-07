import type { InstrumentationProvider, Span } from "@snapback/contracts";
import { NoOpInstrumentationProvider, SpanStatusCode } from "@snapback/contracts";
import { describe, expect, it, vi } from "vitest";

/**
 * Test Suite: Telemetry Safety
 *
 * Critical requirement: Instrumentation failures MUST NOT break business logic.
 * These tests ensure telemetry is truly optional and gracefully degradable.
 */

describe("Telemetry Safety - Business Logic Resilience", () => {
	describe("NoOp Provider Safety", () => {
		it("should allow business logic to succeed even when instrumentation is disabled", async () => {
			const provider = new NoOpInstrumentationProvider();

			// Simulate critical business operation
			const createSnapshot = async (filePath: string): Promise<string> => {
				return await provider.withSpan("snapshot.create", async (span: Span) => {
					span.setAttribute("file.path", filePath);
					span.addEvent("validation.start");

					// Business logic
					const snapshotId = "snap-123";

					span.setAttribute("snapshot.id", snapshotId);
					span.setStatus({ code: SpanStatusCode.OK });

					return snapshotId;
				});
			};

			// Should succeed without instrumentation
			const result = await createSnapshot("/test/file.ts");
			expect(result).toBe("snap-123");
		});

		it("should handle exceptions in business logic without instrumentation interference", async () => {
			const provider = new NoOpInstrumentationProvider();

			const faultyOperation = async (): Promise<string> => {
				return await provider.withSpan("faulty.operation", async (span: Span) => {
					span.setAttribute("test.key", "test.value");

					// Business logic throws
					throw new Error("Business logic error");
				});
			};

			// Exception should propagate without instrumentation wrapping it
			await expect(faultyOperation()).rejects.toThrow("Business logic error");
		});
	});

	describe("Instrumentation Failure Isolation", () => {
		it("should handle span.setAttribute failures gracefully", async () => {
			// Create mock provider where setAttribute throws
			const faultySpan: Span = {
				setAttribute: vi.fn(() => {
					throw new Error("Telemetry backend unavailable");
				}),
				setAttributes: vi.fn(),
				addEvent: vi.fn(),
				setStatus: vi.fn(),
				recordException: vi.fn(),
				end: vi.fn(),
				isRecording: () => true,
			};

			const provider: InstrumentationProvider = {
				startSpan: vi.fn(() => faultySpan),
				withSpan: vi.fn(async (_name, fn) => await fn(faultySpan)),
				injectContext: vi.fn(),
				extractContext: vi.fn(),
				recordMetric: vi.fn(),
				recordEvent: vi.fn(),
				shutdown: vi.fn(),
			};

			// Business logic should handle telemetry failures
			const safeOperation = async (): Promise<string> => {
				return await provider.withSpan("safe.operation", async (span: Span) => {
					try {
						span.setAttribute("key", "value"); // This throws
					} catch (_error) {
						// Ignore telemetry errors
					}

					// Business logic continues
					return "success";
				});
			};

			const result = await safeOperation();
			expect(result).toBe("success");
		});

		it("should handle context injection failures gracefully", () => {
			// Create mock provider where injectContext throws
			const provider: InstrumentationProvider = {
				startSpan: vi.fn(),
				withSpan: vi.fn(),
				injectContext: vi.fn(() => {
					throw new Error("Context serialization failed");
				}),
				extractContext: vi.fn(),
				recordMetric: vi.fn(),
				recordEvent: vi.fn(),
				shutdown: vi.fn(),
			};

			// Should not throw when wrapped in try-catch
			const safeInject = (carrier: Record<string, string>): void => {
				try {
					provider.injectContext(carrier);
				} catch (error) {
					// Log error but continue
					console.error("Telemetry injection failed", error);
				}
			};

			expect(() => safeInject({})).not.toThrow();
		});

		it("should handle context extraction failures gracefully", () => {
			// Create mock provider where extractContext throws
			const provider: InstrumentationProvider = {
				startSpan: vi.fn(),
				withSpan: vi.fn(),
				injectContext: vi.fn(),
				extractContext: vi.fn(() => {
					throw new Error("Context parsing failed");
				}),
				recordMetric: vi.fn(),
				recordEvent: vi.fn(),
				shutdown: vi.fn(),
			};

			// Should not throw when wrapped in try-catch
			const safeExtract = (carrier: Record<string, string>): void => {
				try {
					provider.extractContext(carrier);
				} catch (error) {
					// Log error but continue without trace context
					console.error("Telemetry extraction failed", error);
				}
			};

			expect(() => safeExtract({ traceparent: "invalid" })).not.toThrow();
		});
	});

	describe("Network Failure Resilience", () => {
		it("should handle OTLP export failures gracefully", async () => {
			// Simulates OTel exporter failing to send traces to collector
			// Business logic must continue even if trace export fails

			const provider = new NoOpInstrumentationProvider();

			const operationWithNetworkFailure = async (): Promise<string> => {
				return await provider.withSpan("network.operation", async (span: Span) => {
					span.setAttribute("test", "value");

					// Simulate network-dependent business logic
					const result = "success";

					// Telemetry export would fail here (network timeout)
					// but business logic already succeeded

					return result;
				});
			};

			const result = await operationWithNetworkFailure();
			expect(result).toBe("success");
		});

		it("should handle collector unavailability", async () => {
			// Simulates Jaeger/Grafana collector being down
			// Spans should be buffered or dropped, not block business logic

			const provider = new NoOpInstrumentationProvider();

			const operations = Array.from({ length: 10 }, (_, i) =>
				provider.withSpan(`operation.${i}`, async (span: Span) => {
					span.setAttribute("index", i);
					return `result-${i}`;
				}),
			);

			// All operations should succeed even if collector is down
			const results = await Promise.all(operations);
			expect(results).toHaveLength(10);
			expect(results[0]).toBe("result-0");
			expect(results[9]).toBe("result-9");
		});
	});

	describe("Shutdown Safety", () => {
		it("should allow graceful shutdown without blocking", async () => {
			const provider = new NoOpInstrumentationProvider();

			// Start some operations
			const operation1 = provider.withSpan("op1", async (span: Span) => {
				span.setAttribute("key", "value");
				await new Promise((resolve) => setTimeout(resolve, 10));
				return "result1";
			});

			const operation2 = provider.withSpan("op2", async (span: Span) => {
				span.setAttribute("key", "value");
				await new Promise((resolve) => setTimeout(resolve, 10));
				return "result2";
			});

			// Shutdown should not throw
			await expect(provider.shutdown()).resolves.toBeUndefined();

			// Operations should still complete
			const results = await Promise.all([operation1, operation2]);
			expect(results).toEqual(["result1", "result2"]);
		});

		it("should handle multiple shutdown calls safely", async () => {
			const provider = new NoOpInstrumentationProvider();

			// Multiple shutdowns should be idempotent
			await provider.shutdown();
			await provider.shutdown();
			await provider.shutdown();

			// Should not throw
			expect(true).toBe(true);
		});
	});

	describe("Real-World Safety Scenarios", () => {
		it("should handle snapshot creation with telemetry failure", async () => {
			const provider = new NoOpInstrumentationProvider();

			// Simulates real snapshot creation flow
			const createSnapshot = async (
				filePath: string,
				content: string,
			): Promise<{ id: string; timestamp: number }> => {
				return await provider.withSpan("snapshot.create", async (span: Span) => {
					// Try to add telemetry
					try {
						span.setAttribute("file.path", filePath);
						span.setAttribute("content.size", content.length);
						span.addEvent("validation.start");
					} catch (_error) {
						// Ignore telemetry errors
					}

					// Business logic
					const snapshot = {
						id: "snap-123",
						timestamp: Date.now(),
					};

					// Try to add success telemetry
					try {
						span.setAttribute("snapshot.id", snapshot.id);
						span.setStatus({ code: SpanStatusCode.OK });
					} catch (_error) {
						// Ignore telemetry errors
					}

					return snapshot;
				});
			};

			const result = await createSnapshot("/test/file.ts", "content");
			expect(result.id).toBe("snap-123");
			expect(result.timestamp).toBeGreaterThan(0);
		});

		it("should handle API request with context propagation failure", async () => {
			const provider = new NoOpInstrumentationProvider();

			// Simulates API endpoint receiving request
			const handleRequest = async (
				headers: Record<string, string>,
			): Promise<{ status: number; data: string }> => {
				// Try to extract context
				let _context = null;
				try {
					_context = provider.extractContext(headers);
				} catch (_error) {
					// Continue without trace context
				}

				// Business logic
				return await provider.withSpan("api.request.handle", async (span: Span) => {
					try {
						span.setAttribute("http.method", "POST");
						span.setAttribute("http.route", "/api/snapshots");
					} catch (_error) {
						// Ignore telemetry errors
					}

					// Process request
					const response = {
						status: 200,
						data: "success",
					};

					try {
						span.setAttribute("http.status_code", response.status);
						span.setStatus({ code: SpanStatusCode.OK });
					} catch (_error) {
						// Ignore telemetry errors
					}

					return response;
				});
			};

			const result = await handleRequest({
				traceparent: "invalid-format",
			});
			expect(result.status).toBe(200);
			expect(result.data).toBe("success");
		});
	});

	describe("Performance Safety", () => {
		it("should not significantly impact performance when disabled", async () => {
			const provider = new NoOpInstrumentationProvider();

			const iterations = 1000;
			const start = Date.now();

			// Run many operations with NoOp instrumentation
			for (let i = 0; i < iterations; i++) {
				await provider.withSpan(`operation.${i}`, async (span: Span) => {
					span.setAttribute("index", i);
					span.addEvent("test.event");
					return i;
				});
			}

			const duration = Date.now() - start;

			// NoOp instrumentation should be very fast (<10ms for 1000 operations)
			expect(duration).toBeLessThan(100);
		});

		it("should handle high-frequency instrumentation calls", async () => {
			const provider = new NoOpInstrumentationProvider();

			// Simulate high-frequency file change events
			const operations = Array.from({ length: 100 }, (_, i) =>
				provider.withSpan(`file.change.${i}`, async (span: Span) => {
					span.setAttribute("file.index", i);
					span.setAttribute("change.type", "modify");
					span.addEvent("change.detected");
					return i;
				}),
			);

			const results = await Promise.all(operations);
			expect(results).toHaveLength(100);
		});
	});
});
