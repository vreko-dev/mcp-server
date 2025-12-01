import { describe, expect, it } from "vitest";
import { MCPFallbacks } from "../src/mcp-fallbacks.js";
import { ServiceFederation } from "../src/mcp-federation.js";

describe("ServiceFederation Integration", () => {
	it("should handle full service federation with fallbacks when partner services are unavailable", async () => {
		const federation = new ServiceFederation();

		// No services registered, so all calls should fallback

		// Test docs service fallback through federation
		const docsResult = await federation.executeWithFallback(
			"docs",
			() => Promise.reject(new Error("Docs service not available")),
			() => MCPFallbacks.docsFallback("test query"),
		);

		// Test git service fallback through federation
		const gitResult = await federation.executeWithFallback(
			"git",
			() => Promise.reject(new Error("Git service not available")),
			() => MCPFallbacks.gitFallback("git diff HEAD~1"),
		);

		// Test filesystem service fallback through federation
		const fsResult = await federation.executeWithFallback(
			"fs",
			() => Promise.reject(new Error("Filesystem service not available")),
			() => MCPFallbacks.fsFallback("read", "/test/file.js"),
		);

		expect(docsResult).toContain("Local documentation search result for: test query");
		expect(gitResult).toContain("Local git command result for: git diff HEAD~1");
		expect(fsResult).toContain("Local filesystem operation result for read on /test/file.js");
	});

	it("should use partner services when available and fallback when they fail", async () => {
		const federation = new ServiceFederation();

		// Register partner services
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

		// Test successful service call
		const successfulDocsResult = await federation.executeWithFallback(
			"docs",
			() => Promise.resolve("Successful Context7 result"),
			() => MCPFallbacks.docsFallback("test query"),
		);

		expect(successfulDocsResult).toBe("Successful Context7 result");

		// Test failed service call that falls back
		const failedDocsResult = await federation.executeWithFallback(
			"docs",
			() => Promise.reject(new Error("Context7 unavailable")),
			() => MCPFallbacks.docsFallback("test query"),
		);

		expect(failedDocsResult).toContain("Local documentation search result for: test query");
	});

	it("should implement circuit breaker pattern and open after 3 failures", async () => {
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

	it("should cache service responses and use cached values", async () => {
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
			"test-cache-key",
			() => {
				callCount++;
				return Promise.resolve(`Service result ${callCount}`);
			},
			() => "Fallback result",
		);

		// Second call - should use cache
		const result2 = await federation.executeWithCache(
			"docs",
			"test-cache-key",
			() => {
				callCount++;
				// This function should not be called due to caching
				return Promise.resolve(`Service result ${callCount}`);
			},
			() => "Fallback result",
		);

		expect(result1).toBe("Service result 1");
		expect(result2).toBe("Service result 1"); // Should be cached
		expect(callCount).toBe(1); // Should only have been called once
	});

	it("should timeout slow service calls and fallback", async () => {
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

	it("should combine all features in a realistic scenario", async () => {
		const federation = new ServiceFederation();

		// Register partner services
		federation.registerService("docs", {
			name: "context7",
			type: "docs",
		});

		// Simulate a dependency upgrade scenario
		const upgradeAdvice = federation.prepareUpgradeAdvice({
			before: { lodash: "4.17.20" },
			after: { lodash: "4.17.21" },
		});

		// If we have Context7 available, use it for documentation
		const docsResult = await federation.executeWithCache(
			"docs",
			"upgrade-lodash-4.17.21",
			() => Promise.resolve("Context7: lodash 4.17.21 has security fixes"),
			() => MCPFallbacks.docsFallback("lodash 4.17.21 migration"),
		);

		// Analyze the risk of the upgrade
		const riskAnalysis = federation.analyzeRisk({
			changes: [
				{
					added: false,
					removed: false,
					value: "dependency upgrade lodash 4.17.20 -> 4.17.21",
					count: 1,
				},
			],
		});

		// Verify the results
		expect(upgradeAdvice).toHaveProperty("summary");
		expect(docsResult).toContain("Context7: lodash 4.17.21 has security fixes");
		expect(riskAnalysis).toHaveProperty("score");
	});
});
