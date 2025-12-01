const fs = require("node:fs");
const path = require("node:path");

// Function to recursively find all .ts and .tsx files
function findFiles(dir, extensions) {
	let results = [];
	const files = fs.readdirSync(dir);

	files.forEach((file) => {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory() && !filePath.includes("node_modules") && !filePath.includes(".git")) {
			results = results.concat(findFiles(filePath, extensions));
		} else if (extensions.some((ext) => file.endsWith(ext))) {
			results.push(filePath);
		}
	});

	return results;
}

// Function to fix imports in a file
function fixImports(filePath) {
	try {
		let content = fs.readFileSync(filePath, "utf8");
		const originalContent = content;

		// Fix db client imports
		content = content.replace(
			/import\s*{\s*db\s*}\s*from\s*["@']@snapback\/platform\/db\/drizzle\/client["@']/g,
			'import { db } from "@snapback/platform"',
		);

		// Fix drizzle imports
		content = content.replace(
			/import\s*{\s*drizzle\s*}\s*from\s*["@']@snapback\/platform\/db["@']/g,
			'import { db as drizzle } from "@snapback/platform"',
		);

		// Fix direct db imports
		content = content.replace(
			/import\s*{\s*drizzle\s*}\s*from\s*["@']@snapback\/platform\/db["@']/g,
			'import { db as drizzle } from "@snapback/platform"',
		);

		// Fix postgres schema imports (main schema items are exported directly)
		content = content.replace(
			/import\s*{\s*([a-zA-Z0-9_,\s]+)\s*}\s*from\s*["@']@snapback\/platform\/db\/drizzle\/schema\/postgres["@']/g,
			'import { $1 } from "@snapback/platform"',
		);

		// Fix type imports from postgres schema
		content = content.replace(
			/import\s+type\s+{\s*([a-zA-Z0-9_,\s]+)\s*}\s+from\s*["@']@snapback\/platform\/db\/drizzle\/schema\/postgres["@']/g,
			'import type { $1 } from "@snapback/platform"',
		);

		// Handle snapback schema imports - these need special handling
		// First, collect all snapback schema imports
		const snapbackImportRegex =
			/import\s*{\s*([a-zA-Z0-9_,\s]+)\s*}\s*from\s*["@']@snapback\/platform\/db\/drizzle\/schema\/snapback\/?["@']/g;
		let match;
		const snapbackImports = [];
		while ((match = snapbackImportRegex.exec(originalContent)) !== null) {
			snapbackImports.push({
				fullMatch: match[0],
				items: match[1],
			});
		}

		// Replace snapback schema imports with snapbackSchema import
		if (snapbackImports.length > 0) {
			// Add snapbackSchema import if not already present
			if (!content.includes('import { snapbackSchema } from "@snapback/platform"')) {
				// Find the first import statement and add our import after it
				content = content.replace(
					/(import\s+[^;]+;)/,
					'$1\nimport { snapbackSchema } from "@snapback/platform";',
				);
			}

			// Remove the old snapback schema imports
			snapbackImports.forEach((importInfo) => {
				content = content.replace(importInfo.fullMatch, "");
			});

			// Update usage of the imported items to use snapbackSchema.
			snapbackImports.forEach((importInfo) => {
				const items = importInfo.items.split(",").map((item) => item.trim());
				items.forEach((item) => {
					// Replace direct usage with snapbackSchema.item
					const regex = new RegExp(`\\b${item}\\b`, "g");
					content = content.replace(regex, `snapbackSchema.${item}`);
				});
			});
		}

		// Fix test utility imports
		content = content.replace(
			/import\s*{\s*([a-zA-Z0-9_,\s]+)\s*}\s*from\s*["@']@snapback\/platform\/db\/__tests__\/fixtures\/([a-zA-Z0-9_-]+)["@']/g,
			'import { $1 } from "@snapback/platform"',
		);

		content = content.replace(
			/import\s*{\s*([a-zA-Z0-9_,\s]+)\s*}\s*from\s*["@']@snapback\/platform\/db\/__tests__\/utils\/([a-zA-Z0-9_-]+)["@']/g,
			'import { $1 } from "@snapback/platform"',
		);

		// Fix require statements for db
		content = content.replace(
			/require\(["']@snapback\/platform\/db["']\)\.db/g,
			'require("@snapback/platform").db',
		);

		content = content.replace(
			/require\(["']@snapback\/platform\/db["']\)\.drizzle/g,
			'require("@snapback/platform").db',
		);

		// Fix require statements for schema items
		content = content.replace(
			/require\(["']@snapback\/platform\/db\/drizzle\/schema\/postgres["']\)\.([a-zA-Z0-9_]+)/g,
			'require("@snapback/platform").$2',
		);

		// Fix mock statements for client
		content = content.replace(
			/vi\.mock\(["']@snapback\/platform\/db["'],\s*\(\)\s*=>\s*{/g,
			'vi.mock("@snapback/platform", () => {',
		);

		content = content.replace(
			/vi\.mock\(["']@snapback\/platform\/db\/drizzle\/client["'],\s*\(\)\s*=>\s*{/g,
			'vi.mock("@snapback/platform", () => {',
		);

		// Fix mock statements for schema items
		content = content.replace(
			/vi\.mock\(["']@snapback\/platform\/db\/drizzle\/schema\/postgres["'],\s*\(\)\s*=>\s*{/g,
			'vi.mock("@snapback/platform", () => {',
		);

		content = content.replace(
			/vi\.mock\(["']@snapback\/platform\/db\/drizzle\/schema\/snapback["']?,\s*\(\)\s*=>\s*{/g,
			'vi.mock("@snapback/platform", () => {',
		);

		content = content.replace(
			/vi\.mock\(["']@snapback\/platform\/db\/drizzle\/schema\/snapback\/([a-zA-Z0-9_-]+)["']?,\s*\(\)\s*=>\s*{/g,
			'vi.mock("@snapback/platform", () => {',
		);

		// Fix simple mock statements without function bodies
		content = content.replace(
			/vi\.mock\(["']@snapback\/platform\/db\/drizzle\/client["']\s*\)/g,
			'vi.mock("@snapback/platform")',
		);

		content = content.replace(
			/vi\.mock\(["']@snapback\/platform\/db\/drizzle\/schema\/postgres["']\s*\)/g,
			'vi.mock("@snapback/platform")',
		);

		content = content.replace(
			/vi\.mock\(["']@snapback\/platform\/db\/drizzle\/schema\/snapback["']\s*\)/g,
			'vi.mock("@snapback/platform")',
		);

		// Fix alias mappings in config files
		content = content.replace(
			/["@']@snapback\/platform\/db["@']:\s*path\.resolve\([^)]+\)/g,
			'"@snapback/platform": path.resolve(__dirname, "../platform")',
		);

		// Fix external references in tsup.config.ts
		content = content.replace(/["@']@snapback\/platform\/db["']/g, '"@snapback/platform"');

		// If content changed, write it back
		if (content !== originalContent) {
			fs.writeFileSync(filePath, content, "utf8");
			console.log(`Fixed imports in: ${filePath}`);
			return true;
		}

		return false;
	} catch (error) {
		console.error(`Error processing file ${filePath}:`, error.message);
		return false;
	}
}

// Main function
function main() {
	console.log("Starting import fix process...");

	// Find all .ts and .tsx files
	const files = findFiles(".", [".ts", ".tsx"]);
	console.log(`Found ${files.length} files to process`);

	let fixedCount = 0;

	// Process each file
	files.forEach((filePath) => {
		if (fixImports(filePath)) {
			fixedCount++;
		}
	});

	console.log(`Finished! Fixed imports in ${fixedCount} files.`);
}

main();
