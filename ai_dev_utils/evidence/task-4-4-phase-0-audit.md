# Task 4.4: Trust Score Calibration - PHASE 0 Audit Report

**Date**: 2025-12-09
**Status**: COMPLETE ✅
**Authority**: TDD_CORE.md - Phase 0 (Mandatory Architecture Audit)

---

## Executive Summary

Task 4.4 requires implementing trust score calibration to replace mocked random confidence values with real EWMA (Exponentially Weighted Moving Average) scores based on user feedback. The audit confirms:

- ✅ Foundation exists: `postAcceptOutcomes` table tracks user outcomes
- ⚠️ Service missing: `TrustCalibrationService` does NOT exist
- ⚠️ Integration point identified: `dashboard-metrics.ts` (lines 130-137) uses `Math.random()`
- ⚠️ Feedback route missing: No recovery webhook to record outcomes yet
- ✅ No duplicates found: No existing trust calibration logic

---

## PHASE 0 Audit Details

### 1. TrustCalibrationService Verification

**Search Command**:
```bash
find apps/api/src/services -name "*trust*" -o -name "*calibrat*"
grep -rn "TrustCalibrationService\|TrustCalibration" apps/api/
```

**Result**: ❌ NOT FOUND
- Directory: `/apps/api/src/services/`
- Existing services: `cloud-backup.ts`, `database.ts`, `email.ts`, `guardian.ts`, `keys.ts`, `metrics-aggregator.ts`, `secret-detection.ts`
- **Conclusion**: Service needs to be created from scratch

**Decision**: Create new file `/apps/api/src/services/trust-calibration.ts`

---

### 2. Dashboard Metrics Mocking Status

**File**: `/apps/api/lib/dashboard-metrics.ts`

**Location 1 - Function `getAIDetectionStats()` (lines 130-137)**:
```typescript
// Map feature names to friendly tool names with mock confidence
// In production, confidence would come from telemetry metadata
return aiFeatures.map((feature) => ({
	tool: formatToolName(feature.featureName),
	count: feature.count,
	avgConfidence: 0.9 + Math.random() * 0.09, // Mock: 90-99% confidence
}));
```

**Location 2 - Endpoint**: `/apps/api/modules/dashboard/procedures/get-ai-detection-stats.ts` (lines 39-45)
```typescript
return aiFeatures.map((feature) => ({
	tool: formatToolName(feature.featureName),
	count: feature.count,
	avgConfidence: 0.9 + Math.random() * 0.09, // Mock: 90-99% confidence
}));
```

**Status**: ⚠️ BOTH locations use `Math.random()`
**Decision**: Update both locations to fetch scores from trust calibration service

---

### 3. Post-Accept Outcomes Schema

**File**: `/packages/platform/src/db/schema/snapback/post-accept-outcomes.ts`

**Table Structure** ✅:
```
postAcceptOutcomes
├── id (UUID, PK)
├── userId (text, FK CASCADE)
├── apiKeyId (text, FK CASCADE)
├── suggestionId (text)
├── editsMade (jsonb)
├── timeToEditMs (integer)
├── timeToSubmitMs (integer)
├── userFeedback (text)
├── timestamp (timestamp)
└── createdAt (timestamp)

Indexes:
├── post_accept_outcomes_user_created_at_idx
└── post_accept_outcomes_api_key_created_at_idx
```

**Status**: ✅ Table exists and is properly indexed
**Decision**: Can write directly to this table from trust calibration service

---

### 4. Recovery Webhook / Outcome Recording

**Module Search**:
```bash
ls -la apps/api/modules/ | grep recovery
```

**Result**: ❌ NOT FOUND
- No `/apps/api/modules/recovery/` directory exists
- No outcome webhook endpoint exists
- No route to record recovery feedback

**Reference**: `final_test_framework/arch_remediation.md` suggests:
- POST `/outcome` endpoint in recovery router
- Should call `TrustCalibrationEngine.recordOutcome()`

**Decision**: Create `/apps/api/modules/recovery/` with outcome recording procedure

---

### 5. Related Services & Dependencies

**Verified Existing Services**:
- ✅ MetricsAggregator (`/apps/api/src/services/metrics-aggregator.ts`) - used for dashboard metrics
- ✅ CloudBackupService (`/apps/api/src/services/cloud-backup.ts`) - S3 integration pattern
- ✅ Guardian (`/apps/api/src/services/guardian.ts`) - risk detection pattern
- ✅ Database (`/apps/api/src/services/database.ts`) - DB access wrapper

**Service Layer Pattern** ✅:
- All business logic lives in `apps/api/src/services/`
- Services are injected into procedures
- No inline DB queries in endpoints

