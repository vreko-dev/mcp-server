/**
 * CLI to MCP Integration Test
 *
 * Verifies that the CLI creates .snapback/ directory structure
 * that MCP server can read from.
 *
 * This tests the handoff between:
 * - CLI (apps/cli) - Creates and writes to .snapback/
 * - MCP Server (apps/mcp-server) - Reads from .snapback/
 */

import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Import CLI services (using relative paths for integration testing)
import {
	createSnapbackDirectory,
	generateId,
	isSnapbackInitialized,
	recordLearning,
	recordViolation,
	saveCurrentSession,
	saveProtectedFiles,
	saveWorkspaceConfig,
	saveWorkspaceVitals,
} from "../../../cli/src/services/snapback-dir";
import { handleReadResource } from "../../src/resources/snap-resources";
// Import MCP handlers
import { handleGetRecommendations, handleSessionStats, handleStartSession } from "../../src/tools/learning-tools";

describe("CLI to MCP Integration", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create temp directory for each test
		testDir = join(tmpdir(), `snapback-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		// Clean up
		try {
			await rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Workspace Initialization Flow", () => {
		it("should create .snapback/ directory that MCP can read", async () => {
			// Step 1: CLI creates .snapback/ directory
			await createSnapbackDirectory(testDir);

			// Step 2: Verify initialization
			const initialized = await isSnapbackInitialized(testDir);
			// Should be false until we create config.json
			expect(initialized).toBe(false);

			// Step 3: CLI saves config
			await saveWorkspaceConfig(
				{
					tier: "free",
					protectionLevel: "standard",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				testDir,
			);

			// Step 4: Verify initialization now succeeds
			const initializedAfterConfig = await isSnapbackInitialized(testDir);
			expect(initializedAfterConfig).toBe(true);

			// Step 5: CLI saves vitals
			await saveWorkspaceVitals(
				{
					framework: "nextjs",
					frameworkConfidence: 0.95,
					packageManager: "pnpm",
					typescript: { enabled: true, strict: true },
					criticalFiles: ["src/auth/index.ts", "prisma/schema.prisma"],
					detectedAt: new Date().toISOString(),
				},
				testDir,
			);

			// Step 6: MCP reads workspace resource
			const workspaceResource = await handleReadResource("snap://workspace", testDir);
			expect(workspaceResource.contents).toBeDefined();
			expect(workspaceResource.contents.length).toBeGreaterThan(0);

			const workspaceData = JSON.parse(workspaceResource.contents[0].text);
			expect(workspaceData.initialized).toBe(true);
			expect(workspaceData.vitals.framework).toBe("nextjs");
			expect(workspaceData.vitals.packageManager).toBe("pnpm");
		});

		it("should handle protected files from CLI to MCP", async () => {
			// CLI creates directory and saves protected files
			await createSnapbackDirectory(testDir);
			await saveWorkspaceConfig(
				{
					tier: "free",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				testDir,
			);
			await saveProtectedFiles(
				[
					{ pattern: "src/auth/**", addedAt: new Date().toISOString(), reason: "Authentication" },
					{ pattern: ".env*", addedAt: new Date().toISOString(), reason: "Secrets" },
				],
				testDir,
			);

			// MCP reads workspace resource
			const workspaceResource = await handleReadResource("snap://workspace", testDir);
			const workspaceData = JSON.parse(workspaceResource.contents[0].text);

			expect(workspaceData.protectedFiles).toContain("src/auth/**");
			expect(workspaceData.protectedFiles).toContain(".env*");
		});
	});

	describe("Session Flow", () => {
		it("should share session state between CLI and MCP", async () => {
			// CLI creates directory
			await createSnapbackDirectory(testDir);
			await saveWorkspaceConfig(
				{
					tier: "free",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				testDir,
			);

			// CLI starts session
			const sessionId = generateId("sess");
			await saveCurrentSession(
				{
					id: sessionId,
					task: "Refactor authentication",
					startedAt: new Date().toISOString(),
					snapshotCount: 2,
					filesModified: 5,
				},
				testDir,
			);

			// MCP reads session stats
			const statsResult = await handleSessionStats({}, undefined, testDir);
			const jsonContent = statsResult.content.find((c) => c.type === "json");
			const stats = jsonContent?.json as {
				sessionId?: string;
				snapshotCount?: number;
				filesModified?: number;
			};

			expect(stats?.sessionId).toBe(sessionId);
			expect(stats?.snapshotCount).toBe(2);
			expect(stats?.filesModified).toBe(5);

			// MCP reads workspace resource
			const workspaceResource = await handleReadResource("snap://workspace", testDir);
			const workspaceData = JSON.parse(workspaceResource.contents[0].text);

			expect(workspaceData.session).toBeDefined();
			expect(workspaceData.session.id).toBe(sessionId);
			expect(workspaceData.session.task).toBe("Refactor authentication");
		});
	});

	describe("Learnings Flow", () => {
		it("should share learnings from CLI to MCP", async () => {
			// CLI creates directory
			await createSnapbackDirectory(testDir);
			await saveWorkspaceConfig(
				{
					tier: "free",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				testDir,
			);

			// CLI records learnings
			await recordLearning(
				{
					id: generateId("L"),
					type: "pattern",
					trigger: "database queries",
					action: "Always use parameterized queries to prevent SQL injection",
					source: "session-123",
					createdAt: new Date().toISOString(),
				},
				testDir,
			);
			await recordLearning(
				{
					id: generateId("L"),
					type: "pitfall",
					trigger: "authentication",
					action: "Never store plain text passwords",
					source: "session-456",
					createdAt: new Date().toISOString(),
				},
				testDir,
			);

			// MCP reads learnings resource
			const learningsResource = await handleReadResource("snap://learnings", testDir);
			expect(learningsResource.contents[0].text).toContain("database queries");
			expect(learningsResource.contents[0].text).toContain("authentication");

			// MCP gets recommendations with keywords
			const recResult = await handleGetRecommendations({ keywords: ["database"] }, undefined, testDir);
			const jsonContent = recResult.content.find((c) => c.type === "json");
			const recs = jsonContent?.json as { recommendations?: unknown[] };

			expect(recs?.recommendations).toBeDefined();
			expect(recs?.recommendations?.length).toBeGreaterThan(0);
		});

		it("should include learnings in session start", async () => {
			// CLI creates directory with learnings
			await createSnapbackDirectory(testDir);
			await saveWorkspaceConfig(
				{
					tier: "free",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				testDir,
			);
			await recordLearning(
				{
					id: generateId("L"),
					type: "pattern",
					trigger: "auth implementation",
					action: "Use @snapback/auth package for authentication",
					source: "previous-session",
					createdAt: new Date().toISOString(),
				},
				testDir,
			);

			// MCP starts session
			const sessionResult = await handleStartSession({ taskDescription: "Auth work" }, undefined, testDir);
			const textContent = sessionResult.content.find((c) => c.type === "text");

			// Should include recommendations from learnings
			expect(textContent?.text).toContain("Recommendations");
		});
	});

	describe("Patterns Flow", () => {
		it("should share violations from CLI to MCP patterns resource", async () => {
			// CLI creates directory
			await createSnapbackDirectory(testDir);
			await saveWorkspaceConfig(
				{
					tier: "free",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				testDir,
			);

			// CLI records violations
			await recordViolation(
				{
					type: "layer-boundary-violation",
					file: "src/web/api.ts",
					message: "Web layer importing from infrastructure",
					count: 1,
					date: new Date().toISOString(),
					prevention: "Use @snapback/core instead of direct import",
				},
				testDir,
			);
			await recordViolation(
				{
					type: "layer-boundary-violation",
					file: "src/web/db.ts",
					message: "Web layer importing from infrastructure",
					count: 2,
					date: new Date().toISOString(),
				},
				testDir,
			);
			await recordViolation(
				{
					type: "layer-boundary-violation",
					file: "src/web/auth.ts",
					message: "Web layer importing from infrastructure",
					count: 3,
					date: new Date().toISOString(),
				},
				testDir,
			);

			// MCP reads patterns resource
			const patternsResource = await handleReadResource("snap://patterns", testDir);

			// Should show violations grouped by type with count
			expect(patternsResource.contents[0].text).toContain("layer-boundary-violation");
			expect(patternsResource.contents[0].text).toContain("3x");
			// 3x should trigger PROMOTE status
			expect(patternsResource.contents[0].text).toContain("PROMOTE");
		});
	});

	describe("Preferences Flow", () => {
		it("should expose workspace preferences to MCP", async () => {
			// CLI creates directory with config
			await createSnapbackDirectory(testDir);
			await saveWorkspaceConfig(
				{
					tier: "pro",
					protectionLevel: "strict",
					syncEnabled: true,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				testDir,
			);
			await saveWorkspaceVitals(
				{
					framework: "remix",
					packageManager: "npm",
					typescript: { enabled: true },
					detectedAt: new Date().toISOString(),
				},
				testDir,
			);

			// MCP reads preferences
			const prefsResource = await handleReadResource("snap://preferences", testDir);
			const prefs = JSON.parse(prefsResource.contents[0].text);

			expect(prefs.workspace.tier).toBe("pro");
			expect(prefs.workspace.protectionLevel).toBe("strict");
			expect(prefs.workspace.syncEnabled).toBe(true);
			expect(prefs.stack.framework).toBe("remix");
			expect(prefs.stack.packageManager).toBe("npm");
		});
	});
});
