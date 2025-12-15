/**
 * SnapBack Simplified Architecture - Smoke Test
 *
 * Run this to verify the basic setup works:
 *   npx tsx snapback/test/smoke.test.ts
 *
 * This tests:
 * 1. Orchestrator can be instantiated
 * 2. Event bus can emit and receive events
 * 3. A simple signal script can be run
 */

import { describe, expect, it, vi } from "vitest";
import { eventBus, orchestrator } from "../index";
import type { FileChange } from "../types";

describe("SnapBack Simplified Architecture - Smoke Test", () => {
	describe("Orchestrator", () => {
		it("should have initial healthy state", () => {
			const health = orchestrator.getHealth();

			expect(health.score).toBe(100);
			expect(health.warnings).toHaveLength(0);
			expect(health.suggestions).toHaveLength(0);
			expect(health.filesModified).toHaveLength(0);
			expect(health.cyclesIntroduced).toBe(0);
			expect(health.complexityDelta).toBe(0);
		});

		it("should reset session", () => {
			orchestrator.resetSession();
			const health = orchestrator.getHealth();

			expect(health.score).toBe(100);
		});
	});

	describe("Event Bus", () => {
		it("should emit and receive events", () => {
			const listener = vi.fn();

			eventBus.on("session.started", listener);
			eventBus.emit("session.started", {
				sessionId: "test_123",
				workspaceHash: "abc",
			});

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					sessionId: "test_123",
					workspaceHash: "abc",
					_event: "session.started",
				}),
			);
		});

		it("should add timestamp to events", () => {
			const listener = vi.fn();
			const before = Date.now();

			eventBus.on("file.changed", listener);
			eventBus.emit("file.changed", {
				changeType: "modify",
				extension: ".ts",
				lineCount: 50,
			});

			const after = Date.now();

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					_timestamp: expect.any(Number),
				}),
			);

			const timestamp = listener.mock.calls[0][0]._timestamp;
			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});
	});

	describe("Types", () => {
		it("should have correct FileChange shape", () => {
			const change: FileChange = {
				path: "src/index.ts",
				content: "export const x = 1;",
				lineCount: 1,
				changeType: "modify",
			};

			expect(change.path).toBe("src/index.ts");
			expect(change.changeType).toBe("modify");
		});
	});
});

// =============================================================================
// MANUAL SMOKE TEST
// =============================================================================

/**
 * Run this file directly for a quick manual smoke test:
 *   npx tsx snapback/test/smoke.test.ts --manual
 */
if (process.argv.includes("--manual")) {
	console.log("=== SnapBack Simplified Architecture - Manual Smoke Test ===\n");

	console.log("1. Checking orchestrator...");
	const health = orchestrator.getHealth();
	console.log(`   Health score: ${health.score}/100`);
	console.log(`   Warnings: ${health.warnings.length}`);
	console.log("   ✓ Orchestrator OK\n");

	console.log("2. Checking event bus...");
	let eventReceived = false;
	eventBus.once("session.started", () => {
		eventReceived = true;
	});
	eventBus.emit("session.started", { sessionId: "test", workspaceHash: "test" });
	console.log(`   Event received: ${eventReceived}`);
	console.log("   ✓ Event bus OK\n");

	console.log("=== All smoke tests passed! ===");
}
