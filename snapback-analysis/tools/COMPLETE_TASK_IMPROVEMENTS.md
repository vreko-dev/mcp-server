# complete-task.ts Improvement Analysis

> File: `packages/mcp/src/facades/complete-task.ts` (465 lines)
> Analysis based on archaeological exploration of 751 commits

## Current State Summary

**Strengths:**
- Clean separation: types → helpers → handler sections
- Daemon-first architecture (Pattern from Epoch 10)
- Accountability tracking with reflection
- JSONL-based learning storage
- Final snapshot creation

**Architecture:**
```
complete_task
├── Daemon path (cross-surface coordination)
│   ├── endTaskViaDaemon()
│   ├── Local learning capture
│   └── Build output from daemon data
└── Fallback path (local-only)
    ├── Calculate duration/summary
    ├── Create final snapshot
    ├── Capture learnings
    └── Build output locally
```

---

## Issue 1: Code Duplication Between Paths

**Problem**: The daemon and fallback paths share ~60% identical logic:
- Learning capture (lines 233-245 and 360-376)
- Next actions building (lines 253-265 and 384-407)
- Accountability effect building (lines 268-279 and 409-421)
- Output construction (lines 281-303 and 423-443)

**Impact**: Maintenance burden, divergence risk

**Fix**:
```typescript
// Extract shared logic
function buildCompleteTaskResult(
  task: Task,
  state: SessionState,
  input: {
    outcome: string;
    durationMs: number;
    filesChanged: number;
    linesChanged: number;
    snapshotCreated: boolean;
    snapshotId?: string;
  },
  reflection?: ReflectionInput,
  tier?: string,
): CompleteTaskOutput {
  // Shared logic here
}
```

**Priority**: P2 (Medium effort, maintenance benefit)

---

## Issue 2: Missing Intent-Awareness

**Problem**: `begin-task.ts` has intent detection (implement/debug/refactor/review/explore) but `complete-task.ts` doesn't use it.

**Impact**: Lost opportunity for intent-specific completion feedback

**Evidence from begin-task.ts (lines 44-80)**:
```typescript
export type TaskIntent = "implement" | "debug" | "refactor" | "review" | "explore";
const INTENT_CONTEXT_CONFIG: Record<TaskIntent, {...}> = {...}
```

**Fix**:
```typescript
interface CompleteTaskInput {
  // ... existing fields
  /** Intent from begin_task (auto-populated if not provided) */
  intent?: TaskIntent;
}

// Intent-specific completion messages
const INTENT_COMPLETION_HINTS: Record<TaskIntent, {
  completed: string;
  abandoned: string;
  blocked: string;
}> = {
  implement: {
    completed: "Feature implemented. Consider running tests.",
    abandoned: "Implementation paused. Snapshot preserved.",
    blocked: "Blocked on implementation. Check learnings for similar issues.",
  },
  debug: {
    completed: "Bug fixed! Consider recording the fix as a learning.",
    abandoned: "Debug session paused.",
    blocked: "Still debugging. Try get_learnings for similar issues.",
  },
  // ... etc
};
```

**Priority**: P1 (Aligns with begin_task, high value)

---

## Issue 3: No Positive Pattern Learning

**Problem**: Only captures explicit learnings. Doesn't auto-suggest patterns from successful task completion.

**Archaeological Evidence**: Epoch 5-6 was a consolidation epoch where patterns were identified retroactively. Auto-detection would have helped.

**Current flow**:
```
User completes task → manually provides learnings → stored
```

**Proposed flow**:
```
User completes task → analyze success indicators → suggest learnings
├── Files changed frequently together → "These files are related"
├── Task completed without issues → "This approach works for X"
├── Short duration + no violations → "Efficient pattern detected"
└── User can accept/reject suggestions
```

**Fix**:
```typescript
function suggestLearningsFromSuccess(
  task: Task,
  state: SessionState,
  outcome: "completed" | "abandoned" | "blocked",
): Array<{ type: string; trigger: string; action: string; confidence: number }> {
  const suggestions: Array<{...}> = [];

  if (outcome === "completed") {
    // Success pattern: fast completion + no violations
    if (state.violationCount === 0 && task.duration < 30 * 60 * 1000) {
      suggestions.push({
        type: "efficiency",
        trigger: task.description,
        action: "Completed efficiently with no violations",
        confidence: 0.7,
      });
    }

    // Success pattern: files always modified together
    const fileGroups = detectCoModifiedFiles(state.changesSinceTaskStart);
    for (const group of fileGroups) {
      suggestions.push({
        type: "pattern",
        trigger: `Modifying ${group[0]}`,
        action: `Also check: ${group.slice(1).join(", ")}`,
        confidence: 0.8,
      });
    }
  }

  return suggestions;
}
```

