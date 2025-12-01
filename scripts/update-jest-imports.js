const fs = require("node:fs").promises;
const _path = require("node:path");
const glob = require("glob");

async function updateJestImports() {
	console.log("🔄 Updating Jest imports to Vitest...");

	try {
		// Find all test files
		const testFiles = glob.sync("**/*.{test,spec}.{ts,tsx,js,jsx}", {
			ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
		});

		console.log(`Found ${testFiles.length} test files to update`);

		let updatedCount = 0;

		for (const testFile of testFiles) {
			try {
				let content = await fs.readFile(testFile, "utf-8");
				let updated = false;

				// Replace Jest imports with Vitest
				if (content.includes("@jest/globals")) {
					content = content.replace(/from ['"]@jest\/globals['"]/g, 'from "vitest"');
					updated = true;
				}

				// Replace jest.fn() with vi.fn()
				if (content.includes("jest.fn(")) {
					content = content.replace(/jest\.fn\(/g, "vi.fn(");
					updated = true;
				}

				// Replace jest.mock() with vi.mock()
				if (content.includes("jest.mock(")) {
					content = content.replace(/jest\.mock\(/g, "vi.mock(");
					updated = true;
				}

				// Replace jest.spyOn() with vi.spyOn()
				if (content.includes("jest.spyOn(")) {
					content = content.replace(/jest\.spyOn\(/g, "vi.spyOn(");
					updated = true;
				}

				// Replace jest.clearAllMocks() with vi.clearAllMocks()
				if (content.includes("jest.clearAllMocks(")) {
					content = content.replace(/jest\.clearAllMocks\(/g, "vi.clearAllMocks(");
					updated = true;
				}

				// Replace jest.resetAllMocks() with vi.resetAllMocks()
				if (content.includes("jest.resetAllMocks(")) {
					content = content.replace(/jest\.resetAllMocks\(/g, "vi.resetAllMocks(");
					updated = true;
				}

				if (updated) {
					await fs.writeFile(testFile, content);
					console.log(`   Updated ${testFile}`);
					updatedCount++;
				}
			} catch (error) {
				console.warn(`   Failed to update ${testFile}:`, error.message);
			}
		}

		console.log(`\n✅ Updated ${updatedCount} test files!`);
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	}
}

updateJestImports().catch(console.error);
