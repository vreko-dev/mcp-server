#!/usr/bin/env node
/**
 * Detects cross-package relative imports that should use @snapback/* aliases
 */
import fs from "node:fs";
import path from "node:path";

const rawFiles = process.argv.slice(2).filter((f) => f !== "-" && (f.endsWith(".ts") || f.endsWith(".tsx")));
const files = rawFiles.map((f) => path.resolve(f));
const relativeImportRegex = /^import\s+.*?from\s+['"](?:\.\.\/){2,}/m;
let hasErrors = false;

if (files.length === 0) {
	console.log("✅ No cross-package relative imports detected (no files to check)");
	process.exit(0);
}

for (const file of files) {
	try {
		if (!fs.existsSync(file)) {
			continue;
		}

		const content = fs.readFileSync(file, "utf8");

		// Find package root by looking for package.json
		let packageRoot = path.dirname(file);
		while (packageRoot !== "/" && packageRoot !== "." && !fs.existsSync(path.join(packageRoot, "package.json"))) {
			packageRoot = path.dirname(packageRoot);
		}

		if (packageRoot === "/" || packageRoot === ".") {
			continue; // No package.json found
		}

		const lines = content.split("\n");

		for (let idx = 0; idx < lines.length; idx++) {
			const line = lines[idx];
			if (relativeImportRegex.test(line)) {
				const match = line.match(/from\s+['"]([^'"]+)['"]/);
				if (match) {
					const importPath = match[1];
					// Check if import goes outside package boundary
					const resolvedPath = path.resolve(path.dirname(file), importPath);
					if (!resolvedPath.startsWith(packageRoot)) {
						console.error(`❌ ${file}:${idx + 1} - Cross-package relative import detected:`);
						console.error(`   ${line.trim()}`);
						console.error(`   Use '@snapback/*' package import instead of relative path`);
						hasErrors = true;
					}
				}
			}
		}
	} catch (e) {
		console.error(`❌ Failed to process ${file}: ${e.message}`);
		hasErrors = true;
	}
}

if (hasErrors) {
	console.error("\n❌ Cross-package relative imports are not allowed. Use package imports.\n");
	process.exit(1);
}
console.log("✅ No cross-package relative imports detected");
process.exit(0);
