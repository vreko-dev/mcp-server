// Patch the generated index.d.ts to include posthog exports that tsup misses
const fs = require("node:fs");
const path = require("node:path");

const dtsPath = path.join(__dirname, "../dist/index.d.ts");
let content = fs.readFileSync(dtsPath, "utf8");

// Find exports more reliably by scanning all export statements
const exportStatementRegex = /export\s+\{\s*type\s+AnalyticsClient[^}]+\};/;
const exportKeywordRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
const exportDefaultRegex = /export\s+default\s+/;

const match = content.match(exportStatementRegex);

if (match) {
	// Collect existing exports
	const exports = [];
	let exportMatch;
	while ((exportMatch = exportKeywordRegex.exec(content)) !== null) {
		exports.push(exportMatch[1]);
	}
	if (exportDefaultRegex.test(content)) {
		exports.push("default");
	}

	// Add posthog exports to the export statement
	const originalExport = match[0];
	const posthogExports =
		"type AlertConfig, type AlertNotification, createAlert, deleteAlert, getAlerts, toggleAlert, KEY_METRIC_ALERTS, type CohortConfig, type Cohort, createCohort, deleteCohort, getCohort, getCohortMembers, getCohorts, updateCohort, CORRELATION_COHORTS, RETENTION_COHORTS, type CorrelationAnalysisConfig, type CorrelationResult, type CorrelationAnalysis, getCorrelationAnalysis, performCorrelationAnalysis, CORRELATION_ANALYSES";

	// Find the closing brace and insert before it
	const enhancedExport = originalExport.replace(/\s*\};$/, `, ${posthogExports} };`);

	content = content.replace(originalExport, enhancedExport);

	fs.writeFileSync(dtsPath, content, "utf8");
	console.log("✅ Patched index.d.ts with posthog exports");
} else {
	console.error("❌ Could not find export statement to patch");
	process.exit(1);
}
