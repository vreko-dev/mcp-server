import { beforeEach, describe, expect, it } from "vitest";
import { DecisionEngine, type DecisionInput } from "../../src/runtime/decision";

describe("DecisionEngine", () => {
	let engine: DecisionEngine;
	let baseInput: DecisionInput;

	beforeEach(() => {
		engine = new DecisionEngine();
		baseInput = {
			signals: {},
			protectionLevel: "warn",
			rateLimitRemaining: 10,
			fileCount: 1,
			criticalFileCount: 0,
		};
	});

	describe("evaluate", () => {
		it("should allow when no critical signals are present", () => {
			const result = engine.evaluate(baseInput);

			expect(result.action).toBe("allow");
			expect(result.snapshot).toBe(false);
			expect(result.notify).toBe(false);
			expect(result.signals).toHaveLength(0);
			expect(result.confidence).toBe(0);
		});

		it("should warn when rate limit is exceeded", () => {
			const input: DecisionInput = {
				...baseInput,
				rateLimitRemaining: 0,
			};

			const result = engine.evaluate(input);

			expect(result.action).toBe("warn");
			expect(result.snapshot).toBe(false);
			expect(result.notify).toBe(true);
			expect(result.reason).toBe("Rate limit exceeded");
			expect(result.confidence).toBe(1.0);
		});

		it("should create snapshot for high confidence AI detection", () => {
			const input: DecisionInput = {
				...baseInput,
				signals: {
					ai: {
						detected: true,
						tool: "copilot",
						confidence: 0.9,
						method: "pattern",
					},
				},
			};

			const result = engine.evaluate(input);

			expect(result.action).toBe("warn");
			expect(result.snapshot).toBe(true);
			expect(result.notify).toBe(true);
			expect(result.signals).toContain("ai_detected (copilot)");
			// Confidence: (AI: 0.9 * 0.4) + (signal_count: 1/5 * 0.2) = 0.36 + 0.04 = 0.4
			expect(result.confidence).toBeCloseTo(0.4);
		});

		it("should create snapshot for high risk score", () => {
			const input: DecisionInput = {
				...baseInput,
				signals: {
					risk: {
						score: 85,
						factors: ["complexity", "entropy"],
					},
				},
			};

			const result = engine.evaluate(input);

			expect(result.action).toBe("warn");
			expect(result.snapshot).toBe(true);
			expect(result.notify).toBe(true);
			expect(result.signals).toContain("risk_score (85)");
			// Confidence: (risk: 0.85 * 0.4) + (signal_count: 1/5 * 0.2) = 0.34 + 0.04 = 0.38
			expect(result.confidence).toBeCloseTo(0.38);
		});

		it("should create snapshot for critical files", () => {
			const input: DecisionInput = {
				...baseInput,
				criticalFileCount: 2,
				signals: {},
			};

			const result = engine.evaluate(input);

			expect(result.action).toBe("warn");
			expect(result.snapshot).toBe(true);
			expect(result.notify).toBe(true);
			expect(result.signals).toContain("critical_files (2)");
			expect(result.confidence).toBeCloseTo(0.04); // 1/5 * 0.2
		});

		it("should create snapshot for burst with multiple files", () => {
			const input: DecisionInput = {
				...baseInput,
				fileCount: 5,
				signals: {
					burst: {
						active: true,
						changeCount: 15,
						windowStart: Date.now() - 1000,
						velocity: 50,
					},
				},
			};

			const result = engine.evaluate(input);

			expect(result.action).toBe("warn");
			expect(result.snapshot).toBe(true);
			expect(result.notify).toBe(true);
			expect(result.signals).toContain("burst (50.0 chars/ms)");
			expect(result.confidence).toBeCloseTo(0.04); // 1/5 * 0.2
		});

		it("should create snapshot for cycle detection", () => {
			const input: DecisionInput = {
				...baseInput,
				signals: {
					cycles: {
						detected: true,
						count: 3,
					},
				},
			};

			const result = engine.evaluate(input);

			expect(result.action).toBe("warn");
			expect(result.snapshot).toBe(true);
			expect(result.notify).toBe(true);
			expect(result.signals).toContain("cycles (3)");
			expect(result.confidence).toBeCloseTo(0.04); // 1/5 * 0.2
		});

		it("should combine multiple signals for confidence calculation", () => {
			const input: DecisionInput = {
				...baseInput,
				fileCount: 5,
				criticalFileCount: 1,
				signals: {
					ai: {
						detected: true,
						tool: "cursor",
						confidence: 0.95,
						method: "combined",
					},
					risk: {
						score: 75,
						factors: ["complexity"],
					},
					burst: {
						active: true,
						changeCount: 20,
						windowStart: Date.now() - 500,
						velocity: 100,
					},
				},
			};

			const result = engine.evaluate(input);

			expect(result.action).toBe("warn");
			expect(result.snapshot).toBe(true);
			expect(result.notify).toBe(true);
			// Should have 4 signals: ai, risk, burst, critical_files
			expect(result.signals).toHaveLength(4);
			// Confidence: (AI: 0.95 * 0.4) + (risk: 0.75 * 0.4) + (signal_count: 4/5 * 0.2)
			//           = 0.38 + 0.3 + 0.16 = 0.84
			expect(result.confidence).toBeCloseTo(0.84);
		});

		it("should apply watch protection level correctly", () => {
			const input: DecisionInput = {
				...baseInput,
				protectionLevel: "watch",
				signals: {
					ai: {
						detected: true,
						tool: "copilot",
						confidence: 0.9,
						method: "pattern",
					},
				},
			};

			const result = engine.evaluate(input);

			expect(result.action).toBe("snapshot");
			expect(result.snapshot).toBe(true);
			expect(result.notify).toBe(false); // Watch level doesn't notify
		});

		it("should apply block protection level correctly", () => {
			const input: DecisionInput = {
				...baseInput,
				protectionLevel: "block",
				signals: {
					risk: {
						score: 80,
						factors: ["entropy"],
					},
				},
			};

			const result = engine.evaluate(input);

			expect(result.action).toBe("block");
			expect(result.snapshot).toBe(true);
			expect(result.notify).toBe(true);
		});

		it("should respect custom configuration", () => {
			// Create engine with custom config
			const customEngine = new DecisionEngine({
				riskThreshold: 90,
				aiConfidenceThreshold: 0.95,
				minFilesForBurst: 10,
			});

			// Test with signals that would trigger with default config but not custom
			const input: DecisionInput = {
				...baseInput,
				fileCount: 5, // Less than custom minFilesForBurst (10)
				signals: {
					risk: {
						score: 85, // Less than custom riskThreshold (90)
						factors: ["complexity"],
					},
					ai: {
						detected: true,
						tool: "unknown",
						confidence: 0.9, // Less than custom aiConfidenceThreshold (0.95)
						method: "velocity",
					},
				},
			};

			const result = customEngine.evaluate(input);

			// Should not trigger snapshot with custom thresholds
			expect(result.action).toBe("allow");
			expect(result.snapshot).toBe(false);
		});

		it("should update configuration correctly", () => {
			const initialConfig = engine.getConfig();
			expect(initialConfig.riskThreshold).toBe(70);

			engine.updateConfig({ riskThreshold: 80 });
			const updatedConfig = engine.getConfig();
			expect(updatedConfig.riskThreshold).toBe(80);
			expect(updatedConfig.aiConfidenceThreshold).toBe(0.8); // Unchanged
		});

		it("should handle edge case with zero file count", () => {
			const input: DecisionInput = {
				...baseInput,
				fileCount: 0,
				signals: {
					burst: {
						active: true,
						changeCount: 5,
						windowStart: Date.now() - 100,
						velocity: 25,
					},
				},
			};

			const result = engine.evaluate(input);

			// Should not trigger burst with 0 files (below minFilesForBurst)
			expect(result.action).toBe("allow");
			expect(result.snapshot).toBe(false);
		});

		it("should handle low confidence AI detection", () => {
			const input: DecisionInput = {
				...baseInput,
				signals: {
					ai: {
						detected: true,
						tool: "unknown",
						confidence: 0.3, // Below threshold
						method: "pattern",
					},
				},
			};

			const result = engine.evaluate(input);

			// Should not trigger for low confidence AI detection
			expect(result.action).toBe("allow");
			expect(result.snapshot).toBe(false);
		});
	});
});
