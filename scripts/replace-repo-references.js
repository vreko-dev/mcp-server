const fs = require("node:fs");
const path = require("node:path");

// Function to replace @repo references with @snapback
function replaceRepoReferences(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");

		// Skip node_modules and .next directories
		if (filePath.includes("node_modules") || filePath.includes(".next") || filePath.includes(".archive")) {
			return;
		}

		// Check if file contains @repo references
		if (content.includes("@repo/")) {
			console.log(`Processing: ${filePath}`);

			// Replace all @repo/ with @snapback/
			const updatedContent = content.replace(/@repo\//g, "@snapback/");

			// Write the updated content back to the file
			fs.writeFileSync(filePath, updatedContent, "utf8");
			console.log(`Updated: ${filePath}`);
		}
	} catch (error) {
		console.error(`Error processing ${filePath}:`, error.message);
	}
}

// Function to recursively process directories
function processDirectory(dirPath) {
	try {
		const items = fs.readdirSync(dirPath);

		items.forEach((item) => {
			const itemPath = path.join(dirPath, item);

			// Skip node_modules, .next, and .archive directories
			if (item === "node_modules" || item === ".next" || item === ".archive" || item === "clients") {
				return;
			}

			const stat = fs.statSync(itemPath);

			if (stat.isDirectory()) {
				processDirectory(itemPath);
			} else if (
				stat.isFile() &&
				(item.endsWith(".ts") || item.endsWith(".tsx") || item.endsWith(".js") || item.endsWith(".jsx"))
			) {
				replaceRepoReferences(itemPath);
			}
		});
	} catch (error) {
		console.error(`Error processing directory ${dirPath}:`, error.message);
	}
}

// Start processing from the root directory
console.log("Starting to replace @repo/ references with @snapback/");
processDirectory(".");
console.log("Finished replacing @repo/ references with @snapback/");
