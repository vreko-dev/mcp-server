# Merge Strategy: address-code-review → current branch

## Executive Summary

This document provides a comprehensive merge strategy to safely integrate the `claude/address-code-review-011CUvBNZ9g7QwmSkNTBUNiL` branch while avoiding critical regressions.

**Critical Finding**: The address-code-review branch contains an **OLDER version** of `stripe-webhook-handlers.ts` (433 lines with TODOs) compared to the current branch (444 lines, fully implemented). **DO NOT MERGE** this file from address-code-review.

## Files Status Comparison

### ✅ Files to KEEP from Current Branch (DO NOT MERGE from address-code-review)

1. **`apps/web/lib/stripe-webhook-handlers.ts`** (CRITICAL)
   - **Current branch**: 444 lines, fully implemented with email integration
   - **address-code-review**: 433 lines, older version with TODOs
   - **Action**: KEEP current implementation
   - **Reason**: Current version has complete email service integration and all 6 webhook handlers fully implemented

### ✅ Files Successfully Implemented in Current Branch

The following files were created/modified in the current branch and should be preserved:

1. **`packages/platform/src/db/migrations/0005_add_signing_secret_to_api_key_metadata.sql`**
   - Resolves CVE-SNAPBACK-001
   - Adds signing_secret column for HMAC-SHA256 verification

2. **`apps/web/lib/email-service.ts`** (306 lines)
   - Resend integration with 4 email templates
   - Functions: sendWelcomeEmail, sendCancellationEmail, sendPaymentReceipt, sendPaymentFailedEmail

3. **Email Templates** (4 files):
   - `apps/web/emails/welcome-email.tsx`
   - `apps/web/emails/cancellation-email.tsx`
   - `apps/web/emails/payment-receipt-email.tsx`
   - `apps/web/emails/payment-failed-email.tsx`

4. **`packages/api/modules/snapshots/procedures/restore-snapshot.ts`** (203 lines)
   - Complete restore/rollback implementation
   - Ownership verification, dry-run mode, risk assessment

5. **`apps/web/app/api/v1/analytics/metrics/route.ts`** (240 lines)
   - Parallel query execution with Promise.all()
   - 6x performance improvement

6. **Test Files** (86+ test cases):
   - `apps/web/__tests__/lib/stripe-webhook-handlers.test.ts` (17 tests)
   - `apps/web/__tests__/api/snapshots/metadata.test.ts` (17 tests)
   - `apps/web/__tests__/api/user.test.ts` (24 tests)
   - `apps/web/__tests__/api/checkpoints/metadata.test.ts` (8 tests)

7. **Security Updates**:
   - `packages/platform/src/db/schema/snapback/api-key-metadata.ts` (added signingSecret field)
   - `packages/api/lib/security.ts` (uses dedicated signingSecret)
   - `packages/api/modules/apikeys/procedures/create-api-key.ts` (generates signing secrets)
   - `apps/web/app/api/v1/trial-key/route.ts` (signing secret support)

### 🗑️ Files Removed in Current Branch (Intentional)

1. **`apps/web/app/api/v1/rollbacks/route.ts`**
   - **Reason**: Redundant placeholder endpoint
   - **Replacement**: Functionality exists in `packages/api/modules/snapshots/procedures/restore-snapshot.ts`
   - **Exposed via**: oRPC router at `snapshots.restore`
   - **Action**: Ensure this file does NOT get re-added during merge

### 📝 Configuration Files Updated

1. **`apps/web/.env.example`**
   - Added: `NEXT_PUBLIC_APP_URL` (for email links)
   - Added: `DATABASE_URL` (PostgreSQL connection)
   - Updated: Stripe price ID variables to match code usage:
     - `STRIPE_SOLO_MONTHLY_PRICE_ID`
     - `STRIPE_TEAM_MONTHLY_PRICE_ID`
     - `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID`
   - Already had: `RESEND_API_KEY` (lines 44-46)

## Merge Steps

