# SnapBack MCP Context Enhancement Plan

> Comprehensive implementation plan for high-ROI context features that improve AI agent accuracy while reducing token consumption. All features are **local-first** with no cloud dependencies.

## Executive Summary

This plan adds 5 major context enhancements to `begin_task` and related MCP tools:

| Feature | Token Savings | Implementation Effort | Priority |
|---------|---------------|----------------------|----------|
| Error State Persistence | 500-1K/cycle | 3h | P0 |
| Git Change Context | 1-2K/task | 3h | P0 |
| Dependency Graph Cache | 2-3K/exploration | 5h | P1 |
| Test Coverage Map | 1-2K/question | 4h | P1 |
| Export Index | 500-1K/discovery | 5h | P2 |

**Total estimated token savings**: 5-10K per complex task

---

## Architecture Overview

### Current Flow
```
begin_task(task, files, keywords)
    ├── extractKeywords()
    ├── assessRisk()
    ├── shouldAutoSnapshot() → createSnapshot()
    ├── getLearningsFromFile()
    ├── getIntelligence().getContext()
    ├── getConstraints()
    ├── runStaticAnalysis()          ← NEW (skipped tests)
    ├── drainPendingObservations()
    └── startTask()
```

### Enhanced Flow
```
begin_task(task, files, keywords)
    ├── extractKeywords()
    ├── assessRisk()
    ├── shouldAutoSnapshot() → createSnapshot()
    ├── getLearningsFromFile()
    ├── getIntelligence().getContext()
    ├── getConstraints()
    ├── runStaticAnalysis()
    ├── getErrorContext()             ← NEW
    ├── getGitContext()               ← NEW
    ├── getDependencyContext()        ← NEW
    ├── getTestCoverageContext()      ← NEW
    ├── getExportIndex()              ← NEW (optional)
    ├── drainPendingObservations()
    └── startTask()
```

### Storage Structure
```
.snapback/
├── errors/                    ← NEW
│   ├── typescript.jsonl       # TS compiler errors
│   ├── tests.jsonl            # Test failures
│   └── runtime.jsonl          # Runtime errors
├── git/                       ← NEW
│   ├── context.json           # Branch, status, recent commits
│   └── file-history.jsonl     # Per-file change history
├── analysis/                  ← NEW
│   ├── dependency-graph.json  # Import/export graph (madge)
│   └── graph-meta.json        # Cache metadata (hash, timestamp)
├── coverage/                  ← NEW
│   ├── coverage-map.json      # Test→Source mapping
│   └── uncovered.jsonl        # Files/functions without tests
├── exports/                   ← NEW (P2)
│   ├── index.json             # All exports by file
│   └── signatures.jsonl       # Function signatures
└── mcp/
    └── session-state.json     # Existing
```

---

## Feature 1: Error State Persistence

### Problem
Agent runs build → sees errors → fixes one → runs build again → sees same errors it already knew about. Wastes tokens re-discovering known issues.

### Solution
Cache last known errors per file. Surface in `begin_task` when files match.

### Interface
```typescript
interface ErrorContext {
  typescript: Array<{
    file: string;
    line: number;
    column: number;
    code: string;       // e.g., "TS2339"
    message: string;
    severity: "error" | "warning";
    age: string;        // "2h", "1d"
    lastSeen: number;   // timestamp
  }>;
  tests: Array<{
    file: string;
    testName: string;
    error: string;
    stackTrace?: string;
    age: string;
    lastSeen: number;
  }>;
  lintErrors: Array<{
    file: string;
    line: number;
    rule: string;
    message: string;
    fixable: boolean;
  }>;
}
```

### Storage
- Location: `.snapback/errors/`
- Format: JSONL (append-only, easy filtering)
- Retention: 7 days or 100 entries per type
- Update trigger: `quick_check` completion

### Implementation

