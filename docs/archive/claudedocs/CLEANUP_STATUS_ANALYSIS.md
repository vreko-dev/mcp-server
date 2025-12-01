# SnapBack-Site Cleanup Implementation Status Analysis

**Date**: 2025-10-05
**Status**: PARTIALLY COMPLETE - Critical Infrastructure Gaps Identified
**TypeScript Errors**: 46 errors preventing compilation

---

## Executive Summary

**Finding**: The i18n cleanup was **DOCUMENTED but NOT EXECUTED**. However, critical infrastructure work is missing beyond just i18n removal. The codebase has structural issues that need immediate attention.

### Current State:

-   ✅ **@i18n/routing removal**: COMPLETE (0 imports found)
-   ❌ **next-intl removal**: INCOMPLETE (5 files still importing)
-   ❌ **Database exports**: MISSING (deviceTrials not exported)
-   ❌ **Storage package**: INCOMPLETE (missing signed URL functions)
-   ❌ **Documentation infrastructure**: BROKEN (fumadocs-mdx not installed, .map file missing)
-   ❌ **@repo/ migration**: COMPLETE in code (0 references), documentation only

### Critical Path Issues:

1. **Database Schema Export Gap**: `deviceTrials` table exists but not exported from index
2. **Storage Package Incomplete**: Missing `getSignedUrl` and `getSignedUploadUrl` implementations
3. **Documentation Build Broken**: Missing fumadocs-mdx dependency, .map file doesn't exist
4. **Mail Package Locale References**: Still passing `locale` parameter (removed from types)

---

## Section 1: Implementation Progress Report

### 1.1 I18N Removal Status

#### ✅ Phase 2 Components: COMPLETE

**Evidence**: Zero `@i18n/routing` imports found

```bash
grep -r "@i18n/routing" apps/web --include="*.tsx" --include="*.ts"
# Result: 0 matches
```

**Conclusion**: Component replacement (LocaleLink → Link, useLocalePathname → usePathname) was successfully executed.

#### ❌ Phase 1 Mail Package: INCOMPLETE

**Evidence**: 5 files still importing `next-intl`

```
apps/web/modules/saas/organizations/components/OrganizationInvitationsList.tsx
apps/web/modules/saas/settings/components/PasskeysBlock.tsx
apps/web/modules/saas/payments/components/ActivePlan.tsx
apps/web/modules/saas/payments/components/PricingTable.tsx
apps/web/modules/saas/start/components/StatsTile.tsx
```

**Pattern**: All importing `useFormatter` from next-intl for date/number formatting

**Gap Analysis**:

-   Mail package templates: Status unknown (need to verify if updated)
-   Component formatters: Still using i18n formatter instead of standard Intl API
-   Config cleanup: Partially complete (i18n removed from config, but locale still in code)

#### ❌ Mail API Integration: TYPE MISMATCH

**Evidence**: 3 TypeScript errors for `locale` parameter

```typescript
// Error in packages/auth/auth.ts:148,215,238
// Object literal may only specify known properties,
// and 'locale' does not exist in type SendEmailParams

// Code is passing:
await sendEmail({
	to: user.email,
	templateId: "emailVerification",
	context: { url, name: user.name },
	locale: user.locale ?? "en", // ❌ locale removed from types
});
```

**Root Cause**: `locale` parameter removed from mail types but callers not updated

### 1.2 @repo/ to @snapback/ Migration

#### ✅ Code Migration: COMPLETE

**Evidence**: Zero references in source code

```bash
grep -r "@repo/" --include="*.ts" --include="*.tsx" --include="*.json" |
  grep -v ".archive" | grep -v "claudedocs" | grep -v "node_modules"
# Result: 0 matches
```

**Status**: All import paths successfully migrated to `@snapback/`

#### 📝 Documentation References: CLEANUP NEEDED

**Remaining**: 9 files (5 in apps/web MDX, 4 in packages README.md)

-   All references are in documentation/README files
-   Low priority - no functional impact

---

## Section 2: Critical TypeScript Errors Analysis

### 2.1 Database Schema Export Gap (HIGH PRIORITY)

**Error**: 4 files cannot import `deviceTrials`

```
app/api/v1/user/me/route.ts(3,10): error TS2305: Module
'"@snapback/database/drizzle/schema/snapback"' has no exported member 'deviceTrials'.
```

