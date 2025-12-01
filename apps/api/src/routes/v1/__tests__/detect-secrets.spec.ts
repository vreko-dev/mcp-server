import { beforeEach, describe, expect, it, vi } from "vitest";
import { SecretDetectionService } from "../../services/secret-detection";

describe("Secret Detection Service", () => {
	let secretDetectionService: SecretDetectionService;

	beforeEach(() => {
		secretDetectionService = new SecretDetectionService();
	});

	describe("detectSecretsInFile", () => {
		it("should detect AWS access keys", async () => {
			const file = {
				path: "config.js",
				content: "const awsKey = 'AKIAIOSFODNN7EXAMPLE';",
			};

			const findings = await (secretDetectionService as any).detectSecretsInFile(file);

			expect(findings).toHaveLength(1);
			expect(findings[0].type).toBe("AWS Access Key");
			expect(findings[0].severity).toBe("high");
		});

		it("should detect GitHub tokens", async () => {
			const file = {
				path: ".env",
				content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456",
			};

			const findings = await (secretDetectionService as any).detectSecretsInFile(file);

			expect(findings).toHaveLength(1);
			expect(findings[0].type).toBe("GitHub Token");
			expect(findings[0].severity).toBe("high");
		});

		it("should detect high entropy strings", async () => {
			const file = {
				path: "secrets.js",
				content: "const secret = 'a8F!kL9@mN2#zX7$vB4%';",
			};

			const findings = await (secretDetectionService as any).detectSecretsInFile(file);

			expect(findings.length).toBeGreaterThan(0);
			expect(findings[0].type).toBe("High Entropy String");
		});

		it("should skip test/example files", async () => {
			const file = {
				path: "test-config.js",
				content: "const testKey = 'AKIAIOSFODNN7EXAMPLE'; // test key",
			};

			const findings = await (secretDetectionService as any).detectSecretsInFile(file);

			// Should not detect secrets in test files
			expect(findings).toHaveLength(0);
		});

		it("should skip binary files", async () => {
			const service: any = secretDetectionService;

			expect(service.isBinaryFile("image.png")).toBe(true);
			expect(service.isBinaryFile("document.pdf")).toBe(true);
			expect(service.isBinaryFile("source.js")).toBe(false);
		});
	});

	describe("calculateEntropy", () => {
		it("should calculate entropy correctly", () => {
			const service: any = secretDetectionService;

			// Low entropy string (repetitive)
			const lowEntropy = service.calculateEntropy("aaaaaa");
			expect(lowEntropy).toBeCloseTo(0);

			// High entropy string (random)
			const highEntropy = service.calculateEntropy("a8F!kL9@mN2#zX7$vB4%");
			expect(highEntropy).toBeGreaterThan(3);
		});
	});

	describe("detectSecrets", () => {
		it("should return proper result structure", async () => {
			const request = {
				files: [
					{
						path: "test.js",
						content: "const apiKey = 'test123';",
					},
				],
				userId: "user123",
				apiKeyId: "key123",
			};

			// Mock database operations
			vi.spyOn(secretDetectionService as any, "updateUserSafetyProfile").mockResolvedValue(undefined);

			const result = await secretDetectionService.detectSecrets(request);

			expect(result).toHaveProperty("detectionId");
			expect(result).toHaveProperty("findings");
			expect(result).toHaveProperty("riskScore");
			expect(result).toHaveProperty("riskLevel");
			expect(result).toHaveProperty("summary");
			expect(result).toHaveProperty("recommendations");
			expect(result).toHaveProperty("timestamp");
		});
	});
});
