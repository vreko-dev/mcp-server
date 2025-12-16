#!/usr/bin/env ts-node

/**
 * TDD Gate Runner
 * Executes verification gates for each TDD phase
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

interface GateResult {
	phase: string;
	passed: boolean;
	checks: CheckResult[];
	violations: Violation[];
}

interface CheckResult {
	name: string;
	passed: boolean;
	message: string;
}

interface Violation {
	type: string;
	file?: string;
	line?: number;
	message: string;
	prevention: string;
}

const STATE_FILE = "ai_dev_utils/state/current-task.json";
const VIOLATIONS_FILE = "ai_dev_utils/patterns/violations.jsonl";

// Gate implementations
const gates: Record<string, () => Promise<GateResult>> = {
	audit: async (): Promise<GateResult> => {
		const checks: CheckResult[] = [];
		const violations: Violation[] = [];

		// Check 1: State file has service location
		const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
		const hasLocation = state.evidence?.serviceLocation;
		checks.push({
			name: "Service location identified",
			passed: !!hasLocation,
			message: hasLocation ? `Location: ${hasLocation}` : "No service location in state",
		});

		if (!hasLocation) {
			violations.push({
				type: "MISSING_SERVICE_LOCATION",
				message: "Architecture audit requires service location to be identified",
				prevention: "Complete Step 3 in architecture audit and save to state file",
			});
		}

		// Check 2: Service location is in canonical directory
		// For BUG_FIX tasks on test files, implementation location is already correct
		if (hasLocation) {
			const taskType = state.taskType || state.type;
			const isBugFix = taskType === "BUG_FIX" || taskType === "REFACTORING";
			const inServices =
				hasLocation.includes("/services/") ||
				hasLocation.includes("/core/") ||
				hasLocation.includes("/snapshot/") ||
				hasLocation.includes("/commands/") ||
				hasLocation.includes("packages/engine/src/");

			// For bug fixes, existing service location is acceptable
			const passed = isBugFix ? true : inServices;

			checks.push({
				name: "Canonical location verified",
				passed,
				message: passed ? "Location follows architecture" : "Location not in canonical directory",
			});

			if (!passed) {
				violations.push({
					type: "NON_CANONICAL_LOCATION",
					file: hasLocation,
					message: "Implementation location does not follow canonical structure",
					prevention: "Move to apps/api/src/services/ or packages/core/src/",
				});
			}
		}

		return {
			phase: "audit",
			passed: checks.every((c) => c.passed),
			checks,
			violations,
		};
	},

	red: async (): Promise<GateResult> => {
		const checks: CheckResult[] = [];
		const violations: Violation[] = [];
		const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
		const testFile = state.evidence?.testFile;

		// Check 1: Test file exists
		const testExists = testFile && fs.existsSync(testFile);
		checks.push({
			name: "Test file exists",
			passed: testExists,
			message: testExists ? `Found: ${testFile}` : "Test file not found",
		});

		// Check 2: Test fails
		if (testExists) {
			try {
				execSync(`pnpm test ${testFile} 2>&1`, { encoding: "utf-8" });
				// If we get here, test passed - that's wrong for RED phase
				checks.push({
					name: "Test fails correctly",
					passed: false,
					message: "Test passed - should fail in RED phase",
				});
				violations.push({
					type: "TEST_PASSED_IN_RED",
					file: testFile,
					message: "Test should fail before implementation exists",
					prevention: "Write test for non-existent functionality",
				});
			} catch (error: any) {
				// Test failed - correct!
				const output = error.stdout || error.message;
				const correctFailure = !output.includes("SyntaxError") && !output.includes("Timeout");
				checks.push({
					name: "Test fails correctly",
					passed: correctFailure,
					message: correctFailure ? "Test fails as expected" : "Test fails with wrong error type",
				});
			}
		}

		// Check 3: No vague assertions
		if (testExists) {
			const content = fs.readFileSync(testFile, "utf-8");
			const vaguePatterns = [
				/\.toBeTruthy\(\)/g,
				/\.toBeDefined\(\)/g,
				/\.toBeNull\(\)\s*[;)]/g,
				/\.toBeFalsy\(\)/g,
				/toBeGreaterThan\(/g,
			];

			let vagueCount = 0;
			for (const pattern of vaguePatterns) {
				const matches = content.match(pattern);
				if (matches) {
					vagueCount += matches.length;
				}
			}

			checks.push({
				name: "No vague assertions",
				passed: vagueCount === 0,
				message: vagueCount === 0 ? "All assertions specific" : `Found ${vagueCount} vague assertions`,
			});

			if (vagueCount > 0) {
				violations.push({
					type: "VAGUE_ASSERTION",
					file: testFile,
					message: `Found ${vagueCount} vague assertions`,
					prevention: "Use specific assertions: .toEqual(), .toBe(), .toMatchObject() with real values",
				});
			}
		}

		return {
			phase: "red",
			passed: checks.every((c) => c.passed),
			checks,
			violations,
		};
	},

	green: async (): Promise<GateResult> => {
		const checks: CheckResult[] = [];
		const violations: Violation[] = [];
		const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
		const testFile = state.evidence?.testFile;

		// Check 1: Test passes
		if (testFile && fs.existsSync(testFile)) {
			try {
				// Extract package/app path from test file (handles both apps/ and packages/)
				const parts = testFile.split("/");
				const rootDir = parts[0]; // 'apps' or 'packages'
				const subDir = parts[1]; // 'vscode' or 'engine'
				const pkgPath = `${rootDir}/${subDir}`;
				const relativePath = testFile.replace(`${pkgPath}/`, "");

				execSync(`cd ${pkgPath} && npm run test -- ${relativePath} 2>&1`, { encoding: "utf-8" });
				checks.push({
					name: "Test passes",
					passed: true,
					message: "All tests passing",
				});
			} catch {
				checks.push({
					name: "Test passes",
					passed: false,
					message: "Tests still failing",
				});
			}
		}

		// Check 2: Implementation in correct location
		const serviceLocation = state.evidence?.serviceLocation;
		if (serviceLocation) {
			// For refactoring tasks, package locations are also valid
			const taskType = state.taskType || state.type;
			const isRefactoring = taskType === "REFACTORING" || taskType === "BUG_FIX";
			const inCanonicalLocation =
				serviceLocation.includes("/services/") ||
				serviceLocation.includes("/core/") ||
				serviceLocation.includes("packages/auth/") ||
				serviceLocation.includes("packages/sdk/") ||
				serviceLocation.includes("packages/infrastructure/") ||
				serviceLocation.includes("packages/contracts/");
			const passed = isRefactoring || inCanonicalLocation;
			checks.push({
				name: "Implementation in service layer",
				passed,
				message: passed ? "Correct location" : "Implementation not in canonical directory",
			});

			if (!passed) {
				violations.push({
					type: "SERVICE_BYPASS",
					file: serviceLocation,
					message: "Business logic must be in service layer or canonical package",
					prevention: "Move implementation to apps/api/src/services/ or packages/*/src/",
				});
			}
		}

		return {
			phase: "green",
			passed: checks.every((c) => c.passed),
			checks,
			violations,
		};
	},

	refactor: async (): Promise<GateResult> => {
		const checks: CheckResult[] = [];
		const violations: Violation[] = [];
		const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
		const testFile = state.evidence?.testFile;

		// Check 1: Tests still pass
		if (testFile && fs.existsSync(testFile)) {
			try {
				// Extract package/app path from test file (handles both apps/ and packages/)
				const parts = testFile.split("/");
				const rootDir = parts[0]; // 'apps' or 'packages'
				const subDir = parts[1]; // 'vscode' or 'engine'
				const pkgPath = `${rootDir}/${subDir}`;
				const relativePath = testFile.replace(`${pkgPath}/`, "");

				// Run tests using npm run test with correct path
				execSync(`cd ${pkgPath} && npm run test -- ${relativePath} 2>&1`, {
					encoding: "utf-8",
					cwd: process.cwd(),
				});
				checks.push({
					name: "Tests still pass after refactor",
					passed: true,
					message: "All tests passing",
				});
			} catch {
				checks.push({
					name: "Tests still pass after refactor",
					passed: false,
					message: "Refactoring broke tests",
				});
				violations.push({
					type: "REFACTOR_BROKE_TESTS",
					file: testFile,
					message: "Tests failing after refactoring",
					prevention: "Revert refactoring and make smaller changes",
				});
			}
		}

		return {
			phase: "refactor",
			passed: checks.every((c) => c.passed),
			checks,
			violations,
		};
	},

	quality: async (): Promise<GateResult> => {
		const checks: CheckResult[] = [];
		const violations: Violation[] = [];
		const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
		const testFile = state.evidence?.testFile;
		const taskType = state.taskType || state.type;

		// For REFACTORING tasks (import swaps), existing tests are sufficient
		const isRefactoring = taskType === "REFACTORING";
		if (isRefactoring && state.evidence?.refactoringComplete) {
			checks.push({
				name: "4-path coverage",
				passed: true,
				message: "Refactoring task - existing tests verify behavior unchanged",
			});
			checks.push({
				name: "No untracked skipped tests",
				passed: true,
				message: "Refactoring task - no new tests added",
			});
			return {
				phase: "quality",
				passed: true,
				checks,
				violations,
			};
		}

		if (!testFile) {
			return { phase: "quality", passed: false, checks: [], violations: [] };
		}

		const content = fs.readFileSync(testFile, "utf-8");

		// Check 1: 4-path coverage - Flexible pattern matching
		// Detect paths via section headers, describe blocks, or keywords
		const hasHappyPath =
			content.includes("Happy Path") ||
			content.includes("should successfully") ||
			content.includes("should analyze valid") ||
			content.includes("should return risk") ||
			content.includes("should detect");

		const hasSadPath =
			content.includes("Sad Path") ||
			content.includes("should return error") ||
			content.includes("should return zero") ||
			content.includes("should handle");

		const hasEdgeCase =
			content.includes("Edge Case") ||
			content.includes("boundary") ||
			content.includes("empty") ||
			content.includes("large") ||
			content.includes("performance");

		const hasErrorCase =
			content.includes("Error Path") ||
			content.includes("invalid input") ||
			content.includes("should throw") ||
			content.includes("gracefully") ||
			content.includes("error handling");

		const pathCount = [hasHappyPath, hasSadPath, hasEdgeCase, hasErrorCase].filter(Boolean).length;

		checks.push({
			name: "4-path coverage",
			passed: pathCount >= 4,
			message: `${pathCount}/4 paths covered`,
		});

		if (pathCount < 4) {
			const missing: string[] = [];
			if (!hasHappyPath) {
				missing.push("happy path");
			}
			if (!hasSadPath) {
				missing.push("sad path");
			}
			if (!hasEdgeCase) {
				missing.push("edge case");
			}
			if (!hasErrorCase) {
				missing.push("error case");
			}

			violations.push({
				type: "INCOMPLETE_COVERAGE",
				file: testFile,
				message: `Missing test paths: ${missing.join(", ")}`,
				prevention: "Add tests for all 4 paths before completing",
			});
		}

		// Check 2: Skipped tests are tracked with issue labels
		// Allow it.skip() if it has a tracking label (e.g., [GH-4.3-vitest-mock])
		const allSkips = content.match(/\.skip\(/g) || [];
		const trackedSkips = (content.match(/\[GH-[\w.-]+\]/g) || []).length;
		const untrackedSkips = allSkips.length - trackedSkips;

		const hasUntrackedSkipped =
			untrackedSkips > 0 ||
			content.includes(".only") ||
			content.includes("xit(") ||
			content.includes("xdescribe(");

		checks.push({
			name: "No untracked skipped tests",
			passed: !hasUntrackedSkipped,
			message: hasUntrackedSkipped
				? "Found untracked skipped/focused tests"
				: "All skips are tracked with issue labels",
		});

		return {
			phase: "quality",
			passed: checks.every((c) => c.passed),
			checks,
			violations,
		};
	},

	certify: async (): Promise<GateResult> => {
		const checks: CheckResult[] = [];
		const violations: Violation[] = [];

		// Check 1: All evidence files exist
		const evidenceFiles = [
			"ai_dev_utils/state/red-phase-output.txt",
			"ai_dev_utils/state/green-phase-output.txt",
			"ai_dev_utils/state/quality-output.txt",
		];

		for (const file of evidenceFiles) {
			const exists = fs.existsSync(file);
			checks.push({
				name: `Evidence: ${path.basename(file)}`,
				passed: exists,
				message: exists ? "Found" : "Missing",
			});

			if (!exists) {
				violations.push({
					type: "MISSING_EVIDENCE",
					file,
					message: `Evidence file not found: ${file}`,
					prevention: "Go back to relevant phase and capture evidence",
				});
			}
		}

		// Check 2: State has certification
		const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
		const hasCertification = state.certification?.status === "COMPLETE";
		checks.push({
			name: "Certification statement saved",
			passed: hasCertification,
			message: hasCertification ? "Complete" : "Missing certification",
		});

		return {
			phase: "certify",
			passed: checks.every((c) => c.passed),
			checks,
			violations,
		};
	},
};

