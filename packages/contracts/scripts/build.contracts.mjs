#!/usr/bin/env node
import { execSync } from "node:child_process";
import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgRoot = join(__dirname, "..");

/**
 * Add .js extensions to relative imports in ESM files
 * Required for Node.js v22+ strict ESM compliance
 *
 * Handles both file imports (./auth -> ./auth.js) and
 * directory imports (./observability -> ./observability/index.js)
 */
function addJsExtensions(dir, rootDistDir) {
	const files = readdirSync(dir);

	for (const file of files) {
		const filePath = join(dir, file);
		const stat = statSync(filePath);

		if (stat.isDirectory()) {
			addJsExtensions(filePath, rootDistDir);
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

const skip = process.env.SNAPBACK_OPENAPI_SKIP === "1";
const skipGenerate = process.env.SNAPBACK_GENERATE_SKIP === "1";

try {
	execSync("pnpm -s tsc -p tsconfig.json", { stdio: "inherit" });

	// Add .js extensions for Node.js v22+ ESM compliance
	const distDir = join(pkgRoot, "dist");
	addJsExtensions(distDir, distDir);
	console.log("[contracts] Added .js extensions to ESM imports");

	if (skip) {
		console.log("[contracts] OpenAPI skipped (SNAPBACK_OPENAPI_SKIP=1)");
	} else {
		try {
			execSync("pnpm -s run openapi", { stdio: "inherit" });
		} catch {
			console.error(
				"[contracts] OpenAPI generation failed; set SNAPBACK_OPENAPI_SKIP=1"
			);
			process.exit(2);
		}
	}

	// Run type generation AFTER build completes
	if (skipGenerate) {
		console.log(
			"[contracts] Type generation skipped (SNAPBACK_GENERATE_SKIP=1)"
		);
	} else {
		try {
			execSync("node dist/scripts/generate-types.js", {
				stdio: "inherit",
			});
			// Format generated files to match project style
			execSync("pnpm biome format --write generated/", {
				stdio: "inherit",
			});
		} catch {
			console.error(
				"[contracts] Type generation failed; set SNAPBACK_GENERATE_SKIP=1"
			);
			// Don't exit with error - this is optional
		}
	}

	console.log("[contracts] build OK");
	process.exit(0);
} catch (e) {
	process.exit(typeof e.status === "number" ? e.status : 1);
}