**Decision**: Follow existing patterns for TrustCalibrationService

---

### 6. Imports & Dependencies

**Required Packages** ✅:
```typescript
// From @snapback/platform
import { postAcceptOutcomes } from "@snapback/platform";
import { getDb } from "@/src/services/database";

// From @snapback/infrastructure
import { logger } from "@snapback/infrastructure";

// Types
import type { PostAcceptOutcome } from "@snapback/platform";
```

**Database Availability**:
- ✅ `getDb()` wrapper available in `/apps/api/src/services/database.ts`
- ✅ Drizzle ORM configured in package
- ✅ Logger available from @snapback/infrastructure

---

## Implementation Roadmap

### Files to Create/Modify:

**NEW FILES**:
```
/apps/api/src/services/trust-calibration.ts
├─ TrustCalibrationService class
├─ EWMA algorithm implementation
├─ recordOutcome() method
└─ getConfidenceScore() method

/apps/api/modules/recovery/
├─ router.ts (oRPC router)
├─ procedures/
│  └─ record-outcome.ts
└─ types.ts

/apps/api/test/integration/trust-calibration.test.ts
├─ 15 tests (4-path coverage)
├─ Happy: EWMA updates correctly
├─ Sad: Empty outcomes, missing data
├─ Edge: Concurrent updates, boundary scores
└─ Error: DB failures, invalid input
```

**MODIFY**:
```
/apps/api/lib/dashboard-metrics.ts
├─ Import TrustCalibrationService
└─ Replace Math.random() with actual scores

/apps/api/modules/dashboard/procedures/get-ai-detection-stats.ts
├─ Import TrustCalibrationService
└─ Replace Math.random() with actual scores
```

---

## 4-Path Coverage Model

### Happy Path: Trust Score Calculation ✅
- User accepts AI suggestion (outcome = 1)
- EWMA updates: new_score = (0.7 * old_score) + (0.3 * outcome)
- Score persisted to trust_scores table
- Dashboard fetches and displays updated score

### Sad Path: No Outcome History 🟡
- User has no feedback history for tool
- Service returns default score (0.5)
- Dashboard displays neutral confidence
- EWMA calculation skipped

### Edge Cases: Boundary Conditions ⚠️
- First outcome: No old_score, use 0.5 baseline
- Score = 0.0 (always rejected)
- Score = 1.0 (always accepted)
- Concurrent updates: Race condition on EWMA calc
- Multiple tools: Per-tool confidence independent

### Error Paths: System Failures ❌
- Database unavailable: Return cached score or default
- Corrupted trust data: Fallback to 0.5
- Invalid user/tool: Graceful error with default
- Timestamp anomalies: Skip malformed records

---

## Key Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Create new service | TrustCalibrationService required by rule 2 (TDD_CORE) | Service layer compliance |
| Use EWMA algorithm | Time-weighted, responsive to recent feedback | More accurate than averages |
| Per-tool tracking | Different tools have different accuracy | Independent confidence scores |
| Default score: 0.5 | Neutral before feedback | Safe default, no bias |
| Non-blocking recording | Don't slow down critical paths | User experience priority |

---

## Audit Checklist

- [x] Service doesn't exist - needs creation
- [x] Mock location identified - 2 places need updates
- [x] Database table verified - postAcceptOutcomes ready
- [x] No duplicates found - clean implementation
- [x] Dependencies available - logger, db, types
- [x] Service layer pattern verified - follow existing patterns
- [x] Recovery module missing - needs creation
- [x] 4-path coverage identified - tests can be written
- [x] No blockers found - proceed to Phase 1

---

## PHASE 0 Gate Status

**Gate Criteria** (from TDD_CORE.md):
- [x] Services exist or location identified for creation
- [x] No duplicate implementations found
- [x] Architecture audit documented
- [x] Integration point identified
- [x] Database schema verified
- [x] Dependency chain valid
- [x] 4-path coverage model defined

**Result**: ✅ **GATE PASSED** - Ready for Phase 1 (RED)

---

## Next Steps

1. **Phase 1 (RED)**: Write 15 failing tests covering all 4 paths
2. **Phase 2 (GREEN)**: Implement TrustCalibrationService with EWMA
3. **Phase 3 (REFACTOR)**: Extract helpers, improve readability
4. **Phase 4 (QUALITY)**: Verify 90%+ line coverage, 85%+ branch coverage
5. **Phase 5 (CERTIFY)**: Collect evidence, prepare commit

---

**Audit Completed**: 2025-12-09 14:15 UTC
**Authority**: TDD_CORE.md Phase 0 Protocol
**Next Gate Command**: `./ai_dev_utils/scripts/tdd-gate.sh audit`
