# Phase 16: Risk Scoring Unification & Critical Fixes

**Status**: 🔄 In Progress
**Priority**: CRITICAL
**Branch**: claude/sdk-architecture-audit-011CV32KHUFTmBtkn6w8DV7h

---

## Problem Statement

### Critical Issue: Three Conflicting Risk Scales

| Component | Scale | File | Line |
|-----------|-------|------|------|
| **SDK RiskAnalyzer** | **0-10** | `packages/sdk/src/analysis/RiskAnalyzer.ts` | 44 |
| **Core RiskAnalyzer** | **0-1** | `packages/core/src/risk-analyzer.ts` | 6 |
| **Contracts Schema 1** | **0-1** | `packages/contracts/src/schemas.ts` | 12 |
| **Contracts Schema 2 (DUPLICATE!)** | **0-100** | `packages/contracts/src/types/snapshot.ts` | 123 |

**Impact**: Data corruption, integration failures, inconsistent risk assessment

---

## Solution: Standardize on 0-10 Scale

### Rationale

1. ✅ **Matches SDK Implementation**: RiskAnalyzer already uses 0-10
2. ✅ **Matches THRESHOLDS**: All risk thresholds defined in 0-10 scale
3. ✅ **Intuitive**: Familiar 1-10 rating scale
4. ✅ **Granularity**: Better than 0-1, more practical than 0-100
5. ✅ **Aligns with Industry**: Common security scoring (CVE uses 0-10)

---

## Implementation Plan

### Part 1: Remove Duplicate Schema (30 min)

**File**: `packages/contracts/src/types/snapshot.ts`

**Action**: Remove duplicate `RiskScoreSchema` at line 122

**Why**: This is a duplicate of the schema in `schemas.ts` with different scale (0-100)

**Impact**:
- ✅ Eliminates schema conflict
- ✅ Forces use of canonical schema from `schemas.ts`
- ⚠️ May break code importing from `types/snapshot.ts`

### Part 2: Update Canonical Schema (15 min)

**File**: `packages/contracts/src/schemas.ts`

**Current** (line 11-16):
```typescript
export const RiskScoreSchema = z.object({
  score: z.number().min(0).max(1),  // ❌ 0-1 scale
  factors: z.array(z.string()),
  severity: z.enum(["low", "medium", "high", "critical"]),
});
```

**Updated**:
```typescript
export const RiskScoreSchema = z.object({
  score: z.number().min(0).max(10),  // ✅ 0-10 scale
  factors: z.array(z.string()),
  severity: z.enum(["low", "medium", "high", "critical"]),
});
```

### Part 3: Add Conversion Utilities (30 min)

**File**: `packages/contracts/src/risk-conversion.ts` (NEW)

**Purpose**: Provide conversion functions for backward compatibility

```typescript
/**
 * Convert risk score from 0-1 scale to 0-10 scale
 */
export function convertRisk_0_1_to_0_10(score: number): number {
  return Math.min(10, Math.max(0, score * 10));
}

/**
 * Convert risk score from 0-10 scale to 0-1 scale
 */
export function convertRisk_0_10_to_0_1(score: number): number {
  return Math.min(1, Math.max(0, score / 10));
}

/**
 * Convert risk score from 0-100 scale to 0-10 scale
 */
export function convertRisk_0_100_to_0_10(score: number): number {
  return Math.min(10, Math.max(0, score / 10));
}

/**
 * Normalize any risk score to 0-10 scale
 */
export function normalizeRiskScore(score: number, fromScale: '0-1' | '0-10' | '0-100'): number {
  switch (fromScale) {
    case '0-1': return convertRisk_0_1_to_0_10(score);
    case '0-10': return Math.min(10, Math.max(0, score));
    case '0-100': return convertRisk_0_100_to_0_10(score);
  }
}
```

### Part 4: Update Core RiskAnalyzer (1 hour)

**File**: `packages/core/src/risk-analyzer.ts`

**Changes Required**:

1. Update return type scale documentation
2. Scale threat severity values (multiply by 10)
3. Scale complexity scores (multiply by 10)
4. Update thresholds to 0-10 scale

**Before** (line 91-93):
```typescript
for (const threat of fileThreats) {
  totalRiskScore += threat.severity;  // 0-1 values
  riskFactors.push(`Security threat detected: ${threat.description}`);
}
```

