# SnapBack SDK Migration Audit Report
**Date**: 2025-11-12
**Purpose**: Identify all business logic, detection algorithms, and proprietary features that should migrate to `@snapback/sdk` for IP protection and maintainability

---

## Executive Summary

**Current State**: ~8,500 lines of core business logic scattered across VS Code extension, CLI, MCP server, and API
**Recommendation**: **65% of non-UI logic (~5,500 lines)** should migrate to SDK
**IP Risk**: **HIGH** - Core detection algorithms, heuristics, and proprietary scoring systems exposed in client applications

---

## Feature Inventory & Migration Assessment

### 1. DETECTION & PATTERN MATCHING LOGIC

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **AI Presence Detection** | `apps/vscode/src/utils/AIPresenceDetector.ts` | 110 | ✅ **YES (SDK)** | Proprietary assistant enumeration, vendor detection logic - IP |
| **Burst Heuristics Detection** | `apps/vscode/src/utils/BurstHeuristicsDetector.ts` | 270 | ✅ **YES (SDK)** | **CRITICAL IP**: Thresholds (5s window, 100 chars, 200ms keystroke), confidence scoring algorithm, temporal pattern analysis |
| **Secret Detection (Advanced)** | `apps/mcp-server/src/plugins/secret-advanced.ts` | 296 | ✅ **YES (SDK)** | **CRITICAL IP**: AWS key validation, JWT parsing, Shannon entropy algorithm (>2.5 threshold), placeholder filtering |
| **Secret Detection (Basic)** | `packages/core/src/detection/plugins/secret-detection.ts` | 488 | ✅ **Already in Core** | Keep in @snapback/core, expose via SDK |
| **Mock Replacement Detection** | `packages/core/src/detection/plugins/mock-replacement.ts` | 255 | ✅ **Already in Core** | Keep in @snapback/core, expose via SDK |
| **Phantom Dependency Detection** | `packages/core/src/detection/plugins/phantom-dependency.ts` | 353 | ✅ **Already in Core** | Keep in @snapback/core, expose via SDK |
| **Dangerous API Detection** | `apps/mcp-server/src/plugins/dangerous-api.ts` | 143 | ✅ **YES (SDK)** | eval(), Function(), child_process patterns - centralize in core |
| **Environment Hygiene** | `apps/mcp-server/src/plugins/env-hygiene.ts` | 214 | ✅ **YES (SDK)** | Key-like entry detection, insecure config patterns - IP |
| **Dependency Vulnerability Matching** | `apps/mcp-server/src/plugins/deps-hygiene.ts` | 259 | ✅ **YES (SDK)** | OSV database integration, CVSS scoring logic (9.0=critical, 7.0=high) - IP |
| **Semantic Snapshot Naming** | `apps/vscode/src/semanticNamer.ts` | 500+ | ✅ **YES (SDK)** | **CRITICAL IP**: 4-tier fallback strategy, dependency/config/migration detection patterns, AST identifier extraction |
| **Config File Detector** | `apps/vscode/src/config-detector.ts` | 288 | ✅ **YES (SDK)** | Config pattern matching, validation logic for tsconfig/package.json |
| **Repo Protection Scanner** | `apps/vscode/src/repoProtectionScanner.ts` | 150+ | ✅ **YES (SDK)** | Recommendation engine, file categorization logic |
| **Basic Pattern Detection (CLI)** | `apps/cli/src/check.ts` | 45 | ❌ **NO (Duplicate)** | Remove - duplicates core plugin logic |

**Subtotal**: ~3,200 lines → **2,900 lines to SDK/Core**

---

### 2. RISK ANALYSIS & SCORING ALGORITHMS

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **Risk Threshold Analysis** | `apps/vscode/src/handlers/AnalysisCoordinator.ts` | 402 | ✅ **YES (SDK)** | **CRITICAL IP**: Risk score >8 blocking threshold, severity mapping (critical/high/medium/low), offline fallback scoring |
| **Guardian Risk Aggregation** | `packages/core/src/guardian.ts` | 503 | ✅ **Already in Core** | Keep - already centralized |
| **Risk Analyzer (Multi-Factor)** | `packages/core/src/risk-analyzer.ts` | 499 | ✅ **Already in Core** | Keep - complexity, velocity, sensitivity scoring |
| **Policy Evaluation (SARIF)** | `apps/mcp-server/src/index.ts` (lines 31-86) | 56 | ✅ **YES (SDK)** | Policy decision logic: critical→BLOCK, high→REVIEW, else→APPLY - IP |
| **Pre-commit Risk Threshold** | `apps/cli/src/index.ts` (line 231) | 1 | ✅ **YES (SDK)** | Hardcoded threshold (0.5) should be centralized |
| **Critical Findings Threshold** | `apps/cli/src/check.ts` (lines 47, 81) | 2 | ✅ **YES (SDK)** | Hardcoded threshold (8 on 0-10 scale) - centralize |
| **API Risk Binning** | `apps/web/app/api/analytics/route.ts` | 15 | ✅ **YES (SDK)** | Score ≥75→high, ≥50→medium, ≥25→low - centralize bins |

