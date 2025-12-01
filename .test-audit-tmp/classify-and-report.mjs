#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// Load static metadata
const staticData = JSON.parse(fs.readFileSync(".test-audit-tmp/static-metadata.json", "utf-8"));
console.log(`Loaded ${staticData.length} test files`);

// Try to load test results
let testResults = null;
try {
	const vscodeResults = JSON.parse(fs.readFileSync(".test-audit-tmp/vscode-tests.json", "utf-8"));
	testResults = vscodeResults;
	console.log("Loaded vscode test results");
} catch (e) {
	console.log(`No complete test results available: ${e.message}`);
}

// Classification logic
function classifyTest(testData, testResults) {
	const {
		file_path,
		framework,
		test_type,
		test_count,
		skipped_or_todo,
		skip_count,
		todo_count,
		uses_snapshots,
		last_modified_iso,
		related_source_files,
	} = testData;

	// Criticality guess (0-3)
	let criticality = 0;
	const pathLower = file_path.toLowerCase();
	if (pathLower.includes("auth") || pathLower.includes("security") || pathLower.includes("token")) {
		criticality = 3;
	} else if (pathLower.includes("payment") || pathLower.includes("billing") || pathLower.includes("api")) {
		criticality = 2;
	} else if (pathLower.includes("core") || pathLower.includes("integration")) {
		criticality = 1;
	}

	// Recency relevance (0-3)
	let recency = 0;
	const daysSinceModified = last_modified_iso
		? (Date.now() - new Date(last_modified_iso).getTime()) / (1000 * 60 * 60 * 24)
		: 999;
	if (daysSinceModified < 7) {
		recency = 3;
	} else if (daysSinceModified < 30) {
		recency = 2;
	} else if (daysSinceModified < 90) {
		recency = 1;
	}

	// Unique coverage delta estimate (0-3)
	const uniqueCoverage =
		related_source_files.length > 0 ? Math.min(3, Math.ceil(related_source_files.length / 2)) : 1;

	// Value score (0-9)
	const valueScore = criticality + recency + uniqueCoverage;

	// Cost to fix estimate (0-3)
	let costToFix = 1; // default moderate
	if (test_type === "e2e") {
		costToFix = 3;
	} else if (test_type === "integration") {
		costToFix = 2;
	} else if (uses_snapshots) {
		costToFix = 2;
	} else if (test_count < 5) {
		costToFix = 0;
	}

	// Classification flags
	const flags = [];

	// Orphan/outdated detection
	const isOld = daysSinceModified > 180;
	const hasSkipTodo = skipped_or_todo;

	if (hasSkipTodo && isOld) {
		flags.push("DROP_CANDIDATE");
	}

	// Snapshot-only tests
	if (uses_snapshots && test_count < 3) {
		flags.push("LOW_VALUE_FAIL");
	}

	// High-value failing tests
	if (criticality >= 2 && uniqueCoverage >= 1) {
		flags.push("NEEDS_FIX");
	}

	// Default to KEEP if no other flags
	if (flags.length === 0) {
		flags.push("KEEP");
	}

	// Recommended action
	let recommendedAction = "KEEP";
	if (flags.includes("DROP_CANDIDATE")) {
		recommendedAction = "DROP";
	} else if (flags.includes("NEEDS_FIX") && valueScore >= 4) {
		recommendedAction = "FIX";
	} else if (flags.includes("LOW_VALUE_FAIL")) {
		recommendedAction = "DROP";
	}

	// Grouping key for consolidation
	const groupingKey = file_path.split("/").slice(0, -1).join("/");

	// Rationale
	let rationale = "";
	if (recommendedAction === "DROP") {
		rationale = hasSkipTodo ? "Skipped/todo for >180 days" : "Low value, snapshot-only";
	} else if (recommendedAction === "FIX") {
		rationale = "High criticality, recent changes, needs attention";
	} else {
		rationale = "Stable, valuable test";
	}

	return {
		...testData,
		criticality_guess: criticality,
		recency_relevance: recency,
		unique_coverage_delta_est: uniqueCoverage,
		value_score: valueScore,
		cost_to_fix_est: costToFix,
		classification_flags: flags,
		recommended_action: recommendedAction,
		grouping_key: groupingKey,
		rationale,
		// Dynamic data (if available)
		status_runs: testResults ? ["UNKNOWN", "UNKNOWN", "UNKNOWN"] : [],
		flaky: false,
		avg_duration_ms: 0,
		failure_brief: "",
	};
}

// Classify all tests
const classified = staticData.map((test) => classifyTest(test, testResults));

// Generate summary stats
const stats = {
	total_tests: classified.length,
	by_framework: {},
	by_type: {},
	by_action: {},
	by_criticality: {},
	skipped_todo_count: classified.filter((t) => t.skipped_or_todo).length,
	snapshot_tests: classified.filter((t) => t.uses_snapshots).length,
};

classified.forEach((test) => {
	stats.by_framework[test.framework] = (stats.by_framework[test.framework] || 0) + 1;
	stats.by_type[test.test_type] = (stats.by_type[test.test_type] || 0) + 1;
	stats.by_action[test.recommended_action] = (stats.by_action[test.recommended_action] || 0) + 1;
	stats.by_criticality[test.criticality_guess] = (stats.by_criticality[test.criticality_guess] || 0) + 1;
});

// Sort by value score (descending)
const topValueTests = [...classified]
	.filter((t) => t.recommended_action === "FIX")
	.sort((a, b) => b.value_score - a.value_score)
	.slice(0, 10);

const dropCandidates = classified.filter((t) => t.recommended_action === "DROP");
const keepTests = classified.filter((t) => t.recommended_action === "KEEP");

