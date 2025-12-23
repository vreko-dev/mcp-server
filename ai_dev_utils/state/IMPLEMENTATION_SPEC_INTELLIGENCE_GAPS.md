# Intelligence Implementation Gaps - Implementation Specification

**Task ID:** Intelligence Broker Completion
**Status:** In Progress  
**Priority:** P1 (High-value features)  
**Created:** 2025-12-22  
**Research Phase:** Complete ✅

---

## Executive Summary

This spec addresses the ~40% gap between the Intelligence Broker spec ([snapback_inteligence_im.md](../resources/snapback_inteligence_im.md)) and the current `@snapback/intelligence` implementation.

**Gap Analysis:**
- ✅ **90% Complete:** Policy Engine (SARIF validation)
- ✅ **85% Complete:** MCP Tools (8 tools implemented)
- ⚠️ **60% Complete:** Core Architecture (simplified vs spec)
- ⚠️ **40% Complete:** Pattern Engine (violations only, no fragility)
- ⚠️ **30% Complete:** Session Context Manager (basic tracking only)
- ⚠️ **25% Complete:** Advisory Context (basic hints only)

**Implementation Priority (Based on Value/Effort):**
1. **P1 - Session Context Manager** (8-12h) - High value, enables loop detection
2. **P2 - Advisory Context Enrichment** (8-12h) - High value, improves LLM guidance
3. **P3 - File Fragility Tracking** (6-8h) - Medium value, smarter warnings
4. **P4 - IPC Daemon** (20-30h) - Low value, current approach works

---

## Research Summary

### Session Tracking (arXiv + Industry Best Practices)

**Source:** arXiv:2511.10650 - Unsupervised Cycle Detection in Agentic Applications

**Key Findings:**
- **Hybrid approach** beats pure structural (F1: 0.08) or semantic (F1: 0.28) methods
- **Combined F1 score: 0.72** (precision: 0.62, recall: 0.86)
- Structural analysis: temporal call stack patterns
- Semantic analysis: redundant content generation detection

**Implementation Pattern:**
```typescript
// Structural detection: same tool 3+ times in sequence
if (consecutiveSameTool['validate_code'] >= 3) {
  return { detected: true, type: 'structural', action: 'halt' };
}

// Semantic detection: cosine similarity of tool args
const similarity = cosineSimilarity(prevArgs, currentArgs);
if (similarity > 0.9) {
  return { detected: true, type: 'semantic', action: 'warn' };
}
```

**Session State Components:**
1. **Tool Call History** - Last 100 calls with idempotency keys
2. **File Modifications** - Velocity tracking, consecutive edits
3. **Loop Detection** - Circuit breakers + semantic cache
4. **Risk Escalation** - low → medium → high → critical

---

### Loop Prevention (Pedowitz Safety Playbook)

**Source:** https://www.pedowitzgroup.com/prevent-ai-agent-conflicts-loops-safety-playbook

**Key Controls:**
1. **Idempotency Keys** - Unique operation IDs to dedupe repeats
2. **Distributed Locks** - Time-bound ownership on resources
3. **Circuit Breakers** - Trip after N failures, require cooldown
4. **Rate Limits** - Caps by tool/time
5. **Watchdog** - Process monitors + manual kill-switch

**Metrics:**
- Duplicate action rate: ≤ 0.1%
- Conflict error rate: Downward trend
- Mean time to halt: ≤ 2 minutes

**Implementation:**
```typescript
// Circuit breaker pattern
interface CircuitBreaker {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  threshold: 3;
  cooldownMs: 60000; // 1 minute
}

// Auto-trip after 3 failures
if (breaker.failures >= breaker.threshold) {
  breaker.state = 'open';
  return { error: 'Circuit breaker tripped. Cool down required.' };
}
```

---

### Advisory System (GitHub Copilot Model)

**Source:** GitHub Docs - Code Scanning Alerts + Copilot Autofix

**Key Components:**
1. **Structured Warnings** - severity (error/warning/info) + code
2. **Contextual Suggestions** - linked to specific lines
3. **Historical Context** - modification frequency, rollback history
4. **Proactive Recommendations** - next steps based on patterns

