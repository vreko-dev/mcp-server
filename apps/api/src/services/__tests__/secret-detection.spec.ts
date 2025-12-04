import { beforeEach, describe, expect, it, vi } from "vitest";
import { SecretDetectionService } from "../secret-detection";

describe("SecretDetectionService", () => {
	let secretDetectionService: SecretDetectionService;

	beforeEach(() => {
		secretDetectionService = new SecretDetectionService();
	});

	it("should create an instance of SecretDetectionService", () => {
		expect(secretDetectionService).toBeInstanceOf(SecretDetectionService);
	});

	describe("calculateRiskScoreForFinding", () => {
		it("should calculate risk score based on severity and confidence", () => {
			const service: any = secretDetectionService;

			const highSeverityFinding = {
				severity: "high" as const,
				confidence: 0.9,
			};

			const mediumSeverityFinding = {
				severity: "medium" as const,
				confidence: 0.7,
			};

			const lowSeverityFinding = {
				severity: "low" as const,
				confidence: 0.5,
			};

			const highScore =
				service.calculateRiskScoreForFinding(highSeverityFinding);
			const mediumScore = service.calculateRiskScoreForFinding(
				mediumSeverityFinding,
			);
			const lowScore = service.calculateRiskScoreForFinding(lowSeverityFinding);

			expect(highScore).toBeGreaterThan(mediumScore);
			expect(mediumScore).toBeGreaterThan(lowScore);
		});
	});

	describe("isLikelyTestOrExample", () => {
		it("should identify test/example patterns", () => {
			const service: any = secretDetectionService;

			expect(service.isLikelyTestOrExample("const key = 'test123';")).toBe(
				true,
			);
			expect(service.isLikelyTestOrExample("EXAMPLE_API_KEY=abc123")).toBe(
				true,
			);
			expect(
				service.isLikelyTestOrExample("const realKey = 'AKIA123456789';"),
			).toBe(false);
		});
	});

	describe("detectSecrets", () => {
		it("should handle empty files", async () => {
			const request = {
				files: [],
				userId: "user123",
				apiKeyId: "key123",
			};

			// Mock database operations
			vi.spyOn(
				secretDetectionService as any,
				"updateUserSafetyProfile",
			).mockResolvedValue(undefined);

			const result = await secretDetectionService.detectSecrets(request);

			expect(result.findings).toHaveLength(0);
			expect(result.riskScore).toBe(0);
			expect(result.riskLevel).toBe("low");
			expect(result.summary).toBe("0 secrets detected");
		});

		it("should handle files with no secrets", async () => {
			const request = {
				files: [
					{
						path: "clean.js",
						content: "const x = 1;\nconsole.log('hello world');",
					},
				],
				userId: "user123",
				apiKeyId: "key123",
			};

			// Mock database operations
			vi.spyOn(
				secretDetectionService as any,
				"updateUserSafetyProfile",
			).mockResolvedValue(undefined);

			const result = await secretDetectionService.detectSecrets(request);

			expect(result.findings).toHaveLength(0);
			expect(result.riskScore).toBe(0);
			expect(result.riskLevel).toBe("low");
		});
	});
});
