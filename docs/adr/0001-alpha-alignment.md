# ADR 0001: Alpha Alignment - Free/Solo Focus with Contract-First Architecture

## Status
**Accepted** - November 18, 2025

## Context

SnapBack is launching an Alpha release focused on proving core value with Free and Solo tiers while deferring Team/Enterprise features. This decision requires architectural foundations that support rapid iteration while maintaining quality and enabling future expansion.

### Strategic Objectives
1. **Prove Core Value**: Snapshot/restore + Guardian policies + local MCP work flawlessly
2. **Validate Privacy Story**: Free tier 100% local, Solo backend MCP with explicit consent
3. **Establish Quality Bar**: Contract-based architecture, CI guards, performance budgets
4. **Enable Fast Iteration**: Analytics + feedback loops for product decisions
5. **Minimize Scope Creep**: Team/Enterprise as designed stubs, not runtime complexity

## Decision

### Phase 0: Contract & Guard Infrastructure (MANDATORY FOUNDATION)

We will implement foundational infrastructure before any feature development:

#### 1. Contract System (`@snapback/contracts`)
**Rationale**: Single source of truth prevents drift and enables type-safe development.

**Implementation**:
- `tiers.ts` - Tier definitions with `ALPHA_ACTIVE_TIERS = ['free', 'solo']`
- `analytics.ts` - Strict event schemas for product analytics
- `exports.ts` - Audit export formats (InlineExport <10MB, UrlExport >10MB)

**Acceptance Criteria**:
- All contracts compile without TypeScript errors
- Contracts referenced by at least 3 consuming packages

#### 2. Analytics Client Wrapper (`@snapback/analytics`)
**Rationale**: Enforce privacy guarantees and prevent direct analytics POSTs.

**Implementation**:
- Event queueing with configurable batching (default: 10 events or 30s)
- PII sanitization (emails, tokens, API keys, path normalization)
- Retry logic with exponential backoff (1s, 2s, 4s, 8s, 16s)
- LocalStorage persistence for offline resilience

**Acceptance Criteria**:
- Zero direct `fetch('/analytics/ingest')` calls in codebase (enforced by CI guard)
- Unit tests achieve ≥90% coverage
- PII sanitization validated with test corpus

#### 3. CI Guard System (`scripts/ci/guard.sh`)
**Rationale**: Automated enforcement prevents architectural violations.

**Guard Rules**:
1. **Terminology**: Forbid "checkpoint" (case-insensitive), allow "snapshot" and "restore"
2. **Deprecated Actions**: Block policy actions "apply" and "review"
3. **Analytics Enforcement**: Detect direct analytics POST bypassing wrapper
4. **Enterprise Scoping**: SSO/SAML/SCIM only in `apps/docs/content/enterprise/`

**Allowlist Support**: `.guard-allowlist.txt` with glob pattern matching

**Acceptance Criteria**:
- All guard rules pass on clean codebase
- Violations include line numbers and context
- Allowlist correctly exempts legacy files

#### 4. Performance Testing Harness (`@snapback/perf`)
**Rationale**: Prevent performance regressions with automated budgets.

**Alpha Budgets** (±20% variance tolerance):
- Snapshot creation: <100ms (p95)
- Risk analysis: <500ms
- Session tracking: <50ms
- Analytics TTI: <2000ms

**Features**:
- Percentile calculation (p50, p90, p95)
- Budget validation with variance tolerance
- Baseline persistence with hardware specs
- CI integration for regression detection

**Acceptance Criteria**:
- All budgets defined and testable
- Baseline file includes CPU, memory, OS, CI runner details
- Budget violations fail CI build

#### 5. E2E Baseline Test (`apps/web/__tests__/e2e/alpha-baseline.spec.ts`)
**Rationale**: Establish critical user journey as regression canary.

**Test Path**:
1. User signup with email verification
2. Navigate to analytics page
3. Verify export buttons visible
4. Assert no console errors

