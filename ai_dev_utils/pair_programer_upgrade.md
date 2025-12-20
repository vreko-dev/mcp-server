# Self-Learning Internal Pair Programmer Architecture

**Version:** 1.0
**Status:** Architecture Design
**Context:** Builds on Context Engineering + Adaptive TDD + SnapBack MCP
**Goal:** An AI pair programmer that knows your codebase, learns from mistakes, and gets smarter over time

---

## Executive Summary

This system creates a **living knowledge layer** that sits between your codebase and any LLM (Cursor, Copilot, Claude Code, etc.). It provides:

1. **Instant Context** — LLMs understand your architecture without reading every file
2. **Violation Learning** — Every mistake improves future guidance
3. **Proactive Prevention** — Pattern-matched anti-patterns caught before commit
4. **Codebase Memory** — Remembers why decisions were made, not just what

The key insight: **LLMs are pattern matchers. Feed them your patterns, and they'll match them.**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SELF-LEARNING PAIR PROGRAMMER SYSTEM                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         KNOWLEDGE LAYER                              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ ARCHITECTURE │  │   PATTERNS   │  │ CONSTRAINTS  │               │   │
│  │  │   (static)   │  │  (learned)   │  │   (rules)    │               │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │   │
│  │         │                 │                 │                        │   │
│  │         └─────────────────┼─────────────────┘                        │   │
│  │                           │                                          │   │
│  │                           ▼                                          │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    CONTEXT ASSEMBLER                            │ │   │
│  │  │  Query-based loading: Only fetch what's relevant to task       │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│  ┌──────────────────────────────────▼──────────────────────────────────┐   │
│  │                          MCP SERVER                                  │   │
│  │                                                                      │   │
│  │  Tools exposed to LLMs:                                             │   │
│  │  ├── codebase.get_context(task: string) → RelevantContext           │   │
│  │  ├── codebase.check_patterns(code: string) → PatternViolations      │   │
│  │  ├── codebase.report_violation(details) → void                      │   │
│  │  ├── codebase.get_anti_patterns() → AntiPatterns[]                  │   │
│  │  ├── codebase.query_decisions(topic: string) → DecisionHistory      │   │
│  │  └── codebase.validate_approach(plan: string) → ValidationResult    │   │
│  │                                                                      │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│  ┌──────────────────────────────────▼──────────────────────────────────┐   │
│  │                      FEEDBACK LOOP ENGINE                            │   │
│  │                                                                      │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │   │
│  │  │  PRE-COMMIT │    │   RUNTIME   │    │  VIOLATION  │              │   │
│  │  │    HOOKS    │───▶│  MONITORS   │───▶│   LEARNER   │              │   │
│  │  └─────────────┘    └─────────────┘    └──────┬──────┘              │   │
│  │                                               │                      │   │
│  │                                               ▼                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                   PATTERN PROMOTER                              │ │   │
│  │  │  1x seen → Store in violations.jsonl                           │ │   │
│  │  │  3x seen → Promote to codebase-patterns.md                     │ │   │
│  │  │  5x seen → Add automated detection rule                        │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
.llm-context/
├── README.md                      # How to use this system
├──
├── # ═══════════════════════════════════════════════════════════════════
├── # LAYER 1: CONCEPTUAL (Understanding)
├── # ═══════════════════════════════════════════════════════════════════
├── ARCHITECTURE.md                # System boundaries, data flow, layering
├── FILE_ROLES.md                  # Directory → responsibility mapping
├── TYPE_DEFINITIONS.md            # Key domain types and relationships
├── DATA_FLOW.md                   # How data moves through the system
│
├── # ═══════════════════════════════════════════════════════════════════
├── # LAYER 2: STRUCTURAL (Design)
├── # ═══════════════════════════════════════════════════════════════════
├── PATTERNS.md                    # Design patterns in use
├── CONSTRAINTS.md                 # Hard rules (gate-enforced)
├── API_CONVENTIONS.md             # How APIs are shaped
├── NAMING_CONVENTIONS.md          # Consistent naming rules
│
├── # ═══════════════════════════════════════════════════════════════════
├── # LAYER 3: PRACTICAL (Execution)
├── # ═══════════════════════════════════════════════════════════════════
├── ERROR_HANDLING.md              # Error classification, recovery
├── TESTING.md                     # Test patterns, naming
├── DEPENDENCIES.md                # What's used and why
├── SECURITY.md                    # Input validation, auth patterns
│
├── # ═══════════════════════════════════════════════════════════════════
├── # LAYER 4: PREVENTION (Safety) — THIS IS WHERE LEARNING HAPPENS
├── # ═══════════════════════════════════════════════════════════════════
├── ANTI_PATTERNS.md               # Things LLMs commonly get wrong
├── PERFORMANCE.md                 # Performance budgets, optimization rules
├──
├── # ═══════════════════════════════════════════════════════════════════
├── # DYNAMIC LEARNED KNOWLEDGE (auto-generated, auto-promoted)
├── # ═══════════════════════════════════════════════════════════════════
├── learned/
│   ├── violations.jsonl           # All violations ever recorded
│   ├── promoted-patterns.md       # Patterns promoted from violations (3x+)
│   ├── automated-rules.json       # Rules promoted to automation (5x+)
│   └── decision-log.jsonl         # Why decisions were made
│
├── # ═══════════════════════════════════════════════════════════════════
├── # CONTEXT INDEXES (for fast querying)
├── # ═══════════════════════════════════════════════════════════════════
├── indexes/
│   ├── by-directory.json          # Which docs apply to which directories
│   ├── by-keyword.json            # Keyword → relevant sections
│   └── by-file-type.json          # File extension → relevant patterns
│
└── config.json                    # System configuration
```

---

## Core Documents (with Self-Learning Sections)

### ARCHITECTURE.md (Static + Decision History)

```markdown
# SnapBack Architecture

