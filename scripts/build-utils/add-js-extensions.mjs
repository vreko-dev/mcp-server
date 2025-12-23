#!/usr/bin/env node
import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "fs";
import { dirname, extname, join } from "path";

/**
 * Add .js extensions to relative imports in ESM files
 * Required for Node.js v22+ strict ESM compliance
 *
 * Handles both file imports (./auth -> ./auth.js) and
 * directory imports (./observability -> ./observability/index.js)
 */

function addJsExtensions(dir) {
	const files = readdirSync(dir);

	for (const file of files) {
		const filePath = join(dir, file);
		const stat = statSync(filePath);

		if (stat.isDirectory()) {
			addJsExtensions(filePath);
		} else if (extname(file) === ".js") {
			let content = readFileSync(filePath, "utf8");
			const fileDir = dirname(filePath);

			// Add .js to ALL relative imports/exports: from "./auth" -> from "./auth.js"
			// This regex matches:
			// - import ... from "./path"
			// - export ... from "./path"
			// - export { ... } from "./path"
			// - export * from "./path"
			content = content.replace(
				/(from\s*['"])(\.\.?\/[^'"]+)(['"])/g,
				(match, prefix, importPath, suffix) => {
					// Skip if already has .js, .mjs, .cjs, .json extension
					if (importPath.match(/\.(js|mjs|cjs|json)$/)) return match;

					// Resolve the import path relative to current file
					const resolvedPath = join(fileDir, importPath);

					// Check if it's a directory (has index.js inside)
					if (
						existsSync(resolvedPath) &&
						statSync(resolvedPath).isDirectory()
					) {
						// Check for index.js inside the directory
						const indexPath = join(resolvedPath, "index.js");
						if (existsSync(indexPath)) {
							return `${prefix}${importPath}/index.js${suffix}`;
						}
					}

					// Otherwise, it's a file - add .js extension
					return `${prefix}${importPath}.js${suffix}`;
				}
			);

			writeFileSync(filePath, content, "utf8");
		}
	}
}

const distDir = join(process.cwd(), "dist");
addJsExtensions(distDir);
console.log("[build-utils] Added .js extensions to ESM imports");