**File: `packages/mcp/src/services/error-cache-service.ts`**
```typescript
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

interface CachedError {
  file: string;
  line: number;
  column?: number;
  code?: string;
  message: string;
  severity: "error" | "warning";
  timestamp: number;
  source: "typescript" | "test" | "lint";
}

export class ErrorCacheService {
  private workspaceRoot: string;
  private cacheDir: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.cacheDir = join(workspaceRoot, ".snapback", "errors");
  }

  // Called by quick_check after validation
  cacheErrors(errors: CachedError[]): void {
    ensureDirSync(this.cacheDir);
    const path = join(this.cacheDir, `${errors[0]?.source || "general"}.jsonl`);
    const timestamp = Date.now();

    for (const error of errors) {
      appendFileSync(path, JSON.stringify({ ...error, timestamp }) + "\n");
    }
  }

  // Called by begin_task
  getErrorsForFiles(files: string[]): CachedError[] {
    const errors: CachedError[] = [];
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();

    for (const source of ["typescript", "test", "lint"]) {
      const path = join(this.cacheDir, `${source}.jsonl`);
      if (!existsSync(path)) continue;

      const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const error = JSON.parse(line) as CachedError;
          if (now - error.timestamp > maxAge) continue;
          if (files.some(f => error.file.includes(f) || f.includes(error.file))) {
            errors.push({
              ...error,
              age: formatAge(now - error.timestamp)
            });
          }
        } catch {}
      }
    }

    return deduplicateErrors(errors);
  }

  // Cleanup old entries
  prune(): { removed: number } {
    // Remove entries older than 7 days
    // Called periodically or on session end
  }
}
```

### Integration Points

1. **`quick_check.ts`**: After validation, call `errorCacheService.cacheErrors()`
2. **`begin-task.ts`**: Call `errorCacheService.getErrorsForFiles(files)`
3. **Output**: Add `lastKnownErrors` field to `BeginTaskOutput`

### Tests Required
- [ ] `error-cache-service.test.ts`: Unit tests for caching/retrieval
- [ ] `begin-task.integration.test.ts`: Verify errors surface in begin_task
- [ ] `quick-check.integration.test.ts`: Verify errors cached after validation

---

## Feature 2: Git Change Context

### Problem
Agent doesn't know if a file was just modified by user, or is stale from days ago. Wastes tokens exploring stale context.

### Solution
Include git status, recent commits, and file modification times in `begin_task`.

### Interface
```typescript
interface GitContext {
  branch: {
    current: string;
    upstream?: string;
    ahead: number;
    behind: number;
  };
  uncommittedChanges: Array<{
    file: string;
    status: "A" | "M" | "D" | "?" | "R";
    linesAdded?: number;
    linesRemoved?: number;
  }>;
  stagedChanges: Array<{
    file: string;
    status: "A" | "M" | "D" | "R";
  }>;
  recentCommits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
    filesChanged: number;
    affectsPlannedFiles: boolean;  // true if touches planned files
  }>;
  fileHistory: Record<string, {
    lastModified: string;         // "15 min ago"
    lastCommit: string;           // commit hash
    modifiedByUser: boolean;      // uncommitted changes
  }>;
}
```

### Implementation

