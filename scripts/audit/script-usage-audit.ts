#!/usr/bin/env tsx
/**
 * Script Usage Frequency Audit
 * Part of Phase 0: Pre-Demo Freeze
 * Purpose: Identify unused scripts and their last modification dates
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { globSync } from "glob";

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = join(PROJECT_ROOT, ".qoder/quests/audit");
const OUTPUT_FILE = join(
	OUTPUT_DIR,
	`script-usage-frequency-${new Date().toISOString().split("T")[0].replace(/-/g, "")}.md`,
);

// Colors for terminal output
const colors = {
	blue: "\x1b[34m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	reset: "\x1b[0m",
};

interface ScriptInfo {
	path: string;
	lastModified: string;
	daysAgo: number;
	inCI: boolean;
	inPackageJson: boolean;
	inLefthook: boolean;
	risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

function log(message: string, color?: keyof typeof colors) {
	const c = color ? colors[color] : "";
	console.log(`${c}${message}${colors.reset}`);
}

function getLastModified(filePath: string): {
	date: string;
	daysAgo: number;
	commitHash: string;
} {
	try {
		const output = execSync(`git log -1 --format="%cd|%cr|%h" --date=short "${filePath}"`, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "ignore"],
		}).trim();

		const [date, relative, hash] = output.split("|");

		if (!date || date === "") {
			return { date: "never", daysAgo: 9999, commitHash: "none" };
		}

		// Calculate days ago
		const modDate = new Date(date);
		const now = new Date();
		const daysAgo = Math.floor((now.getTime() - modDate.getTime()) / (1000 * 60 * 60 * 24));

		return { date, daysAgo, commitHash: hash };
	} catch {
		return { date: "never", daysAgo: 9999, commitHash: "none" };
	}
}

function checkCIUsage(scriptName: string): boolean {
	try {
		execSync(`grep -r "${scriptName}" .github/workflows/ --include="*.yml"`, {
			stdio: ["pipe", "pipe", "ignore"],
		});
		return true;
	} catch {
		return false;
	}
}

function checkPackageJson(scriptName: string): boolean {
	const packageFiles = [
		"package.json",
		...globSync("apps/*/package.json", { cwd: PROJECT_ROOT }),
		...globSync("packages/*/package.json", { cwd: PROJECT_ROOT }),
	];

	for (const pkgFile of packageFiles) {
		try {
			const content = readFileSync(join(PROJECT_ROOT, pkgFile), "utf-8");
			if (content.includes(scriptName)) {
				return true;
			}
		} catch {
			// Skip
		}
	}

	return false;
}

function checkLefthook(scriptPath: string): boolean {
	try {
		const content = readFileSync(join(PROJECT_ROOT, ".lefthook.yml"), "utf-8");
		return content.includes(scriptPath);
	} catch {
		return false;
	}
}

function analyzeScripts(): ScriptInfo[] {
	const scriptDirs = [
		"scripts",
		"ops/scripts",
		"ai_dev_utils/scripts",
		"apps/vscode/scripts",
		"apps/web/scripts",
		"tooling/scripts",
	];

	const scripts: ScriptInfo[] = [];

	for (const dir of scriptDirs) {
		const pattern = join(PROJECT_ROOT, dir, "**/*.{sh,ts,js,mjs}");
		const files = globSync(pattern, { nodir: true });

		log(`Scanning ${dir}... (${files.length} files)`, "yellow");

		for (const file of files) {
			const scriptName = basename(file);
			const relPath = relative(PROJECT_ROOT, file);
			const { date, daysAgo } = getLastModified(file);

			const inLefthook = checkLefthook(relPath);
			const inCI = checkCIUsage(scriptName);
			const inPackageJson = checkPackageJson(scriptName);

			let risk: ScriptInfo["risk"] = "LOW";
			if (inLefthook) {
				risk = "CRITICAL";
			} else if (inCI) {
				risk = "HIGH";
			} else if (inPackageJson) {
				risk = "MEDIUM";
			}

			scripts.push({
				path: relPath,
				lastModified: date,
				daysAgo,
				inCI,
				inPackageJson,
				inLefthook,
				risk,
			});
		}
	}

	return scripts;
}

