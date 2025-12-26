# SnapBack MCP Pair Programming Tools Specification

**Version:** 2.0
**Status:** Draft
**Last Updated:** December 2025
**Goal:** Transform SnapBack from "safety net" (7/10) to "pair programmer" (8+/10)

---

## Executive Summary

This specification defines enhancements to SnapBack's MCP tools based on direct feedback from an AI agent that used the system during a development session. The core insight: **SnapBack is currently pull-based (AI must ask) when pair programming is push-based (collaborator proactively reacts).**

### Key Changes

| Current State | Target State |
|---------------|--------------|
| 5+ tool calls to start a task | 1 tool call (`begin_task`) |
| Manual snapshot creation | Automatic based on risk assessment |
| Generic learnings | Project-specific, contextual |
| No awareness of changes | Tracks changes since task start |
| Passive validation | Proactive observations on next call |
| Separate TypeScript/test checks | Unified `quick_check` |

### Success Metrics

- Reduce tool calls per task from 5+ to 2-3
- Achieve 8/10 "pair programmer" rating (from 4/10)
- Maintain 7/10 "code safety" rating
- Sub-200ms response time for all tools

---

## Part 1: Tool Architecture

### 1.1 Tool Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPOSITE TOOLS (User-Facing)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  begin_task ──────► Combines: get_context + snapshot_create +       │
│                              get_learnings + session.start          │
│                                                                     │
│  review_work ─────► Combines: check_patterns + diff analysis +      │
│                              learning capture + violation report    │
│                                                                     │
│  quick_check ─────► Fast: TypeScript + tests + lint (parallel)      │
│                                                                     │
│  what_changed ────► Shows: Changes since begin_task was called      │
│                                                                     │
│  complete_task ───► Combines: review_work + session.end +           │
│                              learning prompts                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     PRIMITIVE TOOLS (Still Available)               │
├─────────────────────────────────────────────────────────────────────┤
│  get_context, snapshot_create, snapshot_restore, check_patterns,    │
│  learn, get_learnings, report_violation, validate, session,         │
│  prepare_workspace, acknowledge_risk, analyze, context, cleanup     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 State Management

SnapBack MCP will maintain session state across tool calls:

```typescript
interface MCPSessionState {
  // Task tracking
  currentTask: {
    id: string;
    description: string;
    startedAt: Date;
    plannedFiles: string[];
    snapshotId?: string;
  } | null;

  // Change tracking (populated by extension bridge)
  changesSinceTaskStart: {
    file: string;
    type: 'created' | 'modified' | 'deleted';
    timestamp: Date;
    aiAttributed: boolean;
    linesChanged: number;
  }[];

  // Proactive observations (populated by extension)
  pendingObservations: {
    type: 'risk' | 'pattern' | 'suggestion' | 'warning';
    message: string;
    timestamp: Date;
    context?: Record<string, unknown>;
  }[];

  // Learnings surfaced this session
  surfacedLearnings: string[];

  // Risk areas touched
  riskAreasTouched: ('auth' | 'payment' | 'database' | 'config' | 'api')[];
}
```

---

## Part 2: Tool Specifications

### 2.1 `begin_task` — Start Any Development Task

**Purpose:** Single entry point that replaces the `get_context` → `snapshot_create` → `get_learnings` → `session.start` workflow.

**When to Use:**
- Starting ANY new task (refactoring, feature, bug fix)
- Before making multi-file changes
- When switching to a different area of the codebase

```typescript
interface BeginTaskInput {
  /** Brief description of what you're about to do */
  task: string;

  /** Files you plan to modify (optional but improves suggestions) */
  files?: string[];

  /** Keywords for learning retrieval (auto-extracted from task if not provided) */
  keywords?: string[];

  /** Skip snapshot creation (default: false, auto-decides based on risk) */
  skipSnapshot?: boolean;
}

interface BeginTaskOutput {
  taskId: string;

  /** Snapshot created (if risk warranted it) */
  snapshot: {
    created: boolean;
    id?: string;
    reason?: string; // "High risk: modifying auth code"
  };

  /** Project patterns relevant to this task */
  patterns: {
    name: string;
    description: string;
    examples?: string[];
  }[];

  /** Constraints that apply to planned files */
  constraints: {
    domain: string;
    name: string;
    value: number | string;
    description: string;
  }[];

  /** Learnings relevant to task keywords */
  learnings: {
    type: 'pattern' | 'pitfall' | 'efficiency' | 'discovery' | 'workflow';
    trigger: string;
    action: string;
    source?: string;
    relevanceScore: number;
  }[];

  /** Proactive observations from extension (if any pending) */
  observations: {
    type: string;
    message: string;
  }[];

  /** Risk assessment for planned files */
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    riskAreas: string[];
    recommendations: string[];
  };

  /** Suggested next actions */
  nextActions: string[];
}
```

**Implementation Logic:**

