#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

// Function to check for framer-motion in a package.json file
function checkPackageJson(filePath) {
	try {
		const packageJson = JSON.parse(fs.readFileSync(filePath, "utf8"));

		// Check dependencies
		if (packageJson.dependencies?.["framer-motion"]) {
			return true;
		}

		// Check devDependencies
		if (packageJson.devDependencies?.["framer-motion"]) {
			return true;
		}

		return false;
	} catch (error) {
		console.error(`Error reading ${filePath}:`, error.message);
		return false;
	}
}

// Find all package.json files in the monorepo
function findPackageJsonFiles(dir) {
	const packageJsonFiles = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (
			entry.isDirectory() &&
			entry.name !== "node_modules" &&
			entry.name !== ".git" &&
			entry.name !== ".snapback"
		) {
			packageJsonFiles.push(...findPackageJsonFiles(fullPath));
		} else if (entry.name === "package.json") {
			packageJsonFiles.push(fullPath);
		}
	}

	return packageJsonFiles;
}

// Main function
function main() {
	const packageJsonFiles = findPackageJsonFiles(process.cwd());
	const filesWithFramerMotion = [];

	for (const file of packageJsonFiles) {
		if (checkPackageJson(file)) {
			filesWithFramerMotion.push(file);
		}
	}

	if (filesWithFramerMotion.length > 0) {
		console.error("❌ framer-motion detected in the following package.json files:");
		filesWithFramerMotion.forEach((file) => console.error(`  - ${file}`));
		console.error("");
		console.error("⚠️  framer-motion is deprecated. Use 'motion/react' instead.");
		console.error("   See: https://motion.dev/guides/migrate-from-framer-motion");
		console.error("");
		process.exit(1);
	}

	console.log("✅ No framer-motion dependencies found");
}

main();
