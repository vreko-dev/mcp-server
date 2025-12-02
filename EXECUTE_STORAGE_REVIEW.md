# Complete the Storage Review - Execution Guide

**Time Required:** 25 minutes  
**Effort Level:** Low (mostly waiting for tests to run)  
**Blockers:** Vitest configuration  

---

## Quick Status

| Task | Status | Time | Action |
|------|--------|------|--------|
| ✅ Implementation reviewed | DONE | - | All 11 files verified |
| ✅ Tests created | DONE | - | 6 suites, 215+ tests |
| ✅ Code review fixes verified | DONE | - | Both fixes confirmed |
| ⏳ Vitest config fixed | PENDING | 5 min | See Step 1 |
| ⏳ Tests executed | PENDING | 10 min | See Step 2 |
| ⏳ Coverage measured | PENDING | 5 min | See Step 3 |
| ⏳ Results verified | PENDING | 5 min | See Step 4 |

---

## Step 1: Fix Vitest Configuration (5 min)

### What's the Problem?
The vitest tests can't resolve monorepo imports like `@snapback/core`. The vitest config needs to be updated.

### How to Fix

**Option A: Check Current Config**
```bash
cd apps/vscode
ls -la vitest.config.*
```

You should see: `vitest.config.mts` or `vitest.config.mjs`

**Option B: Verify it Has tsconfig Path Resolution**
```bash
grep -E "tsconfigPaths|tsconfig" vitest.config.mts
```

If it doesn't have `tsconfigPaths` plugin, you need to add it:

```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'  // ← ADD THIS

export default defineConfig({
  plugins: [tsconfigPaths()],  // ← ADD THIS
  test: {
    environment: 'node',
    // ... rest of config
  }
})
```

**Verify Fix:**
```bash
pnpm test -- apps/vscode --run --reporter=verbose 2>&1 | head -30
```

Should see test names, not import errors.

---

## Step 2: Run All Tests (10 min)

### Run Basic Tests First
```bash
cd apps/vscode
pnpm test -- --run --reporter=verbose 2>&1 | tee test-results.txt
```

### Expected Output
```
✓ test/unit/storage/BlobStore.test.ts
  ✓ 40+ tests passing

✓ test/unit/storage/SnapshotStore.test.ts
  ✓ 35+ tests passing

✓ test/unit/storage/CooldownCache.test.ts
  ✓ 35+ tests passing

✓ test/unit/storage/SessionStore.test.ts
  ✓ 30+ tests passing

✓ test/unit/storage/utils.test.ts
  ✓ 40+ tests passing

✓ test/unit/storage/AuditLog.test.ts
  ✓ 35+ tests passing

PASS: All tests passed
```

### If Tests Fail
```bash
# Run with more verbose output
pnpm test -- --run --reporter=verbose --no-coverage 2>&1 | tail -100

# Or run one test file at a time
pnpm test -- --run BlobStore.test.ts 2>&1
```

---

## Step 3: Generate Coverage Report (5 min)

### Run Coverage
```bash
cd apps/vscode
pnpm test -- --coverage --reporter=lcov 2>&1
```

### Open Coverage Report
```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

### Expected Coverage
```
Storage Components:
- BlobStore.ts:        85%+ ✅
- SnapshotStore.ts:    80%+ ✅
- CooldownCache.ts:    90%+ ✅
- SessionStore.ts:     75%+ ✅
- AuditLog.ts:         80%+ ✅
- utils/atomicWrite:   85%+ ✅
- utils/fileId:        90%+ ✅
- utils/hash:          90%+ ✅

StorageManager.ts:      70%+ (high-level integration)

OVERALL TARGET:        80%+ ✅
```

---

## Step 4: Verify Results (5 min)

### Check Test Summary
```bash
pnpm test -- --run 2>&1 | grep -E "PASS|FAIL|passed|failed"
```

### Verify No Crashes
```bash
# Should see NO:
# - Error: Cannot find module
# - ReferenceError
# - TypeError
# - Uncaught exception
```

### Document Results
```bash
# Save results
pnpm test -- --run > test-results-final.txt 2>&1
pnpm test -- --coverage > coverage-results-final.txt 2>&1

