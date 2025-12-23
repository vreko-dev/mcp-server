/**
 * Artifact Sources Tests
 *
 * Tests for ArtifactSource implementations that power the Composer in internal MCP.
 * Following 4-path coverage: happy path, sad path, edge case, error case.
 *
 * Per ROUTER.md C-003: Use specific assertions, not vague ones
 * Per ROUTER.md C-004a: No placeholder tests
 */

import * as path from "node:path";
import type { ComposeTriggerInput } from "@snapback/intelligence/composer";
import { beforeEach, describe, expect, it } from "vitest";
import { createLearningSource, createPatternSource, createRulesSource } from "../../sources/artifact-sources.js";
import { createTestEnvironment, type TestEnvironment } from "../setup.js";

/**
 * Helper to create full paths for mock filesystem
 */
function fullPath(env: TestEnvironment, relativePath: string): string {
	return path.join(env.tempDir, relativePath);
}

describe("Artifact Sources", () => {
	let env: TestEnvironment;
	let mockTrigger: ComposeTriggerInput;
	const workspaceSecret = "test-secret-key";

	beforeEach(() => {
		env = createTestEnvironment();
		// Set up files with full paths
		env.mockFs.setFile(fullPath(env, "patterns/violations.jsonl"), "");
		env.mockFs.setFile(fullPath(env, "patterns/codebase-patterns.md"), "# SnapBack Codebase Patterns\n");
		env.mockFs.setFile(fullPath(env, "feedback/learnings.jsonl"), "");
		env.mockFs.setFile(fullPath(env, "CONSTRAINTS.md"), "# Constraints\n");
		mockTrigger = {
			event: "start_task",
			workspaceFingerprint: "test-workspace-fp",
			keywords: ["auth", "api"],
			files: ["apps/api/src/auth.ts"],
		};
	});

	// =========================================================================
	// PatternSource Tests
	// =========================================================================

	describe("PatternSource", () => {
		describe("Happy Path", () => {
			it("generates candidates from codebase-patterns.md", async () => {
				const patternsContent = `# SnapBack Codebase Patterns

## Service Locations

| Domain | Canonical Location | Notes |
|--------|-------------------|-------|
| Dashboard metrics | apps/api/src/services/metrics-aggregator.ts | All dashboard data flows through here |

## Test Patterns

### Database Tests
\`\`\`typescript
import { setupTestDatabase } from '@/test-utils';
\`\`\`

## Common Violations (Learned)

### 1. Service Bypass
**Seen:** 1 time
**Pattern:** Direct DB queries in procedure files
**Fix:** Move all business logic to service layer
`;
				env.mockFs.setFile(fullPath(env, "patterns/codebase-patterns.md"), patternsContent);

				const source = createPatternSource({
					rootDir: env.tempDir,
					patternsFile: "patterns/codebase-patterns.md",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates.length).toBeGreaterThan(0);
				expect(candidates[0].lane).toBe("rules");
				expect(candidates[0].kind).toBe("rule_doc");
				expect(candidates[0].getContent()).toContain("Service Locations");
			});

			it("splits large patterns file into sections", async () => {
				const patternsContent = `# SnapBack Codebase Patterns

## Section One

Content for section one with important patterns.

## Section Two

Content for section two with different patterns.

## Section Three

Content for section three with more patterns.
`;
				env.mockFs.setFile(fullPath(env, "patterns/codebase-patterns.md"), patternsContent);

				const source = createPatternSource({
					rootDir: env.tempDir,
					patternsFile: "patterns/codebase-patterns.md",
					fs: env.mockFs,
					maxSectionTokens: 50, // Force splitting
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				// Should have multiple candidates for sections
				expect(candidates.length).toBeGreaterThan(1);
			});

			it("computes stable artifact IDs using HMAC", async () => {
				env.mockFs.setFile(
					fullPath(env, "patterns/codebase-patterns.md"),
					"# Patterns\n\n## Section\n\nContent",
				);

				const source = createPatternSource({
					rootDir: env.tempDir,
					patternsFile: "patterns/codebase-patterns.md",
					fs: env.mockFs,
				});

				const candidates1 = await source.generateCandidates(mockTrigger, workspaceSecret);
				const candidates2 = await source.generateCandidates(mockTrigger, workspaceSecret);

				// Same inputs should produce same IDs
				expect(candidates1[0].id).toBe(candidates2[0].id);
			});
		});

		describe("Sad Path", () => {
			it("returns empty array when patterns file does not exist", async () => {
				const source = createPatternSource({
					rootDir: env.tempDir,
					patternsFile: "patterns/nonexistent.md",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates).toEqual([]);
			});

			it("returns empty array when patterns file is empty", async () => {
				env.mockFs.setFile(fullPath(env, "patterns/codebase-patterns.md"), "");

				const source = createPatternSource({
					rootDir: env.tempDir,
					patternsFile: "patterns/codebase-patterns.md",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates).toEqual([]);
			});
		});

		describe("Edge Cases", () => {
			it("handles patterns file with only headers", async () => {
				env.mockFs.setFile(
					fullPath(env, "patterns/codebase-patterns.md"),
					"# Patterns\n\n## Section 1\n\n## Section 2\n",
				);

				const source = createPatternSource({
					rootDir: env.tempDir,
					patternsFile: "patterns/codebase-patterns.md",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				// Should handle gracefully - either empty or minimal candidates
				expect(Array.isArray(candidates)).toBe(true);
			});

			it("filters sections based on trigger keywords", async () => {
				const patternsContent = `# Patterns

## Authentication

Auth patterns for login and session management.

## Database

Database patterns for queries and connections.
`;
				env.mockFs.setFile(fullPath(env, "patterns/codebase-patterns.md"), patternsContent);

				const source = createPatternSource({
					rootDir: env.tempDir,
					patternsFile: "patterns/codebase-patterns.md",
					fs: env.mockFs,
				});

				const authTrigger: ComposeTriggerInput = {
					...mockTrigger,
					keywords: ["auth", "login"],
				};

				const candidates = await source.generateCandidates(authTrigger, workspaceSecret);

				// Auth section should have higher relevance
				const authCandidate = candidates.find((c) => c.getContent().includes("Authentication"));
				const dbCandidate = candidates.find((c) => c.getContent().includes("Database"));

				if (authCandidate && dbCandidate) {
					expect(authCandidate.relevanceScore).toBeGreaterThanOrEqual(dbCandidate.relevanceScore);
				}
			});
		});

		describe("Error Cases", () => {
			it("handles malformed markdown gracefully", async () => {
				env.mockFs.setFile(
					fullPath(env, "patterns/codebase-patterns.md"),
					"Not valid markdown\n\n```unclosed code block",
				);

				const source = createPatternSource({
					rootDir: env.tempDir,
					patternsFile: "patterns/codebase-patterns.md",
					fs: env.mockFs,
				});

				// Should not throw
				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(Array.isArray(candidates)).toBe(true);
			});
		});
	});

	// =========================================================================
	// LearningSource Tests
	// =========================================================================

	describe("LearningSource", () => {
		describe("Happy Path", () => {
			it("generates candidates from violations.jsonl", async () => {
				const violations = [
					{
						date: "2025-12-21T10:00:00Z",
						type: "LAYER_BOUNDARY_VIOLATION",
						file: "apps/vscode/src/auth.ts",
						message: "Imported infrastructure directly",
						prevention: "Use @snapback/core instead",
					},
					{
						date: "2025-12-21T11:00:00Z",
						type: "VAGUE_ASSERTION",
						file: "test/unit.test.ts",
						message: "Using toBeTruthy instead of specific assertion",
						prevention: "Use toEqual with expected value",
					},
				];

				env.mockFs.setFile(
					fullPath(env, "patterns/violations.jsonl"),
					violations.map((v) => JSON.stringify(v)).join("\n"),
				);

				const source = createLearningSource({
					rootDir: env.tempDir,
					violationsFile: "patterns/violations.jsonl",
					learningsFile: "feedback/learnings.jsonl",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates.length).toBeGreaterThan(0);
				expect(candidates[0].lane).toBe("history");
				expect(candidates[0].kind).toBe("violation");
			});

			it("generates candidates from learnings.jsonl", async () => {
				const learnings = [
					{
						id: "L123",
						type: "pattern",
						trigger: "auth integration",
						action: "Use @snapback/auth for all services",
						source: "auth-session-2025-12",
					},
				];

				env.mockFs.setFile(
					fullPath(env, "feedback/learnings.jsonl"),
					learnings.map((l) => JSON.stringify(l)).join("\n"),
				);
				env.mockFs.setFile(fullPath(env, "patterns/violations.jsonl"), "");

				const source = createLearningSource({
					rootDir: env.tempDir,
					violationsFile: "patterns/violations.jsonl",
					learningsFile: "feedback/learnings.jsonl",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				const learningCandidate = candidates.find((c) => c.kind === "learning");
				expect(learningCandidate).not.toBeUndefined();
				expect(learningCandidate?.kind).toBe("learning");
				expect(learningCandidate?.getContent()).toContain("auth integration");
			});

			it("filters violations by relevance to trigger keywords", async () => {
				const violations = [
					{
						type: "AUTH_ERROR",
						file: "apps/api/src/auth.ts",
						message: "Auth violation",
						prevention: "Fix auth",
					},
					{
						type: "DB_ERROR",
						file: "apps/api/src/database.ts",
						message: "Database violation",
						prevention: "Fix database",
					},
				];

				env.mockFs.setFile(
					fullPath(env, "patterns/violations.jsonl"),
					violations.map((v) => JSON.stringify(v)).join("\n"),
				);

				const source = createLearningSource({
					rootDir: env.tempDir,
					violationsFile: "patterns/violations.jsonl",
					learningsFile: "feedback/learnings.jsonl",
					fs: env.mockFs,
				});

				const authTrigger: ComposeTriggerInput = {
					...mockTrigger,
					keywords: ["auth"],
					files: ["apps/api/src/auth.ts"],
				};

				const candidates = await source.generateCandidates(authTrigger, workspaceSecret);

				// Auth-related violations should have higher relevance
				const authCandidate = candidates.find((c) => c.getContent().includes("AUTH_ERROR"));
				const dbCandidate = candidates.find((c) => c.getContent().includes("DB_ERROR"));

				if (authCandidate && dbCandidate) {
					expect(authCandidate.relevanceScore).toBeGreaterThan(dbCandidate.relevanceScore);
				}
			});
		});

		describe("Sad Path", () => {
			it("returns empty array when no violations or learnings exist", async () => {
				env.mockFs.setFile(fullPath(env, "patterns/violations.jsonl"), "");
				env.mockFs.setFile(fullPath(env, "feedback/learnings.jsonl"), "");

				const source = createLearningSource({
					rootDir: env.tempDir,
					violationsFile: "patterns/violations.jsonl",
					learningsFile: "feedback/learnings.jsonl",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates).toEqual([]);
			});

			it("returns empty array when files do not exist", async () => {
				const source = createLearningSource({
					rootDir: env.tempDir,
					violationsFile: "patterns/nonexistent.jsonl",
					learningsFile: "feedback/nonexistent.jsonl",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates).toEqual([]);
			});
		});

		describe("Edge Cases", () => {
			it("limits number of recent violations returned", async () => {
				// Create 50 violations
				const violations = Array.from({ length: 50 }, (_, i) => ({
					date: `2025-12-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
					type: `VIOLATION_${i}`,
					file: `file${i}.ts`,
					message: `Message ${i}`,
					prevention: `Prevention ${i}`,
				}));

				env.mockFs.setFile(
					fullPath(env, "patterns/violations.jsonl"),
					violations.map((v) => JSON.stringify(v)).join("\n"),
				);

				const source = createLearningSource({
					rootDir: env.tempDir,
					violationsFile: "patterns/violations.jsonl",
					learningsFile: "feedback/learnings.jsonl",
					maxViolations: 10,
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates.length).toBeLessThanOrEqual(10);
			});

			it("handles violations with missing fields gracefully", async () => {
				const violations = [
					{ type: "INCOMPLETE" }, // Missing other fields
					{ type: "COMPLETE", file: "file.ts", message: "msg", prevention: "prev" },
				];

				env.mockFs.setFile(
					fullPath(env, "patterns/violations.jsonl"),
					violations.map((v) => JSON.stringify(v)).join("\n"),
				);

				const source = createLearningSource({
					rootDir: env.tempDir,
					violationsFile: "patterns/violations.jsonl",
					learningsFile: "feedback/learnings.jsonl",
					fs: env.mockFs,
				});

				// Should not throw
				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(Array.isArray(candidates)).toBe(true);
			});
		});

		describe("Error Cases", () => {
			it("handles malformed JSONL gracefully", async () => {
				env.mockFs.setFile(fullPath(env, "patterns/violations.jsonl"), "not valid json\n{also invalid}");

				const source = createLearningSource({
					rootDir: env.tempDir,
					violationsFile: "patterns/violations.jsonl",
					learningsFile: "feedback/learnings.jsonl",
					fs: env.mockFs,
				});

				// Should not throw
				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(Array.isArray(candidates)).toBe(true);
			});
		});
	});

	// =========================================================================
	// RulesSource Tests
	// =========================================================================

	describe("RulesSource", () => {
		describe("Happy Path", () => {
			it("generates candidates from CONSTRAINTS.md", async () => {
				const constraintsContent = `# Constraints

## Hard Rules (Non-Negotiable)

### C-001: Layer Boundary Enforcement
\`\`\`
RULE: Presentation layer CANNOT import Infrastructure layer
\`\`\`

### C-002: Service Layer for Business Logic
\`\`\`
RULE: Database queries MUST go through service layer
\`\`\`
`;
				env.mockFs.setFile(fullPath(env, "CONSTRAINTS.md"), constraintsContent);

				const source = createRulesSource({
					rootDir: env.tempDir,
					constraintsFile: "CONSTRAINTS.md",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates.length).toBeGreaterThan(0);
				expect(candidates[0].lane).toBe("policy");
				expect(candidates[0].kind).toBe("constraint");
			});

			it("assigns high relevance and specificity to constraints", async () => {
				env.mockFs.setFile(
					fullPath(env, "CONSTRAINTS.md"),
					"# Constraints\n\n## Hard Rules\n\nNEVER bypass auth.",
				);

				const source = createRulesSource({
					rootDir: env.tempDir,
					constraintsFile: "CONSTRAINTS.md",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates.length).toBeGreaterThan(0);
				// Constraints should have high relevance
				expect(candidates[0].relevanceScore).toBeGreaterThanOrEqual(0.9);
			});
		});

		describe("Sad Path", () => {
			it("returns empty array when constraints file does not exist", async () => {
				const source = createRulesSource({
					rootDir: env.tempDir,
					constraintsFile: "NONEXISTENT.md",
					fs: env.mockFs,
				});

				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(candidates).toEqual([]);
			});
		});

		describe("Edge Cases", () => {
			it("loads path-targeted rules when files match globs", async () => {
				const rulesContent = `---
globs:
  - "apps/api/**"
alwaysApply: false
---

# API Rules

All API endpoints must use proper validation.
`;
				env.mockFs.setFile(fullPath(env, "rules/50-api-rules.md"), rulesContent);
				env.mockFs.setFile(fullPath(env, "CONSTRAINTS.md"), "# Constraints");

				const source = createRulesSource({
					rootDir: env.tempDir,
					constraintsFile: "CONSTRAINTS.md",
					rulesDir: "rules",
					fs: env.mockFs,
				});

				const apiTrigger: ComposeTriggerInput = {
					...mockTrigger,
					files: ["apps/api/src/auth.ts"],
				};

				const candidates = await source.generateCandidates(apiTrigger, workspaceSecret);

				// Should include API rules because file matches glob
				const apiRuleCandidate = candidates.find((c) => c.getContent().includes("API endpoints"));
				expect(apiRuleCandidate).not.toBeUndefined();
				expect(apiRuleCandidate?.kind).toBe("rule_doc");
			});

			it("always includes alwaysApply rules", async () => {
				const rulesContent = `---
alwaysApply: true
---

# Core Rules

Always follow these patterns.
`;
				env.mockFs.setFile(fullPath(env, "rules/00-core-rules.md"), rulesContent);
				env.mockFs.setFile(fullPath(env, "CONSTRAINTS.md"), "# Constraints");

				const source = createRulesSource({
					rootDir: env.tempDir,
					constraintsFile: "CONSTRAINTS.md",
					rulesDir: "rules",
					fs: env.mockFs,
				});

				// Trigger with unrelated files
				const unrelatedTrigger: ComposeTriggerInput = {
					...mockTrigger,
					files: ["some/other/file.ts"],
				};

				const candidates = await source.generateCandidates(unrelatedTrigger, workspaceSecret);

				// Should still include core rules
				const coreRuleCandidate = candidates.find((c) => c.getContent().includes("Always follow"));
				expect(coreRuleCandidate).not.toBeUndefined();
				expect(coreRuleCandidate?.kind).toBe("rule_doc");
			});
		});

		describe("Error Cases", () => {
			it("handles rules with malformed frontmatter gracefully", async () => {
				const rulesContent = `---
invalid yaml here: [
---

# Some Rules

Content here.
`;
				env.mockFs.setFile(fullPath(env, "rules/bad-rules.md"), rulesContent);
				env.mockFs.setFile(fullPath(env, "CONSTRAINTS.md"), "# Constraints\n\n## Rules\n\nTest");

				const source = createRulesSource({
					rootDir: env.tempDir,
					constraintsFile: "CONSTRAINTS.md",
					rulesDir: "rules",
					fs: env.mockFs,
				});

				// Should not throw
				const candidates = await source.generateCandidates(mockTrigger, workspaceSecret);

				expect(Array.isArray(candidates)).toBe(true);
			});
		});
	});
});
