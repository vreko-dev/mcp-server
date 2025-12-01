#!/usr/bin/env tsx
/**
 * Coverage Analyzer for SnapBack Audit
 */

import fs from "node:fs";
import path from "node:path";

interface PolicyThresholds {
	statements: number;
	branches: number;
	functions: number;
	lines: number;
	perFileMinimums: {
		statements: number;
		branches: number;
		functions: number;
		lines: number;
	};
}

function parseLcovData(lcovContent: string): any[] {
	const files: any[] = [];
	const fileSections = lcovContent.split("TN:").filter((section) => section.trim());

	for (const section of fileSections) {
		const lines = section.trim().split("\n");
		if (lines.length < 3) {
			continue;
		}

		const fileName = lines[0].replace("SF:", "").trim();
		if (!fileName) {
			continue;
		}

		let linesFound = 0;
		let linesHit = 0;
		let functionsFound = 0;
		let functionsHit = 0;
		let branchesFound = 0;
		let branchesHit = 0;

		for (const line of lines) {
			if (line.startsWith("LF:")) {
				linesFound = Number.parseInt(line.replace("LF:", "").trim(), 10);
			} else if (line.startsWith("LH:")) {
				linesHit = Number.parseInt(line.replace("LH:", "").trim(), 10);
			} else if (line.startsWith("FNF:")) {
				functionsFound = Number.parseInt(line.replace("FNF:", "").trim(), 10);
			} else if (line.startsWith("FNH:")) {
				functionsHit = Number.parseInt(line.replace("FNH:", "").trim(), 10);
			} else if (line.startsWith("BRF:")) {
				branchesFound = Number.parseInt(line.replace("BRF:", "").trim(), 10);
			} else if (line.startsWith("BRH:")) {
				branchesHit = Number.parseInt(line.replace("BRH:", "").trim(), 10);
			}
		}

		files.push({
			fileName,
			lines: {
				total: linesFound,
				covered: linesHit,
				pct: linesFound > 0 ? (linesHit / linesFound) * 100 : 0,
			},
			functions: {
				total: functionsFound,
				covered: functionsHit,
				pct: functionsFound > 0 ? (functionsHit / functionsFound) * 100 : 0,
			},
			branches: {
				total: branchesFound,
				covered: branchesHit,
				pct: branchesFound > 0 ? (branchesHit / branchesFound) * 100 : 0,
			},
		});
	}

	return files;
}

function readLcovData(): any[] | null {
	const lcovPaths = ["apps/vscode/coverage/lcov.info", "coverage/lcov.info", "apps/web/coverage/lcov.info"];

	for (const lcovPath of lcovPaths) {
		try {
			const fullPath = path.resolve(__dirname, "../../", lcovPath);
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, "utf-8");
				return parseLcovData(content);
			}
		} catch (error) {
			console.warn(`Could not read lcov from ${lcovPath}:`, error);
		}
	}

	return null;
}

function analyzeCoverageAgainstPolicy(
	files: any[],
	policy: PolicyThresholds,
): { passed: boolean; violations: string[]; details: string[] } {
	const violations: string[] = [];
	const details: string[] = [];

	if (files.length === 0) {
		return {
			passed: false,
			violations: ["No coverage data found"],
			details: [],
		};
	}

	// Calculate overall coverage
	let totalLines = 0;
	let coveredLines = 0;
	let totalFunctions = 0;
	let coveredFunctions = 0;
	let totalBranches = 0;
	let coveredBranches = 0;

	for (const file of files) {
		totalLines += file.lines.total;
		coveredLines += file.lines.covered;
		totalFunctions += file.functions.total;
		coveredFunctions += file.functions.covered;
		totalBranches += file.branches.total;
		coveredBranches += file.branches.covered;
	}

	const linesPct = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
	const functionsPct = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0;
	const branchesPct = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;

	// Check global thresholds
	if (linesPct < policy.lines) {
		violations.push(`Lines coverage ${linesPct.toFixed(1)}% below threshold ${policy.lines}%`);
	} else {
		details.push(`Lines coverage: ${linesPct.toFixed(1)}% (target: ${policy.lines}%)`);
	}

	if (functionsPct < policy.functions) {
		violations.push(`Functions coverage ${functionsPct.toFixed(1)}% below threshold ${policy.functions}%`);
	} else {
		details.push(`Functions coverage: ${functionsPct.toFixed(1)}% (target: ${policy.functions}%)`);
	}

	if (branchesPct < policy.branches) {
		violations.push(`Branches coverage ${branchesPct.toFixed(1)}% below threshold ${policy.branches}%`);
	} else {
		details.push(`Branches coverage: ${branchesPct.toFixed(1)}% (target: ${policy.branches}%)`);
	}

	// Check per-file minimums
	let filesBelowThreshold = 0;

	for (const file of files) {
		if (
			file.lines.pct < policy.perFileMinimums.lines ||
			file.functions.pct < policy.perFileMinimums.functions ||
			file.branches.pct < policy.perFileMinimums.branches
		) {
			filesBelowThreshold++;
		}
	}

	if (filesBelowThreshold > 0) {
		violations.push(`${filesBelowThreshold} files below per-file minimum thresholds`);
	} else {
		details.push(`All ${files.length} files meet per-file minimum thresholds`);
	}

	return {
		passed: violations.length === 0,
		violations,
		details,
	};
}

async function runCoverageAnalysis() {
	console.log("📊 Analyzing test coverage...\n");

	const files = readLcovData();

	if (!files) {
		console.log("⚠️ No coverage data found. Run tests with coverage first:");
		console.log("   pnpm test:coverage\n");
		return { passed: false, violations: ["No coverage data found"], details: [] };
	}

	// Policy from the audit runlist
	const policy: PolicyThresholds = {
		statements: 85,
		branches: 80,
		functions: 85,
		lines: 85,
		perFileMinimums: {
			statements: 70,
			branches: 65,
			functions: 70,
			lines: 70,
		},
	};

	const analysis = analyzeCoverageAgainstPolicy(files, policy);

	console.log("Coverage Analysis Results:");
	console.log("==========================");

	analysis.details.forEach((detail) => {
		console.log(`✅ ${detail}`);
	});

	if (analysis.violations.length > 0) {
		console.log("\n❌ Violations:");
		analysis.violations.forEach((violation) => {
			console.log(`   ${violation}`);
		});
	} else {
		console.log("\n🎉 All coverage thresholds met!");
	}

	return analysis;
}

// Run the coverage analyzer
runCoverageAnalysis()
	.then((result) => {
		if (!result.passed) {
			process.exit(1);
		}
	})
	.catch((error) => {
		console.error("Error running coverage analysis:", error);
		process.exit(1);
	});