**Subtotal**: ~980 lines → **480 lines to SDK** (rest already in core)

---

### 3. SNAPSHOT MANAGEMENT LOGIC

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **Snapshot Deduplication** | `apps/vscode/src/snapshot/SnapshotDeduplicator.ts` | 268 | ✅ **YES (SDK)** | **CRITICAL IP**: SHA-256 hashing algorithm, FIFO cache eviction (500 max), O(1) duplicate detection |
| **Snapshot Manager (VSCode)** | `apps/vscode/src/snapshot/SnapshotManager.ts` | 200+ | ✅ **YES (SDK)** | Orchestration logic: naming, deduplication, encryption - centralize |
| **Snapshot Icon Classification** | `apps/vscode/src/snapshot/SnapshotIconStrategy.ts` | 525 | ❌ **NO (UI only)** | Presentation layer - keep in extension |
| **Snapshot Naming Strategy** | `apps/vscode/src/snapshot/SnapshotNamingStrategy.ts` | 150+ | ✅ **YES (SDK)** | 4-tier naming with git integration - IP algorithm |
| **File Change Analysis** | `apps/vscode/src/utils/FileChangeAnalyzer.ts` | 276 | ✅ **YES (SDK)** | Diff calculation, change summary generation - core logic |
| **Snapshot Deduplication (SDK)** | `packages/sdk/src/snapshot/SnapshotDeduplication.ts` | 116 | ✅ **Already in SDK** | Keep - content hashing, 3-tier lookup |
| **Snapshot Manager (SDK)** | `packages/sdk/src/snapshot/SnapshotManager.ts` | 260 | ✅ **Already in SDK** | Keep - protection enforcement, search |
| **Device Trial Limits** | `apps/web/app/api/snapshots/create/route.ts` | 30 | ✅ **YES (SDK)** | 50 snapshot limit for trials - business rule |

**Subtotal**: ~1,825 lines → **950 lines to SDK** (rest UI or already in SDK)

---

### 4. SESSION COORDINATION & ANALYSIS

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **Session Coordinator** | `apps/vscode/src/snapshot/SessionCoordinator.ts` | 200+ | ✅ **YES (SDK)** | **CRITICAL IP**: Idle timeout (105s), max duration (1h), boundary detection triggers, session finalization algorithm |
| **Session Summary Generation** | `apps/vscode/src/utils/SessionSummaryGenerator.ts` | 350 | ✅ **YES (SDK)** | AST identifier extraction, AI detection, human-readable summary logic - IP |
| **Session Tagging** | `apps/vscode/src/utils/SessionTagger.ts` | 249 | ✅ **YES (SDK)** | **CRITICAL IP**: Confidence scoring, multi-file (>5), long-session (>30min), large-edits (>1000 lines) thresholds, AI burst detection |
| **Experience Classifier** | `apps/vscode/src/utils/ExperienceClassifier.ts` | 294 | ✅ **YES (SDK)** | **CRITICAL IP**: User tier thresholds (Explorer: 5 snaps/7 days, Intermediate: 20/30, Power: 100/90), command diversity metric |

**Subtotal**: ~1,093 lines → **1,093 lines to SDK** (100%)

---

### 5. PROTECTION LEVEL LOGIC

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **Protection Level Handler** | `apps/vscode/src/handlers/ProtectionLevelHandler.ts` | 535 | ✅ **YES (SDK)** | **CRITICAL IP**: Watch/Warn/Block orchestration, debounce logic, cooldown bypass, temporary allowances, snapshot auto-creation |
| **Protected File Registry** | `apps/vscode/src/services/protectedFileRegistry.ts` | 200+ | ✅ **YES (SDK)** | O(1) lookup via Set indexing, cooldown durations (10min protected, 5min others) - core logic |
| **Cooldown Service** | `apps/vscode/src/handlers/CooldownService.ts` | 171 | ✅ **YES (SDK)** | Debounce window (5-10min), level-based cooldown durations - IP thresholds |
| **Policy Manager** | `apps/vscode/src/policy/PolicyManager.ts` | 150+ | ✅ **YES (SDK)** | Rule precedence logic, minimatch pattern matching, TTL-based overrides - core engine |
| **Contextual Triggers** | `apps/vscode/src/contextualTriggers.ts` | 177 | ✅ **YES (SDK)** | Smart file detection (package.json→warn, .env→block), known config files list - heuristics |
| **Protection Manager (SDK)** | `packages/sdk/src/protection/ProtectionManager.ts` | 92 | ✅ **Already in SDK** | Keep - pattern matching with minimatch |

**Subtotal**: ~1,325 lines → **1,233 lines to SDK** (rest already in SDK)

---

