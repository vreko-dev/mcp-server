# Quick Reference: Reinvented Wheels Refactoring Guide

**Use this document for quick lookups during refactoring implementation.**

---

## Finding #1: Random ID Generation

### Files to Update (12 instances)
```
❌ /packages/analytics/src/client.ts:L372
❌ /packages/auth/__tests__/utils/test-helpers.ts:L14
❌ /packages/contracts/src/types/snapshot.ts:L247
❌ /packages/core/src/audit/logger.ts:L51
❌ /packages/infrastructure/src/posthog/alerts.ts:L59
❌ /packages/infrastructure/src/tracing/telemetry-client.ts:L200
❌ /packages/sdk/src/helpers.ts:L170
❌ /packages/sdk/src/qos.ts:L209
❌ /packages/sdk/src/snapshots.ts:L116
❌ /packages/sdk/src/storage/StorageBroker.ts:L19
❌ /packages/sdk/src/storage/StorageBroker.ts:L193
❌ /packages/sdk/tests/setup.ts:L18
```

### Before & After

**Current Pattern (All variations):**
```typescript
Math.random().toString(36).substring(2, 9)
Math.random().toString(36).substr(2, 9)
Math.random().toString(36).slice(2, 9)
Math.random().toString(36).substring(7)
`${Date.now()}-${Math.random().toString(36)...}`
```

**Replacement (Choose one approach):**

**Option A: nanoid (Recommended)**
```typescript
import { nanoid } from 'nanoid';

// Replace ALL patterns with:
const id = nanoid();           // 21 chars, URL-safe
const id = nanoid(12);         // 12 chars
const id = `snap-${nanoid()}`;  // With prefix
```

**Option B: cuid2**
```typescript
import { cuid } from '@paralleldrive/cuid2';

const id = cuid();  // Sortable, collision-resistant
```

**Option C: uuid**
```typescript
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4();  // Standard UUID format
```

### Implementation Notes
- All 12 instances can be replaced with identical pattern
- Create `/packages/contracts/src/id-generator.ts` wrapper
- Update all callers to use wrapper function
- Run tests to verify ID generation

---

## Finding #2: Deep Cloning

### Files to Update (8 instances)
```
❌ /packages/analytics/src/client.ts:L202
❌ /packages/analytics/src/redaction.ts:L76
❌ /packages/analytics/src/redaction.ts:L156
❌ /packages/core/src/security-validator.ts:L11
❌ /packages/sdk/src/config/Thresholds.ts:L556
❌ /packages/sdk/src/privacy/sanitizer.ts:L85
❌ /packages/sdk/src/storage/MemoryStorage.ts:L79
❌ /packages/sdk/tests/redaction.e2e.test.ts:L81
```

### Before & After

**Current Pattern:**
```typescript
const copy = JSON.parse(JSON.stringify(obj));
```

**Replacement Options:**

**Option A: structuredClone (Recommended - Native)**
```typescript
const copy = structuredClone(obj);
// Replaces ALL JSON.parse(JSON.stringify()) patterns
```

**Option B: es-toolkit**
```typescript
import { cloneDeep } from 'es-toolkit';

const copy = cloneDeep(obj);
```

### Implementation Notes
- structuredClone is native (no import needed)
- Handles Date, Map, Set, circular references
- Performance: 3-5x faster
- Drop-in replacement for all 8 instances

---

## Finding #3: Manual Retry Logic

### Files to Update (4 instances)

```
❌ /packages/analytics/src/client.ts:L240-264
❌ /apps/vscode/src/services/RemoteMCPClient.ts:L94-103
❌ /packages/platform/src/db/supabase-error-handler.ts:L92-104
❌ /packages/sdk/src/storage/StorageBroker.ts:L400-442
```

### Pattern to Replace

**Current Pattern:**
```typescript
for (let attempt = 0; attempt < maxRetries; attempt++) {
	try {
		// operation
	} catch (error) {
		if (attempt < maxRetries - 1) {
			const delay = baseDelay * Math.pow(2, attempt);
			await sleep(delay);
		}
	}
}
```

### Replacement Pattern

**Using p-retry:**
```typescript
import pRetry from 'p-retry';

// Basic replacement
await pRetry(
	() => operation(),
	{
		retries: maxRetries,
		minTimeout: baseDelay,
		factor: 2,           // Exponential multiplier
		randomize: true,     // ADD JITTER!
		maxTimeout: 60000,   // CAP THE BACKOFF!
	}
);

// With selective retry
await pRetry(
	() => operation(),
	{
		retries: 3,
		shouldRetry: (error) => {
			// Don't retry auth errors
			if (error instanceof AuthenticationError) return false;
			// Do retry network errors
			if (error.code === 'ECONNREFUSED') return true;
			return true;
		},
	}
);

// With callbacks
await pRetry(
	() => operation(),
	{
		retries: 3,
		onFailedAttempt: (error) => {
			logger.warn(`Attempt ${error.attemptNumber} failed, ${error.retriesLeft} retries left`);
		},
	}
);
```

