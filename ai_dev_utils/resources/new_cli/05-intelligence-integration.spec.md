# CLI Intelligence Integration Spec

## CLI-UX-005: Intelligence Package Integration

**Priority**: P0 (Critical - Demo Enabler)
**Effort**: 8-12 hours
**Status**: Draft

---

## Overview

Integrate `@snapback/intelligence` into the CLI to provide the same learning loop, validation, and context capabilities that power the internal `ai_dev_utils/mcp` server. This creates a dual-use architecture where:

- **Internal MCP** (`ai_dev_utils/mcp`) → rootDir: `ai_dev_utils/` → For SnapBack dev team
- **CLI Intelligence** (`apps/cli`) → rootDir: `.snapback/` → For customers

Same algorithms. Same learning loop. Different data sources.

---

## Architecture

### Current Flow

```
┌─────────────────────────────────────────────────────────────┐
│  ai_dev_utils/mcp (Internal)                                │
│  ├── @snapback/intelligence                                 │
│  │   ├── LearningEngine → patterns/violations.jsonl         │
│  │   ├── ValidationPipeline → 7-layer checks                │
│  │   ├── SemanticRetriever → embeddings.db                  │
│  │   └── ViolationTracker → auto-promotion                  │
│  └── Storage: ai_dev_utils/patterns/, feedback/             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  apps/cli (Customer) - CURRENT                              │
│  ├── learn.ts → .snapback/learnings/user-learnings.jsonl    │
│  ├── patterns.ts → .snapback/patterns/violations.jsonl      │
│  └── Manual promotion (no auto-promotion)                   │
└─────────────────────────────────────────────────────────────┘
```

### Target Flow

```
┌─────────────────────────────────────────────────────────────┐
│  apps/cli (Customer) - ENHANCED                             │
│  ├── @snapback/intelligence (new dependency)                │
│  │   ├── LearningEngine → .snapback/learnings/              │
│  │   ├── ValidationPipeline → 7-layer checks                │
│  │   ├── ViolationTracker → auto-promotion at 3x            │
│  │   └── WorkspaceVitals → adaptive risk sensing            │
│  ├── New Commands:                                          │
│  │   ├── snap context → Get context before work             │
│  │   ├── snap validate → Run validation pipeline            │
│  │   └── snap stats → Learning statistics                   │
│  └── Enhanced Commands:                                     │
│      ├── snap check → Uses ValidationPipeline               │
│      ├── snap learn → Syncs to Intelligence                 │
│      └── snap patterns → Auto-promotion, stats              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Phase 1: Foundation (2h)

#### 1.1 Add Dependency

```bash
# In apps/cli/
pnpm add @snapback/intelligence
```

Update `package.json`:
```json
{
  "dependencies": {
    "@snapback/intelligence": "workspace:*"
  }
}
```

#### 1.2 Create Intelligence Service

**File**: `apps/cli/src/services/intelligence-service.ts`

```typescript
/**
 * Intelligence Service
 *
 * Provides singleton access to @snapback/intelligence for CLI commands.
 * Configures Intelligence with workspace's .snapback/ directory.
 *
 * Same algorithms as ai_dev_utils/mcp, different rootDir.
 */

import { Intelligence } from "@snapback/intelligence";
import { getWorkspaceDir, isSnapbackInitialized } from "./snapback-dir";

// Singleton instance per workspace
const instances = new Map<string, Intelligence>();

/**
 * Configuration for customer workspace intelligence
 */
export function createWorkspaceIntelligenceConfig(workspaceRoot: string) {
  const snapbackDir = getWorkspaceDir(workspaceRoot);
  
  return {
    rootDir: snapbackDir,
    patternsDir: "patterns",
    learningsDir: "learnings",
    constraintsFile: "constraints.md", // Optional user constraints
    violationsFile: "patterns/violations.jsonl",
    embeddingsDb: "embeddings.db",
    contextFiles: [
      "patterns/workspace-patterns.json",
      "vitals.json",
    ],
    enableSemanticSearch: false, // Start without semantic for faster startup
    enableLearningLoop: true,
    enableAutoPromotion: true,
  };
}

