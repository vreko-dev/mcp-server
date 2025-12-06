import { describe, expect, it } from "vitest";
import { AIDetectionEngine } from "../src/ai-detection";

describe("AIDetectionEngine", () => {
	describe("analyze", () => {
		it("should return low confidence for normal activity", () => {
			const engine = new AIDetectionEngine();
			const events = [
				{ file: "test1.js", size: 100, timestamp: Date.now() - 30000 },
				{ file: "test2.js", size: 200, timestamp: Date.now() - 20000 },
			];

			const result = engine.analyze(events);

			expect(result.confidence).toBe(0); // No burst activity
			expect(result.patterns).toEqual([]);
		});

		it("should detect burst write patterns", () => {
			const engine = new AIDetectionEngine();
			const now = Date.now();
			const events = [
				{ file: "test1.js", size: 3000, timestamp: now - 5000 },
				{ file: "test2.js", size: 4000, timestamp: now - 4000 },
				{ file: "test3.js", size: 5000, timestamp: now - 3000 },
				{ file: "test4.js", size: 3500, timestamp: now - 2000 },
				{ file: "test5.js", size: 4500, timestamp: now - 1000 },
			];

			const result = engine.analyze(events);

			expect(result.confidence).toBeGreaterThan(0.6);
			expect(result.patterns).toContain("burst-write");
		});

		it("should return higher confidence with more burst events", () => {
			const engine = new AIDetectionEngine();
			const now = Date.now();
			const events = [];

			// Create 10 burst events
			for (let i = 0; i < 10; i++) {
				events.push({
					file: `test${i}.js`,
					size: 3000,
					timestamp: now - (10 - i) * 1000,
				});
			}

			const result = engine.analyze(events);

			expect(result.confidence).toBe(1); // Max confidence
			expect(result.patterns).toContain("burst-write");
		});

		it("should ignore old events when detecting bursts", () => {
			const engine = new AIDetectionEngine();
			const now = Date.now();
			const events = [
				{ file: "old.js", size: 3000, timestamp: now - 20000 }, // Too old
				{ file: "recent1.js", size: 3000, timestamp: now - 5000 },
				{ file: "recent2.js", size: 4000, timestamp: now - 4000 },
			];

			const result = engine.analyze(events);

			expect(result.confidence).toBeGreaterThan(0); // Should detect recent burst
			expect(result.confidence).toBeLessThan(1); // But not maximum confidence
		});
	});
});
