#!/usr/bin/env node
/**
 * Validates workspace dependencies use workspace:* protocol
 */
import fs from "node:fs";

const files = process.argv
	.slice(2)
	.filter((f) => f !== "-" && f.endsWith("package.json"));
let hasErrors = false;

if (files.length === 0) {
	console.log("✅ Workspace dependencies validated (no files to check)");
	process.exit(0);
}

for (const file of files) {
	try {
		if (!fs.existsSync(file)) {
			continue;
		}

		const content = JSON.parse(fs.readFileSync(file, "utf8"));
		const deps = { ...content.dependencies, ...content.devDependencies };

		for (const [pkg, version] of Object.entries(deps)) {
			if (
				pkg.startsWith("@snapback/") &&
				!version.includes("workspace")
			) {
				console.error(
					`❌ ${file}: "${pkg}" should be "workspace:*" not "${version}"`
				);
				hasErrors = true;
			}
		}
	} catch (e) {
		console.error(`❌ Failed to parse ${file}: ${e.message}`);
		hasErrors = true;
	}
}

if (hasErrors) {
	console.error("\n❌ Workspace dependency validation failed.");
	process.exit(1);
}
console.log("✅ Workspace dependencies validated");
process.exit(0);
