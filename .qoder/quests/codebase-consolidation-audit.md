# Codebase Consolidation Audit - SnapBack Engine Migration

## Document Metadata

- **Status**: Design
- **Target**: Reduce codebase from ~35,000 LOC to ~20,000 LOC (43% reduction)
- **Context**: Engine migration is 90% complete (signals, validators, actions done)
- **Remaining**: Transports layer (Week 5 work)
- **Deadline**: Demo approaching - complexity reduction critical
- **Privacy Constraint**: Privacy-first architecture must be maintained
- **Performance Budget**: <100ms save handler, <2MB bundle size

## Executive Overview

This audit identifies consolidation opportunities as the SnapBack engine migration nears completion. The new engine architecture (packages/engine/) has consolidated 12 packages (~15,000 LOC) into a unified system (~4,700 LOC). This document provides systematic methodology to:

1. Identify duplicate logic between engine and legacy packages
2. Map retirement candidates for post-migration cleanup
3. Eliminate low-value archive directories
4. Ensure safe deletion without breaking production

## Audit Methodology Framework

### Phase 1: Duplicate Logic Identification

#### Objective
Locate business logic duplicated between the new engine and legacy packages, prioritizing high-LOC savings.

#### Methodology

**Step 1: Inventory Engine Capabilities**

Map what the engine currently provides:

| Engine Component | Location | Functionality | LOC |
|-----------------|----------|---------------|-----|
| Risk Scoring | `engine/signals/risk-score.ts` | 0-10 risk calculation | 256 |
| Threat Detection | `engine/signals/threats.ts` | Security pattern matching | ~100 |
| Complexity Analysis | `engine/signals/complexity.ts` | AST-based complexity | ~120 |
| Burst Detection | `engine/signals/burst.ts` | AI paste detection | ~110 |
| Velocity Tracking | `engine/signals/velocity.ts` | Change rate analysis | ~80 |
| Cycle Detection | `engine/signals/cycles.ts` | Circular dependency check | ~110 |
| Security Validation | `engine/validators/security.ts` | Security gate checks | ~150 |
| Pattern Validation | `engine/validators/patterns.ts` | Code pattern linting | ~90 |
| Type Validation | `engine/validators/types.ts` | TypeScript checking | ~120 |
| Snapshot Creation | `engine/actions/snapshot.ts` | Blob storage write | ~80 |
| Snapshot Restoration | `engine/actions/restore.ts` | Blob storage read | ~90 |
| Notification | `engine/actions/notify.ts` | User notification | ~100 |
| Storage Runtime | `engine/runtime/storage.ts` | Blob CRUD operations | ~400 |
| Event System | `engine/runtime/events.ts` | 15-event schema | ~248 |
| Orchestrator | `engine/runtime/orchestrator.ts` | Script coordination | ~300 |

**Total Engine LOC**: ~2,354 (core functionality)

**Step 2: Scan Legacy Packages for Duplicates**

Search patterns to execute:

```
Scan Target: packages/core/src/
Focus: Risk analysis, threat detection, session management
Key Files:
- risk-analyzer.ts (508 LOC)
- threat-detection.ts (~100 LOC)
- guardian.ts (~400 LOC)
- git-integration.ts (~250 LOC)
```

```
Scan Target: packages/sdk/src/storage/
Focus: Storage implementations
Key Files:
- StorageBroker.ts (26.4 KB, ~800 LOC)
- BlobStore.ts (5.3 KB, ~180 LOC)
- BlobStore.fs.ts (9.1 KB, ~300 LOC)
- LocalStorage.ts (9.3 KB, ~300 LOC)
- MemoryStorage.ts (2.5 KB, ~80 LOC)
```

```
Scan Target: apps/vscode/src/storage/
Focus: VS Code-specific storage duplication
Key Files:
- BlobStore.ts (~200 LOC)
- SnapshotStore.ts (~300 LOC)
- StorageManager.ts (~400 LOC)
```

```
Scan Target: packages/events/src/
Focus: Event system duplication
Key Files:
- EventBusEventEmitter2.ts (~250 LOC)
```

```
Scan Target: packages/analytics/src/
Focus: Event tracking duplication
Key Files:
- events.ts (~200 LOC with 75+ event types)
```

**Step 3: Comparison Matrix**

For each duplicate found, document:

| Legacy File | Legacy LOC | Engine Equivalent | Engine LOC | LOC Savings | Migration Risk | Priority |
|-------------|-----------|-------------------|-----------|-------------|----------------|----------|
| `packages/core/src/risk-analyzer.ts` | 508 | `engine/signals/risk-score.ts` | 256 | 252 | Low - engine tested | High |
| `packages/core/src/threat-detection.ts` | ~100 | `engine/signals/threats.ts` | ~100 | 0 (merge) | Low | Medium |
| `packages/sdk/src/storage/StorageBroker.ts` | ~800 | `engine/runtime/storage.ts` | ~400 | 400 | Medium - API changes | High |
| `apps/vscode/src/storage/BlobStore.ts` | ~200 | `engine/runtime/storage.ts` | (shared) | 200 | Medium - VS Code deps | High |
| `apps/vscode/src/storage/SnapshotStore.ts` | ~300 | `engine/runtime/storage.ts` | (shared) | 300 | Medium | High |
| `packages/events/src/EventBusEventEmitter2.ts` | ~250 | `engine/runtime/events.ts` | ~248 | 2 (consolidate) | Low | Medium |

