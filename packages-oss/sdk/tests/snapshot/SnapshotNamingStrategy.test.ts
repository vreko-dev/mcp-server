/**
 * SDK SnapshotNamingStrategy Tests
 *
 * Tests multi-tier intelligent snapshot naming including:
 * - Tier 1: Git-based naming (single/multi file operations)
 * - Tier 2: File operation pattern detection (tests, deps, configs)
 * - Tier 3: Content analysis (imports, refactoring)
 * - Tier 4: Fallback naming (line counts)
 * - User context/conventional commits
 * - Performance budgets (<50ms single file, <100ms 50 files)
 * - Edge cases (unicode, special chars, empty files)
 *
 * @module tests/snapshot/SnapshotNamingStrategy.test
 */

import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../src/core/session/interfaces";
import {
	type FileChange,
	type SnapshotInfo,
	SnapshotNamingStrategy,
	type SnapshotNamingStrategyOptions,
} from "../../src/snapshot/SnapshotNamingStrategy";

// Test logger that captures log calls
class TestLogger implements ILogger {
	public debugCalls: Array<{ message: string; data?: unknown }> = [];
	public infoCalls: Array<{ message: string; data?: unknown }> = [];
	public errorCalls: Array<{ message: string; error?: Error; data?: unknown }> = [];

	debug(message: string, data?: unknown): void {
		this.debugCalls.push({ message, data });
	}

	info(message: string, data?: unknown): void {
		this.infoCalls.push({ message, data });
	}

	error(message: string, error?: Error, data?: unknown): void {
		this.errorCalls.push({ message, error, data });
	}

	clear(): void {
		this.debugCalls = [];
		this.infoCalls = [];
		this.errorCalls = [];
	}
}