## System Boundaries

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   VS Code   │────▶│   MCP       │────▶│   Backend   │
│  Extension  │     │   Server    │     │    API      │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Shared    │
                    │   Packages  │
                    └─────────────┘
```

## Layer Responsibilities

| Layer | Responsibility | Can Access | Cannot Access |
|-------|---------------|------------|---------------|
| Extension | UI, save events, snapshot triggers | Core package, local storage | Database, API directly |
| MCP Server | Tool exposure, auth, tier gating | Core, API client | VS Code APIs |
| Backend | Business logic, persistence | Database, external APIs | VS Code, client state |
| Core | Shared algorithms, types | Nothing external | Database, APIs |

## Decision History (Auto-Linked)

When an LLM asks "why is it done this way?", reference:

- **DBSCAN over k-means**: [decision:2024-11-15] - k-means failed for burst detection
- **PostHog consolidation**: [decision:2024-11-20] - 7 providers → 1 for bundle size
- **SSE over WebSocket**: [decision:2024-11-10] - Simpler, sufficient for MCP

<!-- LEARNING: New decisions are appended here automatically -->
```

### ANTI_PATTERNS.md (The Learning Heart)

```markdown
# Anti-Patterns (Self-Learning)

This document grows automatically from violation reports.

## How This Works

1. LLM makes a mistake → pre-commit hook catches it
2. Hook requires violation report → stored in learned/violations.jsonl
3. Same pattern 3x → auto-promoted to this document
4. Same pattern 5x → converted to automated rule

---

## Common LLM Mistakes (Promoted Patterns)

### AP-001: Direct Database Access in Extension
**Frequency:** 7 occurrences
**First Seen:** 2024-11-12
**Root Cause:** LLM doesn't understand layer boundaries

❌ **Wrong:**
```typescript
// apps/vscode/src/snapshot.ts
import { db } from '@snapback/infrastructure'; // WRONG: Extension can't access DB
```

✅ **Correct:**
```typescript
// apps/vscode/src/snapshot.ts
import { createSnapshot } from '@snapback/core'; // Uses local storage
```

**Detection Rule:** Any import of `@snapback/infrastructure` in `apps/vscode/`

---

### AP-002: Missing Error Boundary in React Components
**Frequency:** 5 occurrences
**First Seen:** 2024-11-18
**Root Cause:** LLM defaults to happy-path implementations

❌ **Wrong:**
```tsx
export function Dashboard() {
  const { data } = useMetrics(); // No loading/error states
  return <MetricsChart data={data} />;
}
```

✅ **Correct:**
```tsx
export function Dashboard() {
  const { data, isLoading, error } = useMetrics();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorBoundary error={error} />;

  return <MetricsChart data={data} />;
}
```

**Detection Rule:** React components without loading/error handling for async data

---

## Recently Learned (Not Yet Promoted)

<!-- Auto-populated from violations.jsonl with count < 3 -->

| Pattern | Count | Last Seen | Will Promote At |
|---------|-------|-----------|-----------------|
| console.log instead of logger | 2 | 2024-11-25 | 3 |
| Missing Zod validation on API inputs | 1 | 2024-11-26 | 3 |
```