**Example Output:**
```typescript
{
  advisory: {
    summary: "auth.ts has been modified 12 times this session (fragility: HIGH)",
    warnings: [
      {
        level: "warning",
        code: "FRAGILE_FILE",
        message: "File has 3 rollbacks in the past week",
        suggestion: "Create snapshot before modifying"
      }
    ],
    suggestions: [
      {
        text: "Run auth tests before committing",
        priority: 1,
        category: "testing"
      }
    ],
    relatedFiles: [
      { path: "middleware/auth.ts", reason: "Modified together 80% of the time" }
    ]
  }
}
```

---

### File Fragility (Provenance-Guided Rollbacks)

**Source:** arXiv:2501.09225 - Provenance Guided Rollback Suggestions

**Key Metrics:**
1. **Rollback Frequency** - How often file is reverted
2. **Time to Rollback** - Average duration before revert
3. **Co-Change Patterns** - Files modified together

**Fragility Scoring:**
```typescript
function calculateFragility(file: string): number {
  const rollbacks = getRollbacksInWindow(file, 7); // 7 days
  const avgTimeToRollback = getAverageTimeToRollback(file);
  const modVelocity = getModificationsPerDay(file);
  
  let score = 0;
  score += rollbacks * 0.3; // High impact
  score += (avgTimeToRollback < 3600000) ? 0.2 : 0; // Quick rollbacks
  score += modVelocity * 0.1; // Frequent changes
  
  return Math.min(score, 1.0);
}

// Classification
if (score > 0.7) return 'critical';
if (score > 0.5) return 'fragile';
if (score > 0.3) return 'moderate';
return 'stable';
```

---

## Implementation Plan

### Phase 1: Session Context Manager (P1)

**Files to Create:**
- `packages/intelligence/src/session/SessionManager.ts` (core)
- `packages/intelligence/src/session/LoopDetector.ts` (cycle detection)
- `packages/intelligence/src/session/CircuitBreaker.ts` (safety)

**Types:** Already created ✅
- `packages/intelligence/src/types/session.ts`

**Key Methods:**
```typescript
class SessionManager {
  // Track tool call
  recordToolCall(sessionId: string, call: ToolCall): void;
  
  // Track file modification
  recordFileModification(sessionId: string, mod: FileModification): void;
  
  // Detect loops (hybrid: structural + semantic)
  detectLoop(sessionId: string): LoopDetectionResult;
  
  // Calculate risk level (low/medium/high/critical)
  calculateRiskLevel(sessionId: string): SessionRiskLevel;
  
  // Get session analytics
  getAnalytics(sessionId: string): SessionAnalytics;
}
```

**Test Coverage (4-path):**
- ✅ Happy: Tool calls tracked, no loops detected
- ✅ Sad: Loop detected, action = halt
- ✅ Edge: Circuit breaker trips at threshold
- ✅ Error: Invalid session ID handling

**Effort:** 8-12 hours

---

### Phase 2: Advisory Context Enrichment (P2)

**Files to Create:**
- `packages/intelligence/src/advisory/AdvisoryEngine.ts` (core)
- `packages/intelligence/src/advisory/rules/` (built-in rules)
  - `FragileFileRule.ts`
  - `LoopDetectionRule.ts`
  - `ViolationHistoryRule.ts`

**Types:** Already created ✅
- `packages/intelligence/src/types/advisory.ts`

**Key Methods:**
```typescript
class AdvisoryEngine {
  // Generate advisory context for tool response
  enrich(context: AdvisoryTriggerContext): AdvisoryContext;
  
  // Register custom rule
  registerRule(rule: AdvisoryRule): void;
  
  // Get file history
  getFileHistory(file: string): FileHistory;
  
  // Get related files (co-change patterns)
  getRelatedFiles(file: string): RelatedFile[];
}
```

**Built-in Rules:**
1. **Fragile File Warning** - Triggers when fragility score > 0.5
2. **Loop Detection Alert** - Triggers when loop detected
3. **Consecutive Modification Warning** - Triggers when file modified 3+ times
4. **Violation History** - Surfaces past violations for file

**Test Coverage:**
- ✅ Happy: Advisory context generated with all sections
- ✅ Sad: No warnings when file is stable
- ✅ Edge: Max warnings limit enforced
- ✅ Error: Missing fragility data handled gracefully

**Effort:** 8-12 hours

---

### Phase 3: File Fragility Tracking (P3)