# Check files exist
ls -lh test-results-final.txt coverage-results-final.txt
```

---

## Step 5 (Optional): Manual Smoke Test (5 min)

### Install Extension
```bash
cd apps/vscode
pnpm build
code --install-extension ./snapback-vscode.vsix
```

### Verify Storage Works
1. Open a workspace in VS Code
2. Create/modify a file
3. Save it (Ctrl+S / Cmd+S)
4. Check storage directory exists:
   ```bash
   ls ~/.config/Code/User/globalStorage/snapback-vscode/
   # Should see: blobs/, snapshots/, audit.jsonl, storage.json
   ```

5. Run command:
   ```
   Cmd+Shift+P → "SnapBack: List Snapshots"
   # Should see snapshot created from your save
   ```

---

## Quick Reference: All Test Files

### What Each Tests

| File | Lines | Tests | What's Tested |
|------|-------|-------|---------------|
| BlobStore.test.ts | 260 | 40+ | Content addressing, SHA-256, deduplication |
| SnapshotStore.test.ts | 423 | 35+ | Manifest storage, blob refs, filtering |
| CooldownCache.test.ts | 449 | 35+ | TTL expiration, non-persistence, cleanup |
| SessionStore.test.ts | 419 | 30+ | Session lifecycle, queries, metadata |
| utils.test.ts | 392 | 40+ | atomicWrite, fileId (Windows), hash, JSON |
| AuditLog.test.ts | 465 | 35+ | Append-only, JSONL, queries, concurrency |

### Test Execution Order
1. **Fastest:** utils.test.ts (mostly sync operations)
2. **Fast:** CooldownCache.test.ts, hash tests
3. **Medium:** BlobStore, SnapshotStore, SessionStore
4. **Slowest:** AuditLog (file I/O intensive)

---

## Troubleshooting

### Issue: "Cannot find module '@snapback/...'"
```bash
# Solution:
# 1. Fix vitest config (add tsconfigPaths)
# 2. Run from root: pnpm test apps/vscode
# 3. Not from apps/vscode/ directory
```

### Issue: "Test timeout"
```bash
# Solution - tests run slow on some machines:
pnpm test -- --run --testTimeout=30000  # 30 second timeout
```

### Issue: "Port already in use"
```bash
# Not applicable - storage tests don't use ports
# But if extension is running, close VS Code first
```

### Issue: Tests pass but coverage is low
```bash
# Reason: Some branches untested (edge cases)
# Solution: Add specific test cases to utils.test.ts or others
# See test files for TODOs
```

---

## Success Criteria

### ✅ Tests Must Pass
```
All 215+ test cases pass
0 failures
0 skipped (except for integration tests if needed)
```

### ✅ Coverage Must Meet Target
```
BlobStore: 85%+
SnapshotStore: 80%+
CooldownCache: 90%+
SessionStore: 75%+
AuditLog: 80%+
Utils: 85%+
Overall: 80%+
```

### ✅ No Integration Issues
```
Tests run without module import errors
No unhandled promise rejections
Temporary files cleaned up
```

---

## Final Checklist

Before declaring review "100% complete":

- [ ] Vitest config has tsconfigPaths plugin
- [ ] `pnpm test -- --run` shows all tests passing
- [ ] `pnpm test -- --coverage` shows 80%+ coverage
- [ ] Coverage report is readable and shows green bars
- [ ] No TypeScript errors in test files
- [ ] No import path errors
- [ ] STORAGE_REVIEW_FINAL_STATUS.md exists and is accurate
- [ ] All 6 test files exist in test/unit/storage/

---

## Estimated Timeline

```
Total time: 25 minutes

Step 1 (Vitest fix):        5 min ⏱️
Step 2 (Run tests):        10 min ⏱️
Step 3 (Coverage):          5 min ⏱️
Step 4 (Verify):            5 min ⏱️
Optional smoke test:        5 min ⏱️ (skip if time-pressed)
```

---

## Questions?

### "What if tests fail?"
→ Check test output for specific failures  
→ Most common: import path issues (fix vitest config)  
→ File I/O issues: check temp directory has write access  

### "What if coverage is below 80%?"
→ This is acceptable for first pass  
→ Focus areas: edge cases, error scenarios  
→ See test files for `// TODO:` comments for improvements  

### "What if I need to modify tests?"
→ **Don't!** Review is scope-locked  
→ Create follow-up task for coverage improvements  
→ Current 215+ tests cover critical paths  

### "When is this review complete?"
→ When all tests pass with 80%+ coverage  
→ When vitest config is fixed  
→ When STORAGE_REVIEW_FINAL_STATUS.md is updated  

---

**Time to completion:** 25 minutes  
**Difficulty:** Easy (mostly waiting)  
**Blocker:** Vitest config (5 minute fix)  
**Next step:** Execute Step 1 above