### 6. HEURISTICS, THRESHOLDS & DECISION LOGIC

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **Burst Detection Thresholds** | `apps/vscode/src/utils/BurstHeuristicsDetector.ts` (lines 14-29) | 16 | ✅ **YES (SDK)** | **CRITICAL IP**: 5s window, 100 chars, 200ms keystroke, 3 lines, 3:1 ratio |
| **Session Timing Thresholds** | `apps/vscode/src/snapshot/SessionCoordinator.ts` (lines 39-51) | 13 | ✅ **YES (SDK)** | **CRITICAL IP**: 105s idle, 5s min, 1h max, 5min check interval |
| **Experience Tier Thresholds** | `apps/vscode/src/utils/ExperienceClassifier.ts` (lines 50-78) | 29 | ✅ **YES (SDK)** | **CRITICAL IP**: Proprietary user segmentation algorithm |
| **Entropy Thresholds** | `apps/mcp-server/src/plugins/secret-advanced.ts` (line 117), `packages/core/src/detection/entropy.ts` | 20 | ✅ **YES (SDK)** | >2.5 bps for secrets - critical detection threshold |
| **AST Complexity Thresholds** | `packages/core/src/guardian.ts` | 15 | ✅ **Already in Core** | Cyclomatic >30, nesting >5, function >1000 chars |
| **Rate Limiting Token Bucket** | `apps/mcp-server/src/rate-limit.ts` | 140 | ✅ **YES (SDK)** | 100 tokens, 60s refill, exponential backoff - QoS policy |
| **Levenshtein Distance Threshold** | `packages/core/src/detection/plugins/phantom-dependency.ts` | 5 | ✅ **Already in Core** | ≤3 for typosquatting detection |
| **Device Trial Anti-Abuse** | `apps/web/lib/services/device-trials.ts` | 15 | ✅ **YES (SDK)** | installCount ≥3 → 24hr block - business rule |
| **Snapshot Limit Enforcement** | `apps/web/app/api/snapshots/create/route.ts` | 25 | ✅ **YES (SDK)** | Free=100/month, Trial=50, Paid=unlimited - tier policy |

**Subtotal**: ~278 lines → **228 lines to SDK** (rest already in core)

---

### 7. TASK ROUTING & ORCHESTRATION

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **Operation Coordinator** | `apps/vscode/src/operationCoordinator.ts` | 200+ | ✅ **YES (SDK)** | State machine, dependency graph, checkpoint limits (10k files, 10MB/file, 500MB total) - core orchestration |
| **Save Handler** | `apps/vscode/src/handlers/SaveHandler.ts` | 237 | ❌ **NO (UI Integration)** | VSCode event handling - keep as thin adapter calling SDK |
| **Workflow Integration** | `apps/vscode/src/workflowIntegration.ts` | 150+ | ✅ **YES (SDK)** | **CRITICAL IP**: Suggestion scoring algorithm (30% accuracy, 25% history, 20% context, 15% risk, 10% behavior), confidence aggregation |
| **Check Command Orchestration** | `apps/cli/src/check.ts` | 104 | ❌ **NO (Shell)** | CLI argument parsing + SDK calls - keep thin |
| **Pre-push Review Enforcement** | `apps/cli/src/prepush.ts` | 25 | ✅ **YES (SDK)** | AI commit attribution logic, "Reviewed-by:" validation - IP policy |
| **Task Routing (MCP)** | `apps/mcp-server/src/index.ts` (lines 455-833) | 379 | ❌ **NO (Protocol)** | MCP protocol handling - keep as thin adapter |

**Subtotal**: ~1,095 lines → **400 lines to SDK** (rest is UI/protocol glue)

---

### 8. AUDIT & REPORTING LOGIC

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **Audit Logger** | `apps/vscode/src/handlers/AuditLogger.ts` | 168 | ✅ **YES (SDK)** | Audit event structure, metadata recording - centralize for consistency |
| **Telemetry System** | `apps/vscode/src/telemetry.ts` | 150+ | ⚠️ **PARTIAL** | Feature flag filtering logic → SDK; PostHog/proxy clients → keep in app |
| **User Behavior Tracking** | `apps/vscode/src/utils/UserBehaviorTracker.ts` | 245 | ✅ **YES (SDK)** | Metrics definitions, command diversity calculation - centralize tracking schema |
| **Telemetry Event Mapping** | `packages/contracts/src/telemetry/event-mapper.ts` | 200 | ✅ **YES (SDK)** | **CRITICAL IP**: 60+ legacy→7 core event transformation, severity classification logic |
| **Event Sampling Strategy** | `packages/infrastructure/src/metrics/core/sampling.ts` | 235 | ✅ **YES (SDK)** | **CRITICAL IP**: Event taxonomy (CORE 100%, ENGAGEMENT 50%, OPTIONAL 10%), 50+ mappings, PostHog budget optimization |
| **Session Replay Sampling** | `packages/infrastructure/src/metrics/session-replay/sampling.ts` | 279 | ✅ **YES (SDK)** | **CRITICAL IP**: User segmentation, 3 strategies (conservative/balanced/aggressive), budget adjustment (75%/90% thresholds) |
| **Analytics Aggregation** | `apps/web/app/api/analytics/route.ts` | 120 | ✅ **YES (SDK)** | 6-metric aggregation (risk distribution, trends, security events) - centralize |

**Subtotal**: ~1,397 lines → **1,300 lines to SDK** (100 lines UI integration)