/**
 * Get or create Intelligence instance for a workspace
 */
export async function getIntelligence(workspaceRoot?: string): Promise<Intelligence> {
  const cwd = workspaceRoot || process.cwd();
  
  // Check initialization
  if (!(await isSnapbackInitialized(cwd))) {
    throw new Error(
      "SnapBack not initialized. Run: snap init"
    );
  }
  
  // Return cached instance
  if (instances.has(cwd)) {
    return instances.get(cwd)!;
  }
  
  // Create new instance
  const config = createWorkspaceIntelligenceConfig(cwd);
  const intelligence = new Intelligence(config);
  
  instances.set(cwd, intelligence);
  return intelligence;
}

/**
 * Clear cached instance (for testing)
 */
export function clearIntelligenceCache(): void {
  for (const instance of instances.values()) {
    instance.dispose();
  }
  instances.clear();
}

/**
 * Check if intelligence is available for workspace
 */
export async function hasIntelligence(workspaceRoot?: string): Promise<boolean> {
  try {
    await getIntelligence(workspaceRoot);
    return true;
  } catch {
    return false;
  }
}
```

---

### Phase 2: Context Command (2h)

#### 2.1 Create Context Command

**File**: `apps/cli/src/commands/context.ts`

```typescript
/**
 * Context Command
 *
 * Implements snap context - Get relevant context before starting work.
 * Equivalent to MCP's start_task tool.
 *
 * Usage:
 *   snap context "add authentication"
 *   snap context "fix bug" --files src/auth.ts
 *   snap context --keywords auth session
 */

import chalk from "chalk";
import { Command } from "commander";
import { getIntelligence } from "../services/intelligence-service";
import { displayBox, displayContextTable } from "../utils/display";

export function createContextCommand(): Command {
  const context = new Command("context")
    .description("Get relevant context before starting work")
    .argument("[task]", "Description of what you want to implement")
    .option("-f, --files <files...>", "Files you plan to modify")
    .option("-k, --keywords <keywords...>", "Keywords to search for")
    .option("--json", "Output as JSON")
    .action(async (task, options) => {
      const cwd = process.cwd();
      
      try {
        const intelligence = await getIntelligence(cwd);
        
        const result = await intelligence.getContext({
          task: task || "general development",
          files: options.files || [],
          keywords: options.keywords || [],
        });
        
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        
        // Display context in boxed format
        console.log(displayBox({
          title: "📋 Context Loaded",
          content: formatContextSummary(result),
          type: "info",
        }));
        
        // Display learnings in table
        if (result.relevantLearnings?.length > 0) {
          console.log();
          console.log(chalk.cyan("Relevant Learnings:"));
          console.log(displayContextTable(result.relevantLearnings));
        }
        
        // Display violations to avoid
        if (result.recentViolations?.length > 0) {
          console.log();
          console.log(chalk.yellow("⚠ Recent Violations (avoid these):"));
          for (const v of result.recentViolations.slice(0, 3)) {
            console.log(chalk.gray(`  • ${v.type}: ${v.message}`));
            if (v.prevention) {
              console.log(chalk.green(`    Fix: ${v.prevention}`));
            }
          }
        }
        
        console.log();
        console.log(chalk.gray("Tip: Run 'snap validate <file>' before committing"));
        
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("Error:"), message);
        process.exit(1);
      }
    });
  
  return context;
}