**Priority**: P2 (Aligns with dual-learning system recommendation)

---

## Issue 4: Silent Error Swallowing

**Problem**: `appendLearning` ignores write errors (line 136-138):
```typescript
} catch {
  // Ignore write errors
}
```

**Impact**: User thinks learning was saved but it wasn't

**Fix**:
```typescript
function appendLearning(...): { success: boolean; error?: string } {
  try {
    // ... existing logic
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown write error"
    };
  }
}

// In handler, track failed writes
const failedLearnings: string[] = [];
for (const idx of acceptLearnings) {
  const result = appendLearning(workspaceRoot, learning);
  if (!result.success) {
    failedLearnings.push(`Learning ${idx}: ${result.error}`);
  }
}

if (failedLearnings.length > 0) {
  output._warnings = failedLearnings;
}
```

**Priority**: P1 (Data integrity)

---

## Issue 5: No Pre-Completion Validation Suggestion

**Problem**: Doesn't check if user ran `check_patterns` before completing

**Evidence from response-utils.ts (line 495)**:
```typescript
prompt = `⚠️ ${pendingValidations.length} file(s) modified but not validated.`;
```

This logic exists in `buildSessionChecklist` but isn't used in `complete-task`.

**Fix**:
```typescript
// Before completing, check validation status
const checklist = buildSessionChecklist({
  plannedFiles: task.plannedFiles,
  modifiedFiles: state.changesSinceTaskStart.map(c => c.file),
  validatedFiles: state.validatedFiles || [],
  snapshotCount: state.stats.snapshotsCreated,
});

if (checklist.pendingValidations.length > 0) {
  output._warnings = output._warnings || [];
  output._warnings.push(
    `${checklist.pendingValidations.length} file(s) modified but not validated. ` +
    `Consider running check_patterns before committing.`
  );
}
```

**Priority**: P1 (Prevents incomplete work from being marked complete)

---

## Issue 6: Rough Line Estimation

**Problem**: Lines added/removed uses hardcoded 70/30 split (lines 165-166):
```typescript
lines_added: Math.max(0, Math.floor(linesChanged * 0.7)), // Estimate
lines_removed: Math.max(0, Math.floor(linesChanged * 0.3)), // Estimate
```

**Fix**: Use actual data from git or change tracking:
```typescript
// In state.changesSinceTaskStart, track actual adds/removes
interface FileChange {
  file: string;
  linesChanged: number;
  linesAdded: number;    // NEW
  linesRemoved: number;  // NEW
}

// Then in buildAccountabilityEffect:
lines_added: state.changesSinceTaskStart.reduce((sum, c) => sum + c.linesAdded, 0),
lines_removed: state.changesSinceTaskStart.reduce((sum, c) => sum + c.linesRemoved, 0),
```

**Priority**: P3 (Accuracy improvement, not critical)

---

## Issue 7: No Task Comparison

**Problem**: Doesn't compare what was planned vs completed

**Context from begin-task**: The task starts with `plannedFiles` and `keywords`. Complete-task should report on what was actually touched vs planned.

**Fix**:
```typescript
interface TaskComparisonOutput {
  planned: {
    files: string[];
    keywords: string[];
  };
  actual: {
    filesModified: string[];
    filesMissed: string[];      // Planned but not touched
    filesUnplanned: string[];   // Touched but not planned
  };
  alignment: number; // 0-1 score
}

function compareTaskExecution(task: Task, state: SessionState): TaskComparisonOutput {
  const plannedSet = new Set(task.plannedFiles);
  const actualSet = new Set(state.changesSinceTaskStart.map(c => c.file));

  return {
    planned: {
      files: task.plannedFiles,
      keywords: task.keywords || [],
    },
    actual: {
      filesModified: [...actualSet],
      filesMissed: [...plannedSet].filter(f => !actualSet.has(f)),
      filesUnplanned: [...actualSet].filter(f => !plannedSet.has(f)),
    },
    alignment: calculateAlignment(plannedSet, actualSet),
  };
}
```