**Root Cause Analysis**:

```typescript
// File exists: packages/database/drizzle/schema/snapback/device-trials.ts
export const deviceTrials = pgTable(...) // ✅ Table defined
export const deviceTrialsRelations = relations(...) // ✅ Relations defined

// But: packages/database/drizzle/schema/snapback/index.ts
// ❌ MISSING: export * from "./device-trials";
```

**Impact**: 4 files blocked

-   app/api/v1/user/me/route.ts
-   lib/stripe-webhook-handlers.ts
-   middleware/auth.ts
-   middleware/usage-tracking.ts

**Fix**: Add one line to index.ts

```typescript
export * from "./device-trials";
```

### 2.2 Storage Package Incomplete (HIGH PRIORITY)

**Error**: 3 files cannot import signed URL functions

```
app/image-proxy/[...path]/route.ts(2,10): error TS2305: Module
'"@snapback/storage"' has no exported member 'getSignedUrl'.
```

**Root Cause Analysis**:

```typescript
// packages/storage/index.ts
export * from "./src/interface"; // ✅ Exports CheckpointStorage interface
export * from "./src/adapters/fs"; // ✅ Exports FileSystemAdapter

// But interface.ts only defines:
export interface CheckpointStorage {
	create(data: CreateCheckpointInput): Promise<Checkpoint>;
	retrieve(id: string): Promise<Checkpoint | null>;
	list(): Promise<Checkpoint[]>;
}
// ❌ MISSING: getSignedUrl, getSignedUploadUrl
```

**Expected Interface** (based on usage):

```typescript
// packages/storage/src/interface.ts should export:
export async function getSignedUrl(key: string): Promise<string>;
export async function getSignedUploadUrl(
	key: string,
	contentType: string
): Promise<{ url: string; key: string }>;
```

**Impact**: 3 files blocked

-   app/image-proxy/[...path]/route.ts (image serving)
-   packages/api/modules/organizations/procedures/create-logo-upload-url.ts
-   packages/api/modules/users/procedures/create-avatar-upload-url.ts

**Assessment**: Storage package is incomplete - checkpoint storage exists but S3/signed URL functionality missing

### 2.3 Documentation Infrastructure Broken (MEDIUM PRIORITY)

**Error 1**: fumadocs-mdx not installed

```
Failed to load next.config.mjs
[Error: Cannot find package 'fumadocs-mdx' imported from
/Users/user1/WebstormProjects/SnapBack-Site/apps/web/next.config.mjs]
```

**Analysis**:

-   apps/web/package.json has fumadocs-core and fumadocs-ui
-   ❌ Missing: fumadocs-mdx dependency
-   Code references it in docs-source.ts

**Error 2**: Missing .map file

```
app/docs-source.ts(1,21): error TS2307: Cannot find module '@/.map'
or its corresponding type declarations.
```

**Analysis**:

```typescript
// apps/web/app/docs-source.ts
import { map } from "@/.map"; // ❌ File doesn't exist
import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx"; // ❌ Package not installed
```

**Root Cause**: Documentation build step not configured

-   .map file should be auto-generated by content-collections or fumadocs
-   Build configuration incomplete

**Impact**: 5 files blocked

-   app/docs-source.ts
-   app/(marketing)/docs/[[...path]]/layout.tsx
-   app/(marketing)/docs/[[...path]]/page.tsx
-   app/api/docs-search/route.ts

### 2.4 Mail/Auth Locale Parameter Mismatch (MEDIUM PRIORITY)

**Error Pattern**: `locale` parameter no longer exists in SendEmailParams

```typescript
// 3 occurrences in packages/auth/auth.ts:148, 215, 238
await sendEmail({
	to: user.email,
	templateId: "emailVerification",
	context: { url, name: user.name },
	locale: user.locale ?? "en", // ❌ Type error
});
```

**Root Cause**: I18N removal removed `locale` from mail types but not from callers

**Fix**: Remove `locale` parameter from all sendEmail calls

**Impact**: 3 files in auth package

-   Email verification flow
-   Magic link flow
-   Organization invitation flow

### 2.5 Next-Intl Formatter Dependencies (LOW PRIORITY)

**Error**: 5 SaaS components still importing next-intl

```typescript
import { useFormatter } from "next-intl"; // ❌ Package should be removed
```

**Files**:

