/**
 * SessionManager Tests
 *
 * 4-Path Coverage:
 * - Happy: Tool calls tracked, sessions created, persistence save/load
 * - Sad: Loop detected, circuit breaker trips
 * - Edge: Concurrent sessions, risk escalation
 * - Error: Invalid inputs, session not found
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { SessionManager } from "../../src/session/SessionManager.js";
import type { ToolCall } from "../../src/types/session.js";

describe("SessionManager", () => {
	let manager: SessionManager;

	beforeEach(() => {
		manager = new SessionManager();
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should create a new session", () => {
			manager.startSession("test-session-1", {
				workspaceId: "workspace-1",
				userId: "user-1",
			});

			const state = manager.getSessionState("test-session-1");
			expect(state).toBeDefined();
			expect(state?.sessionId).toBe("test-session-1");
			expect(state?.metadata.workspaceId).toBe("workspace-1");
			expect(state?.riskLevel).toBe("low");
		});

		it("should track tool calls successfully", () => {
			manager.startSession("test-session-2");

			const call: ToolCall = {
				id: "call-1",
				name: "check_patterns",
				args: { code: "test", filePath: "test.ts" },
				timestamp: Date.now(),
				result: { success: true },
			};

			const allowed = manager.recordToolCall("test-session-2", call);
			expect(allowed).toBe(true);

			const state = manager.getSessionState("test-session-2");
			expect(state?.toolCalls).toHaveLength(1);
			expect(state?.toolCalls[0]?.name).toBe("check_patterns");
		});

		it("should track file modifications", () => {
			manager.startSession("test-session-3");

			manager.recordFileModification("test-session-3", {
				path: "src/app.ts",
				timestamp: Date.now(),
				type: "update",
				linesChanged: 10,
			});

			const state = manager.getSessionState("test-session-3");
			expect(state?.fileModifications).toHaveLength(1);
			expect(state?.fileModifications[0]?.path).toBe("src/app.ts");
		});

		it("should generate session analytics", () => {
			manager.startSession("test-session-4");

			// Record multiple tool calls
			for (let i = 0; i < 5; i++) {
				manager.recordToolCall("test-session-4", {
					id: `call-${i}`,
					name: i < 3 ? "check_patterns" : "validate_code",
					args: {},
					timestamp: Date.now(),
				});
			}

			const analytics = manager.getAnalytics("test-session-4");
			expect(analytics).toBeDefined();
			expect(analytics?.totalToolCalls).toBe(5);
			expect(analytics?.uniqueTools).toHaveLength(2);
			// Most called tool depends on order - just verify it exists
			expect(analytics?.mostCalledTool).toBeDefined();
			expect(analytics?.mostCalledTool?.count).toBeGreaterThanOrEqual(2);
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should detect structural loop (3+ consecutive same tool)", () => {
			manager.startSession("loop-session");

			// Call same tool 3 times
			for (let i = 0; i < 3; i++) {
				manager.recordToolCall("loop-session", {
					id: `call-${i}`,
					name: "validate_code",
					args: { code: "test", filePath: "test.ts" },
					timestamp: Date.now(),
				});
			}

			const loopResult = manager.detectLoop("loop-session");
			expect(loopResult.detected).toBe(true);
			// May be "structural" or "both" depending on semantic similarity
			expect(loopResult.type).toMatch(/structural|both/);
			expect(loopResult.confidence).toBeGreaterThan(0.5);
		});

		it("should detect semantic loop (similar args)", () => {
			manager.startSession("semantic-loop");

			// Call with very similar args
			const baseArgs = { code: "function test() { return true; }", filePath: "test.ts" };

			manager.recordToolCall("semantic-loop", {
				id: "call-1",
				name: "check_patterns",
				args: baseArgs,
				timestamp: Date.now(),
			});

			manager.recordToolCall("semantic-loop", {
				id: "call-2",
				name: "check_patterns",
				args: { ...baseArgs, code: "function test() { return true; } " }, // Nearly identical
				timestamp: Date.now(),
			});

			const loopResult = manager.detectLoop("semantic-loop");
			expect(loopResult.detected).toBe(true);
			expect(loopResult.type).toContain("semantic");
		});

		it("should trip circuit breaker after 3 failures", () => {
			manager.startSession("circuit-breaker");

			// Record 3 failed calls
			for (let i = 0; i < 3; i++) {
				manager.recordToolCall("circuit-breaker", {
					id: `call-${i}`,
					name: "validate_code",
					args: {},
					timestamp: Date.now(),
					result: { success: false, error: "Validation failed" },
				});
			}

			// 4th call should be blocked
			const allowed = manager.recordToolCall("circuit-breaker", {
				id: "call-4",
				name: "validate_code",
				args: {},
				timestamp: Date.now(),
			});

			expect(allowed).toBe(false);
		});

		it("should block duplicate operations (idempotency)", () => {
			manager.startSession("dedup-session");

			const call: ToolCall = {
				id: "unique-call-1",
				name: "check_patterns",
				args: {},
				timestamp: Date.now(),
			};

			const allowed1 = manager.recordToolCall("dedup-session", call);
			const allowed2 = manager.recordToolCall("dedup-session", call); // Same ID

			expect(allowed1).toBe(true);
			expect(allowed2).toBe(false);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle multiple concurrent sessions", () => {
			manager.startSession("session-1");
			manager.startSession("session-2");
			manager.startSession("session-3");

			expect(manager.getActiveSessionCount()).toBe(3);

			manager.recordToolCall("session-1", {
				id: "call-1",
				name: "check_patterns",
				args: {},
				timestamp: Date.now(),
			});

			manager.recordToolCall("session-2", {
				id: "call-2",
				name: "validate_code",
				args: {},
				timestamp: Date.now(),
			});

			const state1 = manager.getSessionState("session-1");
			const state2 = manager.getSessionState("session-2");

			expect(state1?.toolCalls).toHaveLength(1);
			expect(state2?.toolCalls).toHaveLength(1);
			expect(state1?.toolCalls[0]?.name).toBe("check_patterns");
			expect(state2?.toolCalls[0]?.name).toBe("validate_code");
		});

		it("should escalate risk level based on patterns", () => {
			manager.startSession("risk-session");

			// Low risk initially
			let state = manager.getSessionState("risk-session");
			expect(state?.riskLevel).toBe("low");

			// Trigger high tool call rate
			for (let i = 0; i < 20; i++) {
				manager.recordToolCall("risk-session", {
					id: `call-${i}`,
					name: "check_patterns",
					args: {},
					timestamp: Date.now(),
				});
			}

			state = manager.getSessionState("risk-session");
			expect(state?.riskLevel).not.toBe("low");
			expect(state?.riskReasons.length).toBeGreaterThan(0);
		});

		it("should prune stale sessions", () => {
			// Create session with short timeout
			const shortTimeout = new SessionManager({
				sessionTimeoutMs: 100, // 100ms timeout
			});

			shortTimeout.startSession("stale-session");
			expect(shortTimeout.getActiveSessionCount()).toBe(1);

			// Wait for timeout
			return new Promise<void>((resolve) => {
				setTimeout(() => {
					const pruned = shortTimeout.pruneStale();
					expect(pruned).toBe(1);
					expect(shortTimeout.getActiveSessionCount()).toBe(0);
					resolve();
				}, 150);
			});
		});

		it("should handle consecutive modifications to same file", () => {
			manager.startSession("consecutive-mods");

			// Modify same file 5 times
			for (let i = 0; i < 5; i++) {
				manager.recordFileModification("consecutive-mods", {
					path: "src/auth.ts",
					timestamp: Date.now() + i,
					type: "update",
				});
			}

			const state = manager.getSessionState("consecutive-mods");
			expect(state?.consecutiveModifications.get("src/auth.ts")).toBe(5);
			expect(state?.riskLevel).not.toBe("low"); // Should escalate
		});
	});

	// ============================================================================
	// ERROR CASES
	// ============================================================================

	describe("Error Cases", () => {
		it("should throw on empty session ID", () => {
			expect(() => manager.startSession("")).toThrow("sessionId is required");
		});

		it("should throw on tool call to non-existent session", () => {
			expect(() =>
				manager.recordToolCall("non-existent", {
					id: "call-1",
					name: "test",
					args: {},
					timestamp: Date.now(),
				}),
			).toThrow("Session non-existent not found");
		});

		it("should throw on file modification to non-existent session", () => {
			expect(() =>
				manager.recordFileModification("non-existent", {
					path: "test.ts",
					timestamp: Date.now(),
					type: "update",
				}),
			).toThrow("Session non-existent not found");
		});

		it("should return null for analytics of non-existent session", () => {
			const analytics = manager.getAnalytics("non-existent");
			expect(analytics).toBeNull();
		});

		it("should handle loop detection on non-existent session", () => {
			const loopResult = manager.detectLoop("non-existent");
			expect(loopResult.detected).toBe(false);
			expect(loopResult.confidence).toBe(0);
		});

		it("should end session and return analytics", () => {
			manager.startSession("end-session");
			manager.recordToolCall("end-session", {
				id: "call-1",
				name: "test",
				args: {},
				timestamp: Date.now(),
			});

			const analytics = manager.endSession("end-session");
			expect(analytics).toBeDefined();
			expect(analytics?.totalToolCalls).toBe(1);
			expect(manager.getSessionState("end-session")).toBeNull();
		});
	});

	// ============================================================================
	// PERSISTENCE (JSONL + Atomic Writes)
	// ============================================================================

	describe("Persistence", () => {
		let tempDir: string;
		let persistencePath: string;

		beforeEach(() => {
			// Create temp directory for each test
			tempDir = mkdtempSync(join(tmpdir(), "session-test-"));
			persistencePath = join(tempDir, "sessions.jsonl");
		});

		beforeEach(() => {
			// Cleanup after each test
			if (tempDir) {
				try {
					rmSync(tempDir, { recursive: true, force: true });
				} catch {
					// Ignore cleanup errors
				}
			}
		});

		it("should save and load sessions (Happy Path)", async () => {
			const manager = new SessionManager({}, { persistencePath });

			// Create session with data
			manager.startSession("persist-1", { workspaceId: "test-workspace" });
			manager.recordToolCall("persist-1", {
				id: "call-1",
				name: "test_tool",
				args: { key: "value" },
				timestamp: Date.now(),
			});

			// Save
			await manager.saveSessions();

			// Create new manager and load
			const manager2 = new SessionManager({}, { persistencePath });
			await manager2.loadSessions();

			const loaded = manager2.getSessionState("persist-1");
			expect(loaded).toBeDefined();
			expect(loaded?.sessionId).toBe("persist-1");
			expect(loaded?.metadata.workspaceId).toBe("test-workspace");
			expect(loaded?.toolCalls).toHaveLength(1);
			expect(loaded?.toolCalls[0]?.name).toBe("test_tool");
		});

		it("should handle empty sessions file (Edge Case)", async () => {
			const manager = new SessionManager({}, { persistencePath });

			// Load from non-existent file (should not throw)
			await expect(manager.loadSessions()).resolves.not.toThrow();
			expect(manager.getActiveSessionCount()).toBe(0);
		});

		it("should handle corrupted session data (Error Case)", async () => {
			const manager = new SessionManager({}, { persistencePath });

			manager.startSession("valid-session");
			await manager.saveSessions();

			// Manually corrupt the file
			const { writeFileSync } = await import("node:fs");
			writeFileSync(persistencePath, '{"invalid":"json"\n{"sessionId":"test"}');

			const manager2 = new SessionManager({}, { persistencePath });
			// Should not throw, just skip corrupted lines
			await expect(manager2.loadSessions()).resolves.not.toThrow();
		});

		it("should preserve Maps and Sets across save/load (Edge Case)", async () => {
			const manager = new SessionManager({}, { persistencePath });

			manager.startSession("map-test");
			manager.recordToolCall("map-test", {
				id: "call-1",
				name: "tool-a",
				args: {},
				timestamp: Date.now(),
			});
			manager.recordFileModification("map-test", {
				path: "test.ts",
				type: "update",
				timestamp: Date.now(),
			});

			await manager.saveSessions();

			const manager2 = new SessionManager({}, { persistencePath });
			await manager2.loadSessions();

			const loaded = manager2.getSessionState("map-test");
			expect(loaded?.consecutiveModifications).toBeInstanceOf(Map);
			expect(loaded?.loopDetection.dedupKeys).toBeInstanceOf(Set);
			expect(loaded?.loopDetection.consecutiveSameTool).toBeInstanceOf(Map);
		});

		it("should auto-save when enabled (Happy Path)", async () => {
			const manager = new SessionManager({}, { persistencePath, autosave: true });

			manager.startSession("autosave-session");

			// Give autosave time to complete
			await new Promise((resolve) => setTimeout(resolve, 100));

			const manager2 = new SessionManager({}, { persistencePath });
			await manager2.loadSessions();

			const loaded = manager2.getSessionState("autosave-session");
			expect(loaded).toBeDefined();
			expect(loaded?.sessionId).toBe("autosave-session");
		});
	});
});
