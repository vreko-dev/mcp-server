#!/usr/bin/env node
/**
 * Validates tsup configurations for required settings
 */
import fs from "node:fs";
import path from "node:path";

const files = process.argv
	.slice(2)
	.filter((f) => f !== "-" && f.includes("tsup.config"));
let _hasErrors = false;
const validationErrors = [];
const warnings = [];

// Packages that MUST have dts.resolve: true
const requiresDtsResolve = [
	"@snapback/testing",
	"@snapback/events",
	"@snapback/config",
	"@snapback/sdk",
	"@snapback/infrastructure",
	"@snapback-oss/contracts",
	"@snapback-oss/infrastructure",
	"@snapback-oss/config",
	"@snapback-oss/events",
	"@snapback-oss/sdk",
];

// Browser packages that MUST mark server dependencies as external
const browserPackages = [
	"@snapback/contracts",
	"@snapback/config",
	"@snapback/auth",
];

if (files.length === 0) {
	console.log("✅ tsup configurations validated (no files to check)");
	process.exit(0);
}

for (const file of files) {
	try {
		if (!fs.existsSync(file)) {
			continue;
		}

		const content = fs.readFileSync(file, "utf8");
		const dir = path.dirname(file);
		const packageJsonPath = path.join(dir, "package.json");

		if (!fs.existsSync(packageJsonPath)) {
			continue;
		}

		const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
		const packageName = pkg.name;

		// Check DTS resolution requirement
		if (requiresDtsResolve.includes(packageName)) {
			// Check for explicit dts: { resolve: true } or presets that include it
			const hasExplicitDtsResolve =
				content.includes("dts:") &&
				content.includes("resolve:") &&
				content.includes("true");
			const usesPresetWithDtsResolve =
				content.includes("multiEntryLibraryPreset") ||
				content.includes("browserLibraryPreset") ||
				content.includes("serverLibraryPreset");

			if (!hasExplicitDtsResolve && !usesPresetWithDtsResolve) {
				validationErrors.push(
					`❌ ${packageName}: missing 'dts: { resolve: true }'`
				);
				_hasErrors = true;
			}
		}

		// Check browser packages have external declarations
		if (browserPackages.includes(packageName)) {
			const hasExternalDeclaration =
				content.includes("external:") &&
				!content.includes("external: undefined");
			if (!hasExternalDeclaration) {
				validationErrors.push(
					`❌ ${packageName}: browser package missing proper 'external: [...]' declaration`
				);
				_hasErrors = true;
			}
			if (!content.includes("@snapback/infrastructure")) {
				warnings.push(
					`⚠️  ${packageName}: consider adding '@snapback/infrastructure' to external array`
				);
			}
		}

		// Warn on unsafe configurations
		if (
			content.includes("dts: false") &&
			!content.includes("DTS generation disabled") &&
			!content.includes("DTS disabled")
		) {
			warnings.push(
				`⚠️  ${packageName}: dts: false without explanation - document why in comment`
			);
		}

		// Check for missing skipNodeModulesBundle
		if (
			!content.includes("skipNodeModulesBundle: true") &&
			content.includes("format:")
		) {
			warnings.push(
				`⚠️  ${packageName}: consider adding 'skipNodeModulesBundle: true'`
			);
		}
	} catch (e) {
		console.error(`❌ Failed to process ${file}: ${e.message}`);
		_hasErrors = true;
	}
}

if (warnings.length > 0) {
	for (const w of warnings) {
		console.log(w);
	}
}

if (validationErrors.length > 0) {
	for (const err of validationErrors) {
		console.error(err);
	}
	console.error(
		`\n❌ tsup validation failed with ${validationErrors.length} error(s).`
	);
	process.exit(1);
}

console.log("✅ tsup configurations validated");
process.exit(0);