### CONSTRAINTS.md (Gate-Enforced Rules)

```markdown
# Architectural Constraints (Gate-Enforced)

These rules are verified by automated gates. Violations block commits.

## Hard Rules

### C-001: Privacy-First Data Flow
**Enforced By:** eslint-plugin-snapback-privacy

```typescript
// NEVER: Send code content to external services without explicit opt-in
await api.post('/analyze', { content: fileContent }); // ❌ BLOCKS COMMIT

// ALWAYS: Send metadata only, keep content local
await api.post('/analyze', {
  hash: hashContent(fileContent),
  stats: extractStats(fileContent),
  // No raw content
}); // ✅
```

### C-002: Performance Budgets
**Enforced By:** CI bundle size check

| Metric | Budget | Current | Enforcement |
|--------|--------|---------|-------------|
| Extension activation | <500ms | 380ms | CI gate |
| Bundle size (VSIX) | <2MB | 1.0MB | CI gate |
| Save handler latency | <100ms | 45ms | Unit test |

### C-003: Type Safety End-to-End
**Enforced By:** TypeScript strict mode + Zod

```typescript
// NEVER: Any, unknown, type assertions without validation
const data = response.data as UserData; // ❌ Unsafe

// ALWAYS: Zod validation at boundaries
const data = UserDataSchema.parse(response.data); // ✅
```

<!-- LEARNING: New constraints proposed from violations go to RFC first -->
```

---

## MCP Tool Implementation

Extend your existing MCP server with these context tools:

```typescript
// apps/mcp-server/src/tools/context-tools.ts

import { z } from 'zod';
import { loadContext, queryContext, reportViolation } from '../context';

/**
 * Tools that expose codebase knowledge to LLMs
 */

export const contextTools = {
  /**
   * Get relevant context for a task
   * LLM calls this BEFORE starting any implementation
   */
  'codebase.get_context': {
    description: 'Get architectural context relevant to a development task. Call this before implementing anything.',
    parameters: z.object({
      task: z.string().describe('Description of the task'),
      files: z.array(z.string()).optional().describe('Files you plan to modify'),
      keywords: z.array(z.string()).optional().describe('Relevant keywords'),
    }),
    handler: async ({ task, files, keywords }) => {
      const context = await queryContext({
        task,
        files,
        keywords,
        maxTokens: 2000, // Stay within token budget
      });

      return {
        architecture: context.relevantArchitecture,
        patterns: context.applicablePatterns,
        constraints: context.relevantConstraints,
        antiPatterns: context.relevantAntiPatterns,
        recentViolations: context.recentViolationsInArea,
        decisions: context.relatedDecisions,
      };
    },
  },

  /**
   * Check code against patterns before committing
   */
  'codebase.check_patterns': {
    description: 'Validate code against codebase patterns and anti-patterns',
    parameters: z.object({
      code: z.string().describe('Code to validate'),
      filePath: z.string().describe('Where this code will go'),
    }),
    handler: async ({ code, filePath }) => {
      const violations = await checkPatterns(code, filePath);

      if (violations.length > 0) {
        return {
          valid: false,
          violations: violations.map(v => ({
            pattern: v.patternId,
            message: v.message,
            fix: v.suggestedFix,
            severity: v.severity,
          })),
        };
      }

      return { valid: true, violations: [] };
    },
  },

  /**
   * Report a violation for learning
   */
  'codebase.report_violation': {
    description: 'Report a pattern violation so the system can learn from it',
    parameters: z.object({
      type: z.string().describe('Type of violation'),
      file: z.string().describe('File where violation occurred'),
      whatHappened: z.string().describe('What went wrong'),
      whyItHappened: z.string().describe('Why did this happen (reflection)'),
      prevention: z.string().describe('What would have prevented this'),
    }),
    handler: async (violation) => {
      await reportViolation(violation);

      // Check if this triggers a promotion
      const count = await getViolationCount(violation.type);

      return {
        recorded: true,
        totalOccurrences: count,
        willPromoteAt: 3,
        promoted: count >= 3,
      };
    },
  },

  /**
   * Query why a decision was made
   */
  'codebase.query_decisions': {
    description: 'Get the history behind an architectural decision',
    parameters: z.object({
      topic: z.string().describe('Topic to query (e.g., "why DBSCAN", "why PostHog")'),
    }),
    handler: async ({ topic }) => {
      const decisions = await queryDecisions(topic);

      return {
        decisions: decisions.map(d => ({
          date: d.date,
          decision: d.decision,
          rationale: d.rationale,
          alternatives: d.consideredAlternatives,
          outcome: d.outcome,
        })),
      };
    },
  },

  /**
   * Validate an approach before implementing
   */
  'codebase.validate_approach': {
    description: 'Check if a planned approach aligns with codebase patterns',
    parameters: z.object({
      plan: z.string().describe('Description of the planned approach'),
      files: z.array(z.string()).describe('Files that will be modified'),
    }),
    handler: async ({ plan, files }) => {
      const validation = await validateApproach(plan, files);

      return {
        approved: validation.approved,
        concerns: validation.concerns,
        suggestions: validation.suggestions,
        relevantPatterns: validation.patternsToFollow,
        antiPatternsToAvoid: validation.antiPatternsRisk,
      };
    },
  },
};
```