**After**:
```typescript
for (const threat of fileThreats) {
  totalRiskScore += threat.severity * 10;  // Convert 0-1 to 0-10
  riskFactors.push(`Security threat detected: ${threat.description}`);
}
```

### Part 5: Fix Import References (30 min)

**Files to Check**:
- All files importing `RiskScoreSchema` from `types/snapshot.ts`
- All files using `RiskScore` type from `types/snapshot.ts`

**Action**: Update imports to use canonical schema from `schemas.ts`

```typescript
// ❌ Before
import { RiskScoreSchema, RiskScore } from "@snapback/contracts/types/snapshot";

// ✅ After
import { RiskScoreSchema, RiskScore } from "@snapback/contracts";
```

### Part 6: Update SDK Core Classes to Use THRESHOLDS (2 hours)

**File 1**: `packages/sdk/src/core/session/SessionCoordinator.ts`

**Current** (lines 20-26):
```typescript
const DEFAULT_CONFIG = {
  idleTimeout: 105000,           // ❌ Hardcoded
  minSessionDuration: 5000,      // ❌ Hardcoded
  maxSessionDuration: 3600000,   // ❌ Hardcoded
  longSessionCheckInterval: 300000, // ❌ Hardcoded
};
```

**Updated**:
```typescript
import { THRESHOLDS } from "../../config/Thresholds.js";

const DEFAULT_CONFIG = {
  idleTimeout: THRESHOLDS.session.idleTimeout,
  minSessionDuration: THRESHOLDS.session.minSessionDuration,
  maxSessionDuration: THRESHOLDS.session.maxSessionDuration,
  longSessionCheckInterval: 300000, // Keep local (not in THRESHOLDS yet)
};
```

**File 2**: `packages/sdk/src/core/detection/BurstHeuristicsDetector.ts`

**Current** (lines 22-28):
```typescript
const DEFAULT_BURST_CONFIG = {
  timeWindow: 5000,           // ❌ Hardcoded
  minCharsInserted: 100,      // ❌ Hardcoded
  maxKeystrokeInterval: 200,  // ❌ Hardcoded
  minLinesAffected: 3,        // ❌ Hardcoded
  minInsertDeleteRatio: 3,    // ❌ Hardcoded
};
```

**Updated**:
```typescript
import { THRESHOLDS } from "../../config/Thresholds.js";

const DEFAULT_BURST_CONFIG = {
  timeWindow: THRESHOLDS.burst.timeWindow,
  minCharsInserted: THRESHOLDS.burst.minCharsInserted,
  maxKeystrokeInterval: THRESHOLDS.burst.maxKeystrokeInterval,
  minLinesAffected: THRESHOLDS.burst.minLinesAffected,
  minInsertDeleteRatio: THRESHOLDS.burst.minInsertDeleteRatio,
};
```

**File 3**: `packages/sdk/src/core/session/ExperienceClassifier.ts`

**Current** (lines 18-34):
```typescript
const DEFAULT_EXPERIENCE_THRESHOLDS = {
  explorer: {
    snapshotsPerWeek: 5,         // ❌ Duplicates THRESHOLDS.experience.explorer
    minDiversity: 0.2,
  },
  // ... all experience thresholds duplicated
};
```

**Updated**:
```typescript
import { THRESHOLDS } from "../../config/Thresholds.js";

const DEFAULT_EXPERIENCE_THRESHOLDS = THRESHOLDS.experience;
```

### Part 7: Create Integration Tests (2 hours)

**File**: `packages/contracts/test/risk-conversion.test.ts` (NEW)

**Tests**:
- Conversion accuracy (0-1 ↔ 0-10 ↔ 0-100)
- Boundary conditions (0, max values)
- Normalization function
- Bidirectional conversion
- Precision preservation

**File**: `packages/sdk/tests/integration/risk-scoring.integration.test.ts` (NEW)

**Tests**:
- SDK RiskAnalyzer returns 0-10 scores
- Core RiskAnalyzer returns 0-10 scores
- Schema validation accepts 0-10 scores
- Schema validation rejects out-of-range scores
- Cross-component consistency

### Part 8: Create SDK Session Component Tests (4 hours)

**Files to Create**:

1. `packages/sdk/tests/core/session/SessionCoordinator.test.ts`
   - Idle timeout triggering
   - Max duration triggering
   - File tracking
   - Session finalization
   - Event emission

2. `packages/sdk/tests/core/session/SessionTagger.test.ts`
   - Burst detection integration
   - Tag generation logic
   - Confidence calculations