**File: `packages/mcp/src/services/git-context-service.ts`**
```typescript
import { execSync } from "node:child_process";
import { join } from "node:path";

export class GitContextService {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  async getContext(plannedFiles: string[]): Promise<GitContext> {
    const branch = this.getBranchInfo();
    const uncommitted = this.getUncommittedChanges();
    const staged = this.getStagedChanges();
    const recentCommits = this.getRecentCommits(plannedFiles);
    const fileHistory = this.getFileHistory(plannedFiles);

    return { branch, uncommittedChanges: uncommitted, stagedChanges: staged, recentCommits, fileHistory };
  }

  private getBranchInfo(): GitContext["branch"] {
    const current = this.git("rev-parse --abbrev-ref HEAD").trim();
    const upstream = this.gitSafe("rev-parse --abbrev-ref @{u}")?.trim();
    let ahead = 0, behind = 0;

    if (upstream) {
      const counts = this.git(`rev-list --left-right --count ${current}...${upstream}`);
      [ahead, behind] = counts.trim().split("\t").map(Number);
    }

    return { current, upstream, ahead, behind };
  }

  private getUncommittedChanges(): GitContext["uncommittedChanges"] {
    const status = this.git("status --porcelain");
    return status.split("\n").filter(Boolean).map(line => {
      const status = line.substring(0, 2).trim() as "A" | "M" | "D" | "?" | "R";
      const file = line.substring(3);
      return { file, status };
    });
  }

  private getStagedChanges(): GitContext["stagedChanges"] {
    const status = this.git("diff --cached --name-status");
    return status.split("\n").filter(Boolean).map(line => {
      const [status, file] = line.split("\t");
      return { file, status: status as "A" | "M" | "D" | "R" };
    });
  }

  private getRecentCommits(plannedFiles: string[]): GitContext["recentCommits"] {
    const log = this.git('log -10 --pretty=format:"%H|%s|%an|%ar|%ct" --name-only');
    const commits: GitContext["recentCommits"] = [];

    // Parse git log output
    const entries = log.split("\n\n").filter(Boolean);
    for (const entry of entries) {
      const lines = entry.split("\n");
      const [hash, message, author, date] = lines[0].split("|");
      const files = lines.slice(1).filter(Boolean);

      commits.push({
        hash: hash.substring(0, 7),
        message,
        author,
        date,
        filesChanged: files.length,
        affectsPlannedFiles: files.some(f =>
          plannedFiles.some(pf => f.includes(pf) || pf.includes(f))
        )
      });
    }

    return commits.slice(0, 5); // Last 5 commits
  }

  private getFileHistory(files: string[]): GitContext["fileHistory"] {
    const history: GitContext["fileHistory"] = {};

    for (const file of files) {
      try {
        const lastCommit = this.gitSafe(`log -1 --pretty=format:"%H" -- "${file}"`);
        const lastModifiedRaw = this.gitSafe(`log -1 --pretty=format:"%ar" -- "${file}"`);
        const isUncommitted = this.getUncommittedChanges().some(c => c.file.includes(file));

        history[file] = {
          lastModified: lastModifiedRaw?.trim() || "unknown",
          lastCommit: lastCommit?.trim().substring(0, 7) || "none",
          modifiedByUser: isUncommitted
        };
      } catch {}
    }

    return history;
  }

  private git(cmd: string): string {
    return execSync(`git ${cmd}`, { cwd: this.workspaceRoot, encoding: "utf8" });
  }

  private gitSafe(cmd: string): string | null {
    try {
      return this.git(cmd);
    } catch {
      return null;
    }
  }
}
```

### Integration Points

1. **`begin-task.ts`**: Call `gitContextService.getContext(files)`
2. **Output**: Add `gitContext` field to `BeginTaskOutput`
3. **`what-changed.ts`**: Reuse for enhanced change reporting

### Tests Required
- [ ] `git-context-service.test.ts`: Mock git commands, verify parsing
- [ ] `begin-task.integration.test.ts`: Verify git context surfaces

---

## Feature 3: Dependency Graph Cache

### Problem
Agent asks "where is X used?" and spends 5-10 grep calls finding dependents. This is deterministic and cacheable.

### Solution
Use madge (already installed) to build dependency graph. Cache it. Expose in `begin_task`.

### Interface
```typescript
interface DependencyContext {
  planned: Record<string, {
    imports: string[];              // Files this file imports
    importedBy: Array<{             // Files that import this file
      file: string;
      line: number;
    }>;
    depth: number;                  // Max depth in import tree
    isOrphan: boolean;              // No dependents (dead code candidate)
  }>;
  circular: Array<{
    cycle: string[];                // Files in circular dependency
    severity: "warning" | "error";
  }>;
  suggestions: string[];            // Files to also consider based on deps
}
```

### Storage
- Location: `.snapback/analysis/dependency-graph.json`
- Format: JSON (tree structure, needs queries)
- Invalidation: When any `.ts`/`.tsx` file changes (hash-based)
- Cache key: SHA-256 of all source file paths + mtimes

### Implementation