```typescript
async function beginTask(input: BeginTaskInput): Promise<BeginTaskOutput> {
  const state = getSessionState();

  // 1. Extract keywords from task description if not provided
  const keywords = input.keywords ?? extractKeywords(input.task);

  // 2. Gather context (patterns, constraints)
  const context = await gatherContext(input.task, input.files);

  // 3. Assess risk of planned files
  const riskAssessment = await assessRisk(input.files ?? []);

  // 4. Auto-decide snapshot creation (with deduplication check)
  let snapshot = { created: false };
  if (!input.skipSnapshot && shouldAutoSnapshot(riskAssessment, input.files)) {
    const filesToSnapshot = input.files ?? await getRecentlyModifiedFiles();

    // CRITICAL: Check if files have changed since last snapshot
    const hasChanged = await hasChangedSinceLastSnapshot(filesToSnapshot);

    if (hasChanged) {
      const snapshotResult = await createSnapshot({
        files: filesToSnapshot,
        reason: `Pre-task: ${input.task}`,
        trigger: 'ai_assist',
      });
      snapshot = {
        created: true,
        id: snapshotResult.snapshotId,
        reason: `Auto-created: ${riskAssessment.overallRisk} risk task touching ${riskAssessment.riskAreas.join(', ')}`,
      };
    } else {
      // Files unchanged - reuse existing snapshot
      const lastSnapshot = await getLastSnapshotForFiles(filesToSnapshot);
      snapshot = {
        created: false,
        id: lastSnapshot?.id,
        reason: `Reusing existing snapshot: files unchanged since ${lastSnapshot?.createdAt}`,
      };
    }
  }

  // 5. Retrieve relevant learnings
  const learnings = await getLearnings(keywords);

  // 6. Drain pending observations from extension
  const observations = drainPendingObservations(state);

  // 7. Update session state
  state.currentTask = {
    id: generateTaskId(),
    description: input.task,
    startedAt: new Date(),
    plannedFiles: input.files ?? [],
    snapshotId: snapshot.id,
  };
  state.changesSinceTaskStart = [];
  state.riskAreasTouched = riskAssessment.riskAreas;

  // 8. Generate next actions
  const nextActions = generateNextActions(riskAssessment, learnings);

  return {
    taskId: state.currentTask.id,
    snapshot,
    patterns: context.patterns,
    constraints: context.constraints,
    learnings: learnings.map(l => ({ ...l, relevanceScore: l.score })),
    observations,
    riskAssessment,
    nextActions,
  };
}

function shouldAutoSnapshot(
  risk: RiskAssessment,
  files?: string[]
): boolean {
  // Always snapshot for high risk
  if (risk.overallRisk === 'high') return true;

  // Snapshot if touching auth/payment/database
  const criticalAreas = ['auth', 'payment', 'database'];
  if (risk.riskAreas.some(a => criticalAreas.includes(a))) return true;

  // Snapshot if modifying 3+ files
  if (files && files.length >= 3) return true;

  // Medium risk + config files
  if (risk.overallRisk === 'medium' &&
      files?.some(f => f.includes('config') || f.endsWith('.env'))) {
    return true;
  }

  return false;
}

/**
 * CRITICAL: Check if snapshot would be identical to most recent snapshot.
 * Uses content-addressable storage hashes to compare without reading file contents.
 *
 * Returns true if files have changed since last snapshot, false if identical.
 */
async function hasChangedSinceLastSnapshot(files: string[]): Promise<boolean> {
  // Get the most recent snapshot for these files
  const lastSnapshot = await getLastSnapshotForFiles(files);

  if (!lastSnapshot) {
    // No previous snapshot exists - definitely create one
    return true;
  }

  // Calculate current content hashes for all files
  const currentHashes = await Promise.all(
    files.map(async (file) => ({
      file,
      hash: await calculateFileHash(file),
    }))
  );

  // Compare with snapshot manifest hashes
  for (const { file, hash } of currentHashes) {
    const snapshotHash = lastSnapshot.manifest.files[file]?.hash;

    if (!snapshotHash || snapshotHash !== hash) {
      // File is new or changed
      return true;
    }
  }

  // Check if any files were removed
  const currentFileSet = new Set(files);
  for (const snapshotFile of Object.keys(lastSnapshot.manifest.files)) {
    if (!currentFileSet.has(snapshotFile)) {
      // File was in last snapshot but not in current set
      return true;
    }
  }

  // All files identical - skip snapshot creation
  return false;
}

/**
 * Get the most recent snapshot that includes any of the specified files.
 */
async function getLastSnapshotForFiles(files: string[]): Promise<Snapshot | null> {
  const snapshots = await listSnapshots({ limit: 10, sortOrder: 'desc' });

  for (const snapshot of snapshots) {
    // Check if this snapshot covers any of our files
    const snapshotFiles = Object.keys(snapshot.manifest.files);
    const hasOverlap = files.some(f => snapshotFiles.includes(f));

    if (hasOverlap) {
      return snapshot;
    }
  }

  return null;
}
```

**Example Interaction:**

```
User: "I need to add rate limiting to the authentication endpoints"

AI calls: begin_task({
  task: "Add rate limiting to authentication endpoints",
  files: ["src/auth/middleware.ts", "src/auth/login.ts", "src/config/rate-limits.ts"],
  keywords: ["rate limiting", "auth", "middleware"]
})

Response:
{
  taskId: "task_abc123",
  snapshot: {
    created: true,
    id: "snap_xyz789",
    reason: "Auto-created: high risk task touching auth, config"
  },
  patterns: [
    {
      name: "middleware-pattern",
      description: "All middleware should follow the (req, res, next) signature with error handling"
    },
    {
      name: "rate-limit-convention",
      description: "Rate limits defined in src/config/rate-limits.ts with per-endpoint overrides"
    }
  ],
  constraints: [
    { domain: "auth", name: "max-login-attempts", value: 5, description: "Maximum login attempts before lockout" }
  ],
  learnings: [
    {
      type: "pitfall",
      trigger: "Adding middleware to auth routes",
      action: "Remember to update the middleware chain in app.ts, not just the route file",
      relevanceScore: 0.92
    },
    {
      type: "pattern",
      trigger: "Rate limiting implementation",
      action: "Use the existing calculateBackoff from @snapback/sdk for exponential backoff",
      relevanceScore: 0.88
    }
  ],
  observations: [
    {
      type: "warning",
      message: "login.ts was modified 2 hours ago and has uncommitted changes"
    }
  ],
  riskAssessment: {
    overallRisk: "high",
    riskAreas: ["auth", "config"],
    recommendations: [
      "Test with both valid and invalid credentials",
      "Verify rate limit headers are returned to clients",
      "Check that lockout doesn't affect other users"
    ]
  },
  nextActions: [
    "Review the existing rate limit config structure",
    "Check login.ts for existing middleware patterns",
    "Consider adding unit tests for the new middleware"
  ]
}
```

---

### 2.2 `quick_check` — Fast Validation

**Purpose:** Single command to answer "did I break anything?" — runs TypeScript, tests, and lint in parallel.

**When to Use:**
- After making changes and before committing
- When unsure if recent edits introduced errors
- As a fast feedback loop during development

```typescript
interface QuickCheckInput {
  /** Specific files to check (default: changed files since task start) */
  files?: string[];

  /** Which checks to run (default: all) */
  checks?: ('typescript' | 'tests' | 'lint')[];

  /** Run related tests only (default: true) */
  relatedTestsOnly?: boolean;

  /** Timeout in ms (default: 30000) */
  timeout?: number;
}

interface QuickCheckOutput {
  /** Overall pass/fail */
  passed: boolean;

  /** Time taken */
  durationMs: number;

  /** TypeScript check results */
  typescript: {
    passed: boolean;
    errorCount: number;
    errors: {
      file: string;
      line: number;
      message: string;
      code: string;
    }[];
  };

  /** Test results */
  tests: {
    passed: boolean;
    total: number;
    passed_count: number;
    failed_count: number;
    skipped_count: number;
    failures: {
      name: string;
      file: string;
      message: string;
    }[];
  };

  /** Lint results */
  lint: {
    passed: boolean;
    errorCount: number;
    warningCount: number;
    issues: {
      file: string;
      line: number;
      rule: string;
      message: string;
      severity: 'error' | 'warning';
    }[];
  };

  /** Summary for quick reading */
  summary: string;

  /** Suggested fixes */
  suggestions: string[];
}
```

**Implementation Logic:**