**Files to Create:**
- `packages/intelligence/src/fragility/FragilityTracker.ts` (core)
- `packages/intelligence/src/fragility/CoChangeDetector.ts` (patterns)

**Types:** Already created ✅
- `packages/intelligence/src/types/fragility.ts`

**Key Methods:**
```typescript
class FragilityTracker {
  // Record rollback event
  recordRollback(event: RollbackEvent): void;
  
  // Record file modification
  recordModification(file: string, linesChanged: number, author: string): void;
  
  // Detect co-change patterns (files modified together)
  detectCoChangePatterns(): CoChangePattern[];
  
  // Get fragility profile for file
  getProfile(file: string): FileFragilityProfile;
  
  // Analyze fragility and get recommendations
  analyze(file: string): FragilityAnalysis;
}
```

**Storage:**
- JSONL file: `.snapback/fragility.jsonl`
- Record types: `rollback`, `modification`, `co-change`

**Score Calculation:**
```typescript
score = (rollbacks * 0.3) + 
        (quickRollbackPenalty * 0.2) + 
        (modVelocity * 0.1) + 
        (coChangeComplexity * 0.1)

// Decay over time (5% daily)
score = score * Math.pow(0.95, daysSinceLastRollback)
```

**Test Coverage:**
- ✅ Happy: Fragility profile calculated correctly
- ✅ Sad: No rollback history, score = 0
- ✅ Edge: Co-change patterns detected accurately
- ✅ Error: Invalid file path handling

**Effort:** 6-8 hours

---

### Phase 4: Intelligence Facade Integration (P1)

**File to Modify:**
- `packages/intelligence/src/Intelligence.ts` (add new methods)

**New Methods:**
```typescript
// Session Management
startSession(sessionId: string, metadata?: SessionMetadata): void;
recordToolCall(sessionId: string, call: ToolCall): void;
recordFileModification(sessionId: string, mod: FileModification): void;
detectLoop(sessionId: string): LoopDetectionResult;
getSessionAnalytics(sessionId: string): SessionAnalytics;

// Advisory Enrichment
enrichAdvisory(context: AdvisoryTriggerContext): AdvisoryContext;
getFileHistory(file: string): FileHistory;

// Fragility Tracking
recordRollback(event: RollbackEvent): void;
getFragilityProfile(file: string): FileFragilityProfile;
analyzeFragility(file: string): FragilityAnalysis;
```

**Wiring:**
```typescript
constructor(config: IntelligenceConfig) {
  // Existing...
  this.sessionManager = new SessionManager(this.config);
  this.advisoryEngine = new AdvisoryEngine(this.config);
  this.fragilityTracker = new FragilityTracker(this.config);
}
```

**Effort:** 2-4 hours

---

### Phase 5: MCP Tools Integration (P1)

**File to Modify:**
- `ai_dev_utils/mcp/server.ts` (internal MCP)
- `apps/mcp-server/src/tools/` (customer MCP)

**New Tools:**
```typescript
// Tool: codebase.start_session
server.tool('start_session', async (args) => {
  intel.startSession(args.sessionId, args.metadata);
  return { sessionId: args.sessionId, startedAt: Date.now() };
});

// Tool: codebase.check_session_health
server.tool('check_session_health', async (args) => {
  const loop = intel.detectLoop(args.sessionId);
  const analytics = intel.getSessionAnalytics(args.sessionId);
  
  return {
    riskLevel: analytics.peakRiskLevel,
    loopDetected: loop.detected,
    advisory: loop.detected ? {
      summary: `Loop detected: ${loop.type}`,
      action: loop.action,
      evidence: loop.evidence
    } : null
  };
});
```

**Enhanced Tools (add advisory enrichment):**
- `get_context` → Inject advisory context
- `check_patterns` → Include fragility warnings
- `validate_code` → Add file history context

**Effort:** 4-6 hours

---

### Phase 6: Testing (ALL)

**Test Files to Create:**
- `packages/intelligence/test/session/SessionManager.test.ts`
- `packages/intelligence/test/session/LoopDetector.test.ts`
- `packages/intelligence/test/advisory/AdvisoryEngine.test.ts`
- `packages/intelligence/test/fragility/FragilityTracker.test.ts`
- `packages/intelligence/test/integration/intelligence-gaps.test.ts`

