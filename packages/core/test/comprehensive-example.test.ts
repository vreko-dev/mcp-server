import { describe, expect, it } from "vitest";
import { SimpleCircuitBreaker } from "../src/circuit-breaker.js";
import { Guardian } from "../src/guardian.js";
import { detectThreats } from "../src/threat-detection.js";

// This test demonstrates a comprehensive example of how to use the new features
describe("Comprehensive Example", () => {
	it("should demonstrate threat detection, circuit breaker, and Guardian integration", async () => {
		// 1. Threat Detection Example
		const suspiciousCode = `
      const password = "mySecretPassword123";
      const apiKey = "abc123xyz";
      rm -rf /tmp/sensitive_data;
      DROP TABLE users;
    `;

		const threats = detectThreats(suspiciousCode);
		expect(threats).toHaveLength(4);

		// Verify threat types
		const criticalThreats = threats.filter((t) => t.severity === 1.0);
		const highThreats = threats.filter((t) => t.severity === 0.8);

		expect(criticalThreats).toHaveLength(2); // rm -rf, DROP TABLE
		expect(highThreats).toHaveLength(2); // password, apiKey

		// 2. Circuit Breaker Example
		const circuitBreaker = new SimpleCircuitBreaker();

		// Successful operation
		const result = await circuitBreaker.execute(async () => {
			return "Operation successful";
		});
		expect(result).toBe("Operation successful");

		// 3. Guardian Analysis Example
		const guardian = new Guardian();
		const analysisResult = await guardian.analyze(suspiciousCode);

		// Analysis should complete without error
		expect(analysisResult.score).toBeGreaterThanOrEqual(0);
		expect(Array.isArray(analysisResult.factors)).toBe(true);

		// 4. Combined Usage Example
		const analyzeCodeSafely = async (code: string) => {
			// First, check for obvious threats
			const threats = detectThreats(code);

			// If critical threats found, reject immediately
			const criticalThreats = threats.filter((t) => t.severity === 1.0);
			if (criticalThreats.length > 0) {
				throw new Error(
					`Critical security threats detected: ${criticalThreats.map((t) => t.description).join(", ")}`,
				);
			}

			// Use circuit breaker for analysis
			const circuitBreaker = new SimpleCircuitBreaker();
			return await circuitBreaker.execute(async () => {
				const guardian = new Guardian();
				return await guardian.analyze(code);
			});
		};

		// This should throw an error due to critical threats
		await expect(analyzeCodeSafely(suspiciousCode)).rejects.toThrow("Critical security threats detected");

		// This should succeed
		const safeCode = 'const x = 1;\nconsole.log("Hello, world!");';
		const safeResult = await analyzeCodeSafely(safeCode);
		expect(safeResult.score).toBeGreaterThanOrEqual(0);
	});
});