**Step 4: Dependency Analysis**

For each duplicate, identify importers:

```bash
# Command pattern for dependency check
grep -r "import.*from.*packages/core/src/risk-analyzer" . --include="*.ts"
```

Expected Output Format:

```
Duplicate: packages/core/src/risk-analyzer.ts
Importers:
- apps/mcp-server/src/utils/risk-analyzer.ts
- apps/api/modules/risk/procedures/analyze-risk.ts
- packages/core/src/guardian.ts (internal)

Action: Replace imports with @snapback/engine after migration
```

#### Expected Findings

**High-Priority Duplicates** (estimate):

- Risk analysis logic: ~500 LOC savings
- Storage implementations: ~1,200 LOC savings
- Event systems: ~200 LOC savings (consolidation)
- Detection logic: ~300 LOC savings

**Total Estimated Savings**: ~2,200 LOC from duplicate removal

### Phase 2: Event System Consolidation

#### Objective
Reduce event sprawl from 127+ events across 3 systems to 15 focused events.

#### Current State Analysis

**Event System 1**: packages/contracts/src/telemetry/events.ts

Event count: 24+ telemetry events

Sample events:
- ExtensionActivatedEvent
- CommandExecutionEvent
- SnapshotCreatedEvent
- RiskDetectedEvent
- ViewActivatedEvent
- NotificationShownEvent
- FeatureUsedEvent
- ErrorEvent
- WalkthroughStepCompletedEvent
- OnboardingProtectionAssignedEvent
- SignatureVerificationSuccessEvent

**Event System 2**: packages/analytics/src/events.ts

Event count: 75+ analytics events (AnalyticsEvents object)

**Event System 3**: apps/web/modules/analytics/events.ts

Event count: ~20 web-specific events

**Total Legacy Events**: 127+ events

**Engine Event System**: packages/engine/src/runtime/events.ts

Event count: 15 events

Categories:
- Session Events (4): started, ended, health_changed
- File Events (1): changed
- Snapshot Events (2): created, restored
- Risk Events (5): burst.detected, ai.detected, risk.analyzed, validation.passed, validation.failed
- Protection Events (1): protection.changed
- Error Events (1): error.occurred
- Auth Events (1): auth.completed
- Feedback Events (1): feedback.collected

#### Consolidation Mapping

**Methodology**: Map legacy events to engine events or mark for deletion

| Legacy Event | Current Location | Engine Equivalent | Action | Rationale |
|--------------|-----------------|-------------------|--------|-----------|
| ExtensionActivatedEvent | contracts/telemetry | session.started | MERGE | Session lifecycle |
| SnapshotCreatedEvent | contracts/telemetry | snapshot.created | MAP | Direct match |
| RiskDetectedEvent | contracts/telemetry | risk.analyzed | MAP | Direct match |
| CommandExecutionEvent | contracts/telemetry | (none) | DELETE | Over-tracking |
| ViewActivatedEvent | contracts/telemetry | (none) | DELETE | UI noise |
| NotificationShownEvent | contracts/telemetry | (none) | DELETE | Low value |
| FeatureUsedEvent | contracts/telemetry | (varies) | CONSOLIDATE | Merge into domain events |
| ErrorEvent | contracts/telemetry | error.occurred | MAP | Direct match |
| WalkthroughStepCompletedEvent | contracts/telemetry | (none) | DELETE | Onboarding only |
| OnboardingProtectionAssignedEvent | contracts/telemetry | protection.changed | MERGE | Protection tracking |

**Analytics Event Consolidation**:

75+ analytics events should be filtered through engine's 15-event schema. Most web-specific tracking events (page views, button clicks) remain in web app but don't propagate to engine.

**Action Items**:

1. Create event mapping table (legacy → engine)
2. Identify critical analytics events that need preservation
3. Add migration layer for gradual transition
4. Update PostHog integration to use engine events
5. Delete packages/contracts/src/telemetry/ after migration

**Expected Outcome**: 127 → 15 events (88% reduction)

### Phase 3: Archive Directory Cleanup

#### Objective
Remove low-value directories containing outdated documentation, planning artifacts, and one-time analysis reports.

#### Scan Targets

**Directory**: ai_dev_utils/

Purpose: AI agent development documentation and workflow guides

