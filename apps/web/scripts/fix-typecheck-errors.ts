#!/usr/bin/env ts-node

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

console.log("Fixing TypeScript errors...");

// 1. Fix array access patterns
function fixArrayAccessIssues() {
	console.log("Fixing array access issues...");

	// Fix device-trials.ts
	const deviceTrialsPath = join(__dirname, "..", "services", "device-trials.ts");
	let content = readFileSync(deviceTrialsPath, "utf8");

	// Add guards for array access
	content = content.replace(
		/const existingTrial = existingTrials\[0\];/g,
		'const existingTrial = existingTrials[0];\n\t\tif (!existingTrial) {\n\t\t\tthrow new Error("Device trial not found");\n\t\t}',
	);

	content = content.replace(
		/const apiKey = apiKeyResult\[0\];/g,
		'const apiKey = apiKeyResult[0];\n\t\t\tif (!apiKey) {\n\t\t\t\tthrow new Error("API key not found for existing trial");\n\t\t\t}',
	);

	content = content.replace(
		/const trialInfo = updatedTrial\[0\];/g,
		'const trialInfo = updatedTrial[0];\n\t\t\tif (!trialInfo) {\n\t\t\t\tthrow new Error("Failed to update device trial");\n\t\t\t}',
	);

	content = content.replace(
		/const newApiKey = newApiKeyResult\[0\];/g,
		'const newApiKey = newApiKeyResult[0];\n\t\tif (!newApiKey) {\n\t\t\tthrow new Error("Failed to create API key");\n\t\t}',
	);

	content = content.replace(
		/const newDeviceTrial = newDeviceTrialResult\[0\];/g,
		'const newDeviceTrial = newDeviceTrialResult[0];\n\t\tif (!newDeviceTrial) {\n\t\t\tthrow new Error("Failed to create device trial");\n\t\t}',
	);

	content = content.replace(
		/const deviceTrial = deviceTrialsResult\[0\];/g,
		'const deviceTrial = deviceTrialsResult[0];\n\t\t\tif (!deviceTrial) {\n\t\t\t\tthrow new Error("Device trial not found");\n\t\t\t}',
	);

	writeFileSync(deviceTrialsPath, content);
	console.log("Fixed device-trials.ts");
}

// 2. Fix confetti color issues
function fixConfettiColor() {
	console.log("Fixing confetti color issues...");

	// Fix both confetti files
	const confettiPaths = [
		join(__dirname, "..", "modules", "ui", "components", "magic", "confetti.tsx"),
		join(__dirname, "..", "modules", "ui", "components", "motion", "magic", "confetti.tsx"),
	];

	confettiPaths.forEach((path) => {
		let content = readFileSync(path, "utf8");

		// Add null fallback for color access
		content = content.replace(
			/color: colors\[Math\.floor\(Math\.random\(\) \* colors\.length\)\],/g,
			'color: colors[Math.floor(Math.random() * colors.length)] ?? "#10B981",',
		);

		writeFileSync(path, content);
		console.log(`Fixed ${path}`);
	});
}

// 3. Fix slugify replacement option
function fixSlugify() {
	console.log("Fixing slugify replacement option...");

	const contentPath = join(__dirname, "..", "modules", "shared", "lib", "content.ts");
	let content = readFileSync(contentPath, "utf8");

	// Replace replacement with separator
	content = content.replace(/replacement: "-"/g, 'separator: "-"');

	writeFileSync(contentPath, content);
	console.log("Fixed content.ts");
}

// 4. Fix waitlist route destructuring
function fixWaitlistRoute() {
	console.log("Fixing waitlist route destructuring...");

	const routePath = join(__dirname, "..", "app", "api", "waitlist", "route.ts");
	let content = readFileSync(routePath, "utf8");

	// Fix the destructuring pattern
	content = content.replace(
		/const \[\{ total \}\] = await db\.select\(\{ total: count\(\) \}\)\.from\(waitlistTable\);/g,
		"const countResult = await db.select({ total: count() }).from(waitlistTable);\n\t\tconst total = countResult.length > 0 ? countResult[0].total : 0;",
	);

	// Also fix the second occurrence
	content = content.replace(
		/const \[\{ total \}\] = await db\.select\(\{ total: count\(\) \}\)\.from\(waitlistTable\);/g,
		"const countResult = await db.select({ total: count() }).from(waitlistTable);\n\t\tconst total = countResult.length > 0 ? countResult[0].total : 0;",
	);

	writeFileSync(routePath, content);
	console.log("Fixed waitlist route.ts");
}

// 5. Handle unused variables by commenting them out
function handleUnusedVariables() {
	console.log("Handling unused variables...");
	// This would require a more complex analysis to determine which variables
	// are for future implementation vs. legacy code.
	// For now, we'll focus on the more straightforward fixes above.
	console.log("Unused variable handling requires manual review.");
}

// Run all fixes
fixArrayAccessIssues();
fixConfettiColor();
fixSlugify();
fixWaitlistRoute();
handleUnusedVariables();

console.log("Done! Run pnpm type-check to verify");
