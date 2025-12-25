# Open-Core Consolidation Implementation Plan

> **Status:** Ready to Execute
> **Decision:** Open-Core Model (not feature flags)
> **Estimated Effort:** 7 days
> **Current Progress:** 80% complete (dependency already exists)

---

## Executive Summary

### Why Open-Core Won

| Factor | Open-Core | Feature Flags |
|--------|-----------|---------------|
| **Type Safety** | ✅ Guaranteed | ❌ Runtime checks |
| **Bundle Size** | ✅ Optimal | ❌ Bloated |
| **npm Publishing** | ✅ Clean separation | ❌ Confusion |
| **Community Trust** | ✅ True OSS | ❌ Feels gated |
| **Maintenance** | ✅ Easy | ❌ Complex |
| **Testing** | ✅ Independent | ❌ Combinatorial |

**Verdict:** Open-Core wins 8/8 categories

### Current State

```typescript
// packages/sdk/package.json - Already depends on OSS!
"@snapback-oss/sdk": "workspace:*"  // ✅ 80% done
```

---

## Phase 1: Identify Pro-Only Code (2 days)

### 1.1 Audit Current Exports

**Run this to see all exports:**
```bash
cd packages/sdk/src
rg "^export" index.ts | head -50
```

### 1.2 Pro-Only Features (Confirmed)

| Feature | Location | Reason |
|---------|----------|--------|
| `ProtectionDecisionEngine` | `protection/ProtectionDecisionEngine.ts` | Commercial feature |
| `describeRiskFactors` | `analysis/riskFactorDescriptions.ts` | Pro analytics |
| `createDashboardMetricsClient` | `dashboard/metrics-client.ts` | SaaS integration |

**Decision Needed:**
- `CloudBackupService` - OSS or Pro? (Currently in both)

### 1.3 Verification Script

```bash
# Create audit file
cd /Users/user1/WebstormProjects/SnapBack-Site

cat > scripts/audit-pro-features.sh << 'EOF'
#!/bin/bash
echo "=== Pro-Only Features Audit ==="
echo ""
echo "Features in packages/sdk/src/index.ts:"
grep -E "(ProtectionDecisionEngine|describeRiskFactors|createDashboardMetricsClient|CloudBackupService)" packages/sdk/src/index.ts

echo ""
echo "Checking if they exist in packages-oss/sdk/src/index.ts:"
grep -E "(ProtectionDecisionEngine|describeRiskFactors|createDashboardMetricsClient)" packages-oss/sdk/src/index.ts || echo "✅ Not in OSS (good)"
EOF

chmod +x scripts/audit-pro-features.sh
./scripts/audit-pro-features.sh
```

---

## Phase 2: Move Pro Code (3 days)

### 2.1 File Organization

**Target Structure:**
```
packages/sdk/src/
  ├── index.ts                    # Re-exports OSS + Pro
  ├── protection/
  │   └── ProtectionDecisionEngine.ts  # Pro only
  ├── analysis/
  │   └── riskFactorDescriptions.ts    # Pro only
  └── dashboard/
      └── metrics-client.ts            # Pro only

packages-oss/sdk/src/
  ├── index.ts                    # OSS exports
  ├── snapshot/
  │   └── SnapshotManager.ts      # OSS
  ├── session/
  │   └── SessionManager.ts       # OSS
  └── storage/
      └── StorageAdapter.ts       # OSS
```

### 2.2 Update Pro Index

**File:** `packages/sdk/src/index.ts`

```typescript
// Re-export entire OSS SDK
export * from "@snapback-oss/sdk";

// Pro-only features
export {
  type AIDetectionContext,
  type ChangeMetrics,
  DefaultRiskAnalyzer,
  type EvaluationContext,
  type IRiskAnalyzer,
  type ProtectionDecision,
  ProtectionDecisionEngine,
} from "./protection/ProtectionDecisionEngine";

export {
  describeRiskFactor,
  describeRiskFactors,
  getStandardRiskFactors,
  isKnownRiskFactor,
  RISK_FACTOR_DESCRIPTIONS,
} from "./analysis/riskFactorDescriptions";

export {
  createDashboardMetricsClient,
  type DashboardMetricsClient,
  type ORPCClient,
} from "./dashboard/metrics-client";

// ID Generation - re-export from OSS (remove local copy)
export {
  generateAuditId,
  generateCheckpointId,
  generateSessionId,
  generateSnapshotId,
  ID_PREFIX,
  type IdPrefix,
  isValidId,
  parseIdPrefix,
  parseIdTimestamp,
  randomId,
} from "@snapback-oss/sdk";
```

### 2.3 Verify OSS Index

**File:** `packages-oss/sdk/src/index.ts`

Ensure it does NOT export Pro features:
```bash
# Should return nothing
grep -E "(ProtectionDecisionEngine|describeRiskFactors|createDashboardMetricsClient)" packages-oss/sdk/src/index.ts
```

---

## Phase 3: Remove Duplication (1 day)

### 3.1 Delete Duplicate Files

**Files to remove from `packages/sdk/src/`:**

```bash
# Core features (use OSS instead)
rm packages/sdk/src/snapshot/SnapshotManager.ts
rm packages/sdk/src/session/SessionManager.ts
rm packages/sdk/src/storage/StorageAdapter.ts
rm packages/sdk/src/utils/errorHelpers.ts  # Use @snapback-oss/sdk
rm packages/sdk/src/utils/retry.ts         # Use @snapback-oss/sdk

# ID generation (centralize in OSS)
rm packages/sdk/src/utils/id-generation.ts  # Use @snapback-oss/sdk
```

