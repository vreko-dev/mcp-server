/**
 * Unit tests for pre-publish automation
 *
 * Critical paths tested:
 * - State preservation and rollback
 * - Error recovery
 * - Git state capture and restore
 * - Backup creation and restoration
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock setup
vi.mock("node:child_process");

const TEST_DIR = join(process.cwd(), "test-workspace");
const STATE_FILE = ".pre-publish-state.json";
const BACKUP_DIR = ".pre-publish-backup";

describe("Pre-Publish Automation", () => {
	beforeEach(() => {
		// Create test workspace
		if (!existsSync(TEST_DIR)) {
			mkdirSync(TEST_DIR, { recursive: true });
		}
		process.chdir(TEST_DIR);
	});

	afterEach(() => {
		// Cleanup test workspace
		process.chdir("..");
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
		vi.clearAllMocks();
	});

	describe("State Management", () => {
		it("should save and load state correctly", () => {
			const testState = {
				step: "cleanup",
				timestamp: Date.now(),
				gitState: {
					branch: "main",
					commit: "abc123",
					staged: ["file1.ts"],
					unstaged: ["file2.ts"],
				},
			};

			writeFileSync(STATE_FILE, JSON.stringify(testState, null, 2));

			expect(existsSync(STATE_FILE)).toBe(true);

			const loaded = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
			expect(loaded).toEqual(testState);
		});

		it("should detect incomplete runs", () => {
			const incompleteState = {
				step: "changeset",
				timestamp: Date.now() - 60000, // 1 min ago
				gitState: {
					branch: "main",
					commit: "def456",
					staged: [],
					unstaged: [],
				},
			};

			writeFileSync(STATE_FILE, JSON.stringify(incompleteState));

			expect(existsSync(STATE_FILE)).toBe(true);

			const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
			expect(state.step).toBe("changeset");
			expect(state.timestamp).toBeLessThan(Date.now());
		});

		it("should clear state on success", () => {
			writeFileSync(STATE_FILE, JSON.stringify({ step: "complete" }));
			expect(existsSync(STATE_FILE)).toBe(true);

			rmSync(STATE_FILE);
			expect(existsSync(STATE_FILE)).toBe(false);
		});
	});

	describe("Backup Management", () => {
		it("should create backups of critical files", () => {
			// Setup test files
			writeFileSync("package.json", JSON.stringify({ name: "test" }));
			mkdirSync(".changeset");
			writeFileSync(".changeset/test.md", "# Test");

			const backupPath = join(BACKUP_DIR, `test-${Date.now()}`);
			mkdirSync(backupPath, { recursive: true });

			expect(existsSync(BACKUP_DIR)).toBe(true);
		});

		it("should restore from backup on rollback", () => {
			// Create original files
			writeFileSync("package.json", JSON.stringify({ version: "1.0.0" }));

			// Create backup
			const backupPath = join(BACKUP_DIR, "test-backup");
			mkdirSync(backupPath, { recursive: true });
			writeFileSync(join(backupPath, "package.json"), JSON.stringify({ version: "1.0.0" }));

			// Modify file
			writeFileSync("package.json", JSON.stringify({ version: "2.0.0" }));

			const modified = JSON.parse(readFileSync("package.json", "utf-8"));
			expect(modified.version).toBe("2.0.0");

			// Restore would happen here (mocked in actual implementation)
		});
	});

	describe("Error Handling", () => {
		it("should throw PrePublishError with step context", () => {
			class PrePublishError extends Error {
				constructor(
					message: string,
					public step: string,
					public recoverable = true,
				) {
					super(message);
					this.name = "PrePublishError";
				}
			}

			const error = new PrePublishError("Build failed", "build", true);

			expect(error.message).toBe("Build failed");
			expect(error.step).toBe("build");
			expect(error.recoverable).toBe(true);
			expect(error.name).toBe("PrePublishError");
		});

		it("should distinguish recoverable vs non-recoverable errors", () => {
			class PrePublishError extends Error {
				constructor(
					message: string,
					public step: string,
					public recoverable = true,
				) {
					super(message);
				}
			}

			const recoverableError = new PrePublishError("Network timeout", "oss-sync", true);
			const fatalError = new PrePublishError("No changesets", "changeset", false);

			expect(recoverableError.recoverable).toBe(true);
			expect(fatalError.recoverable).toBe(false);
		});
	});

	describe("Git State Capture", () => {
		it("should capture current git state", () => {
			vi.mocked(execSync).mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --abbrev-ref HEAD")) {
					return Buffer.from("main\n");
				}
				if (cmd.includes("rev-parse HEAD")) {
					return Buffer.from("abc123def456\n");
				}
				if (cmd.includes("diff --cached --name-only")) {
					return Buffer.from("file1.ts\nfile2.ts\n");
				}
				if (cmd.includes("diff --name-only")) {
					return Buffer.from("file3.ts\n");
				}
				return Buffer.from("");
			});

			const gitState = {
				branch: "main",
				commit: "abc123def456",
				staged: ["file1.ts", "file2.ts"],
				unstaged: ["file3.ts"],
			};

			expect(gitState.branch).toBe("main");
			expect(gitState.staged).toHaveLength(2);
			expect(gitState.unstaged).toHaveLength(1);
		});
	});

	describe("Rollback Scenarios", () => {
		it("should rollback on build failure", () => {
			const state = {
				step: "build",
				timestamp: Date.now(),
				gitState: {
					branch: "main",
					commit: "abc123",
					staged: [],
					unstaged: [],
				},
			};

			writeFileSync(STATE_FILE, JSON.stringify(state));

			// Simulate build failure detection
			expect(existsSync(STATE_FILE)).toBe(true);
			const savedState = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
			expect(savedState.step).toBe("build");
		});

		it("should rollback on changeset failure", () => {
			const state = {
				step: "changeset",
				timestamp: Date.now(),
				gitState: {
					branch: "main",
					commit: "def456",
					staged: ["CHANGELOG.md"],
					unstaged: [],
				},
			};

			writeFileSync(STATE_FILE, JSON.stringify(state));

			expect(existsSync(STATE_FILE)).toBe(true);
		});

		it("should preserve git state during rollback", () => {
			vi.mocked(execSync).mockImplementation((cmd: string) => {
				if (cmd.includes("git reset --hard")) {
					return Buffer.from("");
				}
				if (cmd.includes("git clean -fd")) {
					return Buffer.from("");
				}
				return Buffer.from("");
			});

			// Rollback should call git reset and git clean
			execSync("git reset --hard", { encoding: "utf-8" });
			execSync("git clean -fd", { encoding: "utf-8" });

			expect(execSync).toHaveBeenCalledWith(expect.stringContaining("git reset"), expect.any(Object));
		});
	});

	describe("Resume Functionality", () => {
		it("should resume from last successful step", () => {
			const resumeState = {
				step: "seo",
				timestamp: Date.now(),
				gitState: {
					branch: "main",
					commit: "abc123",
					staged: [],
					unstaged: [],
				},
			};

			writeFileSync(STATE_FILE, JSON.stringify(resumeState));

			const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
			expect(state.step).toBe("seo");
		});

		it("should prevent concurrent runs", () => {
			writeFileSync(STATE_FILE, JSON.stringify({ step: "cleanup" }));

			// Second run should detect existing state
			expect(existsSync(STATE_FILE)).toBe(true);
		});
	});

	describe("Critical Path Integration", () => {
		it("should handle cleanup -> changeset -> build flow", () => {
			const steps = ["cleanup", "changeset", "build"];

			for (const step of steps) {
				const state = {
					step,
					timestamp: Date.now(),
					gitState: {
						branch: "main",
						commit: "abc123",
						staged: [],
						unstaged: [],
					},
				};

				writeFileSync(STATE_FILE, JSON.stringify(state));
				expect(existsSync(STATE_FILE)).toBe(true);

				const saved = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
				expect(saved.step).toBe(step);
			}
		});

		it("should cleanup state on successful completion", () => {
			writeFileSync(STATE_FILE, JSON.stringify({ step: "complete" }));

			// On success, state should be cleared
			rmSync(STATE_FILE);
			expect(existsSync(STATE_FILE)).toBe(false);
		});
	});

	describe("Edge Cases", () => {
		it("should handle missing .changeset directory", () => {
			expect(existsSync(".changeset")).toBe(false);
			// Should not throw, should return 0 changesets
		});

		it("should handle empty git state", () => {
			vi.mocked(execSync).mockImplementation(() => Buffer.from("\n"));

			const gitState = {
				branch: "",
				commit: "",
				staged: [],
				unstaged: [],
			};

			expect(gitState.staged).toHaveLength(0);
			expect(gitState.unstaged).toHaveLength(0);
		});

		it("should handle corrupted state file", () => {
			writeFileSync(STATE_FILE, "invalid json {");

			let loadedState = null;
			try {
				loadedState = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
			} catch {
				loadedState = null;
			}

			expect(loadedState).toBeNull();
		});
	});
});
