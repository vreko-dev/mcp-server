/**
 * Learning Tools Unit Tests
 *
 * Tests for learning-tools.ts:
 * - handleStartSession
 * - handleGetRecommendations
 * - handleSessionStats
 *
 * Tests local fallback behavior when API is unavailable.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleGetRecommendations, handleSessionStats, handleStartSession } from "../../../src/tools/learning-tools";

describe("Learning Tools", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create temp directory for each test
		testDir = join(tmpdir(), `snapback-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		await mkdir(join(testDir, ".snapback", "learnings"), { recursive: true });
		await mkdir(join(testDir, ".snapback", "session"), { recursive: true });
	});

	afterEach(async () => {
		// Clean up
		try {
			await rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("handleStartSession", () => {
		it("should start session with local fallback when no API client", async () => {
			const result = await handleStartSession(
				{ taskDescription: "Add auth feature" },
				undefined, // No API client
				testDir,
			);

			expect(result.content).toBeDefined();
			expect(result.content.length).toBeGreaterThan(0);

			// Check that we got a session ID
			const jsonContent = result.content.find((c) => c.type === "json");
			expect(jsonContent).toBeDefined();
			expect((jsonContent?.json as { sessionId?: string })?.sessionId).toMatch(/^sess_/);

			// Check text content
			const textContent = result.content.find((c) => c.type === "text");
			expect(textContent?.text).toContain("Session started");
		});

		it("should include task description in response", async () => {
			const result = await handleStartSession({ taskDescription: "Refactor database layer" }, undefined, testDir);

			const textContent = result.content.find((c) => c.type === "text");
			expect(textContent?.text).toContain("Refactor database layer");
		});

		it("should include workspace vitals if available", async () => {
			// Create vitals file
			await writeFile(
				join(testDir, ".snapback", "vitals.json"),
				JSON.stringify({
					framework: "nextjs",
					packageManager: "pnpm",
					typescript: { enabled: true },
				}),
			);

			const result = await handleStartSession({ taskDescription: "Test task" }, undefined, testDir);

			const textContent = result.content.find((c) => c.type === "text");
			expect(textContent?.text).toContain("nextjs");
		});

		it("should include protected files if available", async () => {
			// Create protected files
			await writeFile(
				join(testDir, ".snapback", "protected.json"),
				JSON.stringify([{ pattern: "src/auth/**", addedAt: new Date().toISOString() }]),
			);

			const result = await handleStartSession({ taskDescription: "Test task" }, undefined, testDir);

			const textContent = result.content.find((c) => c.type === "text");
			expect(textContent?.text).toContain("Protected files");
		});

		it("should include recommendations from local learnings", async () => {
			// Create learnings file
			const learnings = [
				{
					id: "L1",
					type: "pattern",
					trigger: "auth implementation",
					action: "Always use @snapback/auth package",
					source: "test-session",
					createdAt: new Date().toISOString(),
				},
			];
			await writeFile(
				join(testDir, ".snapback", "learnings", "user-learnings.jsonl"),
				learnings.map((l) => JSON.stringify(l)).join("\n"),
			);

			const result = await handleStartSession({ taskDescription: "Auth work" }, undefined, testDir);

			const textContent = result.content.find((c) => c.type === "text");
			expect(textContent?.text).toContain("Recommendations");
		});
	});

	describe("handleGetRecommendations", () => {
		it("should return empty recommendations when no learnings exist", async () => {
			const result = await handleGetRecommendations({}, undefined, testDir);

			expect(result.content).toBeDefined();
			const textContent = result.content.find((c) => c.type === "text");
			expect(textContent?.text).toContain("No local learnings");
		});

		it("should return recommendations matching keywords", async () => {
			// Create learnings
			const learnings = [
				{
					id: "L1",
					type: "pattern",
					trigger: "database queries",
					action: "Use parameterized queries",
					source: "session-1",
					createdAt: new Date().toISOString(),
				},
				{
					id: "L2",
					type: "pitfall",
					trigger: "authentication",
					action: "Never store plain text passwords",
					source: "session-2",
					createdAt: new Date().toISOString(),
				},
			];
			await writeFile(
				join(testDir, ".snapback", "learnings", "user-learnings.jsonl"),
				learnings.map((l) => JSON.stringify(l)).join("\n"),
			);

			const result = await handleGetRecommendations({ keywords: ["authentication"] }, undefined, testDir);

			const jsonContent = result.content.find((c) => c.type === "json");
			const recommendations = (jsonContent?.json as { recommendations?: unknown[] })?.recommendations;
			expect(recommendations).toBeDefined();
			expect(recommendations?.length).toBeGreaterThan(0);
		});

		it("should return all learnings when no keywords provided", async () => {
			// Create multiple learnings
			const learnings = [
				{
					id: "L1",
					type: "pattern",
					trigger: "test1",
					action: "action1",
					source: "s1",
					createdAt: new Date().toISOString(),
				},
				{
					id: "L2",
					type: "pattern",
					trigger: "test2",
					action: "action2",
					source: "s2",
					createdAt: new Date().toISOString(),
				},
			];
			await writeFile(
				join(testDir, ".snapback", "learnings", "user-learnings.jsonl"),
				learnings.map((l) => JSON.stringify(l)).join("\n"),
			);

			const result = await handleGetRecommendations({}, undefined, testDir);

			const jsonContent = result.content.find((c) => c.type === "json");
			const recommendations = (jsonContent?.json as { recommendations?: unknown[] })?.recommendations;
			expect(recommendations?.length).toBe(2);
		});
	});

	describe("handleSessionStats", () => {
		it("should return inactive message when no session exists", async () => {
			const result = await handleSessionStats({}, undefined, testDir);

			expect(result.content).toBeDefined();
			const jsonContent = result.content.find((c) => c.type === "json");
			expect((jsonContent?.json as { active?: boolean })?.active).toBe(false);

			const textContent = result.content.find((c) => c.type === "text");
			expect(textContent?.text).toContain("No active session");
		});

		it("should return session stats when session exists", async () => {
			// Create current session
			const session = {
				id: "sess_test123",
				task: "Testing session stats",
				startedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
				snapshotCount: 3,
				filesModified: 5,
			};
			await writeFile(join(testDir, ".snapback", "session", "current.json"), JSON.stringify(session));

			const result = await handleSessionStats({}, undefined, testDir);

			const jsonContent = result.content.find((c) => c.type === "json");
			const stats = jsonContent?.json as {
				sessionId?: string;
				snapshotCount?: number;
				filesModified?: number;
			};
			expect(stats?.sessionId).toBe("sess_test123");
			expect(stats?.snapshotCount).toBe(3);
			expect(stats?.filesModified).toBe(5);
		});

		it("should include coaching suggestions", async () => {
			// Create session with many files modified but no snapshots
			const session = {
				id: "sess_coaching",
				startedAt: new Date().toISOString(),
				snapshotCount: 0,
				filesModified: 10,
			};
			await writeFile(join(testDir, ".snapback", "session", "current.json"), JSON.stringify(session));

			const result = await handleSessionStats({}, undefined, testDir);

			const jsonContent = result.content.find((c) => c.type === "json");
			const stats = jsonContent?.json as { coaching?: string };
			expect(stats?.coaching).toContain("snapshot");
		});

		it("should format duration correctly", async () => {
			// Create session 5 minutes ago
			const session = {
				id: "sess_duration",
				startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
				snapshotCount: 0,
				filesModified: 0,
			};
			await writeFile(join(testDir, ".snapback", "session", "current.json"), JSON.stringify(session));

			const result = await handleSessionStats({}, undefined, testDir);

			const jsonContent = result.content.find((c) => c.type === "json");
			const stats = jsonContent?.json as { duration?: string };
			expect(stats?.duration).toContain("m");
		});
	});
});
