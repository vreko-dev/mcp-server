# SnapBack Pattern Catalog

> Extracted from 751 commits of archaeological exploration

## Cross-Epoch Recurring Patterns

### Pattern 1: TDD Cycle Discipline
**Frequency**: High (every major feature)
**First Appearance**: Epoch 3 (Dec 3)
**Last Appearance**: Epoch 10 (ongoing)

```
RED → GREEN → BLUE (refactor)
```

**Evidence**:
- `feat: 🟢 GREEN - Implement Task 4.1.A`
- `test: 🔴 RED - Add error path tests for Task 4.1.A`
- `refactor: 🔵 BLUE - Clean up code style`

**AI Relevance**: This pattern provides clear commit structure that helps understand implementation intent. SnapBack could use commit message patterns to auto-detect implementation phases.

---

### Pattern 2: Contracts-First Development
**Frequency**: High
**First Appearance**: Epoch 3

**Structure**:
1. Define types in `@snapback/contracts`
2. Write RED tests against contracts
3. Implement GREEN phase
4. Wire to consumers

**Evidence**:
- `feat(contracts): add dashboard metrics contract types with TDD tests`
- `feat(api): dashboard metrics RED tests - 25 test cases defining API contract`

**AI Relevance**: Contracts are the source of truth. AI assistants should always check contracts first before suggesting API changes.

---

### Pattern 3: Phased Rollout
**Frequency**: Very High
**First Appearance**: Epoch 3

**Structure**:
```
Phase 1: Foundation
Phase 2-4: Core implementation
Phase 5-6: Integration & cleanup
Phase 7+: Optimization
```

**Evidence**:
- `Phase 2: Add Supabase real-time hooks`
- `Phase 3: Integrate real-time hooks into dashboard`
- `Phase 4: Integration Tier - Real-time Callbacks`
- `Phase 5: Data-Driven Metrics Completion`
- `Phase 6: Best Practices Enhancements from Context7 Review`

**AI Relevance**: Major changes should be broken into numbered phases. SnapBack could track phase progress and suggest next phases.

---

### Pattern 4: Canonical Source of Truth
**Frequency**: High (consolidation epochs)
**First Appearance**: Epoch 5

**Principle**: Each utility/pattern has ONE canonical location. Others import from it.

**Evidence**:
- `feat: consolidate retry utility into @snapback-oss/sdk`
- `feat: replace duplicate retry implementations with canonical SDK utility`
- `feat: remove duplicate logger from @snapback/config`

**AI Relevance**: SnapBack should track canonical sources and warn when AI suggests creating duplicates.

---

### Pattern 5: Signal-Based Architecture
**Frequency**: Core architecture (Epoch 8+)

**Structure**:
```
Signal → SignalBridge → EventBridge → Actions
```

**Signals**:
- Velocity signal (change rate)
- Burst detection signal
- AI detection signal
- Risk-score signal

**Evidence**:
- `feat(engine): add burst detection signal`
- `feat(engine): add AI detection signal`
- `feat(engine): wire SignalBridge + EventBridge`

**AI Relevance**: This is SnapBack's core - detecting AI activity through signals. Understanding this architecture is crucial.

---

### Pattern 6: Vitals Metaphor
**Frequency**: Core abstraction

**Mapping**:
| Vital | Meaning | Trigger |
|-------|---------|---------|
| Pulse | Change velocity | High = many changes/minute |
| Temperature | AI activity | Hot = high AI-generated % |
| Pressure | Risk accumulation | High = unsnapshot'd changes |
| Oxygen | Snapshot coverage | Low = inadequate protection |

**Evidence**:
- `WorkspaceVitals.test.ts`
- `TemperatureMonitor.test.ts`
- `PressureGauge.test.ts`
- `OxygenSensor.test.ts`
- `PulseTracker.test.ts`

**AI Relevance**: This metaphor helps AI assistants understand workspace health intuitively.

---

### Pattern 7: V1→V2 Bridge Migration
**Frequency**: Major refactors

**Structure**:
1. Build V2 alongside V1
2. Create bridge for routing
3. Migrate incrementally
4. Remove V1 when complete

**Evidence**:
- `feat(vscode): implement Phase 3 - SignalBridge with V1/V2 routing`
- `refactor(vscode): delete V1 BurstDetector, simplify SignalBridge to V2-only`
- `feat(engine): complete V1→V2 migration (Phases 2-4)`