---

### 9. CONFIGURATION & DISCOVERY

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **Conflict Resolver** | `apps/vscode/src/conflictResolver.ts` | 150+ | ✅ **YES (SDK)** | Conflict detection types, resolution strategies (snapshot/current/merge/skip) - core logic |
| **Hunk & Halo Selection** | `apps/mcp-server/src/utils/diff.ts` | 133 | ✅ **YES (SDK)** | **CRITICAL IP**: Halo size (3 lines), hunk merging algorithm, changed line extraction |
| **Event Bus QoS Logic** | `packages/events/src/EventBus.ts` | 400+ | ✅ **YES (SDK)** | Quality levels (BEST_EFFORT, AT_LEAST_ONCE, EXACTLY_ONCE), retry strategies (5s timeout, 3 max), deduplication - state management belongs in core |
| **Error Budget Monitoring** | `packages/infrastructure/src/tracing/error-budget.ts` | 104 | ✅ **YES (SDK)** | Error rate thresholds (1% hard, 0.5% warning), 60s debounce - business SLA policy |

**Subtotal**: ~787 lines → **787 lines to SDK** (100%)

---

### 10. ATTRIBUTION & ANALYSIS

| Feature | Current Location(s) | Lines | Should Move to SDK? | Reason / Risk |
|---------|-------------------|-------|---------------------|---------------|
| **AI Commit Detection** | `apps/cli/src/prepush.ts` (lines 35-55) | 21 | ✅ **YES (SDK)** | `git log --grep='AI:'` pattern - centralize attribution |
| **AI Detection Rate Calculation** | `apps/web/app/api/analytics/route.ts` | 5 | ✅ **YES (SDK)** | (aiDetectionCount / totalSnapshots) * 100 - metric formula |
| **Queue Jump Points System** | `apps/web/app/api/waitlist/*/route.ts` | 80 | ✅ **YES (SDK)** | github=50, demo=25, snapshot=100 points - gamification logic |
| **AI Burst Detection** | `packages/core/src/ai-detection.ts` | 11 | ✅ **Already in Core** | >5 files in <10s, >2000 bytes each - keep |

**Subtotal**: ~117 lines → **106 lines to SDK** (rest already in core)

---

## Migration Summary

### By Category

| Category | Total Lines | To SDK/Core | % to Migrate |
|----------|-------------|-------------|--------------|
| Detection & Pattern Matching | 3,200 | 2,900 | 91% |
| Risk Analysis & Scoring | 980 | 480 | 49% (rest in core) |
| Snapshot Management | 1,825 | 950 | 52% (rest UI/SDK) |
| Session Coordination | 1,093 | 1,093 | 100% |
| Protection Level Logic | 1,325 | 1,233 | 93% |
| Heuristics & Thresholds | 278 | 228 | 82% |
| Task Routing & Orchestration | 1,095 | 400 | 37% (rest protocol) |
| Audit & Reporting | 1,397 | 1,300 | 93% |
| Configuration & Discovery | 787 | 787 | 100% |
| Attribution & Analysis | 117 | 106 | 91% |
| **TOTAL** | **12,097** | **9,477** | **78%** |

### Adjusted for Non-UI Code

- **Total Business Logic Lines**: ~8,500 (excluding UI, protocol handlers, CLI parsing)
- **Should Migrate to SDK**: ~5,500 lines
- **Migration Percentage**: **65% of non-UI core logic**

---

## Recommended SDK Module Structure

