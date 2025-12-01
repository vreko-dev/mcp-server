#!/usr/bin/env node
/**
 * Fix $1 placeholders left by bad regex replacement
 *
 * This script systematically fixes broken code patterns where "$1" appears
 * instead of properly expanded capture groups.
 */

const fs = require("node:fs");
const path = require("node:path");
const { glob } = require("glob");

// Pattern fixes - ordered by specificity (most specific first)
const fixes = [
	// Database operations
	{ pattern: /\.selec"\$1"/g, replacement: ".select()" },
	{ pattern: /\.inser"\$1"/g, replacement: ".insert" }, // Note: needs table name after
	{ pattern: /\.se"\$1"/g, replacement: ".set({" }, // Partial - context dependent

	// Test patterns
	{
		pattern: /\si"\$1"\s*=>\s*\{/g,
		replacement: ' it("test case", async () => {',
	},
	{
		pattern: /expec"\$1"\.toBe\(/g,
		replacement: "expect(response.status).toBe(",
	},
	{
		pattern: /expec"\$1"\.toMatchObjec"\$1"/g,
		replacement: "expect(data).toMatchObject({",
	},
	{
		pattern: /expec"\$1"\.toBeDefined\(\)/g,
		replacement: "expect(data).toBeDefined()",
	},
	{
		pattern: /expec"\$1"\.toBeNull\(\)/g,
		replacement: "expect(trial.userId).toBeNull()",
	},
	{
		pattern: /expec"\$1"\.toHaveLength\(/g,
		replacement: "expect(trials).toHaveLength(",
	},
	{
		pattern: /expec"\$1"\.toHaveProperty\(/g,
		replacement: "expect(data).toHaveProperty(",
	},
	{
		pattern: /expec"\$1"\.toContain\(/g,
		replacement: "expect(data.errors).toContain(",
	},
	{
		pattern: /expec"\$1"\.toMatch\(/g,
		replacement: "expect(data.apiKey).toMatch(",
	},
	{
		pattern: /expec"\$1"\)\.toBeGreaterThan\(/g,
		replacement: "expect(new Date(data.blockedUntil)).toBeGreaterThan(",
	},
	{
		pattern: /expec"\$1"\.getTime\(\)\)\.toBeGreaterThan\(/g,
		replacement: "expect(new Date(data.blockedUntil).getTime()).toBeGreaterThan(",
	},
	{
		pattern: /findFirs"\$1"/g,
		replacement: "findFirst({ where: eq(deviceTrials.deviceFingerprint, deviceFingerprint) })",
	},

	// Function signatures
	{
		pattern: /async function (\w+)"\$1"/g,
		replacement: "async function $1()",
	},
	{
		pattern: /export async function (\w+)"\$1"/g,
		replacement: "export async function $1()",
	},
	{ pattern: /async (\w+)"\$1":/g, replacement: "async $1(" },
	{ pattern: /trackDeviceEven"\$1"/g, replacement: "trackDeviceEvent" },
	{ pattern: /trackUserEven"\$1"/g, replacement: "trackUserEvent" },
	{ pattern: /captureEven"\$1"/g, replacement: "capture" },
	{
		pattern: /getClientFingerprin"\$1"/g,
		replacement: "getClientFingerprint()",
	},
	{ pattern: /createClien"\$1"/g, replacement: "createClient()" },
	{
		pattern: /updateCheckpointLimi"\$1"/g,
		replacement: "updateCheckpointLimit",
	},
	{ pattern: /trackPaymen"\$1"/g, replacement: "trackPayment" },
	{ pattern: /sendPaymentReceip"\$1"/g, replacement: "sendPaymentReceipt" },
	{ pattern: /suspendAccoun"\$1"/g, replacement: "suspendAccount" },

	// Web API calls
	{ pattern: /\.charCodeA"\$1"/g, replacement: ".charCodeAt(i)" },
	{ pattern: /\.padStar"\$1"/g, replacement: ".padStart(2, '0')" },
	{ pattern: /\.diges"\$1"/g, replacement: ".digest('SHA-256', dataBuffer)" },
	{
		pattern: /Intl\.DateTimeForma"\$1"\.resolvedOptions\(\)\.timeZone/g,
		replacement: "Intl.DateTimeFormat().resolvedOptions().timeZone",
	},
	{
		pattern: /request\.headers\.ge"\$1"/g,
		replacement: "request.headers.get",
	},
	{ pattern: /request\.tex"\$1"/g, replacement: "request.text()" },
	{ pattern: /rese"\$1"/g, replacement: "reset()" },

	// Currency (special case - this is a stub)
	{
		pattern: /return "\$1,000\.00";/g,
		replacement: 'return "$1,000.00"; // Stub implementation',
	},
];

async function fixFile(filePath) {
	let content = fs.readFileSync(filePath, "utf8");
	let modified = false;

	for (const fix of fixes) {
		const before = content;
		content = content.replace(fix.pattern, fix.replacement);
		if (content !== before) {
			modified = true;
		}
	}

	if (modified) {
		fs.writeFileSync(filePath, content, "utf8");
		return true;
	}

	return false;
}

async function main() {
	// Parse CLI arguments
	const args = process.argv.slice(2);
	const patternsArg = args.find((arg) => arg.startsWith("--patterns="));
	const patterns = patternsArg
		? patternsArg.split("=")[1].split(",")
		: ["apps/web/**/*.ts", "apps/web/**/*.tsx", "!apps/web/node_modules/**", "!apps/web/.next/**"];

	const files = await glob(patterns, { absolute: true });
	const filesToFix = [];

	// First pass: identify files with $1 issues
	for (const file of files) {
		const content = fs.readFileSync(file, "utf8");
		if (content.includes("$1")) {
			filesToFix.push(file);
		}
	}

	console.log(`Found ${filesToFix.length} files with $1 issues`);

	let fixedCount = 0;
	for (const file of filesToFix) {
		const wasFixed = await fixFile(file);
		if (wasFixed) {
			fixedCount++;
			console.log(`✓ Fixed: ${path.relative(process.cwd(), file)}`);
		}
	}

	console.log(`\nFixed ${fixedCount} files`);

	// Check if any $1 instances remain
	const remaining = [];
	for (const file of files) {
		const content = fs.readFileSync(file, "utf8");
		if (content.includes("$1")) {
			const lines = content.split("\n");
			lines.forEach((line, idx) => {
				if (line.includes("$1")) {
					remaining.push({
						file,
						line: idx + 1,
						content: line.trim(),
					});
				}
			});
		}
	}

	if (remaining.length > 0) {
		console.log(`\n⚠️  ${remaining.length} instances of $1 still remain:`);
		remaining.slice(0, 10).forEach((r) => {
			console.log(`  ${path.relative(process.cwd(), r.file)}:${r.line} - ${r.content.substring(0, 80)}`);
		});
		if (remaining.length > 10) {
			console.log(`  ... and ${remaining.length - 10} more`);
		}
	} else {
		console.log("\n✅ All $1 instances have been fixed!");
	}

	// Show help if requested
	if (args.includes("--help") || args.includes("-h")) {
		console.log(`
Usage: node fix-dollar-one.js [options]

Options:
  --patterns=<glob>    Comma-separated glob patterns to search (default: apps/web/**/*.ts,apps/web/**/*.tsx,!apps/web/node_modules/**,!apps/web/.next/**)
  --help, -h          Show this help message

Examples:
  node fix-dollar-one.js
  node fix-dollar-one.js --patterns="packages/**/*.ts,!packages/node_modules/**"
		`);
	}
}

main().catch(console.error);
