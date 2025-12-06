#!/usr/bin/env node

/**
 * Publish OSS Packages to npm
 *
 * This script:
 * 1. Builds all @snapback-oss/* packages
 * 2. Publishes each package to npm registry
 * 3. Generates legitimate npm download stats through CI/CD dogfooding
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
const PACKAGES_OSS_DIR = path.join(ROOT, "packages-oss");

const _OSS_PACKAGES = ["contracts", "infrastructure", "config", "events", "sdk"];

const log = {
	info: (msg) => console.log(`ℹ️  ${msg}`),
	success: (msg) => console.log(`✅ ${msg}`),
	error: (msg) => console.error(`❌ ${msg}`),
	debug: (msg) => process.env.DEBUG && console.log(`🔍 ${msg}`),
};

/**
 * Publish a single OSS package to npm
 */
async function publishPackage(packageName) {
	const packageDir = path.join(PACKAGES_OSS_DIR, packageName);
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
 * Build all OSS packages
 */
async function buildPackages() {
	log.info("Building all @snapback-oss/* packages...");
	try {
		execSync("pnpm turbo build --filter='./packages-oss/*'", {
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
	log.info("🚀 SnapBack OSS Package Publishing");
	log.info(`Mode: ${DRY_RUN ? "DRY RUN" : "PUBLISH"}`);
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
		"contracts", // Base types
		"infrastructure", // Depends on contracts
		"config", // Independent
		"events", // Independent
		"sdk", // Depends on contracts + infrastructure
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
		log.info(`${status} @snapback-oss/${pkg}`);
	}

	log.info("");
	if (successCount === totalCount) {
		log.success(`All ${totalCount} packages published successfully!`);
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