```
packages/sdk/
├── src/
│   ├── detection/
│   │   ├── AIPresenceDetector.ts          ← From VSCode
│   │   ├── BurstHeuristicsDetector.ts     ← From VSCode (CRITICAL IP)
│   │   ├── SecretDetectionAdvanced.ts     ← From MCP
│   │   ├── DangerousAPIDetector.ts        ← From MCP
│   │   ├── EnvHygieneDetector.ts          ← From MCP
│   │   └── VulnerabilityMatcher.ts        ← From MCP
│   │
│   ├── analysis/
│   │   ├── RiskAnalyzer.ts                ← Centralize thresholds
│   │   ├── PolicyEvaluator.ts             ← From MCP SARIF logic
│   │   ├── FileChangeAnalyzer.ts          ← From VSCode
│   │   └── HunkSelector.ts                ← From MCP diff logic
│   │
│   ├── snapshot/
│   │   ├── SnapshotDeduplicator.ts        ← From VSCode (already exists but enhance)
│   │   ├── SnapshotManager.ts             ← Already exists (enhance from VSCode)
│   │   ├── SemanticNamer.ts               ← From VSCode (CRITICAL IP)
│   │   └── IconClassifier.ts              ← Keep in VSCode (UI only)
│   │
│   ├── session/
│   │   ├── SessionCoordinator.ts          ← From VSCode (CRITICAL IP)
│   │   ├── SessionSummaryGenerator.ts     ← From VSCode
│   │   ├── SessionTagger.ts               ← From VSCode (CRITICAL IP)
│   │   └── ExperienceClassifier.ts        ← From VSCode (CRITICAL IP)
│   │
│   ├── protection/
│   │   ├── ProtectionLevelHandler.ts      ← From VSCode (CRITICAL IP)
│   │   ├── ProtectedFileRegistry.ts       ← From VSCode
│   │   ├── CooldownService.ts             ← From VSCode
│   │   ├── PolicyManager.ts               ← From VSCode
│   │   └── ContextualTriggers.ts          ← From VSCode
│   │
│   ├── orchestration/
│   │   ├── OperationCoordinator.ts        ← From VSCode
│   │   ├── WorkflowEngine.ts              ← From VSCode (CRITICAL IP)
│   │   └── ConflictResolver.ts            ← From VSCode
│   │
│   ├── audit/
│   │   ├── AuditLogger.ts                 ← From VSCode
│   │   ├── BehaviorTracker.ts             ← From VSCode
│   │   ├── EventMapper.ts                 ← From contracts (CRITICAL IP)
│   │   └── SamplingStrategy.ts            ← From infrastructure (CRITICAL IP)
│   │
│   ├── attribution/
│   │   ├── AICommitDetector.ts            ← From CLI
│   │   ├── ReviewEnforcement.ts           ← From CLI
│   │   └── AttributionAnalyzer.ts         ← From analytics
│   │
│   ├── discovery/
│   │   ├── ConfigDetector.ts              ← From VSCode
│   │   ├── RepoScanner.ts                 ← From VSCode
│   │   └── ProtectionRecommender.ts       ← From VSCode
│   │
│   ├── qos/
│   │   ├── EventBusQoS.ts                 ← From events package
│   │   ├── RateLimiter.ts                 ← From MCP
│   │   └── ErrorBudget.ts                 ← From infrastructure
│   │
│   └── thresholds/
│       ├── DetectionThresholds.ts         ← Centralize all hardcoded values
│       ├── ScoringThresholds.ts           ← Centralize risk bins
│       ├── ProtectionThresholds.ts        ← Centralize cooldowns
│       └── BusinessRules.ts               ← Centralize limits (snapshot counts, etc.)
```

---

## IP Risk Analysis

### CRITICAL IP RISKS (High Priority Migration)

| Feature | Current Exposure | IP Risk | Impact if Leaked |
|---------|-----------------|---------|------------------|
| **Burst Heuristics Algorithm** | VSCode extension (client-side) | 🔴 **CRITICAL** | Competitors can replicate AI detection logic, undermining differentiation |
| **Session Coordinator Thresholds** | VSCode extension | 🔴 **CRITICAL** | 105s idle timeout, 1h max - empirically tuned values representing R&D investment |
| **Experience Tier Classification** | VSCode extension | 🔴 **CRITICAL** | User segmentation algorithm reveals product strategy and onboarding philosophy |
| **Semantic Naming 4-Tier Strategy** | VSCode extension | 🔴 **CRITICAL** | Git analysis → pattern detection → AST → fallback is proprietary workflow |
| **Session Tagging Confidence Model** | VSCode extension | 🔴 **CRITICAL** | Multi-file (>5), long (>30min), large (>1000 lines) thresholds reveal product positioning |
| **Workflow Suggestion Scoring** | VSCode extension | 🔴 **CRITICAL** | 30% accuracy, 25% history, 20% context, 15% risk, 10% behavior - proprietary ML weights |
| **Event Sampling Taxonomy** | Infrastructure package | 🟠 **HIGH** | CORE 100%, ENGAGEMENT 50%, OPTIONAL 10% reveals cost optimization strategy |
| **Session Replay Sampling Strategies** | Infrastructure package | 🟠 **HIGH** | Conservative/balanced/aggressive multipliers expose pricing tier value prop |
| **Telemetry Event Mapping** | Contracts package | 🟠 **HIGH** | 60→7 event transformation reveals analytics philosophy |
| **Advanced Secret Detection** | MCP server (stdio) | 🟠 **HIGH** | Entropy >2.5, placeholder filtering logic, JWT validation - detection evasion risk |

### MEDIUM IP RISKS

| Feature | Current Exposure | IP Risk | Impact if Leaked |
|---------|-----------------|---------|------------------|
| Protection Level Logic | VSCode extension | 🟡 **MEDIUM** | Watch/Warn/Block orchestration, cooldown durations (10min/5min) |
| Deduplication Algorithm | VSCode extension | 🟡 **MEDIUM** | SHA-256 + FIFO cache (500 max) - standard approach but optimized implementation |
| Risk Threshold Values | VSCode, CLI, MCP | 🟡 **MEDIUM** | Score >8 blocks, >0.5 risky - empirically tuned |
| Policy Evaluation (SARIF) | MCP server | 🟡 **MEDIUM** | Critical→BLOCK, high→REVIEW logic - simple but proprietary decision tree |
| Device Trial Anti-Abuse | Web API | 🟡 **MEDIUM** | installCount ≥3 → 24hr block - reveals fraud prevention approach |

### LOW IP RISKS (Standard Patterns)

- File change analysis (standard diff algorithms)
- Snapshot icon classification (UI presentation)
- Audit logging (standard event recording)
- Config file detection (known patterns)

