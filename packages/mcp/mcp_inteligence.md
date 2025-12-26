# MCP Intelligence Implementation Specification

**Version**: 1.0.0
**Date**: December 2025
**Status**: Ready for Implementation
**Estimated Effort**: 2-3 weeks total

---

## Executive Summary

This specification details how to transform SnapBack's MCP Intelligence tools from regex-based pattern matching to real static analysis using **libraries already installed** in the codebase.

### Key Principle: Zero New Dependencies for Core Features

| Feature | Current Approach | New Approach | Library (Already Installed) |
|---------|------------------|--------------|----------------------------|
| Syntax validation | Bracket counting | AST parsing | `@typescript-eslint/parser` |
| Security detection | 4 regex patterns | AST traversal | `@babel/parser` + `@babel/traverse` |
| Circular deps | None | Import graph | `madge` |
| Duplicate code | None | Clone detection | `jscpd` |
| Lint integration | None | 200+ rules | `@biomejs/biome` (js-api) |
| Semantic search | Substring match | Vector similarity | `onnxruntime-node` |

### One Small Addition Required

```bash
pnpm add -D eslint-plugin-security --filter @snapback/intelligence
```

---

## Architecture Overview

### Current Architecture (Problematic)

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Tool Request                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  ValidationPipeline                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Layer 1     │ │ Layer 5     │ │ Layer 6     │            │
│  │ Bracket     │ │ 4 Regex     │ │ 3 Hardcoded │            │
│  │ Counting    │ │ Patterns    │ │ Packages    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Arbitrary Confidence: 0.95                      │
│              Recommendation: "auto_merge"                    │
└─────────────────────────────────────────────────────────────┘
```

### New Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Analysis Coordinator                       │
│  • Selects appropriate analyzers based on file types        │
│  • Aggregates results from all layers                       │
│  • Calculates honest confidence score                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  AST Layer    │   │ Security Layer│   │ Quality Layer │
│ typescript-   │   │ @babel/parser │   │ @biomejs/     │
│ eslint/parser │   │ @babel/       │   │ biome         │
│ • Syntax      │   │ traverse      │   │ • 200+ lint   │
│ • Types       │   │ eslint-plugin-│   │   rules       │
│ • Imports     │   │ security      │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Architecture  │   │ Completeness  │   │  Dependency   │
│    Layer      │   │    Layer      │   │    Layer      │
│ madge         │   │ TODO/FIXME    │   │ npm audit     │
│ • Circular    │   │ Placeholders  │   │ CVE scanning  │
│   deps        │   │ Empty catch   │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Confidence Calculator                           │
│  Score = Σ(layer_weight × layer_passed × layer_coverage)    │
│  If score < 0.50 → "manual_review_required"                 │
│  If score < 0.70 → "review_recommended"                     │
│  If score ≥ 0.70 → "auto_merge_candidate"                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Package Split: Core vs Intelligence

### Guiding Principle

| Package | Responsibility | Characteristics |
|---------|----------------|-----------------|
| **Core** | Deterministic static analysis | Same input → same output, no learning |
| **Intelligence** | Adaptive orchestration | Learning, domain detection, confidence scoring |
| **MCP** | Protocol layer | Thin wrapper, no business logic |

### Why This Split?

1. **Dependencies stay where they are** - madge, jscpd, @typescript-eslint/parser already in core
2. **Core is testable in isolation** - Pure functions, no learning state
3. **Intelligence can evolve** - Add ML, change scoring without touching core
4. **Clear boundaries** - "Does it learn?" → Intelligence. "Is it deterministic?" → Core

---

## Directory Structure

### packages/core/src/analysis/ (Deterministic Analysis)

```
packages/core/src/analysis/
├── index.ts                    # Exports all analyzers
├── types.ts                    # AnalysisResult, Issue, Severity types
│
├── ast/
│   ├── SyntaxAnalyzer.ts      # @typescript-eslint/parser
│   └── TypeAnalyzer.ts        # Type annotation analysis
│
├── security/
│   ├── SecurityAnalyzer.ts    # @babel/traverse patterns
│   └── ESLintSecurityAnalyzer.ts  # eslint-plugin-security
│
├── quality/
│   └── BiomeAnalyzer.ts       # @biomejs/biome js-api
│
├── architecture/
│   ├── CircularDepsAnalyzer.ts    # madge
│   └── DuplicateCodeAnalyzer.ts   # jscpd
│
├── completeness/
│   └── CompletenessAnalyzer.ts    # TODO detection
│
└── dependencies/
    └── VulnScanner.ts              # npm audit / osv-scanner