Size Analysis:
- Total files: 100+ markdown files
- Total size: ~5 MB
- Subdirectories: archived-outdated-docs/, evidence/, feedback/, gates/, onboarding_and_tree_view/, patterns/, phases/, resources/, scripts/, state/, testing_docs/, v1_rollout/, v1_update/

Content Assessment:
- Archived docs already marked as outdated
- Phase-based planning documents (Phase 1-4)
- TDD workflow guides
- V1 rollout checklists
- State tracking files from agent development

Production Dependency Check:
```bash
# Verify no runtime code imports from ai_dev_utils/
grep -r "import.*ai_dev_utils" apps/ packages/ --include="*.ts"
# Expected: No matches
```

**Recommendation**: ARCHIVE EXTERNALLY then DELETE

Justification:
- Historical value for post-mortem analysis
- Not required for production runtime
- Can be preserved in git history
- Saves ~5 MB in working tree

---

**Directory**: builder_pack/

Purpose: Repository analysis scripts and initial specification documents

Files:
- snapback-technical-spec.md (51.0 KB)
- snapback-mcp-server-spec.md (30.4 KB)
- code-review-standards.md (56.4 KB)
- snapback-implementation-roadmap.md (14.8 KB)
- test-infrastructure-patterns.md (22.6 KB)
- analyze-snapback-repo.sh (shell script)

Content Assessment:
- One-time setup documentation
- Planning artifacts from initial architecture
- Shell scripts for repository analysis

Production Dependency Check:
```bash
grep -r "import.*builder_pack" apps/ packages/ --include="*.ts"
# Expected: No matches
```

**Recommendation**: KEEP code-review-standards.md in docs/standards/, DELETE rest

Justification:
- Technical specs superseded by actual implementation
- Roadmap completed
- Analysis scripts no longer needed
- Code review standards have ongoing value

---

**Directory**: claudedocs/

Purpose: Claude AI-generated architecture analysis and design documents

Size: ~30 files, ~600 KB total

Files:
- sdk-architecture-*.md (multiple versions)
- storage-layer-architecture.md (78.8 KB)
- deep-architecture-review-10x.md (42.3 KB)
- REFACTOR_PLAN_CORRECTED.md (141.5 KB)
- Various Storybook configs

Content Assessment:
- Point-in-time architecture snapshots
- Refactor planning documents (now implemented)
- Storybook experiment configurations
- CI/CD comparisons

**Recommendation**: ARCHIVE EXTERNALLY then DELETE

Justification:
- Architecture now reflected in actual code
- Refactor plans executed
- Storybook configs duplicated in actual config files
- No runtime dependencies

---

**Directory**: docs_to_review/

Purpose: Documents awaiting review, integration gaps, roadmaps

Subdirectories: delete_me/, demo_prep/, final_test_framework/, journey_pax/, keep_me/

Content Assessment:
- "delete_me" folder already marked for deletion (27 items)
- Integration gap analysis (now resolved)
- SDK investigation reports (phase complete)
- Test coverage maps

Production Dependency Check:
```bash
grep -r "import.*docs_to_review" apps/ packages/ --include="*.ts"
# Expected: No matches
```

**Recommendation**: Triage keep_me/, DELETE rest

Justification:
- Explicitly marked deletion candidates exist
- Integration gaps remediated
- Phase-based work completed
- Keep valuable insights from keep_me/ folder

---

**Directory**: config-templates/

Files:
- fly-api.toml
- fly-mcp.toml
- vercel-docs.json
- vercel-web.json

Assessment: Configuration templates for deployment

**Recommendation**: KEEP

Justification:
- Required for deployment workflows
- Minimal size (4 files)
- Active production use

---

**Directory**: examples/

Files:
- sdk-integration.js (single example file)

Assessment: SDK integration example

**Recommendation**: MOVE to apps/docs/examples/, DELETE directory

Justification:
- Examples should live with documentation
- Single file doesn't warrant directory

---

**Directory**: extensions/

Files:
- DEPENDENCY_GRAPH.md
- FEATURE_SCORECARDS.md
- INTEGRATION_STATUS.md

Assessment: Extension planning documents

Production Dependency: None

**Recommendation**: DELETE (archive in git history)

Justification:
- Planning artifacts
- Information captured in actual code
- Not runtime dependencies

#### Cleanup Impact Summary

| Directory | Files | Size | Action | LOC Impact |
|-----------|-------|------|--------|-----------|
| ai_dev_utils/ | ~100 | ~5 MB | ARCHIVE + DELETE | 0 (docs) |
| builder_pack/ | ~15 | ~300 KB | KEEP 1 file, DELETE rest | 0 (docs) |
| claudedocs/ | ~30 | ~600 KB | ARCHIVE + DELETE | 0 (docs) |
| docs_to_review/ | ~50 | ~400 KB | Triage + DELETE | 0 (docs) |
| extensions/ | 3 | ~50 KB | DELETE | 0 (docs) |
| examples/ | 1 | ~5 KB | MOVE then DELETE dir | ~100 |

**Total Cleanup**: ~6.5 MB disk space, ~100 LOC (example code)

