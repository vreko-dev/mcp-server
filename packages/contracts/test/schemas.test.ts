import { describe, expect, it } from "vitest";
import {
	AnalyzeRiskArgsSchema,
	CheckpointSchema,
	CreateCheckpointArgsSchema,
	DepQuickArgsSchema,
	DiffChangeSchema,
	RiskScoreSchema,
} from "../src/schemas.js";

describe("Schemas", () => {
	describe("DiffChangeSchema", () => {
		it("should validate a valid diff change", () => {
			const validDiff = {
				added: true,
				value: "test content",
				count: 5,
			};

			const result = DiffChangeSchema.safeParse(validDiff);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.added).toBe(true);
				expect(result.data.value).toBe("test content");
				expect(result.data.count).toBe(5);
			}
		});

		it("should provide default values for optional fields", () => {
			const minimalDiff = {
				value: "test content",
			};

			const result = DiffChangeSchema.safeParse(minimalDiff);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.added).toBe(false); // default
				expect(result.data.removed).toBe(false); // default
				expect(result.data.value).toBe("test content");
				expect(result.data.count).toBeUndefined();
			}
		});
	});

	describe("RiskScoreSchema", () => {
		it("should validate a valid risk score", () => {
			const validRisk = {
				score: 0.8,
				factors: ["large insertion", "AI pattern detected"],
				severity: "high" as const,
			};

			const result = RiskScoreSchema.safeParse(validRisk);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.score).toBe(0.8);
				expect(result.data.factors).toEqual(["large insertion", "AI pattern detected"]);
				expect(result.data.severity).toBe("high");
			}
		});

		it("should reject invalid scores", () => {
			const invalidRisk = {
				score: 10.5, // above max of 10
				factors: [],
				severity: "low" as const,
			};

			const result = RiskScoreSchema.safeParse(invalidRisk);
			expect(result.success).toBe(false);
		});
	});

	describe("CheckpointSchema", () => {
		it("should validate a valid checkpoint", () => {
			const validCheckpoint = {
				id: "cp_123",
				timestamp: Date.now(),
				meta: {
					trigger: "manual",
					risk: 0.5,
				},
			};

			const result = CheckpointSchema.safeParse(validCheckpoint);
			expect(result.success).toBe(true);
		});
	});

	describe("CreateCheckpointArgsSchema", () => {
		it("should validate with default trigger", () => {
			const args = {
				// trigger will default to 'manual'
				risk: 0.3,
				content: "test content",
			};

			const result = CreateCheckpointArgsSchema.safeParse(args);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.trigger).toBe("manual"); // default
				expect(result.data.risk).toBe(0.3);
				expect(result.data.content).toBe("test content");
			}
		});
	});

	describe("AnalyzeRiskArgsSchema", () => {
		it("should validate risk analysis arguments", () => {
			const args = {
				changes: [
					{ added: true, value: "new code", count: 10 },
					{ removed: true, value: "old code" },
				],
			};

			const result = AnalyzeRiskArgsSchema.safeParse(args);
			expect(result.success).toBe(true);
		});
	});

	describe("DepQuickArgsSchema", () => {
		it("should validate dependency analysis arguments", () => {
			const args = {
				before: { dependencies: { react: "1.0.0" } },
				after: { dependencies: { react: "2.0.0" } },
			};

			const result = DepQuickArgsSchema.safeParse(args);
			expect(result.success).toBe(true);
		});
	});
});
