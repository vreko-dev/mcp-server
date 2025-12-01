# Alpha Completion - Development Handoff

## Current State: Phase 0 Complete ✅

**Date**: November 18, 2025  
**Session Type**: Background agent continuation  
**Methodology**: Test-Driven Development (TDD)

---

## What's Done

### Phase 0: Foundation (100% Complete)
All critical infrastructure for quality, performance, and architecture enforcement is operational:

1. **Contracts** - Type-safe system boundaries
2. **Analytics Wrapper** - Privacy-preserving event tracking  
3. **CI Guards** - Automated architectural compliance
4. **Performance Harness** - Budget enforcement framework
5. **E2E Baseline** - Regression detection
6. **Documentation** - ADR and implementation guides

**Quality Gate**: All Phase 0 Stop Rules satisfied ✅

---

## What's Next

### Immediate Priority: Lane A - Snapshots & Restore (8-12 hours)

This is the **core product value**. Must be implemented before other lanes.

#### Implementation Plan

**Step 1: Snapshot Storage (TDD)**
```bash
# Create test first
touch packages/core/test/snapshot-storage.test.ts

# Test structure:
- Should generate unique snapshot IDs
- Should compress content (gzip for text)
- Should decompress to original
- Should handle binary files
- Should deduplicate chunks (SHA-256)
- Should respect .snapbackignore patterns
```

**Step 2: Implementation**
```typescript
// packages/core/src/snapshot/storage.ts
class SnapshotStorage {
  async createSnapshot(files: FileInfo[]): Promise<Snapshot>
  async restoreSnapshot(id: string): Promise<void>
  private deduplicateChunks(files: FileInfo[]): ChunkMap
  private hashContent(content: Buffer): string
}
```

**Step 3: Integration**
- Wire to analytics wrapper for SNAPSHOT_CREATED events
- Add performance benchmarks (must meet <100ms p95 budget)
- Connect to VS Code extension commands

### Medium Priority: Lanes B, D, G, H (24-32 hours)

**Lane B - Guardian Policies**
- Build on existing risk-analyzer.ts
- Implement secret detection (pattern + entropy)
- Add SARIF export for VS Code Problems panel

**Lane D - MCP Integration**
- Local tools for Free tier (100% local)
- Backend tools for Solo+ (with consent)
- Reference: existing mcp-federation.ts

**Lane G - Analytics Wiring**
- Connect ProductAnalyticsEvent to PostHog
- Use @snapback/analytics wrapper (already built)
- Wire into snapshot/restore lifecycle

**Lane H - Logging & Health**
- Structured logging with pino
- Sentry integration for errors
- Health check endpoints

### Lower Priority: Documentation & Packaging (12-16 hours)

**Lane F** - Docs with Free/Solo focus  
**Lane I** - Test coverage to 70%+  
**Lane J** - VS Code extension packaging  
**Lane K** - Admin console (feature flags only)

### Deferred: Team/Enterprise Features

**Lane C** - Team collaboration (design exists, stub for Alpha)  
**Lane E** - Billing (Stripe integration, stub for Alpha)

---

## Development Guidelines

### TDD Process (MANDATORY)

Every feature must follow Red-Green-Refactor:

```bash
# 1. RED - Write failing test
pnpm test  # Should fail

# 2. GREEN - Minimal implementation
# Write just enough code to pass

# 3. REFACTOR - Clean up
# Optimize while keeping tests green
```

### Using the Infrastructure

**Contracts**
```typescript
import type { Tier, ProductAnalyticsEvent } from '@snapback/contracts';
// All tier logic references contracts
```

**Analytics**
```typescript
import { AnalyticsClient } from '@snapback/analytics';

const analytics = AnalyticsClient.getInstance({
  apiBaseUrl: process.env.API_BASE_URL,
  userId: session.userId,
});

analytics.track({
  name: 'SNAPSHOT_CREATED',
  meta: { trigger: 'manual', cloudBackup: true },
  timestamp: Date.now(),
});
```

**Performance**
```typescript
import { createBenchmark, checkBudget, ALPHA_BUDGETS } from '@snapback/perf';

const bench = createBenchmark('snapshot-creation');
const result = await bench.run(async () => {
  await createSnapshot(files);
});

const budget = ALPHA_BUDGETS.find(b => b.name === 'snapshot-creation');
const check = checkBudget(result, budget);
if (!check.passed) {
  console.error('Performance budget exceeded!', check.message);
}
```

**CI Guards**
```bash
# Run before committing
bash scripts/ci/guard.sh

# Add exceptions if needed
echo "apps/legacy/**/*.ts" >> .guard-allowlist.txt
```

---

## Known Issues & Workarounds