```typescript
async function quickCheck(input: QuickCheckInput): Promise<QuickCheckOutput> {
  const state = getSessionState();
  const startTime = Date.now();

  // Determine files to check
  const files = input.files ??
    state.changesSinceTaskStart.map(c => c.file);

  const checks = input.checks ?? ['typescript', 'tests', 'lint'];

  // Run checks in parallel
  const [tsResult, testResult, lintResult] = await Promise.all([
    checks.includes('typescript')
      ? runTypeScriptCheck(files)
      : { passed: true, errorCount: 0, errors: [] },
    checks.includes('tests')
      ? runTests(files, input.relatedTestsOnly ?? true)
      : { passed: true, total: 0, passed_count: 0, failed_count: 0, skipped_count: 0, failures: [] },
    checks.includes('lint')
      ? runLint(files)
      : { passed: true, errorCount: 0, warningCount: 0, issues: [] },
  ]);

  const passed = tsResult.passed && testResult.passed && lintResult.passed;
  const durationMs = Date.now() - startTime;

  // Generate summary
  const summary = generateSummary(passed, tsResult, testResult, lintResult);

  // Generate fix suggestions
  const suggestions = generateFixSuggestions(tsResult, testResult, lintResult);

  return {
    passed,
    durationMs,
    typescript: tsResult,
    tests: testResult,
    lint: lintResult,
    summary,
    suggestions,
  };
}

async function runTypeScriptCheck(files: string[]): Promise<TypeScriptResult> {
  const { execSync } = require('child_process');

  try {
    // Run tsc with --noEmit on specific files
    execSync(`npx tsc --noEmit ${files.join(' ')}`, {
      timeout: 10000,
      encoding: 'utf-8',
    });
    return { passed: true, errorCount: 0, errors: [] };
  } catch (error) {
    return parseTypeScriptErrors(error.stdout || error.message);
  }
}

async function runTests(files: string[], relatedOnly: boolean): Promise<TestResult> {
  const { execSync } = require('child_process');

  try {
    const testPattern = relatedOnly
      ? `--related ${files.join(' ')}`
      : '';

    const output = execSync(
      `npx vitest run ${testPattern} --reporter=json`,
      { timeout: 20000, encoding: 'utf-8' }
    );

    return parseVitestOutput(output);
  } catch (error) {
    return parseVitestOutput(error.stdout || '');
  }
}
```

**Example Interaction:**

```
User: "I've made the changes, let me check if anything broke"

AI calls: quick_check({})

Response:
{
  passed: false,
  durationMs: 2340,
  typescript: {
    passed: false,
    errorCount: 2,
    errors: [
      {
        file: "src/auth/middleware.ts",
        line: 45,
        message: "Property 'rateLimit' does not exist on type 'Request'",
        code: "TS2339"
      },
      {
        file: "src/auth/middleware.ts",
        line: 52,
        message: "Type 'number' is not assignable to type 'string'",
        code: "TS2322"
      }
    ]
  },
  tests: {
    passed: true,
    total: 12,
    passed_count: 12,
    failed_count: 0,
    skipped_count: 0,
    failures: []
  },
  lint: {
    passed: true,
    errorCount: 0,
    warningCount: 1,
    issues: [
      {
        file: "src/auth/middleware.ts",
        line: 48,
        rule: "no-magic-numbers",
        message: "Avoid magic number 429",
        severity: "warning"
      }
    ]
  },
  summary: "❌ 2 TypeScript errors, ✅ 12/12 tests passing, ⚠️ 1 lint warning",
  suggestions: [
    "Add 'rateLimit' to the Request type in src/types/express.d.ts",
    "Convert the rate limit response to string using .toString()",
    "Consider extracting 429 to a constant like HTTP_TOO_MANY_REQUESTS"
  ]
}
```

---

### 2.3 `review_work` — Comprehensive Change Review

**Purpose:** "Review my changes" — analyzes diff, runs validation, surfaces issues, and captures learnings.

**When to Use:**
- Before committing changes
- After implementing a feature or fix
- When you want comprehensive feedback on what you've done

```typescript
interface ReviewWorkInput {
  /** Git diff or file contents to review (auto-detected if not provided) */
  diff?: string;

  /** What you were trying to accomplish */
  intent?: string;

  /** Include AI-enhanced analysis (requires opt-in, metadata only) */
  aiEnhanced?: boolean;

  /** Specific aspects to focus on */
  focus?: ('security' | 'performance' | 'patterns' | 'tests' | 'all')[];
}

interface ReviewWorkOutput {
  /** Overall assessment */
  assessment: {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    summary: string;
    confidence: number;
  };

  /** Changes analyzed */
  changesSummary: {
    filesModified: number;
    linesAdded: number;
    linesRemoved: number;
    riskAreas: string[];
  };

  /** Issues found */
  issues: {
    severity: 'critical' | 'warning' | 'info';
    category: 'security' | 'performance' | 'pattern' | 'test' | 'style';
    file: string;
    line?: number;
    message: string;
    suggestion?: string;
  }[];

  /** Pattern violations detected */
  violations: {
    pattern: string;
    description: string;
    file: string;
    suggestion: string;
  }[];

  /** Positive observations */
  positives: {
    category: string;
    observation: string;
  }[];

  /** Suggested learnings to capture */
  suggestedLearnings: {
    type: 'pattern' | 'pitfall' | 'efficiency' | 'discovery' | 'workflow';
    trigger: string;
    action: string;
    shouldCapture: boolean;
    reason: string;
  }[];

  /** Test coverage for changed code */
  testCoverage: {
    covered: boolean;
    coveragePercent: number;
    untestedFiles: string[];
    suggestedTests: string[];
  };

  /** Ready to commit? */
  commitReady: {
    ready: boolean;
    blockers: string[];
    warnings: string[];
  };
}
```

**Implementation Logic:**

```typescript
async function reviewWork(input: ReviewWorkInput): Promise<ReviewWorkOutput> {
  const state = getSessionState();

  // 1. Get diff (from input, git, or tracked changes)
  const diff = input.diff ??
    await getGitDiff() ??
    reconstructDiffFromChanges(state.changesSinceTaskStart);

  // 2. Parse diff into structured format
  const parsedDiff = parseDiff(diff);

  // 3. Run 7-layer validation pipeline
  const validationResults = await runValidationPipeline(parsedDiff, input.focus);

  // 4. Check against project patterns
  const patternViolations = await checkPatternViolations(parsedDiff);

  // 5. Analyze test coverage
  const testCoverage = await analyzeTestCoverage(parsedDiff.files);

  // 6. Identify positive patterns
  const positives = identifyPositives(parsedDiff, validationResults);

  // 7. Generate learning suggestions
  const suggestedLearnings = generateLearningSuggestions(
    input.intent ?? state.currentTask?.description,
    validationResults,
    patternViolations
  );

  // 8. Calculate overall grade
  const grade = calculateGrade(validationResults, patternViolations, testCoverage);

  // 9. Determine commit readiness
  const commitReady = assessCommitReadiness(validationResults, patternViolations);

  // 10. Optional: AI-enhanced analysis (metadata only)
  let enhancedInsights = null;
  if (input.aiEnhanced && isAIEnhancedEnabled()) {
    enhancedInsights = await getAIEnhancedAnalysis({
      intent: input.intent,
      fileTypes: parsedDiff.files.map(f => getFileType(f)),
      changeMetrics: {
        linesAdded: parsedDiff.additions,
        linesRemoved: parsedDiff.deletions,
        filesChanged: parsedDiff.files.length,
      },
      riskAreas: validationResults.riskAreas,
      // NO code content sent
    });
  }

  return {
    assessment: {
      grade,
      summary: generateAssessmentSummary(grade, validationResults),
      confidence: calculateConfidence(validationResults),
    },
    changesSummary: {
      filesModified: parsedDiff.files.length,
      linesAdded: parsedDiff.additions,
      linesRemoved: parsedDiff.deletions,
      riskAreas: validationResults.riskAreas,
    },
    issues: validationResults.issues,
    violations: patternViolations,
    positives,
    suggestedLearnings,
    testCoverage,
    commitReady,
  };
}
```

