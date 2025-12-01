#!/usr/bin/env tsx
/**
 * Test Smell Detector for SnapBack Audit
 */

import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";

interface TestSmell {
	name: string;
	pattern: string;
	severity: "error" | "warn";
	ast?: string;
}

interface SmellFinding {
	name: string;
	file: string;
	line: number;
	severity: "error" | "warn";
	message: string;
}

const SMELL_RULES: TestSmell[] = [
	{
		name: "empty test",
		pattern: "it\\((?:.|\\n)*?\\{\\s*\\}",
		severity: "error",
	},
	{
		name: "exclusive tests",
		pattern: "\\.only\\(|\\.skip\\(",
		severity: "error",
	},
	{
		name: "missing assertions",
		pattern: "it\\([^)]*\\)\\s*\\{[^}]*\\}",
		severity: "warn",
	},
];

async function findTestFiles(): Promise<string[]> {
	try {
		const cwd = path.resolve(__dirname, "../../");
		const patterns = [
			"test/**/*.{spec,test}.ts",
			"apps/*/test/**/*.{spec,test}.ts",
			"packages/*/test/**/*.{spec,test}.ts",
		];

		const allFiles: string[] = [];
		for (const pattern of patterns) {
			const files = await glob(pattern, {
				ignore: ["node_modules/**"],
				cwd,
			});
			allFiles.push(...files.map((file) => path.resolve(cwd, file)));
		}

		return allFiles;
	} catch (error) {
		console.error("Error finding test files:", error);
		return [];
	}
}

function detectSmellsInFile(filePath: string): SmellFinding[] {
	const findings: SmellFinding[] = [];

	try {
		const content = fs.readFileSync(filePath, "utf-8");
		const _lines = content.split("\n");

		SMELL_RULES.forEach((rule) => {
			const regex = new RegExp(rule.pattern, "g");
			let match;

			while ((match = regex.exec(content)) !== null) {
				const lineNumber = content.substring(0, match.index).split("\n").length;
				findings.push({
					name: rule.name,
					file: filePath,
					line: lineNumber,
					severity: rule.severity,
					message: `Found ${rule.name} smell`,
				});
			}
		});
	} catch (error) {
		console.error(`Error processing file ${filePath}:`, error);
	}

	return findings;
}

async function runSmellDetection() {
	console.log("🔍 Detecting test smells...\n");

	const testFiles = await findTestFiles();
	console.log(`Found ${testFiles.length} test files\n`);

	const allFindings: SmellFinding[] = [];

	for (const file of testFiles) {
		const findings = detectSmellsInFile(file);
		allFindings.push(...findings);
	}

	// Group findings by severity
	const errors = allFindings.filter((f) => f.severity === "error");
	const warnings = allFindings.filter((f) => f.severity === "warn");

	// Print results
	if (errors.length > 0) {
		console.log("❌ Errors found:");
		errors.forEach((error) => {
			console.log(`  ${error.file}:${error.line} - ${error.message}`);
		});
	}

	if (warnings.length > 0) {
		console.log("\n⚠️ Warnings found:");
		warnings.forEach((warning) => {
			console.log(`  ${warning.file}:${warning.line} - ${warning.message}`);
		});
	}

	if (allFindings.length === 0) {
		console.log("✅ No test smells detected!");
	}

	// Save findings to JSON file
	const outputPath = path.resolve(__dirname, "../../test/.audit-reports/test_smells.json");
	fs.writeFileSync(outputPath, JSON.stringify(allFindings, null, 2));
	console.log(`\n📝 Findings saved to: ${outputPath}`);

	return { errors: errors.length, warnings: warnings.length };
}

// Run the smell detector
runSmellDetection()
	.then((result) => {
		console.log(`\n📊 Summary: ${result.errors} errors, ${result.warnings} warnings`);

		if (result.errors > 0) {
			process.exit(1);
		}
	})
	.catch((error) => {
		console.error("Error running smell detection:", error);
		process.exit(1);
	});