**Cleanup Commands**:

```bash
# Step 1: Archive important content externally
tar -czf snapback-archive-$(date +%Y%m%d).tar.gz ai_dev_utils/ claudedocs/ docs_to_review/

# Step 2: Preserve code review standards
mv builder_pack/code-review-standards.md docs/standards/

# Step 3: Move example
mv examples/sdk-integration.js apps/docs/examples/

# Step 4: Delete directories
rm -rf ai_dev_utils/ builder_pack/ claudedocs/ docs_to_review/ extensions/ examples/

# Step 5: Verify build still works
pnpm build
pnpm test
```

### Phase 4: VS Code Extension Thinning

#### Objective
Reduce VS Code extension to thin UI layer that delegates business logic to engine.

#### Current Structure Analysis

**apps/vscode/src/** directory size: ~60 directories, ~200 files

**Business Logic Directories** (candidates for engine delegation):

| Directory | Purpose | Files | Est. LOC | Engine Equivalent | Retention Need |
|-----------|---------|-------|----------|-------------------|----------------|
| `src/engine/` | Legacy engine logic | ~5 | ~500 | `@snapback/engine` | DELETE |
| `src/detection/` | AI detection, burst detection | ~8 | ~800 | `engine/signals/ai-detection.ts`, `burst.ts` | DELETE |
| `src/rules/` | Decision rules | ~5 | ~400 | `engine/runtime/orchestrator.ts` | DELETE |
| `src/session/` | Session tracking | ~3 | ~300 | `engine/runtime/monitor.ts` | DELETE |
| `src/protection/` | Protection level logic | ~5 | ~400 | Partial - keep loader | THIN |

**VS Code-Specific Logic** (must remain):

| Directory | Purpose | Retention | Rationale |
|-----------|---------|-----------|-----------|
| `src/commands/` | Command palette handlers | KEEP | VS Code API integration |
| `src/views/` | Tree views, webviews | KEEP | VS Code UI components |
| `src/ui/` | Status bar, notifications | KEEP | VS Code-specific UI |
| `src/activation/` | Extension lifecycle | KEEP | VS Code activation API |
| `src/auth/` | OAuth providers | KEEP | VS Code authentication API |
| `src/config/` | Configuration management | KEEP | VS Code settings API |
| `src/bridges/` | Engine integration layer | KEEP | Transport logic |
| `src/adapters/` | VS Code API adapters | KEEP | Protocol translation |

#### Thinning Strategy

**Step 1: Identify Pure Business Logic**

Search pattern for files that contain business logic without VS Code dependencies:

```bash
# Find files that import vscode API
grep -l "import.*vscode" apps/vscode/src/**/*.ts > vscode-dependent.txt

# Find files in business logic directories
find apps/vscode/src/{engine,detection,rules,session,protection} -name "*.ts" > business-logic.txt

# Find files that are business logic but DON'T use vscode API
comm -23 <(sort business-logic.txt) <(sort vscode-dependent.txt) > pure-business-logic.txt
```

**Step 2: Map to Engine Components**

For each file in pure-business-logic.txt:

| VS Code File | LOC | Engine Component | Migration Complexity |
|--------------|-----|------------------|---------------------|
| `src/detection/burstDetector.ts` | ~200 | `engine/signals/burst.ts` | Low - direct map |
| `src/detection/aiDetector.ts` | ~250 | `engine/signals/ai-detection.ts` | Low - direct map |
| `src/rules/decisionEngine.ts` | ~300 | `engine/runtime/orchestrator.ts` | Medium - decision flow |
| `src/session/sessionTracker.ts` | ~200 | `engine/runtime/monitor.ts` | Low - session state |

**Step 3: Create Bridge Pattern**

Instead of direct deletion, create thin bridge:

```typescript
// Before (in apps/vscode/src/detection/burstDetector.ts):
export class BurstDetector {
  async detect(changes: FileChange[]): Promise<BurstResult> {
    // 200 LOC of business logic
  }
}

// After (thin bridge):
import { orchestrator } from '@snapback/engine';

export class BurstDetector {
  async detect(changes: FileChange[]): Promise<BurstResult> {
    const result = await orchestrator.runSignal('burst', { files: changes });
    return this.adaptEngineResult(result);
  }
  