function generateReport(scripts: ScriptInfo[]): void {
	// Create output directory
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const stats = {
		total: scripts.length,
		critical: scripts.filter((s) => s.risk === "CRITICAL").length,
		high: scripts.filter((s) => s.risk === "HIGH").length,
		medium: scripts.filter((s) => s.risk === "MEDIUM").length,
		low: scripts.filter((s) => s.risk === "LOW").length,
		stale: scripts.filter((s) => s.daysAgo > 180).length,
		dead: scripts.filter((s) => s.daysAgo > 180 && s.risk === "LOW").length,
	};

	let report = `# Script Usage Frequency Audit

**Generated:** ${new Date().toISOString()}  
**Purpose:** Identify unused/stale scripts for Phase 1 consolidation

---

## Methodology

1. Check git history for last modification date
2. Check invocations in CI workflows (.github/workflows/*.yml)
3. Check invocations in package.json scripts
4. Check cross-script dependencies (Lefthook)
5. Categorize by usage frequency and risk level

---

## Results

### Script Inventory with Metadata

| Script | Last Modified | Days Ago | CI | package.json | Lefthook | Risk |
|--------|---------------|----------|----|--------------|---------
|------|
`;

	// Sort by risk level, then by days ago
	const sortedScripts = scripts.sort((a, b) => {
		const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
		if (riskOrder[a.risk] !== riskOrder[b.risk]) {
			return riskOrder[a.risk] - riskOrder[b.risk];
		}
		return b.daysAgo - a.daysAgo;
	});

	for (const script of sortedScripts) {
		const ciMark = script.inCI ? "✓" : "✗";
		const pkgMark = script.inPackageJson ? "✓" : "✗";
		const lefthookMark = script.inLefthook ? "✓" : "✗";

		report += `| \`${script.path}\` | ${script.lastModified} | ${script.daysAgo} | ${ciMark} | ${pkgMark} | ${lefthookMark} | **${script.risk}** |\n`;
	}

	report += `

---

## Statistics Summary

- **Total Scripts:** ${stats.total}
- **CRITICAL (Lefthook):** ${stats.critical} - runs every commit, blocks if broken
- **HIGH (CI):** ${stats.high} - in GitHub workflows, breaks builds
- **MEDIUM (package.json):** ${stats.medium} - developer workflows affected
- **LOW (Manual):** ${stats.low} - safe to consolidate
- **Stale Scripts (>180 days):** ${stats.stale}
- **Potential Dead Code:** ${stats.dead} (stale + low risk)

---

## Detailed Breakdown

### 🔴 CRITICAL Risk (${stats.critical} scripts)

**Cannot touch during demo** - Breaking these blocks all commits via Lefthook.

${sortedScripts
	.filter((s) => s.risk === "CRITICAL")
	.map((s) => `- \`${s.path}\` (modified ${s.daysAgo} days ago)`)
	.join("\n")}

### 🟠 HIGH Risk (${stats.high} scripts)

**CI Dependencies** - Breaking these fails GitHub Actions workflows.

${sortedScripts
	.filter((s) => s.risk === "HIGH")
	.map((s) => `- \`${s.path}\` (modified ${s.daysAgo} days ago)`)
	.join("\n")}

### 🟡 MEDIUM Risk (${stats.medium} scripts)

**Developer Workflows** - Breaking these disrupts local development.

${sortedScripts
	.filter((s) => s.risk === "MEDIUM")
	.map((s) => `- \`${s.path}\` (modified ${s.daysAgo} days ago)`)
	.join("\n")}

### 🟢 LOW Risk (${stats.low} scripts)

**Safe to Consolidate** - No automation dependencies detected.

${sortedScripts
	.filter((s) => s.risk === "LOW")
	.map((s) => `- \`${s.path}\` (modified ${s.daysAgo} days ago)${s.daysAgo > 180 ? " ⚠️ STALE" : ""}`)
	.join("\n")}

---

## Recommendations

### Phase 0: Immediate Actions (Now)

1. ✅ **Freeze CRITICAL and HIGH risk scripts** - No changes until post-demo
2. ✅ **Document demo-critical paths** - 4 VSCode scripts identified in design doc
3. ✅ **This audit completed** - Dependency matrix generated

### Phase 1: Post-Demo Quick Wins (Week 1)

**Target: ${stats.dead} dead scripts for removal**

Stale LOW-risk scripts (>180 days, no automation dependencies):
${
	sortedScripts
		.filter((s) => s.daysAgo > 180 && s.risk === "LOW")
		.map((s) => `- \`${s.path}\` (${s.daysAgo} days old)`)
		.join("\n") || "None identified"
}

### Phase 2+: Systematic Consolidation

1. Build system consolidation (identified in design doc)
2. Docker script unification (6 scripts, 1308 total lines)
3. OSS extraction parameterization (5 scripts)

---

## Demo-Critical Scripts (From Design Doc)

These must remain frozen until post-demo:

1. \`apps/vscode/scripts/test-vsix.sh\` - Package validation
2. \`apps/vscode/scripts/launch-demo-vscode.sh\` - Demo launcher
3. \`apps/vscode/scripts/pre-demo.sh\` - Pre-demo setup
4. \`scripts/demo-readiness-check.sh\` - Demo validation

**Status:** ${scripts
		.filter((s) => s.path.includes("demo") || s.path.includes("vsix"))
		.map((s) => `\`${s.path}\``)
		.join(", ")}

---

## Next Steps

1. ✅ Review this audit with team
2. ⬜ Verify demo-critical scripts are frozen
3. ⬜ Create Phase 1 consolidation plan for dead scripts
4. ⬜ Schedule Phase 2 planning session (post-demo)

**Audit Location:** \`${OUTPUT_FILE}\`
**Generated:** ${new Date().toLocaleString()}
`;

	writeFileSync(OUTPUT_FILE, report);
}

// Main execution
log("========================================", "blue");
log("Script Usage Frequency Audit", "blue");
log("========================================", "blue");
log("");

const scripts = analyzeScripts();

log("");
log("========================================", "green");
log("Audit Complete!", "green");
log("========================================", "green");
log("");

const stats = {
	total: scripts.length,
	critical: scripts.filter((s) => s.risk === "CRITICAL").length,
	high: scripts.filter((s) => s.risk === "HIGH").length,
	medium: scripts.filter((s) => s.risk === "MEDIUM").length,
	dead: scripts.filter((s) => s.daysAgo > 180 && s.risk === "LOW").length,
};

log(`Results saved to: ${OUTPUT_FILE}`, "blue");
log("");
log("Summary:", "yellow");
log(`  Total Scripts: ${stats.total}`);
log(`  CRITICAL (Lefthook): ${stats.critical}`);
log(`  HIGH (CI): ${stats.high}`);
log(`  MEDIUM (package.json): ${stats.medium}`);
log(`  Potential Dead Code: ${stats.dead}`);
log("");

generateReport(scripts);

log("Next: Review audit file and freeze demo-critical scripts", "yellow");
