import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SecurityError, setWorkspaceRoot, validateFilePath } from "../../src/utils/security";

// Mock fs.realpathSync to control the behavior
vi.mock("node:fs", async () => {
	const actual = await vi.importActual("node:fs");
	return {
		...actual,
		existsSync: vi.fn(() => true), // Always return true for parent directory existence
		realpathSync: vi.fn((path: string) => path), // Just return the path as-is for testing
	};
});

beforeEach(() => {
	// Reset mocks before each test
	vi.clearAllMocks();
});

describe("Path Validation - Workspace Boundary Check", () => {
	it("should block absolute paths when no workspace root is set (backward compatibility)", () => {
		expect(() => validateFilePath("/etc/passwd", "/workspace")).toThrow(SecurityError);
		expect(() => validateFilePath("/home/user/file.txt", "/workspace")).toThrow(SecurityError);
		expect(() => validateFilePath("/usr/local/bin/script.js", "/workspace")).toThrow(SecurityError);
	});

	it("should allow valid relative paths", () => {
		expect(() => validateFilePath("src/index.ts", "/workspace")).not.toThrow();
		expect(() => validateFilePath("test/utils/security.test.ts", "/workspace")).not.toThrow();
		expect(() => validateFilePath("package.json", "/workspace")).not.toThrow();
		expect(() => validateFilePath("src/utils/security.ts", "/workspace")).not.toThrow();
	});

	it("should reject path traversal attempts", () => {
		expect(() => validateFilePath("../../etc/passwd", "/workspace")).toThrow(SecurityError);
		expect(() => validateFilePath("../config.json", "/workspace")).toThrow(SecurityError);
		expect(() => validateFilePath("../../../etc/passwd", "/workspace")).toThrow(SecurityError);
	});

	describe("With workspace root set", () => {
		beforeEach(() => {
			setWorkspaceRoot("/workspace");
		});

		it("should accept absolute paths within workspace - VS Code compatibility", () => {
			// VS Code provides absolute paths like this:
			const vscodePath = "/workspace/src/index.ts";

			// This should now work with our new implementation
			expect(() => validateFilePath(vscodePath, "/workspace")).not.toThrow();
		});

		it("should reject absolute paths outside workspace", () => {
			const outsidePath = "/etc/passwd";
			expect(() => validateFilePath(outsidePath, "/workspace")).toThrow(SecurityError);
		});

		it("should still reject path traversal attempts", () => {
			expect(() => validateFilePath("../../etc/passwd", "/workspace")).toThrow(SecurityError);
			expect(() => validateFilePath("../config.json", "/workspace")).toThrow(SecurityError);
			expect(() => validateFilePath("../../../etc/passwd", "/workspace")).toThrow(SecurityError);
		});

		it("should reject paths with null bytes", () => {
			const nullBytePath = "/workspace/file.txt\0.jpg";
			expect(() => validateFilePath(nullBytePath, "/workspace")).toThrow(SecurityError);
		});

		it("should reject symlink paths outside workspace", () => {
			// Mock realpathSync to simulate a symlink that points outside the workspace
			vi.spyOn(fs, "realpathSync").mockImplementation((path: fs.PathLike) => {
				if (path === "/workspace/symlink") {
					return "/etc/passwd"; // Symlink pointing outside workspace
				}
				return path as string;
			});

			const symlinkPath = "/workspace/symlink";
			expect(() => validateFilePath(symlinkPath, "/workspace")).toThrow(SecurityError);
		});

		it("should handle non-existent files within workspace", () => {
			// Mock realpathSync to throw an error (simulating non-existent file)
			vi.spyOn(fs, "realpathSync").mockImplementation((path: fs.PathLike) => {
				if (path === "/workspace/nonexistent/file.ts") {
					throw new Error("ENOENT: no such file or directory");
				}
				// For the parent directory check
				if (path === "/workspace/nonexistent") {
					return path as string;
				}
				return path as string;
			});

			// Mock existsSync to return false for parent directory
			vi.spyOn(fs, "existsSync").mockImplementation((path: fs.PathLike) => {
				if (path === "/workspace/nonexistent") {
					return false;
				}
				return true;
			});

			const newPath = "/workspace/nonexistent/file.ts";
			expect(() => validateFilePath(newPath, "/workspace")).toThrow(SecurityError);
		});

		it("should handle Windows-style paths correctly", () => {
			// Mock process.platform to simulate Windows
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
			Object.defineProperty(process, "platform", { value: "win32" });

			try {
				// Test Windows UNC paths
				expect(() => validateFilePath("\\\\server\\share", "/workspace")).toThrow(SecurityError);

				// Test Windows drive letters
				expect(() => validateFilePath("C:\\Windows", "/workspace")).toThrow(SecurityError);
			} finally {
				// Restore original platform
				if (originalPlatform) {
					Object.defineProperty(process, "platform", originalPlatform);
				} else {
					delete (process as any).platform;
				}
			}
		});

		it("should allow legitimate filenames with double dots", () => {
			expect(() => validateFilePath("/workspace/config..json", "/workspace")).not.toThrow();
			expect(() => validateFilePath("/workspace/file..txt", "/workspace")).not.toThrow();
			expect(() => validateFilePath("/workspace/test.config..js", "/workspace")).not.toThrow();
		});
	});
});