**File: `packages/mcp/src/services/dependency-graph-service.ts`**
```typescript
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";

interface DependencyGraph {
  nodes: Record<string, {
    imports: string[];
    importedBy: string[];
  }>;
  circular: string[][];
  cacheKey: string;
  generatedAt: number;
}

export class DependencyGraphService {
  private workspaceRoot: string;
  private cacheDir: string;
  private graph: DependencyGraph | null = null;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.cacheDir = join(workspaceRoot, ".snapback", "analysis");
  }

  async getContextForFiles(files: string[]): Promise<DependencyContext> {
    const graph = await this.getGraph();

    const planned: DependencyContext["planned"] = {};
    const suggestions = new Set<string>();

    for (const file of files) {
      const relPath = this.toRelative(file);
      const node = graph.nodes[relPath];

      if (node) {
        planned[file] = {
          imports: node.imports,
          importedBy: node.importedBy.map(f => ({ file: f, line: 0 })),
          depth: this.calculateDepth(relPath, graph),
          isOrphan: node.importedBy.length === 0 && !this.isEntryPoint(relPath)
        };

        // Suggest related files
        node.importedBy.slice(0, 3).forEach(f => suggestions.add(f));
        node.imports.slice(0, 3).forEach(f => suggestions.add(f));
      }
    }

    // Filter suggestions to exclude already planned files
    const relPlanned = files.map(f => this.toRelative(f));
    const filteredSuggestions = [...suggestions]
      .filter(s => !relPlanned.includes(s))
      .slice(0, 5);

    return {
      planned,
      circular: graph.circular
        .filter(cycle => files.some(f => cycle.includes(this.toRelative(f))))
        .map(cycle => ({ cycle, severity: "warning" as const })),
      suggestions: filteredSuggestions
    };
  }

  private async getGraph(): Promise<DependencyGraph> {
    const cachePath = join(this.cacheDir, "dependency-graph.json");
    const cacheKey = await this.computeCacheKey();

    // Check cache
    if (existsSync(cachePath)) {
      try {
        const cached = JSON.parse(readFileSync(cachePath, "utf8")) as DependencyGraph;
        if (cached.cacheKey === cacheKey) {
          return cached;
        }
      } catch {}
    }

    // Rebuild graph
    const graph = await this.buildGraph();
    graph.cacheKey = cacheKey;
    graph.generatedAt = Date.now();

    // Write cache
    ensureDirSync(this.cacheDir);
    writeFileSync(cachePath, JSON.stringify(graph, null, 2));

    return graph;
  }

  private async buildGraph(): Promise<DependencyGraph> {
    // Dynamic import madge (optional dependency)
    const madgeModule = await import("madge");
    const madge = madgeModule.default || madgeModule;

    const result = await madge(this.workspaceRoot, {
      fileExtensions: ["ts", "tsx", "js", "jsx"],
      excludeRegExp: [/node_modules/, /dist/, /\.next/, /coverage/],
      tsConfig: join(this.workspaceRoot, "tsconfig.json")
    });

    const deps = result.obj();
    const circular = result.circular();

    // Build reverse index (importedBy)
    const nodes: DependencyGraph["nodes"] = {};

    for (const [file, imports] of Object.entries(deps)) {
      if (!nodes[file]) nodes[file] = { imports: [], importedBy: [] };
      nodes[file].imports = imports as string[];

      for (const imp of imports as string[]) {
        if (!nodes[imp]) nodes[imp] = { imports: [], importedBy: [] };
        nodes[imp].importedBy.push(file);
      }
    }

    return { nodes, circular, cacheKey: "", generatedAt: 0 };
  }

  private async computeCacheKey(): Promise<string> {
    // Hash of all source file paths + mtimes
    const glob = await import("fast-glob");
    const files = await glob.default(["**/*.{ts,tsx,js,jsx}"], {
      cwd: this.workspaceRoot,
      ignore: ["node_modules/**", "dist/**", ".next/**"]
    });

    const hash = createHash("sha256");
    for (const file of files.sort()) {
      try {
        const stat = statSync(join(this.workspaceRoot, file));
        hash.update(`${file}:${stat.mtimeMs}`);
      } catch {}
    }

    return hash.digest("hex").substring(0, 16);
  }

  private calculateDepth(file: string, graph: DependencyGraph, visited = new Set<string>()): number {
    if (visited.has(file)) return 0;
    visited.add(file);

    const node = graph.nodes[file];
    if (!node || node.imports.length === 0) return 0;

    return 1 + Math.max(...node.imports.map(i => this.calculateDepth(i, graph, visited)));
  }

  private isEntryPoint(file: string): boolean {
    return file.includes("index.") || file.includes("main.") || file.includes("entry.");
  }

  private toRelative(file: string): string {
    return relative(this.workspaceRoot, file);
  }
}
```

