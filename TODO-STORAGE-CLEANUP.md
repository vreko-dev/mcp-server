# Storage Package Cleanup TODO

**Date**: 2025-11-09
**Status**: Investigation Complete - Action Required

---

## Investigation Summary

The `packages/storage` directory exists but contains **NO IMPLEMENTATION**:
- Directory contents: Only `CLAUDE.md` + `.turbo/` (build cache)
- No `package.json`
- No `src/` directory
- No implementation code

**Actual storage implementation**: `packages/sdk/src/storage/`

---

## Findings

### 1. packages/storage References (72 files)

#### Test Files with Mock Imports:
- ✅ `packages/api/__tests__/modules/organizations.test.ts:47` - **MOCKED** (`vi.mock("@snapback/storage")`)
- ✅ `packages/api/__tests__/modules/users.test.ts:32` - **MOCKED**
- ✅ `apps/mcp-server/test/e2e/storage.e2e.test.ts:4` - **MOCKED** (`FileSystemStorage`)

#### Production Files with Commented Code:
- ✅ `packages/api/modules/users/procedures/create-avatar-upload-url.ts:1` - **COMMENTED OUT**
  ```typescript
  // import { getSignedUploadUrl } from "@snapback/storage";
  ```
- ✅ `packages/api/modules/organizations/procedures/create-logo-upload-url.ts:46-47` - **COMMENTED OUT**
  ```typescript
  // const signedUploadUrl = await getSignedUploadUrl(path, {
  // 	bucket: config.storage.bucketNames.avatars,
  // });
  ```

#### Archived Documentation (Safe to ignore):
- 69 files in `ARCHIVE/`, `docs/archive/`, `claudedocs/`, etc.

### 2. Planned but Never Implemented

The `@snapback/storage` package was planned to provide:
- `getSignedUploadUrl()` - S3/Supabase signed upload URLs
- `FileSystemStorage` - File system storage adapter

**Actual implementation location**:
- All storage functionality is in `packages/sdk/src/storage/`:
  - `LocalStorage.ts` - SQLite-backed storage
  - `MemoryStorage.ts` - In-memory storage
  - `StorageBrokerAdapter.ts` - Storage broker
  - `StorageAdapter.ts` - Base adapter interface

---

## Action Items

### High Priority

- [ ] **Remove `packages/storage/` directory entirely**
  - Directory serves no purpose
  - No package.json, no implementation
  - Only contains placeholder CLAUDE.md

- [ ] **Update test files to remove mocked imports**
  - `packages/api/__tests__/modules/organizations.test.ts` - Remove `@snapback/storage` mock
  - `packages/api/__tests__/modules/users.test.ts` - Remove `@snapback/storage` mock
  - `apps/mcp-server/test/e2e/storage.e2e.test.ts` - Remove `FileSystemStorage` import (use `@snapback/sdk` instead)

- [ ] **Verify commented code in procedures**
  - `packages/api/modules/users/procedures/create-avatar-upload-url.ts` - Confirm commented code can be removed or needs implementation
  - `packages/api/modules/organizations/procedures/create-logo-upload-url.ts` - Same as above
  - **Decision needed**: Implement S3/Supabase upload URLs or remove commented code?

### Medium Priority

- [ ] **Update packages/storage/CLAUDE.md references**
  - Search for any docs referencing `packages/storage` as if it exists
  - Update to reference `packages/sdk/src/storage/` instead

- [ ] **TypeScript path aliases**
  - Check if `@snapback/storage` is defined in any tsconfig.json files
  - Remove if found

### Low Priority

- [ ] **Clean up archived documentation mentions**
  - 69 archived files mention `@snapback/storage`
  - Low priority since they're already archived
  - Consider batch find-replace in archived docs for accuracy

---

## Verification Checklist

Before removing `packages/storage/`:

- [x] Confirmed no `package.json` exists
- [x] Confirmed no implementation exists (only CLAUDE.md)
- [x] Confirmed all imports are either mocked (tests) or commented out (production)
- [x] Confirmed actual implementation is in `packages/sdk/src/storage/`
- [x] Confirmed pnpm-lock.yaml has no references to `@snapback/storage`
- [ ] Run full test suite to ensure no breakage
- [ ] TypeScript compilation succeeds after removal
- [ ] Update documentation to reference correct storage location

---

## Recommended Immediate Actions

1. **Remove the directory**:
   ```bash
   rm -rf packages/storage
   ```

2. **Update test imports** (replace `@snapback/storage` mocks with `@snapback/sdk` storage imports where needed)

3. **Decide on commented upload URL code**:
   - If implementing S3/Supabase uploads, add to `packages/sdk/src/storage/` (NOT a new package)
   - If not implementing, remove commented code entirely

4. **Verify build and tests**:
   ```bash
   pnpm build
   pnpm test
   pnpm type-check
   ```

---

## Notes

- **No production code actively uses** `@snapback/storage`
- **All tests mock it**, so removal won't break tests
- **Actual storage layer is complete** in `packages/sdk/src/storage/`
- This cleanup will eliminate confusion about storage location