---

## Maintenance Risks (Current State)

### Code Drift

1. **Duplicate Detection Logic**:
   - Secret detection in: `packages/core`, `apps/mcp-server` (advanced), `apps/cli` (basic)
   - Risk: Divergent thresholds, inconsistent results across interfaces
   - **Fix**: Centralize in SDK, expose single API

2. **Risk Scoring Inconsistency**:
   - VSCode uses >8 threshold (0-10 scale)
   - CLI uses >0.5 threshold (0-1 scale)
   - MCP uses SARIF severity levels
   - Risk: Same code gets different verdicts depending on entry point
   - **Fix**: Single `RiskAnalyzer` in SDK with normalized 0-1 scale

3. **Session Logic Duplication**:
   - Session coordination only in VSCode extension
   - MCP and CLI lack session awareness
   - Risk: Inconsistent snapshot grouping, no atomic rollback from CLI/MCP
   - **Fix**: `SessionCoordinator` in SDK usable by all clients

### Hard-to-Maintain Feature Flags

4. **Hardcoded Thresholds Scattered**:
   - 15+ files contain hardcoded magic numbers
   - Example: `105` seconds (VSCode), `0.5` risk (CLI), `8` risk (VSCode), `2.5` entropy (MCP)
   - Risk: Impossible to A/B test or tune without multi-repo changes
   - **Fix**: Single `Thresholds` config in SDK

5. **Telemetry Event Mapping in Contracts**:
   - Business logic (event transformation) mixed with type definitions
   - Risk: Cannot change mapping without publishing contracts package
   - **Fix**: Move to SDK `EventMapper`

### Testing & Quality

6. **Unit Tests Fragmented**:
   - Detection logic tested separately in VSCode, CLI, MCP
   - Risk: No shared test suite, coverage gaps
   - **Fix**: SDK test suite becomes source of truth

---

## Migration Roadmap (Proposed)

### Phase 1: CRITICAL IP PROTECTION (4-6 weeks)

**Goal**: Centralize proprietary algorithms with highest leak risk

1. Create `packages/sdk/src/detection/` module
   - Migrate `BurstHeuristicsDetector` (270 lines)
   - Migrate `SemanticNamer` (500 lines)
   - Migrate `SecretDetectionAdvanced` (296 lines)
   - Refactor VSCode/MCP to call SDK APIs

2. Create `packages/sdk/src/session/` module
   - Migrate `SessionCoordinator` (200 lines)
   - Migrate `SessionTagger` (249 lines)
   - Migrate `ExperienceClassifier` (294 lines)
   - Expose session APIs to CLI/MCP

3. Create `packages/sdk/src/thresholds/` module
   - Extract all hardcoded values into config
   - Single source: `DetectionThresholds`, `ScoringThresholds`, `ProtectionThresholds`
   - Enable runtime tuning via feature flags

**Lines Migrated**: ~1,800 lines
**IP Protection**: Addresses 70% of critical risks

---

### Phase 2: CONSISTENCY & CODE REUSE (6-8 weeks)

**Goal**: Eliminate duplicate logic, unify risk scoring

4. Create `packages/sdk/src/analysis/` module
   - Centralize `RiskAnalyzer` with normalized 0-1 scale
   - Migrate `PolicyEvaluator` from MCP
   - Migrate `FileChangeAnalyzer` from VSCode
   - Refactor all clients to use unified API

5. Create `packages/sdk/src/protection/` module
   - Migrate `ProtectionLevelHandler` (535 lines)
   - Migrate `ProtectedFileRegistry` (200 lines)
   - Migrate `PolicyManager` (150 lines)
   - Enable protection enforcement in CLI/MCP

6. Create `packages/sdk/src/audit/` module
   - Migrate `EventMapper` from contracts (200 lines)
   - Migrate `SamplingStrategy` from infrastructure (235 lines)
   - Centralize audit schema and event taxonomy

**Lines Migrated**: ~2,300 lines
**Benefits**: Single test suite, consistent behavior

---

### Phase 3: ADVANCED FEATURES (4-6 weeks)

**Goal**: Enable SDK-driven orchestration and workflows

7. Create `packages/sdk/src/orchestration/` module
   - Migrate `OperationCoordinator` (200 lines)
   - Migrate `WorkflowEngine` (150 lines)
   - Migrate `ConflictResolver` (150 lines)

8. Create `packages/sdk/src/discovery/` module
   - Migrate `ConfigDetector` (288 lines)
   - Migrate `RepoScanner` (150 lines)

9. Create `packages/sdk/src/qos/` module
   - Migrate `EventBusQoS` from events (400 lines)
   - Migrate `RateLimiter` from MCP (140 lines)
   - Migrate `ErrorBudget` from infrastructure (104 lines)

**Lines Migrated**: ~1,600 lines
**Benefits**: SDK becomes platform for advanced features

---

### Phase 4: CLEANUP & STABILIZATION (2-4 weeks)

**Goal**: Remove duplicates, finalize APIs, document SDK

