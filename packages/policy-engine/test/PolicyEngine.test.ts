import { describe, expect, it } from "vitest";
import { PolicyEngine } from "../src/PolicyEngine.js";

describe("PolicyEngine", () => {
	describe("Configuration", () => {
		it("should initialize with default rules", () => {
			const engine = new PolicyEngine();
			const config = engine.getConfig();

			expect(config.rules).toBeDefined();
			expect(config.rules.length).toBeGreaterThan(0);
			expect(config.defaultAction).toBe("watch");
		});

		it("should allow custom configuration", () => {
			const customRules = [
				{
					id: "custom-rule",
					name: "Custom Rule",
					detector: "secret" as const,
					action: "block" as const,
					enabled: true,
				},
			];

			const engine = new PolicyEngine({ rules: customRules, defaultAction: "warn" });
			const config = engine.getConfig();

			expect(config.rules).toEqual(customRules);
			expect(config.defaultAction).toBe("warn");
		});

		it("should update configuration", () => {
			const engine = new PolicyEngine();

			engine.updateConfig({ defaultAction: "block" });

			expect(engine.getConfig().defaultAction).toBe("block");
		});
	});

	describe("Rule Management", () => {
		it("should enable rules", () => {
			const engine = new PolicyEngine();
			const ruleId = "secret-detection-critical";

			engine.enableRule(ruleId);

			const rule = engine.getConfig().rules.find((r) => r.id === ruleId);
			expect(rule?.enabled).toBe(true);
		});

		it("should disable rules", () => {
			const engine = new PolicyEngine();
			const ruleId = "secret-detection-critical";

			engine.disableRule(ruleId);

			const rule = engine.getConfig().rules.find((r) => r.id === ruleId);
			expect(rule?.enabled).toBe(false);
		});
	});

	describe("File Analysis", () => {
		it("should analyze files with secrets", async () => {
			const engine = new PolicyEngine();
			const code = `
				const awsKey = "AKIAIOSFODNN7EXAMPLE";
			`;

			const result = await engine.analyzeFile("src/config.ts", code);

			expect(result.events.length).toBeGreaterThan(0);
			expect(result.events[0].detector).toBe("secret");
			expect(result.summary.totalFindings).toBeGreaterThan(0);
		});

		it("should analyze files with mock patterns", async () => {
			const engine = new PolicyEngine();
			const code = `
				import { describe } from 'vitest';
				const mockData = { test: true };
			`;

			const result = await engine.analyzeFile("src/test.ts", code);

			// Should have mock findings
			const mockEvent = result.events.find((e) => e.detector === "mock");
			expect(mockEvent).toBeDefined();
		});

		it("should return watch action for clean code", async () => {
			const engine = new PolicyEngine();
			const code = `
				const config = { apiUrl: 'https://api.example.com' };
			`;

			const result = await engine.analyzeFile("src/config.ts", code);

			expect(result.action).toBe("watch");
			expect(result.events.length).toBe(0);
			expect(result.summary.totalFindings).toBe(0);
		});

		it("should calculate highest action correctly", async () => {
			const engine = new PolicyEngine();
			const code = `
				const awsKey = "AKIAIOSFODNN7EXAMPLE";
				const mockData = { test: true };
			`;

			const result = await engine.analyzeFile("src/mixed.ts", code);

			// Should be block because of critical secret
			expect(result.action).toBe("block");
			expect(result.summary.highestAction).toBe("block");
		});
	});

	describe("Package.json Analysis", () => {
		it("should analyze package.json for phantom dependencies", async () => {
			const engine = new PolicyEngine();
			const packageJson = JSON.stringify({
				dependencies: {
					"unused-package": "1.0.0",
					"used-package": "2.0.0",
				},
			});

			const codebaseFiles = [
				{
					path: "src/index.ts",
					content: 'import { something } from "used-package";',
				},
			];

			const result = await engine.analyzePackageJson(packageJson, codebaseFiles);

			// Should have phantom dependency event
			const phantomEvent = result.events.find((e) => e.detector === "phantom-dependency");
			expect(phantomEvent).toBeDefined();
		});

		it("should return watch for well-maintained package.json", async () => {
			const engine = new PolicyEngine();
			const packageJson = JSON.stringify({
				dependencies: {
					"used-package": "1.0.0",
				},
			});

			const codebaseFiles = [
				{
					path: "src/index.ts",
					content: 'import { something } from "used-package";',
				},
			];

			const result = await engine.analyzePackageJson(packageJson, codebaseFiles);

			expect(result.action).toBe("watch");
		});
	});

	describe("Action Priority", () => {
		it("should prioritize block over warn", async () => {
			const engine = new PolicyEngine({
				rules: [
					{
						id: "block-rule",
						name: "Block Rule",
						detector: "secret",
						action: "block",
						severity: "critical",
						enabled: true,
					},
					{
						id: "warn-rule",
						name: "Warn Rule",
						detector: "mock",
						action: "warn",
						enabled: true,
					},
				],
			});

			const code = `
				const awsKey = "AKIAIOSFODNN7EXAMPLE";
				import { describe } from 'vitest';
			`;

			const result = await engine.analyzeFile("src/test.ts", code);

			expect(result.action).toBe("block");
		});

		it("should prioritize warn over watch", async () => {
			const engine = new PolicyEngine({
				rules: [
					{
						id: "warn-rule",
						name: "Warn Rule",
						detector: "mock",
						action: "warn",
						enabled: true,
					},
				],
				defaultAction: "watch",
			});

			const code = `
				const mockData = { test: true };
			`;

			const result = await engine.analyzeFile("src/test.ts", code);

			expect(result.action).toBe("warn");
		});
	});

	describe("Detection Events", () => {
		it("should include timestamp in events", async () => {
			const engine = new PolicyEngine();
			const code = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;

			const result = await engine.analyzeFile("src/test.ts", code);

			expect(result.events[0].timestamp).toBeDefined();
			expect(new Date(result.events[0].timestamp)).toBeInstanceOf(Date);
		});

		it("should include risk score in events", async () => {
			const engine = new PolicyEngine();
			const code = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;

			const result = await engine.analyzeFile("src/test.ts", code);

			expect(result.events[0].riskScore).toBeGreaterThan(0);
		});

		it("should include rule ID in events", async () => {
			const engine = new PolicyEngine();
			const code = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;

			const result = await engine.analyzeFile("src/test.ts", code);

			expect(result.events[0].ruleId).toBeDefined();
		});
	});

	describe("Summary Statistics", () => {
		it("should count findings by detector", async () => {
			const engine = new PolicyEngine();
			const code = `
				const awsKey = "AKIAIOSFODNN7EXAMPLE";
				const ghToken = "ghp_1234567890abcdefghijklmnopqrst123456";
			`;

			const result = await engine.analyzeFile("src/test.ts", code);

			expect(result.summary.byDetector.secret).toBeGreaterThan(0);
		});

		it("should calculate total findings", async () => {
			const engine = new PolicyEngine();
			const code = `
				const awsKey = "AKIAIOSFODNN7EXAMPLE";
				import { describe } from 'vitest';
			`;

			const result = await engine.analyzeFile("src/test.ts", code);

			const expectedTotal = result.events.reduce((sum, e) => sum + e.findings.length, 0);
			expect(result.summary.totalFindings).toBe(expectedTotal);
		});
	});

	describe("Disabled Detectors", () => {
		it("should skip disabled detectors", async () => {
			const engine = new PolicyEngine({
				rules: [
					{
						id: "secret-rule",
						name: "Secret Rule",
						detector: "secret",
						action: "block",
						enabled: false, // Disabled
					},
				],
			});

			const code = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;

			const result = await engine.analyzeFile("src/test.ts", code);

			// Should not detect secrets because detector is disabled
			expect(result.events.length).toBe(0);
		});
	});

	describe("Severity-based Actions", () => {
		it("should apply different actions based on severity", async () => {
			const engine = new PolicyEngine({
				rules: [
					{
						id: "critical-block",
						name: "Block Critical",
						detector: "secret",
						action: "block",
						severity: "critical",
						enabled: true,
					},
					{
						id: "high-warn",
						name: "Warn High",
						detector: "secret",
						action: "warn",
						severity: "high",
						enabled: true,
					},
				],
			});

			const criticalCode = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;
			const criticalResult = await engine.analyzeFile("src/critical.ts", criticalCode);

			expect(criticalResult.action).toBe("block");
		});
	});
});
