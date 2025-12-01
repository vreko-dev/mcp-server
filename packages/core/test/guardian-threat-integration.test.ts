import { beforeEach, describe, expect, it } from "vitest";
import { SimpleCircuitBreaker } from "../src/circuit-breaker.js";
import { Guardian } from "../src/guardian.js";
import { detectThreats } from "../src/threat-detection.js";

describe("Guardian Threat Integration", () => {
	let guardian: Guardian;
	let circuitBreaker: SimpleCircuitBreaker;

	beforeEach(() => {
		guardian = new Guardian();
		circuitBreaker = new SimpleCircuitBreaker();
	});

	it("should integrate threat detection with Guardian analysis", async () => {
		const dangerousCode = `
      const password = "secret123"
      rm -rf /tmp/important_files
      console.log("This code has security issues")
    `;

		// First, detect threats directly
		const threats = detectThreats(dangerousCode);
		expect(threats).toHaveLength(2);

		// Then analyze with Guardian (separate concerns)
		const result = await guardian.analyze(dangerousCode);

		// The result should be valid (not throw an error)
		expect(result.score).toBeGreaterThanOrEqual(0);
		expect(Array.isArray(result.factors)).toBe(true);
	});

	it("should use circuit breaker for Guardian analysis", async () => {
		// This test shows how to wrap Guardian analysis with a circuit breaker
		const safeCode = 'const x = 1;\nconsole.log("hello");';

		const analyzeWithCircuitBreaker = async (code: string) => {
			return await circuitBreaker.execute(async () => {
				return await guardian.analyze(code);
			});
		};

		const result = await analyzeWithCircuitBreaker(safeCode);
		expect(result.score).toBeGreaterThanOrEqual(0);
	});

	it("should open circuit breaker after repeated failures", async () => {
		// Create a failing analysis function
		const failingAnalysis = async () => {
			return await circuitBreaker.execute(async () => {
				throw new Error("Analysis failed");
			});
		};

		// Fail twice
		await expect(failingAnalysis()).rejects.toThrow("Analysis failed");
		await expect(failingAnalysis()).rejects.toThrow("Analysis failed");

		// Third failure should open the circuit
		await expect(failingAnalysis()).rejects.toThrow("Circuit breaker open");
	});
});
