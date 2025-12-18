#!/usr/bin/env node
/**
 * Validates tsconfig.json declaration generation settings
 * Prevents TS7005 "implicit any" errors from missing .d.ts files
 *
 * Root cause: emitDeclarationOnly: true conflicts with bundler dts generation
 * Solution: Ensure declaration: true, declarationMap: true, emitDeclarationOnly: false
 */
import fs from "node:fs";
import path from "node:path";

const files = process.argv
	.slice(2)
	.filter((f) => f !== "-" && f.endsWith("tsconfig.json"));
let hasErrors = false;
let hasWarnings = false;

if (files.length === 0) {
	console.log("✅ tsconfig declarations validated (no files to check)");
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

		// Only validate @snapback packages
		if (!pkg.name?.startsWith("@snapback")) {
			continue;
		}

		const opts = content.compilerOptions || {};
		const isPackage = pkg.private !== true || pkg.exports;

		// Skip declaration checks for type-only packages
		if (content.compilerOptions?.noEmit === true) {
			continue;
		}

		// === CRITICAL VALIDATION ===
		// emitDeclarationOnly conflicts with bundler dts generation
		// This was the root cause of 602 TS7005 errors in @snapback/platform
		if (
			opts.emitDeclarationOnly === true &&
			!opts.declaration &&
			!opts.declarationMap
		) {
			console.error(
				`❌ ${file} (${pkg.name}):\n` +
					"   emitDeclarationOnly: true without declaration/declarationMap\n" +
					"   DANGER: Will not generate .d.ts files, causing TS7005 errors\n" +
					"   FIX: Set declaration: true, declarationMap: true, emitDeclarationOnly: false"
			);
			hasErrors = true;
		}

		// Warn about declaration-only builds
		if (opts.emitDeclarationOnly === true && opts.declaration !== true) {
			console.warn(
				`⚠️  ${file} (${pkg.name}):\n` +
					"   emitDeclarationOnly: true without declaration: true\n" +
					"   This might not generate .d.ts files properly"
			);
			hasWarnings = true;
		}

		// For packages with exports, ensure declarations are enabled
		if (isPackage && pkg.exports) {
			// Check if any export requires .d.ts files
			const hasDeclarationExports = JSON.stringify(pkg.exports).includes(
				".d.ts"
			);

			if (hasDeclarationExports) {
				if (opts.declaration !== true) {
					console.error(
						`❌ ${file} (${pkg.name}):\n` +
							"   Exports .d.ts files but declaration: false/missing\n" +
							"   FIX: Add declaration: true to compilerOptions"
					);
					hasErrors = true;
				}
				if (opts.declarationMap !== true) {
					console.warn(
						`⚠️  ${file} (${pkg.name}):\n` +
							"   Exports .d.ts files but declarationMap: false/missing\n" +
							"   RECOMMENDED: Add declarationMap: true for source maps"
					);
					hasWarnings = true;
				}
			}
		}

		// Validate declaration settings make sense together
		if (opts.declaration === true && opts.emitDeclarationOnly === true) {
			if (opts.noEmit === true) {
				// This is OK for type-checking only
				continue;
			}
			// If both are true with emitting, warn about combined behavior
			if (!opts.declaration) {
				console.warn(
					`⚠️  ${file} (${pkg.name}):\n` +
						"   Both declaration: true and emitDeclarationOnly: true\n" +
						"   RECOMMENDED: Set emitDeclarationOnly: false for normal builds"
				);
				hasWarnings = true;
			}
		}

		// Validate composite builds
		if (opts.composite === true && !opts.declaration) {
			console.error(
				`❌ ${file} (${pkg.name}):\n` +
					"   composite: true requires declaration: true\n" +
					"   FIX: Add declaration: true to compilerOptions"
			);
			hasErrors = true;
		}
	} catch (e) {
		console.error(`❌ Failed to parse ${file}: ${e.message}`);
		hasErrors = true;
	}
}

if (hasErrors) {
	console.error("\n❌ tsconfig declaration validation failed.");
	process.exit(1);
}

if (hasWarnings) {
	console.warn(
		"\n⚠️  tsconfig declaration validation completed with warnings."
	);
	process.exit(0);
}

console.log("✅ tsconfig declarations validated");
process.exit(0);
