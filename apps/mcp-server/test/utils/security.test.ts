import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SecurityError, setWorkspaceRoot, validateFilePath } from "../../src/utils/security.js";

// Mock fs operations
vi.mock("node:fs", async () => {
	const actual = await vi.importActual("node:fs");
	return {
		...actual,
		realpathSync: vi.fn((path: string) => path), // Just return the path as-is for testing
		existsSync: vi.fn(() => true), // Always return true for parent directory existence
	};
});

describe("Security Utilities", () => {
	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();

		// Set a default workspace root for testing
		setWorkspaceRoot("/test/workspace");

		// Mock realpathSync to return the path as-is by default
		vi.spyOn(fs, "realpathSync").mockImplementation((path: fs.PathLike) => path as string);

		// Mock existsSync to return true by default
		vi.spyOn(fs, "existsSync").mockImplementation(() => true);
	});

	describe("validateFilePath", () => {
		describe("Basic Validation", () => {
			it("should block empty paths", () => {
				expect(() => validateFilePath("", "/test/workspace")).toThrow(SecurityError);
				expect(() => validateFilePath("   ", "/test/workspace")).toThrow(SecurityError);
			});

			it("should allow valid relative paths", () => {
				expect(() => validateFilePath("src/index.ts", "/test/workspace")).not.toThrow();
				expect(() => validateFilePath("test/utils/security.test.ts", "/test/workspace")).not.toThrow();
				expect(() => validateFilePath("package.json", "/test/workspace")).not.toThrow();
				expect(() => validateFilePath("src/utils/security.ts", "/test/workspace")).not.toThrow();
			});

			it("should block null bytes", () => {
				expect(() => validateFilePath("test.js\0", "/test/workspace")).toThrow(SecurityError);
				expect(() => validateFilePath("\0test.js", "/test/workspace")).toThrow(SecurityError);
			});

			it("should block absolute paths outside workspace", () => {
				// Mock realpathSync to simulate actual path resolution
				vi.spyOn(fs, "realpathSync").mockImplementation((path: fs.PathLike) => {
					if (path === "/etc/passwd") {
						return "/etc/passwd";
					}
					if (path === "/home/user/file.txt") {
						return "/home/user/file.txt";
					}
					if (path === "/usr/local/bin/script.js") {
						return "/usr/local/bin/script.js";
					}
					if (path === "/test/workspace") {
						return "/test/workspace";
					}
					return path as string;
				});

				expect(() => validateFilePath("/etc/passwd", "/test/workspace")).toThrow(SecurityError);
				expect(() => validateFilePath("/home/user/file.txt", "/test/workspace")).toThrow(SecurityError);
				expect(() => validateFilePath("/usr/local/bin/script.js", "/test/workspace")).toThrow(SecurityError);
			});

			it("should allow absolute paths within workspace", () => {
				// Mock realpathSync to simulate actual path resolution
				vi.spyOn(fs, "realpathSync").mockImplementation((path: fs.PathLike) => {
					if (path === "/test/workspace/src/index.ts") {
						return "/test/workspace/src/index.ts";
					}
					if (path === "/test/workspace/package.json") {
						return "/test/workspace/package.json";
					}
					if (path === "/test/workspace") {
						return "/test/workspace";
					}
					return path as string;
				});

				expect(() => validateFilePath("/test/workspace/src/index.ts", "/test/workspace")).not.toThrow();
				expect(() => validateFilePath("/test/workspace/package.json", "/test/workspace")).not.toThrow();
			});
		});

		describe("Path Traversal Protection", () => {
			it("should block basic path traversal", () => {
				expect(() => validateFilePath("../../etc/passwd", "/test/workspace")).toThrow(SecurityError);
				expect(() => validateFilePath("../config.json", "/test/workspace")).toThrow(SecurityError);
				expect(() => validateFilePath("../../../etc/passwd", "/test/workspace")).toThrow(SecurityError);
			});

			it("should block encoded traversal patterns", () => {
				expect(() => validateFilePath("%2e%2e%2fetc/passwd", "/test/workspace")).toThrow(SecurityError);
				expect(() => validateFilePath("%2e%2e/etc/passwd", "/test/workspace")).toThrow(SecurityError);
				expect(() => validateFilePath("..%2fetc/passwd", "/test/workspace")).toThrow(SecurityError);
			});

			it("should allow legitimate filenames with double dots", () => {
				expect(() => validateFilePath("config..json", "/test/workspace")).not.toThrow();
				expect(() => validateFilePath("file..txt", "/test/workspace")).not.toThrow();
				expect(() => validateFilePath("test.config..js", "/test/workspace")).not.toThrow();
			});
		});

		describe("Windows-Specific Attacks (when on Windows platform)", () => {
			it("should block UNC paths when on Windows", () => {
				// Mock process.platform to simulate Windows
				const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
				Object.defineProperty(process, "platform", { value: "win32" });

				try {
					expect(() => validateFilePath("\\\\server\\share", "/test/workspace")).toThrow(SecurityError);
					expect(() => validateFilePath("\\\\192.168.1.1\\share", "/test/workspace")).toThrow(SecurityError);
				} finally {
					// Restore original platform
					if (originalPlatform) {
						Object.defineProperty(process, "platform", originalPlatform);
					} else {
						delete (process as any).platform;
					}
				}
			});

			it("should block drive letter paths when on Windows", () => {
				// Mock process.platform to simulate Windows
				const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
				Object.defineProperty(process, "platform", { value: "win32" });

				try {
					expect(() => validateFilePath("C:\\Windows", "/test/workspace")).toThrow(SecurityError);
					expect(() => validateFilePath("D:\\Data\\file.txt", "/test/workspace")).toThrow(SecurityError);
					expect(() => validateFilePath("Z:\\System\\config.ini", "/test/workspace")).toThrow(SecurityError);
				} finally {
					// Restore original platform
					if (originalPlatform) {
						Object.defineProperty(process, "platform", originalPlatform);
					} else {
						delete (process as any).platform;
					}
				}
			});
		});
	});
});
