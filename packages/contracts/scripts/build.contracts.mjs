#!/usr/bin/env node
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgRoot = join(__dirname, "..");

const skip = process.env.SNAPBACK_OPENAPI_SKIP === "1";
const skipGenerate = process.env.SNAPBACK_GENERATE_SKIP === "1";

try {
	execSync("pnpm -s tsc -p tsconfig.json", { stdio: "inherit" });

	// Add .js extensions for Node.js v22+ ESM compliance using standard script
	execSync("node ../../scripts/build-utils/add-js-extensions.mjs", {
		stdio: "inherit",
		cwd: pkgRoot,
	});
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
