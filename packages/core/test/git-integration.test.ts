import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitIntegration } from "../src/git-integration.js";

// Mock simple-git module
const mockGit = {
	status: vi.fn(),
	log: vi.fn(),
	branch: vi.fn(),
	revparse: vi.fn(),
	diff: vi.fn(),
};

vi.mock("simple-git", () => ({
	default: () => mockGit,
}));

describe("GitIntegration", () => {
	let gitIntegration: GitIntegration;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();
		gitIntegration = new GitIntegration();
	});

	describe("getCommitContext", () => {
		it("should return commit context with branch and commit info", async () => {
			// Mock the git methods
			mockGit.branch.mockResolvedValue({
				current: "main",
				all: ["main", "develop"],
			});

			mockGit.revparse.mockResolvedValue("abc123def456");

			mockGit.status.mockResolvedValue({
				not_added: [],
				deleted: [],
				modified: ["src/index.ts"],
				created: [],
				conflicted: [],
			});

			mockGit.log.mockResolvedValue({
				latest: {
					hash: "abc123",
					date: "2023-01-01",
					message: "Test commit",
					author_name: "Test Author",
					author_email: "test@example.com",
				},
				all: [],
			});

			const context = await gitIntegration.getCommitContext();

			expect(context).toEqual({
				branch: "main",
				commitHash: "abc123def456",
				commitMessage: "Test commit",
				author: "Test Author",
				changes: {
					modified: ["src/index.ts"],
					added: [],
					deleted: [],
				},
			});
		});

		it("should handle when there are no commits yet", async () => {
			mockGit.branch.mockResolvedValue({
				current: "main",
				all: ["main"],
			});

			mockGit.revparse.mockResolvedValue("");

			mockGit.status.mockResolvedValue({
				not_added: [],
				deleted: [],
				modified: [],
				created: [],
				conflicted: [],
			});

			mockGit.log.mockResolvedValue({
				latest: null,
				all: [],
			});

			const context = await gitIntegration.getCommitContext();

			expect(context).toEqual({
				branch: "main",
				commitHash: "",
				commitMessage: "",
				author: "",
				changes: {
					modified: [],
					added: [],
					deleted: [],
				},
			});
		});
	});

	describe("getFileHistory", () => {
		it("should return file history with commit information", async () => {
			mockGit.log.mockResolvedValue({
				all: [
					{
						hash: "abc123",
						date: "2023-01-01",
						message: "Update file",
						author_name: "Test Author",
					},
					{
						hash: "def456",
						date: "2022-12-31",
						message: "Initial commit",
						author_name: "Test Author",
					},
				],
			});

			const history = await gitIntegration.getFileHistory("src/index.ts");

			expect(history).toHaveLength(2);
			expect(history[0]).toEqual({
				hash: "abc123",
				date: "2023-01-01",
				message: "Update file",
				author: "Test Author",
			});
		});

		it("should handle files with no history", async () => {
			mockGit.log.mockResolvedValue({
				all: [],
			});

			const history = await gitIntegration.getFileHistory("new-file.ts");

			expect(history).toEqual([]);
		});
	});

	describe("getDiff", () => {
		it("should return diff for staged changes", async () => {
			mockGit.diff.mockResolvedValue("diff --git a/src/index.ts b/src/index.ts\n+new line\n-old line");

			const diff = await gitIntegration.getDiff({ staged: true });

			expect(diff).toBe("diff --git a/src/index.ts b/src/index.ts\n+new line\n-old line");
		});

		it("should return diff for specific files", async () => {
			mockGit.diff.mockResolvedValue("diff --git a/src/file1.ts b/src/file1.ts\n+line1\n-line2");

			const diff = await gitIntegration.getDiff({
				files: ["src/file1.ts"],
			});

			expect(diff).toBe("diff --git a/src/file1.ts b/src/file1.ts\n+line1\n-line2");
		});
	});
});
