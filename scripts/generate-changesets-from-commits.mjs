#!/usr/bin/env node

/**
 * Generate Changesets from Recent Git Commits
 *
 * This script:
 * 1. Analyzes recent commits using conventional commit messages
 * 2. Determines which packages were affected
 * 3. Creates .changeset/*.md files with version bump intent
 * 4. Uses Pattern Memory messaging for changeset descriptions
 *
 * Usage:
 *   node scripts/generate-changesets-from-commits.mjs [--since HEAD~20]
 *   node scripts/generate-changesets-from-commits.mjs --interactive
 *
 * Then run:
 *   pnpm version-packages    # Apply version bumps
 *   pnpm release             # Publish to npm
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHANGESETS_DIR = path.join(ROOT, ".changeset");

const log = {
	info: (msg) => console.log(`ℹ️  ${msg}`),
	success: (msg) => console.log(`✅ ${msg}`),
	error: (msg) => console.error(`❌ ${msg}`),
	warn: (msg) => console.log(`⚠️  ${msg}`),
};

/**
 * Parse git log to extract affected packages and commit types
 */
function getCommitsAffectingPackages(since = "HEAD~30") {
	const commitLog = execSync(`git log ${since} --format="%h %s" --name-only`, {
		cwd: ROOT,
		encoding: "utf-8",
	});

	const commits = [];
	const lines = commitLog.split("\n");

	let currentCommit = null;

	for (const line of lines) {
		if (line.match(/^[a-f0-9]{7} (feat|fix|refactor|chore|docs|perf|test|ci)(\(.+\))?:/)) {
			if (currentCommit) {
				commits.push(currentCommit);
			}

			const match = line.match(/^([a-f0-9]{7}) (feat|fix|refactor|chore|docs)(\((.+?)\))?:\s*(.+)/);
			if (match) {
				currentCommit = {
					hash: match[1],
					type: match[2], // feat, fix, refactor, etc.
					scope: match[4] || "",
					message: match[5],
					files: [],
				};
			}
		} else if (line && currentCommit && (line.startsWith("packages") || line.startsWith("apps"))) {
			currentCommit.files.push(line);
		}
	}

	if (currentCommit) {
		commits.push(currentCommit);
	}

	return commits;
}

/**
 * Determine affected packages from commit files
 */
function extractAffectedPackages(commits) {
	const packageMap = new Map();

	for (const commit of commits) {
		// Skip docs-only commits
		if (commit.type === "docs" && commit.files.every((f) => f.includes("docs") || f.includes("README"))) {
			continue;
		}

		// Extract package names from file paths
		const affectedPkgs = new Set();

		for (const file of commit.files) {
			const match = file.match(/^(packages-oss|packages)\/([^/]+)\//);
			if (match) {
				const pkgType = match[1]; // 'packages' or 'packages-oss'
				const pkgName = match[2]; // package name

				affectedPkgs.add({
					type: pkgType,
					name: pkgName,
					full: pkgType === "packages-oss" ? `@snapback-oss/${pkgName}` : `@snapback/${pkgName}`,
				});
			}
		}

		for (const pkg of affectedPkgs) {
			if (!packageMap.has(pkg.full)) {
				packageMap.set(pkg.full, {
					commits: [],
					bumpType: "patch", // Default
				});
			}

			packageMap.get(pkg.full).commits.push({
				type: commit.type,
				message: commit.message,
				hash: commit.hash,
			});

			// Determine version bump type based on commit type
			const current = packageMap.get(pkg.full).bumpType;
			const precedence = { patch: 0, minor: 1, major: 2 };
			const newBump = commit.type === "feat" ? "minor" : commit.type === "fix" ? "patch" : "patch";

			if (precedence[newBump] > precedence[current]) {
				packageMap.get(pkg.full).bumpType = newBump;
			}
		}
	}

	return packageMap;
}

/**
 * Generate Pattern Memory-focused changelog entry
 */
function generateChangesetDescription(_pkg, data) {
	const commits = data.commits;
	const hasFeat = commits.some((c) => c.type === "feat");
	const hasFix = commits.some((c) => c.type === "fix");
	const hasRefactor = commits.some((c) => c.type === "refactor");

	let description = "";

	if (hasFeat) {
		description += `- ${commits.find((c) => c.type === "feat")?.message || "Added new features"}\n`;
	}

	if (hasRefactor) {
		description += "- Code consolidation and messaging alignment with Pattern Memory narrative\n";
	}

	if (hasFix) {
		const fixes = commits.filter((c) => c.type === "fix").map((c) => c.message);
		for (const fix of fixes) {
			description += `- Fixed: ${fix}\n`;
		}
	}

	return description.trim();
}

/**
 * Create changeset files
 */
function createChangesets(packageMap) {
	mkdirSync(CHANGESETS_DIR, { recursive: true });

	const changesetFiles = [];

	for (const [pkgName, data] of packageMap.entries()) {
		// Generate unique ID for changeset
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 7);
		const changesetId = `${timestamp}-${random}`;

		const changesetPath = path.join(CHANGESETS_DIR, `${changesetId}.md`);

		const description = generateChangesetDescription(pkgName, data);

		const content = `---
"${pkgName}": ${data.bumpType}
---

${description}
`;

		writeFileSync(changesetPath, content, "utf-8");
		changesetFiles.push(changesetPath);

		log.success(`Created changeset: ${changesetId}.md for ${pkgName} (${data.bumpType})`);
	}

	return changesetFiles;
}

/**
 * Main function
 */
async function main() {
	try {
		log.info("🔄 Analyzing recent commits...");

		const commits = getCommitsAffectingPackages();

		if (commits.length === 0) {
			log.warn("No commits found matching conventional commit format");
			process.exit(0);
		}

		log.info(`Found ${commits.length} relevant commits`);

		const packageMap = extractAffectedPackages(commits);

		if (packageMap.size === 0) {
			log.warn("No packages affected by commits");
			process.exit(0);
		}

		log.info(`\n📦 Affected packages (${packageMap.size}):`);
		for (const [pkg, data] of packageMap.entries()) {
			log.info(`  ${pkg} → ${data.bumpType}`);
		}

		log.info("\n📝 Creating changesets...");
		const files = createChangesets(packageMap);

		log.info("");
		log.success(`Generated ${files.length} changesets`);

		log.info("\n🚀 Next steps:");
		log.info("1. Review the changesets in .changeset/");
		log.info("2. Run: pnpm version-packages");
		log.info("3. Run: git add CHANGELOG.md package.json");
		log.info("4. Run: git commit -m 'chore: apply version bumps'");
		log.info("5. Run: pnpm release");

		process.exit(0);
	} catch (error) {
		log.error(`Failed: ${error.message}`);
		process.exit(1);
	}
}

main();
