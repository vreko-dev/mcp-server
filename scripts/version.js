#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

// Function to update version in package.json
function updateVersion(packagePath, newVersion) {
	try {
		const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
		packageJson.version = newVersion;
		fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
		console.log(`Updated ${packagePath} to version ${newVersion}`);
	} catch (error) {
		console.error(`Error updating ${packagePath}:`, error.message);
	}
}

// Function to get all package.json files in the monorepo
function getAllPackageJsonFiles(rootDir) {
	const packageJsonFiles = [];
	const excludeDirs = ["node_modules", ".git", "dist", "build"];

	function traverseDir(dir) {
		const files = fs.readdirSync(dir);

		files.forEach((file) => {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);

			if (stat.isDirectory() && !excludeDirs.includes(file)) {
				traverseDir(filePath);
			} else if (file === "package.json") {
				packageJsonFiles.push(filePath);
			}
		});
	}

	traverseDir(rootDir);
	return packageJsonFiles;
}

// Main function
function main() {
	const rootDir = process.cwd();
	const newVersion = process.argv[2];

	if (!newVersion) {
		console.error("Please provide a version number as an argument");
		process.exit(1);
	}

	const packageJsonFiles = getAllPackageJsonFiles(rootDir);

	packageJsonFiles.forEach((file) => {
		updateVersion(file, newVersion);
	});

	console.log(`All package.json files updated to version ${newVersion}`);
}

main();