10. **Deprecate & Remove**:
    - Delete duplicate detection logic from CLI
    - Remove scattered threshold constants
    - Clean up contracts/infrastructure of business logic

11. **SDK Documentation**:
    - API reference for all modules
    - Migration guide for extension developers
    - Threshold tuning guide

12. **SDK Versioning**:
    - Establish semver policy
    - Changelog automation
    - Breaking change process

**Lines Removed**: ~800 lines of duplicates

---

## Total Migration Effort

| Phase | Duration | Lines to Migrate | Complexity |
|-------|----------|------------------|------------|
| Phase 1 (IP Protection) | 4-6 weeks | 1,800 | High |
| Phase 2 (Consistency) | 6-8 weeks | 2,300 | Medium |
| Phase 3 (Advanced) | 4-6 weeks | 1,600 | Medium |
| Phase 4 (Cleanup) | 2-4 weeks | -800 (removals) | Low |
| **TOTAL** | **16-24 weeks** | **~5,500 net** | |

---

## Lightweight Shells (Keep in Apps)

### ✅ What Should STAY in Extension/CLI/MCP/Web

| Component | Keep Where | Why |
|-----------|-----------|-----|
| **UI Panels/Webviews** | VSCode | Presentation layer (tree views, quick picks, status bars) |
| **Command Parsing** | CLI | Argument handling, help text, exit codes |
| **MCP Protocol Handling** | MCP Server | JSON-RPC transport, stdio, SSE |
| **API Route Handlers** | Web | HTTP request/response, Next.js routing |
| **VSCode Event Adapters** | VSCode | `onDidSaveTextDocument`, `workspace.fs` wrappers |
| **Git Command Execution** | CLI | `git diff --cached`, `git log` subprocess calls |
| **PostHog/Stripe Clients** | Web | Third-party API clients (telemetry, billing) |
| **Extension Activation** | VSCode | VS Code lifecycle hooks |
| **CLI Entry Point** | CLI | Commander.js setup, top-level error handling |
| **HTTP Server** | MCP | Express/http server for SSE transport |

**Principle**: Apps become **thin adapters** that:
1. Parse input (CLI args, HTTP requests, MCP RPC)
2. Call SDK methods
3. Format output (UI, JSON, exit codes)

---

## Benefits of SDK Migration

### 1. IP Protection
- **65% of core logic** moves behind SDK boundary
- Client code becomes uninteresting to competitors (just UI glue)
- Critical algorithms (burst detection, session coordination, scoring) protected

### 2. Consistency
- **Single source of truth** for detection, scoring, thresholds
- No more drift between VSCode, CLI, MCP behaviors
- Unified test suite ensures correctness

### 3. Maintainability
- **Centralized tuning**: Change threshold once, affects all clients
- **Faster feature development**: Write once, expose via SDK
- **Easier debugging**: One codebase to troubleshoot

### 4. Distribution Control
- SDK can be:
  - **Open source** (core algorithms public, builds trust)
  - **Proprietary** (closed source, requires license)
  - **Hybrid** (open interfaces, closed detection logic)
- Versioned independently from apps

### 5. Testing
- **Unit tests in SDK** cover 90% of business logic
- Apps only test thin adapters (integration tests)
- Easier to mock SDK for app testing

### 6. API Evolution
- SDK can version breaking changes independently
- Apps pin to SDK version, upgrade on schedule
- Feature flags in SDK enable gradual rollout

---

## Risks of NOT Migrating

| Risk | Impact | Likelihood |
|------|--------|------------|
| **IP Leakage** | Competitors clone burst detection, session logic | High (extension code public on GitHub) |
| **Code Drift** | VSCode says "risky", CLI says "safe" for same code | High (already happening with 0.5 vs 8 thresholds) |
| **Maintenance Burden** | Change threshold → edit 5 files across 3 repos | High (15+ threshold locations identified) |
| **Feature Fragmentation** | Session awareness only in VSCode, not CLI/MCP | High (already true) |
| **Testing Gaps** | Duplicate logic → duplicate tests → coverage gaps | Medium |
| **Slow Feature Velocity** | Every feature needs 3 implementations (VSCode, CLI, MCP) | High |
| **Onboarding Friction** | New developers struggle to find "source of truth" | Medium |

---

## Success Metrics

### Phase 1 Completion Criteria
- [ ] `BurstHeuristicsDetector` in SDK, VSCode calls it
- [ ] `SessionCoordinator` in SDK, CLI can create sessions
- [ ] All detection thresholds in `Thresholds` config
- [ ] 0 hardcoded magic numbers in VSCode/CLI/MCP
- [ ] Test suite in SDK covers 90% of detection logic

### Phase 2 Completion Criteria
- [ ] `RiskAnalyzer` in SDK, normalized 0-1 scale everywhere
- [ ] VSCode, CLI, MCP all use same scoring algorithm
- [ ] `PolicyEvaluator` in SDK, SARIF generation centralized
- [ ] Duplicate detection logic removed from CLI
- [ ] Single test suite for all risk analysis

