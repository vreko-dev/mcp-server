#!/usr/bin/env node
/**
 * Validates tsconfig.json path configurations for consistency
 */
import fs from "node:fs";
import path from "node:path";

const files = process.argv.slice(2).filter((f) => f !== "-" && f.endsWith("tsconfig.json"));
let hasErrors = false;

if (files.length === 0) {
	console.log("✅ tsconfig paths validated (no files to check)");
	process.exit(0);
}

for (const file of files) {
	try {
		if (!fs.existsSync(file)) {
			continue;
		}

		const content = JSON.parse(fs.readFileSync(file, "utf8"));
		const dir = path.dirname(file);
		const packageJsonPath = path.join(dir, "package.json");

		if (!fs.existsSync(packageJsonPath)) {
			continue;
		}
		const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

		// Validate paths config
		if (content.compilerOptions?.paths) {
			const paths = content.compilerOptions.paths;
			for (const [key, values] of Object.entries(paths)) {
				if (!Array.isArray(values)) {
					console.error(`❌ ${file}: Path "${key}" value must be array, got ${typeof values}`);
					hasErrors = true;
				} else {
					for (const val of values) {
						if (typeof val !== "string") {
							console.error(`❌ ${file}: Path value must be string, got ${typeof val}`);
							hasErrors = true;
						}
					}
				}
			}
		}

		// Warn about extends chain
		if (content.extends && !content.extends.includes("tsconfig.base.json")) {
			if (pkg.name?.startsWith("@snapback")) {
				console.warn(`⚠️  ${pkg.name} extends non-standard tsconfig: ${content.extends}`);
			}
		}
	} catch (e) {
		console.error(`❌ Failed to parse ${file}: ${e.message}`);
		hasErrors = true;
	}
}

if (hasErrors) {
	console.error("\n❌ tsconfig validation failed.");
	process.exit(1);
}
console.log("✅ tsconfig paths validated");
process.exit(0);
