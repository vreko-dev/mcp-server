/**
 * GitContextService Tests
 *
 * TDD RED phase: These tests define expected behavior for the GitContextService.
 * Uses mocked git commands to ensure deterministic testing.
 *
 * @module test/services/git-context-service
 */

import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitContextService } from "../../src/services/git-context-service.js";

// =============================================================================
// Test Setup
// =============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-git-context");

function setupTestWorkspace() {
	mkdirSync(TEST_WORKSPACE, { recursive: true });
	// Initialize minimal git repo structure for testing
	mkdirSync(join(TEST_WORKSPACE, ".git"), { recursive: true });
}

function cleanupTestWorkspace() {
	rmSync(TEST_WORKSPACE, { recursive: true, force: true });
}

// Mock child_process.execSync
vi.mock("node:child_process", async () => {
	const actual = await vi.importActual("node:child_process");
	return {
		...actual,
		execSync: vi.fn(),
	};
});

// =============================================================================
// Unit Tests
// =============================================================================

describe("GitContextService", () => {
	let service: GitContextService;
	let mockExecSync: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		setupTestWorkspace();
		service = new GitContextService(TEST_WORKSPACE);

		// Get the mocked execSync
		const childProcess = await import("node:child_process");
		mockExecSync = childProcess.execSync as ReturnType<typeof vi.fn>;
		mockExecSync.mockReset();
	});

	afterEach(() => {
		cleanupTestWorkspace();
		vi.restoreAllMocks();
	});

	describe("getContext", () => {
		it("should return complete git context structure", async () => {
			// Mock all git commands
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) {
					return "main\n";
				}
				if (cmd.includes("rev-parse --abbrev-ref @{u}")) {
					return "origin/main\n";
				}
				if (cmd.includes("rev-list --left-right --count")) {
					return "2\t1\n";
				}
				if (cmd.includes("status --porcelain")) {
					return " M src/index.ts\n?? src/new.ts\n";
				}
				if (cmd.includes("diff --cached --name-status")) {
					return "A\tsrc/added.ts\n";
				}
				if (cmd.includes("log -10")) {
					return "abc1234|feat: add feature|John Doe|2 hours ago|1703001234\nsrc/index.ts\n\ndef5678|fix: bug fix|Jane Doe|1 day ago|1702914834\nsrc/util.ts\n";
				}
				if (cmd.includes('log -1 --pretty=format:"%H"')) {
					return "abc1234567890";
				}
				if (cmd.includes('log -1 --pretty=format:"%ar"')) {
					return "2 hours ago";
				}
				return "";
			});

			const context = await service.getContext(["src/index.ts"]);

			expect(context).toHaveProperty("branch");
			expect(context).toHaveProperty("uncommittedChanges");
			expect(context).toHaveProperty("stagedChanges");
			expect(context).toHaveProperty("recentCommits");
			expect(context).toHaveProperty("fileHistory");
		});

		it("should parse branch information correctly", async () => {
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) {
					return "feature/auth\n";
				}
				if (cmd.includes("rev-parse --abbrev-ref @{u}")) {
					return "origin/feature/auth\n";
				}
				if (cmd.includes("rev-list --left-right --count")) {
					return "3\t0\n";
				}
				return "";
			});

			const context = await service.getContext([]);

			expect(context.branch.current).toBe("feature/auth");
			expect(context.branch.upstream).toBe("origin/feature/auth");
			expect(context.branch.ahead).toBe(3);
			expect(context.branch.behind).toBe(0);
		});

		it("should handle missing upstream gracefully", async () => {
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) {
					return "new-branch\n";
				}
				if (cmd.includes("rev-parse --abbrev-ref @{u}")) {
					throw new Error("fatal: no upstream configured");
				}
				return "";
			});

			const context = await service.getContext([]);

			expect(context.branch.current).toBe("new-branch");
			expect(context.branch.upstream).toBeUndefined();
			expect(context.branch.ahead).toBe(0);
			expect(context.branch.behind).toBe(0);
		});

		it("should parse uncommitted changes correctly", async () => {
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) return "main\n";
				if (cmd.includes("status --porcelain")) {
					return " M src/modified.ts\n?? src/untracked.ts\n D src/deleted.ts\nA  src/added.ts\n";
				}
				return "";
			});

			const context = await service.getContext([]);

			expect(context.uncommittedChanges).toHaveLength(4);

			const modified = context.uncommittedChanges.find((c) => c.file === "src/modified.ts");
			expect(modified?.status).toBe("M");

			const untracked = context.uncommittedChanges.find((c) => c.file === "src/untracked.ts");
			expect(untracked?.status).toBe("?");

			const deleted = context.uncommittedChanges.find((c) => c.file === "src/deleted.ts");
			expect(deleted?.status).toBe("D");
		});

		it("should parse staged changes correctly", async () => {
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) return "main\n";
				if (cmd.includes("diff --cached --name-status")) {
					return "A\tsrc/new.ts\nM\tsrc/modified.ts\nD\tsrc/deleted.ts\n";
				}
				return "";
			});

			const context = await service.getContext([]);

			expect(context.stagedChanges).toHaveLength(3);
			expect(context.stagedChanges.find((c) => c.file === "src/new.ts")?.status).toBe("A");
			expect(context.stagedChanges.find((c) => c.file === "src/modified.ts")?.status).toBe("M");
		});

		it("should parse recent commits and detect affected files", async () => {
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) return "main\n";
				if (cmd.includes("log -10")) {
					return [
						"abc1234|feat: add auth|John|2 hours ago|1703001234",
						"src/auth.ts",
						"src/index.ts",
						"",
						"def5678|fix: bug|Jane|1 day ago|1702914834",
						"src/util.ts",
					].join("\n");
				}
				return "";
			});

			const context = await service.getContext(["src/auth.ts"]);

			expect(context.recentCommits.length).toBeGreaterThan(0);

			const authCommit = context.recentCommits.find((c) => c.hash === "abc1234");
			expect(authCommit?.message).toBe("feat: add auth");
			expect(authCommit?.affectsPlannedFiles).toBe(true);

			const utilCommit = context.recentCommits.find((c) => c.hash === "def5678");
			expect(utilCommit?.affectsPlannedFiles).toBe(false);
		});

		it("should return file history for planned files", async () => {
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) return "main\n";
				if (cmd.includes("status --porcelain")) return " M src/index.ts\n";
				if (cmd.includes('log -1 --pretty=format:"%H"') && cmd.includes("src/index.ts")) {
					return "abc1234567890";
				}
				if (cmd.includes('log -1 --pretty=format:"%ar"') && cmd.includes("src/index.ts")) {
					return "15 minutes ago";
				}
				return "";
			});

			const context = await service.getContext(["src/index.ts"]);

			expect(context.fileHistory["src/index.ts"]).toBeDefined();
			expect(context.fileHistory["src/index.ts"].lastModified).toBe("15 minutes ago");
			expect(context.fileHistory["src/index.ts"].lastCommit).toBe("abc1234");
			expect(context.fileHistory["src/index.ts"].modifiedByUser).toBe(true);
		});

		it("should limit recent commits to 5", async () => {
			const commitLines = Array.from({ length: 10 }, (_, i) => [
				`${String(i).padStart(7, "0")}|commit ${i}|Author|${i} hours ago|170300000${i}`,
				`file${i}.ts`,
			])
				.flat()
				.join("\n");

			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) return "main\n";
				if (cmd.includes("log -10")) return commitLines;
				return "";
			});

			const context = await service.getContext([]);

			expect(context.recentCommits.length).toBeLessThanOrEqual(5);
		});
	});

	describe("isGitRepo", () => {
		it("should return true for git repository", async () => {
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --git-dir")) return ".git\n";
				return "";
			});

			const result = await service.isGitRepo();
			expect(result).toBe(true);
		});

		it("should return false for non-git directory", async () => {
			mockExecSync.mockImplementation(() => {
				throw new Error("fatal: not a git repository");
			});

			const result = await service.isGitRepo();
			expect(result).toBe(false);
		});
	});

	describe("error handling", () => {
		it("should return empty context when git is not available", async () => {
			mockExecSync.mockImplementation(() => {
				throw new Error("git: command not found");
			});

			const context = await service.getContext(["src/index.ts"]);

			expect(context.branch.current).toBe("");
			expect(context.uncommittedChanges).toEqual([]);
			expect(context.stagedChanges).toEqual([]);
			expect(context.recentCommits).toEqual([]);
		});

		it("should handle partial git failures gracefully", async () => {
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) return "main\n";
				if (cmd.includes("status --porcelain")) {
					throw new Error("error: not a git repository");
				}
				return "";
			});

			const context = await service.getContext([]);

			expect(context.branch.current).toBe("main");
			expect(context.uncommittedChanges).toEqual([]);
		});
	});
});
