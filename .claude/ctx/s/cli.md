# SnapBack CLI Specification

## Phase 2: Git Hooks & CI/CD Integration

**Version:** 1.0  
**Implementation Time:** 3-4 days  
**Stack:** TypeScript, Commander.js, Simple Git

---

## Executive Summary

The SnapBack CLI extends safety protection beyond the IDE into git workflows and CI/CD pipelines. While the IDE extension provides real-time protection during coding, the CLI acts as a safety gate before code enters the repository or production.

### Core Value Proposition

**Primary Use Cases:**

1. **Pre-commit Hooks**: Block risky AI-generated code before commits
2. **Pre-push Hooks**: Final safety check before code leaves local machine
3. **CI/CD Pipeline**: Automated safety scanning in GitHub Actions/GitLab CI
4. **Batch Analysis**: Scan entire repos or branches for AI safety issues

### ROI vs Complexity

| Feature              | Complexity | ROI    | Priority |
| -------------------- | ---------- | ------ | -------- |
| Git pre-commit hooks | Low        | High   | Phase 2  |
| CI/CD integration    | Low        | High   | Phase 2  |
| Batch scanning       | Medium     | Medium | Phase 2  |
| Report generation    | Low        | Medium | Phase 2  |
| Terminal UI          | Low        | Low    | Phase 3  |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
│                                                              │
│  git add .  →  git commit  →  git push  →  CI/CD Pipeline  │
│                     ↓              ↓              ↓          │
│              [pre-commit]   [pre-push]    [pipeline check]  │
└────────────────────┬─────────────┬──────────────┬───────────┘
                     │             │              │
                     ├─────────────┴──────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                   SnapBack CLI                                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Git Hooks   │  │  Scanner     │  │  Reporter    │     │
│  │  Manager     │  │  Engine      │  │  Generator   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         └────────────────┬┴────────────────┬─┘             │
│                    ┌─────▼─────────────────▼──┐            │
│                    │   SnapBack API Client   │            │
│                    └─────────────────────────┬─┘            │
└──────────────────────────────────────────────┼──────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────┐
│              SnapBack Backend (Next.js)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## CLI Commands

### Core Commands

```bash
# Initialize SnapBack in project
snapback init

# Scan staged changes (for pre-commit hook)
snapback scan --staged

# Scan entire branch
snapback scan --branch main

# Scan specific files
snapback scan src/**/*.ts

# Install git hooks
snapback hooks install

# Uninstall git hooks
snapback hooks uninstall

# Generate safety report
snapback report --output ./snapback-report.html

# Check CI/CD configuration
snapback ci check

# Show current safety status
snapback status
```

### Command Details

```bash
# 1. Initialize
$ snapback init
✓ Created .snapback/config.json
✓ Detected project type: TypeScript/Node.js
✓ Configured safety rules
✓ Ready to install hooks (run: snapback hooks install)

# 2. Scan staged changes
$ snapback scan --staged
Scanning 3 staged files...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ src/utils/validation.ts    [SAFE]
⚠ src/api/userService.ts     [MEDIUM RISK]
  - Line 42: Removed input validation
  - Recommendation: Review before committing

🚨 src/config/database.ts     [HIGH RISK]
  - Line 15: Hardcoded credentials detected
  - Action: BLOCK commit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Results: 1 safe, 1 warning, 1 blocked
⛔ Commit blocked due to HIGH RISK changes

# 3. Install hooks
$ snapback hooks install
✓ Installed pre-commit hook
✓ Installed pre-push hook
Git hooks active! SnapBack will now protect your commits.

# 4. Generate report
$ snapback report --output ./report.html
Analyzing repository...
✓ Scanned 42 files
✓ Found 3 AI-generated sections
✓ Detected 1 potential vulnerability
✓ Report saved: ./report.html
```

---

## Implementation

### Project Structure