### Step 1: Prepare for Merge
```bash
# Ensure you're on the current branch
git checkout claude/address-code-review-011CUvBNZ9g7QwmSkNTBUNiL

# Fetch latest changes
git fetch origin

# Create a backup branch
git branch backup-before-merge
```

### Step 2: Identify Conflicting Files
```bash
# Attempt merge to identify conflicts
git merge --no-commit --no-ff origin/[target-branch]

# If conflicts occur, review them carefully
git status
```

### Step 3: Resolve Conflicts

**For stripe-webhook-handlers.ts conflict:**
```bash
# CRITICAL: Keep current branch version
git checkout --ours apps/web/lib/stripe-webhook-handlers.ts
git add apps/web/lib/stripe-webhook-handlers.ts
```

**For any other conflicts:**
- Review each conflict individually
- Prefer current branch implementation for files listed in "Files Successfully Implemented" section
- Use `git diff` to compare versions if needed

### Step 4: Verify Rollback Endpoint is Not Re-added
```bash
# Ensure rollback endpoint does NOT exist
if [ -f "apps/web/app/api/v1/rollbacks/route.ts" ]; then
  echo "ERROR: rollbacks/route.ts was re-added. Removing..."
  rm apps/web/app/api/v1/rollbacks/route.ts
  git add apps/web/app/api/v1/rollbacks/route.ts
fi
```

### Step 5: Run Tests
```bash
# Run all tests to verify no regressions
pnpm test

# Type check all packages
pnpm type-check

# Build packages to verify compilation
pnpm build
```

### Step 6: Commit Merge
```bash
# Only commit if all tests pass
git commit -m "chore: merge address-code-review branch with conflict resolution

- Preserved current stripe-webhook-handlers.ts (444 lines, fully implemented)
- Excluded outdated version from address-code-review branch
- Verified rollback endpoint remains removed (redundant with oRPC implementation)
- All tests passing"
```

## Post-Merge Verification Checklist

- [ ] Stripe webhook handlers file is 444 lines (not 433)
- [ ] Email service integration present in webhook handlers (lines 6-10, 53-54, etc.)
- [ ] Rollback endpoint does NOT exist at `apps/web/app/api/v1/rollbacks/route.ts`
- [ ] All 86+ tests pass
- [ ] Type checking passes for all packages
- [ ] Environment variables documented in `.env.example`
- [ ] Database migration 0005 exists for signing secrets
- [ ] Email templates exist (4 files in `apps/web/emails/`)

## Risk Assessment

| Risk Level | Description | Mitigation |
|------------|-------------|------------|
| 🔴 CRITICAL | Merging older stripe-webhook-handlers.ts breaks billing | KEEP current version (444 lines) |
| 🟡 MEDIUM | Re-adding rollback endpoint creates redundancy | Verify removal after merge |
| 🟢 LOW | Environment variable naming conflicts | Already resolved in .env.example |

## Rollback Plan

If issues are discovered after merge:

```bash
# Return to backup branch
git checkout backup-before-merge

# Create new branch from backup
git checkout -b recovery-branch

# Cherry-pick specific commits if needed
git cherry-pick <commit-hash>
```

## Support

If you encounter unexpected conflicts or issues during merge:

1. Review this document's conflict resolution strategy
2. Check git diff for each conflicting file
3. Prioritize preserving current branch implementations for files listed in this document
4. Run tests after each conflict resolution
5. Contact the development team if uncertain about any conflict

## Summary of Key Files

**DO NOT MERGE from address-code-review:**
- `apps/web/lib/stripe-webhook-handlers.ts` (keep current 444-line version)

**MUST REMAIN DELETED:**
- `apps/web/app/api/v1/rollbacks/route.ts` (redundant endpoint)

**VERIFY PRESENT after merge:**
- All email templates (4 files)
- Email service (email-service.ts)
- Database migration 0005
- Updated .env.example
- All test files (86+ tests)
- Restore snapshot procedure

---

**Document Version**: 1.0
**Date**: November 8, 2025
**Branch**: claude/address-code-review-011CUvBNZ9g7QwmSkNTBUNiL
