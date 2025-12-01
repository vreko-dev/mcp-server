// Patch the generated index.d.ts to include posthog exports that tsup misses
const fs = require("node:fs");
const path = require("node:path");

const dtsPath = path.join(__dirname, "../dist/index.d.ts");
let content = fs.readFileSync(dtsPath, "utf8");

// Find the main export statement
const exportRegex = /(export \{ type AnalyticsClient[^}]+\};)/;
const match = content.match(exportRegex);

if (match) {
	// Add posthog exports to the export statement
	const originalExport = match[1];
	const enhancedExport = originalExport.replace(
		"resetMetrics }",
		"resetMetrics, type AlertConfig, type AlertNotification, createAlert, deleteAlert, getAlerts, toggleAlert, KEY_METRIC_ALERTS, type CohortConfig, type Cohort, createCohort, deleteCohort, getCohort, getCohortMembers, getCohorts, updateCohort, CORRELATION_COHORTS, RETENTION_COHORTS, type CorrelationAnalysisConfig, type CorrelationResult, type CorrelationAnalysis, getCorrelationAnalysis, performCorrelationAnalysis, CORRELATION_ANALYSES }",
	);

	content = content.replace(originalExport, enhancedExport);

	fs.writeFileSync(dtsPath, content, "utf8");
	console.log("✅ Patched index.d.ts with posthog exports");
} else {
	console.error("❌ Could not find export statement to patch");
	process.exit(1);
}