```
snapback-cli/
├── src/
│   ├── cli.ts                    # Main CLI entry point
│   ├── commands/
│   │   ├── init.ts              # Initialize project
│   │   ├── scan.ts              # Scan files/changes
│   │   ├── hooks.ts             # Git hooks management
│   │   ├── report.ts            # Generate reports
│   │   ├── status.ts            # Show status
│   │   └── ci.ts                # CI/CD helpers
│   ├── scanner/
│   │   ├── git-scanner.ts       # Scan git changes
│   │   ├── file-scanner.ts      # Scan files
│   │   └── ai-detector.ts       # Detect AI code
│   ├── hooks/
│   │   ├── pre-commit.ts        # Pre-commit hook script
│   │   ├── pre-push.ts          # Pre-push hook script
│   │   └── hook-manager.ts      # Install/uninstall hooks
│   ├── reporters/
│   │   ├── console-reporter.ts  # Terminal output
│   │   ├── html-reporter.ts     # HTML reports
│   │   └── json-reporter.ts     # JSON output
│   ├── client/
│   │   └── api-client.ts        # SnapBack API client
│   └── utils/
│       ├── config.ts            # Configuration management
│       └── git.ts               # Git utilities
├── templates/
│   ├── pre-commit.sh            # Pre-commit hook template
│   ├── pre-push.sh              # Pre-push hook template
│   └── report.html              # HTML report template
├── package.json
├── tsconfig.json
└── README.md
```

### Main CLI Entry Point

```typescript
// src/cli.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { hooksCommand } from './commands/hooks.js';
import { reportCommand } from './commands/report.js';
import { statusCommand } from './commands/status.js';
import { ciCommand } from './commands/ci.js';

const program = new Command();

program
  .name('snapback')
  .description('SnapBack CLI - AI safety for your codebase')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize SnapBack in your project')
  .action(initCommand);

program
  .command('scan')
  .description('Scan files for AI safety issues')
  .option('--staged', 'Scan only staged files')
  .option('--branch <name>', 'Scan specific branch')
  .option('--files <pattern>', 'Scan specific files')
  .option('--json', 'Output as JSON')
  .action(scanCommand);

program
  .command('hooks')
  .description('Manage git hooks')
  .argument('<action>', 'install or uninstall')
  .action(hooksCommand);

program
  .command('report')
  .description('Generate safety report')
  .option('-o, --output <file>', 'Output file', './snapback-report.html')
  .option('--format <type>', 'Report format (html, json)', 'html')
  .action(reportCommand);

program
  .command('status')
  .description('Show current safety status')
  .action(statusCommand);

program
  .command('ci')
  .description('CI/CD integration helpers')
  .argument('<action>', 'check or setup')
  .action(ciCommand);

program.parse();
```

### Scan Command

```typescript
// src/commands/scan.ts
import chalk from "chalk";
import ora from "ora";
import { GitScanner } from "../scanner/git-scanner.js";
import { ConsoleReporter } from "../reporters/console-reporter.js";
import { loadConfig } from "../utils/config.js";

export async function scanCommand(options: any) {
	const spinner = ora("Scanning files...").start();

	try {
		const config = await loadConfig();
		const scanner = new GitScanner(config);

		let files: string[];

		if (options.staged) {
			files = await scanner.getStagedFiles();
		} else if (options.branch) {
			files = await scanner.getBranchFiles(options.branch);
		} else if (options.files) {
			files = await scanner.getMatchingFiles(options.files);
		} else {
			files = await scanner.getAllTrackedFiles();
		}

		spinner.text = `Scanning ${files.length} files...`;

		const results = await scanner.scanFiles(files);

		spinner.stop();

		// Report results
		const reporter = new ConsoleReporter();
		reporter.report(results);

		// Exit with error code if high-risk issues found
		const hasHighRisk = results.some(
			(r) => r.riskLevel === "high" || r.riskLevel === "critical"
		);

		if (hasHighRisk) {
			console.log(
				chalk.red("\n⛔ Scan blocked due to HIGH RISK changes")
			);
			process.exit(1);
		}

		if (options.json) {
			console.log(JSON.stringify(results, null, 2));
		}
	} catch (error) {
		spinner.fail("Scan failed");
		console.error(chalk.red(error.message));
		process.exit(1);
	}
}
```

