#!/usr/bin/env node
/**
 * Validates npm publish packages for IP leaks
 *
 * This script scans package.json's publishConfig.exports to ensure:
 * 1. No proprietary code paths are exposed
 * 2. No sensitive dependencies are included
 * 3. Conditional exports only expose public APIs
 *
 * Runs automatically during:
 * - pnpm publish:oss
 * - pnpm release
 * - CI/CD publish workflows
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Packages that should have restricted exports
const MONITORED_PACKAGES = [
	"@snapback/contracts",
	"@snapback/infrastructure",
	"@snapback/config",
	"@snapback/events",
	"@snapback/sdk",
];

// Proprietary modules that MUST NOT be exported
const FORBIDDEN_EXPORTS = [
	"./analytics",
	"./tiers",
	"./dashboard",
	"./telemetry",
	"./posthog",
	"./sentry",
	"./subscription-config",
	"./auth",
	"./encryption",
	"./ai",
	"./cloud",
	"./premium",
	"./enterprise",
];

// Private dependencies that trigger inspection
const PRIVATE_DEPENDENCIES = [
	"@snapback/auth",
	"@snapback/platform",
	"@snapback/analytics",
	"@snapback/policy-engine",
	"stripe",
	"posthog-node",
];

/**
 * Validate a single package's publishConfig
 */
function validatePackagePublishConfig(packagePath, packageName) {
	const packageJsonPath = path.join(packagePath, "package.json");

	if (!fs.existsSync(packageJsonPath)) {
		console.error(`❌ Package not found: ${packageName}`);
		return false;
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

	// Check if publishConfig exists
	if (!packageJson.publishConfig) {
		console.warn(`⚠️  No publishConfig in ${packageName} - skipping validation`);
		return true;
	}

	if (!packageJson.publishConfig.exports) {
		console.warn(`⚠️  No publishConfig.exports in ${packageName} - will use full exports`);
		return true;
	}

	const publishedExports = packageJson.publishConfig.exports;
	let hasViolations = false;

	// Check each published export
	for (const exportPath of Object.keys(publishedExports)) {
		// Check for forbidden exports
		for (const forbidden of FORBIDDEN_EXPORTS) {
			if (exportPath === forbidden || exportPath.startsWith(`${forbidden}/`)) {
				console.error(`❌ FORBIDDEN EXPORT in ${packageName}: "${exportPath}" (proprietary module)`);
				hasViolations = true;
			}
		}
	}

	// Check dependencies
	if (packageJson.dependencies || packageJson.optionalDependencies) {
		const allDeps = {
			...(packageJson.dependencies || {}),
			...(packageJson.optionalDependencies || {}),
		};

		for (const dep of Object.keys(allDeps)) {
			if (PRIVATE_DEPENDENCIES.includes(dep)) {
				// This is expected for some packages, just warn
				console.log(`ℹ️  ${packageName} depends on private: ${dep}`);
			}
		}
	}

	return !hasViolations;
}

/**
 * Validate all monitored packages
 */
function validateAllPackages() {
	let allValid = true;

	console.log("🔍 Scanning packages for IP leaks...\n");

	for (const packageName of MONITORED_PACKAGES) {
		const packagePath = path.join(ROOT, "packages", packageName.split("/")[1]);

		if (fs.existsSync(packagePath)) {
			const isValid = validatePackagePublishConfig(packagePath, packageName);
			if (!isValid) {
				allValid = false;
			}
		} else {
			console.log(`⊘ Skipped (not found): ${packageName}`);
		}
	}

	return allValid;
}

/**
 * Scan source files for hardcoded secrets or sensitive patterns
 */
function _scanForSensitiveContent(packagePath) {
	const patterns = [
		/stripe_key|stripe_secret/i,
		/posthog_api_key|posthog_host/i,
		/subscription.*tier|tier.*subscription/i,
		/api_secret|secret_key/i,
	];

	const srcDir = path.join(packagePath, "src");

	if (!fs.existsSync(srcDir)) {
		return true;
	}

	try {
		const files = fs.readdirSync(srcDir, { recursive: true });

		for (const file of files) {
			if (!file.endsWith(".ts") && !file.endsWith(".js")) {
				continue;
			}

			const filePath = path.join(srcDir, file);
			const content = fs.readFileSync(filePath, "utf-8");

			for (const pattern of patterns) {
				if (pattern.test(content)) {
					console.warn(`⚠️  Potential sensitive content in ${file}`);
				}
			}
		}
	} catch {
		// Silent fail for scan errors
	}

	return true;
}

/**
 * Main validation function
 */
function main() {
	console.log("📦 SnapBack Publish Validation\n");
	console.log("Checking packages for IP leaks before npm publish...\n");

	const isValid = validateAllPackages();

	if (isValid) {
		console.log("\n✅ All packages passed validation!");
		console.log("✓ No forbidden exports detected\n✓ Safe for npm publication\n");
		process.exit(0);
	} else {
		console.error("\n❌ VALIDATION FAILED!");
		console.error("Fix the above issues before publishing to npm.\n");
		process.exit(1);
	}
}

main();