  private adaptEngineResult(engineResult: SignalOutput): BurstResult {
    // 10-20 LOC of result adaptation
  }
}
```

**Step 4: Estimated LOC Reduction**

| Category | Current LOC | After Thinning | Savings |
|----------|-------------|----------------|---------|
| Business logic deleted | ~2,000 | 0 | 2,000 |
| Bridge adapters added | 0 | ~300 | -300 |
| Net savings | - | - | 1,700 |

#### VS Code Consolidation Checklist

For each business logic file:

- [ ] Verify engine provides equivalent functionality
- [ ] Write integration test comparing old vs new output
- [ ] Create thin bridge adapter if needed
- [ ] Update imports across extension
- [ ] Delete original business logic file
- [ ] Verify extension still activates and functions
- [ ] Check bundle size reduction

**Target**: Reduce apps/vscode/ from ~15,000 LOC to ~13,000 LOC (13% reduction)

### Phase 5: MCP Server Thinning

#### Objective
Reduce MCP server to thin transport layer that delegates to engine orchestrator.

#### Current Architecture

**apps/mcp-server/src/index.ts** - Main server file (~600 LOC)

Current tools implementation pattern:

```typescript
// Tool: snapback.analyze_risk
{
  name: "snapback.analyze_risk",
  handler: async (params) => {
    // 50-100 LOC of risk analysis logic
    const riskAnalyzer = new RiskAnalyzer();
    const result = await riskAnalyzer.analyzeFileChanges(params.changes);
    return result;
  }
}
```

#### Thinning Strategy

**Step 1: Identify Business Logic in Tools**

Current MCP tools with embedded business logic:

| Tool Name | Current LOC | Business Logic | Engine Equivalent |
|-----------|------------|----------------|-------------------|
| snapback.analyze_risk | ~100 | Risk calculation | `orchestrator.runSignal('risk-score')` |
| snapback.check_dependencies | ~80 | Dependency analysis | `orchestrator.runSignal('cycles')` |
| snapback.create_checkpoint | ~120 | Snapshot creation | `orchestrator.runAction('snapshot')` |
| snapback.list_checkpoints | ~60 | Storage query | `storage.listSnapshots()` |
| snapback.restore_checkpoint | ~100 | Restoration logic | `orchestrator.runAction('restore')` |

**Total Business Logic in MCP**: ~460 LOC

**Step 2: Thin Transport Pattern**

Replace business logic with engine delegation:

```typescript
// After: Thin transport layer
{
  name: "snapback.analyze_risk",
  handler: async (params) => {
    // Validate MCP protocol input (10 LOC)
    const validatedParams = validateMCPInput(params);
    
    // Delegate to engine (1 LOC)
    const result = await orchestrator.runSignal('risk-score', {
      files: validatedParams.changes,
      workspace: validatedParams.workspace,
    });
    
    // Adapt engine output to MCP protocol (10 LOC)
    return adaptToMCPResponse(result);
  }
}
```

**New tool handler**: ~25 LOC (vs ~100 LOC before)

**Step 3: Protocol Responsibilities**

MCP server must retain:

| Responsibility | LOC | Rationale |
|----------------|-----|-----------|
| MCP protocol handling | ~100 | Transport-specific |
| Authentication/authorization | ~80 | Security layer |
| Input validation | ~60 | Protocol safety |
| Output adaptation | ~100 | Protocol formatting |
| Error translation | ~40 | MCP error codes |

**Total Transport Logic**: ~380 LOC (must keep)

#### Consolidation Impact

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| Business logic | ~460 | 0 | 460 |
| Transport layer | ~200 | ~380 | -180 |
| Protocol handling | ~100 | ~100 | 0 |
| Net reduction | ~760 | ~480 | 280 |

**Target**: Reduce apps/mcp-server/ from ~2,000 LOC to ~1,700 LOC (15% reduction)

### Phase 6: Package Retirement Plan

#### Objective
Create dependency-aware deletion plan for packages fully replaced by engine.

#### Package Analysis

**packages/core/** - Core business logic (22 files)

Key exports:
- RiskAnalyzer class
- GitIntegration class
- detectThreats function
- Guardian class (dependency analyzer)

Current importers analysis:

```bash
grep -r "from '@snapback/core'" apps/ packages/ --include="*.ts" | wc -l
# Expected: ~50 import statements
```

Engine replacements:

| Core Export | Engine Replacement | Migration Path |
|-------------|-------------------|----------------|
| RiskAnalyzer | `orchestrator.runSignal('risk-score')` | Update imports to `@snapback/engine` |
| detectThreats | `orchestrator.runSignal('threats')` | Update imports |
| GitIntegration | Keep in core (git operations not in engine) | No change |
| Guardian | `orchestrator.runSignal('complexity')` | Update imports |

**Migration Strategy**:

1. Identify which core exports have engine equivalents
2. Create compatibility layer in engine package
3. Update all imports from @snapback/core to @snapback/engine
4. Delete files with engine equivalents
5. Keep git-integration.ts (specialized utility)

**Estimated Savings**: 2,400 LOC (keeping git integration ~250 LOC)

---

**packages/events/** - Event bus implementation (13 files)

Key exports:
- SnapBackEventBusEventEmitter2 class

Engine replacement:
- `engine/runtime/events.ts` - eventBus singleton

Migration:

| Event Package | Engine Equivalent | Action |
|---------------|-------------------|--------|
| EventBusEventEmitter2.ts | `engine/runtime/events.ts` | REPLACE |
| Type definitions | `engine/runtime/events.ts` (SnapBackEvents) | MERGE |

**Estimated Savings**: 400 LOC

---

**packages/sdk/src/storage/** - Storage implementations (9 files)

Key exports:
- StorageBroker
- BlobStore
- LocalStorage
- MemoryStorage
- StorageAdapter interface

Engine replacement:
- `engine/runtime/storage.ts` - Storage class

Migration complexity: **MEDIUM**

Reason: SDK storage is more feature-rich (adapters, error handling). Engine storage is simplified.

**Strategy**: Deprecation path

1. Mark @snapback/sdk/storage as deprecated
2. Add compatibility layer in engine
3. Gradually migrate consumers
4. Delete after 2 releases

**Estimated Savings**: 800 LOC (after full migration)

---

**packages/policy-engine/** - Policy decision engine (10 files)

Function: Determines whether to block/warn/watch based on risk scores

Engine replacement:
- `engine/runtime/orchestrator.ts` - Decision logic embedded

Current state: Minimal usage (experimental feature)

**Action**: DELETE immediately

**Estimated Savings**: 500 LOC

#### Package Deletion Order

Safe deletion sequence (respecting dependencies):

```
Phase 1 (Immediate - Low Risk):
1. packages/policy-engine/     (500 LOC)
2. packages/events/            (400 LOC)