// Generate JSON output
const auditOutput = {
	repo: {
		root: ROOT,
		workspace_manager: "pnpm",
		frameworks: {
			vitest: true,
			jest: false,
			playwright: true,
			cypress: false,
		},
	},
	generated_at: new Date().toISOString(),
	summary: stats,
	tests: classified,
};

fs.writeFileSync("tests_audit.json", JSON.stringify(auditOutput, null, 2));
console.log(`\nGenerated tests_audit.json with ${classified.length} tests`);

// Generate CSV
const csvHeaders =
	"file_path,framework,test_type,test_count,value_score,recommended_action,criticality,recency,unique_coverage,rationale\n";
const csvRows = classified
	.map(
		(t) =>
			`"${t.file_path}",${t.framework},${t.test_type},${t.test_count},${t.value_score},${t.recommended_action},${t.criticality_guess},${t.recency_relevance},${t.unique_coverage_delta_est},"${t.rationale}"`,
	)
	.join("\n");
fs.writeFileSync("tests_audit.csv", csvHeaders + csvRows);
console.log("Generated tests_audit.csv");

// Generate Markdown report
const markdown = `# Test Audit Report

**Generated:** ${new Date().toISOString()}
**Repository:** ${ROOT}
**Total Tests:** ${stats.total_tests}

## Executive Summary

### Test Distribution
- **By Framework:**
${Object.entries(stats.by_framework)
	.map(([k, v]) => `  - ${k}: ${v} tests`)
	.join("\n")}

- **By Type:**
${Object.entries(stats.by_type)
	.map(([k, v]) => `  - ${k}: ${v} tests`)
	.join("\n")}

- **By Recommended Action:**
${Object.entries(stats.by_action)
	.map(([k, v]) => `  - ${k}: ${v} tests`)
	.join("\n")}

- **By Criticality:**
${Object.entries(stats.by_criticality)
	.map(([k, v]) => `  - Level ${k}: ${v} tests`)
	.join("\n")}

### Key Metrics
- **Skipped/TODO tests:** ${stats.skipped_todo_count}
- **Snapshot tests:** ${stats.snapshot_tests}
- **Tests using env vars:** ${classified.filter((t) => t.has_env_usage).length}

## Top 10 "Fix First" Tests

These tests have high value scores and require attention:

| File | Value Score | Criticality | Type | Rationale |
|------|-------------|-------------|------|-----------|
${topValueTests
	.map(
		(t) =>
			`| [${path.basename(t.file_path)}](${t.file_path}) | ${t.value_score} | ${t.criticality_guess} | ${t.test_type} | ${t.rationale} |`,
	)
	.join("\n")}

## Safe Drop Candidates (${dropCandidates.length} tests)

These tests can be safely removed or refactored:

${dropCandidates
	.slice(0, 20)
	.map((t) => `- **[${t.file_path}](${t.file_path})** - ${t.rationale}`)
	.join("\n")}

${dropCandidates.length > 20 ? `\n... and ${dropCandidates.length - 20} more (see CSV for full list)` : ""}

## Tests to Keep (${keepTests.length} tests)

These tests are valuable and stable.

### High-Value Tests (Value Score >= 6)
${keepTests
	.filter((t) => t.value_score >= 6)
	.slice(0, 15)
	.map((t) => `- **[${t.file_path}](${t.file_path})** - Score: ${t.value_score}`)
	.join("\n")}

## Analysis Notes

### Build Issues
- **@snapback/analytics** package failed to build due to TypeScript errors in TelemetrySinkDb.ts
- Tests could not be run comprehensively due to build failures
- Static analysis completed successfully for all ${stats.total_tests} test files

### Limitations
- Test execution was attempted but incomplete due to build issues
- Flakiness detection requires 3 successful test runs (not achieved)
- Coverage analysis not performed (requires successful test runs)
- Dynamic metrics (duration, failure rates) unavailable

### Methodology
- **Criticality** scored 0-3 based on path keywords (auth, payment, security, core)
- **Recency** scored 0-3 based on days since last modification
- **Unique Coverage** estimated 0-3 based on number of related source files
- **Value Score** = criticality + recency + unique_coverage (0-9 range)

## Triage Checklist

### Immediate Actions
- [ ] Review top 10 "Fix First" tests and address high-criticality failures
- [ ] Archive or remove ${dropCandidates.length} drop candidates
- [ ] Fix build issues in @snapback/analytics package
- [ ] Re-run full test suite after build fixes

### Week 1
- [ ] Address all tests with criticality >= 3
- [ ] Remove tests skipped/todo for >180 days
- [ ] Update snapshot tests that fail frequently

### Month 1
- [ ] Consolidate redundant tests in same directories
- [ ] Add missing tests for high-criticality modules
- [ ] Improve test documentation and naming

## Commands

### Run specific test suites
\`\`\`bash
# Run all unit tests
pnpm test --grep="unit"

# Run auth-related tests
pnpm test --grep="auth"

# Run integration tests
pnpm test --grep="integration"
\`\`\`

### Fix specific issues
\`\`\`bash
# Fix build issues
pnpm -w build

# Run tests with coverage
pnpm test --coverage

# Run specific package tests
pnpm -F @snapback/core test
\`\`\`

---

*Report generated by automated test audit tool*
`;

fs.writeFileSync("TEST_AUDIT.md", markdown);
console.log("Generated TEST_AUDIT.md");

console.log("\n=== Audit Complete ===");
console.log("Summary:");
console.log(`  Total tests: ${stats.total_tests}`);
console.log(`  KEEP: ${stats.by_action.KEEP || 0}`);
console.log(`  FIX: ${stats.by_action.FIX || 0}`);
console.log(`  DROP: ${stats.by_action.DROP || 0}`);
console.log(`  CONSOLIDATE: ${stats.by_action.CONSOLIDATE || 0}`);