**Example Interaction:**

```
User: "Review what I've done"

AI calls: review_work({
  intent: "Add rate limiting to authentication endpoints"
})

Response:
{
  assessment: {
    grade: "B",
    summary: "Solid implementation with minor issues. Rate limiting logic is correct, but missing edge case handling.",
    confidence: 0.85
  },
  changesSummary: {
    filesModified: 3,
    linesAdded: 87,
    linesRemoved: 12,
    riskAreas: ["auth", "config"]
  },
  issues: [
    {
      severity: "warning",
      category: "security",
      file: "src/auth/middleware.ts",
      line: 67,
      message: "Rate limit key uses IP only - consider adding user ID for authenticated requests",
      suggestion: "Use composite key: `${ip}:${userId ?? 'anon'}`"
    },
    {
      severity: "info",
      category: "performance",
      file: "src/auth/middleware.ts",
      line: 45,
      message: "Consider using Redis for rate limit storage in production",
      suggestion: "Current in-memory storage won't work with multiple server instances"
    }
  ],
  violations: [
    {
      pattern: "error-handling",
      description: "Rate limit exceeded should return structured error",
      file: "src/auth/middleware.ts",
      suggestion: "Return { error: 'RATE_LIMITED', retryAfter: seconds } instead of plain text"
    }
  ],
  positives: [
    {
      category: "patterns",
      observation: "Good use of existing calculateBackoff utility"
    },
    {
      category: "security",
      observation: "Proper constant-time comparison for rate limit headers"
    }
  ],
  suggestedLearnings: [
    {
      type: "pitfall",
      trigger: "Implementing rate limiting with IP-only keys",
      action: "Use composite keys (IP + userID) to prevent authenticated user abuse",
      shouldCapture: true,
      reason: "This is a common security oversight worth remembering"
    },
    {
      type: "pattern",
      trigger: "Rate limiting middleware",
      action: "Always include Retry-After header in 429 responses",
      shouldCapture: true,
      reason: "This implementation correctly includes it - good to reinforce"
    }
  ],
  testCoverage: {
    covered: false,
    coveragePercent: 45,
    untestedFiles: ["src/auth/middleware.ts"],
    suggestedTests: [
      "Test rate limit triggers after N requests",
      "Test rate limit reset after window expires",
      "Test that different IPs have separate limits",
      "Test 429 response includes correct headers"
    ]
  },
  commitReady: {
    ready: false,
    blockers: [
      "Add tests for rate limiting middleware"
    ],
    warnings: [
      "Consider adding Redis adapter for production scalability",
      "Document rate limit configuration in README"
    ]
  }
}
```

---

### 2.4 `what_changed` — Track Changes Since Task Start

**Purpose:** Show what has changed since `begin_task` was called, with AI attribution.

**When to Use:**
- Mid-task to review progress
- Before calling `review_work` to see scope
- When you've lost track of what you've modified

```typescript
interface WhatChangedInput {
  /** Include file content previews (default: false) */
  includePreview?: boolean;

  /** Include AI attribution analysis (default: true) */
  includeAIAttribution?: boolean;

  /** Filter by file pattern */
  filter?: string;
}

interface WhatChangedOutput {
  /** Task context */
  task: {
    id: string;
    description: string;
    startedAt: Date;
    durationMinutes: number;
  } | null;

  /** All changes */
  changes: {
    file: string;
    type: 'created' | 'modified' | 'deleted';
    timestamp: Date;
    linesChanged: number;
    aiAttributed: boolean;
    aiConfidence?: number;
    preview?: string; // First/last few lines if includePreview
  }[];

  /** Summary statistics */
  summary: {
    totalFiles: number;
    totalLinesChanged: number;
    aiAttributedChanges: number;
    humanAttributedChanges: number;
    riskAreasModified: string[];
  };

  /** Time breakdown */
  timeline: {
    firstChange: Date;
    lastChange: Date;
    busiestPeriod: {
      start: Date;
      end: Date;
      changeCount: number;
    };
  };

  /** Observations about the changes */
  observations: string[];
}
```

**Implementation Logic:**

```typescript
async function whatChanged(input: WhatChangedInput): Promise<WhatChangedOutput> {
  const state = getSessionState();

  if (!state.currentTask) {
    return {
      task: null,
      changes: [],
      summary: {
        totalFiles: 0,
        totalLinesChanged: 0,
        aiAttributedChanges: 0,
        humanAttributedChanges: 0,
        riskAreasModified: [],
      },
      timeline: null,
      observations: ["No active task. Call begin_task first to start tracking changes."],
    };
  }

  // Filter changes if pattern provided
  let changes = state.changesSinceTaskStart;
  if (input.filter) {
    const regex = new RegExp(input.filter);
    changes = changes.filter(c => regex.test(c.file));
  }

  // Add previews if requested
  if (input.includePreview) {
    changes = await Promise.all(changes.map(async c => ({
      ...c,
      preview: await getFilePreview(c.file),
    })));
  }

  // Calculate summary
  const summary = calculateChangeSummary(changes);

  // Build timeline
  const timeline = buildTimeline(changes);

  // Generate observations
  const observations = generateChangeObservations(changes, state.currentTask);

  return {
    task: {
      id: state.currentTask.id,
      description: state.currentTask.description,
      startedAt: state.currentTask.startedAt,
      durationMinutes: Math.round(
        (Date.now() - state.currentTask.startedAt.getTime()) / 60000
      ),
    },
    changes,
    summary,
    timeline,
    observations,
  };
}

function generateChangeObservations(
  changes: Change[],
  task: Task
): string[] {
  const observations: string[] = [];

  // Check for scope creep
  const unplannedFiles = changes.filter(
    c => !task.plannedFiles.includes(c.file)
  );
  if (unplannedFiles.length > 2) {
    observations.push(
      `⚠️ Scope expansion: ${unplannedFiles.length} files modified that weren't in original plan`
    );
  }

  // Check for high AI attribution
  const aiRatio = changes.filter(c => c.aiAttributed).length / changes.length;
  if (aiRatio > 0.8) {
    observations.push(
      `🤖 High AI attribution (${Math.round(aiRatio * 100)}%) - consider reviewing AI suggestions carefully`
    );
  }

  // Check for risk area changes
  const riskAreas = identifyRiskAreas(changes.map(c => c.file));
  if (riskAreas.length > 0) {
    observations.push(
      `🔒 Modified risk areas: ${riskAreas.join(', ')} - snapshot was created at task start`
    );
  }

  // Check for rapid changes (potential thrashing)
  const rapidChanges = detectRapidChanges(changes);
  if (rapidChanges.length > 0) {
    observations.push(
      `⚡ Rapid changes detected on ${rapidChanges.join(', ')} - possible iteration/debugging cycle`
    );
  }

  return observations;
}
```

**Example Interaction:**

```
User: "What have I changed so far?"

