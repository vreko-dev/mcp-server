#!/usr/bin/env node

// Script to identify and fix barrel export over-exposure
// This script identifies files with "export * from" and suggests explicit named exports

const fs = require("node:fs");
const path = require("node:path");

// Function to walk through directories recursively
function walkDir(dir, callback) {
	fs.readdirSync(dir).forEach((file) => {
		const filePath = path.join(dir, file);

		// Skip node_modules and other directories we don't want to scan
		if (
			filePath.includes("node_modules") ||
			filePath.includes(".git") ||
			filePath.includes("dist") ||
			filePath.includes(".next") ||
			filePath.includes(".vscode-test")
		) {
			return;
		}

		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			walkDir(filePath, callback);
		} else if (
			stat.isFile() &&
			(filePath.endsWith(".ts") || filePath.endsWith(".tsx")) &&
			!filePath.endsWith(".d.ts") &&
			!filePath.includes(".test.")
		) {
			callback(filePath);
		}
	});
}

// Function to process a file and identify export * from statements
function processFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");

		// Look for export * from statements
		const exportStarRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
		const matches = [...content.matchAll(exportStarRegex)];

		if (matches.length > 0) {
			console.log(`\n📁 ${filePath}`);

			matches.forEach((match) => {
				const importPath = match[1];
				console.log(`  📦 export * from '${importPath}'`);

				// Try to suggest explicit exports
				if (importPath.startsWith("./") || importPath.startsWith("../")) {
					const resolvedPath = path.resolve(path.dirname(filePath), importPath);
					let possibleFile = resolvedPath;

					// Try different extensions
					const extensions = [".ts", ".tsx", "/index.ts", "/index.tsx"];
					for (const ext of extensions) {
						if (fs.existsSync(possibleFile + ext)) {
							possibleFile = possibleFile + ext;
							break;
						}
					}

					if (fs.existsSync(possibleFile)) {
						const importedContent = fs.readFileSync(possibleFile, "utf8");

						// Extract named exports from the imported file
						const namedExports = [];

						// Look for export statements
						const exportRegex = /export\s+(?:const|function|class|type|interface)\s+([a-zA-Z0-9_]+)/g;
						let exportMatch = exportRegex.exec(importedContent);
						while (exportMatch !== null) {
							namedExports.push(exportMatch[1]);
							exportMatch = exportRegex.exec(importedContent);
						}

						// Look for default exports
						if (importedContent.includes("export default")) {
							namedExports.push("default");
						}

						if (namedExports.length > 0) {
							console.log("    💡 Suggested fix:");
							console.log(`       export { ${namedExports.join(", ")} } from '${importPath}';`);
						}
					}
				}
			});
		}
	} catch (_error) {
		// Ignore errors for files we can't read
	}
}

// Main execution
function main() {
	console.log("🔍 Analyzing barrel exports in the codebase...\n");

	// Walk through the project directory
	walkDir(".", processFile);

	console.log("\n📋 To fix these issues:");
	console.log('1. Replace "export * from" with explicit named exports');
	console.log("2. Mark internal exports with @internal JSDoc comments");
	console.log("3. Create clear API boundaries for packages");
	console.log("4. Enable tree-shaking by avoiding wildcard exports");
}

main();
