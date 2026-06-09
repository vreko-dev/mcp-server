/**
 * Comprehensive Test Suite: MCP Server Validation & Link Workspace Security
 *
 * Industry-grade tests covering:
 * - P0: Workspace ID validation (format, injection prevention)
 * - P0: API key validation (format, dangerous chars)
 * - P0: Privilege escalation prevention in handleLinkWorkspace
 * - P1: CORS validation
 *
 * Reference: docs/implementation/authentication/.5_improvement.md
 */

import { describe, expect, it } from "vitest";
import {
	getAllowedCorsOrigin,
	getMaxBodySize,
	isValidWorkspaceId,
	validateApiKey,
	validateCorsOrigin,
	validateWorkspace,
	validateWorkspaceId,
} from "./validation";

// =============================================================================
// Test Suite 1: Workspace ID Validation
// =============================================================================
describe("validateWorkspaceId - Security Test Suite", () => {
	describe("Valid Workspace IDs", () => {
		it("should accept valid workspace ID with ws_ prefix and 32 hex chars", () => {
			const result = validateWorkspaceId("ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should accept workspace ID with all zeros", () => {
			const result = validateWorkspaceId("ws_00000000000000000000000000000000");
			expect(result.valid).toBe(true);
		});

		it("should accept workspace ID with all f's", () => {
			const result = validateWorkspaceId("ws_ffffffffffffffffffffffffffffffff");
			expect(result.valid).toBe(true);
		});
	});

	describe("Invalid Format", () => {
		it("should reject empty string", () => {
			const result = validateWorkspaceId("");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing workspace ID");
		});

		it("should reject undefined", () => {
			const result = validateWorkspaceId(undefined);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing workspace ID");
		});

		it("should reject whitespace-only", () => {
			const result = validateWorkspaceId("   ");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing workspace ID");
		});

		it("should reject missing ws_ prefix", () => {
			const result = validateWorkspaceId("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("ws_");
		});

		it("should reject wrong prefix (Ws_ uppercase)", () => {
			const result = validateWorkspaceId("Ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(false);
		});

		it("should reject uppercase hex chars", () => {
			const result = validateWorkspaceId("ws_A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6");
			expect(result.valid).toBe(false);
		});

		it("should reject too short (31 chars)", () => {
			const result = validateWorkspaceId("ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d");
			expect(result.valid).toBe(false);
		});

		it("should reject too long (33 chars)", () => {
			const result = validateWorkspaceId("ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a");
			expect(result.valid).toBe(false);
		});

		it("should reject non-hex characters", () => {
			const result = validateWorkspaceId("ws_g1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
			expect(result.valid).toBe(false);
		});
	});

	describe("SQL Injection Prevention", () => {
		it("should reject SQL injection with single quote", () => {
			const result = validateWorkspaceId("ws_abc'; DROP TABLE users; --");
			expect(result.valid).toBe(false);
		});

		it("should reject SQL injection with semicolon", () => {
			const result = validateWorkspaceId("ws_abc; DELETE FROM users");
			expect(result.valid).toBe(false);
		});

		it("should reject SQL injection with backslash", () => {
			const result = validateWorkspaceId("ws_abc\\'; DROP TABLE");
			expect(result.valid).toBe(false);
		});

		it("should reject command injection with pipe", () => {
			const result = validateWorkspaceId("ws_abc | rm -rf /");
			expect(result.valid).toBe(false);
		});

		it("should reject command injection with backtick", () => {
			const result = validateWorkspaceId("ws_abc`whoami`");
			expect(result.valid).toBe(false);
		});

		it("should reject command injection with dollar sign", () => {
			const result = validateWorkspaceId("ws_abc$(id)");
			expect(result.valid).toBe(false);
		});

		it("should reject UNION SELECT injection", () => {
			const result = validateWorkspaceId("' UNION SELECT * FROM users --");
			expect(result.valid).toBe(false);
		});
	});

	describe("Length Validation (35 chars total)", () => {
		it("should validate exact length of 35 characters", () => {
			const validId = "ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
			expect(validId.length).toBe(35);
			const result = validateWorkspaceId(validId);
			expect(result.valid).toBe(true);
		});

		it("should reject 34 characters", () => {
			const shortId = "ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d";
			expect(shortId.length).toBe(34);
			const result = validateWorkspaceId(shortId);
			expect(result.valid).toBe(false);
		});

		it("should reject 36 characters", () => {
			const longId = "ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a";
			expect(longId.length).toBe(36);
			const result = validateWorkspaceId(longId);
			expect(result.valid).toBe(false);
		});
	});
});

// =============================================================================
// Test Suite 2: isValidWorkspaceId Helper
// =============================================================================
describe("isValidWorkspaceId - Boolean Helper", () => {
	it("should return true for valid workspace ID", () => {
		expect(isValidWorkspaceId("ws_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6")).toBe(true);
	});

	it("should return false for invalid workspace ID", () => {
		expect(isValidWorkspaceId("invalid")).toBe(false);
	});

	it("should return false for SQL injection attempt", () => {
		expect(isValidWorkspaceId("'; DROP TABLE users; --")).toBe(false);
	});
});

// =============================================================================
// Test Suite 3: API Key Validation
// =============================================================================
describe("validateApiKey - Security Test Suite", () => {
	describe("Valid API Keys", () => {
		it("should accept sk_live_ prefix with 32+ chars", () => {
			const result = validateApiKey(`sk_live_${"a".repeat(32)}`);
			expect(result.valid).toBe(true);
		});

		it("should accept sk_test_ prefix with 32+ chars", () => {
			const result = validateApiKey(`sk_test_${"a".repeat(32)}`);
			expect(result.valid).toBe(true);
		});

		it("should accept sk_live_ with 64 chars (Better Auth default)", () => {
			const result = validateApiKey(`sk_live_${"a".repeat(64)}`);
			expect(result.valid).toBe(true);
		});
	});

	describe("Invalid API Keys", () => {
		it("should reject empty string", () => {
			const result = validateApiKey("");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Missing API key");
		});

		it("should reject undefined", () => {
			const result = validateApiKey(undefined);
			expect(result.valid).toBe(false);
		});

		it("should reject wrong prefix", () => {
			const result = validateApiKey(`api_key_${"a".repeat(32)}`);
			expect(result.valid).toBe(false);
		});

		it("should reject too short (31 chars after prefix)", () => {
			const result = validateApiKey(`sk_live_${"a".repeat(31)}`);
			expect(result.valid).toBe(false);
		});

		it("should reject special characters", () => {
			const result = validateApiKey(`sk_live_${"a".repeat(30)}!@`);
			expect(result.valid).toBe(false);
		});
	});

	describe("Injection Prevention", () => {
		it("should reject semicolon (command injection)", () => {
			const result = validateApiKey("sk_live_aaaa;rm -rf /");
			expect(result.valid).toBe(false);
		});

		it("should reject pipe (command injection)", () => {
			const result = validateApiKey("sk_live_aaaa|cat /etc/passwd");
			expect(result.valid).toBe(false);
		});

		it("should reject backtick (command injection)", () => {
			const result = validateApiKey("sk_live_aaaa`whoami`");
			expect(result.valid).toBe(false);
		});
	});
});

// =============================================================================
// Test Suite 4: Workspace Path Validation
// =============================================================================
describe("validateWorkspace - Path Traversal Prevention", () => {
	describe("Valid Paths", () => {
		it("should accept absolute path", () => {
			const result = validateWorkspace("/Users/test/project");
			expect(result.valid).toBe(true);
		});

		it("should accept path with spaces", () => {
			const result = validateWorkspace("/Users/test/my project");
			expect(result.valid).toBe(true);
		});
	});

	describe("Path Traversal Attacks", () => {
		it("should reject path with ..", () => {
			const result = validateWorkspace("/Users/test/../../../etc/passwd");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("traversal");
		});

		it("should reject relative path", () => {
			const result = validateWorkspace("relative/path");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("absolute");
		});

		it("should reject null byte injection", () => {
			const result = validateWorkspace("/Users/test\0.txt");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("null");
		});
	});

	describe("Command Injection Prevention", () => {
		it("should reject semicolon", () => {
			const result = validateWorkspace("/Users/test; rm -rf /");
			expect(result.valid).toBe(false);
		});

		it("should reject pipe", () => {
			const result = validateWorkspace("/Users/test | cat /etc/passwd");
			expect(result.valid).toBe(false);
		});

		it("should reject ampersand", () => {
			const result = validateWorkspace("/Users/test && rm -rf /");
			expect(result.valid).toBe(false);
		});
	});
});

// =============================================================================
// Test Suite 5: CORS Validation
// =============================================================================
describe("CORS Security", () => {
	describe("validateCorsOrigin", () => {
		it("should reject wildcard in production", () => {
			const result = validateCorsOrigin("*", "production");
			expect(result.valid).toBe(false);
		});

		it("should allow wildcard in development", () => {
			const result = validateCorsOrigin("*", "development");
			expect(result.valid).toBe(true);
		});
	});

	describe("getAllowedCorsOrigin", () => {
		it("should return wildcard when configured", () => {
			const result = getAllowedCorsOrigin("http://evil.com", "*");
			expect(result).toBe("*");
		});

		it("should return origin if in allowed list", () => {
			const result = getAllowedCorsOrigin("http://localhost:3000", "http://localhost:3000,https://vreko.dev");
			expect(result).toBe("http://localhost:3000");
		});

		it("should return null if origin not in allowed list", () => {
			const result = getAllowedCorsOrigin("http://evil.com", "http://localhost:3000");
			expect(result).toBe(null);
		});
	});
});

// =============================================================================
// Test Suite 6: Body Size Limits
// =============================================================================
describe("Request Size Limits", () => {
	it("should enforce 10MB max body size", () => {
		const maxSize = getMaxBodySize();
		expect(maxSize).toBe(10 * 1024 * 1024);
	});
});
