import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QoSService } from "../src/qos";

// Test IDs: qos-001, qos-002, qos-003, qos-004
describe("QoSService", () => {
	let qos: QoSService;

	beforeEach(() => {
		qos = new QoSService({
			batchMax: 3,
			batchIntervalMs: 100,
			retryBaseMs: 50,
			retryMaxMs: 1000,
			maxQueueSize: 10,
		});
	});

	afterEach(() => {
		qos.destroy();
	});

	describe("qos-001: Enqueue performance", () => {
		it("should enqueue items quickly", async () => {
			const startTime = Date.now();

			const promises = [];
			for (let i = 0; i < 5; i++) {
				promises.push(qos.enqueue({ id: i, data: `test-${i}` }));
			}

			await Promise.all(promises);
			const endTime = Date.now();

			// Should be very fast (less than 10ms for enqueue operations)
			expect(endTime - startTime).toBeLessThan(10);
		});
	});

	describe("qos-002: Batch flushing", () => {
		it("should flush batch when max size is reached", async () => {
			const flushSpy = vi.spyOn(qos as any, "flushBatch");

			const promises = [];
			for (let i = 0; i < 3; i++) {
				promises.push(qos.enqueue({ id: i }));
			}

			await Promise.all(promises);

			expect(flushSpy).toHaveBeenCalled();
		});

		it("should flush batch after interval", async () => {
			const flushSpy = vi.spyOn(qos as any, "flushBatch");

			qos.enqueue({ id: 1 });
			qos.enqueue({ id: 2 });

			// Wait for batch interval
			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(flushSpy).toHaveBeenCalled();
		});
	});

	describe("qos-003: Exponential backoff", () => {
		it("should calculate correct backoff times", () => {
			// Test base case
			expect(qos.calculateBackoff(0)).toBeGreaterThanOrEqual(50);
			expect(qos.calculateBackoff(0)).toBeLessThanOrEqual(75); // With jitter

			// Test exponential growth
			const backoff1 = qos.calculateBackoff(1);
			const backoff2 = qos.calculateBackoff(2);

			expect(backoff2).toBeGreaterThan(backoff1);

			// Test max limit
			const backoffMax = qos.calculateBackoff(10);
			expect(backoffMax).toBeLessThanOrEqual(1000);
		});
	});

	describe("qos-004: Drop handling", () => {
		it("should increment drop counter when queue is full", () => {
			// Fill queue to capacity
			for (let i = 0; i < 10; i++) {
				qos.enqueue({ id: i });
			}

			// Next enqueue should throw and increment drop counter
			expect(() => qos.enqueue({ id: 11 })).toThrow();
			expect(qos.getDropCount()).toBe(1);
		});
	});
});
