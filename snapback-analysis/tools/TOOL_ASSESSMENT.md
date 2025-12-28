# SnapBack MCP Tool Assessment

> Evaluation from an AI assistant's perspective after traversing the codebase

## Current Tool Inventory

### Core Tools (19 tools, consolidating to ~11 facades)

| Tool | Purpose | Tier | My Assessment |
|------|---------|------|---------------|
| `assess_risk` | Risk analysis on code changes | Free | Good, needs better context |
| `create_snapshot` | Create restore point | Pro | Good, needs auto-suggestion |
| `list_snapshots` | List available snapshots | Pro | Good |
| `restore_snapshot` | Restore from snapshot | Pro | Good, needs diff preview |
| `get_workspace_vitals` | Health signals | Free | Excellent concept |
| `acknowledge_risk` | Proceed despite risk | Free | Good for audit trail |
| `get_context` | Architectural context | Free | Under-powered |
| `check_patterns` | Pre-commit validation | Free | Good |
| `validate_code` | 7-layer validation | Free | Comprehensive |
| `record_learning` | Capture learnings | Free | Good, needs retrieval |
| `validate_recommendation` | Package validation | Free | New, promising |
| `ctx_init/build/validate` | Context system | Free | Infrastructure |
| `ctx_status/constraint/check` | Context queries | Free | Useful |
| `meta_list_tools` | Tool discovery | Free | Basic |

---

## Tool Enhancement Proposals

### 1. `get_context` → `get_intent_context` (Enhancement)

**Current Capability**:
Returns patterns, constraints, learnings, violations for a task.

**Limitation Experienced**:
Too generic. Returns everything potentially relevant, not what's specifically needed for my intent.

**Proposed Enhancement**:
```typescript
get_intent_context({
  task: "Add user authentication",
  intent: "implement" | "debug" | "refactor" | "review",
  files: ["auth.ts"],
  depth: "shallow" | "deep"
}) => {
  // For "implement" intent:
  contracts_to_check: Contract[],
  patterns_to_follow: Pattern[],
  recent_changes_in_area: Commit[],
  known_pitfalls: Pitfall[],
  suggested_snapshot: boolean,

  // For "debug" intent:
  recent_failures: TestFailure[],
  related_violations: Violation[],
  historical_fixes: Fix[],

  // For "refactor" intent:
  canonical_sources: CanonicalSource[],
  duplicate_locations: string[],
  migration_patterns: MigrationPattern[],

  // For "review" intent:
  validation_checklist: ChecklistItem[],
  risk_areas: RiskArea[],
  coverage_gaps: CoverageGap[]
}
```

**Estimated Value**: High
**Implementation Hint**: Extend existing get_context with intent classification and filtered output.

---

### 2. `compare_snapshots` (New Tool)

**Current Gap**:
Can list and restore snapshots, but can't compare them.

**Proposed Tool**:
```typescript
compare_snapshots({
  base: string,      // snapshot ID
  target: string,    // snapshot ID or "current"
  mode: "summary" | "detailed" | "diff"
}) => {
  files_added: string[],
  files_removed: string[],
  files_modified: {
    path: string,
    lines_changed: number,
    risk_indicators: string[]
  }[],
  semantic_changes: {
    functions_added: string[],
    functions_removed: string[],
    exports_changed: string[]
  },
  recommendations: string[]
}
```

**Estimated Value**: High
**Implementation Hint**: Leverage existing diff utilities in engine package.

---

### 3. `suggest_snapshot` (New Tool - Proactive)

**Current Gap**:
Snapshot creation is reactive (user decides). Need proactive suggestion.

**Proposed Tool**:
```typescript
suggest_snapshot({
  files_about_to_modify: string[],
  task_description: string
}) => {
  should_snapshot: boolean,
  confidence: number,
  reasoning: string[],
  risk_factors: {
    factor: string,
    weight: number,
    evidence: string
  }[],
  suggested_files: string[],  // May be more than input
  auto_create: boolean        // If high confidence, can auto-create
}
```

**Estimated Value**: Very High
**Implementation Hint**: Use vitals signals + historical snapshot patterns + task classification.

---

### 4. `get_package_genealogy` (New Tool)

**Current Gap**:
No way to trace how a package evolved (renames, splits, consolidations).

**Proposed Tool**:
```typescript
get_package_genealogy({
  package: string  // current package name
}) => {
  current: {
    name: string,
    path: string,
    first_commit: string
  },
  predecessors: {
    name: string,
    path: string,
    renamed_at: string,
    reason: string
  }[],
  derived_packages: {
    name: string,
    extracted_at: string,
    extracted_from: string[]
  }[],
  related_patterns: string[]
}
```