3. `packages/sdk/tests/core/session/ExperienceClassifier.test.ts`
   - User tier classification
   - Threshold comparisons
   - Metric aggregation

4. `packages/sdk/tests/core/detection/BurstHeuristicsDetector.test.ts`
   - Already exists, verify coverage

---

## Testing Strategy

### Unit Tests

**Contracts Package**:
- ✅ RiskScoreSchema validation (0-10 scale)
- ✅ Conversion functions
- ✅ Edge cases (0, 10, out of bounds)

**SDK Package**:
- ✅ RiskAnalyzer outputs 0-10
- ✅ Threshold usage in core classes
- ✅ Session components with THRESHOLDS

**Core Package**:
- ✅ RiskAnalyzer outputs 0-10 (after update)
- ✅ Threat detection scaled correctly

### Integration Tests

- ✅ SDK ↔ Core RiskAnalyzer consistency
- ✅ Schema validation across packages
- ✅ CLI risk scoring (0-10 scale)
- ✅ MCP risk scoring (0-10 scale)

### Regression Tests

- ✅ Existing VSCode tests still pass
- ✅ Existing SDK tests still pass
- ✅ No breaking changes to public APIs

---

## Rollout Plan

### Phase 1: Contracts (30 min)
1. Remove duplicate schema
2. Update canonical schema to 0-10
3. Add conversion utilities
4. Run contracts tests

### Phase 2: Core (1 hour)
1. Update Core RiskAnalyzer to output 0-10
2. Scale threat severity values
3. Update tests
4. Run core tests

### Phase 3: SDK (2 hours)
1. Update SessionCoordinator to use THRESHOLDS
2. Update BurstHeuristicsDetector to use THRESHOLDS
3. Update ExperienceClassifier to use THRESHOLDS
4. Run SDK tests

### Phase 4: Integration (2 hours)
1. Create integration tests
2. Create session component tests
3. Verify cross-package consistency
4. Run full test suite

### Phase 5: Documentation (1 hour)
1. Update risk scoring documentation
2. Add migration notes
3. Update API documentation

---

## Success Criteria

- ✅ All risk scores use 0-10 scale
- ✅ No duplicate schemas
- ✅ All SDK core classes use THRESHOLDS
- ✅ Conversion utilities available
- ✅ 100% test pass rate
- ✅ Integration tests validate consistency
- ✅ Documentation updated
- ✅ No breaking changes to public APIs

---

## Estimated Effort

| Task | Estimate | Priority |
|------|----------|----------|
| Remove duplicate schema | 30 min | P0 |
| Update canonical schema | 15 min | P0 |
| Add conversion utilities | 30 min | P1 |
| Update Core RiskAnalyzer | 1 hour | P0 |
| Fix import references | 30 min | P1 |
| Update SDK core classes | 2 hours | P0 |
| Create integration tests | 2 hours | P1 |
| Create session tests | 4 hours | P2 |
| Documentation | 1 hour | P2 |
| **Total** | **11.5 hours** | |

---

## Dependencies

- ✅ Phase 14: Centralized Thresholds (complete)
- ✅ Phase 15: Threshold Migration (complete)
- ⏳ Phase 16: Risk Scoring Unification (this phase)

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes | HIGH | Add conversion utilities for backward compatibility |
| Test failures | MEDIUM | Run tests incrementally after each change |
| Import errors | MEDIUM | Search all imports before making changes |
| Data migration | LOW | No stored risk scores to migrate |

---

## Commit Strategy

1. **Commit 1**: Remove duplicate schema + update canonical schema
2. **Commit 2**: Update Core RiskAnalyzer to 0-10 scale
3. **Commit 3**: Update SDK core classes to use THRESHOLDS
4. **Commit 4**: Add conversion utilities + integration tests
5. **Commit 5**: Add SDK session component tests
6. **Commit 6**: Documentation updates

---

## Next Steps

Execute implementation in order:
1. ✅ Audit complete
2. ⏳ Part 1: Remove duplicate schema
3. ⏳ Part 2: Update canonical schema
4. ⏳ Part 3: Add conversion utilities
5. ⏳ Part 4: Update Core RiskAnalyzer
6. ⏳ Part 5: Fix import references
7. ⏳ Part 6: Update SDK core classes
8. ⏳ Part 7: Create integration tests
9. ⏳ Part 8: Create session component tests
10. ⏳ Documentation & commit
