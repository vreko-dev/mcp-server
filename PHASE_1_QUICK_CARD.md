# Phase 1 Quick Reference Card

**Print this or keep it open while refactoring!**

---

## Finding #7: Batch Processing (15 min)

### Files
```
packages/core/src/risk-analyzer.ts:L93
apps/vscode/src/operationCoordinator.ts:L593
```

### Pattern
```typescript
// REMOVE THIS
for (let i = 0; i < items.length; i += size) {
  const batch = items.slice(i, i + size);
  // ...
}

// REPLACE WITH THIS
import { chunk } from 'es-toolkit';
const batches = chunk(items, size);
for (const batch of batches) {
  // ...
}
```

### Verify
```bash
grep -n "i += batch\|i += BATCH" packages/core/src/risk-analyzer.ts apps/vscode/src/operationCoordinator.ts
# Should show NO matches
```

---

## Finding #2: Deep Cloning (30 min)

### Files (8 total)
```
packages/analytics/src/client.ts:L202
packages/analytics/src/redaction.ts:L76, L156
packages/core/src/security-validator.ts:L11
packages/sdk/src/config/Thresholds.ts:L556
packages/sdk/src/privacy/sanitizer.ts:L85
packages/sdk/src/storage/MemoryStorage.ts:L79
packages/sdk/tests/redaction.e2e.test.ts:L81
```

### Pattern
```typescript
// REMOVE THIS
const copy = JSON.parse(JSON.stringify(obj));

// REPLACE WITH THIS (no import needed!)
const copy = structuredClone(obj);
```

### Verify
```bash
grep -r "JSON.parse(JSON.stringify" packages --include="*.ts"
# Should show NO matches
```

---

## Finding #1: ID Generation (45 min)

### Step 1: Create File
Create: `packages/contracts/src/id-generator.ts`

```typescript
import { nanoid } from 'nanoid';

export function generateId(size: number = 12): string {
  return nanoid(size);
}

export function generatePrefixedId(prefix: string, size: number = 12): string {
  return `${prefix}_${nanoid(size)}`;
}

export function generateBatchId(): string {
  return `batch_${Date.now()}_${nanoid(10)}`;
}
```

### Step 2: Replace in 12 Files

**List of files:**
```
packages/analytics/src/client.ts:L372
packages/auth/__tests__/utils/test-helpers.ts:L14
packages/contracts/src/types/snapshot.ts:L247
packages/core/src/audit/logger.ts:L51
packages/infrastructure/src/posthog/alerts.ts:L59
packages/infrastructure/src/tracing/telemetry-client.ts:L200
packages/sdk/src/helpers.ts:L170
packages/sdk/src/qos.ts:L209
packages/sdk/src/snapshots.ts:L116
packages/sdk/src/storage/StorageBroker.ts:L19, L193
packages/sdk/tests/setup.ts:L18
```

### Pattern
```typescript
// REMOVE THIS (any of these variations)
Math.random().toString(36).substring(2, 9)
Math.random().toString(36).substr(2, 9)
Math.random().toString(36).slice(2, 9)
Math.random().toString(36).substring(7)
`${Date.now()}-${Math.random()...}`

// REPLACE WITH THIS
import { generateId, generateBatchId, generatePrefixedId } from '@snapback/contracts';

// Simple ID
const id = generateId();
const id = generateId(12);

// Batch ID
const batchId = generateBatchId();

// Prefixed ID
const prefixedId = generatePrefixedId('snapshot');
```

### Verify
```bash
grep -r "Math.random().toString(36)" packages --include="*.ts"
# Should show NO matches

grep -r "generateId\|generateBatchId" packages --include="*.ts"
# Should show imports from @snapback/contracts
```

---

## Testing Checklist

### After Each Finding
- [ ] Run: `pnpm test:changed` (test affected modules)
- [ ] Run: `pnpm type-check` (no type errors)
- [ ] Use grep to verify pattern removed
- [ ] Commit: `git commit -m "refactor: eliminate finding #X"`

### After All 3 Findings
- [ ] Run: `pnpm test` (full suite)
- [ ] Run: `pnpm build` (no build errors)
- [ ] Run: `pnpm type-check` (no type errors)
- [ ] Push: `git push origin refactor/wheel-elimination`

---

## Commands Quick Reference

```bash
# Create branch
git checkout -b refactor/wheel-elimination

# After Finding #7
pnpm test packages/core apps/vscode
git commit -m "refactor: eliminate finding #7 (batch processing)"

# After Finding #2
pnpm test packages/analytics packages/core packages/sdk
git commit -m "refactor: eliminate finding #2 (deep cloning)"

# After Finding #1
pnpm test packages/contracts packages/analytics packages/auth packages/core packages/infrastructure packages/sdk
git commit -m "refactor: eliminate finding #1 (id generation)"

# Final
pnpm test
pnpm build
git push origin refactor/wheel-elimination
```

---

## Common Mistakes to Avoid

❌ **Don't:** Forget to import from the id-generator  
✅ **Do:** Add `import { generateId } from '@snapback/contracts'`

❌ **Don't:** Test all 3 findings together  
✅ **Do:** Test after each finding separately

❌ **Don't:** Use JSON.parse/stringify anywhere  
✅ **Do:** Use structuredClone (no import needed!)

❌ **Don't:** Create custom ID generation in each file  
✅ **Do:** Use the centralized `generateId()` function

---

## Time Tracking

| Finding | Est. Time | Actual | Status |
|---------|-----------|--------|--------|
| #7 | 15 min | _____ | ⬜ |
| #2 | 30 min | _____ | ⬜ |
| #1 | 45 min | _____ | ⬜ |
| Test | 10 min | _____ | ⬜ |
| **Total** | **90 min** | _____ | ⬜ |

---

## Reference Documents

1. **PHASE_1_EXECUTION_SUMMARY.md** - High-level overview and strategy
2. **PHASE_1_IMPLEMENTATION_PLAN.md** - Detailed line-by-line changes
3. **REFACTORING_QUICK_REFERENCE.md** - Before/after code patterns
4. **This file** - Quick lookup while coding

---

**Good luck! You've got this! 🚀**
