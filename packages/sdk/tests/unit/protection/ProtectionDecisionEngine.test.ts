/**
 * ProtectionDecisionEngine Unit Tests
 *
 * Per arch_remediation.md Task 1.3: These tests validate the SDK's
 * ProtectionDecisionEngine - the Single Source of Truth for shouldSnapshot
 * and shouldProceed decisions.
 *
 * Key principles tested:
 * 1. SDK centralizes all protection decision logic
 * 2. Decisions are deterministic based on context
 * 3. AI-detected triggers always snapshot
 * 4. Block mode respects risk thresholds
 */

import type { ProtectionConfig } from "@snapback/contracts";
import { ProtectionManager, THRESHOLDS } from "@snapback-oss/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DefaultRiskAnalyzer,
	type EvaluationContext,
	type IRiskAnalyzer,
	ProtectionDecisionEngine,
} from "../../../src/protection/ProtectionDecisionEngine";

// Factory for creating mock ProtectionManager
function createMockProtectionManager(overrides?: Partial<ProtectionConfig>): ProtectionManager {
	const defaultConfig: ProtectionConfig = {
		patterns: [],
		defaultLevel: "watch",
		enabled: true,
		autoProtectConfigs: true,
		...overrides,
	};
	return new ProtectionManager(defaultConfig);
}

// Factory for creating mock RiskAnalyzer
function createMockRiskAnalyzer(mockAnalyze: (context: EvaluationContext) => number): IRiskAnalyzer {
	return {
		analyze: vi.fn(mockAnalyze),
	};
}

describe("ProtectionDecisionEngine", () => {
	let engine: ProtectionDecisionEngine;
	let mockProtectionManager: ProtectionManager;
	let mockRiskAnalyzer: IRiskAnalyzer;

	beforeEach(() => {
		mockProtectionManager = createMockProtectionManager();
		mockRiskAnalyzer = createMockRiskAnalyzer(() => 0);
		engine = new ProtectionDecisionEngine(mockProtectionManager, mockRiskAnalyzer);
	});

	describe("shouldSnapshot decision", () => {
		it("should return true for AI-detected triggers regardless of risk", () => {
			// Register file at watch level (lowest protection)
			mockProtectionManager.protect("/src/index.ts", "watch");

			// Use zero-risk analyzer
			mockRiskAnalyzer = createMockRiskAnalyzer(() => 0);
			engine = new ProtectionDecisionEngine(mockProtectionManager, mockRiskAnalyzer);

			const decision = engine.evaluate({
				filePath: "/src/index.ts",
				trigger: "ai-detected",
			});

			expect(decision.shouldSnapshot).toBe(true);
		});

		it("should return true for block level files", () => {
			mockProtectionManager.protect("/src/critical.ts", "block");

			const decision = engine.evaluate({
				filePath: "/src/critical.ts",
				trigger: "save",
			});

			expect(decision.shouldSnapshot).toBe(true);
		});

		it("should return true for watch level files (always snapshot)", () => {
			mockProtectionManager.protect("/src/watched.ts", "watch");

			const decision = engine.evaluate({
				filePath: "/src/watched.ts",
				trigger: "save",
			});

			expect(decision.shouldSnapshot).toBe(true);
		});

		it("should return true for warn level when risk exceeds threshold", () => {
			mockProtectionManager.protect("/src/warn-file.ts", "warn");

			// High risk scenario
			mockRiskAnalyzer = createMockRiskAnalyzer(() => THRESHOLDS.risk.highThreshold + 0.1);
			engine = new ProtectionDecisionEngine(mockProtectionManager, mockRiskAnalyzer);

			const decision = engine.evaluate({
				filePath: "/src/warn-file.ts",
				trigger: "save",
			});

			expect(decision.shouldSnapshot).toBe(true);
		});

		it("should return false for unprotected files", () => {
			// File not registered
			const decision = engine.evaluate({
				filePath: "/src/unprotected.ts",
				trigger: "save",
			});

			expect(decision.shouldSnapshot).toBe(false);
		});
	});

	describe("shouldProceed decision", () => {
		it("should return true for unprotected files", () => {
			const decision = engine.evaluate({
				filePath: "/src/unprotected.ts",
				trigger: "save",
			});

			expect(decision.shouldProceed).toBe(true);
		});

		it("should return true for watch level files", () => {
			mockProtectionManager.protect("/src/watched.ts", "watch");

			const decision = engine.evaluate({
				filePath: "/src/watched.ts",
				trigger: "save",
			});

			expect(decision.shouldProceed).toBe(true);
		});

		it("should return true for warn level files", () => {
			mockProtectionManager.protect("/src/warn-file.ts", "warn");

			const decision = engine.evaluate({
				filePath: "/src/warn-file.ts",
				trigger: "save",
			});

			expect(decision.shouldProceed).toBe(true);
		});

		it("should return false for block level with critical risk", () => {
			mockProtectionManager.protect("/src/blocked.ts", "block");

			// Critical risk scenario
			mockRiskAnalyzer = createMockRiskAnalyzer(() => THRESHOLDS.risk.criticalThreshold + 0.1);
			engine = new ProtectionDecisionEngine(mockProtectionManager, mockRiskAnalyzer);

			const decision = engine.evaluate({
				filePath: "/src/blocked.ts",
				trigger: "save",
			});

			expect(decision.shouldProceed).toBe(false);
		});

		it("should return true for block level with low risk", () => {
			mockProtectionManager.protect("/src/blocked.ts", "block");

			// Low risk scenario
			mockRiskAnalyzer = createMockRiskAnalyzer(() => 0);
			engine = new ProtectionDecisionEngine(mockProtectionManager, mockRiskAnalyzer);

			const decision = engine.evaluate({
				filePath: "/src/blocked.ts",
				trigger: "save",
			});

			expect(decision.shouldProceed).toBe(true);
		});
	});

	describe("cooldown bypass", () => {
		it("should return shouldSnapshot=false when in cooldown", () => {
			mockProtectionManager.protect("/src/index.ts", "watch");

			const decision = engine.evaluate({
				filePath: "/src/index.ts",
				trigger: "save",
				inCooldown: true,
			});

			expect(decision.shouldSnapshot).toBe(false);
			expect(decision.shouldProceed).toBe(true);
			expect(decision.reason).toBe("cooldown_bypass");
		});
	});

	describe("temporary allowance", () => {
		it("should return shouldSnapshot=true when has temporary allowance", () => {
			mockProtectionManager.protect("/src/index.ts", "block");

			const decision = engine.evaluate({
				filePath: "/src/index.ts",
				trigger: "save",
				hasTemporaryAllowance: true,
			});

			expect(decision.shouldSnapshot).toBe(true);
			expect(decision.shouldProceed).toBe(true);
			expect(decision.reason).toBe("temporary_allowance");
		});
	});

	describe("reason and recommendations", () => {
		it("should provide meaningful reason for AI-detected changes", () => {
			mockProtectionManager.protect("/src/index.ts", "watch");

			const decision = engine.evaluate({
				filePath: "/src/index.ts",
				trigger: "ai-detected",
			});

			expect(decision.reason).toBe("ai_detected_changes");
		});

		it("should provide recommendations for high risk", () => {
			mockProtectionManager.protect("/src/risky.ts", "warn");

			mockRiskAnalyzer = createMockRiskAnalyzer(() => THRESHOLDS.risk.highThreshold + 0.1);
			engine = new ProtectionDecisionEngine(mockProtectionManager, mockRiskAnalyzer);

			const decision = engine.evaluate({
				filePath: "/src/risky.ts",
				trigger: "save",
			});

			expect(decision.recommendations.length).toBeGreaterThan(0);
			expect(decision.recommendations).toContain("Review changes carefully before proceeding");
		});

		it("should include protection level in decision", () => {
			mockProtectionManager.protect("/src/blocked.ts", "block");

			const decision = engine.evaluate({
				filePath: "/src/blocked.ts",
				trigger: "save",
			});

			expect(decision.protectionLevel).toBe("block");
		});
	});

	describe("determinism", () => {
		it("should return consistent results for same context", () => {
			mockProtectionManager.protect("/src/index.ts", "warn");

			const context: EvaluationContext = {
				filePath: "/src/index.ts",
				trigger: "save",
			};

			const decision1 = engine.evaluate(context);
			const decision2 = engine.evaluate(context);

			expect(decision1.shouldSnapshot).toBe(decision2.shouldSnapshot);
			expect(decision1.shouldProceed).toBe(decision2.shouldProceed);
			expect(decision1.reason).toBe(decision2.reason);
		});
	});
});

