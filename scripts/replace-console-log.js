#!/usr/bin/env node

// Script to replace console.log statements with structured logger calls
const fs = require("node:fs");
const path = require("node:path");

// Directories to process
const directories = ["apps/web", "apps/vscode", "packages/auth", "packages/database"];

// Files to exclude
const excludePatterns = ["node_modules", "__tests__", ".test.", ".spec.", "dist", ".next"];

// Logger import statement
const loggerImport = "import { logger } from '@snapback/logs';";

// Function to check if file should be processed
function shouldProcessFile(filePath) {
	return (
		!excludePatterns.some((pattern) => filePath.includes(pattern)) &&
		(filePath.endsWith(".ts") || filePath.endsWith(".tsx"))
	);
}

// Function to replace console.log statements
function replaceConsoleLogInFile(filePath) {
	try {
		let content = fs.readFileSync(filePath, "utf8");
		const originalContent = content;

		// Check if file already has logger import
		const hasLoggerImport = content.includes("@snapback/logs");

		// Replace console.log statements
		content = content.replace(/console\.log\(([^)]+)\);/g, "logger.info($1);");
		content = content.replace(/console\.warn\(([^)]+)\);/g, "logger.warn($1);");
		content = content.replace(/console\.error\(([^)]+)\);/g, "logger.error($1);");
		content = content.replace(/console\.debug\(([^)]+)\);/g, "logger.debug($1);");

		// Add logger import if needed and console statements were replaced
		if (!hasLoggerImport && content !== originalContent && content.includes("logger.")) {
			// Find the first import statement and add our import after it
			const importMatch = content.match(/^(import[^;]*;)/m);
			if (importMatch) {
				const insertPosition = importMatch.index + importMatch[0].length;
				content = `${content.slice(0, insertPosition)}\n${loggerImport}${content.slice(insertPosition)}`;
			} else {
				// If no import found, add at the top
				content = `${loggerImport}\n${content}`;
			}
		}

		// Write file if content changed
		if (content !== originalContent) {
			fs.writeFileSync(filePath, content, "utf8");
			console.log(`Updated ${filePath}`);
			return true;
		}

		return false;
	} catch (error) {
		console.error(`Error processing ${filePath}:`, error.message);
		return false;
	}
}

// Function to process directory recursively
function processDirectory(dirPath) {
	let updatedFiles = 0;

	try {
		const items = fs.readdirSync(dirPath);

		for (const item of items) {
			const itemPath = path.join(dirPath, item);

			if (fs.statSync(itemPath).isDirectory()) {
				updatedFiles += processDirectory(itemPath);
			} else if (shouldProcessFile(itemPath)) {
				if (replaceConsoleLogInFile(itemPath)) {
					updatedFiles++;
				}
			}
		}
	} catch (_error) {
		console.error(`Error processing directory ${dirPath}:`, _error.message);
	}

	return updatedFiles;
}

// Main execution
function main() {
	console.log("Replacing console.log statements with structured logger calls...");

	let totalUpdated = 0;

	for (const dir of directories) {
		const fullPath = path.join(__dirname, "..", dir);
		if (fs.existsSync(fullPath)) {
			console.log(`Processing ${dir}...`);
			totalUpdated += processDirectory(fullPath);
		} else {
			console.warn(`Directory ${fullPath} does not exist`);
		}
	}

	console.log(`\nCompleted! Updated ${totalUpdated} files.`);
	console.log("Please review the changes and run tests to ensure functionality is preserved.");
}

main();