describe("SnapshotNamingStrategy - Multi-Tier Intelligent Naming", () => {
	let strategy: SnapshotNamingStrategy;
	let tempDir: string;
	let testLogger: TestLogger;

	beforeEach(async () => {
		// Create temporary workspace directory
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "snapback-sdk-naming-test-"));
		testLogger = new TestLogger();
		strategy = new SnapshotNamingStrategy(tempDir, { logger: testLogger });
	});

	afterEach(async () => {
		// Clean up temporary directory
		await fs.rm(tempDir, { recursive: true, force: true });
		testLogger.clear();
	});

	describe("Constructor & Options", () => {
		it("should create strategy with default options", () => {
			const defaultStrategy = new SnapshotNamingStrategy(tempDir);
			expect(defaultStrategy).toBeDefined();
		});

		it("should accept custom logger", () => {
			const customLogger = new TestLogger();
			const customStrategy = new SnapshotNamingStrategy(tempDir, { logger: customLogger });
			expect(customStrategy).toBeDefined();
		});

		it("should accept custom gitTimeoutMs", () => {
			const customStrategy = new SnapshotNamingStrategy(tempDir, {
				logger: testLogger,
				gitTimeoutMs: 10000,
			});
			expect(customStrategy).toBeDefined();
		});

		it("should accept custom maxNameLength", () => {
			const customStrategy = new SnapshotNamingStrategy(tempDir, {
				logger: testLogger,
				maxNameLength: 100,
			});
			expect(customStrategy).toBeDefined();
		});
	});

	describe("Tier 1: Git-Based Naming", () => {
		describe("Single File Operations", () => {
			it('should generate "Added auth.ts" for single file addition', async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{
							path: path.join(tempDir, "src/auth.ts"),
							status: "added",
							linesAdded: 50,
							linesDeleted: 0,
						},
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Added auth.ts");
			});

			it('should generate "Modified login.ts" for single file modification', async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{
							path: path.join(tempDir, "src/login.ts"),
							status: "modified",
							linesAdded: 10,
							linesDeleted: 5,
						},
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Modified login.ts");
			});

			it('should generate "Deleted config.ts" for single file deletion', async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{
							path: path.join(tempDir, "src/config.ts"),
							status: "deleted",
							linesAdded: 0,
							linesDeleted: 30,
						},
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Deleted config.ts");
			});
		});

		describe("Multiple File Operations", () => {
			it('should generate "3A 2M 1D in src/auth" for multiple files in same directory', async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{ path: path.join(tempDir, "src/auth/login.ts"), status: "added", linesAdded: 50, linesDeleted: 0 },
						{ path: path.join(tempDir, "src/auth/register.ts"), status: "added", linesAdded: 60, linesDeleted: 0 },
						{ path: path.join(tempDir, "src/auth/password.ts"), status: "added", linesAdded: 40, linesDeleted: 0 },
						{ path: path.join(tempDir, "src/auth/utils.ts"), status: "modified", linesAdded: 10, linesDeleted: 5 },
						{ path: path.join(tempDir, "src/auth/types.ts"), status: "modified", linesAdded: 5, linesDeleted: 2 },
						{ path: path.join(tempDir, "src/auth/legacy.ts"), status: "deleted", linesAdded: 0, linesDeleted: 100 },
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("3A 2M 1D in src/auth");
			});

			it('should generate "2A 1M in src" for files in different subdirectories', async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{ path: path.join(tempDir, "src/auth/login.ts"), status: "added", linesAdded: 50, linesDeleted: 0 },
						{ path: path.join(tempDir, "src/users/profile.ts"), status: "added", linesAdded: 40, linesDeleted: 0 },
						{ path: path.join(tempDir, "src/utils/helpers.ts"), status: "modified", linesAdded: 10, linesDeleted: 5 },
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("2A 1M in src");
			});

			it('should handle only additions "5A in components"', async () => {
				const files: FileChange[] = [];
				for (let i = 0; i < 5; i++) {
					files.push({
						path: path.join(tempDir, `components/Button${i}.tsx`),
						status: "added",
						linesAdded: 30,
						linesDeleted: 0,
					});
				}

				const info: SnapshotInfo = { workspaceRoot: tempDir, files };
				const name = await strategy.generateName(info);
				expect(name).toBe("5A in components");
			});

			it('should handle only modifications "3M in api"', async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{ path: path.join(tempDir, "api/users.ts"), status: "modified", linesAdded: 10, linesDeleted: 5 },
						{ path: path.join(tempDir, "api/auth.ts"), status: "modified", linesAdded: 15, linesDeleted: 8 },
						{ path: path.join(tempDir, "api/posts.ts"), status: "modified", linesAdded: 20, linesDeleted: 10 },
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("3M in api");
			});
		});
	});

	describe("Tier 2: File Operation Pattern Detection", () => {
		describe("Test Files", () => {
			it("should detect single test file update", async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{
							path: path.join(tempDir, "src/auth.test.ts"),
							status: "modified",
							linesAdded: 20,
							linesDeleted: 5,
						},
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Updated 1 test");
			});

			it("should detect multiple test file updates", async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{ path: path.join(tempDir, "src/auth.test.ts"), status: "modified", linesAdded: 20, linesDeleted: 5 },
						{ path: path.join(tempDir, "src/login.spec.ts"), status: "modified", linesAdded: 15, linesDeleted: 3 },
						{ path: path.join(tempDir, "__tests__/user.test.ts"), status: "added", linesAdded: 50, linesDeleted: 0 },
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Updated 3 tests");
			});
		});

		describe("Dependency Files", () => {
			it("should detect package.json updates", async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{
							path: path.join(tempDir, "package.json"),
							status: "modified",
							linesAdded: 5,
							linesDeleted: 2,
						},
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Updated dependencies");
			});

			it("should detect pnpm-lock.yaml updates", async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{
							path: path.join(tempDir, "pnpm-lock.yaml"),
							status: "modified",
							linesAdded: 100,
							linesDeleted: 50,
						},
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Updated dependencies");
			});
		});

		describe("Config Files", () => {
			it("should detect single config file modification", async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{
							path: path.join(tempDir, "tsconfig.json"),
							status: "modified",
							linesAdded: 3,
							linesDeleted: 1,
						},
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Modified 1 config");
			});

			it("should detect multiple config file modifications", async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{ path: path.join(tempDir, "tsconfig.json"), status: "modified", linesAdded: 3, linesDeleted: 1 },
						{ path: path.join(tempDir, ".eslintrc"), status: "modified", linesAdded: 5, linesDeleted: 2 },
						{ path: path.join(tempDir, "vitest.config.ts"), status: "added", linesAdded: 20, linesDeleted: 0 },
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Modified 3 configs");
			});

			it("should detect .env file updates", async () => {
				const info: SnapshotInfo = {
					workspaceRoot: tempDir,
					files: [
						{
							path: path.join(tempDir, ".env.local"),
							status: "modified",
							linesAdded: 2,
							linesDeleted: 1,
						},
					],
				};

				const name = await strategy.generateName(info);
				expect(name).toBe("Modified 1 config");
			});
		});
	});

	describe("Tier 3: Content Analysis", () => {
		it("should detect import changes when files are readable", async () => {
			// Create a file with imports
			const filePath = path.join(tempDir, "src/module.ts");
			await fs.mkdir(path.dirname(filePath), { recursive: true });
			await fs.writeFile(
				filePath,
				`import { foo } from './foo';
import { bar } from './bar';
import { baz } from './baz';

export function module() {}`,
			);

			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: filePath,
						status: "modified",
						linesAdded: 3,
						linesDeleted: 0,
					},
				],
			};

			const name = await strategy.generateName(info);
			// Should detect the 3 imports
			expect(name).toBe("Updated 3 imports");
		});

		it("should detect refactoring patterns with structure changes", async () => {
			// Create files with structure changes
			const dir = path.join(tempDir, "src/auth");
			await fs.mkdir(dir, { recursive: true });

			const file1 = path.join(dir, "login.ts");
			const file2 = path.join(dir, "register.ts");

			await fs.writeFile(
				file1,
				`function login() {}
function validateLogin() {}
class LoginService {}
const handleLogin = () => {};`,
			);

			await fs.writeFile(
				file2,
				`function register() {}
function validateRegister() {}
class RegisterService {}
const handleRegister = () => {};`,
			);

			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{ path: file1, status: "modified", linesAdded: 50, linesDeleted: 20 },
					{ path: file2, status: "modified", linesAdded: 40, linesDeleted: 15 },
				],
			};

			const name = await strategy.generateName(info);
			// Should detect refactoring pattern (>3 structure changes, multiple files)
			expect(name).toMatch(/Refactored.*auth.*\(2 files\)/);
		});
	});

	describe("Tier 4: Fallback Naming", () => {
		it("should use line count for non-code files", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "data.xyz"),
						status: "modified",
						linesAdded: 100,
						linesDeleted: 50,
					},
				],
			};

			const name = await strategy.generateName(info);
			expect(name).toBe("Modified 1 file (150 lines)");
		});

		it("should use line count for multiple non-code files", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{ path: path.join(tempDir, "data1.xyz"), status: "modified", linesAdded: 50, linesDeleted: 25 },
					{ path: path.join(tempDir, "data2.xyz"), status: "modified", linesAdded: 30, linesDeleted: 10 },
				],
			};

			const name = await strategy.generateName(info);
			expect(name).toBe("Modified 2 files (115 lines)");
		});
	});

	describe("User Context (Conventional Commits)", () => {
		it("should prepend bug-fix context", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "src/auth.ts"),
						status: "modified",
						linesAdded: 5,
						linesDeleted: 3,
					},
				],
				userContext: "bug-fix",
			};

			const name = await strategy.generateName(info);
			expect(name).toBe("fix: Modified auth.ts");
		});

		it("should prepend credentials context", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, ".env"),
						status: "modified",
						linesAdded: 2,
						linesDeleted: 1,
					},
				],
				userContext: "credentials",
			};

			const name = await strategy.generateName(info);
			expect(name).toBe("chore: Modified 1 config");
		});

		it("should prepend refactor context", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "src/utils.ts"),
						status: "modified",
						linesAdded: 30,
						linesDeleted: 50,
					},
				],
				userContext: "refactor",
			};

			const name = await strategy.generateName(info);
			expect(name).toBe("refactor: Modified utils.ts");
		});

		it("should handle custom user context", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "src/auth.ts"),
						status: "modified",
						linesAdded: 10,
						linesDeleted: 5,
					},
				],
				userContext: "WIP: New Feature",
			};

			const name = await strategy.generateName(info);
			expect(name).toBe("wip-new-feature: Modified auth.ts");
		});

		it("should truncate long custom context", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "src/auth.ts"),
						status: "modified",
						linesAdded: 10,
						linesDeleted: 5,
					},
				],
				userContext: "This is a very long context that should be truncated to fit",
			};

			const name = await strategy.generateName(info);
			// Context should be truncated to 20 chars max
			expect(name.split(":")[0].length).toBeLessThanOrEqual(20);
		});
	});

	describe("Edge Cases", () => {
		it("should return 'No changes' for empty file list", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [],
			};

			const name = await strategy.generateName(info);
			expect(name).toBe("No changes");
		});

		it("should handle files with special characters in names", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "src/@utils/helpers.ts"),
						status: "modified",
						linesAdded: 10,
						linesDeleted: 5,
					},
				],
			};

			const name = await strategy.generateName(info);
			// The sanitizeFilename method removes @ from the filename, so "helpers.ts" becomes the name
			expect(name).toBe("Modified helpers.ts");
		});

		it("should handle very long file names", async () => {
			const longName = "a".repeat(100) + ".ts";
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, `src/${longName}`),
						status: "modified",
						linesAdded: 10,
						linesDeleted: 5,
					},
				],
			};

			const name = await strategy.generateName(info);
			// Should truncate the name
			expect(name.length).toBeLessThanOrEqual(60);
			expect(name).toContain("...");
		});

		it("should handle unicode file names", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "src/日本語.ts"),
						status: "added",
						linesAdded: 20,
						linesDeleted: 0,
					},
				],
			};

			const name = await strategy.generateName(info);
			expect(name).toBe("Added 日本語.ts");
		});

		it("should handle files with emoji in names", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "src/🚀.ts"),
						status: "added",
						linesAdded: 10,
						linesDeleted: 0,
					},
				],
			};

			const name = await strategy.generateName(info);
			expect(name).toBe("Added 🚀.ts");
		});
	});

	describe("Performance", () => {
		it("should generate name for single file in under 50ms", async () => {
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "src/auth.ts"),
						status: "modified",
						linesAdded: 10,
						linesDeleted: 5,
					},
				],
			};

			const start = performance.now();
			await strategy.generateName(info);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(50);
		});

		it("should generate name for 50 files in under 100ms", async () => {
			const files: FileChange[] = [];
			for (let i = 0; i < 50; i++) {
				files.push({
					path: path.join(tempDir, `src/file${i}.ts`),
					status: "modified",
					linesAdded: 10,
					linesDeleted: 5,
				});
			}

			const info: SnapshotInfo = { workspaceRoot: tempDir, files };

			const start = performance.now();
			await strategy.generateName(info);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(100);
		});
	});

	describe("Logger Integration", () => {
		it("should log debug info when content analysis fails", async () => {
			// Create info with non-existent file
			const info: SnapshotInfo = {
				workspaceRoot: tempDir,
				files: [
					{
						path: path.join(tempDir, "nonexistent/file.ts"),
						status: "modified",
						linesAdded: 10,
						linesDeleted: 5,
					},
				],
			};

			await strategy.generateName(info);

			// Logger should have recorded debug calls for failed file reads
			expect(testLogger.debugCalls.some((call) => call.message.includes("Failed to read file"))).toBe(true);
		});
	});
});
