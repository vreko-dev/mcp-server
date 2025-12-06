#!/usr/bin/env node

/**
 * Publish OSS Packages to npm
 *
 * This script:
 * 1. Validates no IP leaks in publishConfig.exports
 * 2. Builds all @snapback/* packages (public exports only via publishConfig)
 * 3. Publishes each package to npm registry using conditional exports
 * 4. Generates legitimate npm download stats through CI/CD dogfooding
 *
 * Usage:
 *   node scripts/publish-oss-packages.mjs
 *   DRY_RUN=1 node scripts/publish-oss-packages.mjs  # Preview without publishing
 *
 * Note: Requires npm token in $NPM_TOKEN or ~/.npmrc
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRY_RUN = process.env.DRY_RUN === "1";
const PACKAGES_DIR = path.join(ROOT, "packages");

// Packages that support npm publishing with conditional exports
const OSS_PACKAGES = ["contracts", "infrastructure", "config", "events", "sdk"];

const log = {
	info: (msg) => console.log(`ℹ️  ${msg}`),
	success: (msg) => console.log(`✅ ${msg}`),
	error: (msg) => console.error(`❌ ${msg}`),
	debug: (msg) => process.env.DEBUG && console.log(`🔍 ${msg}`),
};

/**
 * Publish a single package to npm using publishConfig.exports
 */
async function publishPackage(packageName) {
	const packageDir = path.join(PACKAGES_DIR, packageName);
	const packageJsonPath = path.join(packageDir, "package.json");
	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
	const { name, version } = packageJson;

	log.info(`Publishing ${name}@${version}...`);

	try {
		const cmd = DRY_RUN ? `cd "${packageDir}" && npm publish --dry-run` : `cd "${packageDir}" && npm publish`;

		execSync(cmd, { stdio: "inherit" });
		log.success(`Published ${name}@${version}`);
		return true;
	} catch (error) {
		log.error(`Failed to publish ${name}: ${error.message}`);
		return false;
	}
}

/**
 * Validate packages for IP leaks before publishing
 */
async function validatePublish() {
	log.info("Validating packages for IP leaks...");
	try {
		execSync("node scripts/validate-publish-no-ip-leak.mjs", {
			stdio: "inherit",
			cwd: ROOT,
		});
		log.success("Validation passed");
		return true;
	} catch (error) {
		log.error(`Validation failed: ${error.message}`);
		return false;
	}
}

/**
 * Build all packages (uses publishConfig.exports during npm publish)
 */
async function buildPackages() {
	log.info("Building @snapback/* packages for npm publication...");
	try {
		// Build only public packages
		const filterStr = OSS_PACKAGES.map((pkg) => `@snapback/${pkg}`).join(" --filter=");
		execSync(`pnpm turbo build --filter=${filterStr}`, {
			stdio: "inherit",
			cwd: ROOT,
		});
		log.success("Build completed");
		return true;
	} catch (error) {
		log.error(`Build failed: ${error.message}`);
		return false;
	}
}

/**
 * Main publish workflow
 */
async function main() {
	log.info("🚀 SnapBack npm Package Publishing");
	log.info(`Mode: ${DRY_RUN ? "DRY RUN" : "PUBLISH"}`);
	log.info("");

	// Step 0: Validate for IP leaks
	if (!(await validatePublish())) {
		process.exit(1);
	}

	log.info("");

	// Step 1: Build
	if (!(await buildPackages())) {
		process.exit(1);
	}

	log.info("");
	log.info("Publishing packages in dependency order...");
	log.info("Order: contracts → infrastructure → config,events → sdk");
	log.info("");

	const publishOrder = [
		"contracts", // Base types (public: events/core, session, id-generator)
		"infrastructure", // Depends on contracts (public: logging, tracing, metrics)
		"config", // Independent (public: defaults, base-url)
		"events", // Independent (all public)
		"sdk", // Depends on contracts + infrastructure (public: storage, session)
	];

	const results = [];

	for (const pkg of publishOrder) {
		const success = await publishPackage(pkg);
		results.push({ package: pkg, success });
		log.debug(`${pkg}: ${success ? "OK" : "FAILED"}`);
	}

	// Summary
	log.info("");
	log.info("📊 Publication Summary");
	const successCount = results.filter((r) => r.success).length;
	const totalCount = results.length;

	for (const { package: pkg, success } of results) {
		const status = success ? "✅" : "❌";
		log.info(`${status} @snapback/${pkg}`);
	}

	log.info("");
	if (successCount === totalCount) {
		log.success(`All ${totalCount} packages published successfully!`);
		log.info("📝 Published via publishConfig.exports (IP-safe)");
		process.exit(0);
	} else {
		log.error(`${successCount}/${totalCount} packages published`);
		process.exit(1);
	}
}

main().catch((error) => {
	log.error(`Fatal error: ${error.message}`);
	process.exit(1);
});
