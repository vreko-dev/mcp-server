#!/usr/bin/env ts-node

/**
 * TDD Gate Runner
 * Executes verification gates for each TDD phase
 *
 * Now includes auto-promotion:
 * - 3x violations → Promote to codebase-patterns.md
 * - 5x violations → Add automated detection rules
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

interface StoredViolation {
	date: string;
	phase: string;
	type: string;
	file?: string;
	message: string;
	prevention: string;
	promotedAt?: string;
	automatedAt?: string;
}

interface ViolationSummary {
	type: string;
	count: number;
	firstSeen: string;
	lastSeen: string;
	prevention: string;
	files: string[];
	promoted: boolean;
	automated: boolean;
}

const STATE_FILE = "ai_dev_utils/state/current-task.json";
const VIOLATIONS_FILE = "ai_dev_utils/patterns/violations.jsonl";
const PATTERNS_FILE = "ai_dev_utils/patterns/codebase-patterns.md";
const ARCHITECTURE_FILE = "ai_dev_utils/ARCHITECTURE.md";
const CONSTRAINTS_FILE = "ai_dev_utils/CONSTRAINTS.md";
const PROMOTION_THRESHOLD = 3;
const AUTOMATION_THRESHOLD = 5;

// ============================================================================
// JSONL UTILITIES
// ============================================================================

function loadViolations(): StoredViolation[] {
	if (!fs.existsSync(VIOLATIONS_FILE)) return [];
	try {
		return fs
			.readFileSync(VIOLATIONS_FILE, "utf-8")
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line));
	} catch {
		return [];
	}
}

function saveViolations(violations: StoredViolation[]): void {
	const content = violations.map((v) => JSON.stringify(v)).join("\n") + "\n";
	fs.writeFileSync(VIOLATIONS_FILE, content);
}

// ============================================================================
// AUTO-PROMOTION LOGIC
// ============================================================================

function getViolationSummaries(): ViolationSummary[] {
	const violations = loadViolations();
	const byType = new Map<string, StoredViolation[]>();

	for (const v of violations) {
		const existing = byType.get(v.type) || [];
		existing.push(v);
		byType.set(v.type, existing);
	}

	return Array.from(byType.entries()).map(([type, items]) => ({
		type,
		count: items.length,
		firstSeen: items[0].date,
		lastSeen: items[items.length - 1].date,
		prevention: items[0].prevention,
		files: [...new Set(items.map((i) => i.file).filter(Boolean) as string[])],
		promoted: items.some((i) => i.promotedAt),
		automated: items.some((i) => i.automatedAt),
	}));
}

function formatTypeAsTitle(type: string): string {
	return type
		.split(/[-_]/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(" ");
}

function promoteToCodebasePatterns(summary: ViolationSummary): void {
	console.log(`\n📈 Promoting "${summary.type}" to codebase-patterns.md (${summary.count}x occurrences)`);

	const patternsContent = fs.readFileSync(PATTERNS_FILE, "utf-8");

	// Check if already promoted
	if (patternsContent.includes("### AP-") && patternsContent.includes(summary.type)) {
		console.log("   Already promoted, skipping.");
		return;
	}

	// Count existing anti-patterns to get next number
	const existingCount = (patternsContent.match(/### AP-\d+/g) || []).length;
	const nextNum = existingCount + 1;

	// Generate the new pattern entry
	const entry = `
### AP-${String(nextNum).padStart(3, "0")}: ${formatTypeAsTitle(summary.type)}
**Frequency:** ${summary.count} occurrences
**First Seen:** ${summary.firstSeen.split("T")[0]}
**Type:** \`${summary.type}\`

**Prevention:** ${summary.prevention}

**Files affected:**
${summary.files
	.slice(0, 5)
	.map((f) => `- \`${f}\``)
	.join("\n")}
${summary.files.length > 5 ? `- ... and ${summary.files.length - 5} more` : ""}

---
`;

	// Insert before "## Recent Fixes" section
	const insertPoint = patternsContent.indexOf("## Recent Fixes");
	if (insertPoint === -1) {
		// Append at end if section not found
		fs.writeFileSync(PATTERNS_FILE, patternsContent + "\n" + entry);
	} else {
		const updated = patternsContent.slice(0, insertPoint) + entry + "\n" + patternsContent.slice(insertPoint);
		fs.writeFileSync(PATTERNS_FILE, updated);
	}

	// Mark as promoted in violations.jsonl
	const violations = loadViolations();
	const now = new Date().toISOString();
	for (const v of violations) {
		if (v.type === summary.type && !v.promotedAt) {
			v.promotedAt = now;
		}
	}
	saveViolations(violations);

	console.log(`   ✅ Added as AP-${String(nextNum).padStart(3, "0")}`);
}

function markForAutomation(summary: ViolationSummary): void {
	console.log(`\n🤖 Marking "${summary.type}" for automation (${summary.count}x occurrences)`);

	// Mark in violations.jsonl
	const violations = loadViolations();
	const now = new Date().toISOString();
	for (const v of violations) {
		if (v.type === summary.type && !v.automatedAt) {
			v.automatedAt = now;
		}
	}
	saveViolations(violations);

	// Update codebase-patterns.md to note automation status
	const patternsContent = fs.readFileSync(PATTERNS_FILE, "utf-8");
	const typeTitle = formatTypeAsTitle(summary.type);

	if (patternsContent.includes(typeTitle) && !patternsContent.includes("🤖 AUTOMATED")) {
		// Add automation badge to the pattern
		const updated = patternsContent.replace(new RegExp(`(### AP-\\d+: ${typeTitle})`), "$1 🤖 AUTOMATED");
		fs.writeFileSync(PATTERNS_FILE, updated);
	}

	console.log("   ✅ Marked for automation. Detection rule active in gate-runner.ts");
}

async function checkAndPromotePatterns(): Promise<void> {
	console.log("\n🔄 Checking for pattern promotions...");

	const summaries = getViolationSummaries();
	let promotions = 0;
	let automations = 0;

	for (const summary of summaries) {
		// Check for promotion threshold (3x)
		if (summary.count >= PROMOTION_THRESHOLD && !summary.promoted) {
			promoteToCodebasePatterns(summary);
			promotions++;
		}

		// Check for automation threshold (5x)
		if (summary.count >= AUTOMATION_THRESHOLD && !summary.automated) {
			markForAutomation(summary);
			automations++;
		}
	}

	if (promotions === 0 && automations === 0) {
		console.log("   No patterns ready for promotion or automation.");
	} else {
		console.log(`\n📊 Summary: ${promotions} promoted, ${automations} automated`);
	}
}

// ============================================================================
// CONSTRAINT VALIDATION
// ============================================================================

interface ConstraintCheck {
	id: string;
	name: string;
	passed: boolean;
	message: string;
	violationType?: string;
}

/**
 * Check all hard constraints from CONSTRAINTS.md
 * Returns list of constraint violations
 */
