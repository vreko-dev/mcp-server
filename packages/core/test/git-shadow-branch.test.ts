import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitIntegration } from "../src/git-integration.js";

// Mock simple-git module
const mockGit = {
	status: vi.fn(),
	log: vi.fn(),
	branch: vi.fn(),
	revparse: vi.fn(),
	diff: vi.fn(),
	checkout: vi.fn(),
	stash: vi.fn(),
	merge: vi.fn(),
	reset: vi.fn(),
	add: vi.fn(),
	commit: vi.fn(),
	rebase: vi.fn(),
};

vi.mock("simple-git", () => ({
	default: () => mockGit,
}));

describe("GitIntegration - Shadow Branch Operations", () => {
	let gitIntegration: GitIntegration;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();
		gitIntegration = new GitIntegration();
	});

	describe("createShadowBranch", () => {
		it("should create a shadow branch for context preservation", async () => {
			// Mock the git methods
			mockGit.branch.mockResolvedValue({
				current: "main",
				all: ["main", "develop"],
			});

			mockGit.checkout.mockResolvedValue(undefined);

			const result = await gitIntegration.createShadowBranch("main");

			expect(result).toBeDefined();
			expect(typeof result).toBe("string");
			expect(result).toContain("snapback/shadow/");
			expect(mockGit.checkout).toHaveBeenCalledWith(["-b", expect.stringContaining("snapback/shadow/main/")]);
		});

		it("should handle errors when creating shadow branch", async () => {
			mockGit.checkout.mockRejectedValue(new Error("Git operation failed"));

			const result = await gitIntegration.createShadowBranch("main");

			expect(result).toBeNull();
		});
	});

	describe("stashSnapshot", () => {
		it("should create a stash for snapshotting", async () => {
			mockGit.stash.mockResolvedValue("");

			const result = await gitIntegration.stashSnapshot("Checkpoint message");

			expect(result).toBeDefined();
			expect(result.created).toBe(true);
		});

		it("should handle when there are no changes to stash", async () => {
			mockGit.stash.mockResolvedValue("No local changes to save");

			const result = await gitIntegration.stashSnapshot("Checkpoint message");

			expect(result).toBeDefined();
			expect(result.created).toBe(false);
		});
	});

	describe("switchBranchWithSnapshotPreservation", () => {
		it("should switch branches without losing snapshots", async () => {
			mockGit.checkout.mockResolvedValue(undefined);
			mockGit.branch.mockResolvedValue({
				current: "feature-branch",
				all: ["main", "feature-branch"],
			});

			const result = await gitIntegration.switchBranchWithSnapshotPreservation("feature-branch");

			expect(result).toBe(true);
			expect(mockGit.checkout).toHaveBeenCalledWith("feature-branch");
		});

		it("should handle errors when switching branches", async () => {
			mockGit.checkout.mockRejectedValue(new Error("Branch not found"));

			const result = await gitIntegration.switchBranchWithSnapshotPreservation("non-existent-branch");

			expect(result).toBe(false);
		});
	});

	describe("handleDetachedHeadState", () => {
		it("should handle detached HEAD states", async () => {
			mockGit.revparse.mockResolvedValue("abc123def456");
			mockGit.checkout.mockResolvedValue(undefined);
			mockGit.branch.mockResolvedValue({
				current: "main",
				all: ["main", "feature-branch"],
			});

			const result = await gitIntegration.handleDetachedHeadState();

			expect(result).toBe(true);
		});

		it("should handle errors when recovering from detached HEAD", async () => {
			mockGit.revparse.mockRejectedValue(new Error("Not a git repository"));

			const result = await gitIntegration.handleDetachedHeadState();

			expect(result).toBe(false);
		});
	});

	describe("recoverFromMidRebaseMergeConflicts", () => {
		it("should recover from mid-rebase/merge conflicts", async () => {
			mockGit.rebase.mockRejectedValue(new Error("No rebase in progress"));
			mockGit.merge.mockRejectedValue(new Error("No merge in progress"));
			mockGit.reset.mockResolvedValue(undefined);
			mockGit.branch.mockResolvedValue({
				current: "main",
				all: ["main"],
			});

			const result = await gitIntegration.recoverFromMidRebaseMergeConflicts();

			expect(result).toBe(true);
			expect(mockGit.reset).toHaveBeenCalledWith(["--hard", "HEAD"]);
		});

		it("should handle errors during conflict recovery", async () => {
			mockGit.rebase.mockRejectedValue(new Error("No rebase in progress"));
			mockGit.merge.mockRejectedValue(new Error("No merge in progress"));
			mockGit.reset.mockRejectedValue(new Error("Reset failed"));

			const result = await gitIntegration.recoverFromMidRebaseMergeConflicts();

			expect(result).toBe(false);
		});
	});
});
