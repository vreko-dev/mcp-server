/**
 * Performance Testing Harness
 * Provides benchmarking utilities with budget enforcement and variance tracking
 */

import { readFile, writeFile } from "node:fs/promises";
import { cpus, platform, totalmem } from "node:os";
import { performance } from "node:perf_hooks";

export interface BenchmarkResult {
	name: string;
	p50: number;
	p90: number;
	p95: number;
	iterations: number;
	timestamp: number;
}

export interface PerformanceBudget {
	name: string;
	p95: number; // Maximum allowed p95 in milliseconds
	variance: number; // Allowed variance (e.g., 0.2 for ±20%)
}

export interface BudgetCheckResult {
	passed: boolean;
	name: string;
	actual: number;
	budget: number;
	maxAllowed: number;
	variance: number;
	message?: string;
}

export interface BenchmarkOptions {
	iterations?: number;
	warmup?: number;
}

export interface Benchmark {
	run: <T>(fn: () => Promise<T> | T) => Promise<BenchmarkResult>;
}

interface BaselineData {
	hardware: {
		cpu: string;
		memory: number;
		os: string;
		ci_runner?: string;
	};
	results: BenchmarkResult[];
	timestamp: number;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
	const index = Math.ceil((sorted.length * p) / 100) - 1;
	return sorted[Math.max(0, index)];
}

/**
 * Get hardware specifications for baseline recording
 */
function getHardwareSpecs() {
	const cpu = cpus()[0]?.model || "Unknown CPU";
	const memory = Math.round(totalmem() / (1024 * 1024 * 1024)); // GB
	const os = platform();
	const ci_runner = process.env.CI ? process.env.RUNNER_OS || "CI" : undefined;

	return { cpu, memory, os, ci_runner };
}

/**
 * Create a benchmark for measuring operation performance
 */
export function createBenchmark(name: string, options: BenchmarkOptions = {}): Benchmark {
	const iterations = options.iterations ?? 10;
	const warmup = options.warmup ?? 2;

	return {
		async run<T>(fn: () => Promise<T> | T): Promise<BenchmarkResult> {
			const measurements: number[] = [];

			// Warmup runs
			for (let i = 0; i < warmup; i++) {
				await fn();
			}

			// Actual benchmark runs
			for (let i = 0; i < iterations; i++) {
				const start = performance.now();
				await fn();
				const end = performance.now();
				measurements.push(end - start);
			}

			// Sort for percentile calculation
			const sorted = measurements.sort((a, b) => a - b);

			return {
				name,
				p50: percentile(sorted, 50),
				p90: percentile(sorted, 90),
				p95: percentile(sorted, 95),
				iterations,
				timestamp: Date.now(),
			};
		},
	};
}

/**
 * Check if benchmark result meets performance budget
 */
export function checkBudget(result: BenchmarkResult, budget: PerformanceBudget): BudgetCheckResult {
	const maxAllowed = budget.p95 * (1 + budget.variance);
	const passed = result.p95 <= maxAllowed;

	const message = passed
		? `✓ ${result.name}: ${result.p95.toFixed(2)}ms (budget: ${budget.p95}ms, max: ${maxAllowed.toFixed(2)}ms)`
		: `✗ ${result.name}: ${result.p95.toFixed(2)}ms exceeds budget (max: ${maxAllowed.toFixed(2)}ms)`;

	return {
		passed,
		name: result.name,
		actual: result.p95,
		budget: budget.p95,
		maxAllowed,
		variance: budget.variance,
		message,
	};
}

/**
 * Save benchmark results as baseline
 */
export async function saveBaseline(results: BenchmarkResult[], path = "./.perf-baseline.json"): Promise<void> {
	const data: BaselineData = {
		hardware: getHardwareSpecs(),
		results,
		timestamp: Date.now(),
	};

	await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Load baseline benchmark results
 */
export async function loadBaseline(path = "./.perf-baseline.json"): Promise<BenchmarkResult[]> {
	try {
		const content = await readFile(path, "utf-8");
		const data: BaselineData = JSON.parse(content);
		return data.results;
	} catch {
		return [];
	}
}

/**
 * Alpha performance budgets (as per design spec)
 */
export const ALPHA_BUDGETS: PerformanceBudget[] = [
	{
		name: "snapshot-creation",
		p95: 100, // <100ms
		variance: 0.2, // ±20%
	},
	{
		name: "risk-analysis",
		p95: 500, // <500ms
		variance: 0.2,
	},
	{
		name: "session-tracking",
		p95: 50, // <50ms
		variance: 0.2,
	},
	{
		name: "analytics-tti",
		p95: 2000, // <2000ms
		variance: 0.2,
	},
];