### Integration Points

1. **`begin-task.ts`**: Call `dependencyGraphService.getContextForFiles(files)`
2. **Output**: Add `dependencyContext` field to `BeginTaskOutput`
3. **`what-changed.ts`**: Show affected downstream files

### Tests Required
- [ ] `dependency-graph-service.test.ts`: Mock madge, verify graph building
- [ ] `begin-task.integration.test.ts`: Verify dependency context surfaces
- [ ] Cache invalidation tests

---

## Feature 4: Test Coverage Map

### Problem
Agent asks "is there a test for X?" then greps for test files, reads them to confirm coverage. This is deterministic.

### Solution
Parse vitest coverage output. Build test→source mapping. Cache it.

### Interface
```typescript
interface TestCoverageContext {
  files: Record<string, {
    hasTests: boolean;
    testFiles: string[];           // Test files covering this source
    coverage?: {
      lines: number;               // % of lines covered
      functions: number;           // % of functions covered
      branches: number;            // % of branches covered
    };
    untestedFunctions?: string[];  // Function names without coverage
  }>;
  summary: {
    totalFiles: number;
    filesWithTests: number;
    averageCoverage: number;
  };
}
```

### Storage
- Location: `.snapback/coverage/`
- Format: JSON (structured queries)
- Source: Parse `coverage/coverage-summary.json` from vitest
- Update trigger: After test runs via `quick_check`

### Implementation

**File: `packages/mcp/src/services/test-coverage-service.ts`**
```typescript
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative, basename, dirname } from "node:path";

interface CoverageSummary {
  total: { lines: { pct: number }; functions: { pct: number }; branches: { pct: number } };
  [file: string]: { lines: { pct: number }; functions: { pct: number }; branches: { pct: number } };
}

export class TestCoverageService {
  private workspaceRoot: string;
  private cacheDir: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.cacheDir = join(workspaceRoot, ".snapback", "coverage");
  }

  getContextForFiles(files: string[]): TestCoverageContext {
    const coverageData = this.loadCoverageData();
    const testMap = this.buildTestMap();

    const filesContext: TestCoverageContext["files"] = {};
    let filesWithTests = 0;
    let totalCoverage = 0;
    let filesWithCoverage = 0;

    for (const file of files) {
      const relPath = relative(this.workspaceRoot, file);
      const testFiles = testMap[relPath] || this.inferTestFiles(file);
      const coverage = coverageData[relPath];

      const hasTests = testFiles.length > 0;
      if (hasTests) filesWithTests++;

      filesContext[file] = {
        hasTests,
        testFiles,
        coverage: coverage ? {
          lines: coverage.lines.pct,
          functions: coverage.functions.pct,
          branches: coverage.branches.pct
        } : undefined
      };

      if (coverage) {
        totalCoverage += coverage.lines.pct;
        filesWithCoverage++;
      }
    }

    return {
      files: filesContext,
      summary: {
        totalFiles: files.length,
        filesWithTests,
        averageCoverage: filesWithCoverage > 0 ? totalCoverage / filesWithCoverage : 0
      }
    };
  }

  private loadCoverageData(): CoverageSummary {
    // Try multiple coverage output locations
    const locations = [
      join(this.workspaceRoot, "coverage", "coverage-summary.json"),
      join(this.workspaceRoot, ".vitest", "coverage", "coverage-summary.json")
    ];

    for (const loc of locations) {
      if (existsSync(loc)) {
        try {
          return JSON.parse(readFileSync(loc, "utf8"));
        } catch {}
      }
    }

    return { total: { lines: { pct: 0 }, functions: { pct: 0 }, branches: { pct: 0 } } };
  }

  private buildTestMap(): Record<string, string[]> {
    const cachePath = join(this.cacheDir, "test-map.json");

    if (existsSync(cachePath)) {
      try {
        return JSON.parse(readFileSync(cachePath, "utf8"));
      } catch {}
    }

    return {};
  }

  private inferTestFiles(file: string): string[] {
    // Infer test file from naming convention
    const dir = dirname(file);
    const base = basename(file, ".ts").replace(".tsx", "");

    const candidates = [
      join(dir, `${base}.test.ts`),
      join(dir, `${base}.test.tsx`),
      join(dir, `${base}.spec.ts`),
      join(dir, "__tests__", `${base}.test.ts`),
      join(dir.replace("/src/", "/test/"), `${base}.test.ts`)
    ];

    return candidates.filter(c => existsSync(c));
  }

  // Called after test runs to update cache
  updateFromTestRun(testResults: Array<{ file: string; passed: boolean; duration: number }>): void {
    ensureDirSync(this.cacheDir);
    const cachePath = join(this.cacheDir, "last-run.json");
    writeFileSync(cachePath, JSON.stringify({
      timestamp: Date.now(),
      results: testResults
    }, null, 2));
  }
}
```