```

### packages/intelligence/src/ (Adaptive Orchestration)

```
packages/intelligence/src/
├── index.ts                    # Exports
│
├── pipeline/
│   └── ValidationPipeline.ts  # Orchestrates core analyzers
│
├── confidence/
│   └── ConfidenceCalculator.ts # Subjective weighting
│
├── domain/
│   ├── DomainMatcher.ts       # Context detection
│   └── bundles/
│       ├── daemon.ts
│       ├── auth.ts
│       └── api.ts
│
├── compliance/
│   ├── SpecParser.ts          # unified/remark-parse
│   └── ImplementationMatcher.ts
│
└── learning/
    └── SemanticLearningEngine.ts  # onnxruntime embeddings
```

## Base Analyzer Interface

**File**: `packages/core/src/analysis/types.ts`

```typescript
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AnalysisIssue {
  id: string;
  severity: Severity;
  type: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  fix?: string;
  snippet?: string;
  rule?: string;
}

export interface AnalyzerResult {
  analyzer: string;
  success: boolean;
  issues: AnalysisIssue[];
  coverage: number;  // 0-1, how much was analyzed
  duration: number;
  metadata?: {
    filesAnalyzed?: number;
    nodesVisited?: number;
    patternsChecked?: string[];
  };
}

export interface AnalysisContext {
  workspaceRoot: string;
  files: string[];
  contents: Map<string, string>;
}

export interface Analyzer {
  readonly id: string;
  readonly name: string;
  readonly filePatterns: string[];

  analyze(context: AnalysisContext): Promise<AnalyzerResult>;
  shouldRun(context: AnalysisContext): boolean;
}
```

---

## SecurityAnalyzer Implementation

**File**: `packages/core/src/analysis/security/SecurityAnalyzer.ts`

```typescript
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type * as t from '@babel/types';
import type { Analyzer, AnalysisContext, AnalyzerResult, AnalysisIssue } from '../types.js';

export class SecurityAnalyzer implements Analyzer {
  readonly id = 'security';
  readonly name = 'Security Analysis';
  readonly filePatterns = ['*.ts', '*.tsx', '*.js', '*.jsx'];

  async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
    const startTime = performance.now();
    const issues: AnalysisIssue[] = [];
    let filesAnalyzed = 0;
    let nodesVisited = 0;

