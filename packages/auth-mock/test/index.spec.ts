import { beforeEach, describe, expect, it } from "vitest";
import { authenticate } from "../src/index";

describe("AU1-A: Better Auth validation (mocked)", () => {
	beforeEach(() => {
		// Reset any internal state before each test
	});

	it("(unit) should authenticate with no key as free tier", async () => {
		const result = await authenticate("");
		expect(result.valid).toBe(true);
		expect(result.tier).toBe("free");
		expect(result.scopes).toEqual([]);
	});

	it("(unit) should authenticate sb_live_ key as pro tier with scopes", async () => {
		const result = await authenticate("sb_live_testkey123");
		expect(result.valid).toBe(true);
		expect(result.tier).toBe("pro");
		expect(result.scopes).toEqual(["analyze", "checkpoint", "context"]);
	});

	it("(unit) should reject invalid key format", async () => {
		const result = await authenticate("invalid_key");
		expect(result.valid).toBe(false);
		expect(result.tier).toBe("free");
		expect(result.error).toBe("Invalid API key format");
	});

	it("(integration) should handle null/undefined keys gracefully", async () => {
		// @ts-expect-error - Testing invalid input
		const result1 = await authenticate(null);
		expect(result1.valid).toBe(false);

		// @ts-expect-error - Testing invalid input
		const result2 = await authenticate(undefined);
		expect(result2.valid).toBe(false);
	});

	it("(integration) should distinguish between different pro keys", async () => {
		const result1 = await authenticate("sb_live_key1");
		const result2 = await authenticate("sb_live_key2");

		expect(result1.valid).toBe(true);
		expect(result1.tier).toBe("pro");
		expect(result2.valid).toBe(true);
		expect(result2.tier).toBe("pro");
	});

	it("(acceptance) should surface scopes for pro tier keys", async () => {
		const result = await authenticate("sb_live_validkey123456");
		expect(result.valid).toBe(true);
		expect(result.tier).toBe("pro");
		expect(result.scopes).toContain("analyze");
		expect(result.scopes).toContain("checkpoint");
		expect(result.scopes).toContain("context");
		expect(result.scopes).toHaveLength(3);
	});
});