**Priority**: P2 (Valuable for understanding task drift)

---

## Issue 8: Missing Proactive Guidance

**Problem**: `begin-task.ts` has `proactive_guidance` from AdvisoryEngine (lines 554-632), but `complete-task.ts` doesn't provide completion guidance.

**Fix**: Add completion-specific advisory:
```typescript
async function generateCompletionGuidance(
  task: Task,
  state: SessionState,
  outcome: string,
): Promise<CompletionGuidance> {
  const guidance: CompletionGuidance = {
    summary: `${outcome} after ${formatDuration(Date.now() - task.startedAt)}`,
    suggestions: [],
  };

  // Suggest learning if significant work
  if (state.changesSinceTaskStart.length >= 3 && outcome === "completed") {
    guidance.suggestions.push({
      text: "Consider capturing a pattern from this successful work",
      priority: 2,
      category: "learning",
    });
  }

  // Suggest snapshot if abandoned with changes
  if (outcome === "abandoned" && state.changesSinceTaskStart.length > 0) {
    guidance.suggestions.push({
      text: "Changes exist but task abandoned. Snapshot created for safety.",
      priority: 1,
      category: "checkpoint",
    });
  }

  return guidance;
}
```

**Priority**: P2 (Consistency with begin-task)

---

## Issue 9: No Learning Staleness Filter

**Problem**: `response-utils.ts` has `filterStaleLearnings` (lines 442-458) but it's not used when reading learnings for suggestions.

**Impact**: Stale learnings (>90 days old) might be suggested

**Current code (no staleness check)**:
```typescript
for (const idx of acceptLearnings) {
  if (idx >= 0 && idx < state.pendingSuggestedLearnings.length) {
    const learning = state.pendingSuggestedLearnings[idx];
    appendLearning(workspaceRoot, learning);
  }
}
```

**Fix**: Filter before storing
```typescript
import { filterStaleLearnings, getArchitectureVersion } from "./response-utils.js";

// When writing, add timestamp and check staleness
const learningWithMeta = {
  ...learning,
  timestamp: new Date().toISOString(),
  archVersion: getArchitectureVersion(workspaceRoot),
};

// When reading (in begin-task), filter stale
const { valid, stale } = filterStaleLearnings(allLearnings);
if (stale.length > 0) {
  // Log or notify about stale learnings
}
```

**Priority**: P3 (Long-term data quality)

---

## Priority Matrix

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| 4. Silent Error Swallowing | High | Low | **P1** |
| 5. No Pre-Completion Validation | High | Low | **P1** |
| 2. Missing Intent-Awareness | High | Medium | **P1** |
| 1. Code Duplication | Medium | Medium | P2 |
| 3. No Positive Pattern Learning | Medium | High | P2 |
| 7. No Task Comparison | Medium | Medium | P2 |
| 8. Missing Proactive Guidance | Medium | Medium | P2 |
| 6. Rough Line Estimation | Low | Low | P3 |
| 9. No Learning Staleness Filter | Low | Low | P3 |

---

## Quick Wins (Can Implement Now)

### 1. Add error return to appendLearning
```typescript
function appendLearning(
  workspaceRoot: string,
  learning: { type: string; trigger: string; action: string; source?: string },
): { success: boolean; error?: string } {
```

### 2. Add validation warning
```typescript
// After line 336 (after calculating filesChanged)
if (filesChanged > 0 && !state.validatedFiles?.length) {
  // Add warning to output
}
```

### 3. Extract shared logic
```typescript
// Create buildCompleteTaskResult() helper
// Use in both daemon and fallback paths
```

---

## Alignment with Archaeological Recommendations

| Recommendation | Status in complete-task |
|----------------|-------------------------|
| Intent-aware context | ❌ Missing (begin-task has it) |
| Proactive guidance | ❌ Missing |
| Learning from success | ❌ Only explicit learnings |
| Validation before commit | ⚠️ Exists but not used |
| Error handling | ⚠️ Swallows silently |
| Response compression | ✅ Uses response-utils |
| Daemon-first | ✅ Implemented |
| Next actions | ✅ Implemented |
