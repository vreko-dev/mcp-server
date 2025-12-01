#!/usr/bin/env tsx
/**
 * Requirements to Tests Mapper for SnapBack Audit
 */

import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";

interface RequirementMapping {
	id: string;
	requirement: string;
	sourceFile: string;
	testFiles: string[];
	status: "covered" | "partial" | "uncovered";
}

interface HeuristicPattern {
	name: string;
	pattern: RegExp;
}

function findDocumentationFiles(): string[] {
	try {
		const cwd = path.resolve(__dirname, "../../");
		const patterns = [
			"docs/**/*.md",
			"README.md",
			"SPEC.md",
			"apps/*/README.md",
			"packages/*/README.md",
			"apps/*/docs/**/*.md",
			"packages/*/docs/**/*.md",
		];

		const allFiles: string[] = [];
		for (const pattern of patterns) {
			const files = glob.sync(pattern, {
				ignore: ["node_modules/**"],
				cwd,
			});
			allFiles.push(...files.map((file) => path.resolve(cwd, file)));
		}

		return allFiles;
	} catch (error) {
		console.error("Error finding documentation files:", error);
		return [];
	}
}

function findTestFiles(): string[] {
	try {
		const cwd = path.resolve(__dirname, "../../");
		const patterns = [
			"test/**/*.{spec,test}.ts",
			"apps/*/test/**/*.{spec,test}.ts",
			"packages/*/test/**/*.{spec,test}.ts",
		];

		const allFiles: string[] = [];
		for (const pattern of patterns) {
			const files = glob.sync(pattern, {
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

function extractRequirementsFromDocs(docFiles: string[]): RequirementMapping[] {
	const requirements: RequirementMapping[] = [];

	// Stricter requirement token patterns - only match explicit REQ-#### format
	const REQ_TOKEN = /\b(REQ-\d{3,5})\b/g;
	const FRONTMATTER_REQ = /reqId:\s*(REQ-\d{3,5})/g;

	docFiles.forEach((file) => {
		try {
			const content = fs.readFileSync(file, "utf-8");

			// Skip MDX/JSX files to avoid UI snippet noise
			if (file.endsWith(".mdx") || file.endsWith(".jsx") || file.endsWith(".tsx")) {
				// Only extract from frontmatter
				const fmMatch = FRONTMATTER_REQ.exec(content);
				if (fmMatch) {
					requirements.push({
						id: fmMatch[1],
						requirement: `Requirement from ${path.basename(file)}`,
						sourceFile: file,
						testFiles: [],
						status: "uncovered",
					});
				}
				return;
			}

			// For markdown files, look for REQ-#### tokens
			if (file.endsWith(".md")) {
				const ids = new Set<string>();

				// Extract from frontmatter
				const fmMatch = FRONTMATTER_REQ.exec(content);
				if (fmMatch) {
					ids.add(fmMatch[1]);
				}

				// Extract inline REQ tokens
				let match;
				while ((match = REQ_TOKEN.exec(content)) !== null) {
					ids.add(match[1]);
				}

				// Find context for each requirement
				ids.forEach((id) => {
					const lines = content.split("\n");
					const lineIndex = lines.findIndex((line) => line.includes(id));
					const context = lineIndex >= 0 ? lines[lineIndex].replace(/[*#\-`]/g, "").trim() : "";

					requirements.push({
						id,
						requirement: context.substring(0, 100) + (context.length > 100 ? "..." : ""),
						sourceFile: file,
						testFiles: [],
						status: "uncovered",
					});
				});
				return;
			}

			// For other files, only extract explicit tokens (no heuristics)
			const lines = content.split("\n");
			lines.forEach((line, _index) => {
				const match = REQ_TOKEN.exec(line);
				if (match) {
					const cleanLine = line.replace(/[*#\-`]/g, "").trim();
					requirements.push({
						id: match[1],
						requirement: cleanLine.substring(0, 100) + (cleanLine.length > 100 ? "..." : ""),
						sourceFile: file,
						testFiles: [],
						status: "uncovered",
					});
				}
			});
		} catch (error) {
			console.warn(`Error processing documentation file ${file}:`, error);
		}
	});

	// Add critical areas that must have tests
	const criticalAreas = ["auth", "snapshot restore", "git dangerous ops (rebase/merge)", "encryption/key handling"];

	criticalAreas.forEach((area) => {
		requirements.push({
			id: `CRITICAL-${area.replace(/\s+/g, "-").toUpperCase()}`,
			requirement: `Critical area: ${area}`,
			sourceFile: "AUDIT_REQUIREMENT",
			testFiles: [],
			status: "uncovered",
		});
	});

	return requirements;
}

function mapTestsToRequirements(requirements: RequirementMapping[], testFiles: string[]): RequirementMapping[] {
	// This is a simplified mapping approach
	// In a real implementation, we would do more sophisticated matching

	return requirements.map((req) => {
		const matchingTests: string[] = [];

		// Simple keyword matching
		const keywords = req.requirement.toLowerCase().split(/\s+/);

		testFiles.forEach((testFile) => {
			try {
				const content = fs.readFileSync(testFile, "utf-8").toLowerCase();

				// Check if any keywords from the requirement appear in the test file
				const hasKeywordMatch = keywords.some((keyword) => keyword.length > 3 && content.includes(keyword));

				if (hasKeywordMatch) {
					matchingTests.push(testFile);
				}
			} catch (error) {
				console.warn(`Error processing test file ${testFile}:`, error);
			}
		});

		return {
			...req,
			testFiles: matchingTests,
			status: matchingTests.length > 0 ? (matchingTests.length >= 2 ? "covered" : "partial") : "uncovered",
		};
	});
}

function generateMappingCSV(mappings: RequirementMapping[], outputPath: string) {
	const csvHeader = "ID,Requirement,SourceFile,TestFiles,Status\n";
	const csvRows = mappings.map((mapping) => {
		const testFiles = mapping.testFiles.join(";").replace(/,/g, "|");
		return `"${mapping.id}","${mapping.requirement.replace(/"/g, '""')}","${mapping.sourceFile}","${testFiles}","${mapping.status}"`;
	});

	const csvContent = csvHeader + csvRows.join("\n");
	fs.writeFileSync(outputPath, csvContent);
	console.log(`📝 Requirements-to-tests mapping saved to: ${outputPath}`);
}

async function generateRequirementsMapping() {
	console.log("🔍 Generating requirements to tests mapping...\n");

	// Find documentation and test files
	const docFiles = findDocumentationFiles();
	const testFiles = findTestFiles();

	console.log(`Found ${docFiles.length} documentation files`);
	console.log(`Found ${testFiles.length} test files\n`);

	// Extract requirements from documentation
	const requirements = extractRequirementsFromDocs(docFiles);
	console.log(`Extracted ${requirements.length} requirements\n`);

	// Map tests to requirements
	const mappings = mapTestsToRequirements(requirements, testFiles);

	// Generate CSV report
	const csvPath = path.resolve(__dirname, "../../test/.audit-reports/requirements_to_tests.csv");
	generateMappingCSV(mappings, csvPath);

	// Print summary
	const covered = mappings.filter((m) => m.status === "covered").length;
	const partial = mappings.filter((m) => m.status === "partial").length;
	const uncovered = mappings.filter((m) => m.status === "uncovered").length;

	console.log("Requirements Coverage Summary:");
	console.log("=============================");
	console.log(`✅ Fully covered: ${covered}`);
	console.log(`🔶 Partially covered: ${partial}`);
	console.log(`❌ Uncovered: ${uncovered}`);
	console.log(`📊 Total: ${mappings.length}\n`);

	if (uncovered > 0) {
		console.log("Uncovered requirements:");
		mappings
			.filter((m) => m.status === "uncovered")
			.forEach((mapping) => {
				console.log(`  - ${mapping.requirement}`);
			});
	}

	return {
		total: mappings.length,
		covered,
		partial,
		uncovered,
		passed: uncovered === 0,
	};
}

// Run the mapping generator
generateRequirementsMapping()
	.then((result) => {
		if (!result.passed) {
			console.log("\n⚠️ Some requirements are not covered by tests");
			// Don't exit with error for this check as it's more of a reporting tool
		}
	})
	.catch((error) => {
		console.error("Error generating requirements mapping:", error);
		process.exit(1);
	});
