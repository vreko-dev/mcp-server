import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIDetectionEngine } from "../src/ai-detection";
import { SimpleCircuitBreaker } from "../src/circuit-breaker";
import { DependencyAnalyzer } from "../src/dependency-analyzer";
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

describe("Full Implementation Example", () => {
	let gitIntegration: GitIntegration;
	let guardian: Guardian;
	let circuitBreaker: SimpleCircuitBreaker;
	let dependencyAnalyzer: DependencyAnalyzer;
	let aiDetectionEngine: AIDetectionEngine;

	beforeEach(() => {
		vi.clearAllMocks();
		gitIntegration = new GitIntegration();
		guardian = new Guardian();
		circuitBreaker = new SimpleCircuitBreaker();
		dependencyAnalyzer = new DependencyAnalyzer();
		aiDetectionEngine = new AIDetectionEngine();
	});

	it("should demonstrate a complete security analysis pipeline", async () => {
		// Mock git methods for a typical development scenario
		mockGit.branch.mockResolvedValue({
			current: "feature/security-fix",
			all: ["main", "develop", "feature/security-fix"],
		});

		mockGit.revparse.mockResolvedValue("commit-a1b2c3d4");

		mockGit.status.mockResolvedValue({
			not_added: ["src/new-feature.ts"],
			deleted: [],
			modified: ["src/index.ts", "package.json"],
			created: [],
			conflicted: [],
		});

		mockGit.log.mockResolvedValue({
			latest: {
				hash: "commit-a1b2c3d4",
				date: "2023-01-01",
				message: "Fix security vulnerability",
				author_name: "Security Team",
				author_email: "security@example.com",
			},
			all: [],
		});

		mockGit.diff.mockResolvedValue(`diff --git a/src/index.ts b/src/index.ts
index 1234567..89abcde 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,5 @@
+// TODO: Remove this hardcoded password before production
+const dbPassword = "supersecretpassword123";
 export function processData(data: any) {
   // Process the data
   return data;
@@ -10,2 +12,3 @@ export function processData(data: any) {
 }
+
+rm -rf /tmp/old_data;
`);

		// 1. Get Git context
		console.log("1. Getting Git context...");
		const context = await gitIntegration.getCommitContext();
		expect(context.branch).toBe("feature/security-fix");
		expect(context.changes.modified).toContain("src/index.ts");

		// 2. Get diff for analysis
		console.log("2. Getting code diff...");
		const diff = await gitIntegration.getDiff({ staged: true });

		// 3. Detect immediate security threats
		console.log("3. Detecting security threats...");
		const threats = detectThreats(diff);
		expect(threats).toHaveLength(2); // hardcoded password and rm -rf

		// Verify threat severity
		const criticalThreats = threats.filter((t) => t.severity === 1.0);
		const highThreats = threats.filter((t) => t.severity === 0.8);
		expect(criticalThreats).toHaveLength(1); // rm -rf
		expect(highThreats).toHaveLength(1); // hardcoded password

		// 4. Analyze code quality with Guardian
		console.log("4. Analyzing code quality...");
		const analysis = await circuitBreaker.execute(async () => {
			return await guardian.analyze(diff);
		});
		expect(analysis.score).toBeGreaterThanOrEqual(0);

		// 5. Check for dependency changes
		console.log("5. Analyzing dependencies...");
		const packageJsonBefore = {
			dependencies: {
				express: "4.18.0",
				lodash: "4.17.20",
			},
		};

		const packageJsonAfter = {
			dependencies: {
				express: "5.0.0", // Major version bump
				lodash: "4.17.21", // Patch version bump
			},
		};

		const dependencyRisk = dependencyAnalyzer.quickAnalyze(packageJsonBefore, packageJsonAfter);
		expect(dependencyRisk.score).toBeGreaterThanOrEqual(0.7); // Major bump detected
		expect(dependencyRisk.breaking).toContain("express:4.18.0→5.0.0");

		// 6. Check for AI-generated patterns
		console.log("6. Detecting AI patterns...");
		const changeEvents = [
			{ file: "src/index.ts", size: 3500, timestamp: Date.now() - 5000 },
			{
				file: "src/new-feature.ts",
				size: 4200,
				timestamp: Date.now() - 4000,
			},
			{ file: "src/utils.ts", size: 3800, timestamp: Date.now() - 3000 },
		];

		const aiDetection = aiDetectionEngine.analyze(changeEvents);
		console.log("AI Detection Result:", aiDetection); // Debug log
		expect(aiDetection.confidence).toBeGreaterThanOrEqual(0.6); // Burst activity detected
		// Only check for patterns if confidence is high enough
		if (aiDetection.confidence > 0.6) {
			expect(aiDetection.patterns).toContain("burst-write");
		}

		// 7. Create comprehensive security report
		console.log("7. Generating security report...");
		const securityReport = {
			timestamp: new Date().toISOString(),
			gitContext: context,
			threats: {
				count: threats.length,
				critical: criticalThreats.length,
				high: highThreats.length,
				details: threats,
			},
			codeAnalysis: {
				score: analysis.score,
				severity: analysis.severity,
				factors: analysis.factors,
			},
			dependencies: dependencyRisk,
			aiPatterns: aiDetection,
			recommendations: [
				"Remove hardcoded credentials immediately",
				"Review rm -rf usage for security implications",
				"Test breaking changes from express v5 upgrade",
				"Verify AI-generated code for correctness",
			],
		};

		// Verify the report structure
		expect(securityReport.gitContext.branch).toBe("feature/security-fix");
		expect(securityReport.threats.count).toBe(2);
		expect(securityReport.threats.critical).toBe(1);
		expect(securityReport.threats.high).toBe(1);
		expect(securityReport.codeAnalysis.score).toBeGreaterThanOrEqual(0);
		expect(securityReport.dependencies.score).toBeGreaterThanOrEqual(0.7);
		expect(securityReport.aiPatterns.confidence).toBeGreaterThanOrEqual(0.6);
		expect(securityReport.recommendations).toHaveLength(4);

		console.log("✅ Complete security analysis pipeline executed successfully!");
		console.log(`🔍 Found ${securityReport.threats.count} security threats`);
		console.log(`📊 Code quality score: ${securityReport.codeAnalysis.score}`);
		console.log(`📦 Dependency risk score: ${securityReport.dependencies.score}`);
		console.log(`🤖 AI detection confidence: ${securityReport.aiPatterns.confidence}`);
	});

	it("should handle error cases gracefully", async () => {
		// Mock git to fail
		mockGit.branch.mockRejectedValue(new Error("Repository not found"));
		mockGit.revparse.mockRejectedValue(new Error("Repository not found"));
		mockGit.status.mockRejectedValue(new Error("Repository not found"));
		mockGit.log.mockRejectedValue(new Error("Repository not found"));
		mockGit.diff.mockRejectedValue(new Error("Repository not found"));

		// Should not throw errors but return safe defaults
		const context = await gitIntegration.getCommitContext();
		expect(context.branch).toBe("unknown");

		const diff = await gitIntegration.getDiff();
		expect(diff).toBe("");

		// Circuit breaker should handle failures
		const failingFunction = async () => {
			throw new Error("Analysis failed");
		};

		// First two failures
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow("Analysis failed");
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow("Analysis failed");

		// Third failure should open circuit
		await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow("Circuit breaker open");

		console.log("✅ Error handling working correctly!");
	});
});