Phase 2 (After Transport Migration - Week 5):
3. packages/core/              (2,400 LOC, keep git-integration)
4. apps/vscode/src/engine/     (500 LOC)
5. apps/vscode/src/detection/  (800 LOC)
6. apps/vscode/src/rules/      (400 LOC)

Phase 3 (Gradual - Low Priority):
7. packages/sdk/src/storage/   (800 LOC, after deprecation period)

Total Savings: 5,800 LOC
```

#### Package Retirement Checklist

For each package marked for deletion:

**Pre-Deletion Verification**:

- [ ] Run import scanner: `grep -r "from '@snapback/PACKAGE'" apps/ packages/`
- [ ] Verify test coverage in engine for replaced functionality
- [ ] Check for dynamic imports: `grep -r "import('.*@snapback/PACKAGE')" .`
- [ ] Review package.json dependencies across workspace
- [ ] Confirm engine replacement provides equivalent API surface

**Migration Execution**:

- [ ] Create migration guide document
- [ ] Update all import statements
- [ ] Run full test suite: `pnpm test`
- [ ] Verify type checking: `pnpm tsc --noEmit`
- [ ] Check bundle size delta
- [ ] Delete package directory
- [ ] Remove from pnpm-workspace.yaml
- [ ] Update root package.json dependencies
- [ ] Update Turborepo pipeline if needed

**Post-Deletion Validation**:

- [ ] Build succeeds: `pnpm build`
- [ ] All tests pass: `pnpm test`
- [ ] Extension activates in VS Code
- [ ] MCP server starts without errors
- [ ] API server responds to requests
- [ ] Bundle size reduced

### Phase 7: Safety Verification Framework

#### Objective
Ensure safe deletion without breaking production systems.

#### Verification Matrix

For each file/directory proposed for deletion:

| Check Type | Procedure | Tool | Acceptance Criteria |
|-----------|-----------|------|---------------------|
| Static Import Scan | Search all TS files for imports | grep/ripgrep | Zero matches |
| Dynamic Import Scan | Search for require() and import() | grep | Zero matches |
| Test Coverage Verification | Check engine tests cover functionality | Vitest | >80% coverage |
| Runtime Dependency Check | Search package.json files | jq + grep | Zero references |
| Build Verification | Full monorepo build | Turborepo | Exit code 0 |
| Type Check | TypeScript compilation | tsc | Zero errors |
| Test Suite | All unit + integration tests | Vitest + Playwright | 100% pass |
| Bundle Size Check | Measure final bundle | Turbo build | Within budget |

#### Safety Procedures

**Procedure 1: Import Dependency Analysis**

```bash
#!/bin/bash
# scan-dependencies.sh

TARGET_PATH=$1  # e.g., "packages/core"

echo "Scanning for imports from ${TARGET_PATH}..."

# Static imports
echo "=== Static Imports ==="
grep -r "from ['\"]\@snapback/${TARGET_PATH}" apps/ packages/ --include="*.ts" --include="*.tsx"

# Dynamic imports
echo "=== Dynamic Imports ==="
grep -r "import(['\"].*${TARGET_PATH}" apps/ packages/ --include="*.ts" --include="*.tsx"

# Package.json dependencies
echo "=== Package Dependencies ==="
find . -name "package.json" -exec grep -l "@snapback/${TARGET_PATH}" {} \;