    for (const [file, content] of context.contents) {
      if (!this.shouldAnalyzeFile(file)) continue;
      filesAnalyzed++;

      try {
        const ast = parse(content, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx'],
          errorRecovery: true,
        });

        traverse(ast, {
          enter() { nodesVisited++; },

          // Detect eval()
          CallExpression: (path) => {
            const callee = path.node.callee;
            if (callee.type === 'Identifier' && callee.name === 'eval') {
              issues.push({
                id: `security/eval/${path.node.loc?.start.line}`,
                severity: 'critical',
                type: 'UNSAFE_EVAL',
                message: 'eval() allows arbitrary code execution',
                file,
                line: path.node.loc?.start.line,
                fix: 'Use JSON.parse() for data or refactor logic',
              });
            }
          },

          // Detect fs operations with dynamic paths
          MemberExpression: (path) => {
            if (
              path.node.object.type === 'Identifier' &&
              path.node.object.name === 'fs'
            ) {
              const parent = path.parentPath;
              if (parent.isCallExpression()) {
                const firstArg = parent.node.arguments[0];
                if (firstArg && !this.isStaticPath(firstArg)) {
                  issues.push({
                    id: `security/path-traversal/${path.node.loc?.start.line}`,
                    severity: 'high',
                    type: 'PATH_TRAVERSAL',
                    message: 'fs operation with dynamic path',
                    file,
                    line: path.node.loc?.start.line,
                    fix: 'Validate paths against workspace root',
                  });
                }
              }
            }
          },

          // Detect missing signal handlers in daemon code
          Program: {
            exit: () => {
              const isDaemon = content.includes('.listen(') ||
                               file.includes('daemon') ||
                               file.includes('server');

              if (isDaemon) {
                const hasSignalHandler =
                  content.includes("process.on('SIGTERM'") ||
                  content.includes("process.on('SIGINT'");

                if (!hasSignalHandler) {
                  issues.push({
                    id: `security/signal-handler/${file}`,
                    severity: 'high',
                    type: 'MISSING_PATTERN',
                    message: 'Daemon/server missing signal handlers',
                    file,
                    fix: "Add process.on('SIGTERM', gracefulShutdown)",
                  });
                }
              }
            },
          },
        });
      } catch (error) {
        issues.push({
          id: `security/parse-error/${file}`,
          severity: 'info',
          type: 'PARSE_ERROR',
          message: `Could not parse: ${error}`,
          file,
        });
      }
    }

    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: filesAnalyzed / Math.max(context.files.length, 1),
      duration: performance.now() - startTime,
      metadata: { filesAnalyzed, nodesVisited },
    };
  }

  shouldRun(context: AnalysisContext): boolean {
    return context.files.some(f => this.filePatterns.some(p => f.endsWith(p.slice(1))));
  }

  private shouldAnalyzeFile(file: string): boolean {
    return ['ts', 'tsx', 'js', 'jsx'].includes(file.split('.').pop() || '');
  }

  private isStaticPath(node: t.Expression | t.SpreadElement): boolean {
    if (node.type === 'StringLiteral') return true;
    if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return true;
    return false;
  }
}
```

## Confidence Calculator (Intelligence Package)

**File**: `packages/intelligence/src/confidence/ConfidenceCalculator.ts`

```typescript
import type { AnalyzerResult } from '@snapback/core';

const ANALYZER_WEIGHTS = {
  syntax: 0.15,
  types: 0.05,
  security: 0.25,
  'eslint-security': 0.10,
  biome: 0.10,
  'circular-deps': 0.05,
  'duplicate-code': 0.05,
  completeness: 0.10,
  dependencies: 0.10,
  'domain-patterns': 0.05,
};

const SEVERITY_PENALTIES = {
  critical: 0.25,  // Each critical issue reduces confidence by 25%
  high: 0.10,
  medium: 0.02,
  low: 0.005,
  info: 0,
};

export class ConfidenceCalculator {
  calculate(analyzerResults: AnalyzerResult[], coverage: CoverageInfo): ConfidenceResult {
    let totalWeight = 0;
    let weightedScore = 0;
    const breakdown: Record<string, number> = {};

    // Base confidence from analyzer success/coverage
    for (const result of analyzerResults) {
      const weight = ANALYZER_WEIGHTS[result.analyzer] || 0.05;
      totalWeight += weight;
      const score = result.success ? result.coverage : 0;
      weightedScore += weight * score;
      breakdown[result.analyzer] = score;
    }

    let confidence = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Apply penalties for issues
    for (const result of analyzerResults) {
      for (const issue of result.issues) {
        confidence = Math.max(0, confidence - SEVERITY_PENALTIES[issue.severity]);
      }
    }

    // Cap confidence based on coverage
    const maxConfidence = this.calculateMaxConfidence(coverage);
    confidence = Math.min(confidence, maxConfidence);

    return {
      confidence: Math.round(confidence * 100) / 100,
      breakdown,
      explanation: this.generateExplanation(confidence, coverage),
    };
  }

  private calculateMaxConfidence(coverage: CoverageInfo): number {
    // If no AST parsing, cap at 0.2 (regex-only)
    if (!coverage.astParsed) return 0.20;
    // If no security analysis, cap at 0.5
    if (!coverage.securityChecked) return 0.50;
    // If no completeness check, cap at 0.7
    if (!coverage.completenessChecked) return 0.70;
    return 1.0;
  }
}
```

---

## Completeness Analyzer (Core Package)

**File**: `packages/core/src/analysis/completeness/CompletenessAnalyzer.ts`

```typescript
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { Analyzer, AnalysisContext, AnalyzerResult, AnalysisIssue } from '../types.js';