describe("DefaultRiskAnalyzer", () => {
	let analyzer: DefaultRiskAnalyzer;

	beforeEach(() => {
		analyzer = new DefaultRiskAnalyzer();
	});

	it("should return 0 for minimal context", () => {
		const risk = analyzer.analyze({
			filePath: "/src/simple.ts",
			trigger: "save",
		});

		expect(risk).toBe(0);
	});

	it("should increase risk for AI detection", () => {
		const risk = analyzer.analyze({
			filePath: "/src/ai-edited.ts",
			trigger: "save",
			aiContext: {
				detected: true,
				confidence: 0.9,
			},
		});

		expect(risk).toBeGreaterThan(0);
	});

	it("should increase risk for burst patterns", () => {
		const riskWithBurst = analyzer.analyze({
			filePath: "/src/burst.ts",
			trigger: "save",
			aiContext: {
				detected: true,
				confidence: 0.9,
				burstPattern: true,
			},
		});

		const riskWithoutBurst = analyzer.analyze({
			filePath: "/src/burst.ts",
			trigger: "save",
			aiContext: {
				detected: true,
				confidence: 0.9,
				burstPattern: false,
			},
		});

		expect(riskWithBurst).toBeGreaterThan(riskWithoutBurst);
	});

	it("should increase risk for large changes", () => {
		const risk = analyzer.analyze({
			filePath: "/src/large-change.ts",
			trigger: "save",
			changeMetrics: {
				linesAdded: 150,
				linesDeleted: 50,
				charsAdded: 5000,
				charsDeleted: 1000,
			},
		});

		expect(risk).toBeGreaterThan(0);
	});

	it("should cap risk at 10", () => {
		const risk = analyzer.analyze({
			filePath: "/src/extreme.ts",
			trigger: "save",
			aiContext: {
				detected: true,
				confidence: 1.0,
				burstPattern: true,
			},
			changeMetrics: {
				linesAdded: 1000,
				linesDeleted: 500,
				charsAdded: 50000,
				charsDeleted: 25000,
				affectedFunctions: 50,
			},
		});

		expect(risk).toBeLessThanOrEqual(10);
	});
});