AI calls: what_changed({})

Response:
{
  task: {
    id: "task_abc123",
    description: "Add rate limiting to authentication endpoints",
    startedAt: "2025-12-25T10:30:00Z",
    durationMinutes: 45
  },
  changes: [
    {
      file: "src/auth/middleware.ts",
      type: "modified",
      timestamp: "2025-12-25T10:35:00Z",
      linesChanged: 45,
      aiAttributed: true,
      aiConfidence: 0.92
    },
    {
      file: "src/auth/login.ts",
      type: "modified",
      timestamp: "2025-12-25T10:42:00Z",
      linesChanged: 12,
      aiAttributed: true,
      aiConfidence: 0.87
    },
    {
      file: "src/config/rate-limits.ts",
      type: "created",
      timestamp: "2025-12-25T10:45:00Z",
      linesChanged: 30,
      aiAttributed: false
    },
    {
      file: "src/types/express.d.ts",
      type: "modified",
      timestamp: "2025-12-25T11:10:00Z",
      linesChanged: 5,
      aiAttributed: false
    }
  ],
  summary: {
    totalFiles: 4,
    totalLinesChanged: 92,
    aiAttributedChanges: 2,
    humanAttributedChanges: 2,
    riskAreasModified: ["auth", "config"]
  },
  timeline: {
    firstChange: "2025-12-25T10:35:00Z",
    lastChange: "2025-12-25T11:10:00Z",
    busiestPeriod: {
      start: "2025-12-25T10:35:00Z",
      end: "2025-12-25T10:45:00Z",
      changeCount: 3
    }
  },
  observations: [
    "🤖 50% of changes are AI-attributed - good balance of AI assistance and manual work",
    "🔒 Modified risk areas: auth, config - snapshot snap_xyz789 available for rollback",
    "✅ All changes are within planned scope"
  ]
}
```

---

### 2.5 `complete_task` — End Task with Learning Capture

**Purpose:** Gracefully end a task, capture learnings, and clean up session state.

**When to Use:**
- After successfully completing and committing work
- When abandoning a task
- Before starting a different task

```typescript
interface CompleteTaskInput {
  /** Outcome of the task */
  outcome: 'completed' | 'abandoned' | 'blocked';

  /** Brief notes about what was accomplished or why it was abandoned */
  notes?: string;

  /** Accept suggested learnings by index (from review_work) */
  acceptLearnings?: number[];

  /** Custom learnings to capture */
  customLearnings?: {
    type: 'pattern' | 'pitfall' | 'efficiency' | 'discovery' | 'workflow';
    trigger: string;
    action: string;
  }[];

  /** Keep the snapshot for future reference (default: true for completed, false for abandoned) */
  keepSnapshot?: boolean;
}

interface CompleteTaskOutput {
  /** Task summary */
  taskSummary: {
    id: string;
    description: string;
    duration: string;
    outcome: string;
    filesModified: number;
    linesChanged: number;
  };

  /** Learnings captured */
  learningsCaptured: {
    type: string;
    trigger: string;
    action: string;
  }[];

  /** Snapshot disposition */
  snapshot: {
    id: string;
    kept: boolean;
    reason: string;
  } | null;

  /** Session statistics */
  sessionStats: {
    tasksCompleted: number;
    snapshotsCreated: number;
    restoresPerformed: number;
    learningsCaptured: number;
  };

  /** Recommendations for next session */
  recommendations: string[];
}
```

**Implementation Logic:**

```typescript
async function completeTask(input: CompleteTaskInput): Promise<CompleteTaskOutput> {
  const state = getSessionState();

  if (!state.currentTask) {
    throw new Error('No active task to complete. Call begin_task first.');
  }

  // 1. Calculate task duration
  const durationMs = Date.now() - state.currentTask.startedAt.getTime();
  const duration = formatDuration(durationMs);

  // 2. Capture learnings
  const learningsCaptured: Learning[] = [];

  // Accept suggested learnings
  if (input.acceptLearnings && state.pendingSuggestedLearnings) {
    for (const idx of input.acceptLearnings) {
      const learning = state.pendingSuggestedLearnings[idx];
      if (learning) {
        await captureLearn({
          type: learning.type,
          trigger: learning.trigger,
          action: learning.action,
          source: `task:${state.currentTask.id}`,
        });
        learningsCaptured.push(learning);
      }
    }
  }

  // Capture custom learnings
  if (input.customLearnings) {
    for (const learning of input.customLearnings) {
      await captureLearn({
        ...learning,
        source: `task:${state.currentTask.id}`,
      });
      learningsCaptured.push(learning);
    }
  }

  // 3. Handle snapshot
  let snapshotDisposition = null;
  if (state.currentTask.snapshotId) {
    const keepSnapshot = input.keepSnapshot ??
      (input.outcome === 'completed' || input.outcome === 'blocked');

    snapshotDisposition = {
      id: state.currentTask.snapshotId,
      kept: keepSnapshot,
      reason: keepSnapshot
        ? 'Snapshot preserved for future reference'
        : 'Snapshot archived (task abandoned)',
    };

    if (!keepSnapshot) {
      await archiveSnapshot(state.currentTask.snapshotId);
    }
  }

  // 4. Update session stats
  state.sessionStats.tasksCompleted++;
  state.sessionStats.learningsCaptured += learningsCaptured.length;

  // 5. Generate recommendations
  const recommendations = generateEndTaskRecommendations(
    state,
    input.outcome,
    learningsCaptured
  );

  // 6. Build task summary
  const taskSummary = {
    id: state.currentTask.id,
    description: state.currentTask.description,
    duration,
    outcome: input.outcome,
    filesModified: state.changesSinceTaskStart.length,
    linesChanged: state.changesSinceTaskStart.reduce(
      (sum, c) => sum + c.linesChanged, 0
    ),
  };

  // 7. Clear current task
  state.currentTask = null;
  state.changesSinceTaskStart = [];
  state.pendingSuggestedLearnings = [];

  return {
    taskSummary,
    learningsCaptured,
    snapshot: snapshotDisposition,
    sessionStats: state.sessionStats,
    recommendations,
  };
}

