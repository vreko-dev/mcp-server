#!/usr/bin/env tsx
/**
 * Mock Usage Analyzer for SnapBack Audit
 */

import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";

interface MockStats {
	totalMocks: number;
	unitTestMocks: number;
	integrationTestMocks: number;
	externalMocks: number;
	networkMocks: number;
}

interface PolicyLimits {
	maxMockRatioUnit: number;
	maxMockRatioIntegration: number;
	forbidNetworkMocks: boolean;
}

function findTestFiles(): { unit: string[]; integration: string[] } {
	try {
		const cwd = path.resolve(__dirname, "../../");

		// Find unit test files - glob.sync takes patterns as separate args or uses braces
		const unitPatterns = [
			"test/unit/**/*.{spec,test}.ts",
			"apps/*/test/unit/**/*.{spec,test}.ts",
			"packages/*/test/unit/**/*.{spec,test}.ts",
		];

		const unitFiles: string[] = [];
		for (const pattern of unitPatterns) {
			const matches = glob.sync(pattern, {
				ignore: ["node_modules/**"],
				cwd,
			});
			unitFiles.push(...matches.map((file) => path.resolve(cwd, file)));
		}

		// Find integration test files
		const integrationPatterns = [
			"test/integration/**/*.{spec,test}.ts",
			"apps/*/test/integration/**/*.{spec,test}.ts",
			"packages/*/test/integration/**/*.{spec,test}.ts",
		];

		const integrationFiles: string[] = [];
		for (const pattern of integrationPatterns) {
			const matches = glob.sync(pattern, {
				ignore: ["node_modules/**"],
				cwd,
			});
			integrationFiles.push(...matches.map((file) => path.resolve(cwd, file)));
		}

		return { unit: unitFiles, integration: integrationFiles };
	} catch (error) {
		console.error("Error finding test files:", error);
		return { unit: [], integration: [] };
	}
}

function analyzeMocksInFile(filePath: string): MockStats {
	const stats: MockStats = {
		totalMocks: 0,
		unitTestMocks: 0,
		integrationTestMocks: 0,
		externalMocks: 0,
		networkMocks: 0,
	};

	try {
		const content = fs.readFileSync(filePath, "utf-8");

		// Count various types of mocks
		const mockPatterns = [
			/vi\.mock|vi\.spyOn|vi\.fn/g, // Vitest mocks
			/sinon\.spy|sinon\.stub|sinon\.mock/g, // Sinon mocks
			/jest\.spyOn|jest\.fn|jest\.mock/g, // Jest mocks
			/mock\(|stub\(|spy\(/g, // Generic mock patterns
		];

		mockPatterns.forEach((pattern) => {
			const matches = content.match(pattern);
			if (matches) {
				stats.totalMocks += matches.length;
			}
		});

		// Check for network mocks
		const networkPatterns = [/fetch\(|axios\(|http\(|https\(/g, /"http:|https:|www\./g];

		networkPatterns.forEach((pattern) => {
			const matches = content.match(pattern);
			if (matches) {
				stats.networkMocks += matches.length;
			}
		});

		// Check for external dependency mocks
		const externalPatterns = [
			/fs\./g, // File system
			/child_process\./g, // Child processes
			/crypto\./g, // Crypto
			/os\./g, // OS
		];

		externalPatterns.forEach((pattern) => {
			const matches = content.match(pattern);
			if (matches) {
				stats.externalMocks += matches.length;
			}
		});
	} catch (error) {
		console.error(`Error processing file ${filePath}:`, error);
	}

	return stats;
}

async function analyzeMockUsage() {
	console.log("🔍 Analyzing mock usage in tests...\n");

	const testFiles = findTestFiles();
	console.log(`Found ${testFiles.unit.length} unit test files`);
	console.log(`Found ${testFiles.integration.length} integration test files\n`);

	// Analyze unit tests
	console.log("Analyzing unit tests...");
	const unitStats: MockStats = {
		totalMocks: 0,
		unitTestMocks: 0,
		integrationTestMocks: 0,
		externalMocks: 0,
		networkMocks: 0,
	};

	testFiles.unit.forEach((file) => {
		const fileStats = analyzeMocksInFile(file);
		unitStats.totalMocks += fileStats.totalMocks;
		unitStats.externalMocks += fileStats.externalMocks;
		unitStats.networkMocks += fileStats.networkMocks;
	});

	// Analyze integration tests
	console.log("Analyzing integration tests...");
	const integrationStats: MockStats = {
		totalMocks: 0,
		unitTestMocks: 0,
		integrationTestMocks: 0,
		externalMocks: 0,
		networkMocks: 0,
	};

	testFiles.integration.forEach((file) => {
		const fileStats = analyzeMocksInFile(file);
		integrationStats.totalMocks += fileStats.totalMocks;
		integrationStats.externalMocks += fileStats.externalMocks;
		integrationStats.networkMocks += fileStats.networkMocks;
	});

	// Calculate ratios
	const unitTestCount = testFiles.unit.length;
	const integrationTestCount = testFiles.integration.length;

	const unitMockRatio = unitTestCount > 0 ? unitStats.totalMocks / unitTestCount : 0;
	const integrationMockRatio = integrationTestCount > 0 ? integrationStats.totalMocks / integrationTestCount : 0;

	// Policy from audit runlist
	const policy: PolicyLimits = {
		maxMockRatioUnit: 0.5,
		maxMockRatioIntegration: 0.1,
		forbidNetworkMocks: true,
	};

	console.log("Mock Analysis Results:");
	console.log("=====================");
	console.log(
		`Unit tests: ${unitStats.totalMocks} mocks in ${unitTestCount} files (ratio: ${unitMockRatio.toFixed(2)})`,
	);
	console.log(
		`Integration tests: ${integrationStats.totalMocks} mocks in ${integrationTestCount} files (ratio: ${integrationMockRatio.toFixed(2)})`,
	);
	console.log(`External mocks: ${unitStats.externalMocks + integrationStats.externalMocks}`);
	console.log(`Network mocks: ${unitStats.networkMocks + integrationStats.networkMocks}\n`);

	// Check policy violations
	const violations: string[] = [];

	if (unitMockRatio > policy.maxMockRatioUnit) {
		violations.push(`Unit test mock ratio ${unitMockRatio.toFixed(2)} exceeds limit ${policy.maxMockRatioUnit}`);
	}

	if (integrationMockRatio > policy.maxMockRatioIntegration) {
		violations.push(
			`Integration test mock ratio ${integrationMockRatio.toFixed(2)} exceeds limit ${policy.maxMockRatioIntegration}`,
		);
	}

	if (policy.forbidNetworkMocks && unitStats.networkMocks + integrationStats.networkMocks > 0) {
		violations.push(
			`Network mocks found (${unitStats.networkMocks + integrationStats.networkMocks}) but forbidden by policy`,
		);
	}

	if (violations.length > 0) {
		console.log("❌ Policy violations:");
		violations.forEach((violation) => {
			console.log(`   ${violation}`);
		});
		return { passed: false, violations };
	}
	console.log("✅ All mock usage policies satisfied!");
	return { passed: true, violations: [] };
}

// Run the mock analyzer
analyzeMockUsage()
	.then((result) => {
		if (!result.passed) {
			process.exit(1);
		}
	})
	.catch((error) => {
		console.error("Error analyzing mock usage:", error);
		process.exit(1);
	});