### Implementation Notes
- **IMPORTANT:** Add `randomize: true` to prevent thundering herd
- **IMPORTANT:** Add `maxTimeout` to cap exponential growth
- Test each location with mock failures
- Verify retry behavior matches original

---

## Finding #4: Manual Debounce

### File to Update (1 file)
```
❌ /apps/vscode/src/decorations/FileHealthDecorationProvider.ts
```

### Lines to Update
- L27-28: Remove debounceTimer declaration
- L110-116: Replace setTimeout/clearTimeout in updateFileHealth()
- L160-166: Replace setTimeout/clearTimeout in clearFileHealth()
- L218-220: Remove timer cleanup from dispose()

### Before & After

**Current Pattern:**
```typescript
private debounceTimer: NodeJS.Timeout | null = null;
private readonly DEBOUNCE_DELAY = 50;

updateFileHealth(...): void {
	if (this.debounceTimer) clearTimeout(this.debounceTimer);
	this.debounceTimer = setTimeout(
		() => this.fireBatchedEvents(),
		this.DEBOUNCE_DELAY
	);
}

dispose(): void {
	if (this.debounceTimer) clearTimeout(this.debounceTimer);
}
```

**Replacement:**
```typescript
import { debounce } from 'es-toolkit';

// In constructor or as property
private fireBatchedEvents = debounce(
	() => this.fireBatchedEventsImpl(),
	50,
	{ leading: false, trailing: true }
);

// Usage - no manual timer management
updateFileHealth(...): void {
	this.pendingUpdates.add(uri.fsPath);
	this.fireBatchedEvents(); // Debounced automatically
}

dispose(): void {
	this.fireBatchedEvents.cancel(); // Optional
}

// Rename current fireBatchedEvents to fireBatchedEventsImpl
private fireBatchedEventsImpl(): void {
	// Original implementation
}
```

### Implementation Notes
- Extract original fireBatchedEvents logic to new method
- Create debounced wrapper
- All calls automatically debounced
- Cleanup is automatic

---

## Finding #5: Manual LRU Cache

### File to Update (1 file)
```
❌ /apps/vscode/src/decorations/FileHealthDecorationProvider.ts
```

### Lines to Update
- L13-14: Replace Map initialization with LRU cache
- L37-44: Remove manual LRU access code
- L92-107: Remove manual eviction code
- L197-207: Simplify getFileHealth access

### Before & After

**Current Pattern:**
```typescript
private healthCache = new Map<string, FileHealthStatus>();
private readonly MAX_CACHE_SIZE = 1000;

provideFileDecoration(uri, token): vscode.FileDecoration | undefined {
	const status = this.healthCache.get(uri.fsPath);
	if (status) {
		this.healthCache.delete(uri.fsPath); // Manual LRU
		this.healthCache.set(uri.fsPath, status);
	}
	return status ? decoration : undefined;
}

updateFileHealth(uri, level): void {
	this.healthCache.set(uri.fsPath, status);
	if (this.healthCache.size > MAX_CACHE_SIZE) {
		// Manual eviction - remove first ~10%
		const entriesToDelete = Math.floor(MAX_CACHE_SIZE * 0.1);
		for (const key of this.healthCache.keys()) {
			// ... delete logic
		}
	}
}
```

**Replacement:**
```typescript
import LRU from 'lru-cache';

// In constructor
this.healthCache = new LRU<string, FileHealthStatus>({
	max: 1000,           // Automatic eviction at max
	ttl: 1000 * 60 * 5,  // 5-minute expiration
	updateAgeOnGet: true, // Move to end on access
});

// provideFileDecoration - NO CHANGES to access
const status = this.healthCache.get(uri.fsPath);

// updateFileHealth - NO MANUAL EVICTION
updateFileHealth(uri, level): void {
	this.healthCache.set(uri.fsPath, status);
	// LRU handles eviction automatically!
}

// getFileHealth - simplified
getFileHealth(uri): FileHealthStatus | undefined {
	return this.healthCache.get(uri.fsPath);
}
```

### Implementation Notes
- LRU cache automatically handles access ordering (no manual delete/set)
- TTL expires entries automatically
- No eviction code needed
- Cleaner, fewer lines of code

---

## Finding #6: Manual Queue Operations

### Files to Update (2 files)

