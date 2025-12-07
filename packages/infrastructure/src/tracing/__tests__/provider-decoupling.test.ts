import { describe, expect, it, vi } from "vitest";
import type {
	InstrumentationProvider,
	Span,
} from "@snapback/contracts";
import { NoOpInstrumentationProvider, SpanStatusCode } from "@snapback/contracts";

/**
 * Test Suite: InstrumentationProvider Decoupling
 *
 * Validates that business logic can use mock providers without OTel dependencies.
 * This ensures we can swap providers (Grafana → Datadog) without breaking logic.
 */

describe("InstrumentationProvider - Decoupling Tests", () => {
	describe("NoOpInstrumentationProvider", () => {
		it("should provide no-op implementation for all methods", async () => {
			const provider = new NoOpInstrumentationProvider();

			// Span operations should not throw
			const span = provider.startSpan("test-operation");
			expect(span).toBeDefined();
			expect(span.isRecording()).toBe(false);

			span.setAttribute("key", "value");
			span.setAttributes({ attr1: "value1", attr2: 123 });
			span.addEvent("test-event", { detail: "test" });
			span.setStatus({ code: SpanStatusCode.OK });
			span.recordException(new Error("test error"));
			span.end();

			// withSpan should execute function without creating real span
			const result = await provider.withSpan("test-op", async (s: Span) => {
				expect(s.isRecording()).toBe(false);
				return "success";
			});
			expect(result).toBe("success");

			// Context propagation should not throw
			const carrier: Record<string, string> = {};
			provider.injectContext(carrier);
			expect(Object.keys(carrier).length).toBe(0); // No headers injected

			const extractedContext = provider.extractContext({ traceparent: "test" });
			expect(extractedContext).toBeNull();

			// Metrics/events should not throw
			provider.recordMetric("metric.name", 123, { tag: "value" });
			provider.recordEvent("event.name", { detail: "test" });

			// Shutdown should not throw
			await provider.shutdown();
		});

		it("should allow business logic to work without real instrumentation", async () => {
			const provider = new NoOpInstrumentationProvider();

			// Simulate critical path operation
			const createSnapshot = async (filePath: string): Promise<string> => {
				return await provider.withSpan(
					"snapshot.create",
					async (span: Span) => {
						span.setAttribute("file.path", filePath);
						span.addEvent("validation.start");

						// Simulate snapshot creation
						const snapshotId = "snap-123";

						span.setAttribute("snapshot.id", snapshotId);
						span.addEvent("snapshot.saved");

						return snapshotId;
					},
				);
			};

			const snapshotId = await createSnapshot("/test/file.ts");
			expect(snapshotId).toBe("snap-123");
		});
	});

	describe("Mock InstrumentationProvider", () => {
		it("should allow easy mocking for unit tests", async () => {
			// Create mock provider
			const mockSpan: Span = {
				setAttribute: vi.fn(),
				setAttributes: vi.fn(),
				addEvent: vi.fn(),
				setStatus: vi.fn(),
				recordException: vi.fn(),
				end: vi.fn(),
				isRecording: vi.fn(() => true),
			};

			const mockProvider: InstrumentationProvider = {
				startSpan: vi.fn(() => mockSpan),
				withSpan: vi.fn(async (_name, fn) => await fn(mockSpan)),
				injectContext: vi.fn(),
				extractContext: vi.fn(() => null),
				recordMetric: vi.fn(),
				recordEvent: vi.fn(),
				shutdown: vi.fn(),
			};

			// Use mock in business logic
			const processFile = async (
				provider: InstrumentationProvider,
				filePath: string,
			): Promise<void> => {
				await provider.withSpan("file.process", async (span: Span) => {
					span.setAttribute("file.path", filePath);
					span.addEvent("processing.start");

					// Simulate processing
					await new Promise((resolve) => setTimeout(resolve, 10));

					span.setStatus({ code: SpanStatusCode.OK });
				});
			};

			await processFile(mockProvider, "/test.ts");

			// Verify interactions
			expect(mockProvider.withSpan).toHaveBeenCalledWith(
				"file.process",
				expect.any(Function),
			);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				"file.path",
				"/test.ts",
			);
			expect(mockSpan.addEvent).toHaveBeenCalledWith("processing.start");
			expect(mockSpan.setStatus).toHaveBeenCalledWith({
				code: SpanStatusCode.OK,
			});
		});

		it("should allow dependency injection pattern", () => {
			// Simulated service class
			class SnapshotService {
				constructor(private instrumentation: InstrumentationProvider) {}

				async create(filePath: string): Promise<string> {
					return await this.instrumentation.withSpan(
						"snapshot.create",
						async (span: Span) => {
							span.setAttribute("file.path", filePath);
							return "snap-123";
						},
					);
				}
			}

			// Test with NoOp provider
			const noOpService = new SnapshotService(
				new NoOpInstrumentationProvider(),
			);
			expect(noOpService.create("/test.ts")).resolves.toBe("snap-123");

			// Test with mock provider
			const mockProvider: InstrumentationProvider = {
				startSpan: vi.fn(),
				withSpan: vi.fn(async (_name, fn) => {
					const mockSpan: Span = {
						setAttribute: vi.fn(),
						setAttributes: vi.fn(),
						addEvent: vi.fn(),
						setStatus: vi.fn(),
						recordException: vi.fn(),
						end: vi.fn(),
						isRecording: () => true,
					};
					return await fn(mockSpan);
				}),
				injectContext: vi.fn(),
				extractContext: vi.fn(),
				recordMetric: vi.fn(),
				recordEvent: vi.fn(),
				shutdown: vi.fn(),
			};

			const mockService = new SnapshotService(mockProvider);
			expect(mockService.create("/test.ts")).resolves.toBe("snap-123");
			expect(mockProvider.withSpan).toHaveBeenCalledWith(
				"snapshot.create",
				expect.any(Function),
			);
		});
	});

	describe("Provider Swapping", () => {
		it("should allow swapping providers without changing business logic", async () => {
			// Simulated operation that works with any provider
			const executeWithProvider = async (
				provider: InstrumentationProvider,
			): Promise<string> => {
				return await provider.withSpan(
					"test.operation",
					async (span: Span) => {
						span.setAttribute("test.key", "test.value");
						span.addEvent("test.event");
						return "result";
					},
				);
			};

			// Test with NoOp provider
			const noOpProvider = new NoOpInstrumentationProvider();
			const result1 = await executeWithProvider(noOpProvider);
			expect(result1).toBe("result");

			// Test with mock provider (simulates OTel)
			const mockProvider: InstrumentationProvider = {
				startSpan: vi.fn(),
				withSpan: vi.fn(async (_name, fn) => {
					const mockSpan: Span = {
						setAttribute: vi.fn(),
						setAttributes: vi.fn(),
						addEvent: vi.fn(),
						setStatus: vi.fn(),
						recordException: vi.fn(),
						end: vi.fn(),
						isRecording: () => true,
					};
					return await fn(mockSpan);
				}),
				injectContext: vi.fn(),
				extractContext: vi.fn(),
				recordMetric: vi.fn(),
				recordEvent: vi.fn(),
				shutdown: vi.fn(),
			};

			const result2 = await executeWithProvider(mockProvider);
			expect(result2).toBe("result");
			expect(mockProvider.withSpan).toHaveBeenCalled();
		});
	});
});
