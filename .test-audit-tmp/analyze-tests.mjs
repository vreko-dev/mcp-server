#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const testFilesPath = ".test-audit-tmp/all-test-files.txt";
const outputPath = ".test-audit-tmp/static-metadata.json";

// Read test files list
const testFiles = fs.readFileSync(testFilesPath, "utf-8").split("\n").filter(Boolean);

console.log(`Analyzing ${testFiles.length} test files...`);

const results = [];
let processed = 0;

for (const relPath of testFiles) {
	try {
		const fullPath = path.join(ROOT, relPath);

		// Get file stats
		const stats = fs.statSync(fullPath);
		const content = fs.readFileSync(fullPath, "utf-8");
		const lines = content.split("\n");

		// Detect framework
		let framework = "unknown";
		if (content.includes("@playwright/test")) {
			framework = "playwright";
		} else if (content.includes("vitest")) {
			framework = "vitest";
		} else if (content.includes("@jest")) {
			framework = "jest";
		}

		// Detect test type
		let testType = "unknown";
		if (relPath.includes("/e2e/") || relPath.includes(".e2e.")) {
			testType = "e2e";
		} else if (relPath.includes("/integration/") || relPath.includes(".integration.")) {
			testType = "integration";
		} else if (relPath.includes("/unit/") || relPath.includes(".unit.")) {
			testType = "unit";
		} else if (framework === "playwright") {
			testType = "e2e";
		} else {
			testType = "unit"; // default
		}

		// Count test cases
		const testMatches = content.match(/\b(test|it)\s*\(/g) || [];
		const describeMatches = content.match(/\bdescribe\s*\(/g) || [];
		const skipMatches = content.match(/\b(it\.skip|test\.skip|xit|xdescribe|describe\.skip)\s*\(/g) || [];
		const todoMatches = content.match(/\b(it\.todo|test\.todo)\s*\(/g) || [];

		// Snapshot usage
		const usesSnapshots = content.includes("toMatchSnapshot") || content.includes("toMatchInlineSnapshot");

		// Get git last modified
		let lastModified = null;
		try {
			const gitDate = execSync(`git log -1 --format=%cI -- "${relPath}"`, {
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "ignore"],
			}).trim();
			lastModified = gitDate || stats.mtime.toISOString();
		} catch {
			lastModified = stats.mtime.toISOString();
		}

		// Extract related source files (simple heuristic)
		const importMatches = content.match(/from\s+['"](\.\.?\/[^'"]+)['"]/g) || [];
		const relatedFiles = importMatches
			.map((m) => m.match(/from\s+['"](\.\.?\/[^'"]+)['"]/)?.[1])
			.filter(Boolean)
			.map((importPath) => {
				// Resolve relative to test file directory
				const testDir = path.dirname(fullPath);
				let resolved = path.resolve(testDir, importPath);
				// Add extensions if missing
				if (!path.extname(resolved)) {
					if (fs.existsSync(`${resolved}.ts`)) {
						resolved += ".ts";
					} else if (fs.existsSync(`${resolved}.tsx`)) {
						resolved += ".tsx";
					} else if (fs.existsSync(`${resolved}.js`)) {
						resolved += ".js";
					} else if (fs.existsSync(`${resolved}.jsx`)) {
						resolved += ".jsx";
					}
				}
				return path.relative(ROOT, resolved);
			})
			.filter((p) => fs.existsSync(path.join(ROOT, p)));

		// Feature flags / env
		const hasEnvUsage = content.includes("process.env");

		// Extract test names
		const testCases = [];
		const testRegex = /(?:test|it)\s*\(\s*['"](.*?)['"]/g;
		let match;
		while ((match = testRegex.exec(content)) !== null) {
			testCases.push(match[1]);
		}

		results.push({
			file_path: relPath,
			framework,
			test_type: testType,
			test_count: testMatches.length,
			describe_count: describeMatches.length,
			skipped_or_todo: skipMatches.length + todoMatches.length > 0,
			skip_count: skipMatches.length,
			todo_count: todoMatches.length,
			uses_snapshots: usesSnapshots,
			lines_of_code: lines.length,
			file_size_bytes: stats.size,
			last_modified_iso: lastModified,
			related_source_files: [...new Set(relatedFiles)],
			has_env_usage: hasEnvUsage,
			test_cases: testCases.slice(0, 10), // limit to first 10
			test_cases_total: testCases.length,
		});

		processed++;
		if (processed % 50 === 0) {
			console.log(`  Processed ${processed}/${testFiles.length}...`);
		}
	} catch (error) {
		console.error(`Error processing ${relPath}:`, error.message);
	}
}

console.log(`\nAnalysis complete. Writing results to ${outputPath}...`);
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`Analyzed ${results.length} test files.`);