function formatContextSummary(result: any): string {
  const parts: string[] = [];
  
  if (result.hardRules) {
    parts.push(`${chalk.bold("Hard Rules:")} ${result.hardRules.split('\n').length} constraints`);
  }
  
  if (result.patterns) {
    parts.push(`${chalk.bold("Patterns:")} ${result.patterns.split('\n').filter(Boolean).length} patterns`);
  }
  
  if (result.relevantLearnings?.length) {
    parts.push(`${chalk.bold("Learnings:")} ${result.relevantLearnings.length} relevant`);
  }
  
  if (result.recentViolations?.length) {
    parts.push(`${chalk.bold("Violations:")} ${result.recentViolations.length} to avoid`);
  }
  
  return parts.join("\n");
}
```

---

### Phase 3: Validate Command (2h)

#### 3.1 Create Validate Command

**File**: `apps/cli/src/commands/validate.ts`

```typescript
/**
 * Validate Command
 *
 * Implements snap validate - Run 7-layer validation pipeline on code.
 * Uses @snapback/intelligence ValidationPipeline.
 *
 * Usage:
 *   snap validate src/auth.ts
 *   snap validate --all         # Validate all staged files
 *   snap validate --fix         # Auto-fix where possible
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { getIntelligence } from "../services/intelligence-service";
import { GitClient } from "../services/git-client";
import { displayValidationTable, displayBox } from "../utils/display";
import { ProgressTracker } from "../utils/progress";

export function createValidateCommand(): Command {
  const validate = new Command("validate")
    .description("Run validation pipeline on code")
    .argument("[file]", "File to validate")
    .option("-a, --all", "Validate all staged files")
    .option("-q, --quiet", "Only output if issues found")
    .option("--json", "Output as JSON")
    .action(async (file, options) => {
      const cwd = process.cwd();
      
      try {
        const intelligence = await getIntelligence(cwd);
        
        // Get files to validate
        let filesToValidate: string[] = [];
        
        if (file) {
          filesToValidate = [file];
        } else if (options.all) {
          const git = new GitClient({ cwd });
          const staged = await git.getStagedFiles();
          filesToValidate = staged
            .filter(f => f.status !== "deleted")
            .map(f => f.path);
        }
        
        if (filesToValidate.length === 0) {
          if (!options.quiet) {
            console.log(chalk.yellow("No files to validate"));
            console.log(chalk.gray("Usage: snap validate <file> or snap validate --all"));
          }
          return;
        }
        
        // Validate files with progress
        const progress = new ProgressTracker({
          total: filesToValidate.length,
          label: "Validating",
          quiet: options.quiet,
        });
        
        progress.start();
        
        const results: Array<{
          file: string;
          passed: boolean;
          confidence: number;
          issues: number;
          recommendation: string;
        }> = [];
        
        let hasErrors = false;
        
        for (const filePath of filesToValidate) {
          progress.update(filePath);
          
          try {
            const content = await readFile(resolve(cwd, filePath), "utf-8");
            const result = await intelligence.validateCode(content, filePath);
            
            results.push({
              file: filePath,
              passed: result.overall.passed,
              confidence: result.overall.confidence,
              issues: result.overall.totalIssues,
              recommendation: result.recommendation,
            });
            
            if (!result.overall.passed) {
              hasErrors = true;
            }
          } catch (error) {
            // Skip files that can't be read
            results.push({
              file: filePath,
              passed: false,
              confidence: 0,
              issues: 1,
              recommendation: "error",
            });
            hasErrors = true;
          }
        }
        
        const passedCount = results.filter(r => r.passed).length;
        
        if (hasErrors) {
          progress.fail(`${passedCount}/${results.length} files passed`);
        } else {
          progress.complete(`All ${results.length} files passed validation`);
        }
        
        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }
        
        // Display results table
        if (!options.quiet || hasErrors) {
          console.log();
          console.log(displayValidationTable(results));
        }
        
        // Summary box for failures
        if (hasErrors && !options.quiet) {
          const failedFiles = results.filter(r => !r.passed);
          console.log();
          console.log(displayBox({
            title: "❌ Validation Failed",
            content: formatValidationSummary(failedFiles),
            type: "error",
          }));
          console.log(chalk.gray("\nRun 'snap patterns report' to track recurring issues"));
        }
        
        process.exit(hasErrors ? 1 : 0);
        
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("Error:"), message);
        process.exit(1);
      }
    });
  
  return validate;
}

function formatValidationSummary(failures: any[]): string {
  return failures.map(f => 
    `${chalk.bold(f.file)}: ${f.issues} issue${f.issues !== 1 ? 's' : ''}`
  ).join("\n");
}
```

---

### Phase 4: Enhanced Patterns Command (2h)

#### 4.1 Update Patterns Command with Auto-Promotion

**File**: `apps/cli/src/commands/patterns.ts` (enhanced)

```typescript
// Add these imports at top
import { getIntelligence } from "../services/intelligence-service";
import { displayBox } from "../utils/display";

// Add new subcommand: patterns analyze
patterns
  .command("analyze")
  .description("Analyze code for pattern violations")
  .argument("<file>", "File to analyze")
  .action(async (file) => {
    const cwd = process.cwd();
    
    try {
      const intelligence = await getIntelligence(cwd);
      const content = await readFile(resolve(cwd, file), "utf-8");
      
      const result = await intelligence.checkPatterns(content, file);
      
      if (result.overall.passed) {
        console.log(displayBox({
          title: "✅ No Pattern Violations",
          content: `Confidence: ${(result.overall.confidence * 100).toFixed(0)}%`,
          type: "success",
        }));
      } else {
        console.log(displayBox({
          title: "⚠ Pattern Violations Found",
          content: formatViolations(result.layers),
          type: "warning",
        }));
        
        // Offer to record violations
        console.log();
        console.log(chalk.gray("Record violations with:"));
        for (const layer of result.layers) {
          for (const issue of layer.issues) {
            console.log(chalk.gray(
              `  snap patterns report "${issue.type}" "${file}" "${issue.message}"`
            ));
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red("Error:"), message);
      process.exit(1);
    }
  });

// Enhance patterns report with Intelligence auto-promotion
// In the report action handler, replace the promotion logic with:
const intelligence = await getIntelligence(cwd);
const status = await intelligence.reportViolation({
  type,
  file,
  message,
  reason: "User reported via CLI",
  prevention: options.prevention,
});

console.log(chalk.yellow("⚠"), `Violation recorded: ${type}`);
console.log(chalk.gray(`  Status: ${status.status}`));
console.log(chalk.gray(`  Occurrences: ${status.totalOccurrences}/3 for promotion`));

if (status.promotedAs) {
  console.log();
  console.log(displayBox({
    title: "📈 Pattern Promoted",
    content: `${type} promoted as ${status.promotedAs}\nThis pattern will now be detected automatically.`,
    type: "success",
  }));
}
```

---

### Phase 5: Stats Command (1h)

#### 5.1 Create Stats Command

**File**: `apps/cli/src/commands/stats.ts`

```typescript
/**
 * Stats Command
 *
 * Implements snap stats - Show learning engine statistics.
 */