### Integration Points

1. **`begin-task.ts`**: Call `testCoverageService.getContextForFiles(files)`
2. **Output**: Add `testCoverage` field to `BeginTaskOutput`
3. **`quick_check.ts`**: Update cache after test runs

### Tests Required
- [ ] `test-coverage-service.test.ts`: Mock coverage files, verify parsing
- [ ] `begin-task.integration.test.ts`: Verify coverage context surfaces

---

## Feature 5: Export Index

### Problem
Agent reads entire files just to learn "what does this module export?". This is deterministic and cacheable.

### Solution
Build export index using TypeScript AST. Cache it.

### Interface
```typescript
interface ExportIndex {
  files: Record<string, Array<{
    name: string;
    kind: "function" | "class" | "type" | "interface" | "const" | "enum";
    signature?: string;        // e.g., "(creds: Credentials) => Promise<Token>"
    isDefault: boolean;
    line: number;
  }>>;
  summary: {
    totalExports: number;
    byKind: Record<string, number>;
  };
}
```

### Storage
- Location: `.snapback/exports/index.json`
- Format: JSON
- Invalidation: File content hash
- Build: On demand or post-build

### Implementation

**File: `packages/mcp/src/services/export-index-service.ts`**
```typescript
import { parse } from "@babel/parser";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Export {
  name: string;
  kind: "function" | "class" | "type" | "interface" | "const" | "enum";
  signature?: string;
  isDefault: boolean;
  line: number;
}

export class ExportIndexService {
  private workspaceRoot: string;
  private cacheDir: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.cacheDir = join(workspaceRoot, ".snapback", "exports");
  }

  getExportsForFiles(files: string[]): ExportIndex {
    const index: ExportIndex = {
      files: {},
      summary: { totalExports: 0, byKind: {} }
    };

    for (const file of files) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;

      try {
        const content = readFileSync(file, "utf8");
        const exports = this.extractExports(content, file);

        index.files[file] = exports;
        index.summary.totalExports += exports.length;

        for (const exp of exports) {
          index.summary.byKind[exp.kind] = (index.summary.byKind[exp.kind] || 0) + 1;
        }
      } catch {}
    }

    return index;
  }

  private extractExports(code: string, filePath: string): Export[] {
    const exports: Export[] = [];

    try {
      const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        errorRecovery: true
      });

      for (const node of ast.program.body) {
        // export function foo() {}
        if (node.type === "ExportNamedDeclaration" && node.declaration) {
          const decl = node.declaration;

          if (decl.type === "FunctionDeclaration" && decl.id) {
            exports.push({
              name: decl.id.name,
              kind: "function",
              isDefault: false,
              line: node.loc?.start.line || 0
            });
          }

          if (decl.type === "ClassDeclaration" && decl.id) {
            exports.push({
              name: decl.id.name,
              kind: "class",
              isDefault: false,
              line: node.loc?.start.line || 0
            });
          }

          if (decl.type === "TSTypeAliasDeclaration") {
            exports.push({
              name: decl.id.name,
              kind: "type",
              isDefault: false,
              line: node.loc?.start.line || 0
            });
          }

          if (decl.type === "TSInterfaceDeclaration") {
            exports.push({
              name: decl.id.name,
              kind: "interface",
              isDefault: false,
              line: node.loc?.start.line || 0
            });
          }

          if (decl.type === "VariableDeclaration") {
            for (const d of decl.declarations) {
              if (d.id.type === "Identifier") {
                exports.push({
                  name: d.id.name,
                  kind: "const",
                  isDefault: false,
                  line: node.loc?.start.line || 0
                });
              }
            }
          }
        }

        // export default
        if (node.type === "ExportDefaultDeclaration") {
          const decl = node.declaration;
          let name = "default";
          let kind: Export["kind"] = "const";

          if (decl.type === "FunctionDeclaration" && decl.id) {
            name = decl.id.name;
            kind = "function";
          } else if (decl.type === "ClassDeclaration" && decl.id) {
            name = decl.id.name;
            kind = "class";
          }

          exports.push({ name, kind, isDefault: true, line: node.loc?.start.line || 0 });
        }
      }
    } catch {}

    return exports;
  }
}
```