exit 0
```

**Procedure 2: Engine Test Coverage Verification**

For each legacy function being replaced:

```typescript
// Example test structure
describe('Engine Replacement Verification', () => {
  it('should match legacy risk analyzer output', async () => {
    const testInput = {
      files: [
        { path: 'src/auth.ts', content: '...', lineCount: 100 }
      ]
    };
    
    // Legacy implementation
    const legacyAnalyzer = new RiskAnalyzer();
    const legacyResult = await legacyAnalyzer.analyzeFileChanges(testInput.files);
    
    // Engine implementation
    const engineResult = await orchestrator.runSignal('risk-score', testInput);
    
    // Verify equivalence (allow 5% variance)
    expect(Math.abs(legacyResult.score - engineResult.value)).toBeLessThan(0.5);
    expect(legacyResult.factors.length).toBeGreaterThan(0);
    expect(engineResult.metadata.factors).toBeDefined();
  });
});
```

**Procedure 3: Gradual Migration Pattern**

For high-risk deletions, use feature flag:

```typescript
// config/feature-flags.ts
export const flags = {
  useEngineRiskAnalysis: process.env.USE_ENGINE_RISK_ANALYSIS === 'true',
};

// Usage site
import { flags } from './config/feature-flags';

async function analyzeRisk(files: FileChange[]) {
  if (flags.useEngineRiskAnalysis) {
    return await orchestrator.runSignal('risk-score', { files });
  } else {
    const legacyAnalyzer = new RiskAnalyzer();
    return await legacyAnalyzer.analyzeFileChanges(files);
  }
}
```

**Rollout Steps**:

1. Deploy with feature flag OFF (legacy path)
2. Enable for internal testing (10% traffic)
3. Monitor error rates and performance
4. Gradually increase to 50%, 100%
5. Delete legacy code after 2 weeks at 100%

#### Rollback Plan

If deletion causes issues:

**Immediate Rollback**:

```bash
# Restore from git
git revert HEAD~1

# Rebuild
pnpm install
pnpm build

# Verify
pnpm test
```

**Partial Rollback**:

```bash
# Cherry-pick specific file restoration
git checkout HEAD~1 -- packages/core/src/risk-analyzer.ts

# Update imports
# ... manual fix imports ...