-   OrganizationInvitationsList.tsx (date formatting)
-   PasskeysBlock.tsx (date formatting)
-   ActivePlan.tsx (currency/date formatting)
-   PricingTable.tsx (currency formatting)
-   StatsTile.tsx (number formatting)

**Replacement Strategy**:

```typescript
// BEFORE:
import { useFormatter } from "next-intl";
const format = useFormatter();
format.dateTime(date, { dateStyle: "medium" });

// AFTER:
const formattedDate = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
}).format(date);
```

**Impact**: Low - cosmetic/formatting only, doesn't block core functionality

### 2.6 Minor Type Errors (LOW PRIORITY)

**Pricing Component**: Missing properties

```
modules/marketing/components/sections/pricing-section-enhanced.tsx:
- Missing: persona, headline properties
- Missing: guarantees array
- Missing: faq array
```

**Webhook Handlers**: Type assertions needed

```
packages/api/modules/webhooks/inapp-messaging.ts:
- Missing: totalCheckpoints, totalRecoveries properties on user type
- error is of type 'unknown' (6 occurrences) - needs type narrowing
```

**Impact**: 12 errors total, doesn't block core functionality

---

## Section 3: Architecture Assessment

### 3.1 Structural Issues Beyond I18N

The cleanup revealed deeper architectural gaps:

#### Issue 1: Incomplete Package Exports

**Pattern**: Tables/functions defined but not exported from package index

-   deviceTrials table exists but not in index.ts
-   Storage functions referenced but not implemented

**Risk**: Developer UX - hard to discover what's available
**Mitigation**: Systematic audit of all package exports

#### Issue 2: Documentation Build Pipeline Missing

**Pattern**: References to generated files that don't exist

-   .map file expected but no build step creates it
-   fumadocs-mdx expected but not installed

**Risk**: Documentation completely broken
**Mitigation**: Either complete fumadocs setup or remove documentation routes

#### Issue 3: Type System Integrity

**Pattern**: Types updated but callers not updated

-   locale removed from types but 3 callers still pass it
-   Properties removed from interfaces but components still access them

**Risk**: Runtime errors despite type errors
**Mitigation**: Systematic type-driven refactoring

### 3.2 Dependency Management Issues

**Missing Dependencies**:

```json
{
	"fumadocs-mdx": "not installed but imported",
	"next-intl": "should be removed but still in use"
}
```

**Incomplete Removals**:

-   next-intl imported in 5 files but marked for removal
-   locale parameter removed from types but code still passes it

### 3.3 Migration Strategy Gaps

**What Worked**:

-   Component replacement (@i18n/routing → next/link): 100% complete
-   Package rename (@repo → @snapback): 100% complete

**What Failed**:

-   Type-driven refactoring: Types updated but callers not updated
-   Dependency removal: Partial removal causing inconsistency
-   Infrastructure completion: Storage package half-implemented

---

## Section 4: Implementation Plan - Critical Path to Green Compilation

### Priority 1: Core Infrastructure (BLOCKERS) - 2 hours

#### Task 1.1: Fix Database Schema Exports (15 min)

**File**: `packages/database/drizzle/schema/snapback/index.ts`

```typescript
// Add missing export
export * from "./device-trials";
```

**Validates**: 4 import errors resolved

#### Task 1.2: Complete Storage Package (60 min)

**Files**:

-   `packages/storage/src/interface.ts` - Add signed URL interfaces
-   `packages/storage/src/s3-adapter.ts` - Implement S3 signed URLs
-   `packages/storage/index.ts` - Export new functions

**Implementation**:

```typescript
// packages/storage/src/interface.ts
export interface StorageAdapter extends CheckpointStorage {
	getSignedUrl(key: string, expiresIn?: number): Promise<string>;
	getSignedUploadUrl(
		key: string,
		contentType: string,
		expiresIn?: number
	): Promise<{
		url: string;
		key: string;
		fields?: Record<string, string>;
	}>;
}

// packages/storage/src/adapters/s3.ts (new file)
import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3Adapter implements StorageAdapter {
	async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
		const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
		return awsGetSignedUrl(this.client, command, { expiresIn });
	}

	async getSignedUploadUrl(
		key: string,
		contentType: string,
		expiresIn = 3600
	) {
		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: key,
			ContentType: contentType,
		});
		const url = await awsGetSignedUrl(this.client, command, { expiresIn });
		return { url, key };
	}
}

// packages/storage/index.ts
export * from "./src/interface";
export * from "./src/adapters/fs";
export * from "./src/adapters/s3"; // Add S3 adapter
```

