import { beforeEach, describe, expect, it, vi } from "vitest";
import { SimpleCircuitBreaker } from "../src/circuit-breaker";
import { GitIntegration } from "../src/git-integration";
import { Guardian } from "../src/guardian";
import { detectThreats } from "../src/threat-detection";

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

describe("Git Integration with Guardian", () => {
	let gitIntegration: GitIntegration;
	let guardian: Guardian;

	beforeEach(() => {
		vi.clearAllMocks();
		gitIntegration = new GitIntegration();
		guardian = new Guardian();
	});

	it("should analyze code changes with Git context and threat detection", async () => {
		// Mock git methods
		mockGit.branch.mockResolvedValue({
			current: "feature/new-feature",
			all: ["main", "develop", "feature/new-feature"],
		});

		mockGit.revparse.mockResolvedValue("a1b2c3d4e5f6");

		mockGit.status.mockResolvedValue({
			not_added: [],
			deleted: [],
			modified: ["src/index.ts"],
			created: [],
			conflicted: [],
		});

		mockGit.log.mockResolvedValue({
			latest: {
				hash: "a1b2c3d4e5f6",
				date: "2023-01-01",
				message: "Add new feature",
				author_name: "Developer",
				author_email: "dev@example.com",
			},
			all: [],
		});

		mockGit.diff.mockResolvedValue(`diff --git a/src/index.ts b/src/index.ts
index 1234567..89abcde 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,5 @@
+const password = "secret123";
+const apiKey = "abc123xyz";
 export function processData(data: any) {
   // Process the data
   return data;
`);

		// Get Git context
		const context = await gitIntegration.getCommitContext();

		// Get diff for analysis
		const diff = await gitIntegration.getDiff({ staged: true });

		// Detect threats in the diff
		const threats = detectThreats(diff);

		// Analyze with Guardian
		const analysis = await guardian.analyze(diff);

		// Verify results
		expect(context.branch).toBe("feature/new-feature");
		expect(context.commitHash).toBe("a1b2c3d4e5f6");
		expect(threats).toHaveLength(2); // password and apiKey
		expect(analysis.score).toBeGreaterThanOrEqual(0); // Analysis should complete

		// Check that we found security threats
		const highSeverityThreats = threats.filter((t) => t.severity >= 0.8);
		expect(highSeverityThreats).toHaveLength(2);
	});

	it("should use circuit breaker for safe Git operations", async () => {
		// Mock git methods to succeed
		mockGit.branch.mockResolvedValue({
			current: "main",
			all: ["main"],
		});

		mockGit.revparse.mockResolvedValue("head123");

		mockGit.status.mockResolvedValue({
			not_added: [],
			deleted: [],
			modified: [],
			created: [],
			conflicted: [],
		});

		mockGit.log.mockResolvedValue({
			latest: {
				hash: "head123",
				date: "2023-01-01",
				message: "Latest commit",
				author_name: "Developer",
				author_email: "dev@example.com",
			},
			all: [],
		});

		const circuitBreaker = new SimpleCircuitBreaker();

		// Wrap Git operations with circuit breaker
		const getContextSafely = async () => {
			return await circuitBreaker.execute(async () => {
				return await gitIntegration.getCommitContext();
			});
		};

		const context = await getContextSafely();

		expect(context.branch).toBe("main");
		expect(context.commitHash).toBe("head123");
	});

	it("should handle Git operation failures gracefully", async () => {
		// Mock git methods to fail
		mockGit.branch.mockRejectedValue(new Error("Git repository not found"));
		mockGit.revparse.mockRejectedValue(new Error("Git repository not found"));
		mockGit.status.mockRejectedValue(new Error("Git repository not found"));
		mockGit.log.mockRejectedValue(new Error("Git repository not found"));

		const context = await gitIntegration.getCommitContext();

		// Should return default context on failure
		expect(context.branch).toBe("unknown");
		expect(context.commitHash).toBe("");
		expect(context.changes.modified).toEqual([]);
	});
});