### Integration Points

1. **`begin-task.ts`**: Call `exportIndexService.getExportsForFiles(files)` (optional, P2)
2. **Output**: Add `exports` field to `BeginTaskOutput`

### Tests Required
- [ ] `export-index-service.test.ts`: Verify AST parsing for all export types

---

## Updated BeginTaskOutput

```typescript
interface BeginTaskOutput {
  taskId: string;
  snapshot: { created: boolean; id?: string; reason?: string };
  patterns: Array<{ name: string; description: string; examples?: string[] }>;
  constraints: Array<{ domain: string; name: string; value: number | string; description: string }>;
  learnings: Array<{ type: string; trigger: string; action: string; source?: string; relevanceScore: number }>;
  observations: Array<{ type: string; message: string }>;
  riskAssessment: RiskAssessment;
  nextActions: Array<{ tool: string; priority: number; reason: string }>;
  staticAnalysis?: StaticAnalysisOutput;

  // NEW FIELDS
  lastKnownErrors?: ErrorContext;           // P0
  gitContext?: GitContext;                  // P0
  dependencyContext?: DependencyContext;    // P1
  testCoverage?: TestCoverageContext;       // P1
  exports?: ExportIndex;                    // P2
}
```

---

## Implementation Phases

### Phase 1: Error & Git Context (Week 1)
**Effort**: 6 hours | **Token Savings**: 1.5-3K/task

- [ ] Implement `ErrorCacheService`
- [ ] Implement `GitContextService`
- [ ] Integrate into `begin-task.ts`
- [ ] Update `quick_check.ts` to cache errors
- [ ] Add tests for both services
- [ ] Update `BeginTaskOutput` interface

### Phase 2: Dependency Graph (Week 2)
**Effort**: 5 hours | **Token Savings**: 2-3K/exploration

- [ ] Implement `DependencyGraphService`
- [ ] Add cache invalidation logic
- [ ] Integrate into `begin-task.ts`
- [ ] Integrate into `what-changed.ts`
- [ ] Add tests

### Phase 3: Test Coverage (Week 2-3)
**Effort**: 4 hours | **Token Savings**: 1-2K/question

- [ ] Implement `TestCoverageService`
- [ ] Parse vitest coverage output
- [ ] Build test→source mapping
- [ ] Integrate into `begin-task.ts`
- [ ] Add tests

### Phase 4: Export Index (Week 3)
**Effort**: 5 hours | **Token Savings**: 500-1K/discovery

- [ ] Implement `ExportIndexService`
- [ ] AST parsing for all export types
- [ ] Cache management
- [ ] Integrate into `begin-task.ts` (optional flag)
- [ ] Add tests

---

## Existing Code Reuse

### From `@snapback/core`

| Utility | Location | Reuse For |
|---------|----------|-----------|
| `cache.ts` (LRU) | `packages/core/src/utils/cache.ts` | Result caching with TTL |
| `FusedScanner` | `packages/core/src/detection/scanner/` | Pattern-based scanning |
| `ast-helpers.ts` | `packages/core/src/detection/utils/` | `extractImports()`, `isTestFile()` |
| `concurrency.ts` | `packages/core/src/utils/` | Parallel processing |
| `retry.ts` | `packages/core/src/utils/` | Resilient operations |