**Validates**: 3 import errors resolved

#### Task 1.3: Fix Documentation or Remove Routes (45 min)

**Option A: Complete Fumadocs Setup** (Recommended)

```bash
# Install missing dependency
pnpm add fumadocs-mdx --filter @snapback/web

# Generate .map file
pnpm --filter web run build:docs
```

**Option B: Remove Broken Documentation** (Faster)

```bash
# Remove docs routes
rm -rf apps/web/app/(marketing)/docs
rm apps/web/app/docs-source.ts
rm apps/web/app/api/docs-search/route.ts

# Update navigation to remove docs links
```

**Recommendation**: Option A - Documentation is valuable, fix the infrastructure

**Validates**: 5 docs-related errors resolved

### Priority 2: Type Consistency (FUNCTIONAL) - 1.5 hours

#### Task 2.1: Remove Locale from Mail Calls (30 min)

**Files**: 3 files in packages/auth/auth.ts

```typescript
// BEFORE:
await sendEmail({
	to: user.email,
	templateId: "emailVerification",
	context: { url, name: user.name },
	locale: user.locale ?? "en", // ❌ Remove this
});

// AFTER:
await sendEmail({
	to: user.email,
	templateId: "emailVerification",
	context: { url, name: user.name },
});
```

**Also**: packages/api/modules/contact/procedures/submit-contact-form.ts

**Validates**: 4 locale parameter errors resolved

#### Task 2.2: Replace next-intl Formatters (45 min)

**Files**: 5 SaaS components

```typescript
// Create shared formatter utility
// apps/web/lib/formatters.ts
export const formatDate = (
	date: Date,
	options?: Intl.DateTimeFormatOptions
) => {
	return new Intl.DateTimeFormat("en-US", options).format(date);
};

export const formatCurrency = (amount: number, currency = "USD") => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(amount);
};

export const formatNumber = (num: number) => {
	return new Intl.NumberFormat("en-US").format(num);
};

// Update components
import { formatDate, formatCurrency } from "@/lib/formatters";
// Replace useFormatter() calls
```

**Validates**: 5 next-intl import errors resolved

#### Task 2.3: Fix Webhook Type Issues (15 min)

**File**: packages/api/modules/webhooks/inapp-messaging.ts

```typescript
// Add missing properties to user type or use safe access
const totalCheckpoints = (user as any).totalCheckpoints ?? 0;
const totalRecoveries = (user as any).totalRecoveries ?? 0;

// Fix error type narrowing
try {
	// ...
} catch (error) {
	if (error instanceof Error) {
		logger.error(error.message);
	}
}
```

**Validates**: 8 webhook errors resolved

### Priority 3: Polish & Cleanup (OPTIONAL) - 1 hour

#### Task 3.1: Fix Pricing Component Types (20 min)

Add missing properties or adjust component interface

#### Task 3.2: Update Analytics Service (15 min)

Fix function signature mismatches

#### Task 3.3: Clean Documentation References (25 min)

Update MDX files and READMEs to remove @repo/ references

---

## Section 5: Risk Assessment & Mitigation

### High Risk Areas

#### Risk 1: Storage Package Implementation

**Risk Level**: HIGH
**Impact**: Image uploads, avatar uploads, logo uploads all broken
**Likelihood**: Implementation complexity, AWS SDK integration

**Mitigation**:

1. Copy implementation from similar projects (Saasfly, Kirimase have S3 adapters)
2. Test with local MinIO before AWS
3. Feature flag new storage until validated
4. Rollback: Use filesystem adapter temporarily

#### Risk 2: Documentation Infrastructure

**Risk Level**: MEDIUM
**Impact**: All /docs routes 404 or error
**Likelihood**: Configuration complexity with fumadocs

**Mitigation**:

1. Follow fumadocs official setup guide exactly
2. Check .map generation in build pipeline
3. Rollback: Remove docs routes temporarily, add back later

#### Risk 3: Type System Cascade

**Risk Level**: MEDIUM
**Impact**: Fix one type, break another (locale removal ripple effects)
**Likelihood**: 46 errors suggest interconnected issues

**Mitigation**:

