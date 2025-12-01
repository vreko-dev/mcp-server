import { describe, expect, it } from "vitest";
import { ServiceFederation } from "../src/mcp-federation.js";

describe("ServiceFederation", () => {
	it("should create an instance of ServiceFederation", () => {
		const federation = new ServiceFederation();
		expect(federation).toBeInstanceOf(ServiceFederation);
	});

	it("should discover capabilities and return partner service information", () => {
		const federation = new ServiceFederation();
		const capabilities = federation.discoverCapabilities();

		// Should return an object with potential service capabilities
		expect(capabilities).toBeTypeOf("object");

		// Initially should return empty capabilities
		expect(Object.keys(capabilities)).toHaveLength(0);
	});

	it("should allow registering partner service capabilities", () => {
		const federation = new ServiceFederation();

		// Register a mock docs service
		federation.registerService("docs", {
			name: "context7",
			type: "docs",
		});

		const capabilities = federation.discoverCapabilities();

		// Should now have docs capability
		expect(capabilities).toHaveProperty("docs");
		expect(capabilities.docs).toEqual({
			name: "context7",
			type: "docs",
		});
	});

	it("should allow registering multiple partner service capabilities", () => {
		const federation = new ServiceFederation();

		// Register multiple services
		federation.registerService("docs", {
			name: "context7",
			type: "docs",
		});

		federation.registerService("git", {
			name: "git",
			type: "git",
			tools: {
				diff: "git.diff",
				blame: "git.blame",
			},
		});

		const capabilities = federation.discoverCapabilities();

		// Should now have both docs and git capabilities
		expect(capabilities).toHaveProperty("docs");
		expect(capabilities).toHaveProperty("git");
		expect(capabilities.docs).toEqual({
			name: "context7",
			type: "docs",
		});
		expect(capabilities.git).toEqual({
			name: "git",
			type: "git",
			tools: {
				diff: "git.diff",
				blame: "git.blame",
			},
		});
	});

	it("should provide fallback when service is not available", async () => {
		const federation = new ServiceFederation();

		// Try to execute a function with fallback
		const result = await federation.executeWithFallback(
			"docs",
			() => Promise.resolve("Service result"),
			() => "Fallback result",
		);

		// Should return fallback result since no docs service is registered
		expect(result).toBe("Fallback result");
	});

	it("should use service function when service is available", async () => {
		const federation = new ServiceFederation();

		// Register a docs service
		federation.registerService("docs", {
			name: "context7",
			type: "docs",
		});

		// Try to execute a function with fallback
		const result = await federation.executeWithFallback(
			"docs",
			() => Promise.resolve("Service result"),
			() => "Fallback result",
		);

		// Should return service result since docs service is registered
		expect(result).toBe("Service result");
	});

	it("should fallback when service is available but fails", async () => {
		const federation = new ServiceFederation();

		// Register a docs service
		federation.registerService("docs", {
			name: "context7",
			type: "docs",
		});

		// Try to execute a function with fallback that throws an error
		const result = await federation.executeWithFallback(
			"docs",
			() => Promise.reject(new Error("Service error")),
			() => "Fallback result",
		);

		// Should return fallback result since service function failed
		expect(result).toBe("Fallback result");
	});

	it("should open circuit breaker after 3 failures", async () => {
		const federation = new ServiceFederation();

		// Register a docs service
		federation.registerService("docs", {
			name: "context7",
			type: "docs",
		});

		// Fail 3 times in a row
		for (let i = 0; i < 3; i++) {
			await federation.executeWithFallback(
				"docs",
				() => Promise.reject(new Error("Service error")),
				() => "Fallback result",
			);
		}

		// The 4th call should immediately fallback without calling the service function
		let serviceCalled = false;
		const result = await federation.executeWithFallback(
			"docs",
			() => {
				serviceCalled = true;
				return Promise.resolve("Service result");
			},
			() => "Fallback result",
		);

		// Should return fallback result immediately without calling service
		expect(result).toBe("Fallback result");
		expect(serviceCalled).toBe(false);
	});

	it("should timeout service calls after specified time", async () => {
		const federation = new ServiceFederation();

		// Register a docs service
		federation.registerService("docs", {
			name: "context7",
			type: "docs",
		});

		// Try to execute a function that takes longer than timeout
		const result = await federation.executeWithTimeout(
			"docs",
			() => new Promise((resolve) => setTimeout(() => resolve("Service result"), 100)),
			() => "Fallback result",
			10, // 10ms timeout
		);

		// Should return fallback result due to timeout
		expect(result).toBe("Fallback result");
	});

	it("should cache service responses", async () => {
		const federation = new ServiceFederation();

		// Register a docs service
		federation.registerService("docs", {
			name: "context7",
			type: "docs",
		});

		let callCount = 0;

		// Execute the same function twice
		const result1 = await federation.executeWithCache(
			"docs",
			"test-key",
			() => {
				callCount++;
				return Promise.resolve(`Service result ${callCount}`);
			},
			() => "Fallback result",
		);

		const result2 = await federation.executeWithCache(
			"docs",
			"test-key",
			() => {
				callCount++;
				// This function should not be called due to caching
				return Promise.resolve(`Service result ${callCount}`);
			},
			() => "Fallback result",
		);

		// Should return cached result on second call
		expect(result1).toBe("Service result 1");
		expect(result2).toBe("Service result 1"); // Should be the same as first result
		expect(callCount).toBe(1); // Should only have been called once
	});

	it("should combine all features: timeout, circuit breaker, and cache", async () => {
		const federation = new ServiceFederation();

		// Register a docs service
		federation.registerService("docs", {
			name: "context7",
			type: "docs",
		});

		let callCount = 0;

		// First call - should succeed and be cached
		const result1 = await federation.executeWithCache(
			"docs",
			"combined-test",
			() => {
				callCount++;
				return Promise.resolve(`Service result ${callCount}`);
			},
			() => "Fallback result",
		);

		// Second call - should use cache
		const result2 = await federation.executeWithCache(
			"docs",
			"combined-test",
			() => {
				callCount++;
				// This function should not be called due to caching
				return Promise.resolve(`Service result ${callCount}`);
			},
			() => "Fallback result",
		);

		// Third call with timeout - should use cache (need to wrap in timeout)
		const result3 = await federation.executeWithTimeout(
			"docs",
			() =>
				federation.executeWithCache(
					"docs",
					"combined-test",
					() => {
						// This function should not be called due to caching
						return new Promise((resolve) => setTimeout(() => resolve("Slow service result"), 100));
					},
					() => "Fallback result",
				),
			() => "Fallback result",
			50, // 50ms timeout
		);

		expect(result1).toBe("Service result 1");
		expect(result2).toBe("Service result 1"); // Should be cached
		expect(result3).toBe("Service result 1"); // Should be cached
		expect(callCount).toBe(1); // Should only have been called once
	});

	it("should provide fallback implementations for different service types", async () => {
		const federation = new ServiceFederation();

		// Test docs service fallback
		const docsResult = await federation.executeWithFallback(
			"docs",
			() => Promise.reject(new Error("Docs service not available")),
			() => "Local documentation search result",
		);

		// Test git service fallback
		const gitResult = await federation.executeWithFallback(
			"git",
			() => Promise.reject(new Error("Git service not available")),
			() => "Local git diff result",
		);

		// Test filesystem service fallback
		const fsResult = await federation.executeWithFallback(
			"fs",
			() => Promise.reject(new Error("Filesystem service not available")),
			() => "Local file read result",
		);

		expect(docsResult).toBe("Local documentation search result");
		expect(gitResult).toBe("Local git diff result");
		expect(fsResult).toBe("Local file read result");
	});

	it("should implement core SnapBack tools", () => {
		const federation = new ServiceFederation();

		// Test discoverCapabilities
		const capabilities = federation.discoverCapabilities();
		expect(capabilities).toBeTypeOf("object");

		// Test analyzeRisk
		const riskResult = federation.analyzeRisk({ changes: [] });
		expect(riskResult).toHaveProperty("score");
		expect(riskResult).toHaveProperty("factors");

		// Test prepareUpgradeAdvice
		const upgradeAdvice = federation.prepareUpgradeAdvice({
			before: {},
			after: {},
		});
		expect(upgradeAdvice).toHaveProperty("summary");

		// Test verifyAIChange
		const aiVerify = federation.verifyAIChange({
			file: "test.js",
			diff: [],
		});
		expect(aiVerify).toHaveProperty("risk");
	});
});
