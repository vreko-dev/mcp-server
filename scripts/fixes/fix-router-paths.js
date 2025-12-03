const fs = require("node:fs");
const path = require("node:path");

// List of router files to fix
const routerFiles = [
	"apps/api/modules/cooldowns/cooldowns-router.ts",
	"apps/api/modules/dashboard/router.ts",
	"apps/api/modules/device-trials/router.ts",
	"apps/api/modules/extension/router.ts",
	"apps/api/modules/privacy/router.ts",
	"apps/api/modules/risk/router.ts",
	"apps/api/modules/rules/router.ts",
	"apps/api/modules/snapshots/snapshots-router.ts",
	"apps/api/modules/storage/router.ts",
];

// Function to fix import paths in router files
function fixRouterPaths(filePath) {
	const fullPath = path.join(__dirname, filePath);
	if (!fs.existsSync(fullPath)) {
		console.log(`File not found: ${fullPath}`);
		return;
	}

	let content = fs.readFileSync(fullPath, "utf8");
	const originalContent = content;

	// Replace "../../../orpc/procedures" with "../../orpc/procedures"
	content = content.replace(
		/import\s+{([^}]+)}\s+from\s+['"]\.\.\/\.\.\/\.\.\/orpc\/procedures['"]/g,
		'import {$1} from "../../orpc/procedures"',
	);

	// Write file only if content changed
	if (content !== originalContent) {
		fs.writeFileSync(fullPath, content, "utf8");
		console.log(`Fixed imports in: ${filePath}`);
	}
}

// Fix all router files
routerFiles.forEach(fixRouterPaths);
console.log("Done fixing router paths.");