1. Fix in dependency order: types → implementations → callers
2. Type check after each fix
3. Commit after each green build
4. Use TypeScript's "Go to Type Definition" to trace dependencies

### Rollback Strategy

**Checkpoint Plan**:

1. **Pre-work**: Create checkpoint branch
2. **After Priority 1**: Commit "Core infrastructure fixes"
3. **After Priority 2**: Commit "Type consistency fixes"
4. **After Priority 3**: Commit "Polish and cleanup"

**Rollback Triggers**:

-   Build time increases >50%
-   Runtime errors in production patterns
-   More than 2 hours beyond estimate

**Rollback Process**:

```bash
git log --oneline
git revert <commit-hash>  # Surgical revert
# OR
git reset --hard <last-good-commit>  # Full rollback
```

---

## Section 6: Validation Checkpoints

### After Each Priority Level:

#### ✅ Priority 1 Complete:

```bash
# Database exports working
pnpm --filter @snapback/database run build
# Should succeed

# Storage package compiles
pnpm --filter @snapback/storage run build
# Should succeed

# Web app type checks
pnpm --filter web run type-check
# Should drop from 46 errors → ~30 errors (docs/formatting remain)

# Can import deviceTrials
grep "deviceTrials" apps/web/app/api/v1/user/me/route.ts
# Should import successfully
```

#### ✅ Priority 2 Complete:

```bash
# No locale parameters
grep -r "locale:" packages/auth --include="*.ts"
# Should return 0 results in sendEmail calls

# No next-intl imports
grep -r "next-intl" apps/web/modules/saas --include="*.tsx"
# Should return 0 results

# Type check
pnpm --filter web run type-check
# Should have <10 errors (only minor polish issues)
```

#### ✅ Priority 3 Complete:

```bash
# Zero TypeScript errors
pnpm --filter web run type-check
# Should succeed with 0 errors

# Build succeeds
pnpm --filter web run build
# Should complete successfully

# Start server
pnpm --filter web run dev
# Should start without errors
```

### End-to-End Validation:

```bash
# Full monorepo build
pnpm build
# Should succeed

# All type checks pass
pnpm type-check
# Should succeed across all packages

# No broken imports
grep -r "from \"@repo/" apps packages --include="*.ts" --include="*.tsx"
# Should return 0 results (excluding docs)

# No i18n imports
grep -r "@i18n/routing\|next-intl" apps/web --include="*.tsx" --include="*.ts"
# Should return 0 results
```

---

## Section 7: Execution Timeline

### Phase 1: Core Infrastructure (Day 1, 2-3 hours)

-   09:00-09:15: Database schema export fix
-   09:15-10:15: Storage package S3 implementation
-   10:15-11:00: Documentation infrastructure (fumadocs setup)
-   11:00-11:15: Validation & commit

**Deliverable**: Core packages compile, imports resolve

### Phase 2: Type Consistency (Day 1, 1.5 hours)

-   11:15-11:45: Remove locale parameters
-   11:45-12:30: Replace next-intl formatters
-   12:30-12:45: Fix webhook type issues
-   12:45-13:00: Validation & commit

**Deliverable**: Type system consistent, <10 errors remain

### Phase 3: Polish & Cleanup (Day 1, 1 hour)

-   14:00-14:20: Fix pricing component
-   14:20-14:35: Update analytics service
-   14:35-15:00: Clean documentation references
-   15:00-15:15: Final validation & commit

**Deliverable**: Zero TypeScript errors, green build

### Phase 4: Testing & Validation (Day 2, 2 hours)

-   Full build test
-   Manual QA of key flows
-   Documentation review
-   Create PR and merge

---

## Section 8: Key Insights & Recommendations

### What We Learned

#### 1. Documentation ≠ Execution

**Insight**: Comprehensive documentation existed but wasn't executed. This suggests:

-   Interruption during implementation
-   Documentation created as plan, not executed
-   Session disconnect mid-cleanup

**Recommendation**: Use TodoWrite for tracking execution state, not just docs

#### 2. Type-First Refactoring Incomplete

**Insight**: Types updated but callers not updated shows incomplete refactoring

-   locale removed from SendEmailParams
-   But 3 callers still pass locale
-   This suggests automated type updates without caller analysis

**Recommendation**: Always trace type changes to all callers before committing

#### 3. Package Exports Are Hidden Dependencies