---

## Feedback Loop Implementation

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit (or .husky/pre-commit)

# Run pattern check
VIOLATIONS=$(npx llm-context check-patterns --staged)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ Pattern violations detected:"
  echo "$VIOLATIONS"
  echo ""
  echo "Options:"
  echo "  1. Fix the violations"
  echo "  2. Run: npx llm-context report-violation --interactive"
  echo "     (to record why this happened and update docs)"
  echo ""
  exit 1
fi
```

### Violation Reporter CLI

```typescript
// tools/llm-context/src/commands/report-violation.ts

import inquirer from 'inquirer';
import { appendViolation, checkPromotion } from '../learning';

export async function reportViolation() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What type of violation?',
      choices: [
        'layer-boundary-violation',
        'missing-error-handling',
        'wrong-import-pattern',
        'performance-budget-exceeded',
        'type-safety-bypass',
        'other',
      ],
    },
    {
      type: 'input',
      name: 'file',
      message: 'Which file?',
    },
    {
      type: 'editor',
      name: 'whatHappened',
      message: 'What happened? (Describe the violation)',
    },
    {
      type: 'editor',
      name: 'whyItHappened',
      message: 'Why did this happen? (Reflect - this is required)',
    },
    {
      type: 'editor',
      name: 'prevention',
      message: 'What would have prevented this?',
    },
  ]);

  await appendViolation({
    ...answers,
    timestamp: new Date().toISOString(),
    git: {
      branch: await getCurrentBranch(),
      commit: await getLastCommit(),
    },
  });

  const count = await getViolationCount(answers.type);

  console.log(`\n✅ Violation recorded (${count}/3 for promotion)`);

  if (count >= 3) {
    await promoteToAntiPatterns(answers);
    console.log('📈 Pattern promoted to ANTI_PATTERNS.md');
  }

  if (count >= 5) {
    await promoteToAutomatedRule(answers);
    console.log('🤖 Added automated detection rule');
  }
}
```

### Learning Engine

```typescript
// tools/llm-context/src/learning/index.ts

import { jsonlAppend, jsonlQuery } from '../utils/jsonl';
import { updateMarkdown } from '../utils/markdown';

interface Violation {
  type: string;
  file: string;
  whatHappened: string;
  whyItHappened: string;
  prevention: string;
  timestamp: string;
  git: { branch: string; commit: string };
}

const VIOLATIONS_PATH = '.llm-context/learned/violations.jsonl';
const ANTI_PATTERNS_PATH = '.llm-context/ANTI_PATTERNS.md';
const RULES_PATH = '.llm-context/learned/automated-rules.json';

export async function appendViolation(violation: Violation) {
  await jsonlAppend(VIOLATIONS_PATH, violation);
}

export async function getViolationCount(type: string): Promise<number> {
  const violations = await jsonlQuery(VIOLATIONS_PATH, { type });
  return violations.length;
}

export async function promoteToAntiPatterns(violation: Violation) {
  const all = await jsonlQuery(VIOLATIONS_PATH, { type: violation.type });

  // Generate anti-pattern entry from violation examples
  const entry = generateAntiPatternEntry(violation.type, all);

  // Append to ANTI_PATTERNS.md
  await updateMarkdown(ANTI_PATTERNS_PATH, {
    section: '## Common LLM Mistakes (Promoted Patterns)',
    append: entry,
  });
}

