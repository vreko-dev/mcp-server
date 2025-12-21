/**
 * WorkspaceVitals Tests
 *
 * 4-path coverage per ROUTER.md C-004:
 * - Happy path: Normal vitals orchestration
 * - Sad path: Edge cases with minimal data
 * - Edge case: Trajectory calculations, thresholds
 * - Error case: Event handling edge cases
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceVitals } from "../../src/vitals/WorkspaceVitals.js";

describe("WorkspaceVitals", () => {
	afterEach(() => {
		WorkspaceVitals.clearInstances();
	});

	describe("singleton behavior", () => {
		it("should return same instance for same workspaceId", () => {
			const vitals1 = WorkspaceVitals.for("workspace-a");
			const vitals2 = WorkspaceVitals.for("workspace-a");

			expect(vitals1).toBe(vitals2);
		});

		it("should return different instances for different workspaceIds", () => {
			const vitals1 = WorkspaceVitals.for("workspace-a");
			const vitals2 = WorkspaceVitals.for("workspace-b");

			expect(vitals1).not.toBe(vitals2);
		});

		it("should allow creating non-singleton instances for testing", () => {
			const vitals1 = WorkspaceVitals.create();
			const vitals2 = WorkspaceVitals.create();

			expect(vitals1).not.toBe(vitals2);
		});
	});

	describe("initialization", () => {
		it("should start with stable trajectory", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);
			const snapshot = vitals.current(now);

			expect(snapshot.trajectory).toBe("stable");
			expect(snapshot.pulse.level).toBe("resting");
			expect(snapshot.temperature.level).toBe("cold");
			expect(snapshot.pressure.value).toBe(0);
			expect(snapshot.oxygen.value).toBe(100);
		});

		it("should allow config override", () => {
			const vitals = WorkspaceVitals.create({
				pulse: { elevated: 10, racing: 20, critical: 30, windowSeconds: 30 },
			});

			// Config should be merged with defaults
			const snapshot = vitals.current();
			expect(snapshot.trajectory).toBe("stable");
		});
	});

	describe("file change handling", () => {
		it("should track file changes across all sensors", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			vitals.onFileChange({ path: "/src/file.ts" }, now);

			const snapshot = vitals.current(now);
			expect(snapshot.pulse.changesPerMinute).toBeGreaterThan(0);
			expect(snapshot.pressure.unsnapshotedChanges).toBe(1);
		});

		it("should track AI activity from file changes", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// 5 AI changes, 0 human
			for (let i = 0; i < 5; i++) {
				vitals.onFileChange({ path: `/src/file${i}.ts`, isAI: true, tool: "Cursor" }, now);
			}

			const snapshot = vitals.current(now);
			expect(snapshot.temperature.level).toBe("burning"); // 100% AI
			expect(snapshot.temperature.aiPercentage).toBe(100);
			expect(snapshot.temperature.detectedTool).toBe("Cursor");
		});

		it("should track mixed AI/human activity", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// 3 AI, 7 human = 30% AI = warm
			for (let i = 0; i < 3; i++) {
				vitals.onFileChange({ path: `/src/ai${i}.ts`, isAI: true, tool: "Claude" }, now);
			}
			for (let i = 0; i < 7; i++) {
				vitals.onFileChange({ path: `/src/human${i}.ts`, isAI: false }, now);
			}

			const snapshot = vitals.current(now);
			expect(snapshot.temperature.level).toBe("warm");
			expect(snapshot.temperature.aiPercentage).toBe(30);
		});
	});

	describe("snapshot handling", () => {
		it("should release pressure on snapshot", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Accumulate pressure
			for (let i = 0; i < 20; i++) {
				vitals.onFileChange({ path: `/src/file${i}.ts` }, now);
			}

			const beforeSnapshot = vitals.current(now);
			expect(beforeSnapshot.pressure.unsnapshotedChanges).toBe(20);

			// Take snapshot
			vitals.onSnapshot({ filePath: "/src/file0.ts" }, now);

			const afterSnapshot = vitals.current(now);
			expect(afterSnapshot.pressure.unsnapshotedChanges).toBe(0);
		});
	});

	describe("trajectory calculation", () => {
		it("should return stable when pressure <30 and oxygen >80", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Minimal activity
			vitals.onFileChange({ path: "/src/file.ts" }, now);

			const snapshot = vitals.current(now);
			expect(snapshot.trajectory).toBe("stable");
		});

		it("should return escalating when pressure >60 and oxygen <70", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Build up pressure (need lots of changes + time)
			for (let i = 0; i < 150; i++) {
				vitals.onFileChange({ path: `/src/file${i}.ts` }, now);
			}

			// Also add 10 minutes of time pressure
			const laterTime = now + 10 * 60 * 1000;
			const snapshot = vitals.current(laterTime);

			// Should be escalating due to high pressure
			expect(snapshot.pressure.value).toBeGreaterThan(60);
			expect(snapshot.trajectory).toBe("escalating");
		});

		it("should return critical when pressure >80, burning temp, oxygen <50", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Start with initial changes to build pressure
			for (let i = 0; i < 50; i++) {
				vitals.onFileChange({ path: `/src/file${i}.ts`, isAI: true, tool: "Cursor" }, now);
			}

			// Add more time for pressure to build
			const laterTime = now + 20 * 60 * 1000;

			// Add heavy AI activity within the temperature window (5 min decay)
			for (let i = 0; i < 50; i++) {
				vitals.onFileChange(
					{ path: `/src/hot${i}.ts`, isAI: true, tool: "Cursor" },
					laterTime - 60 * 1000 + i * 100, // Last minute before check
				);
			}

			const snapshot = vitals.current(laterTime);

			// Should be critical
			expect(snapshot.temperature.level).toBe("burning");
			expect(snapshot.pressure.value).toBeGreaterThan(80);
			expect(snapshot.trajectory).toBe("critical");
		});
	});

	describe("shouldSnapshot decision", () => {
		it("should recommend snapshot on critical trajectory", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Initial changes to build pressure
			for (let i = 0; i < 50; i++) {
				vitals.onFileChange({ path: `/src/file${i}.ts`, isAI: true }, now);
			}

			const checkTime = now + 20 * 60 * 1000;

			// Add recent AI activity within temperature window
			for (let i = 0; i < 50; i++) {
				vitals.onFileChange({ path: `/src/recent${i}.ts`, isAI: true }, checkTime - 60 * 1000 + i * 100);
			}

			const decision = vitals.shouldSnapshot(checkTime);
			expect(decision.should).toBe(true);
			expect(decision.urgency).toBe("critical");
		});

		it("should recommend snapshot on high pressure", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Build pressure to >80%
			for (let i = 0; i < 200; i++) {
				vitals.onFileChange({ path: `/src/file${i}.ts` }, now);
			}

			const decision = vitals.shouldSnapshot(now + 15 * 60 * 1000);
			expect(decision.should).toBe(true);
			expect(decision.urgency).toBe("high");
		});

		it("should not recommend snapshot when healthy", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Minimal activity
			vitals.onFileChange({ path: "/src/file.ts" }, now);

			const decision = vitals.shouldSnapshot(now);
			expect(decision.should).toBe(false);
			expect(decision.urgency).toBe("none");
		});
	});

	describe("agent guidance", () => {
		it("should provide safe operations in stable state", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			const guidance = vitals.getAgentGuidance(now);
			expect(guidance.shouldSnapshot).toBe(false);
			expect(guidance.safeOperations).toContain("read");
			expect(guidance.safeOperations).toContain("analyze");
			expect(guidance.blockedOperations).toEqual([]);
		});

		it("should block operations in critical state", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Initial changes to build pressure
			for (let i = 0; i < 50; i++) {
				vitals.onFileChange({ path: `/src/file${i}.ts`, isAI: true }, now);
			}

			const checkTime = now + 20 * 60 * 1000;

			// Add recent AI activity within temperature window
			for (let i = 0; i < 50; i++) {
				vitals.onFileChange({ path: `/src/hot${i}.ts`, isAI: true }, checkTime - 60 * 1000 + i * 100);
			}

			const guidance = vitals.getAgentGuidance(checkTime);
			expect(guidance.shouldSnapshot).toBe(true);
			expect(guidance.blockedOperations).toContain("delete");
			expect(guidance.blockedOperations).toContain("refactor-large");
		});

		it("should track risky files", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			vitals.onFileChange({ path: "/package.json" }, now);

			const guidance = vitals.getAgentGuidance(now);
			expect(guidance.riskyFiles).toContain("/package.json");
		});
	});

	describe("threshold multiplier", () => {
		it("should lower threshold when temperature is hot", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Heavy AI activity (hot temperature)
			for (let i = 0; i < 8; i++) {
				vitals.onFileChange({ path: `/src/file${i}.ts`, isAI: true }, now);
			}
			for (let i = 0; i < 2; i++) {
				vitals.onFileChange({ path: `/src/human${i}.ts`, isAI: false }, now);
			}

			const multiplier = vitals.getThresholdMultiplier(now);
			// 80% AI = burning = 0.6 multiplier, then other factors
			expect(multiplier).toBeLessThan(1.0);
		});

		it("should raise threshold when oxygen is high", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// No modifications = 100% oxygen
			const multiplier = vitals.getThresholdMultiplier(now);
			// cold (1.2) * high oxygen (1.2) = 1.44
			expect(multiplier).toBeGreaterThan(1.0);
		});
	});

	describe("history tracking", () => {
		it("should maintain bounded history", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			// Generate 150 snapshots
			for (let i = 0; i < 150; i++) {
				vitals.current(now + i * 1000);
			}

			const history = vitals.getHistory();
			expect(history.length).toBe(100); // Max history
		});
	});

	describe("event emission", () => {
		it("should emit update on file change", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			const updateSpy = vi.fn();
			vitals.on("update", updateSpy);

			vitals.onFileChange({ path: "/src/file.ts" }, now);

			expect(updateSpy).toHaveBeenCalled();
		});

		it("should emit warning on high urgency", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			const warningSpy = vi.fn();
			vitals.on("warning", warningSpy);

			// Build up pressure
			for (let i = 0; i < 200; i++) {
				vitals.onFileChange({ path: `/src/file${i}.ts` }, now);
			}

			// Trigger with time passage
			vitals.onFileChange({ path: "/trigger.ts" }, now + 15 * 60 * 1000);

			expect(warningSpy).toHaveBeenCalled();
		});
	});

	describe("AI detection handling", () => {
		it("should record AI detection with high confidence", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			vitals.onAIDetected({ tool: "Claude", confidence: 0.9 }, now);
			vitals.onFileChange({ path: "/src/file.ts", isAI: false }, now);

			const snapshot = vitals.current(now);
			// 1 AI detection + 1 human change = 50%
			expect(snapshot.temperature.aiPercentage).toBe(50);
			expect(snapshot.temperature.detectedTool).toBe("Claude");
		});

		it("should ignore AI detection with low confidence", () => {
			const now = Date.now();
			const vitals = WorkspaceVitals.create({}, now);

			vitals.onAIDetected({ tool: "Maybe", confidence: 0.3 }, now);
			vitals.onFileChange({ path: "/src/file.ts", isAI: false }, now);

			const snapshot = vitals.current(now);
			// Only the human change counts
			expect(snapshot.temperature.aiPercentage).toBe(0);
		});
	});
});
