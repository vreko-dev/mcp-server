import { describe, expect, it } from "vitest";
import { MockReplacementPlugin } from "../../src/detection/plugins/mock-replacement.js";
import { PhantomDependencyPlugin } from "../../src/detection/plugins/phantom-dependency.js";
import { SecretDetectionPlugin } from "../../src/detection/plugins/secret-detection.js";
import { Guardian } from "../../src/guardian.js";

describe("Detection Memory Tests", () => {
	it("should use less than 100MB memory", async () => {
		// Get initial memory usage
		const initialMemory = process.memoryUsage();

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

		// Run multiple analyses to stress test memory usage
		for (let i = 0; i < 100; i++) {
			await guardian.analyze(code, "/Users/user1/WebstormProjects/snapback-site/packages/core/test/service.ts");
		}

		// Get final memory usage
		const finalMemory = process.memoryUsage();

		// Calculate memory usage in MB
		const initialMB = initialMemory.heapUsed / 1024 / 1024;
		const finalMB = finalMemory.heapUsed / 1024 / 1024;
		const memoryUsed = finalMB - initialMB;

		// Should use less than 100MB
		expect(memoryUsed).toBeLessThan(100);

		// Log the results for debugging
		console.log(`Memory Test Results:
      Initial: ${initialMB.toFixed(2)} MB
      Final: ${finalMB.toFixed(2)} MB
      Used: ${memoryUsed.toFixed(2)} MB`);
	});

	it("should not have memory leaks with repeated analyses", async () => {
		const guardian = new Guardian();
		guardian.addPlugin(new SecretDetectionPlugin());
		guardian.addPlugin(new MockReplacementPlugin());
		guardian.addPlugin(new PhantomDependencyPlugin());

		// Create a realistic code sample
		const code = `
      // Secret detection
      const awsKey = "AKIAIOSFODNN7EXAMPLE";
      
      export class Service {
        doSomething() {
          return "result";
        }
      }
    `;

		// Run many analyses and check that memory doesn't grow unbounded
		const memoryReadings: number[] = [];

		for (let i = 0; i < 50; i++) {
			await guardian.analyze(code, "/Users/user1/WebstormProjects/snapback-site/packages/core/test/service.ts");

			// Take memory reading every 10 iterations
			if (i % 10 === 0) {
				const memory = process.memoryUsage();
				memoryReadings.push(memory.heapUsed / 1024 / 1024);
			}
		}

		// Check that memory usage doesn't grow linearly
		// We allow some growth due to caching, but not unbounded growth
		const initialMemory = memoryReadings[0];
		const finalMemory = memoryReadings[memoryReadings.length - 1];
		const growth = finalMemory - initialMemory;

		// Should not grow more than 10MB over 50 iterations
		expect(growth).toBeLessThan(10);

		// Log the results for debugging
		console.log(`Memory Growth Test Results:
      Initial: ${initialMemory.toFixed(2)} MB
      Final: ${finalMemory.toFixed(2)} MB
      Growth: ${growth.toFixed(2)} MB`);
	});
});