import chalk from "chalk";
import { Command } from "commander";
import { getIntelligence } from "../services/intelligence-service";
import { displayBox } from "../utils/display";
import Table from "cli-table3";

export function createStatsCommand(): Command {
  const stats = new Command("stats")
    .description("Show learning statistics")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const cwd = process.cwd();
      
      try {
        const intelligence = await getIntelligence(cwd);
        
        const learningStats = intelligence.getStats();
        const violationsSummary = intelligence.getViolationsSummary();
        
        if (options.json) {
          console.log(JSON.stringify({
            learning: learningStats,
            violations: violationsSummary,
          }, null, 2));
          return;
        }
        
        // Display learning stats box
        console.log(displayBox({
          title: "📊 Learning Statistics",
          content: formatLearningStats(learningStats),
          type: "info",
        }));
        
        // Display violations table
        if (violationsSummary.uniqueTypes > 0) {
          console.log();
          console.log(chalk.cyan("Violation Patterns:"));
          
          const table = new Table({
            head: [
              chalk.cyan("Type"),
              chalk.cyan("Count"),
              chalk.cyan("Status"),
            ],
            style: { head: [], border: [] },
          });
          
          for (const v of violationsSummary.byType.slice(0, 10)) {
            table.push([
              v.type,
              String(v.count),
              v.status,
            ]);
          }
          
          console.log(table.toString());
        }
        
        console.log();
        console.log(chalk.gray("Violations at 3x → promoted | 5x → automated"));
        
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("Error:"), message);
        process.exit(1);
      }
    });
  
  return stats;
}