pnpm build
pnpm test
```

### Phase 8: Execution Roadmap

#### Week-by-Week Plan

**Week 1: Audit & Mapping**

Deliverables:
- Complete duplicate function inventory
- Event consolidation mapping table
- Archive directory triage list
- Safety verification scripts

Tasks:
- Run all scan procedures from Phase 1-3
- Generate comparison matrices
- Document all import dependencies
- Create migration guides

**Week 2: Archive Cleanup**

Deliverables:
- Compressed archive of historical documents
- Cleaned working tree (6.5 MB savings)

Tasks:
- Archive ai_dev_utils/, claudedocs/, docs_to_review/
- Move valuable content to permanent locations
- Delete low-value directories
- Verify build still works

**Week 3: Event System Consolidation**

Deliverables:
- Event migration layer
- Updated PostHog integration
- Deleted legacy event definitions

Tasks:
- Create legacy → engine event mapping
- Add compatibility shims
- Update all event emitters
- Delete packages/contracts/src/telemetry/
- Verify analytics still flowing

**Week 4: Package Retirement (Phase 1)**

Deliverables:
- Deleted packages/policy-engine/
- Deleted packages/events/
- Migration documentation

Tasks:
- Run safety verification for both packages
- Update imports to engine equivalents
- Delete package directories
- Update workspace configuration
- Full test suite validation

**Week 5: Transport Layer Completion**

Deliverables:
- Completed engine transports (MCP, CLI, HTTP)
- Thinned MCP server
- Thinned VS Code extension

Tasks:
- Implement engine/transports/mcp.ts
- Implement engine/transports/cli.ts
- Replace MCP tool logic with engine delegation
- Replace VS Code detection logic with engine signals
- Integration testing

**Week 6: Final Consolidation**

Deliverables:
- Deleted packages/core/ (partial)
- Deleted apps/vscode/src/{engine,detection,rules,session}/
- Final bundle size verification
- Updated documentation

Tasks:
- Complete remaining package deletions
- Final safety verification sweep
- Bundle size measurements
- Performance benchmarking
- Update README and migration guides

## Expected Outcomes

### LOC Reduction Summary

| Phase | Target | Estimated Savings |
|-------|--------|------------------|
| Duplicate Logic Removal | packages/core, sdk/storage | 2,200 LOC |
| Event Consolidation | contracts/telemetry, analytics | 200 LOC |
| Archive Cleanup | ai_dev_utils, claudedocs | 100 LOC (examples) |
| VS Code Thinning | apps/vscode/src/ | 1,700 LOC |
| MCP Thinning | apps/mcp-server/ | 280 LOC |
| Package Retirement | core, events, policy-engine, sdk/storage | 5,800 LOC |
| **Total** | - | **10,280 LOC** |

**Additional LOC Reduction from Completed Engine Work**: ~4,700 LOC (already done)

**Grand Total Reduction**: ~15,000 LOC

**Final Codebase Size**: 35,000 - 15,000 = **20,000 LOC** (target achieved)

### Complexity Reduction

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Packages | 18 | 13 | 28% fewer |
| Event Types | 127+ | 15 | 88% fewer |
| Storage Implementations | 11+ | 1 | 91% fewer |
| Risk Analysis Implementations | 3 | 1 | 67% fewer |
| Archive Directories | 5 | 0 | 100% reduction |

### Bundle Size Impact

| Application | Current | Target | Savings |
|------------|---------|--------|---------|
| VS Code Extension | ~3.5 MB | <2 MB | 43% |
| MCP Server | ~1.2 MB | <1 MB | 17% |
| Web App | ~800 KB | <700 KB | 13% |

### Performance Impact

| Operation | Current | Target | Improvement |
|-----------|---------|--------|-------------|
| Save Handler | ~150ms | <100ms | 33% faster |
| Risk Analysis | ~80ms | <50ms | 38% faster |
| Snapshot Creation | ~200ms | <150ms | 25% faster |
| Extension Activation | ~2s | <1.5s | 25% faster |

## Risk Assessment

### High-Risk Areas

**Risk 1**: Breaking VS Code extension functionality

Mitigation:
- Extensive integration testing before deletion
- Feature flag rollout
- Rollback plan prepared
- Beta channel testing with subset of users

**Risk 2**: Storage data incompatibility

Mitigation:
- Engine storage maintains blob format compatibility
- Migration tests with production data snapshots
- Gradual rollout with dual-write period
- Data backup before migration

**Risk 3**: Event tracking gaps

Mitigation:
- Event mapping validation
- PostHog dashboard monitoring during migration
- Keep legacy event collection for 2 weeks
- Compare event volumes before/after

### Medium-Risk Areas

**Risk 4**: Import dependency discovery failures

Mitigation:
- Comprehensive grep/ripgrep scans
- TypeScript compilation verification
- Runtime import monitoring
- Two-phase deletion (deprecate → delete)

**Risk 5**: Performance regression

Mitigation:
- Benchmark suite before/after
- Production monitoring dashboards
- Load testing with engine
- Performance budget enforcement

## Validation Criteria

Migration is complete and successful when:

### Functional Validation

- [ ] All tests pass (unit, integration, E2E)
- [ ] VS Code extension activates without errors
- [ ] MCP server responds to all tool calls
- [ ] API server handles all endpoints
- [ ] Web app loads and functions correctly
- [ ] Risk analysis scores match legacy within 5%
- [ ] Snapshot creation/restoration works
- [ ] Event tracking flows to PostHog

### Performance Validation

- [ ] Save handler <100ms (95th percentile)
- [ ] Extension activation <1.5s
- [ ] Bundle sizes within targets
- [ ] Memory usage unchanged or improved
- [ ] CPU usage unchanged or improved

### Code Quality Validation

- [ ] Zero TypeScript errors
- [ ] Zero Biome linting errors
- [ ] Test coverage >80% for engine
- [ ] No circular dependencies
- [ ] No duplicate implementations found

### Operational Validation

- [ ] Build time <5 minutes
- [ ] CI/CD pipelines green
- [ ] Docker images build successfully
- [ ] Deployment succeeds to staging
- [ ] Monitoring dashboards show healthy metrics
- [ ] Error rates within baseline

## Appendix: Command Reference

### Dependency Scanning

```bash
# Find all imports of a package
grep -r "from '@snapback/PACKAGE'" apps/ packages/ --include="*.ts"

# Find dynamic imports
grep -r "import(['\"].*@snapback/PACKAGE" . --include="*.ts"

# Find package.json references
find . -name "package.json" -exec grep -l "@snapback/PACKAGE" {} \;

# Count total imports
grep -r "from '@snapback/PACKAGE'" . --include="*.ts" | wc -l
```

### LOC Counting

```bash
# Count lines in a file
wc -l path/to/file.ts

# Count lines in directory
find path/to/dir -name "*.ts" | xargs wc -l | tail -n 1

# Count non-comment, non-blank lines (more accurate)
cloc path/to/dir
```

### Build Verification

```bash
# Full monorepo build
pnpm build

# Specific package build
pnpm --filter @snapback/engine build

# Type checking only
pnpm tsc --noEmit

# Linting
pnpm biome check .
```

### Test Execution

```bash
# All tests
pnpm test

# Specific package tests
pnpm --filter @snapback/engine test

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage
```

### Bundle Analysis

```bash
# Build and analyze bundle
pnpm --filter snapback-vscode build

# Check output size
ls -lh apps/vscode/dist/

# Analyze bundle composition (if webpack)
npx webpack-bundle-analyzer apps/vscode/dist/stats.json
```

### Safety Rollback

```bash
# Revert last commit
git revert HEAD

# Restore specific file
git checkout HEAD~1 -- path/to/file.ts

# Hard reset (destructive!)
git reset --hard HEAD~1

# After rollback
pnpm install
pnpm build
pnpm test
```