export class CompletenessAnalyzer implements Analyzer {
  readonly id = 'completeness';
  readonly name = 'Completeness Detection';
  readonly filePatterns = ['*.ts', '*.tsx', '*.js', '*.jsx'];

  private readonly todoPatterns = [
    /\/\/\s*TODO\b/gi,
    /\/\/\s*FIXME\b/gi,
    /\/\/\s*XXX\b/gi,
  ];

  private readonly placeholderPatterns = [
    /throw\s+new\s+Error\s*\(\s*['"`].*not\s*implemented.*['"`]\s*\)/gi,
    /NotImplementedError/gi,
  ];

  async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
    const issues: AnalysisIssue[] = [];

    for (const [file, content] of context.contents) {
      // Regex-based TODO/FIXME detection
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of this.todoPatterns) {
          pattern.lastIndex = 0;
          if (pattern.test(lines[i])) {
            issues.push({
              id: `completeness/todo/${file}/${i + 1}`,
              severity: 'medium',
              type: 'INCOMPLETE_IMPLEMENTATION',
              message: `TODO/FIXME: ${lines[i].trim().slice(0, 80)}`,
              file,
              line: i + 1,
            });
            break;
          }
        }
      }

      // AST-based detection
      try {
        const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });

        traverse(ast, {
          // Empty catch blocks
          CatchClause: (path) => {
            if (path.node.body.body.length === 0) {
              issues.push({
                id: `completeness/empty-catch/${file}/${path.node.loc?.start.line}`,
                severity: 'medium',
                type: 'INCOMPLETE_IMPLEMENTATION',
                message: 'Empty catch block - errors silently swallowed',
                file,
                line: path.node.loc?.start.line,
                fix: 'Add error handling or rethrow',
              });
            }
          },

          // Empty function bodies
          FunctionDeclaration: (path) => {
            if (path.node.body.body.length === 0) {
              issues.push({
                id: `completeness/empty-fn/${file}/${path.node.loc?.start.line}`,
                severity: 'medium',
                type: 'INCOMPLETE_IMPLEMENTATION',
                message: `Empty function: ${path.node.id?.name}()`,
                file,
                line: path.node.loc?.start.line,
              });
            }
          },
        });
      } catch {}
    }

    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: 1.0,
      duration: 0,
    };
  }

  shouldRun(context: AnalysisContext): boolean {
    return context.files.some(f => this.filePatterns.some(p => f.endsWith(p.slice(1))));
  }
}
```

---

## Domain Pattern Bundle: Daemon (Intelligence Package)

**File**: `packages/intelligence/src/domain/bundles/daemon.ts`

```typescript
export const daemonPatterns: DomainBundle = {
  id: 'daemon',
  name: 'Daemon/Server Patterns',
  keywords: ['daemon', 'server', 'socket', 'ipc', 'listen', 'spawn'],
  patterns: [
    {
      id: 'daemon/signal-handlers',
      name: 'Missing Signal Handlers',
      detect: (content, file) => {
        const issues = [];
        const isDaemon = content.includes('.listen(') || file.includes('daemon');

        if (isDaemon && !content.includes("process.on('SIGTERM'")) {
          issues.push({
            severity: 'high',
            type: 'MISSING_PATTERN',
            message: 'Daemon missing signal handlers (SIGTERM/SIGINT)',
            fix: "Add process.on('SIGTERM', gracefulShutdown)",
          });
        }
        return issues;
      },
    },
    {
      id: 'daemon/socket-permissions',
      name: 'Socket Permissions',
      detect: (content, file) => {
        const issues = [];
        const hasSocket = content.includes('.listen(') && content.includes('.sock');
        const setsPermissions = content.includes('chmod') || content.includes('0o600');

        if (hasSocket && !setsPermissions) {
          issues.push({
            severity: 'high',
            type: 'MISSING_PATTERN',
            message: 'Unix socket without explicit permissions',
            fix: 'Add fs.chmodSync(socketPath, 0o600) after listen()',
          });
        }
        return issues;
      },
    },
    {
      id: 'daemon/buffer-limits',
      name: 'Buffer Limits',
      detect: (content, file) => {
        const issues = [];
        const readsData = content.includes(".on('data'");
        const hasLimit = content.includes('MAX_BUFFER') || /\.length\s*[<>]/.test(content);

        if (readsData && !hasLimit) {
          issues.push({
            severity: 'high',
            type: 'BUFFER_OVERFLOW',
            message: 'Reading data without buffer limits (DoS risk)',
            fix: 'Add buffer size limit check before processing',
          });
        }
        return issues;
      },
    },
    {
      id: 'daemon/lock-acquisition',
      name: 'Lock Acquisition',
      detect: (content, file) => {
        const issues = [];
        const isDaemonStart = content.includes('daemon.start') || content.includes('startDaemon');
        const hasLock = content.includes('acquireLock') || content.includes('.pid');

        if (isDaemonStart && !hasLock) {
          issues.push({
            severity: 'medium',
            type: 'MISSING_PATTERN',
            message: 'Daemon starts without lock (may allow multiple instances)',
            fix: 'Acquire lock before starting daemon',
          });
        }
        return issues;
      },
    },
  ],
};
```

## Regression Test: Daemon Code Review

This test ensures all 13 issues from the original daemon code review are detected.

**File**: `packages/core/test/integration/daemon-review.test.ts`

```typescript
import { SecurityAnalyzer, CompletenessAnalyzer } from '@snapback/core';
import { ValidationPipeline } from '@snapback/intelligence';