### 1. Analytics TypeScript Type Issue
**Issue**: Discriminated union type inference  
**Impact**: Build warning (runtime works fine)  
**Workaround**: 
```typescript
analytics.track({
  name: 'SNAPSHOT_CREATED',
  meta: { trigger: 'manual' },
  timestamp: Date.now(),
} as ProductAnalyticsEvent);
```
**Proper Fix**: Add type helper or narrow union

### 2. Guard Output Truncation
**Issue**: Large repos cause terminal output truncation  
**Workaround**: Redirect to file
```bash
bash scripts/ci/guard.sh > guard-results.txt 2>&1
```

### 3. Flaky Retry Test
**Issue**: Analytics retry test occasionally fails  
**Impact**: CI may need re-run  
**Fix**: Better test cleanup (TODO)

---

## Testing Strategy

### Unit Tests (Vitest)
```bash
# Run all unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### E2E Tests (Playwright)
```bash
# Run baseline tests
pnpm test:e2e apps/web/__tests__/e2e/alpha-baseline.spec.ts

# Run all E2E
pnpm test:e2e
```

### Performance Tests
```bash
# Run performance benchmarks
pnpm --filter @snapback/perf test

# Generate baseline
pnpm perf:baseline
```

---

## File Structure Reference

```
packages/
├── contracts/          # Type definitions (COMPLETE)
│   └── src/
│       ├── tiers.ts
│       ├── analytics.ts
│       └── exports.ts
├── analytics/          # Event tracking (COMPLETE)
│   ├── src/client.ts
│   └── test/client.spec.ts
├── perf/              # Performance harness (COMPLETE)
│   ├── src/index.ts
│   └── test/perf.spec.ts
└── core/              # Business logic (IN PROGRESS)
    ├── src/
    │   ├── snapshot/  # TODO: Implement
    │   ├── guardian.ts
    │   └── risk-analyzer.ts
    └── test/

scripts/ci/            # CI automation (COMPLETE)
├── guard.sh          # Compliance checks
└── guard.test.sh     # Guard tests

apps/web/__tests__/e2e/  # E2E tests (BASELINE COMPLETE)
└── alpha-baseline.spec.ts

docs/adr/             # Architecture decisions (COMPLETE)
└── 0001-alpha-alignment.md
```

---

## Quick Reference Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run CI guards
bash scripts/ci/guard.sh

# Run all tests
pnpm test

# Performance benchmarks
pnpm --filter @snapback/perf test

# E2E tests
pnpm test:e2e

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

## Success Criteria (Alpha Release)

### Must Have ✅
- [x] Phase 0 infrastructure
- [ ] Snapshot creation/restore (Lane A)
- [ ] Guardian policies (Lane B)
- [ ] Local MCP tools (Lane D)
- [ ] Analytics wiring (Lane G)
- [ ] Logging infrastructure (Lane H)
- [ ] 70%+ test coverage (Lane I)

### Should Have
- [ ] Documentation site (Lane F)
- [ ] E2E critical paths (Lane I)
- [ ] VS Code packaging (Lane J)

### Nice to Have
- [ ] Feature flag admin (Lane K)
- [ ] Team/Enterprise stubs (Lane C)

---

## Resources

- **Design Spec**: `.qoder/quests/alpha-completion.md`
- **Progress Report**: `.qoder/alpha-progress.md`
- **Session Summary**: `.qoder/session-summary.md`
- **Completion Status**: `.qoder/COMPLETION_STATUS.md`
- **ADR**: `docs/adr/0001-alpha-alignment.md`

---

## Contact Points

**Architecture Questions**: Review ADR 0001  
**Implementation Questions**: Check session-summary.md  
**Test Strategy**: See alpha-completion.md (testing architecture section)  
**Performance Budgets**: packages/perf/src/index.ts

---

## Next Session Recommendations

1. **Start with Lane A** (Snapshots & Restore)
   - Highest user value
   - Enables other features
   - Well-specified in design doc

2. **Maintain TDD discipline**
   - Tests first, always
   - Green before refactor
   - Document assumptions

3. **Leverage existing code**
   - git-integration.ts has stash logic
   - risk-analyzer.ts has change detection
   - guardian.ts has policy framework

4. **Use contracts religiously**
   - Import from @snapback/contracts
   - Don't duplicate types
   - Update contracts first

5. **Monitor performance**
   - Run benchmarks frequently
   - Check against budgets
   - Update baselines when needed

---

**Handoff Complete**: Phase 0 foundation is solid. Ready for feature development.

*Generated: November 18, 2025*  
*Status: Phase 0 Complete, Lanes A-K Pending*  
*Estimated Remaining: 40-60 hours*