**Estimated Value**: Medium
**Implementation Hint**: Analyze commit history for package.json changes and directory movements.

---

### 5. `get_temporal_context` (New Tool)

**Current Gap**:
No temporal awareness - what was happening when a change was made?

**Proposed Tool**:
```typescript
get_temporal_context({
  target: string | Date,  // commit hash or date
  scope: "file" | "package" | "workspace"
}) => {
  epoch: {
    name: string,
    characteristics: string[],
    dominant_activity: string
  },
  recent_changes: {
    files: string[],
    patterns: string[],
    risk_level: string
  },
  concurrent_work: {
    other_files_modified: string[],
    related_features: string[]
  },
  snapshot_coverage: number
}
```

**Estimated Value**: High
**Implementation Hint**: Pre-compute epoch metadata, use git log for temporal queries.

---

### 6. `explain_violation` (New Tool)

**Current Gap**:
Violations are reported but not explained in depth.

**Proposed Tool**:
```typescript
explain_violation({
  type: string,
  file: string,
  line?: number
}) => {
  violation: {
    type: string,
    description: string,
    severity: "warning" | "error" | "critical"
  },
  explanation: {
    why_its_a_problem: string,
    historical_context: string,  // "This pattern caused issues 3 times before"
    related_violations: string[]
  },
  fix: {
    suggested_approach: string,
    code_example?: string,
    similar_fixes: {
      file: string,
      commit: string,
      approach: string
    }[]
  },
  prevention: {
    pattern_to_follow: string,
    tool_to_use: string
  }
}
```

**Estimated Value**: High
**Implementation Hint**: Combine violation history with pattern library and fix examples.

---

### 7. `get_ai_attribution` (New Tool - Unique Value Prop)

**Current Gap**:
No visibility into which changes were AI-generated vs human-written.

**Proposed Tool**:
```typescript
get_ai_attribution({
  file: string,
  range?: { start: number, end: number }
}) => {
  attribution: {
    total_lines: number,
    ai_generated: number,
    human_written: number,
    ai_percentage: number
  },
  by_section: {
    start_line: number,
    end_line: number,
    source: "ai" | "human" | "mixed",
    ai_assistant?: string,  // "claude", "copilot", etc.
    timestamp: string,
    confidence: number
  }[],
  risk_assessment: {
    ai_only_critical_paths: boolean,
    suggested_review_areas: string[]
  }
}
```

**Estimated Value**: Very High (Unique differentiator)
**Implementation Hint**: This requires tracking at edit-time. Integrate with extension's save handler.

---

### 8. `begin_task` Enhancement

**Current Capability**:
Combines get_context + snapshot_create + get_learnings + session.start

**Enhancement Proposal**:
Add intent-aware pre-loading:

```typescript
begin_task({
  task: string,
  files: string[],
  intent: "implement" | "debug" | "refactor" | "review" | "explore"
}) => {
  // Existing returns...
  task_id: string,
  snapshot_status: SnapshotStatus,

  // NEW: Intent-specific pre-loading
  preloaded_context: {
    relevant_contracts: Contract[],  // For implement
    failure_history: TestFailure[],  // For debug
    consolidation_targets: string[], // For refactor
    review_checklist: CheckItem[],   // For review
    exploration_hints: string[]      // For explore
  },

  // NEW: Proactive warnings
  warnings: {
    message: string,
    severity: "info" | "warning" | "caution",
    action: string
  }[],

  // NEW: Suggested workflow
  suggested_next_tools: {
    tool: string,
    when: string,
    priority: number
  }[]
}
```

**Estimated Value**: High
**Implementation Hint**: Extend existing begin_task with intent classification layer.

---

## Tool Consolidation Recommendations

### Current Problem
19 tools is too many for an LLM to navigate efficiently. Decision fatigue reduces effectiveness.

### Proposed Hierarchy

```
Primary Tools (Always Show):
├── begin_task          # Start any work
├── workspace_vitals    # Quick health check
├── create_snapshot     # Protection
└── restore_snapshot    # Recovery

Secondary Tools (On-Demand):
├── compare_snapshots   # Investigation
├── check_patterns      # Pre-commit
├── validate_code       # Deep validation
└── record_learning     # Knowledge capture

Contextual Tools (Auto-Suggested):
├── suggest_snapshot    # When vitals warn
├── explain_violation   # When violation found
├── get_ai_attribution  # When reviewing AI code
└── get_temporal_context # When debugging old changes

Meta Tools (Rarely Used):
├── ctx_* family        # Context system management
├── meta_list_tools     # Discovery
└── acknowledge_risk    # Audit trail
```