### Git Scanner

```typescript
// src/scanner/git-scanner.ts
import simpleGit, { SimpleGit } from "simple-git";
import { SnapBackAPIClient } from "../client/api-client.js";
import { AIDetector } from "./ai-detector.js";

interface ScanResult {
	file: string;
	riskLevel: "safe" | "low" | "medium" | "high" | "critical";
	issues: Array<{
		line: number;
		message: string;
		severity: string;
	}>;
	isAIGenerated: boolean;
}

export class GitScanner {
	private git: SimpleGit;
	private apiClient: SnapBackAPIClient;
	private aiDetector: AIDetector;

	constructor(config: any) {
		this.git = simpleGit();
		this.apiClient = new SnapBackAPIClient(config.apiUrl, config.apiKey);
		this.aiDetector = new AIDetector();
	}

	async getStagedFiles(): Promise<string[]> {
		const status = await this.git.status();
		return status.staged;
	}

	async getBranchFiles(branch: string): Promise<string[]> {
		const diff = await this.git.diff(["--name-only", `${branch}...HEAD`]);
		return diff.split("\n").filter((f) => f.length > 0);
	}

	async getAllTrackedFiles(): Promise<string[]> {
		const files = await this.git.raw(["ls-files"]);
		return files.split("\n").filter((f) => f.length > 0);
	}

	async getMatchingFiles(pattern: string): Promise<string[]> {
		const allFiles = await this.getAllTrackedFiles();
		// Use glob pattern matching
		return allFiles.filter((f) => this.matchesPattern(f, pattern));
	}

	async scanFiles(files: string[]): Promise<ScanResult[]> {
		const results: ScanResult[] = [];

		for (const file of files) {
			// Get file content and diff
			const content = await this.getFileContent(file);
			const diff = await this.getFileDiff(file);

			// Detect if AI-generated
			const isAIGenerated = await this.aiDetector.isAIGenerated(diff);

			// Analyze with SnapBack API
			const analysis = await this.apiClient.analyzeFast({
				code: content,
				filePath: file,
				context: {
					diff,
					isAIGenerated,
				},
			});

			results.push({
				file,
				riskLevel: analysis.riskLevel,
				issues: analysis.issues,
				isAIGenerated,
			});
		}

		return results;
	}

	private async getFileContent(file: string): Promise<string> {
		return await this.git.show([`HEAD:${file}`]);
	}

	private async getFileDiff(file: string): Promise<string> {
		return await this.git.diff(["--cached", file]);
	}

	private matchesPattern(file: string, pattern: string): boolean {
		// Simple glob pattern matching
		const regex = new RegExp(
			pattern.replace(/\*/g, ".*").replace(/\?/g, ".")
		);
		return regex.test(file);
	}
}
```

### Hooks Manager

```typescript
// src/hooks/hook-manager.ts
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export class HookManager {
	private hooksDir: string;

	constructor() {
		this.hooksDir = path.join(process.cwd(), ".git", "hooks");
	}

	async install() {
		// Pre-commit hook
		await this.installHook("pre-commit", this.getPreCommitScript());
		console.log(chalk.green("✓ Installed pre-commit hook"));

		// Pre-push hook
		await this.installHook("pre-push", this.getPrePushScript());
		console.log(chalk.green("✓ Installed pre-push hook"));

		console.log(
			chalk.green(
				"\nGit hooks active! SnapBack will now protect your commits."
			)
		);
	}

	async uninstall() {
		await this.removeHook("pre-commit");
		await this.removeHook("pre-push");

		console.log(chalk.yellow("✓ Git hooks removed"));
	}

	private async installHook(name: string, script: string) {
		const hookPath = path.join(this.hooksDir, name);

		// Backup existing hook if present
		if (await fs.pathExists(hookPath)) {
			await fs.move(hookPath, `${hookPath}.backup`);
		}

		// Write new hook
		await fs.writeFile(hookPath, script, { mode: 0o755 });
	}

	private async removeHook(name: string) {
		const hookPath = path.join(this.hooksDir, name);

		if (await fs.pathExists(hookPath)) {
			await fs.remove(hookPath);
		}

		// Restore backup if exists
		const backupPath = `${hookPath}.backup`;
		if (await fs.pathExists(backupPath)) {
			await fs.move(backupPath, hookPath);
		}
	}

	private getPreCommitScript(): string {
		return `#!/bin/sh