### From `@snapback/mcp`

| Utility | Location | Reuse For |
|---------|----------|-----------|
| `session/state.ts` | Session persistence | Model for error state |
| `services/snapshot-service.ts` | Hash-based dedup | Cache invalidation |
| `facades/response-utils.ts` | Compression | Large context pruning |

### Dependencies Already Installed

| Package | Version | Use Case |
|---------|---------|----------|
| `madge` | catalog | Dependency graph |
| `simple-git` | catalog | Git operations |
| `fast-glob` | catalog | File discovery |
| `@babel/parser` | catalog | AST parsing |

---

## Performance Considerations

### Cache Sizes
- Error cache: ~50KB max (100 errors × 500 bytes)
- Git context: ~5KB (computed on demand, not cached)
- Dependency graph: ~200KB for large monorepo
- Test coverage: ~20KB (summary only)
- Export index: ~100KB for large monorepo

### Latency Targets
| Feature | Target | Approach |
|---------|--------|----------|
| Error context | <10ms | Read JSONL, filter |
| Git context | <50ms | Native git commands |
| Dependency graph | <100ms (cached), <2s (build) | Cache aggressively |
| Test coverage | <20ms | Pre-parsed JSON |
| Export index | <100ms | Parse on demand |

### Cache Invalidation Strategy
| Feature | Invalidation Trigger |
|---------|---------------------|
| Errors | 7-day TTL or manual prune |
| Git context | Computed fresh each call |
| Dependency graph | Source file mtime change |
| Test coverage | After test runs |
| Export index | Source file mtime change |

---

## Risk Mitigation

### Performance Risks
- **Dependency graph on large repos**: Use madge's `excludeRegExp` to skip node_modules, dist
- **Git commands slow**: Run in background, cache recent results
- **AST parsing slow**: Only parse on demand, cache results

### Compatibility Risks
- **Git not available**: Graceful degradation, return empty context
- **Coverage file missing**: Return `hasTests: false`, don't fail
- **Madge fails**: Return empty dependency context, log warning

### Security Risks
- **Path traversal**: Use existing `validateFilePath()` from `validation.ts`
- **Secrets in errors**: Sanitize error messages before caching
- **Large file DoS**: Limit cache sizes, use TTL

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Tokens per task | ~15K | ~8K | Track via MCP telemetry |
| Exploration tool calls | 5-10 | 2-3 | Count Grep/Read calls |
| Build/test re-runs | 3-4 | 1-2 | Track quick_check calls |
| Agent accuracy | 85% | 95% | User feedback |

---

## Appendix: File Structure After Implementation

```
packages/mcp/src/
├── services/
│   ├── snapshot-service.ts       # Existing
│   ├── error-cache-service.ts    # NEW (P0)
│   ├── git-context-service.ts    # NEW (P0)
│   ├── dependency-graph-service.ts # NEW (P1)
│   ├── test-coverage-service.ts  # NEW (P1)
│   └── export-index-service.ts   # NEW (P2)
├── facades/
│   ├── begin-task.ts             # Updated
│   ├── quick-check.ts            # Updated (cache errors)
│   ├── what-changed.ts           # Updated (show deps)
│   └── ...
└── types/
    └── context.ts                # NEW: Shared interfaces
```

```
.snapback/
├── errors/                       # NEW
│   ├── typescript.jsonl
│   ├── tests.jsonl
│   └── runtime.jsonl
├── git/                          # NEW (if we cache)
│   └── context.json
├── analysis/                     # NEW
│   ├── dependency-graph.json
│   └── graph-meta.json
├── coverage/                     # NEW
│   ├── coverage-map.json
│   └── test-map.json
├── exports/                      # NEW (P2)
│   └── index.json
└── mcp/
    └── session-state.json        # Existing
```

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize Phase 1** (Error + Git) for immediate implementation
3. **Create tracking issues** for each phase
4. **Implement incrementally** with tests at each step
5. **Measure token savings** after each phase

---

*Generated by SnapBack MCP Context Enhancement Planning - 2024-12-26*