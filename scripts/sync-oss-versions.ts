#!/usr/bin/env tsx

/**
 * OSS Version Synchronization Script
 *
 * Keeps version numbers in sync between OSS packages (npm) and private packages (workspace).
 *
 * Strategy:
 * 1. Private packages (@snapback/*) depend on published OSS (@snapback-oss/*) from npm
 * 2. When OSS packages are published, update private packages to use latest npm versions
 * 3. Allow manual overrides via .version-overrides.json
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface PackageJson {
	name: string;
	version: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

interface VersionOverrides {
	[packageName: string]: string; // Package → version override
}

const OSS_TO_NPM_MAP = {
	"@snapback-oss/contracts": "@snapback/contracts",
	"@snapback-oss/infrastructure": "@snapback/infrastructure",
	"@snapback-oss/sdk": "@snapback/sdk",
	"@snapback-oss/events": "@snapback/events",
	"@snapback-oss/config": "@snapback/config",
} as const;

// Also check workspace:* references for private packages that should use npm
const PRIVATE_TO_NPM_MAP = {
	"@snapback/contracts": "@snapback/contracts",
	"@snapback/infrastructure": "@snapback/infrastructure",
	"@snapback/sdk": "@snapback/sdk",
	"@snapback/events": "@snapback/events",
	"@snapback/config": "@snapback/config",
} as const;

const PRIVATE_PACKAGES = [
	"packages/core",
	"packages/auth",
	"packages/platform",
	"packages/integrations",
	"packages/policy-engine",
	"apps/api",
	"apps/web",
	"apps/vscode",
];

const OVERRIDES_FILE = ".version-overrides.json";

function exec(cmd: string): string {
	return execSync(cmd, { encoding: "utf-8" }).trim();
}

function getLatestNpmVersion(packageName: string): string | null {
	try {
		const version = exec(`npm view ${packageName} version`);
		return version;
	} catch {
		return null;
	}
}

function loadOverrides(): VersionOverrides {
	if (!existsSync(OVERRIDES_FILE)) {
		return {};
	}
	try {
		return JSON.parse(readFileSync(OVERRIDES_FILE, "utf-8"));
	} catch {
		return {};
	}
}

function getTargetVersion(
	packageName: string,
	latestVersion: string | null,
	overrides: VersionOverrides,
): string | null {
	// Check for manual override first
	if (overrides[packageName]) {
		console.log(`  📌 Using override: ${packageName}@${overrides[packageName]}`);
		return overrides[packageName];
	}

	// Use latest from npm
	if (latestVersion) {
		return `^${latestVersion}`;
	}

	return null;
}

async function syncVersions(dryRun = false) {
	console.log("🔄 Syncing OSS package versions from npm...\n");

	const overrides = loadOverrides();
	if (Object.keys(overrides).length > 0) {
		console.log("📌 Version overrides loaded:", overrides);
		console.log("");
	}

	const updates: Array<{
		packagePath: string;
		packageName: string;
		dependency: string;
		oldVersion: string;
		newVersion: string;
	}> = [];

	// Fetch latest versions from npm
	const npmVersions = new Map<string, string | null>();
	for (const [_ossName, npmName] of Object.entries(OSS_TO_NPM_MAP)) {
		console.log(`📦 Checking ${npmName}...`);
		const version = getLatestNpmVersion(npmName);
		if (version) {
			console.log(`  ✅ Latest: ${version}`);
			npmVersions.set(npmName, version);
		} else {
			console.log("  ⚠️  Not found on npm");
			npmVersions.set(npmName, null);
		}
	}

	console.log("");

	// Update private packages
	for (const pkgPath of PRIVATE_PACKAGES) {
		const packageJsonPath = join(process.cwd(), pkgPath, "package.json");

		if (!existsSync(packageJsonPath)) {
			continue;
		}

		const pkg: PackageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
		let modified = false;

		// Check both OSS workspace deps and private package deps that should use npm
		const allMappings = { ...OSS_TO_NPM_MAP, ...PRIVATE_TO_NPM_MAP };

		for (const [pkgName, npmName] of Object.entries(allMappings)) {
			// Check dependencies
			if (pkg.dependencies?.[pkgName]) {
				const currentVersion = pkg.dependencies[pkgName];

				// Skip if already using a specific version (not workspace:*)
				if (currentVersion !== "workspace:*" && !currentVersion.startsWith("workspace:")) {
					continue;
				}

				const latestVersion = npmVersions.get(npmName);
				const targetVersion = getTargetVersion(npmName, latestVersion, overrides);

				if (targetVersion && pkg.dependencies[pkgName] !== targetVersion) {
					updates.push({
						packagePath: pkgPath,
						packageName: pkg.name,
						dependency: pkgName,
						oldVersion: pkg.dependencies[pkgName],
						newVersion: targetVersion,
					});

					if (!dryRun) {
						pkg.dependencies[pkgName] = targetVersion;
						modified = true;
					}
				}
			}

			// Check devDependencies
			if (pkg.devDependencies?.[pkgName]) {
				const currentVersion = pkg.devDependencies[pkgName];

				// Skip if already using a specific version (not workspace:*)
				if (currentVersion !== "workspace:*" && !currentVersion.startsWith("workspace:")) {
					continue;
				}

				const latestVersion = npmVersions.get(npmName);
				const targetVersion = getTargetVersion(npmName, latestVersion, overrides);

				if (targetVersion && pkg.devDependencies[pkgName] !== targetVersion) {
					updates.push({
						packagePath: pkgPath,
						packageName: pkg.name,
						dependency: pkgName,
						oldVersion: pkg.devDependencies[pkgName],
						newVersion: targetVersion,
					});

					if (!dryRun) {
						pkg.devDependencies[pkgName] = targetVersion;
						modified = true;
					}
				}
			}
		}

		// Write updated package.json
		if (modified) {
			writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
			console.log(`✅ Updated: ${pkg.name}`);
		}
	}

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 Sync Summary\n");

	if (updates.length === 0) {
		console.log("✅ All packages are up to date!");
	} else {
		console.log(`Found ${updates.length} updates:\n`);

		const byPackage = updates.reduce(
			(acc, update) => {
				if (!acc[update.packageName]) {
					acc[update.packageName] = [];
				}
				acc[update.packageName].push(update);
				return acc;
			},
			{} as Record<string, typeof updates>,
		);

		for (const [packageName, pkgUpdates] of Object.entries(byPackage)) {
			console.log(`${packageName}:`);
			for (const update of pkgUpdates) {
				console.log(`  ${update.dependency}: ${update.oldVersion} → ${update.newVersion}`);
			}
			console.log("");
		}
	}

	if (dryRun) {
		console.log("🔍 DRY RUN: No changes made");
		console.log("   Run without --dry-run to apply updates");
	} else if (updates.length > 0) {
		console.log("✅ Updates applied");
		console.log("\n💡 Next steps:");
		console.log("   1. Review changes: git diff");
		console.log("   2. Install updated packages: pnpm install");
		console.log("   3. Test: pnpm test");
		console.log('   4. Commit: git add . && git commit -m "chore: sync OSS versions from npm"');
	}
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");

	if (args.includes("--help")) {
		console.log("OSS Version Sync Tool\n");
		console.log("Usage:");
		console.log("  pnpm sync-oss-versions           # Apply updates");
		console.log("  pnpm sync-oss-versions --dry-run # Preview changes");
		console.log("\nVersion Overrides:");
		console.log("  Create .version-overrides.json to pin specific versions:");
		console.log("  {");
		console.log('    "@snapback/contracts": "0.3.0",');
		console.log('    "@snapback/sdk": "0.4.0"');
		console.log("  }");
		return;
	}

	try {
		await syncVersions(dryRun);
	} catch (error) {
		console.error("\n❌ Sync failed:", error);
		process.exit(1);
	}
}

main();