**Coverage Requirements:**
- Unit tests: 4-path coverage (happy/sad/edge/error)
- Integration tests: End-to-end session lifecycle
- Performance tests: Session tracking < 50ms overhead

**Test Data:**
- Mock session with 20 tool calls
- Mock fragility records (rollbacks, co-changes)
- Mock advisory rules

**Effort:** 6-8 hours

---

## Total Effort Estimate

| Phase | Component | Hours | Priority |
|-------|-----------|-------|----------|
| 1 | Session Context Manager | 8-12 | P1 |
| 2 | Advisory Context Enrichment | 8-12 | P2 |
| 3 | File Fragility Tracking | 6-8 | P3 |
| 4 | Intelligence Facade Integration | 2-4 | P1 |
| 5 | MCP Tools Integration | 4-6 | P1 |
| 6 | Testing | 6-8 | ALL |
| **TOTAL** | | **34-50 hours** | |

**Phased Rollout:**
- **Week 1:** Phase 1 + Phase 4 (Session tracking basics)
- **Week 2:** Phase 2 + Phase 5 (Advisory enrichment + MCP)
- **Week 3:** Phase 3 + Phase 6 (Fragility + Tests)

---

## Success Metrics

### Session Management
- ✅ Loop detection accuracy: F1 > 0.70
- ✅ False positive rate: < 5%
- ✅ Session tracking overhead: < 50ms per tool call

### Advisory Enrichment
- ✅ Advisory context generated for 100% of responses
- ✅ Warning relevance (manual review): > 80%
- ✅ Suggestion quality (manual review): > 75%

### Fragility Tracking
- ✅ Fragility score accuracy (vs manual classification): > 85%
- ✅ Co-change pattern detection: Precision > 70%, Recall > 60%
- ✅ Rollback prediction accuracy: > 60%

---

## Dependencies

**External Libraries:**
- None (uses existing `@snapback/intelligence` deps)

**Internal Packages:**
- `@snapback/intelligence` (existing)
- `@snapback/contracts` (types)

**Data Storage:**
- `.snapback/sessions/` (session JSONL files)
- `.snapback/fragility.jsonl` (fragility records)
- `.snapback/advisory-cache.json` (advisory rule cache)

---

## Risks & Mitigations

### Risk 1: Performance Overhead
**Impact:** Session tracking adds latency to every tool call  
**Mitigation:** 
- Keep session state in-memory (JSONL only for persistence)
- Async writes to JSONL (fire-and-forget)
- Performance budget: < 50ms per tool call

### Risk 2: False Positive Loops
**Impact:** LLM halted unnecessarily  
**Mitigation:**
- Hybrid detection (structural + semantic)
- Confidence threshold: only halt at > 0.8 confidence
- 'warn' action at 0.5-0.8 confidence

### Risk 3: Fragility Data Cold Start
**Impact:** No recommendations for new workspaces  
**Mitigation:**
- Default to generic patterns from ARCHITECTURE.md
- Accumulate data over first week
- Mark recommendations as "low confidence" initially

---

## Future Enhancements (Not in Scope)

1. **IPC Daemon Architecture** (P4) - Process isolation via Unix sockets
2. **Remote Sync** - Sync learnings across machines (Pro tier)
3. **ML-Based Loop Detection** - Train model on labeled dataset
4. **Workspace Benchmarking** - Compare fragility to industry norms

---

## References

**Research Papers:**
- [arXiv:2511.10650](https://arxiv.org/abs/2511.10650) - Unsupervised Cycle Detection
- [arXiv:2501.09225](https://arxiv.org/abs/2501.09225) - Provenance Guided Rollbacks

**Industry Patterns:**
- [Pedowitz Safety Playbook](https://www.pedowitzgroup.com/prevent-ai-agent-conflicts-loops-safety-playbook)
- [GitHub Copilot Autofix](https://docs.github.com/en/code-security/code-scanning/managing-code-scanning-alerts)
- [LangChain Context Engineering](https://docs.langchain.com/oss/python/langchain/context-engineering)

**Existing Specs:**
- [snapback_inteligence_im.md](../resources/snapback_inteligence_im.md)
- [ROUTER.md](../ROUTER.md) - Lines 213-247 (Integration Audit)

---

**Status:** Ready for Implementation  
**Next Step:** Begin Phase 1 (Session Context Manager)  
**Last Updated:** 2025-12-22
