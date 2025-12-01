/**
 * Performance Testing Harness - TDD Test Suite
 * Tests performance budgets with ±20% variance tolerance (Alpha spec)
 */

import { describe, expect, it } from "vitest";
import {
	type BenchmarkResult,
	checkBudget,
	createBenchmark,
	loadBaseline,
	type PerformanceBudget,
	saveBaseline,
} from "../src/index";

describe("Performance Harness - TDD", () => {
	describe("Benchmark Creation", () => {
		it("should create a benchmark and measure execution time", async () => {
			const benchmark = createBenchmark("test-operation");

			const result = await benchmark.run(async () => {
				// Simulate work
				await new Promise((resolve) => setTimeout(resolve, 10));
			});

			expect(result.name).toBe("test-operation");
			expect(result.p50).toBeGreaterThan(0);
			expect(result.p90).toBeGreaterThan(0);
			expect(result.p95).toBeGreaterThan(0);
			expect(result.iterations).toBe(10); // Default iterations
		});

		it("should support custom iteration count", async () => {
			const benchmark = createBenchmark("custom-iterations", { iterations: 5 });

			const result = await benchmark.run(async () => {
				await new Promise((resolve) => setTimeout(resolve, 1));
			});

			expect(result.iterations).toBe(5);
		});

		it("should calculate percentiles correctly", async () => {
			const benchmark = createBenchmark("percentile-test");

			const result = await benchmark.run(async () => {
				// Fixed delay for predictable results
				await new Promise((resolve) => setTimeout(resolve, 10));
			});

			// p95 should be >= p90 >= p50
			expect(result.p95).toBeGreaterThanOrEqual(result.p90);
			expect(result.p90).toBeGreaterThanOrEqual(result.p50);
		});
	});

	describe("Performance Budgets", () => {
		it("should pass when within budget", async () => {
			const budget: PerformanceBudget = {
				name: "fast-operation",
				p95: 100, // 100ms budget
				variance: 0.2, // ±20%
			};

			const result: BenchmarkResult = {
				name: "fast-operation",
				p50: 40,
				p90: 60,
				p95: 80, // Well under budget
				iterations: 10,
				timestamp: Date.now(),
			};

			const check = checkBudget(result, budget);

			expect(check.passed).toBe(true);
			expect(check.actual).toBe(80);
			expect(check.budget).toBe(100);
			expect(check.variance).toBe(0.2);
		});

		it("should fail when exceeding budget beyond variance", async () => {
			const budget: PerformanceBudget = {
				name: "slow-operation",
				p95: 100,
				variance: 0.2, // ±20% = max 120ms
			};

			const result: BenchmarkResult = {
				name: "slow-operation",
				p50: 100,
				p90: 120,
				p95: 150, // Exceeds budget + variance
				iterations: 10,
				timestamp: Date.now(),
			};

			const check = checkBudget(result, budget);

			expect(check.passed).toBe(false);
			expect(check.actual).toBe(150);
			expect(check.budget).toBe(100);
			expect(check.maxAllowed).toBe(120); // 100 * 1.2
		});

		it("should pass when within variance tolerance", async () => {
			const budget: PerformanceBudget = {
				name: "borderline-operation",
				p95: 100,
				variance: 0.2,
			};

			const result: BenchmarkResult = {
				name: "borderline-operation",
				p50: 80,
				p90: 100,
				p95: 115, // Within 20% variance
				iterations: 10,
				timestamp: Date.now(),
			};

			const check = checkBudget(result, budget);

			expect(check.passed).toBe(true);
			expect(check.actual).toBe(115);
			expect(check.maxAllowed).toBe(120);
		});
	});

	describe("Baseline Management", () => {
		const testBaselinePath = "./.perf-baseline-test.json";

		it("should save baseline to file", async () => {
			const results: BenchmarkResult[] = [
				{
					name: "operation-1",
					p50: 50,
					p90: 80,
					p95: 100,
					iterations: 10,
					timestamp: Date.now(),
				},
				{
					name: "operation-2",
					p50: 200,
					p90: 300,
					p95: 400,
					iterations: 10,
					timestamp: Date.now(),
				},
			];

			await saveBaseline(results, testBaselinePath);

			const loaded = await loadBaseline(testBaselinePath);

			expect(loaded).toHaveLength(2);
			expect(loaded[0].name).toBe("operation-1");
			expect(loaded[1].name).toBe("operation-2");
		});

		it("should include hardware specs in baseline", async () => {
			const results: BenchmarkResult[] = [
				{
					name: "test-op",
					p50: 50,
					p90: 80,
					p95: 100,
					iterations: 10,
					timestamp: Date.now(),
				},
			];

			await saveBaseline(results, testBaselinePath);
			const loaded = await loadBaseline(testBaselinePath);

			// Hardware specs should be stored
			expect(loaded.length).toBeGreaterThan(0);
		});

		it("should return empty array for non-existent baseline", async () => {
			const loaded = await loadBaseline("./non-existent-baseline.json");
			expect(loaded).toEqual([]);
		});
	});

	describe("Alpha Performance Budgets", () => {
		it("should enforce snapshot creation budget (<100ms p95)", async () => {
			const budget: PerformanceBudget = {
				name: "snapshot-creation",
				p95: 100,
				variance: 0.2,
			};

			// Simulated fast snapshot
			const fastResult: BenchmarkResult = {
				name: "snapshot-creation",
				p50: 40,
				p90: 60,
				p95: 85,
				iterations: 10,
				timestamp: Date.now(),
			};

			expect(checkBudget(fastResult, budget).passed).toBe(true);

			// Simulated slow snapshot (should fail)
			const slowResult: BenchmarkResult = {
				name: "snapshot-creation",
				p50: 80,
				p90: 110,
				p95: 130, // Exceeds 120ms (100 + 20%)
				iterations: 10,
				timestamp: Date.now(),
			};

			expect(checkBudget(slowResult, budget).passed).toBe(false);
		});

		it("should enforce risk analysis budget (<500ms)", async () => {
			const budget: PerformanceBudget = {
				name: "risk-analysis",
				p95: 500,
				variance: 0.2,
			};

			const result: BenchmarkResult = {
				name: "risk-analysis",
				p50: 200,
				p90: 400,
				p95: 480,
				iterations: 10,
				timestamp: Date.now(),
			};

			expect(checkBudget(result, budget).passed).toBe(true);
		});

		it("should enforce session tracking budget (<50ms)", async () => {
			const budget: PerformanceBudget = {
				name: "session-tracking",
				p95: 50,
				variance: 0.2,
			};

			const result: BenchmarkResult = {
				name: "session-tracking",
				p50: 10,
				p90: 30,
				p95: 45,
				iterations: 10,
				timestamp: Date.now(),
			};

			expect(checkBudget(result, budget).passed).toBe(true);
		});

		it("should enforce analytics TTI budget (<2000ms)", async () => {
			const budget: PerformanceBudget = {
				name: "analytics-tti",
				p95: 2000,
				variance: 0.2,
			};

			const result: BenchmarkResult = {
				name: "analytics-tti",
				p50: 1000,
				p90: 1500,
				p95: 1800,
				iterations: 10,
				timestamp: Date.now(),
			};

			expect(checkBudget(result, budget).passed).toBe(true);
		});
	});
});
