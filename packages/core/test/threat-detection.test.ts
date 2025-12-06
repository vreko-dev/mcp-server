import { beforeEach, describe, expect, it } from "vitest";
import { SimpleCircuitBreaker } from "../src/circuit-breaker";
import { detectThreats, ThreatDetector } from "../src/threat-detection";

describe("Threat Detection", () => {
	describe("detectThreats", () => {
		it("should detect critical threats", () => {
			const code = "rm -rf /important/files";
			const threats = detectThreats(code);

			expect(threats).toHaveLength(1);
			expect(threats[0].severity).toBe(1.0);
			expect(threats[0].description).toBe("rm -rf");
		});

		it("should detect high threats", () => {
			const code = 'const password = "secret123"';
			const threats = detectThreats(code);

			expect(threats).toHaveLength(1);
			expect(threats[0].severity).toBe(0.8);
			expect(threats[0].description).toBe("hardcoded password");
		});

		it("should detect multiple threats", () => {
			const code = `
        rm -rf /tmp
        const password = "secret123"
        const apiKey = "12345"
      `;
			const threats = detectThreats(code);

			expect(threats).toHaveLength(3);
			const criticalThreats = threats.filter((t) => t.severity === 1.0);
			const highThreats = threats.filter((t) => t.severity === 0.8);

			expect(criticalThreats).toHaveLength(1);
			expect(highThreats).toHaveLength(2);
		});

		it("should return empty array for safe code", () => {
			const code = 'const x = 1\nconsole.log("hello")';
			const threats = detectThreats(code);

			expect(threats).toHaveLength(0);
		});
	});

	describe("ThreatDetector", () => {
		let detector: ThreatDetector;

		beforeEach(() => {
			detector = new ThreatDetector();
		});

		it("should create threat detector instance", () => {
			expect(detector).toBeDefined();
		});

		it("should detect threats using class method", () => {
			const code = "DROP TABLE users";
			const threats = detector.detect(code);

			expect(threats).toHaveLength(1);
			expect(threats[0].severity).toBe(1.0);
			expect(threats[0].description).toBe("DROP TABLE");
		});
	});
});

describe("SimpleCircuitBreaker", () => {
	let circuitBreaker: SimpleCircuitBreaker;

	beforeEach(() => {
		circuitBreaker = new SimpleCircuitBreaker();
	});

	it("should execute function successfully", async () => {
		const result = await circuitBreaker.execute(async () => "success");
		expect(result).toBe("success");
	});

	it("should track failures and open circuit", async () => {
		const failingFunction = async () => {
			throw new Error("failure");
		};

		// First two failures should not open the circuit
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow("failure");
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow("failure");

		// Third failure should open the circuit
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrowError("Circuit breaker open");
	});

	it("should reset failure count on success", async () => {
		const failingFunction = async () => {
			throw new Error("failure");
		};

		// Fail twice
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow("failure");
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow("failure");

		// Succeed - this should reset the failure count
		await circuitBreaker.execute(async () => "success");

		// Fail again - should not open circuit yet since count was reset
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow("failure");

		// Fail again - should not open circuit yet (only 2 failures since reset)
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow("failure");

		// Third failure since reset should open circuit
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrowError("Circuit breaker open");
	});
});
