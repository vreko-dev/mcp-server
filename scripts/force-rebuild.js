#!/usr/bin/env node

const { execSync } = require("node:child_process");
const path = require("node:path");

console.log("🔧 Force rebuilding packages...");

try {
	// Clean build artifacts
	console.log("\n1. Cleaning build artifacts...");
	execSync("node scripts/clean-build.js", { stdio: "inherit" });

	// Run TypeScript build with force flag
	console.log("\n2. Running TypeScript build with force flag...");
	execSync("npx tsc --build --force packages/config/tsconfig.json packages/contracts/tsconfig.json", {
		stdio: "inherit",
		cwd: path.join(__dirname, ".."),
	});

	// Verify the build
	console.log("\n3. Verifying build...");
	execSync("node scripts/verify-build.js", { stdio: "inherit" });

	console.log("\n✅ Force rebuild completed successfully!");
} catch (error) {
	console.error("\n❌ Force rebuild failed!");
	console.error(error.message);
	process.exit(1);
}
