#!/usr/bin/env tsx
/**
 * Codemod: Migrate Result type constructors from uppercase to lowercase
 *
 * Changes:
 * - Ok( → ok(
 * - Err( → err(
 * - import { Ok, Err } → import { ok, err }
 *
 * Usage:
 *   pnpm tsx scripts/migrate-result-constructors.ts --dry-run  # Preview changes
 *   pnpm tsx scripts/migrate-result-constructors.ts --apply    # Apply changes
 */

import fs from "node:fs";
import path from "node:path";

// Configuration
const TARGET_DIRS = [
	"apps/vscode/src/ai/AIWarningManager.ts",
	"apps/vscode/src/types/ExtensionState.ts",
	// Note: result.ts excluded - will be updated manually
];

const DRY_RUN = process.argv.includes("--dry-run");
const APPLY = process.argv.includes("--apply");

interface FileChange {
	filePath: string;
	originalContent: string;
	newContent: string;
	changes: string[];
}

/**
 * Apply all transformations to file content
 */
function transformContent(content: string, _filePath: string): { content: string; changes: string[] } {
	const changes: string[] = [];
	let transformed = content;

	// 1. Replace Ok( with ok(
	const okMatches = (transformed.match(/\bOk\(/g) || []).length;
	if (okMatches > 0) {
		transformed = transformed.replace(/\bOk\(/g, "ok(");
		changes.push(`Replaced ${okMatches} Ok( → ok(`);
	}

	// 2. Replace Err( with err(
	const errMatches = (transformed.match(/\bErr\(/g) || []).length;
	if (errMatches > 0) {
		transformed = transformed.replace(/\bErr\(/g, "err(");
		changes.push(`Replaced ${errMatches} Err( → err(`);
	}

	// 3. Update import statements
	// Match patterns like:
	// import { Ok, Err } from "./types/result";
	// import { Result, Ok, Err, isOk } from "./types/result";
	const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"](.*result.*)['"]/g;
	let importMatches = 0;

	transformed = transformed.replace(importRegex, (match, imports, fromPath) => {
		const hasOk = /\bOk\b/.test(imports);
		const hasErr = /\bErr\b/.test(imports);

		if (hasOk || hasErr) {
			importMatches++;
			let newImports = imports;

			// Replace Ok → ok (word boundaries to avoid OkType → okType)
			if (hasOk) {
				newImports = newImports.replace(/\bOk\b/g, "ok");
			}

			// Replace Err → err
			if (hasErr) {
				newImports = newImports.replace(/\bErr\b/g, "err");
			}

			return `import {${newImports}} from "${fromPath}"`;
		}

		return match;
	});

	if (importMatches > 0) {
		changes.push(`Updated ${importMatches} import statement(s)`);
	}

	return { content: transformed, changes };
}

/**
 * Process a single file
 */
function processFile(filePath: string): FileChange | null {
	const absolutePath = path.resolve(process.cwd(), filePath);

	if (!fs.existsSync(absolutePath)) {
		console.error(`❌ File not found: ${filePath}`);
		return null;
	}

	const originalContent = fs.readFileSync(absolutePath, "utf-8");
	const { content: newContent, changes } = transformContent(originalContent, filePath);

	if (originalContent === newContent) {
		return null; // No changes needed
	}

	return {
		filePath,
		originalContent,
		newContent,
		changes,
	};
}

/**
 * Main execution
 */
function main() {
	console.log("🔄 Result Type Constructor Migration");
	console.log("=====================================\n");

	if (!DRY_RUN && !APPLY) {
		console.error("❌ Error: Must specify --dry-run or --apply\n");
		console.log("Usage:");
		console.log("  pnpm tsx scripts/migrate-result-constructors.ts --dry-run");
		console.log("  pnpm tsx scripts/migrate-result-constructors.ts --apply\n");
		process.exit(1);
	}

	console.log(`Mode: ${DRY_RUN ? "🔍 DRY RUN (no changes)" : "✍️  APPLY (writing files)"}\n`);

	const fileChanges: FileChange[] = [];

	// Process each target file
	for (const filePath of TARGET_DIRS) {
		const change = processFile(filePath);
		if (change) {
			fileChanges.push(change);
		}
	}

	// Report results
	if (fileChanges.length === 0) {
		console.log("✅ No changes needed - all files already use lowercase constructors\n");
		return;
	}

	console.log(`📝 Found ${fileChanges.length} file(s) with changes:\n`);

	for (const change of fileChanges) {
		console.log(`\n📄 ${change.filePath}`);
		console.log("   Changes:");
		for (const desc of change.changes) {
			console.log(`   - ${desc}`);
		}

		if (DRY_RUN) {
			// Show diff preview (first 500 chars)
			console.log("\n   Preview (first 500 chars of changes):");
			const diffLines = change.newContent.split("\n").slice(0, 15);
			for (const line of diffLines) {
				if (line.includes("ok(") || line.includes("err(") || line.includes("import")) {
					console.log(`   > ${line}`);
				}
			}
		}
	}

	// Apply changes if requested
	if (APPLY) {
		console.log("\n\n💾 Writing changes to disk...\n");

		for (const change of fileChanges) {
			const absolutePath = path.resolve(process.cwd(), change.filePath);
			fs.writeFileSync(absolutePath, change.newContent, "utf-8");
			console.log(`   ✅ Updated: ${change.filePath}`);
		}

		console.log("\n✅ Migration complete!");
		console.log("\nNext steps:");
		console.log("  1. Review changes: git diff");
		console.log("  2. Type check: pnpm --filter @snapback/vscode-extension type-check");
		console.log("  3. Run tests: pnpm --filter @snapback/vscode-extension test");
		console.log("  4. Build: pnpm --filter @snapback/vscode-extension build\n");
	} else {
		console.log("\n\n🔍 Dry run complete - no files modified");
		console.log("   Run with --apply to write changes\n");
	}
}

// Execute
main();