function generateEndTaskRecommendations(
  state: SessionState,
  outcome: string,
  learnings: Learning[]
): string[] {
  const recommendations: string[] = [];

  if (outcome === 'completed' && learnings.length === 0) {
    recommendations.push(
      'Consider capturing learnings from this task - they help future sessions'
    );
  }

  if (outcome === 'blocked') {
    recommendations.push(
      'Blocked tasks often become good pitfall learnings - what caused the block?'
    );
  }

  if (state.sessionStats.restoresPerformed > 0) {
    recommendations.push(
      `You used restore ${state.sessionStats.restoresPerformed} time(s) this session - snapshots are working well!`
    );
  }

  const aiRatio = state.changesSinceTaskStart.filter(c => c.aiAttributed).length /
    Math.max(state.changesSinceTaskStart.length, 1);

  if (aiRatio > 0.9) {
    recommendations.push(
      'High AI attribution this task - review changes carefully before committing'
    );
  }

  return recommendations;
}
```

**Example Interaction:**

```
User: "I'm done with the rate limiting feature"

AI calls: complete_task({
  outcome: "completed",
  notes: "Rate limiting added to all auth endpoints with Redis support",
  acceptLearnings: [0, 1], // Accept both suggested learnings from review_work
  customLearnings: [
    {
      type: "workflow",
      trigger: "Adding middleware to Express routes",
      action: "1. Create middleware in /middleware, 2. Add types to express.d.ts, 3. Register in app.ts, 4. Add to specific routes"
    }
  ]
})

Response:
{
  taskSummary: {
    id: "task_abc123",
    description: "Add rate limiting to authentication endpoints",
    duration: "47 minutes",
    outcome: "completed",
    filesModified: 4,
    linesChanged: 92
  },
  learningsCaptured: [
    {
      type: "pitfall",
      trigger: "Implementing rate limiting with IP-only keys",
      action: "Use composite keys (IP + userID) to prevent authenticated user abuse"
    },
    {
      type: "pattern",
      trigger: "Rate limiting middleware",
      action: "Always include Retry-After header in 429 responses"
    },
    {
      type: "workflow",
      trigger: "Adding middleware to Express routes",
      action: "1. Create middleware in /middleware, 2. Add types to express.d.ts, 3. Register in app.ts, 4. Add to specific routes"
    }
  ],
  snapshot: {
    id: "snap_xyz789",
    kept: true,
    reason: "Snapshot preserved for future reference"
  },
  sessionStats: {
    tasksCompleted: 1,
    snapshotsCreated: 1,
    restoresPerformed: 0,
    learningsCaptured: 3
  },
  recommendations: [
    "Great job capturing 3 learnings - they'll help in future rate limiting tasks",
    "Consider adding this workflow to your team's documentation"
  ]
}
```

---

## Part 3: Extension Bridge (Proactive Observations)

### 3.1 Architecture

The VS Code extension acts as "eyes" that observe changes and push observations to the MCP session state.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VS CODE EXTENSION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  File Watcher ──────┐                                               │
│                     │                                               │
│  AI Detector ───────┼──► Observation Queue ──► MCP State Bridge     │
│                     │           │                    │              │
│  Risk Analyzer ─────┘           │                    │              │
│                                 ▼                    ▼              │
│                         Local Storage         HTTP/IPC Push         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          MCP SERVER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Session State                                                      │
│  ├── pendingObservations[]  ◄─── Populated by extension             │
│  ├── changesSinceTaskStart[] ◄── Populated by extension             │
│  └── currentTask                                                    │
│                                                                     │
│  On any tool call:                                                  │
│  ├── Drain pendingObservations                                      │
│  └── Include in response if relevant                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Extension-Side Implementation

```typescript
// In VS Code Extension: src/mcp-bridge.ts

interface MCPBridge {
  pushObservation(observation: Observation): void;
  pushChange(change: FileChange): void;
  getSessionState(): SessionState | null;
}

class MCPStateBridge implements MCPBridge {
  private observationQueue: Observation[] = [];
  private changeQueue: FileChange[] = [];
  private mcpEndpoint: string;

  constructor(config: BridgeConfig) {
    this.mcpEndpoint = config.mcpEndpoint ?? 'http://localhost:3100';

    // Register file watchers
    this.setupFileWatchers();

    // Register AI detection hooks
    this.setupAIDetection();

    // Periodic flush to MCP
    setInterval(() => this.flushToMCP(), 5000);
  }