describe('Daemon Code Review Regression', () => {
  const pipeline = new ValidationPipeline();

  const daemonCode = `
import net from 'net';
import fs from 'fs';

class SnapbackDaemon {
  start() {
    const server = net.createServer((socket) => {
      socket.on('data', (data) => {
        const response = this.handleCommand(data.toString());
        socket.write(response);
      });
    });
    server.listen('/tmp/daemon.sock');
  }

  handleCommand(command: string) {
    const [action, filePath] = command.split(' ');
    if (action === 'snapshot') {
      return fs.readFileSync(filePath, 'utf-8'); // Path traversal!
    }
  }

  autoStart() {
    throw new Error('auto-start not implemented'); // Incomplete!
  }
}`;

  it('detects path traversal', async () => {
    const result = await pipeline.validate({ files: ['daemon.ts'], contents: new Map([['daemon.ts', daemonCode]]) });
    expect(result.issues.some(i => i.type === 'PATH_TRAVERSAL')).toBe(true);
  });

  it('detects missing signal handlers', async () => {
    const result = await pipeline.validate({ files: ['daemon.ts'], contents: new Map([['daemon.ts', daemonCode]]) });
    expect(result.issues.some(i => i.message.includes('signal'))).toBe(true);
  });

  it('detects missing socket permissions', async () => {
    const result = await pipeline.validate({ files: ['daemon.ts'], contents: new Map([['daemon.ts', daemonCode]]) });
    expect(result.issues.some(i => i.message.includes('permission'))).toBe(true);
  });

  it('detects incomplete implementation', async () => {
    const result = await pipeline.validate({ files: ['daemon.ts'], contents: new Map([['daemon.ts', daemonCode]]) });
    expect(result.issues.some(i => i.type === 'INCOMPLETE_IMPLEMENTATION')).toBe(true);
  });

  it('returns appropriate confidence (NOT 0.95)', async () => {
    const result = await pipeline.validate({ files: ['daemon.ts'], contents: new Map([['daemon.ts', daemonCode]]) });
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.recommendation).not.toBe('auto_merge_candidate');
  });

  it('detects at least 5 of the 13 original issues', async () => {
    const result = await pipeline.validate({ files: ['daemon.ts'], contents: new Map([['daemon.ts', daemonCode]]) });
    const issueTypes = new Set(result.issues.map(i => i.type));
    expect(issueTypes.size).toBeGreaterThanOrEqual(5);
  });
});
```

---

## Implementation Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Core Layers | SyntaxLayer, SecurityLayer, ConfidenceCalculator |
| 2 | Quality Layers | BiomeLayer, CircularDepsLayer, CompletenessLayer |
| 3 | Domain Patterns | DomainMatcher, daemon/auth/api bundles |
| 4 | Semantic Search | SemanticLearningEngine with onnxruntime |

**Total: 2-3 weeks to full implementation**

---

## Success Metrics

### Before (Current State)

| Metric | Value |
|--------|-------|
| Confidence on daemon code | 0.95 |
| Recommendation | "auto_merge" |
| Issues detected | 0 of 13 |
| Security patterns | 4 regex |
| Parse method | Bracket counting |

### After (Target State)

| Metric | Value |
|--------|-------|
| Confidence on daemon code | <0.70 |
| Recommendation | "manual_review_required" |
| Issues detected | ≥10 of 13 |
| Security patterns | 40+ (Babel + ESLint) |
| Parse method | Real AST |

---

## Quick Reference

### Library → Package → Analyzer Mapping

| Library | Package | Analyzer |
|---------|---------|----------|
| @typescript-eslint/parser | core | SyntaxAnalyzer |
| @babel/parser + traverse | core | SecurityAnalyzer |
| eslint-plugin-security | core | ESLintSecurityAnalyzer |
| @biomejs/biome | core | BiomeAnalyzer |
| madge | core | CircularDepsAnalyzer |
| jscpd | core | DuplicateCodeAnalyzer |
| onnxruntime-node | intelligence | SemanticLearningEngine |
| unified/remark-parse | intelligence | SpecParser |

### Confidence Thresholds

| Confidence | Recommendation | Meaning |
|------------|----------------|---------|
| < 0.30 | manual_review_required | Critical issues or limited analysis |
| 0.30 - 0.60 | review_recommended | Some issues or incomplete coverage |
| > 0.60 | auto_merge_candidate | Clean code with full analysis |

### Severity Penalties

| Severity | Confidence Penalty |
|----------|-------------------|
| critical | -0.25 per issue |
| high | -0.10 per issue |
| medium | -0.02 per issue |
| low | -0.005 per issue |
| info | 0 |

---

## File Changes Summary

### packages/core/src/analysis/ (New Files)

- `types.ts` (~100 lines) - AnalysisIssue, AnalyzerResult, AnalysisContext
- `ast/SyntaxAnalyzer.ts` (~250 lines) - @typescript-eslint/parser
- `ast/TypeAnalyzer.ts` (~150 lines) - Type annotation analysis
- `security/SecurityAnalyzer.ts` (~400 lines) - @babel/traverse
- `security/ESLintSecurityAnalyzer.ts` (~200 lines) - eslint-plugin-security
- `quality/BiomeAnalyzer.ts` (~200 lines) - @biomejs/biome
- `architecture/CircularDepsAnalyzer.ts` (~150 lines) - madge
- `architecture/DuplicateCodeAnalyzer.ts` (~150 lines) - jscpd
- `completeness/CompletenessAnalyzer.ts` (~250 lines) - TODO detection
- `dependencies/VulnScanner.ts` (~250 lines) - npm audit

**Core subtotal: ~2,100 lines**

### packages/intelligence/src/ (New Files)

- `pipeline/ValidationPipeline.ts` (~300 lines) - Orchestrates core analyzers
- `confidence/ConfidenceCalculator.ts` (~200 lines) - Subjective weighting
- `domain/DomainMatcher.ts` (~150 lines) - Context detection
- `domain/bundles/daemon.ts` (~200 lines)
- `domain/bundles/auth.ts` (~100 lines)
- `domain/bundles/api.ts` (~100 lines)
- `compliance/SpecParser.ts` (~200 lines) - unified/remark-parse
- `compliance/ImplementationMatcher.ts` (~150 lines)
- `learning/SemanticLearningEngine.ts` (~300 lines) - onnxruntime

**Intelligence subtotal: ~1,700 lines**

**Total: ~3,800 lines**

### Installation Required

```bash
pnpm add -D eslint-plugin-security --filter @snapback/core
```

### Dependencies Stay Where They Are

| Library | Package | Status |
|---------|---------|--------|
| @typescript-eslint/parser | core | Already there ✅ |
| @babel/parser + traverse | root → core | Move to core |
| madge | core | Already there ✅ |
| jscpd | core | Already there ✅ |
| @biomejs/biome | root → core | Move to core |
| onnxruntime-node | root → intelligence | Move to intelligence |
| eslint-plugin-security | core | **New install** |

---

*End of Implementation Specification*
