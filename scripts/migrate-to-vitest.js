#!/usr/bin/env tsx
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { glob } from "glob";

const execAsync = promisify(exec);
async function migrateToVitest() {
	console.log("🔄 Starting Jest to Vitest migration...\n");
	try {
		// 1. Update package.json test scripts
		console.log("📝 Updating package.json scripts...");
		const packageJsonPaths = await glob.glob("**/package.json", {
			ignore: ["**/node_modules/**", "**/dist/**"],
		});
		console.log("Found package.json files:", packageJsonPaths);
		for (const pkgPath of packageJsonPaths) {
			try {
				const content = await fs.readFile(pkgPath, "utf-8");
				const pkg = JSON.parse(content);
				let updated = false;
				if (pkg.scripts) {
					// Update test scripts
					if (pkg.scripts.test?.includes("jest")) {
						pkg.scripts.test = pkg.scripts.test.replace(/jest/g, "vitest");
						updated = true;
					}
					if (pkg.scripts["test:watch"]) {
						pkg.scripts["test:watch"] = "vitest watch";
						updated = true;
					} else {
						pkg.scripts["test:watch"] = "vitest watch";
						updated = true;
					}
					if (pkg.scripts["test:coverage"]) {
						pkg.scripts["test:coverage"] = "vitest run --coverage";
						updated = true;
					} else {
						pkg.scripts["test:coverage"] = "vitest run --coverage";
						updated = true;
					}
					if (pkg.scripts["test:ui"]) {
						pkg.scripts["test:ui"] = "vitest --ui";
						updated = true;
					} else {
						pkg.scripts["test:ui"] = "vitest --ui";
						updated = true;
					}
				}
				if (updated) {
					await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
					console.log(`   Updated ${pkgPath}`);
				}
			} catch (error) {
				console.warn(`   Failed to update ${pkgPath}:`, error);
			}
		}
		// 2. Update test file imports
		console.log("🔧 Updating test imports...");
		const testFiles = await glob.glob("**/*.{test,spec}.{ts,tsx,js,jsx}", {
			ignore: ["**/node_modules/**", "**/dist/**"],
		});
		for (const testFile of testFiles) {
			try {
				let content = await fs.readFile(testFile, "utf-8");
				let updated = false;
				// Replace Jest imports with Vitest
				if (content.includes("@jest/globals")) {
					content = content.replace(/from ['"]@jest\/globals['"]/g, 'from "vitest"');
					updated = true;
				}
				if (content.includes("import jest from")) {
					content = content.replace(/import jest from ['"]jest['"]/g, 'import { vi } from "vitest"');
					updated = true;
				}
				if (content.includes("jest.fn(")) {
					content = content.replace(/jest\.fn\(/g, "vi.fn(");
					updated = true;
				}
				if (content.includes("jest.mock(")) {
					content = content.replace(/jest\.mock\(/g, "vi.mock(");
					updated = true;
				}
				if (content.includes("jest.spyOn(")) {
					content = content.replace(/jest\.spyOn\(/g, "vi.spyOn(");
					updated = true;
				}
				if (content.includes("jest.clearAllMocks(")) {
					content = content.replace(/jest\.clearAllMocks\(/g, "vi.clearAllMocks(");
					updated = true;
				}
				if (content.includes("jest.resetAllMocks(")) {
					content = content.replace(/jest\.resetAllMocks\(/g, "vi.resetAllMocks(");
					updated = true;
				}
				if (updated) {
					await fs.writeFile(testFile, content);
					console.log(`   Updated ${testFile}`);
				}
			} catch (error) {
				console.warn(`   Failed to update ${testFile}:`, error);
			}
		}
		// 3. Remove Jest config files
		console.log("🗑️  Removing Jest configuration files...");
		const jestConfigs = await glob.glob("**/jest.config.{js,ts,json}", {
			ignore: ["**/node_modules/**", "**/dist/**"],
		});
		for (const config of jestConfigs) {
			try {
				await fs.unlink(config);
				console.log(`   Removed ${config}`);
			} catch (error) {
				console.warn(`   Failed to remove ${config}:`, error);
			}
		}
		// 4. Install packages
		console.log("\n📦 Installing Vitest packages...");
		try {
			await execAsync("pnpm add -D -w vitest @vitest/ui happy-dom @faker-js/faker");
			console.log("   Vitest packages installed successfully");
		} catch (error) {
			console.warn("   Failed to install Vitest packages:", error);
		}
		console.log('\n✅ Migration complete! Run "pnpm test" to run tests with Vitest.');
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	}
}
migrateToVitest().catch(console.error);