---

## Algorithm Improvement Suggestions

### 1. Risk Scoring Algorithm

**Current Approach**:
Heuristic-based risk scoring with fixed weights.

**Observed Limitation**:
Doesn't learn from actual outcomes. A file marked "high risk" that never causes issues should be downweighted.

**Suggested Improvement**:
Implement feedback loop:
```
Risk Score = Base_Heuristic × Historical_Correction_Factor

Where:
Historical_Correction_Factor = (Predicted_Risk / Actual_Outcomes)
Actual_Outcomes = {needed_restore: 1.0, no_restore: 0.0}
```

**Evidence from Exploration**:
Epoch 9 showed that `@snapback/intelligence` already has `TrajectoryPredictor` and `ThresholdCalibrator`. These should feed into risk scoring.

---

### 2. Snapshot Suggestion Algorithm

**Current Approach**:
Based on vitals signals (pulse, temperature, pressure, oxygen).

**Observed Limitation**:
Vitals are instantaneous. They don't account for task context.

**Suggested Improvement**:
```
Snapshot_Suggestion = f(Vitals, Task_Classification, File_Sensitivity, Historical_Patterns)

Where:
- Task_Classification = {implement, debug, refactor, review}
- File_Sensitivity = {auth, payments, config, core, other}
- Historical_Patterns = {files that frequently needed snapshots}
```

**Evidence from Exploration**:
The commit history shows that auth-related changes (`apps/vscode/src/auth/`) had the highest ratio of "WIP" and "checkpoint" commits, suggesting these should have higher snapshot priority.

---

### 3. AI Detection Algorithm

**Current Approach**:
`TemperatureMonitor` tracks AI activity percentage.

**Observed Limitation**:
How does it know what's AI-generated vs human-written?

**Suggested Improvement**:
Multi-signal AI detection:
```
AI_Probability = weighted_sum(
  typing_pattern_analysis,    // AI generates faster, more consistent
  code_style_fingerprint,     // AI has consistent formatting
  commit_message_analysis,    // "feat:" vs natural language
  session_metadata,           // Editor extension can track source
  semantic_complexity         // AI often over-engineers or under-engineers
)
```

**Evidence from Exploration**:
The codebase uses conventional commits (`feat:`, `fix:`, etc.) which are a strong signal. But the actual AI detection mechanism isn't visible from the archaeological exploration.

---

### 4. Pattern Learning Algorithm

**Current Approach**:
Violation tracking with promotion thresholds (3x → pattern, 5x → automation).

**Observed Limitation**:
Learning is violation-based only. Positive patterns (successful approaches) aren't captured automatically.

**Suggested Improvement**:
Dual-learning system:
```
Learning_System:
  Negative:
    - Violations → patterns → automation (existing)

  Positive:
    - Successful_commit_patterns → recommended_patterns
    - Files_never_reverted → trusted_areas
    - Fast_test_completion → stable_code_indicators
```

**Evidence from Exploration**:
Epoch 5-6 was a "consolidation epoch" where duplicate utilities were identified and consolidated. This pattern of "find duplicates → consolidate" could have been auto-detected from the similar code patterns.

---

## Priority Matrix

| Enhancement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| `suggest_snapshot` (proactive) | High | Medium | P0 |
| Intent-aware `begin_task` | High | Medium | P0 |
| `get_ai_attribution` | Very High | High | P1 |
| `compare_snapshots` | High | Low | P1 |
| `explain_violation` | High | Medium | P1 |
| Feedback loop for risk scoring | High | Medium | P2 |
| `get_temporal_context` | Medium | Medium | P2 |
| `get_package_genealogy` | Medium | High | P3 |
| Dual-learning (positive patterns) | High | High | P3 |

---

## Implementation Roadmap Suggestion

### Phase 1: Quick Wins (1 week)
- `compare_snapshots` - Leverages existing infrastructure
- Intent parameter for `begin_task` - Minimal changes

### Phase 2: Proactive Intelligence (2 weeks)
- `suggest_snapshot` - Core value proposition
- `explain_violation` - Enhances learning loop

### Phase 3: Unique Differentiation (3+ weeks)
- `get_ai_attribution` - Major competitive advantage
- Feedback loop for risk scoring - Long-term learning

### Phase 4: Polish (ongoing)
- `get_temporal_context` - Nice-to-have
- `get_package_genealogy` - Power users only