```
❌ /packages/sdk/src/storage/StorageBroker.ts
   - Remove: operationQueue, isProcessingQueue
   - Remove: queueOperation method (partially)
   - Remove: processQueue method

❌ /apps/vscode/src/telemetry/OfflineEventQueue.ts
   - Similar refactoring
```

### Before & After

**Current Pattern (StorageBroker):**
```typescript
private operationQueue: QueuedOperation<any>[] = [];
private isProcessingQueue = false;

async queueOperation<T>(
	operationName: string,
	operation: () => Promise<T>,
	priority = 0
): Promise<T> {
	this.operationQueue.push({...});
	if (!this.isProcessingQueue) this.processQueue();
	return new Promise((resolve, reject) => {...});
}

private async processQueue(): Promise<void> {
	while (this.operationQueue.length > 0) {
		const op = this.operationQueue.shift();
		try {
			op.resolve(await op.operation());
		} catch (error) {
			op.reject(error);
		}
	}
}
```

**Replacement:**
```typescript
import PQueue from 'p-queue';

// In constructor
this.operationQueue = new PQueue({
	concurrency: 1,      // Single writer
	timeout: 30000,      // Operation timeout
	throwOnTimeout: true,
});

// Simplified method
async queueOperation<T>(
	operationName: string,
	operation: () => Promise<T>,
	priority = 0
): Promise<T> {
	return this.operationQueue.add(operation, { priority });
}

// Remove processQueue - p-queue handles it!

// For shutdown
async close(): Promise<void> {
	await this.operationQueue.onIdle(); // Wait for pending
	// ... close db
}
```

### Implementation Notes
- p-queue handles operation execution
- Priority actually works now (previous implementation didn't sort by priority!)
- Automatic timeout management
- onIdle() for graceful shutdown

---

## Finding #7: Manual Batch Processing

### Files to Update (2 instances)

```
❌ /packages/core/src/risk-analyzer.ts:L93
❌ /apps/vscode/src/operationCoordinator.ts:L593
```

### Before & After

**Current Pattern:**
```typescript
for (let i = 0; i < items.length; i += batchSize) {
	const batch = items.slice(i, i + batchSize);
	// Process batch
}
```

**Replacement:**
```typescript
import { chunk } from 'es-toolkit';

const batches = chunk(items, batchSize);
for (const batch of batches) {
	// Process batch
}

// Or with concurrent processing
const batches = chunk(items, batchSize);
await Promise.all(batches.map(batch => processBatch(batch)));
```

### Implementation Notes
- Direct replacement of manual slicing logic
- `chunk()` is self-documenting
- Handles remainder automatically
- Already using es-toolkit elsewhere

---

## Execution Order Recommendation

### Week 1 (Quick Wins)
1. **Finding #7:** Batch Processing (15 min) - no imports needed, just logic
2. **Finding #1:** ID Generation (45 min) - fundamental change
3. **Finding #2:** Deep Cloning (30 min) - quick replacements

**Test:** `pnpm test:changed`

### Week 2 (Medium Priority)
4. **Finding #4:** Debounce (25 min) - single file refactor
5. **Finding #5:** LRU Cache (45 min) - single file, combine with debounce PR

**Test:** `pnpm test:changed`

### Week 3 (Async Patterns)
6. **Finding #3:** Retry Logic (105 min) - most complex, 4 locations

**Test:** `pnpm test:changed`, then E2E tests

### Week 4 (Data Structures)
7. **Finding #6:** Queue Operations (70 min) - 2 locations, complex changes

**Test:** `pnpm test`, then monitor storage behavior

---

## Verification Commands

```bash
# Check for any remaining patterns
grep -r "Math.random().toString(36)" . --include="*.ts"
grep -r "JSON.parse(JSON.stringify" . --include="*.ts"
grep -r "clearTimeout" . --include="*.ts" | grep debounce
grep -r "for.*+=.*batchSize" . --include="*.ts"

# Run tests after each change
pnpm test

# Type check
pnpm type-check

# Build verification
pnpm build
```

---

## Common Gotchas

### ❌ Don't forget:
- [ ] Import the replacement library in the file
- [ ] Update package.json imports if needed
- [ ] Run type-check after changes
- [ ] Test with edge cases (empty arrays, null values)
- [ ] Update tests that mock these functions

### ⚠️ Watch out for:
- **Retry logic:** Test with mock failures, verify jitter behavior
- **Queue operations:** Test with concurrent operations
- **Cache:** Verify TTL doesn't break usage patterns
- **ID generation:** Check if any code expects specific ID format

### ✅ Confirm:
- [ ] No type errors after refactoring
- [ ] All tests pass
- [ ] No circular dependencies introduced
- [ ] Performance metrics stable or improved

