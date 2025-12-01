const fs = require("fs");
const path = require("path");

// Function to recursively find all .ts files in a directory
function findTsFiles(dir, files = []) {
	const entries = fs.readdirSync(dir);
	for (const entry of entries) {
		const entryPath = path.join(dir, entry);
		const stat = fs.statSync(entryPath);
		if (stat.isDirectory()) {
			findTsFiles(entryPath, files);
		} else if (stat.isFile() && entry.endsWith(".ts")) {
			files.push(entryPath);
		}
	}
	return files;
}

// Function to fix import paths in a file
function fixImportPaths(filePath) {
	let content = fs.readFileSync(filePath, "utf8");
	const originalContent = content;

	// Replace @/orpc/procedures with relative path
	content = content.replace(
		/import\s+{([^}]+)}\s+from\s+['"]@\/orpc\/procedures['"]/g,
		'import {$1} from "../../../orpc/procedures"',
	);

	// Write file only if content changed
	if (content !== originalContent) {
		fs.writeFileSync(filePath, content, "utf8");
		console.log(`Fixed imports in: ${filePath}`);
	}
}

// Main execution
const apiDir = path.join(__dirname, "apps", "api", "modules");
const tsFiles = findTsFiles(apiDir);

console.log(`Found ${tsFiles.length} TypeScript files to process...`);

let fixedCount = 0;
for (const file of tsFiles) {
	try {
		fixImportPaths(file);
		fixedCount++;
	} catch (error) {
		console.error(`Error processing ${file}:`, error.message);
	}
}

console.log(`Processed ${fixedCount} files.`);