**Acceptance Criteria**:
- Test passes on clean deployment
- Performance metrics collected (TTI < 2400ms with variance)
- Edge cases handled (unauthenticated access, session preservation)

### Stop Rule for Phase 0
**DO NOT PROCEED to Lane A until:**
- ✅ CI pipeline green end-to-end
- ✅ "checkpoint" string absent in codebase (verified by guard)
- ✅ All contracts compile without TypeScript errors
- ✅ Performance budgets baseline established
- ✅ ADR published and reviewed

## Consequences

### Positive
1. **Type Safety**: Contracts prevent runtime errors through compile-time validation
2. **Quality Gate**: CI guards block architectural violations automatically
3. **Performance Accountability**: Budgets make regressions visible immediately
4. **Privacy Enforcement**: Wrapper prevents accidental PII leakage
5. **Documentation**: ADR creates architectural record for future reference

### Negative
1. **Initial Overhead**: Phase 0 requires 4-6 hours before feature development
2. **Guard Maintenance**: Allowlist may grow as legacy code is discovered
3. **Budget Tuning**: Initial budgets may need adjustment based on real-world usage
4. **Contract Versioning**: Breaking changes require coordinated updates

### Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Guard false positives | Dev friction | Comprehensive allowlist, fast feedback |
| Performance budget too strict | CI failures | ±20% variance (vs. 10% in production) |
| Contract breaking changes | Build failures | Semantic versioning, migration guides |
| Analytics wrapper bypass | Privacy violation | Guard detection, code review emphasis |

## Alternatives Considered

### Alternative 1: No Contract System
**Rejected**: Without contracts, Free/Solo vs. Team/Enterprise logic would drift, causing bugs and security issues.

### Alternative 2: Runtime Validation Instead of Compile-Time
**Rejected**: Runtime validation adds overhead and misses errors until deployment.

### Alternative 3: Manual Code Review Instead of CI Guards
**Rejected**: Human error inevitable; automated guards provide instant feedback.

### Alternative 4: Single 10% Performance Budget
**Rejected**: Too strict for Alpha; 20% variance allows for hardware diversity.

## Implementation Notes

### TDD Methodology (MANDATORY)
All Phase 0 components follow strict Test-Driven Development:
1. **RED**: Write failing test first
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Clean up while maintaining green

### Test Coverage Requirements
- Contracts: Type-level validation (compile = pass)
- Analytics: ≥90% statement coverage
- Guards: All rules verified with positive/negative cases
- Performance: Budget validation for all 4 metrics
- E2E: Critical path + 2 edge cases

### Integration Points
```typescript
// Example: Using contracts in feature code
import type { Tier, ProductAnalyticsEvent } from '@snapback/contracts';
import { trackEvent } from '@snapback/analytics';

function onSnapshotCreated(tier: Tier) {
  const event: ProductAnalyticsEvent = {
    type: 'SNAPSHOT_CREATED',
    trigger: 'manual',
    cloudBackup: tier === 'solo',
    timestamp: Date.now(),
  };
  
  trackEvent(event); // Wrapper handles batching, sanitization, retry
}
```

## References
- [Alpha Completion Design Doc](../.qoder/quests/alpha-completion.md)
- [Phase 0 Specification](../.qoder/quests/alpha-completion.md#phase-0-contract--guard-infrastructure)
- [Progress Report](../.qoder/alpha-progress.md)

## Stakeholders
- **Engineering**: Implementation and maintenance
- **Product**: Feature prioritization and user impact
- **Security**: Privacy guarantees and PII handling
- **QA**: Test strategy and coverage validation

## Review History
- **2025-11-18**: Initial draft and acceptance
- **Next Review**: Post-Alpha launch (validate assumptions)

---

**Decision Maker**: Engineering Team  
**Approved By**: Alpha Completion Task Force  
**Effective Date**: November 18, 2025