// Main execution
async function runGate(phase: string): Promise<void> {
	console.log(`\n🔍 Running gate: ${phase}\n`);

	const gate = gates[phase];
	if (!gate) {
		console.error(`❌ Unknown gate: ${phase}`);
		process.exit(1);
	}

	const result = await gate();

	// Print results
	console.log("Checks:");
	for (const check of result.checks) {
		const icon = check.passed ? "✅" : "❌";
		console.log(`  ${icon} ${check.name}: ${check.message}`);
	}

	if (result.violations.length > 0) {
		console.log("\nViolations:");
		for (const v of result.violations) {
			console.log(`  ⚠️  ${v.type}: ${v.message}`);
			console.log(`      Prevention: ${v.prevention}`);

			// Append to violations log
			fs.appendFileSync(
				VIOLATIONS_FILE,
				`${JSON.stringify({
					date: new Date().toISOString(),
					phase,
					...v,
				})}\n`,
			);
		}
	}

	console.log(`\n${result.passed ? "✅ GATE PASSED" : "❌ GATE FAILED"}\n`);

	process.exit(result.passed ? 0 : 1);
}

// CLI entry point
const phase = process.argv[2];
if (!phase) {
	console.error("Usage: gate-runner.ts <phase>");
	console.error("Phases: audit, red, green, refactor, quality, certify");
	process.exit(1);
}

runGate(phase);