  private setupFileWatchers() {
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const change: FileChange = {
        file: vscode.workspace.asRelativePath(doc.uri),
        type: 'modified',
        timestamp: new Date(),
        aiAttributed: await this.detectAIAttribution(doc),
        linesChanged: await this.countChangedLines(doc),
      };

      this.changeQueue.push(change);

      // Check for risk and create observation
      const risk = await this.assessFileRisk(doc);
      if (risk.level === 'high') {
        this.observationQueue.push({
          type: 'risk',
          message: `High-risk file modified: ${change.file} (${risk.reason})`,
          timestamp: new Date(),
          context: { file: change.file, riskLevel: risk.level },
        });
      }
    });
  }

  private setupAIDetection() {
    // Hook into text change events to detect AI-attributed changes
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      const aiConfidence = await this.aiDetector.analyze(event);

      if (aiConfidence > 0.8) {
        // Track that this file has AI changes
        this.aiAttributedFiles.add(
          vscode.workspace.asRelativePath(event.document.uri)
        );
      }
    });
  }

  async pushObservation(observation: Observation) {
    this.observationQueue.push(observation);

    // Immediate flush for high-priority observations
    if (observation.type === 'risk' || observation.type === 'warning') {
      await this.flushToMCP();
    }
  }

  private async flushToMCP() {
    if (this.observationQueue.length === 0 && this.changeQueue.length === 0) {
      return;
    }

    try {
      await fetch(`${this.mcpEndpoint}/bridge/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observations: this.observationQueue,
          changes: this.changeQueue,
        }),
      });

      // Clear queues on success
      this.observationQueue = [];
      this.changeQueue = [];
    } catch (error) {
      // Keep queued for retry
      console.warn('Failed to push to MCP:', error);
    }
  }
}
```

### 3.3 MCP Server-Side Receiver

```typescript
// In MCP Server: src/bridge/receiver.ts

import { Router } from 'express';

const bridgeRouter = Router();

bridgeRouter.post('/bridge/push', async (req, res) => {
  const { observations, changes } = req.body;
  const state = getSessionState();

  // Merge observations
  if (observations?.length) {
    state.pendingObservations.push(...observations);

    // Limit queue size
    if (state.pendingObservations.length > 50) {
      state.pendingObservations = state.pendingObservations.slice(-50);
    }
  }

  // Merge changes (only if task is active)
  if (changes?.length && state.currentTask) {
    state.changesSinceTaskStart.push(...changes);
  }

  res.json({ received: true });
});

// Called by tools to drain pending observations
function drainPendingObservations(state: SessionState): Observation[] {
  const observations = [...state.pendingObservations];
  state.pendingObservations = [];
  return observations;
}
```

### 3.4 Observation Types

```typescript
type ObservationType =
  | 'risk'        // High-risk file modified
  | 'pattern'     // Pattern detected that matches a learning
  | 'suggestion'  // Proactive suggestion based on context
  | 'warning'     // Something that needs attention
  | 'progress'    // Positive progress observation
  ;

interface Observation {
  type: ObservationType;
  message: string;
  timestamp: Date;
  context?: {
    file?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    patternName?: string;
    learningId?: string;
    [key: string]: unknown;
  };
}

// Example observations that might be generated:

const exampleObservations: Observation[] = [
  {
    type: 'risk',
    message: 'Auth middleware modified - snapshot snap_abc123 covers this file',
    timestamp: new Date(),
    context: { file: 'src/auth/middleware.ts', riskLevel: 'high' },
  },
  {
    type: 'pattern',
    message: 'You\'re adding error handling - remember to use the AppError class from src/errors',
    timestamp: new Date(),
    context: { patternName: 'error-handling', file: 'src/auth/login.ts' },
  },
  {
    type: 'warning',
    message: 'config/rate-limits.ts has no test file - consider adding tests',
    timestamp: new Date(),
    context: { file: 'config/rate-limits.ts' },
  },
  {
    type: 'suggestion',
    message: 'You\'ve modified 3 files in quick succession - want to create a checkpoint?',
    timestamp: new Date(),
    context: { fileCount: 3, suggestion: 'snapshot' },
  },
  {
    type: 'progress',
    message: 'Great! All modified files now have passing TypeScript checks',
    timestamp: new Date(),
  },
];
```

---

## Part 4: System Prompt Protocol

### 4.1 Pairing Protocol

SnapBack can generate a "pairing protocol" that gets injected into AI system prompts to guide tool usage:

```markdown
## SnapBack Pairing Protocol

You have access to SnapBack MCP tools for code protection and pair programming assistance.

### Tool Usage Pattern

**START of any coding task:**
```
Call: begin_task({ task: "description of what you're doing", files: ["planned", "files"] })
```
This creates a safety snapshot, gathers relevant patterns/learnings, and starts change tracking.

**DURING development:**
- After multi-file changes: `quick_check({})` - fast TypeScript/test/lint validation
- When unsure about progress: `what_changed({})` - see all changes since task start
- Before risky modifications: Check if `begin_task` created a snapshot

**BEFORE committing:**
```
Call: review_work({ intent: "what you accomplished" })
```
This validates changes, checks patterns, and suggests learnings to capture.

**END of task:**
```
Call: complete_task({ outcome: "completed", acceptLearnings: [0, 1] })
```
This captures learnings and cleans up session state.

### When SnapBack Surfaces Observations

SnapBack may include observations in tool responses. Pay attention to:
- ⚠️ **Risk warnings**: A high-risk file was modified
- 💡 **Suggestions**: Proactive tips based on what you're doing
- 📚 **Pattern reminders**: Relevant learnings from past sessions

### Quick Reference

| Situation | Tool to Call |
|-----------|-------------|
| Starting any task | `begin_task` |
| "Did I break anything?" | `quick_check` |
| "What have I changed?" | `what_changed` |
| Ready to commit | `review_work` |
| Task complete | `complete_task` |
| Need to undo | `snapshot_restore` |
```

### 4.2 Dynamic Protocol Injection

The MCP server can provide context-aware guidance:

```typescript
// Called when AI connects to MCP
function getSystemPromptAddendum(state: SessionState): string {
  const lines: string[] = [
    '## SnapBack Context',
    '',
  ];

  // Current task status
  if (state.currentTask) {
    lines.push(`**Active Task:** ${state.currentTask.description}`);
    lines.push(`**Duration:** ${formatDuration(Date.now() - state.currentTask.startedAt.getTime())}`);
    lines.push(`**Files Changed:** ${state.changesSinceTaskStart.length}`);
    if (state.currentTask.snapshotId) {
      lines.push(`**Snapshot:** ${state.currentTask.snapshotId} (available for rollback)`);
    }
    lines.push('');
  } else {
    lines.push('**No active task.** Call `begin_task` before making changes.');
    lines.push('');
  }

  // Pending observations
  if (state.pendingObservations.length > 0) {
    lines.push('**Recent Observations:**');
    for (const obs of state.pendingObservations.slice(-3)) {
      lines.push(`- ${getObservationEmoji(obs.type)} ${obs.message}`);
    }
    lines.push('');
  }

  // Risk areas being modified
  if (state.riskAreasTouched.length > 0) {
    lines.push(`**Risk Areas in Scope:** ${state.riskAreasTouched.join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}
```

---

## Part 5: Implementation Plan

### Phase 1: Core Composite Tools (Week 1-2)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Implement `begin_task` | M | get_context, snapshot_create, get_learnings |
| Implement `quick_check` | S | TypeScript compiler, Vitest, Biome |
| Implement `what_changed` | S | Session state management |
| Implement `review_work` | L | check_patterns, diff parsing, validation pipeline |
| Implement `complete_task` | M | learn, session state |
| Update tool descriptions | S | - |
| Add integration tests | M | All tools |

### Phase 2: Extension Bridge (Week 2-3)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create MCPBridge class in extension | M | VS Code API |
| Implement file change tracking | S | VS Code workspace API |
| Integrate AI detection | M | Existing AI detector |
| Implement observation generation | M | Risk analyzer |
| Create MCP receiver endpoint | S | Express router |
| Add bridge health monitoring | S | - |
| Test end-to-end flow | M | Extension + MCP |

### Phase 3: System Prompt & Polish (Week 3-4)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create pairing protocol docs | S | - |
| Implement dynamic prompt injection | M | Session state |
| Add proactive observation logic | M | Pattern matching |
| Performance optimization | M | All tools |
| Documentation | M | All features |
| User testing & iteration | L | Beta users |

### Total Estimated Effort

- **Phase 1:** ~2 weeks (1 engineer)
- **Phase 2:** ~1.5 weeks (1 engineer)
- **Phase 3:** ~1 week (1 engineer)
- **Buffer:** 20%

**Total:** ~5-6 weeks for full implementation

---

## Part 6: Success Criteria

### Quantitative Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Tool calls per task | 5+ | 2-3 |
| Time to start task | 30+ seconds | <10 seconds |
| Pair programmer rating | 4/10 | 8/10 |
| Code safety rating | 7/10 | 7/10 (maintain) |
| Tool response time (p95) | <200ms | <200ms (maintain) |

### Qualitative Criteria

- [ ] AI agent reports reduced friction
- [ ] AI agent reports feeling "aware" of changes
- [ ] Proactive observations feel helpful, not noisy
- [ ] Learning capture feels natural, not forced
- [ ] Overall workflow feels like pair programming

### Test Protocol

1. Have AI agent perform same task as original feedback session
2. Collect new feedback using same rubric
3. Compare ratings and qualitative feedback
4. Iterate based on findings

---

## Appendix A: Tool Schema Reference

### Full JSON Schema for New Tools

```json
{
  "begin_task": {
    "description": "🚀 **START HERE** - Essential entry point for any development task.\n\nCombines context gathering, snapshot creation, and learning retrieval into a single call.\nReduces workflow from 5+ tool calls to 1.\n\n**When to use:**\n- Starting ANY new task (refactoring, feature, bug fix)\n- Before making multi-file changes\n- When switching to a different area of the codebase\n\n**Returns:**\n- Auto-created snapshot (if risk warrants it)\n- Relevant patterns and constraints\n- Learnings from past sessions\n- Proactive observations from VS Code\n- Risk assessment and recommendations\n\n💡 Tip: Pair with complete_task when finished.",
    "parameters": {
      "type": "object",
      "properties": {
        "task": {
          "type": "string",
          "description": "Brief description of what you're about to do"
        },
        "files": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Files you plan to modify (optional but improves suggestions)"
        },
        "keywords": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Keywords for learning retrieval (auto-extracted from task if not provided)"
        },
        "skipSnapshot": {
          "type": "boolean",
          "default": false,
          "description": "Skip automatic snapshot creation"
        }
      },
      "required": ["task"]
    }
  },

  "quick_check": {
    "description": "⚡ **FAST VALIDATION** - Answer 'did I break anything?' in seconds.\n\nRuns TypeScript, tests, and lint in parallel for quick feedback.\n\n**When to use:**\n- After making changes, before committing\n- When unsure if recent edits introduced errors\n- As a fast feedback loop during development\n\n**Returns:**\n- TypeScript errors (if any)\n- Test results (related tests only by default)\n- Lint issues\n- Summary and suggested fixes\n\n💡 Tip: Use this frequently during development for fast feedback.",
    "parameters": {
      "type": "object",
      "properties": {
        "files": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Specific files to check (default: changed files since task start)"
        },
        "checks": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["typescript", "tests", "lint"]
          },
          "description": "Which checks to run (default: all)"
        },
        "relatedTestsOnly": {
          "type": "boolean",
          "default": true,
          "description": "Run only tests related to changed files"
        },
        "timeout": {
          "type": "number",
          "default": 30000,
          "description": "Timeout in milliseconds"
        }
      }
    }
  },

  "what_changed": {
    "description": "📋 **CHANGE TRACKER** - See what's changed since task start.\n\nShows all file changes with AI attribution analysis.\n\n**When to use:**\n- Mid-task to review progress\n- Before calling review_work to see scope\n- When you've lost track of what you've modified\n\n**Returns:**\n- List of all changes with timestamps\n- AI attribution for each change\n- Summary statistics\n- Observations about patterns (scope creep, rapid changes, etc.)\n\n💡 Tip: Requires an active task from begin_task.",
    "parameters": {
      "type": "object",
      "properties": {
        "includePreview": {
          "type": "boolean",
          "default": false,
          "description": "Include file content previews"
        },
        "includeAIAttribution": {
          "type": "boolean",
          "default": true,
          "description": "Include AI attribution analysis"
        },
        "filter": {
          "type": "string",
          "description": "Filter by file pattern (regex)"
        }
      }
    }
  },

  "review_work": {
    "description": "✅ **PRE-COMMIT REVIEW** - Comprehensive analysis of your changes.\n\nAnalyzes diff, runs validation, surfaces issues, and suggests learnings.\n\n**When to use:**\n- Before committing changes\n- After implementing a feature or fix\n- When you want comprehensive feedback\n\n**Returns:**\n- Overall grade (A-F)\n- Issues found (security, performance, patterns, tests)\n- Pattern violations\n- Positive observations\n- Suggested learnings to capture\n- Test coverage analysis\n- Commit readiness assessment\n\n💡 Tip: Use the suggested learnings with complete_task.",
    "parameters": {
      "type": "object",
      "properties": {
        "diff": {
          "type": "string",
          "description": "Git diff or file contents (auto-detected if not provided)"
        },
        "intent": {
          "type": "string",
          "description": "What you were trying to accomplish"
        },
        "aiEnhanced": {
          "type": "boolean",
          "default": false,
          "description": "Include AI-enhanced analysis (opt-in, metadata only)"
        },
        "focus": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["security", "performance", "patterns", "tests", "all"]
          },
          "description": "Specific aspects to focus on"
        }
      }
    }
  },

  "complete_task": {
    "description": "🏁 **FINISH TASK** - End task gracefully and capture learnings.\n\nCleans up session state and optionally captures learnings for future sessions.\n\n**When to use:**\n- After successfully completing and committing work\n- When abandoning a task\n- Before starting a different task\n\n**Returns:**\n- Task summary\n- Learnings captured\n- Snapshot disposition\n- Session statistics\n- Recommendations for next session\n\n💡 Tip: Accept suggested learnings from review_work using their indices.",
    "parameters": {
      "type": "object",
      "properties": {
        "outcome": {
          "type": "string",
          "enum": ["completed", "abandoned", "blocked"],
          "description": "Outcome of the task"
        },
        "notes": {
          "type": "string",
          "description": "Brief notes about what was accomplished or why it was abandoned"
        },
        "acceptLearnings": {
          "type": "array",
          "items": { "type": "number" },
          "description": "Accept suggested learnings by index (from review_work)"
        },
        "customLearnings": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["pattern", "pitfall", "efficiency", "discovery", "workflow"]
              },
              "trigger": { "type": "string" },
              "action": { "type": "string" }
            },
            "required": ["type", "trigger", "action"]
          },
          "description": "Custom learnings to capture"
        },
        "keepSnapshot": {
          "type": "boolean",
          "description": "Keep the snapshot for future reference"
        }
      },
      "required": ["outcome"]
    }
  }
}
```

---

## Appendix B: Migration Guide

### For AI Agents Using Current Tools

**Before (5+ calls):**
```
1. get_context({ task: "Add rate limiting" })
2. snapshot_create({ files: [...], reason: "Pre-task" })
3. get_learnings({ keywords: ["rate limiting"] })
4. session({ op: "start" })
... work ...
5. check_patterns({ code, filePath })
6. learn({ type, trigger, action })
7. session({ op: "end" })
```

**After (2-3 calls):**
```
1. begin_task({ task: "Add rate limiting", files: [...] })
... work ...
2. review_work({ intent: "Added rate limiting" })
3. complete_task({ outcome: "completed", acceptLearnings: [0, 1] })
```

### Backward Compatibility

All primitive tools remain available for granular control:
- `get_context` - Still works for context-only queries
- `snapshot_create` - Still works for manual snapshots
- `check_patterns` - Still works for validation-only
- `learn` - Still works for immediate learning capture

The composite tools are additive, not replacements.

---

*End of Specification*