# SnapBack pre-commit hook

echo "🔍 SnapBack: Scanning staged changes..."

npx snapback scan --staged

if [ $? -ne 0 ]; then
  echo "❌ SnapBack: Commit blocked due to safety issues"
  echo "   Review the issues above or use 'git commit --no-verify' to bypass"
  exit 1
fi

echo "✅ SnapBack: All checks passed"
exit 0
`;
	}

	private getPrePushScript(): string {
		return `#!/bin/sh
# SnapBack pre-push hook

echo "🔍 SnapBack: Final safety check before push..."

npx snapback scan --branch origin/main

if [ $? -ne 0 ]; then
  echo "❌ SnapBack: Push blocked due to safety issues"
  exit 1
fi

echo "✅ SnapBack: Safe to push"
exit 0
`;
	}
}
```

### Console Reporter

```typescript
// src/reporters/console-reporter.ts
import chalk from "chalk";
import Table from "cli-table3";

export class ConsoleReporter {
	report(results: ScanResult[]) {
		console.log("\n" + "━".repeat(80));

		const table = new Table({
			head: ["File", "Status", "Issues"],
			colWidths: [40, 15, 25],
		});

		for (const result of results) {
			const status = this.formatStatus(result.riskLevel);
			const issues =
				result.issues.length > 0 ? result.issues[0].message : "-";

			table.push([result.file, status, issues]);
		}

		console.log(table.toString());
		console.log("━".repeat(80));

		// Summary
		const summary = this.calculateSummary(results);
		console.log(chalk.bold("\nResults:"));
		console.log(chalk.green(`  ✓ Safe: ${summary.safe}`));
		console.log(chalk.yellow(`  ⚠ Warnings: ${summary.warnings}`));
		console.log(chalk.red(`  🚨 Blocked: ${summary.blocked}`));
	}

	private formatStatus(riskLevel: string): string {
		switch (riskLevel) {
			case "safe":
			case "low":
				return chalk.green("✓ SAFE");
			case "medium":
				return chalk.yellow("⚠ MEDIUM RISK");
			case "high":
			case "critical":
				return chalk.red("🚨 HIGH RISK");
			default:
				return chalk.gray("? UNKNOWN");
		}
	}

	private calculateSummary(results: ScanResult[]) {
		return {
			safe: results.filter(
				(r) => r.riskLevel === "safe" || r.riskLevel === "low"
			).length,
			warnings: results.filter((r) => r.riskLevel === "medium").length,
			blocked: results.filter(
				(r) => r.riskLevel === "high" || r.riskLevel === "critical"
			).length,
		};
	}
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/snapback.yml
name: SnapBack Safety Check

on:
    pull_request:
    push:
        branches: [main, develop]

jobs:
    safety-check:
        runs-on: ubuntu-latest

        steps:
            - uses: actions/checkout@v3
              with:
                  fetch-depth: 0 # Need full history for comparison

            - uses: actions/setup-node@v3
              with:
                  node-version: "18"

            - name: Install SnapBack CLI
              run: npm install -g snapback-cli

            - name: Run Safety Scan
              env:
                  SNAPBACK_API_KEY: ${{ secrets.SNAPBACK_API_KEY }}
              run: |
                  snapback scan --branch main

            - name: Generate Report
              if: always()
              run: snapback report --output ./snapback-report.html

            - name: Upload Report
              if: always()
              uses: actions/upload-artifact@v3
              with:
                  name: snapback-report
                  path: snapback-report.html
```