### 3.2 Verification

```bash
# Should show ZERO overlap
diff -r packages/sdk/src packages-oss/sdk/src

# Only Pro-only directories should remain in packages/sdk/src:
# - protection/
# - analysis/riskFactorDescriptions.ts
# - dashboard/
```

---

## Phase 4: Update Imports (1 day)

### 4.1 Apps Update

**VSCode Extension:**
```bash
cd apps/vscode

# Find all imports from @snapback/sdk
rg "@snapback/sdk" --type ts -l

# These should all still work (OSS re-exported through Pro)
```

**Web App:**
```bash
cd apps/web

# Check if using Pro features
rg "(ProtectionDecisionEngine|describeRiskFactors)" --type ts -l
```

### 4.2 Update Internal Packages

**Find packages importing Pro features:**
```bash
cd packages

# Should only be used in packages/sdk (Pro)
rg "ProtectionDecisionEngine" --type ts -l
```

---

## Phase 5: Testing (½ day)

### 5.1 Build All Packages

```bash
pnpm build
```

**Expected Output:**
```
packages-oss/sdk       ✅ Built
packages/sdk           ✅ Built (depends on OSS)
apps/vscode            ✅ Built
apps/web               ✅ Built
```

### 5.2 Type Checking

```bash
pnpm type-check
```

### 5.3 Run Tests

```bash
# OSS package tests
cd packages-oss/sdk
pnpm test

# Pro package tests
cd packages/sdk
pnpm test

# Integration tests
cd apps/vscode
pnpm test
```

---

## Phase 6: npm Publishing Verification (½ day)

### 6.1 OSS Package

**File:** `packages-oss/sdk/package.json`

```json
{
  "name": "@snapback-oss/sdk",
  "version": "0.6.0",
  "publishConfig": {
    "access": "public"  // ✅ Already set
  }
}
```

### 6.2 Pro Package

**File:** `packages/sdk/package.json`

```json
{
  "name": "@snapback/sdk",
  "version": "0.2.0",
  "dependencies": {
    "@snapback-oss/sdk": "workspace:*"  // ✅ Already set
  },
  "publishConfig": {
    "access": "restricted"  // Commercial
  }
}
```

### 6.3 Test Install

```bash
# Simulate user installing OSS
mkdir /tmp/test-oss
cd /tmp/test-oss
npm init -y
npm install @snapback-oss/sdk

# Should NOT include Pro features
node -e "console.log(Object.keys(require('@snapback-oss/sdk')))"
```

---

## Critical Decisions Needed

### Decision 1: CloudBackupService

**Current:** Exists in both packages
**Options:**
- **A) Keep in OSS** - Local file backup for everyone
- **B) Move to Pro** - S3/cloud backup is commercial

**Recommendation:** Move to Pro (cloud storage = commercial feature)

### Decision 2: ID Generation

**Current:** Duplicate in both packages
**Options:**
- **A) OSS** - IDs are foundational
- **B) Pro** - Specific formats are Pro

**Recommendation:** Move to OSS (IDs needed everywhere)

### Decision 3: Dashboard Client

**Current:** Only in Pro
**Status:** ✅ Correct (SaaS integration)

---

## Rollback Plan

If issues arise:

```bash
# Revert to current state
git checkout packages/sdk/src/index.ts
git checkout packages-oss/sdk/src/index.ts

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build
```

---

## Success Metrics

- [ ] `packages/sdk` imports from `@snapback-oss/sdk` ✅ (already done)
- [ ] Zero file duplication between packages
- [ ] All tests pass
- [ ] `pnpm build` succeeds
- [ ] `pnpm type-check` passes
- [ ] OSS package has no Pro features
- [ ] Pro package has all features

---

## Post-Implementation

### Update Documentation

**Files to update:**
- `docs/open-core/README.md` - Explain new structure
- `packages/sdk/README.md` - Pro features list
- `packages-oss/sdk/README.md` - OSS features list
- `CONTRIBUTING.md` - Where to add new features

### Communication

**npm README:**
```markdown
## Installation

**Free & Open Source:**
```bash
npm install @snapback-oss/sdk
```

**Commercial (includes cloud backup, analytics):**
```bash
npm install @snapback/sdk
```
```

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Identify Pro Code | 2 days | None |
| 2. Move Pro Code | 3 days | Phase 1 |
| 3. Remove Duplication | 1 day | Phase 2 |
| 4. Update Imports | 1 day | Phase 3 |
| 5. Testing | 0.5 days | Phase 4 |
| 6. Publishing Verification | 0.5 days | Phase 5 |
| **Total** | **7 days** | Sequential |

---

## Next Steps

1. **Review this plan** - Confirm Pro-only features list
2. **Make decisions** - CloudBackupService location
3. **Create branch** - `feat/open-core-consolidation`
4. **Start Phase 1** - Run audit script
5. **Daily standup** - Track progress

---

## References

- [Tech Debt Audit](./CODEBASE_TECH_DEBT_AUDIT.md) - Full duplication analysis
- [Resilience Patterns](./RESILIENCE_PATTERNS_AUDIT.md) - Queue consolidation
- [Open-Core Docs](../open-core/) - Implementation guides
- Package.json already configured ✅

**Last Updated:** 2025-12-25
**Status:** Ready to Execute
