import * as fs from "node:fs";
import * as path from "node:path";

interface BiomeIssue {
	filePath: string;
	severity: "error" | "warning" | "information";
	message: string;
	line?: number;
	column?: number;
}

async function createIssuesFromQualityReports() {
	const reportsDir = path.join(process.cwd(), "reports", "quality");

	if (!fs.existsSync(reportsDir)) {
		console.log("ℹ️  No quality reports found");
		return;
	}

	const reportFiles = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".json"));

	if (reportFiles.length === 0) {
		console.log("ℹ️  No quality reports found");
		return;
	}

	const [_owner, _repo] = (process.env.GITHUB_REPOSITORY || "").split("/");

	// Aggregate all warnings
	const allWarnings: BiomeIssue[] = [];

	for (const reportFile of reportFiles) {
		const filePath = path.join(reportsDir, reportFile);
		let content: Record<string, BiomeIssue[]>;

		try {
			content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
		} catch (e) {
			console.warn(`⚠️  Failed to parse ${reportFile}:`, e);
			continue;
		}

		// Extract warnings from Biome JSON output
		for (const [file, diagnostics] of Object.entries(content)) {
			if (Array.isArray(diagnostics)) {
				const warnings = diagnostics
					.filter((d) => d.severity === "warning")
					.map((d) => ({
						...d,
						filePath: file,
					}));

				allWarnings.push(...warnings);
			}
		}
	}

	if (allWarnings.length === 0) {
		console.log("✅ No warnings found");
		return;
	}

	console.log(`📋 Found ${allWarnings.length} warnings`);

	// Group warnings by category/rule
	const groupedWarnings = allWarnings.reduce(
		(acc, warning) => {
			const key = warning.message.split(":")[0];
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(warning);
			return acc;
		},
		{} as Record<string, BiomeIssue[]>,
	);

	// Log grouped warnings for CI visibility
	for (const [category, warnings] of Object.entries(groupedWarnings)) {
		const title = `🧹 Tech Debt: ${category}`;
		console.log(`\n${title}`);
		console.log(`Found ${warnings.length} warnings in this category:`);

		warnings.slice(0, 5).forEach((w) => {
			console.log(`  - ${path.relative(process.cwd(), w.filePath)}: ${w.message}`);
		});

		if (warnings.length > 5) {
			console.log(`  ... and ${warnings.length - 5} more`);
		}
	}

	// If running in GitHub Actions with Octokit, create issues
	if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
		console.log("\n📝 Would create GitHub issues (requires @octokit/action)");
		console.log("To enable, install: pnpm add -D @octokit/action");
	}

	console.log("\n✨ Issue analysis complete");
}

createIssuesFromQualityReports().catch(console.error);