**Insight**: deviceTrials table exists but not exported = silent dependency

-   Developer knows table exists (can see file)
-   But can't import it (not in index)
-   Error message unclear about root cause

**Recommendation**:

-   Systematic export audits for all packages
-   Barrel file (index.ts) should export everything public
-   Use TypeScript project references for better error messages

#### 4. Infrastructure Assumptions Are Dangerous

**Insight**: .map file expected but no build step creates it

-   Code assumes fumadocs generates .map
-   But fumadocs-mdx not installed
-   No build step configured to generate it

**Recommendation**:

-   Document all build-time dependencies
-   Add build:docs script explicitly
-   Don't assume generated files exist

### Architectural Improvements Needed

#### Improvement 1: Package Completeness Standards

**Current**: Packages half-implemented (storage has checkpoints but not S3)
**Target**: Each package should be feature-complete or clearly marked WIP

**Action**:

-   Storage package: Complete S3 implementation or mark as checkpoint-only
-   Add package README with "Implemented Features" section
-   Use JSDoc @deprecated or @alpha tags for incomplete APIs

#### Improvement 2: Type Safety Enforcement

**Current**: Types updated, callers not updated (locale parameter mismatch)
**Target**: Breaking type changes require caller updates in same commit

**Action**:

-   Add pre-commit hook for type checking
-   CI fails on type errors (currently passes with errors)
-   Use TypeScript strict mode in all packages

#### Improvement 3: Documentation Build Pipeline

**Current**: Documentation infrastructure incomplete (fumadocs half-setup)
**Target**: Documentation builds as part of standard pipeline

**Action**:

-   Add build:docs script to web package
-   Generate .map file in build pipeline
-   Add documentation validation to CI

---

## Section 9: Immediate Next Steps

### Step 1: Acknowledge Current State (5 min)

✅ Understand that cleanup was documented but not executed
✅ Accept that infrastructure gaps exist beyond i18n
✅ Recognize this will take 4-6 hours to fully resolve

### Step 2: Create Work Branch (5 min)

```bash
git checkout -b fix/cleanup-implementation-gaps
git commit --allow-empty -m "checkpoint: starting cleanup implementation"
```

### Step 3: Execute Priority 1 (2-3 hours)

Follow Task 1.1, 1.2, 1.3 from Section 4
Commit after each task
Validate: TypeScript errors should drop to ~20

### Step 4: Execute Priority 2 (1.5 hours)

Follow Task 2.1, 2.2, 2.3 from Section 4
Commit after each task
Validate: TypeScript errors should drop to <5

### Step 5: Execute Priority 3 (1 hour)

Follow Task 3.1, 3.2, 3.3 from Section 4
Commit after completion
Validate: Zero TypeScript errors, green build

### Step 6: Final Validation & PR (30 min)

Run full test suite
Create comprehensive PR
Merge to main

---

## Appendix A: Complete Error Inventory

### Database Errors (4)

```
app/api/v1/user/me/route.ts:3 - deviceTrials not exported
lib/stripe-webhook-handlers.ts:3 - deviceTrials not exported
middleware/auth.ts:5 - deviceTrials not exported
middleware/usage-tracking.ts:2 - deviceTrials not exported
```

### Storage Errors (3)

```
app/image-proxy/[...path]/route.ts:2 - getSignedUrl not exported
packages/api/modules/organizations/procedures/create-logo-upload-url.ts:4 - getSignedUploadUrl not exported
packages/api/modules/users/procedures/create-avatar-upload-url.ts:2 - getSignedUploadUrl not exported
```

### Documentation Errors (5)

```
app/docs-source.ts:1 - Cannot find @/.map
app/docs-source.ts:3 - Cannot find fumadocs-mdx
app/(marketing)/docs/[[...path]]/layout.tsx:4 - Cannot find docs-source
app/(marketing)/docs/[[...path]]/page.tsx:3 - Cannot find docs-source
app/api/docs-search/route.ts:9 - Type mismatch in docs index
```

### Locale/I18N Errors (9)

```
packages/auth/auth.ts:148 - locale property doesn't exist
packages/auth/auth.ts:215 - locale property doesn't exist
packages/auth/auth.ts:238 - locale property doesn't exist
packages/api/modules/contact/procedures/submit-contact-form.ts:23 - locale doesn't exist
modules/saas/organizations/components/OrganizationInvitationsList.tsx:37 - next-intl not found
modules/saas/payments/components/ActivePlan.tsx:7 - next-intl not found
modules/saas/payments/components/PricingTable.tsx:20 - next-intl not found
modules/saas/settings/components/PasskeysBlock.tsx:9 - next-intl not found
modules/saas/start/components/StatsTile.tsx:6 - next-intl not found
```

