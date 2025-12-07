#!/usr/bin/env node
import { execSync } from "node:child_process";

const skip = process.env.SNAPBACK_OPENAPI_SKIP === "1";
const skipGenerate = process.env.SNAPBACK_GENERATE_SKIP === "1";

try {
	execSync("pnpm -s tsc -p tsconfig.json", { stdio: "inherit" });

	// OpenAPI generation skipped for OSS package
	// if (skip) { ... }

	// Run type generation AFTER build completes
	if (skipGenerate) {
		console.log("[contracts] Type generation skipped (SNAPBACK_GENERATE_SKIP=1)");
	} else {
		try {
			execSync("node dist/scripts/generate-types.js", { stdio: "inherit" });
			// Format generated files to match project style
			execSync("pnpm biome format --write generated/", { stdio: "inherit" });
		} catch {
			console.error("[contracts] Type generation failed; set SNAPBACK_GENERATE_SKIP=1");
			// Don't exit with error - this is optional
		}
	}

	console.log("[contracts] build OK");
	process.exit(0);
} catch (e) {
	process.exit(typeof e.status === "number" ? e.status : 1);
}