function formatLearningStats(stats: any): string {
  return [
    `${chalk.bold("Total Interactions:")} ${stats.totalInteractions}`,
    `${chalk.bold("Feedback Rate:")} ${(stats.feedbackReceived / Math.max(stats.totalInteractions, 1) * 100).toFixed(0)}%`,
    `${chalk.bold("Accuracy Rate:")} ${(stats.correctRate * 100).toFixed(0)}%`,
    `${chalk.bold("Golden Examples:")} ${stats.goldenExamples}`,
  ].join("\n");
}
```

---

### Phase 6: Integration (2h)

#### 6.1 Update index.ts

```typescript
// Add imports
import { createContextCommand } from "./commands/context";
import { createValidateCommand } from "./commands/validate";
import { createStatsCommand } from "./commands/stats";

// In createCLI():
// Intelligence-powered commands
program.addCommand(createContextCommand());
program.addCommand(createValidateCommand());
program.addCommand(createStatsCommand());
```

#### 6.2 Update commands/index.ts

```typescript
export { createContextCommand } from "./context";
export { createValidateCommand } from "./validate";
export { createStatsCommand } from "./stats";
```

#### 6.3 Update Check Command

Enhance the existing `check` command to use ValidationPipeline for deeper analysis:

```typescript
// In the check command action handler, add:
const intelligence = await getIntelligence(cwd);

// After analyzing with engineAdapter, also run validation:
const validation = await intelligence.validateCode(content, file);

// Merge validation issues with analysis results
if (!validation.overall.passed) {
  hasRiskyChanges = true;
  fileResults.push({
    ...existingResult,
    validationIssues: validation.overall.totalIssues,
    recommendation: validation.recommendation,
  });
}
```

---

## New File Structure

```
apps/cli/src/
├── commands/
│   ├── context.ts       # NEW: Get context before work
│   ├── validate.ts      # NEW: Run validation pipeline
│   ├── stats.ts         # NEW: Learning statistics
│   ├── learn.ts         # ENHANCED: Uses Intelligence
│   ├── patterns.ts      # ENHANCED: Auto-promotion
│   └── index.ts         # UPDATED: Export new commands
├── services/
│   ├── intelligence-service.ts  # NEW: Intelligence singleton
│   └── snapback-dir.ts          # EXISTING
└── utils/
    ├── display.ts       # ENHANCED: New display helpers
    └── tables.ts        # ENHANCED: New table types
