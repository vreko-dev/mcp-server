/**
 * Validation Module Unit Tests
 *
 * TDD tests for security validation functions
 */

import { describe, expect, it } from "vitest";
import {
	getAllowedCorsOrigin,
	getMaxBodySize,
	validateApiKey,
	validateCorsOrigin,
	validateWorkspace,
	validateWorkspaceId,
} from "../validation";

describe("validation", () => {
	describe("validateWorkspaceId", () => {
		it("should return valid for correct workspace ID format", () => {
			const result = validateWorkspaceId("ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should return invalid for undefined", () => {
			const result = validateWorkspaceId(undefined);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing workspace ID");
		});

		it("should return invalid for empty string", () => {
			const result = validateWorkspaceId("");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing workspace ID");
		});

		it("should return invalid for whitespace-only string", () => {
			const result = validateWorkspaceId("   ");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing workspace ID");
		});

		it("should return invalid for missing ws_ prefix", () => {
			const result = validateWorkspaceId("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid workspace ID format");
		});

		it("should return invalid for wrong prefix", () => {
			const result = validateWorkspaceId("wk_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid workspace ID format");
		});

		it("should return invalid for uppercase hex characters", () => {
			const result = validateWorkspaceId("ws_A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid workspace ID format");
		});

		it("should return invalid for non-hex characters", () => {
			const result = validateWorkspaceId("ws_g1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid workspace ID format");
		});

		it("should return invalid for too short hex part", () => {
			const result = validateWorkspaceId("ws_a1b2c3d4");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid workspace ID format");
		});

		it("should return invalid for too long hex part", () => {
			const result = validateWorkspaceId("ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6abcd");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid workspace ID");
		});

		it("should return invalid for dangerous characters (command injection)", () => {
			// These would fail the pattern first, but verify defense in depth
			const result = validateWorkspaceId("ws_a1b2c3d4e5f6a7b8c9d0e1f2;rm -rf");
			expect(result.valid).toBe(false);
		});

		it("should accept all valid lowercase hex characters", () => {
			// Using all hex chars: 0-9, a-f
			const result = validateWorkspaceId("ws_0123456789abcdef0123456789abcdef");
			expect(result.valid).toBe(true);
		});
	});

	describe("validateApiKey", () => {
		it("should return valid for sk_live_ format", () => {
			const result = validateApiKey("sk_live_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(true);
		});

		it("should return valid for sk_test_ format", () => {
			const result = validateApiKey("sk_test_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(true);
		});

		it("should return invalid for undefined", () => {
			const result = validateApiKey(undefined);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing API key");
		});

		it("should return invalid for empty string", () => {
			const result = validateApiKey("");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing API key");
		});

		it("should return invalid for wrong prefix", () => {
			const result = validateApiKey("sb_live_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid API key format");
		});

		it("should return invalid for dangerous characters", () => {
			const result = validateApiKey("sk_live_test; DROP TABLE users;");
			expect(result.valid).toBe(false);
		});
	});

	describe("validateWorkspace", () => {
		it("should return valid for absolute path", () => {
			const result = validateWorkspace("/tmp/valid-workspace");
			expect(result.valid).toBe(true);
		});

		it("should return invalid for undefined", () => {
			const result = validateWorkspace(undefined);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing workspace parameter");
		});

		it("should return invalid for relative path", () => {
			const result = validateWorkspace("relative/path");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Must be an absolute path");
		});

		it("should return invalid for path traversal", () => {
			const result = validateWorkspace("/tmp/../../../etc/passwd");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Path traversal detected");
		});

		it("should return invalid for null bytes", () => {
			const result = validateWorkspace("/tmp/test\0/malicious");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("null bytes");
		});

		it("should return invalid for dangerous characters", () => {
			const result = validateWorkspace("/tmp/test; rm -rf /");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("illegal characters");
		});
	});

	describe("validateCorsOrigin", () => {
		it("should allow wildcard in non-production", () => {
			const result = validateCorsOrigin("*", "development");
			expect(result.valid).toBe(true);
		});

		it("should reject wildcard in production", () => {
			const result = validateCorsOrigin("*", "production");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Wildcard CORS origin");
		});

		it("should allow specific origin in production", () => {
			const result = validateCorsOrigin("https://app.snapback.dev", "production");
			expect(result.valid).toBe(true);
		});
	});

	describe("getAllowedCorsOrigin", () => {
		it("should return wildcard when allowed", () => {
			const result = getAllowedCorsOrigin("https://any.com", "*");
			expect(result).toBe("*");
		});

		it("should return matching origin from list", () => {
			const result = getAllowedCorsOrigin(
				"https://app.snapback.dev",
				"https://app.snapback.dev,https://www.snapback.dev",
			);
			expect(result).toBe("https://app.snapback.dev");
		});

		it("should return null for non-matching origin", () => {
			const result = getAllowedCorsOrigin("https://evil.com", "https://app.snapback.dev");
			expect(result).toBeNull();
		});

		it("should return first allowed origin when no request origin", () => {
			const result = getAllowedCorsOrigin(undefined, "https://app.snapback.dev,https://www.snapback.dev");
			expect(result).toBe("https://app.snapback.dev");
		});
	});

	describe("getMaxBodySize", () => {
		it("should return 10MB", () => {
			expect(getMaxBodySize()).toBe(10 * 1024 * 1024);
		});
	});
});