export async function promoteToAutomatedRule(violation: Violation) {
  const rules = await readJson(RULES_PATH);

  // Generate detection rule from pattern
  const rule = generateDetectionRule(violation);

  rules.push(rule);
  await writeJson(RULES_PATH, rules);
}

function generateAntiPatternEntry(type: string, violations: Violation[]): string {
  const id = `AP-${String(violations.length).padStart(3, '0')}`;
  const firstSeen = violations[0].timestamp.split('T')[0];

  // Use the best examples from violations
  const wrongExample = extractWrongExample(violations);
  const rightExample = extractCorrectExample(violations);
  const detection = generateDetectionHint(violations);

  return `
### ${id}: ${formatType(type)}
**Frequency:** ${violations.length} occurrences
**First Seen:** ${firstSeen}
**Root Cause:** ${summarizeRootCauses(violations)}

❌ **Wrong:**
\`\`\`typescript
${wrongExample}
\`\`\`

✅ **Correct:**
\`\`\`typescript
${rightExample}
\`\`\`

**Detection Rule:** ${detection}

---
`;
}
```

---

## Context Query Engine

```typescript
// tools/llm-context/src/context/index.ts

import { loadAllContext } from './loader';
import { buildIndex } from './indexer';
import { rankRelevance } from './ranker';

interface QueryOptions {
  task: string;
  files?: string[];
  keywords?: string[];
  maxTokens?: number;
}

interface ContextResult {
  relevantArchitecture: string;
  applicablePatterns: string[];
  relevantConstraints: string[];
  relevantAntiPatterns: string[];
  recentViolationsInArea: string[];
  relatedDecisions: string[];
}

export async function queryContext(options: QueryOptions): Promise<ContextResult> {
  const { task, files = [], keywords = [], maxTokens = 2000 } = options;

  // Load indexes (cached after first load)
  const indexes = await loadIndexes();

  // Determine relevant directories from files
  const directories = files.map(f => path.dirname(f));

  // Find relevant sections using indexes
  const relevantSections = await findRelevantSections({
    task,
    directories,
    keywords,
    indexes,
  });

  // Rank by relevance to task
  const ranked = await rankRelevance(relevantSections, task);

  // Trim to token budget
  const trimmed = trimToTokenBudget(ranked, maxTokens);

  return {
    relevantArchitecture: trimmed.architecture,
    applicablePatterns: trimmed.patterns,
    relevantConstraints: trimmed.constraints,
    relevantAntiPatterns: trimmed.antiPatterns,
    recentViolationsInArea: await getRecentViolations(directories),
    relatedDecisions: await queryDecisions(keywords),
  };
}

async function findRelevantSections(params: {
  task: string;
  directories: string[];
  keywords: string[];
  indexes: Indexes;
}) {
  const { directories, keywords, indexes } = params;

  const sections: Section[] = [];

  // Query by directory
  for (const dir of directories) {
    const dirSections = indexes.byDirectory[dir] || [];
    sections.push(...dirSections);
  }

  // Query by keyword
  for (const keyword of keywords) {
    const keywordSections = indexes.byKeyword[keyword.toLowerCase()] || [];
    sections.push(...keywordSections);
  }

  // Dedupe and return
  return [...new Set(sections)];
}
```

---

## Integration Points

### 1. System Prompt Injection (Simple)

Add to your Cursor/Claude rules:

```markdown
# .cursorrules or CLAUDE.md

Before implementing ANY feature:
1. Call `codebase.get_context` with the task description
2. Review returned patterns and constraints
3. Check `codebase.validate_approach` with your plan

After making mistakes:
1. Call `codebase.report_violation` with reflection
2. The system learns from your mistakes to help future sessions

Available tools:
- codebase.get_context: Get relevant architectural context
- codebase.check_patterns: Validate code before committing
- codebase.report_violation: Report and learn from mistakes
- codebase.query_decisions: Understand why things are done
```

### 2. MCP Server Integration (Powerful)

Already covered above — expose tools through your existing MCP infrastructure.

### 3. CI/CD Integration

```yaml
# .github/workflows/validate-patterns.yml

name: Pattern Validation

on: [push, pull_request]

jobs:
  check-patterns:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for pattern violations
        run: npx llm-context check-patterns --all

      - name: Validate anti-patterns
        run: npx llm-context validate-anti-patterns

      - name: Check for unrecorded violations
        run: npx llm-context audit-violations
