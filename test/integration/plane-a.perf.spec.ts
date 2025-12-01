import { performance } from "node:perf_hooks";
import { createApiKey, validateApiKey } from "@snapback/api-service/src/services/keys";
import { QoSService } from "@snapback/sdk/src/qos";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("E2E2: Performance probes (API p95, SDK batching)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("a-perf-001: should ensure API key validation latency is ≤ 50ms", async () => {
		// Create a mock API key for testing
		const apiKey = await createApiKey("user-123", { policyEvaluation: true });

		// Measure API key validation performance
		const measurements: number[] = [];

		// Run multiple iterations to get a good sample
		for (let i = 0; i < 100; i++) {
			const startTime = performance.now();
			const isValid = await validateApiKey(apiKey.key);
			const endTime = performance.now();
			measurements.push(endTime - startTime);

			// Verify the result is correct
			expect(isValid).toBe(true);
		}

		// Calculate p95 latency
		measurements.sort((a, b) => a - b);
		const p95Index = Math.floor(measurements.length * 0.95);
		const p95Latency = measurements[p95Index];

		// Verify performance requirement
		expect(p95Latency).toBeLessThanOrEqual(50);

		console.log(`API key validation p95 latency: ${p95Latency.toFixed(2)}ms`);
	});

	it("a-perf-002: should ensure SDK batch flush performance is ≤ 120ms", async () => {
		// Create a QoS service with mock configuration
		const qosService = new QoSService({
			batchMax: 10,
			batchIntervalMs: 1000, // We'll trigger manually
			retryBaseMs: 100,
			retryMaxMs: 5000,
			maxQueueSize: 1000,
			endpoint: "http://localhost:3000",
			apiKey: "test-key",
		});

		// Mock the HTTP client to avoid actual network calls
		const mockPost = vi.fn().mockResolvedValue({
			json: vi.fn().mockResolvedValue({
				results: Array.from({ length: 10 }, (_, i) => ({
					id: `item-${i}`,
					success: true,
				})),
			}),
		});

		// @ts-expect-error - accessing private property for testing
		qosService.httpClient = {
			post: mockPost,
		} as any;

		// Measure batch processing performance
		const measurements: number[] = [];

		// Run multiple iterations to get a good sample
		for (let i = 0; i < 50; i++) {
			// Enqueue items to fill a batch
			const promises: Promise<any>[] = [];
			for (let j = 0; j < 10; j++) {
				promises.push(qosService.enqueue({ id: `item-${j}`, data: `test-data-${j}` }));
			}

			const startTime = performance.now();
			// Trigger batch flush
			// @ts-expect-error - accessing private method for testing
			await qosService.flushBatch();
			const endTime = performance.now();

			measurements.push(endTime - startTime);

			// Wait a bit between iterations
			await new Promise((resolve) => setTimeout(resolve, 10));
		}

		// Calculate p95 latency
		measurements.sort((a, b) => a - b);
		const p95Index = Math.floor(measurements.length * 0.95);
		const p95Latency = measurements[p95Index];

		// Verify performance requirement
		expect(p95Latency).toBeLessThanOrEqual(120);

		console.log(`SDK batch flush p95 latency: ${p95Latency.toFixed(2)}ms`);

		// Clean up
		qosService.destroy();
	});
});