### Type/Property Errors (12)

```
app/(marketing)/(home)/page.tsx:34 - source property doesn't exist
modules/marketing/components/sections/pricing-section-enhanced.tsx:24 - missing persona/headline
modules/marketing/components/sections/pricing-section-enhanced.tsx:109 - guarantees doesn't exist
modules/marketing/components/sections/pricing-section-enhanced.tsx:143 - faq doesn't exist
packages/api/modules/webhooks/inapp-messaging.ts:226 - totalCheckpoints doesn't exist
packages/api/modules/webhooks/inapp-messaging.ts:227 - totalRecoveries doesn't exist
packages/api/modules/webhooks/inapp-messaging.ts:112,157,180,279,343 - error is unknown (5 instances)
packages/api/modules/webhooks/inapp-messaging.ts:263 - Promise not callable
```

### Misc Errors (13)

```
app/(marketing)/docs/[[...path]]/page.tsx:49 - page parameter any type
app/(marketing)/docs/[[...path]]/layout.tsx:5 - DocsFooter not found
app/(marketing)/docs/[[...path]]/page.tsx:4 - mdx-components not found
app/api/docs-search/route.ts:13 - structuredData doesn't exist
packages/api/modules/newsletter/procedures/subscribe-to-newsletter.ts:108 - {} not assignable to undefined
packages/api/modules/webhooks/posthog-handler.ts:6 - next/server not found
packages/auth/auth.ts:39 - null not assignable to DB
services/analytics.ts:20 - Expected 1 arg, got 3
services/analytics.ts:35 - Expected 1 arg, got 3
```

**Total: 46 errors across 35 files**

---

## Appendix B: Quick Reference Commands

### Check Current State

```bash
# I18N removal status
grep -r "@i18n/routing" apps/web --include="*.tsx" | wc -l
grep -r "next-intl" apps/web --include="*.tsx" | wc -l

# @repo migration status
grep -r "@repo/" --include="*.ts" --include="*.tsx" | grep -v ".archive\|claudedocs\|node_modules" | wc -l

# TypeScript errors
pnpm --filter web run type-check 2>&1 | grep "error TS" | wc -l

# Build status
pnpm --filter web run build 2>&1 | head -20
```

### Fix Validation

```bash
# After database fix
grep "export.*device-trials" packages/database/drizzle/schema/snapback/index.ts

# After storage fix
grep "getSignedUrl\|getSignedUploadUrl" packages/storage/index.ts

# After locale fix
grep -r "locale:" packages/auth --include="*.ts" | grep sendEmail
```

### Rollback Commands

```bash
# Show commits
git log --oneline -10

# Revert last commit
git revert HEAD

# Reset to specific commit
git reset --hard <commit-hash>
```

---

## Conclusion

**Current Reality**: The codebase has 46 TypeScript errors across 35 files, primarily due to:

1. Missing database exports (4 errors)
2. Incomplete storage package (3 errors)
3. Broken documentation infrastructure (5 errors)
4. Incomplete i18n removal (9 errors)
5. Various type/property mismatches (25 errors)

**Critical Path**:

-   Priority 1 tasks are BLOCKERS (must complete to build)
-   Priority 2 tasks are FUNCTIONAL (system works but incomplete)
-   Priority 3 tasks are POLISH (cosmetic/minor)

**Time Estimate**: 4-6 hours of focused development to reach green compilation

**Recommended Approach**:

1. Execute Priority 1 first (core infrastructure)
2. Validate and commit
3. Execute Priority 2 (type consistency)
4. Validate and commit
5. Execute Priority 3 if time permits (polish)

**Success Criteria**:

-   ✅ Zero TypeScript errors
-   ✅ `pnpm build` succeeds
-   ✅ `pnpm dev` starts without errors
-   ✅ All packages export what they should
-   ✅ No i18n references remain
-   ✅ Documentation routes work OR are removed

**Next Action**: Review this analysis, then execute Section 9 Step 2 (create work branch) and begin Priority 1 implementation.