```

---

## How It Gets Smarter Over Time

```
Week 1: Bootstrap
├── You write initial ARCHITECTURE.md, PATTERNS.md, CONSTRAINTS.md
├── ANTI_PATTERNS.md starts empty
└── violations.jsonl is empty

Week 2: First Violations
├── LLM makes mistakes, pre-commit catches them
├── Violations get recorded with reflection
├── learned/violations.jsonl grows
└── "Recently Learned" section populates

Week 4: First Promotions
├── Pattern seen 3x → promoted to ANTI_PATTERNS.md
├── Detection hints added
├── LLM starts seeing these in context
└── Same mistakes decrease

Week 8: Automation
├── Pattern seen 5x → automated detection rule
├── Pre-commit catches automatically
├── No manual intervention needed
└── LLM error rate drops significantly

Month 3+: Self-Sustaining
├── System catches most violations automatically
├── New edge cases get captured and learned
├── Documentation stays current via violations
└── Onboarding new devs/LLMs is instant
```

---

## SnapBack-Specific Application

This system becomes **even more powerful** when integrated with SnapBack:

### 1. Snapshot Trigger Enhancement

```typescript
// When violation is detected, auto-create snapshot
async function onViolationDetected(violation: Violation) {
  // Create snapshot before the risky change
  await snapback.createCheckpoint({
    reason: `Pre-violation checkpoint: ${violation.type}`,
    metadata: {
      violationType: violation.type,
      file: violation.file,
      automatic: true,
    },
  });

  // Log for learning
  await reportViolation(violation);
}
```

### 2. Risk Score Enhancement

```typescript
// Use violation history to enhance risk scoring
function calculateRiskScore(change: CodeChange): number {
  const baseRisk = calculateBaseRisk(change);

  // Check if this file/pattern has violation history
  const violationHistory = await getViolationsForFile(change.file);

  if (violationHistory.length > 0) {
    // Increase risk for historically problematic areas
    return baseRisk * (1 + (violationHistory.length * 0.1));
  }

  return baseRisk;
}
```

### 3. Recovery Enhancement

```typescript
// When restoring, explain what went wrong
async function restoreWithContext(checkpointId: string) {
  const checkpoint = await snapback.getCheckpoint(checkpointId);

  if (checkpoint.metadata?.violationType) {
    // Get the anti-pattern context
    const context = await queryContext({
      task: 'restore from violation',
      keywords: [checkpoint.metadata.violationType],
    });

    return {
      restored: true,
      explanation: `Restored because of: ${checkpoint.metadata.violationType}`,
      prevention: context.relevantAntiPatterns,
      recommendation: "Review anti-patterns before reimplementing",
    };
  }

  return { restored: true };
}
```

---

## Getting Started

### Phase 1: Bootstrap (1 day)

```bash
# Create the directory structure
mkdir -p .llm-context/learned .llm-context/indexes

# Initialize core documents
touch .llm-context/{ARCHITECTURE,PATTERNS,CONSTRAINTS,ANTI_PATTERNS,FILE_ROLES}.md
touch .llm-context/learned/violations.jsonl
touch .llm-context/config.json
```

### Phase 2: Populate Core Docs (2-3 days)

Fill in based on what you already know:
- `ARCHITECTURE.md` — draw your system boundaries
- `PATTERNS.md` — document the patterns you use
- `CONSTRAINTS.md` — write down your unwritten rules
- `FILE_ROLES.md` — map directories to responsibilities

### Phase 3: Add MCP Tools (1 day)

Extend your existing MCP server with the context tools.

### Phase 4: Add Hooks (0.5 days)

Add pre-commit hooks for violation detection.

### Phase 5: Iterate (ongoing)

Let the system learn from real usage.

---

## Key Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| LLM error rate | -50% in 30 days | violations.jsonl frequency |
| Time to onboard new LLM | <1 hour | Time to first correct implementation |
| Repeat violations | <2 before promotion | Auto-tracked |
| Context relevance | >80% useful | Manual review of queries |

---

## Summary

This architecture gives you:

1. **Instant Context** — LLMs understand your codebase without reading everything
2. **Continuous Learning** — Every mistake makes the system smarter
3. **Graduated Enforcement** — Soft guidance → hard gates as patterns stabilize
4. **Token Efficiency** — Query-based loading, not front-loaded prompts
5. **Integration Ready** — Works with any LLM through MCP or prompts

The key insight from your original observation holds: **the asymmetry between vibecoding externally and understanding internally is the core problem**. This system makes your internal architecture externally legible — not for humans (though it helps them), but for machines.