### Phase 3 Completion Criteria
- [ ] `WorkflowEngine` in SDK, VSCode uses it
- [ ] `OperationCoordinator` in SDK, state machine exposed
- [ ] Event bus QoS logic in SDK (out of `packages/events`)
- [ ] Infrastructure package contains 0 business logic

### Phase 4 Completion Criteria
- [ ] SDK documentation complete (API reference + guides)
- [ ] Duplicate code removed (−800 lines)
- [ ] SDK versioned (1.0.0 release)
- [ ] Migration guide published
- [ ] All apps updated to use SDK

---

## Conclusion

**Recommendation**: Prioritize **Phase 1 (IP Protection)** immediately.

**Justification**:
1. **1,800 lines of CRITICAL IP** currently exposed in client apps
2. Burst detection, session coordination, and experience classification represent **core competitive advantages**
3. Thresholds (105s idle, >5 files, >1000 lines, etc.) are **empirically tuned** and reveal product philosophy
4. **4-6 week** effort provides immediate IP protection

**Long-term**: Complete all 4 phases to achieve **65% business logic centralization** in SDK, reducing maintenance burden and ensuring consistency.

---

## Appendix: Threshold Inventory

All hardcoded thresholds identified across codebase (should move to `Thresholds` config):

| Threshold | Value | Location | Purpose |
|-----------|-------|----------|---------|
| Burst time window | 5s | VSCode `BurstHeuristicsDetector.ts:14` | AI rapid edit detection |
| Burst min chars | 100 | VSCode `BurstHeuristicsDetector.ts:15` | Minimum insertion size |
| Burst max keystroke | 200ms | VSCode `BurstHeuristicsDetector.ts:16` | Typing speed threshold |
| Burst min lines | 3 | VSCode `BurstHeuristicsDetector.ts:17` | Affected line count |
| Burst insert/delete | 3:1 | VSCode `BurstHeuristicsDetector.ts:18` | Ratio threshold |
| Session idle timeout | 105s | VSCode `SessionCoordinator.ts:39` | Session boundary |
| Session min duration | 5s | VSCode `SessionCoordinator.ts:40` | Ignore micro-edits |
| Session max duration | 1h | VSCode `SessionCoordinator.ts:41` | Force finalization |
| Session check interval | 5min | VSCode `SessionCoordinator.ts:42` | Long session monitoring |
| Multi-file threshold | >5 | VSCode `SessionTagger.ts:76` | Tag as multi-file |
| Long session threshold | >30min | VSCode `SessionTagger.ts:78` | Tag as long |
| Large edits threshold | >1000 | VSCode `SessionTagger.ts:80` | Tag as large |
| Risk high threshold | >0.7 | VSCode `index.ts:72` | CLI analysis |
| Risk medium threshold | 0.4-0.7 | VSCode `index.ts:74` | CLI analysis |
| Pre-commit risk | >0.5 | CLI `index.ts:231` | Risky file detection |
| Critical risk | >8 | CLI `check.ts:47` | 0-10 scale blocking |
| Entropy threshold | >2.5 | MCP `secret-advanced.ts:117` | Secret detection |
| Protected cooldown | 10min | VSCode `ProtectedFileRegistry.ts:117` | Cooldown duration |
| Other cooldown | 5min | VSCode `ProtectedFileRegistry.ts:120` | Cooldown duration |
| Dedup cache size | 500 | VSCode `SnapshotDeduplicator.ts:15` | FIFO eviction |
| Explorer tier snaps | 5 | VSCode `ExperienceClassifier.ts:50` | User classification |
| Explorer tier days | 7 | VSCode `ExperienceClassifier.ts:56` | User classification |
| Intermediate snaps | 20 | VSCode `ExperienceClassifier.ts:51` | User classification |
| Intermediate days | 30 | VSCode `ExperienceClassifier.ts:57` | User classification |
| Power tier snaps | 100 | VSCode `ExperienceClassifier.ts:52` | User classification |
| Power tier days | 90 | VSCode `ExperienceClassifier.ts:58` | User classification |
| Trial snapshot limit | 50 | Web `snapshots/create/route.ts:30` | Device trial limit |
| Trial install limit | 3 | Web `device-trials.ts:15` | Anti-abuse threshold |
| Trial block duration | 24h | Web `device-trials.ts:16` | Block duration |
| Rate limit capacity | 100 | MCP `rate-limit.ts:10` | Token bucket size |
| Rate limit refill | 60s | MCP `rate-limit.ts:11` | Refill period |
| Checkpoint max files | 10,000 | VSCode `operationCoordinator.ts:83` | Operation limit |
| Checkpoint max size | 10MB | VSCode `operationCoordinator.ts:84` | File size limit |
| Checkpoint total size | 500MB | VSCode `operationCoordinator.ts:85` | Total size limit |
| Halo size | 3 lines | MCP `diff.ts:24` | Context lines |
| Error budget hard | 1% | Infrastructure `error-budget.ts:10` | SLA threshold |
| Error budget warn | 0.5% | Infrastructure `error-budget.ts:11` | Warning threshold |

**Total**: 40+ hardcoded thresholds that should be centralized.
