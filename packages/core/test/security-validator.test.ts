import { beforeEach, describe, expect, it } from "vitest";
import { SecurityValidator } from "../src/security-validator";

describe("SecurityValidator", () => {
	let validator: SecurityValidator;

	beforeEach(() => {
		validator = new SecurityValidator();
	});

	describe("filterCredentials", () => {
		it("should filter out password fields", () => {
			const data = {
				username: "testuser",
				password: "secret123",
				config: {
					databasePassword: "dbpass",
					apiKey: "apikey123",
				},
			};

			const { filtered, detected } = validator.filterCredentials(data);

			expect(filtered.username).toBe("testuser");
			expect(filtered.password).toBe("[FILTERED]");
			expect(filtered.config.databasePassword).toBe("[FILTERED]");
			expect(filtered.config.apiKey).toBe("[FILTERED]");
			expect(detected).toContain("password");
			expect(detected).toContain("config.databasePassword");
			expect(detected).toContain("config.apiKey");
		});

		it("should not filter non-sensitive fields", () => {
			const data = {
				username: "testuser",
				email: "test@example.com",
				config: {
					name: "test",
					version: "1.0.0",
				},
			};

			const { filtered, detected } = validator.filterCredentials(data);

			expect(filtered.username).toBe("testuser");
			expect(filtered.email).toBe("test@example.com");
			expect(filtered.config.name).toBe("test");
			expect(filtered.config.version).toBe("1.0.0");
			expect(detected).toHaveLength(0);
		});
	});

	describe("validatePath", () => {
		it("should validate safe paths", () => {
			// For this test, we'll use a relative path that's within the workspace
			// We need to mock the process.cwd() to make this work
			const originalCwd = process.cwd;
			process.cwd = () => "/workspace/project";

			const result = validator.validatePath("src/test.ts", "/workspace/project");
			process.cwd = originalCwd; // Restore original cwd

			expect(result.isValid).toBe(true);
		});

		it("should reject path traversal attempts", () => {
			const result = validator.validatePath("../etc/passwd", "/workspace/project");
			expect(result.isValid).toBe(false);
			expect(result.reason).toBe("Path traversal detected");
		});

		it("should reject absolute paths", () => {
			const result = validator.validatePath("/etc/passwd", "/workspace/project");
			expect(result.isValid).toBe(false);
			expect(result.reason).toBe("Absolute paths not allowed");
		});

		it("should allow storage paths with absolute paths", () => {
			const result = validator.validatePath(
				"/workspace/project/.snapback/cp_abc123.json",
				"/workspace/project",
				true,
			);
			expect(result.isValid).toBe(true);
		});

		it("should reject paths outside workspace", () => {
			const result = validator.validatePath("../../other-project/file.ts", "/workspace/project");
			expect(result.isValid).toBe(false);
		});
	});

	describe("validateSnapshotId (legacy checkpoint test)", () => {
		it("should validate safe snapshot IDs", () => {
			const result = validator.validateSnapshotId("snap_abc123");
			expect(result.isValid).toBe(true);
		});

		it("should reject snapshot IDs with malicious characters", () => {
			const result = validator.validateSnapshotId("snap_abc123; rm -rf /");
			expect(result.isValid).toBe(false);
		});

		it("should reject overly long snapshot IDs", () => {
			const longId = "a".repeat(150);
			const result = validator.validateSnapshotId(longId);
			expect(result.isValid).toBe(false);
		});
	});

	describe("validateSnapshotId", () => {
		it("should validate safe snapshot IDs", () => {
			const result = validator.validateSnapshotId("snap_abc123");
			expect(result.isValid).toBe(true);
		});

		it("should reject snapshot IDs with malicious characters", () => {
			const result = validator.validateSnapshotId("snap_abc123; rm -rf /");
			expect(result.isValid).toBe(false);
		});

		it("should reject overly long snapshot IDs", () => {
			const longId = "a".repeat(150);
			const result = validator.validateSnapshotId(longId);
			expect(result.isValid).toBe(false);
		});
	});

	describe("validateMCPResponse", () => {
		it("should validate safe MCP responses", () => {
			const response = {
				content: [{ type: "text", text: "Hello, World!" }],
				isError: false,
			};
			expect(validator.validateMCPResponse(response)).toBe(true);
		});

		it("should reject XSS attempts", () => {
			const response = {
				content: [{ type: "text", text: '<script>alert("xss")</script>' }],
				isError: false,
			};
			expect(validator.validateMCPResponse(response)).toBe(false);
		});

		it("should reject command injection attempts", () => {
			const response = {
				content: [{ type: "text", text: "Hello; rm -rf /" }],
				isError: false,
			};
			expect(validator.validateMCPResponse(response)).toBe(false);
		});
	});
});
