#!/usr/bin/env node

/**
 * Script to help identify and cleanup unused dependencies in the web application
 *
 * This script uses depcheck to analyze the project and provides recommendations
 * for removing unused dependencies and adding missing ones.
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// Change to the web app directory
const webAppDir = join(process.cwd(), "apps", "web");

console.log("🔍 Analyzing dependencies in the web application...\n");

try {
	// Run depcheck
	const depcheckOutput = execSync("npx depcheck", {
		cwd: webAppDir,
		encoding: "utf8",
		stdio: "pipe",
	});

	console.log("✅ Dependency analysis complete!\n");
	console.log("=== DEPCHECK RESULTS ===\n");
	console.log(depcheckOutput);

	// Parse the output to extract unused and missing dependencies
	const lines = depcheckOutput.split("\n");
	const unusedDeps = [];
	const unusedDevDeps = [];
	const missingDeps = [];

	let currentSection = null;

	for (const line of lines) {
		if (line.includes("Unused dependencies")) {
			currentSection = "unused";
		} else if (line.includes("Unused devDependencies")) {
			currentSection = "unusedDev";
		} else if (line.includes("Missing dependencies")) {
			currentSection = "missing";
		} else if (line.trim() === "" || line.includes("depcheck")) {
			currentSection = null;
		} else if (currentSection && line.startsWith("* ")) {
			const dep = line.substring(2).trim();
			switch (currentSection) {
				case "unused":
					unusedDeps.push(dep);
					break;
				case "unusedDev":
					unusedDevDeps.push(dep);
					break;
				case "missing":
					missingDeps.push(dep);
					break;
			}
		}
	}

	// Generate report
	const report = `
# Dependency Cleanup Report

## Unused Production Dependencies
${unusedDeps.map((dep) => `- ${dep}`).join("\n") || "None found"}

## Unused Dev Dependencies
${unusedDevDeps.map((dep) => `- ${dep}`).join("\n") || "None found"}

## Missing Dependencies
${missingDeps.map((dep) => `- ${dep}`).join("\n") || "None found"}

## Recommendations

1. Remove unused dependencies to reduce bundle size and improve security
2. Install missing dependencies to fix runtime errors
3. Run this script regularly to maintain clean dependencies

## Commands to Run

### Remove Unused Dependencies
${unusedDeps.map((dep) => `pnpm remove ${dep}`).join("\n")}
${unusedDevDeps.map((dep) => `pnpm remove -D ${dep}`).join("\n")}

### Install Missing Dependencies
${missingDeps.map((dep) => `pnpm add ${dep}`).join("\n")}

> Note: Review each dependency before removing to ensure it's truly unused.
`;

	// Write report to file
	const reportPath = join(process.cwd(), "DEPCHECK_REPORT.md");
	writeFileSync(reportPath, report);
	console.log(`\n📝 Detailed report saved to: ${reportPath}`);

	// Provide summary
	console.log("\n📊 SUMMARY:");
	console.log(`  Unused Production Dependencies: ${unusedDeps.length}`);
	console.log(`  Unused Dev Dependencies: ${unusedDevDeps.length}`);
	console.log(`  Missing Dependencies: ${missingDeps.length}`);

	if (unusedDeps.length > 0 || unusedDevDeps.length > 0) {
		console.log("\n💡 RECOMMENDATION:");
		console.log("  Consider removing unused dependencies to reduce bundle size and improve security.");
		console.log("  Run the commands listed in the report to remove them.");
	}

	if (missingDeps.length > 0) {
		console.log("\n⚠️  WARNING:");
		console.log("  Missing dependencies detected. Install them to prevent runtime errors.");
		console.log("  Run the commands listed in the report to install them.");
	}
} catch (error) {
	if (error.message.includes("depcheck")) {
		console.error("❌ depcheck is not installed. Installing it now...\n");
		try {
			execSync("pnpm add -D depcheck", {
				cwd: webAppDir,
				stdio: "inherit",
			});
			console.log("✅ depcheck installed successfully. Please run this script again.");
		} catch (installError) {
			console.error("❌ Failed to install depcheck:", installError.message);
		}
	} else {
		console.error("❌ Error running depcheck:", error.message);
	}
}