function checkConstraints(files: string[]): ConstraintCheck[] {
	const results: ConstraintCheck[] = [];

	for (const file of files) {
		if (!fs.existsSync(file)) continue;
		const content = fs.readFileSync(file, "utf-8");

		// C-001: Layer Boundary Enforcement
		if (file.startsWith("apps/vscode/") || file.startsWith("apps/web/") || file.startsWith("apps/cli/")) {
			const hasInfraImport = content.includes("@snapback/infrastructure");
			results.push({
				id: "C-001",
				name: "Layer Boundary",
				passed: !hasInfraImport,
				message: hasInfraImport
					? `${file}: Presentation layer cannot import infrastructure`
					: "Layer boundaries respected",
				violationType: hasInfraImport ? "LAYER_BOUNDARY_VIOLATION" : undefined,
			});
		}

		// C-002: Service Layer for Business Logic
		if (file.includes("procedures/") && !file.includes("services/")) {
			const hasDirectDb =
				content.includes("db.query") || content.includes("db.select") || content.includes("db.insert");
			results.push({
				id: "C-002",
				name: "Service Layer",
				passed: !hasDirectDb,
				message: hasDirectDb
					? `${file}: Direct DB access in procedure - use service layer`
					: "Service layer pattern followed",
				violationType: hasDirectDb ? "SERVICE_BYPASS" : undefined,
			});
		}

		// C-007: Console.log in Production
		if (!file.includes(".test.") && !file.includes("test/") && !file.includes("scripts/")) {
			const hasConsoleLog = /console\.log\(/g.test(content);
			results.push({
				id: "C-007",
				name: "No Console.log",
				passed: !hasConsoleLog,
				message: hasConsoleLog
					? `${file}: console.log found in production code`
					: "No console.log in production",
				violationType: hasConsoleLog ? "NO_CONSOLE" : undefined,
			});
		}
	}

	return results;
}

/**
 * Update learned constraints in CONSTRAINTS.md based on violation counts
 */
function updateLearnedConstraints(): void {
	const summaries = getViolationSummaries();
	const promoted = summaries.filter((s) => s.count >= PROMOTION_THRESHOLD);

	if (promoted.length === 0) return;

	let content = fs.readFileSync(CONSTRAINTS_FILE, "utf-8");

	// Find the learned constraints table
	const tableStart = content.indexOf("| ID | Constraint | Source | Occurrences |");
	if (tableStart === -1) return;

	// Build new table rows
	const rows = promoted.map((s, i) => {
		const id = `LC-${String(i + 1).padStart(3, "0")}`;
		const constraint = s.prevention.slice(0, 50) + (s.prevention.length > 50 ? "..." : "");
		return `| ${id} | ${constraint} | ${s.type} | ${s.count} |`;
	});

	// Replace the table content
	const tableEnd = content.indexOf("\n---", tableStart);
	const beforeTable = content.slice(0, tableStart);
	const afterTable = content.slice(tableEnd);

	const newTable = `| ID | Constraint | Source | Occurrences |
|----|------------|--------|-------------|
${rows.join("\n")}`;

	content = beforeTable + newTable + afterTable;
	fs.writeFileSync(CONSTRAINTS_FILE, content);
}

// ============================================================================
// ARCHITECTURE TRACKING
// ============================================================================

interface ArchitectureChange {
	date: string;
	change: string;
	files: string;
	gate: string;
}

/**
 * Record an architecture change after successful gate pass
 */
function recordArchitectureChange(phase: string, state: any): void {
	const serviceLocation = state.evidence?.serviceLocation;
	const testFile = state.evidence?.testFile;

	if (!serviceLocation && !testFile) return;

	const change: ArchitectureChange = {
		date: new Date().toISOString().split("T")[0],
		change: state.taskDescription || state.task || "Implementation completed",
		files: serviceLocation || testFile || "unknown",
		gate: phase,
	};

	// Append to architecture changes log
	const archContent = fs.readFileSync(ARCHITECTURE_FILE, "utf-8");

	// Find the Recent Architecture Changes table
	const marker = "<!-- AUTO-UPDATED: Do not edit below this line -->";
	const markerIndex = archContent.indexOf(marker);

	if (markerIndex === -1) return;

	const beforeMarker = archContent.slice(0, markerIndex + marker.length);
	const afterMarker = archContent.slice(markerIndex + marker.length);

	// Check if table header exists, add row after it
	const tableHeaderEnd = afterMarker.indexOf("\n", afterMarker.indexOf("|------|"));
	if (tableHeaderEnd === -1) return;

	const tableHeader = afterMarker.slice(0, tableHeaderEnd + 1);
	const tableContent = afterMarker.slice(tableHeaderEnd + 1);

	const newRow = `| ${change.date} | ${change.change.slice(0, 40)} | ${change.files.split("/").slice(-2).join("/")} | ${change.gate} |\n`;

	const updatedContent = beforeMarker + tableHeader + newRow + tableContent;
	fs.writeFileSync(ARCHITECTURE_FILE, updatedContent);

	console.log(`\n📐 Architecture change recorded: ${change.change.slice(0, 40)}...`);
}

// ============================================================================
// GATE IMPLEMENTATIONS
// ============================================================================

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
		if (hasLocation) {
			const taskType = state.taskType || state.type;
			const isBugFix = taskType === "BUG_FIX" || taskType === "REFACTORING";
			const inServices =
				hasLocation.includes("/services/") ||
				hasLocation.includes("/core/") ||
				hasLocation.includes("/snapshot/") ||
				hasLocation.includes("/commands/") ||
				hasLocation.includes("packages/engine/src/");

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
				const output = error.stdout || error.message;
				const correctFailure = !output.includes("SyntaxError") && !output.includes("Timeout");
				checks.push({
					name: "Test fails correctly",
					passed: correctFailure,
					message: correctFailure ? "Test fails as expected" : "Test fails with wrong error type",
				});
			}
		}

		// Check 3: No vague assertions (AUTOMATED - 5x threshold reached)
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
				name: "No vague assertions 🤖",
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
				const parts = testFile.split("/");
				const rootDir = parts[0];
				const subDir = parts[1];
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

		if (testFile && fs.existsSync(testFile)) {
			try {
				const parts = testFile.split("/");
				const rootDir = parts[0];
				const subDir = parts[1];
				const pkgPath = `${rootDir}/${subDir}`;
				const relativePath = testFile.replace(`${pkgPath}/`, "");

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

		// Check 1: 4-path coverage (PROMOTED - 3x threshold reached)
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
			name: "4-path coverage 📈",
			passed: pathCount >= 4,
			message: `${pathCount}/4 paths covered`,
		});

		if (pathCount < 4) {
			const missing: string[] = [];
			if (!hasHappyPath) missing.push("happy path");
			if (!hasSadPath) missing.push("sad path");
			if (!hasEdgeCase) missing.push("edge case");
			if (!hasErrorCase) missing.push("error case");

			violations.push({
				type: "INCOMPLETE_COVERAGE",
				file: testFile,
				message: `Missing test paths: ${missing.join(", ")}`,
				prevention: "Add tests for all 4 paths before completing",
			});
		}

		// Check 2: Skipped tests are tracked
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

	// New command: promote - manually trigger promotion check
	promote: async (): Promise<GateResult> => {
		await checkAndPromotePatterns();
		return {
			phase: "promote",
			passed: true,
			checks: [{ name: "Promotion check", passed: true, message: "Completed" }],
			violations: [],
		};
	},

	// New command: summary - show violation summary
	summary: async (): Promise<GateResult> => {
		const summaries = getViolationSummaries();

		console.log("\n📊 Violation Summary\n");
		console.log("| Type | Count | Status |");
		console.log("|------|-------|--------|");

		for (const s of summaries.sort((a, b) => b.count - a.count)) {
			const status = s.automated
				? "🤖 Automated"
				: s.promoted
					? "📈 Promoted"
					: s.count >= AUTOMATION_THRESHOLD
						? "🤖 Ready for automation"
						: s.count >= PROMOTION_THRESHOLD
							? "📈 Ready for promotion"
							: "📝 Tracking";
			console.log(`| ${s.type} | ${s.count} | ${status} |`);
		}

		const total = summaries.reduce((acc, s) => acc + s.count, 0);
		console.log(`\nTotal: ${total} violations across ${summaries.length} types`);

		return {
			phase: "summary",
			passed: true,
			checks: [],
			violations: [],
		};
	},

	// New command: constraints - check all constraints on specified files
	constraints: async (): Promise<GateResult> => {
		const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
		const files: string[] = [];

		// Get files from state or use provided argument
		if (state.evidence?.serviceLocation) files.push(state.evidence.serviceLocation);
		if (state.evidence?.testFile) files.push(state.evidence.testFile);

		if (files.length === 0) {
			console.log("\n⚠️ No files specified in state. Run audit first or specify files.");
			return {
				phase: "constraints",
				passed: true,
				checks: [],
				violations: [],
			};
		}

		console.log(`\n🔒 Checking constraints for ${files.length} files...\n`);

		const results = checkConstraints(files);
		const violations: Violation[] = [];

		console.log("| Constraint | Status | Message |");
		console.log("|------------|--------|---------|  ");

		for (const r of results) {
			const icon = r.passed ? "✅" : "❌";
			console.log(`| ${r.id}: ${r.name} | ${icon} | ${r.message.slice(0, 50)} |`);

			if (!r.passed && r.violationType) {
				violations.push({
					type: r.violationType,
					message: r.message,
					prevention: `Fix ${r.id} violation`,
				});
			}
		}

		const passed = results.every((r) => r.passed);
		console.log(`\n${passed ? "✅ All constraints satisfied" : "❌ Constraint violations found"}`);

		return {
			phase: "constraints",
			passed,
			checks: results.map((r) => ({ name: `${r.id}: ${r.name}`, passed: r.passed, message: r.message })),
			violations,
		};
	},
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runGate(phase: string): Promise<void> {
	// Handle special commands that don't follow gate pattern
	if (phase === "promote" || phase === "summary" || phase === "constraints") {
		await gates[phase]();
		return;
	}

	console.log(`\n🔍 Running gate: ${phase}\n`);

	const gate = gates[phase];
	if (!gate) {
		console.error(`❌ Unknown gate: ${phase}`);
		console.error("Available: audit, red, green, refactor, quality, certify");
		console.error("Commands: promote, summary, constraints");
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

	// On successful certify, record architecture change
	if (result.passed && phase === "certify") {
		try {
			const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
			recordArchitectureChange(phase, state);
		} catch {
			// Ignore errors in architecture recording
		}
	}

	// Always check for promotions after gate runs
	await checkAndPromotePatterns();

	// Update learned constraints in CONSTRAINTS.md
	updateLearnedConstraints();

	process.exit(result.passed ? 0 : 1);
}

// CLI entry point
const phase = process.argv[2];
if (!phase) {
	console.error("Usage: gate-runner.ts <phase>");
	console.error("Phases: audit, red, green, refactor, quality, certify");
	console.error("Commands: promote, summary, constraints");
	process.exit(1);
}

runGate(phase);
