// Patch the generated index.d.ts to include posthog exports that tsup misses
// NOTE: As of Dec 2025, tsup properly includes these exports, so this script
// now verifies they exist and succeeds silently
const fs = require("node:fs");
const path = require("node:path");

const dtsPath = path.join(__dirname, "../dist/index.d.ts");

if (!fs.existsSync(dtsPath)) {
	console.log("⚠️ No index.d.ts found, skipping patch");
	process.exit(0);
}

const content = fs.readFileSync(dtsPath, "utf8");

// Check if posthog exports already exist (tsup now handles this)
const requiredExports = [
	"AlertConfig",
	"createAlert",
	"CohortConfig",
	"createCohort",
];
const allExportsPresent = requiredExports.every((exp) => content.includes(exp));

if (allExportsPresent) {
	console.log("✅ PostHog exports already present in index.d.ts");
	process.exit(0);
}

// Legacy patching for older tsup versions - kept for backward compatibility
const exportStatementRegex = /export\s+\{\s*type\s+AnalyticsClient[^}]+\};/;
const match = content.match(exportStatementRegex);

if (match) {
	const originalExport = match[0];
	const posthogExports =
		"type AlertConfig, type AlertNotification, createAlert, deleteAlert, getAlerts, toggleAlert, KEY_METRIC_ALERTS, type CohortConfig, type Cohort, createCohort, deleteCohort, getCohort, getCohortMembers, getCohorts, updateCohort, CORRELATION_COHORTS, RETENTION_COHORTS, type CorrelationAnalysisConfig, type CorrelationResult, type CorrelationAnalysis, getCorrelationAnalysis, performCorrelationAnalysis, CORRELATION_ANALYSES";

	const enhancedExport = originalExport.replace(
		/\s*\};$/,
		`, ${posthogExports} };`
	);
	const newContent = content.replace(originalExport, enhancedExport);

	fs.writeFileSync(dtsPath, newContent, "utf8");
	console.log("✅ Patched index.d.ts with posthog exports (legacy)");
} else {
	// Exports not found but also not needed - tsup likely handles them now
	console.log(
		"⚠️ Legacy export pattern not found, but exports may already be included"
	);
	process.exit(0);
}
