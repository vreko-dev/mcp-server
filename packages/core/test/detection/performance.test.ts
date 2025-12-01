import { describe, expect, it } from "vitest";
import { MockReplacementPlugin } from "../../src/detection/plugins/mock-replacement.js";
import { PhantomDependencyPlugin } from "../../src/detection/plugins/phantom-dependency.js";
import { SecretDetectionPlugin } from "../../src/detection/plugins/secret-detection.js";
import { Guardian } from "../../src/guardian.js";

describe("Detection Performance Tests", () => {
	it("should analyze code within 200ms P95 latency", async () => {
		const guardian = new Guardian();
		guardian.addPlugin(new SecretDetectionPlugin());
		guardian.addPlugin(new MockReplacementPlugin());
		guardian.addPlugin(new PhantomDependencyPlugin());

		// Create a realistic code sample
		const code = `
      // Secret detection
      const awsKey = "AKIAIOSFODNN7EXAMPLE";
      const openaiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      
      // Mock replacement detection
      jest.mock("../services/api");
      
      // Phantom dependency detection
      import { someFunction } from "non-declared-package";
      
      export class Service {
        doSomething() {
          return someFunction();
        }
        
        processUser(user) {
          const mockUser = { id: 1, name: "Test User" };
          return mockUser;
        }
      }
    `;

		// Run multiple analyses to get a good average
		const iterations = 10;
		const durations: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			await guardian.analyze(code, "/Users/user1/WebstormProjects/snapback-site/packages/core/test/service.ts");
			const end = performance.now();
			durations.push(end - start);
		}

		// Calculate P95 (95th percentile)
		durations.sort((a, b) => a - b);
		const p95Index = Math.floor(durations.length * 0.95);
		const p95Latency = durations[p95Index];

		// Should be under 200ms P95
		expect(p95Latency).toBeLessThan(200);

		// Log the results for debugging
		console.log(`Performance Test Results:
      Average: ${durations.reduce((a, b) => a + b, 0) / durations.length}ms
      P95: ${p95Latency}ms
      Min: ${Math.min(...durations)}ms
      Max: ${Math.max(...durations)}ms`);
	});

	it("should handle large files efficiently", async () => {
		const guardian = new Guardian();
		guardian.addPlugin(new SecretDetectionPlugin());
		guardian.addPlugin(new MockReplacementPlugin());
		guardian.addPlugin(new PhantomDependencyPlugin());

		// Create a large file (10KB)
		const largeCode = "a".repeat(10000);

		const start = performance.now();
		await guardian.analyze(
			largeCode,
			"/Users/user1/WebstormProjects/snapback-site/packages/core/test/large-file.ts",
		);
		const end = performance.now();

		const duration = end - start;

		// Should still be under 200ms even for large files
		expect(duration).toBeLessThan(200);
	});
});