```

---

## Testing

### Unit Tests

```typescript
// test/services/intelligence-service.test.ts
describe("IntelligenceService", () => {
  // Happy path
  it("should create Intelligence instance for initialized workspace", async () => {
    // Setup .snapback/ directory
    const intel = await getIntelligence(tempDir);
    expect(intel).toBeDefined();
  });
  
  // Sad path
  it("should throw if workspace not initialized", async () => {
    await expect(getIntelligence("/tmp/uninitialized"))
      .rejects.toThrow("SnapBack not initialized");
  });
  
  // Edge case
  it("should return cached instance on second call", async () => {
    const intel1 = await getIntelligence(tempDir);
    const intel2 = await getIntelligence(tempDir);
    expect(intel1).toBe(intel2);
  });
  
  // Error case
  it("should handle corrupted config gracefully", async () => {
    // Write invalid JSON to config.json
    await expect(getIntelligence(corruptedDir))
      .rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// test/integration/intelligence.integration.test.ts
describe("CLI Intelligence Integration", () => {
  it("should get context for a task", async () => {
    // snap context "add auth" --keywords auth session
    const result = await runCLI(["context", "add auth", "-k", "auth"]);
    expect(result.stdout).toContain("Context Loaded");
  });
  
  it("should validate code and report issues", async () => {
    // Create file with known issue
    const result = await runCLI(["validate", "test-file.ts"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Validation Failed");
  });
  
  it("should track violations and auto-promote at 3x", async () => {
    // Report same violation 3 times
    for (let i = 0; i < 3; i++) {
      await runCLI([
        "patterns", "report",
        "test-violation", "test.ts", "Test message"
      ]);
    }
    
    // Check that it was promoted
    const stats = await runCLI(["patterns", "summary", "--json"]);
    const data = JSON.parse(stats.stdout);
    expect(data.promotedPatterns).toBeGreaterThan(0);
  });
});
```

---

## Command Reference

### New Commands

| Command | Description | Example |
|---------|-------------|---------|
| `snap context [task]` | Get context before work | `snap context "add auth" -k auth` |
| `snap validate <file>` | Run validation pipeline | `snap validate src/auth.ts` |
| `snap validate --all` | Validate all staged files | `snap validate --all` |
| `snap stats` | Show learning statistics | `snap stats --json` |
| `snap patterns analyze <file>` | Analyze for violations | `snap patterns analyze src/auth.ts` |

### Enhanced Commands

| Command | Enhancement |
|---------|-------------|
| `snap check` | Now uses ValidationPipeline for deeper analysis |
| `snap learn` | Records to Intelligence, tracks interactions |
| `snap patterns report` | Auto-promotion at 3x occurrences |
| `snap patterns summary` | Shows promotion status from Intelligence |

---

## Scaffolded Files (Ready for Implementation)

The following files have been created with comprehensive JSDoc comments and implementation hints for LLM agents:

### Services
- `apps/cli/src/services/intelligence-service.ts` - **SCAFFOLDED** - Intelligence singleton manager

### Commands
- `apps/cli/src/commands/context.ts` - **SCAFFOLDED** - `snap context` implementation
- `apps/cli/src/commands/validate.ts` - **SCAFFOLDED** - `snap validate` implementation  
- `apps/cli/src/commands/stats.ts` - **SCAFFOLDED** - `snap stats` implementation
- `apps/cli/src/commands/index.ts` - **UPDATED** - Exports new commands

### Utilities
- `apps/cli/src/utils/display.ts` - **ENHANCED** - Added context/validation display helpers
- `apps/cli/src/utils/tables.ts` - **ENHANCED** - Added context/validation table functions
- `apps/cli/src/utils/index.ts` - **UPDATED** - Exports new utilities

### Main CLI
- `apps/cli/src/index.ts` - **UPDATED** - Registers new commands

### Tests
- `apps/cli/test/services/intelligence-service.test.ts` - **SCAFFOLDED** - Unit tests with 4-path coverage
- `apps/cli/test/integration/intelligence.integration.test.ts` - **SCAFFOLDED** - Integration tests

---

## Success Criteria

- [ ] `@snapback/intelligence` integrated as dependency
- [ ] `snap context` provides relevant context before work
- [ ] `snap validate` runs 7-layer validation pipeline
- [ ] `snap patterns report` auto-promotes at 3x
- [ ] `snap stats` shows learning statistics
- [ ] All unit tests pass (80%+ coverage)
- [ ] Integration tests pass
- [ ] Same learning loop as internal MCP

---

## Dependencies

- **@snapback/intelligence**: `workspace:*`
- **boxen**: Already added (CLI-UX-001)
- **cli-table3**: Already added (CLI-UX-003)
- **chalk**: Existing
- **commander**: Existing

---

## Migration Notes

The existing `snap learn` and `snap patterns` commands will continue to work but will now be powered by the Intelligence engine instead of direct file operations. Data migration is not needed as the storage format remains compatible (JSONL).

---

## References

- [ai_dev_utils/mcp/server.ts](../../../mcp/server.ts) - Internal MCP implementation
- [@snapback/intelligence](../../../../packages/intelligence/) - Intelligence package
- [CLI-UX-001](./01-boxen-integration.spec.md) - Display utilities
- [CLI-UX-003](./03-cli-table3-integration.spec.md) - Table utilities