**AI Relevance**: SnapBack enables safe migrations through snapshots before each step.

---

### Pattern 8: Package Extraction When Mature
**Frequency**: Major milestones

**Process**:
1. Feature starts in an app (vscode, web)
2. Matures through testing
3. Extracted to package
4. Original location imports from package

**Evidence**:
- `feat: extract @snapback/intelligence package`
- `feat(motion): extract motion utilities to @snapback/motion package`

**AI Relevance**: Suggests optimal timing for refactoring - only after feature stability.

---

### Pattern 9: Learning From Mistakes (Violation Tracking)
**Frequency**: Continuous

**Thresholds**:
- 1x: Stored in `violations.jsonl`
- 3x: Auto-promoted to `codebase-patterns.md`
- 5x: Marked for automation

**Evidence**:
- `report_violation` tool in MCP
- `VAGUE_ASSERTION` - `.toBeTruthy()`, `.toBeDefined()` in tests
- `LAYER_BOUNDARY_VIOLATION` - Extension importing infrastructure

**AI Relevance**: This is SnapBack teaching itself. AI should leverage this learning system.

---

### Pattern 10: Demo-Driven Priority
**Frequency**: Epoch 10 (final sprint)

**Principle**: Demo readiness drives feature prioritization.

**Evidence**:
- Final week focused on webview, daemon, UI polish
- Performance budgets strictly enforced
- Bundle size reduction (11MB → <2MB target)

**AI Relevance**: SnapBack should help AI assistants understand demo vs non-demo context.

---

## Anti-Patterns Discovered

### Anti-Pattern 1: Enterprise Bloat
**Detection**: Adding auth/deployment/monitoring without explicit request

**Evidence** (avoided):
- CLAUDE.md explicitly states: "No enterprise bloat"
- Build ONLY what's asked

### Anti-Pattern 2: Context Decay
**Problem**: Important decisions forgotten over long sessions

**Evidence**:
- Multiple checkpoints in git history
- Session management tools in MCP

### Anti-Pattern 3: Duplicate Utilities
**Problem**: Same function in multiple packages

**Evidence**:
- Entire epoch (5-6) spent on consolidation
- "HIGH ROI consolidation phase" commit

---

## Architecture Decision Records (ADRs)

### ADR-1: DBSCAN over K-Means
**Context**: Clustering sessions/changes
**Decision**: DBSCAN
**Rationale**: Better for arbitrary-shaped clusters, no need to specify k

### ADR-2: jsdiff/diff-match-patch
**Context**: Diff computation
**Decision**: jsdiff (small), diff-match-patch (large)
**Rationale**: Size vs capability tradeoff

### ADR-3: PostHog Only
**Context**: Analytics consolidation
**Decision**: Remove GA, Vercel, Mixpanel, Plausible, Umami, Pirsch
**Rationale**: Single source of truth, reduced complexity

### ADR-4: Metadata-Only Architecture
**Context**: Privacy
**Decision**: Store metadata only, actual code handled locally
**Rationale**: Privacy-first, GDPR compliance

### ADR-5: Signal-Based Engine
**Context**: Core architecture
**Decision**: Composable signals with bridge pattern
**Rationale**: Decoupling, testability, extensibility

---

## Commit Message Conventions

| Prefix | Meaning | Example |
|--------|---------|---------|
| `feat` | New feature | `feat(engine): add burst detection signal` |
| `fix` | Bug fix | `fix(vscode): resolve test failures` |
| `refactor` | Code restructure | `refactor: namespace-only architecture` |
| `test` | Test addition | `test: add 🔴 RED phase tests` |
| `docs` | Documentation | `docs: add TDD agent prompt` |
| `chore` | Maintenance | `chore: update dependencies` |
| `perf` | Performance | `perf(turbo): optimize task caching` |
| `build` | Build system | `build: enable DTS resolution` |
| `security` | Security fix | `security: patch CVE-2025-55182` |

**Scope pattern**: `(package)` or `(app,package)`

---

## Test Naming Conventions

| Type | Location | Naming |
|------|----------|--------|
| Unit | `test/unit/*.test.ts` | `describe('ClassName', ...)` |
| Integration | `test/integration/*.test.ts` | `describe('Feature Integration', ...)` |
| E2E | `e2e/*.spec.ts` | `test('User can...', ...)` |

**Assertion style**: Avoid `.toBeTruthy()`, use specific assertions.
