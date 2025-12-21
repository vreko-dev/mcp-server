/**
 * TemperatureMonitor Tests
 *
 * 4-path coverage per ROUTER.md C-004:
 * - Happy path: Normal temperature tracking
 * - Sad path: Edge cases with no activity
 * - Edge case: Boundary conditions at thresholds
 * - Error case: Invalid configurations
 */

import { describe, expect, it } from "vitest";
import { TemperatureMonitor } from "../../src/vitals/TemperatureMonitor.js";

describe("TemperatureMonitor", () => {
	describe("initialization", () => {
		it("should use default config when none provided", () => {
			const monitor = new TemperatureMonitor();
			const state = monitor.getLevel();

			expect(state.level).toBe("cold");
			expect(state.aiPercentage).toBe(0);
			expect(state.detectedTool).toBeUndefined();
		});

		it("should allow partial config override", () => {
			const monitor = new TemperatureMonitor({ warm: 30 });
			const state = monitor.getLevel();

			expect(state.level).toBe("cold");
		});
	});

	describe("temperature level classification", () => {
		const now = Date.now();

		it("should classify as cold at <20% AI activity", () => {
			const monitor = new TemperatureMonitor();

			// 1 AI, 9 human = 10% AI
			monitor.recordAIActivity("Cursor", now);
			for (let i = 0; i < 9; i++) {
				monitor.recordHumanActivity(now);
			}

			const state = monitor.getLevel(now);
			expect(state.level).toBe("cold");
			expect(state.aiPercentage).toBe(10);
		});

		it("should classify as warm at 20-49% AI activity", () => {
			const monitor = new TemperatureMonitor();

			// 3 AI, 7 human = 30% AI
			for (let i = 0; i < 3; i++) {
				monitor.recordAIActivity("Claude", now);
			}
			for (let i = 0; i < 7; i++) {
				monitor.recordHumanActivity(now);
			}

			const state = monitor.getLevel(now);
			expect(state.level).toBe("warm");
			expect(state.aiPercentage).toBe(30);
		});

		it("should classify as hot at 50-79% AI activity", () => {
			const monitor = new TemperatureMonitor();

			// 6 AI, 4 human = 60% AI
			for (let i = 0; i < 6; i++) {
				monitor.recordAIActivity("Copilot", now);
			}
			for (let i = 0; i < 4; i++) {
				monitor.recordHumanActivity(now);
			}

			const state = monitor.getLevel(now);
			expect(state.level).toBe("hot");
			expect(state.aiPercentage).toBe(60);
		});

		it("should classify as burning at >=80% AI activity", () => {
			const monitor = new TemperatureMonitor();

			// 9 AI, 1 human = 90% AI
			for (let i = 0; i < 9; i++) {
				monitor.recordAIActivity("Cursor", now);
			}
			monitor.recordHumanActivity(now);

			const state = monitor.getLevel(now);
			expect(state.level).toBe("burning");
			expect(state.aiPercentage).toBe(90);
		});
	});

	describe("AI tool tracking", () => {
		it("should track most recent AI tool", () => {
			const now = Date.now();
			const monitor = new TemperatureMonitor();

			monitor.recordAIActivity("Copilot", now - 100);
			monitor.recordAIActivity("Claude", now - 50);
			monitor.recordAIActivity("Cursor", now);

			const state = monitor.getLevel(now);
			expect(state.detectedTool).toBe("Cursor");
		});

		it("should handle undefined tool gracefully", () => {
			const now = Date.now();
			const monitor = new TemperatureMonitor();

			monitor.recordAIActivity(undefined, now);

			const state = monitor.getLevel(now);
			expect(state.detectedTool).toBeUndefined();
		});
	});

	describe("decay window (cooling)", () => {
		it("should decay events after window expires", () => {
			const monitor = new TemperatureMonitor({ decaySeconds: 300 }); // 5 min
			const now = Date.now();

			// Add old AI event (6 minutes ago)
			monitor.recordAIActivity("Cursor", now - 360000);
			// Add recent human event
			monitor.recordHumanActivity(now - 100);

			const counts = monitor.getCounts(now);
			expect(counts.ai).toBe(0); // Old AI event pruned
			expect(counts.human).toBe(1);

			const state = monitor.getLevel(now);
			expect(state.level).toBe("cold");
			expect(state.aiPercentage).toBe(0);
		});

		it("should keep events within decay window", () => {
			const monitor = new TemperatureMonitor({ decaySeconds: 300 });
			const now = Date.now();

			// Add AI event 4 minutes ago (within window)
			monitor.recordAIActivity("Claude", now - 240000);
			monitor.recordHumanActivity(now - 100);

			const counts = monitor.getCounts(now);
			expect(counts.ai).toBe(1);
			expect(counts.human).toBe(1);
		});

		it("should cool down to cold over time", () => {
			const monitor = new TemperatureMonitor({ decaySeconds: 60 });
			const startTime = Date.now();

			// Record lots of AI activity
			for (let i = 0; i < 10; i++) {
				monitor.recordAIActivity("Cursor", startTime);
			}

			// Immediately: burning
			const immediate = monitor.getLevel(startTime);
			expect(immediate.level).toBe("burning");

			// After decay window: cold
			const afterDecay = startTime + 61000;
			const cooled = monitor.getLevel(afterDecay);
			expect(cooled.level).toBe("cold");
			expect(cooled.aiPercentage).toBe(0);
		});
	});

	describe("edge cases", () => {
		it("should handle no activity gracefully", () => {
			const monitor = new TemperatureMonitor();
			const state = monitor.getLevel();

			expect(state.level).toBe("cold");
			expect(state.aiPercentage).toBe(0);
			expect(state.detectedTool).toBeUndefined();
		});

		it("should handle 100% AI activity", () => {
			const now = Date.now();
			const monitor = new TemperatureMonitor();

			for (let i = 0; i < 5; i++) {
				monitor.recordAIActivity("Claude", now);
			}

			const state = monitor.getLevel(now);
			expect(state.level).toBe("burning");
			expect(state.aiPercentage).toBe(100);
		});

		it("should handle 100% human activity", () => {
			const now = Date.now();
			const monitor = new TemperatureMonitor();

			for (let i = 0; i < 5; i++) {
				monitor.recordHumanActivity(now);
			}

			const state = monitor.getLevel(now);
			expect(state.level).toBe("cold");
			expect(state.aiPercentage).toBe(0);
		});

		it("should handle exact threshold boundaries", () => {
			const now = Date.now();
			const monitor = new TemperatureMonitor({ warm: 20, hot: 50, burning: 80 });

			// Exactly 20% = warm (at threshold)
			monitor.recordAIActivity("Cursor", now);
			for (let i = 0; i < 4; i++) {
				monitor.recordHumanActivity(now);
			}

			const state = monitor.getLevel(now);
			expect(state.level).toBe("warm");
			expect(state.aiPercentage).toBe(20);
		});

		it("should handle reset correctly", () => {
			const now = Date.now();
			const monitor = new TemperatureMonitor();

			monitor.recordAIActivity("Cursor", now);
			monitor.recordHumanActivity(now);

			expect(monitor.getCounts(now)).toEqual({ ai: 1, human: 1 });

			monitor.reset();

			expect(monitor.getCounts(now)).toEqual({ ai: 0, human: 0 });
			expect(monitor.getLevel(now).level).toBe("cold");
		});
	});

	describe("error handling", () => {
		it("should handle zero decay gracefully", () => {
			const now = Date.now();
			const monitor = new TemperatureMonitor({ decaySeconds: 0 });

			monitor.recordAIActivity("Cursor", now);

			// With zero decay, all events are pruned immediately
			const state = monitor.getLevel(now);
			expect(state.aiPercentage).toBe(0);
		});
	});

	describe("performance characteristics", () => {
		it("should handle many events efficiently", () => {
			const now = Date.now();
			const monitor = new TemperatureMonitor();

			const start = performance.now();
			for (let i = 0; i < 5000; i++) {
				if (i % 2 === 0) {
					monitor.recordAIActivity("Cursor", now - (i % 60) * 1000);
				} else {
					monitor.recordHumanActivity(now - (i % 60) * 1000);
				}
			}
			const recordTime = performance.now() - start;

			const getStart = performance.now();
			monitor.getLevel(now);
			const getTime = performance.now() - getStart;

			expect(recordTime).toBeLessThan(100);
			expect(getTime).toBeLessThan(20);
		});
	});
});