### GitLab CI

```yaml
# .gitlab-ci.yml
snapback-check:
    stage: test
    image: node:18

    before_script:
        - npm install -g snapback-cli

    script:
        - snapback scan --branch main
        - snapback report --output snapback-report.html

    artifacts:
        when: always
        paths:
            - snapback-report.html
        expire_in: 1 week

    only:
        - merge_requests
        - main
```

---

## Package Configuration

```json
// package.json
{
	"name": "snapback-cli",
	"version": "1.0.0",
	"description": "SnapBack CLI for git hooks and CI/CD integration",
	"type": "module",
	"bin": {
		"snapback": "./build/cli.js"
	},
	"scripts": {
		"build": "tsc && chmod +x build/cli.js",
		"dev": "tsc --watch",
		"prepare": "npm run build"
	},
	"dependencies": {
		"commander": "^11.0.0",
		"simple-git": "^3.19.0",
		"chalk": "^5.3.0",
		"ora": "^7.0.0",
		"cli-table3": "^0.6.3",
		"fs-extra": "^11.1.1",
		"node-fetch": "^3.3.0"
	},
	"devDependencies": {
		"@types/node": "^20.0.0",
		"@types/fs-extra": "^11.0.0",
		"typescript": "^5.3.0"
	},
	"files": ["build", "templates"]
}
```

---

## Usage Examples

### Local Development

```bash
# Initialize in project
cd my-project
snapback init

# Install git hooks
snapback hooks install

# Now every commit is protected
git add .
git commit -m "refactor: AI-generated improvements"
# → SnapBack scans staged changes
# → Blocks if high-risk detected

# Generate weekly report
snapback report --output ./reports/week-$(date +%V).html
```

### Team Workflow

```bash
# Team lead sets up project
snapback init
snapback hooks install
git add .snapback/
git commit -m "chore: add SnapBack safety"
git push

# Other developers pull and install
git pull
snapback hooks install

# Now everyone's commits are protected
```

### CI/CD Pipeline

```bash
# Add to package.json scripts
{
  "scripts": {
    "safety-check": "snapback scan --branch main",
    "safety-report": "snapback report"
  }
}

# Run in CI
npm run safety-check
```

---

## Implementation Timeline

### Week 1: Core CLI

-   Day 1-2: CLI structure, commands, git scanner
-   Day 3: Hooks manager, pre-commit/pre-push
-   Day 4: Console reporter, error handling
-   Day 5: Testing, polish

### Week 2: CI/CD & Reports

-   Day 1: CI/CD integration templates
-   Day 2: HTML report generator
-   Day 3: JSON output for automation
-   Day 4: Documentation
-   Day 5: Release prep

---

## Success Metrics

| Metric               | Target                 |
| -------------------- | ---------------------- |
| Hook execution time  | <2s for typical commit |
| False positive rate  | <5%                    |
| Team adoption        | >70% enable hooks      |
| CI pipeline overhead | <30s additional time   |

---

## Future Enhancements

1. **Interactive Mode**: `snapback scan --interactive` for guided fixes
2. **Auto-fix**: `snapback fix --auto` for safe automated repairs
3. **Custom Rules**: Project-specific safety rules
4. **IDE Integration**: VS Code extension calls CLI for consistency

---

## Conclusion

The SnapBack CLI completes the safety ecosystem:

-   **IDE Extension**: Real-time protection during coding
-   **MCP Server**: Pre-emptive AI tool integration
-   **CLI**: Git hooks and CI/CD safety gates

Together, these three components provide comprehensive AI safety across the entire development lifecycle.

**Total Implementation**: ~2 weeks for all three components  
**Complexity**: Low to Medium  
**ROI**: Very High

---

**Ready to protect the entire development workflow! 🚀**
