#!/usr/bin/env tsx

/**
 * Fix Infrastructure Validation Errors
 *
 * Systematically fixes:
 * - Workspace dependency protocol violations (^X.X.X -> workspace:*)
 * - Missing DTS resolution config (adds dts.resolve: true where needed)
 */

import fs from "node:fs/promises";
import path from "node:path";

const WORKSPACE_DEP_FIXES = [
	"packages/policy-engine",
	"packages/platform",
	"packages/integrations",
	"packages/core",
	"apps/vscode",
	"apps/api",
];

const DTS_RESOLVE_PACKAGES = [
	"packages-oss/sdk",
	"packages-oss/infrastructure",
	"packages-oss/events",
	"packages-oss/contracts",
	"packages/sdk",
];

async function fixWorkspaceDependencies() {
	console.log("\n🔧 Fixing workspace dependency protocol violations...\n");

	for (const dir of WORKSPACE_DEP_FIXES) {
		const packageJsonPath = path.join(dir, "package.json");
		try {
			const content = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));

			let hasChanges = false;

			// Fix dependencies
			if (content.dependencies) {
				Object.entries(content.dependencies).forEach(([pkg, version]) => {
					if (String(pkg).startsWith("@snapback/") && !String(version).includes("workspace")) {
						console.log(`  ${dir}: Fixing ${pkg}: ${version} -> workspace:*`);
						content.dependencies[pkg] = "workspace:*";
						hasChanges = true;
					}
				});
			}

			// Fix devDependencies
			if (content.devDependencies) {
				Object.entries(content.devDependencies).forEach(([pkg, version]) => {
					if (String(pkg).startsWith("@snapback/") && !String(version).includes("workspace")) {
						console.log(`  ${dir}: Fixing ${pkg}: ${version} -> workspace:*`);
						content.devDependencies[pkg] = "workspace:*";
						hasChanges = true;
					}
				});
			}

			if (hasChanges) {
				await fs.writeFile(packageJsonPath, `${JSON.stringify(content, null, 2)}\n`);
				console.log(`  ✅ Updated ${packageJsonPath}\n`);
			}
		} catch (e) {
			console.error(`  ❌ Failed to update ${dir}: ${String(e)}`);
		}
	}
}

async function fixDtsResolution() {
	console.log("\n🔧 Adding DTS resolution configuration...\n");

	for (const dir of DTS_RESOLVE_PACKAGES) {
		const tsupConfigPath = path.join(dir, "tsup.config.ts");
		try {
			const content = await fs.readFile(tsupConfigPath, "utf-8");

			if (!content.includes("dts:") || !content.includes("resolve:")) {
				// Add dts.resolve configuration
				const updatedContent = content.replace(
					/export default defineConfig\({/,
					`export default defineConfig({
	dts: {
		resolve: true,
		compilerOptions: {
			composite: false,
			incremental: false,
		},
	},`,
				);

				if (updatedContent !== content) {
					await fs.writeFile(tsupConfigPath, updatedContent);
					console.log(`  ✅ Added dts.resolve to ${tsupConfigPath}`);
				}
			}
		} catch (e) {
			console.error(`  ⚠️  Skipped ${dir}: ${String(e)}`);
		}
	}
}

async function main() {
	console.log("\n🏗️  Fixing infrastructure validation errors...");

	try {
		await fixWorkspaceDependencies();
		await fixDtsResolution();

		console.log("\n✅ Fixes applied. Run 'pnpm validate:infrastructure' to verify.\n");
		process.exit(0);
	} catch (error) {
		console.error("\n❌ Fix script failed:", error);
		process.exit(1);
	}
}

main();
