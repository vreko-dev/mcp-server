# Phase 1 Quick Start: Result<T,E> Pattern Implementation

**Objective**: Standardize error handling across SnapBack packages using the Result type pattern
**Timeline**: 6 days
**Status**: Ready to Start

---

## Prerequisites

- [x] SnapBack snapshot created before starting
- [ ] TypeScript 5.9+ configured
- [ ] Biome linter enabled
- [ ] Test suite passing

---

## Day 1: Error Handling Audit

### 1.1 Find Current Throw Patterns

```bash
# Search for throw statements in business logic
grep -r "throw new" packages/sdk packages/mcp apps/api \
  --include="*.ts" \
  --exclude="*.test.ts" \
  --exclude="*.spec.ts" \
  > /tmp/error-audit.txt

# Count occurrences
wc -l /tmp/error-audit.txt
```

### 1.2 Categorize Errors

Create a spreadsheet or markdown table:

| File | Function | Error Type | Severity | Priority |
|------|----------|------------|----------|----------|
| `packages/sdk/src/snapshot/create.ts` | `createSnapshot` | `SnapshotCreationError` | High | P0 |
| `packages/mcp/src/tools/snapshot.ts` | `handleCreate` | `ValidationError` | High | P0 |
| `apps/api/modules/snapshots/create.ts` | `createSnapshotHandler` | `ApiError` | Medium | P1 |

### 1.3 Identify High-Traffic Functions

```typescript
// List of functions to prioritize (based on usage frequency)
const highTrafficFunctions = [
  'createSnapshot',        // packages/sdk
  'restoreSnapshot',       // packages/sdk
  'validateSnapshot',      // packages/sdk
  'handleMcpRequest',      // packages/mcp
  'createSnapshotHandler', // apps/api
];
```

**Deliverable**: Error audit document with prioritized refactoring list

---

## Day 2: Error Hierarchy Implementation

### 2.1 Create Base Error Class

```typescript
// packages/contracts/src/errors/base.ts
export class SnapBackError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintain stack trace in V8 engines (Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
      cause: this.cause ? {
        message: this.cause.message,
        stack: this.cause.stack,
      } : undefined,
    };
  }
}
```

### 2.2 Create Domain-Specific Errors

```typescript
// packages/contracts/src/errors/snapshot.ts
export class SnapshotError extends SnapBackError {
  constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
    super(message, code, context, cause);
  }
}

export class SnapshotCreationError extends SnapshotError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    super(message, 'SNAPSHOT_CREATION_ERROR', context, cause);
  }
}

export class SnapshotNotFoundError extends SnapshotError {
  constructor(snapshotId: string, cause?: Error) {
    super(
      `Snapshot not found: ${snapshotId}`,
      'SNAPSHOT_NOT_FOUND',
      { snapshotId },
      cause
    );
  }
}

export class SnapshotValidationError extends SnapshotError {
  constructor(
    message: string,
    public readonly violations: string[],
    cause?: Error
  ) {
    super(message, 'SNAPSHOT_VALIDATION_ERROR', { violations }, cause);
  }
}

// packages/contracts/src/errors/storage.ts
export class StorageError extends SnapBackError {
  constructor(message: string, code: string, context?: Record<string, unknown>, cause?: Error) {
    super(message, code, context, cause);
  }
}

export class StorageLockError extends StorageError {
  constructor(resource: string, cause?: Error) {
    super(
      `Resource locked: ${resource}`,
      'STORAGE_LOCK_ERROR',
      { resource, retryable: true },
      cause
    );
  }
}

export class StorageFullError extends StorageError {
  constructor(required: number, available: number, cause?: Error) {
    super(
      `Disk full: ${required}MB required, ${available}MB available`,
      'STORAGE_FULL_ERROR',
      { required, available, retryable: false },
      cause
    );
  }
}
```

### 2.3 Create Error Type Guards

```typescript
// packages/contracts/src/errors/guards.ts
export function isSnapBackError(error: unknown): error is SnapBackError {
  return error instanceof SnapBackError;
}

export function isSnapshotError(error: unknown): error is SnapshotError {
  return error instanceof SnapshotError;
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

export function isRetryableError(error: unknown): boolean {
  if (isSnapBackError(error)) {
    return error.context?.retryable === true;
  }
  return false;
}
```

### 2.4 Update Package Exports

```typescript
// packages/contracts/src/errors/index.ts
export * from './base.js';
export * from './snapshot.js';
export * from './storage.js';
export * from './guards.js';

// packages/contracts/src/index.ts
export * from './errors/index.js';
```

**Deliverable**: Complete error hierarchy in `@snapback/contracts`

---

## Day 3-5: SDK Refactoring

### 3.1 Convert Snapshot Operations (Day 3)

**Before** (Throws):
```typescript
// packages/sdk/src/snapshot/create.ts
export async function createSnapshot(
  files: string[]
): Promise<Snapshot> {
  if (files.length === 0) {
    throw new ValidationError('No files provided');
  }

  const snapshot = await storage.save(files);
  return snapshot;
}
```

**After** (Returns Result):
```typescript
// packages/sdk/src/snapshot/create.ts
import { ok, err, Result } from '@snapback-oss/sdk';
import { SnapshotCreationError, ValidationError } from '@snapback/contracts';

export async function createSnapshot(
  files: string[]
): Promise<Result<Snapshot, SnapshotCreationError | ValidationError>> {
  if (files.length === 0) {
    return err(new ValidationError('No files provided'));
  }

  try {
    const snapshot = await storage.save(files);
    return ok(snapshot);
  } catch (error) {
    return err(new SnapshotCreationError(
      'Failed to save snapshot',
      { fileCount: files.length },
      toError(error)
    ));
  }
}
```

### 3.2 Update Callers (Day 3)

**Before**:
```typescript
try {
  const snapshot = await createSnapshot(files);
  console.log('Created:', snapshot.id);
} catch (error) {
  console.error('Failed:', error);
}
```

**After**:
```typescript
const result = await createSnapshot(files);
result
  .map(snapshot => {
    console.log('Created:', snapshot.id);
    return snapshot;
  })
  .mapErr(error => {
    logger.error('Failed to create snapshot', {
      code: error.code,
      message: error.message,
      context: error.context,
    });
    return error;
  });
```

### 3.3 Add Helper Utilities (Day 4)

```typescript
// packages/sdk/src/utils/result-helpers.ts
import { ok, err, Result } from '@snapback-oss/sdk';
import { toError } from './error.js';

/**
 * Convert a Promise to a Result
 */
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(toError(error));
  }
}

/**
 * Sequence multiple Results into a single Result
 */
export function sequence<T, E>(
  results: Result<T, E>[]
): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.value);
  }
  return ok(values);
}

/**
 * Combine Results with a function
 */
export function combine<T, U, E>(
  resultA: Result<T, E>,
  resultB: Result<U, E>,
  fn: (a: T, b: U) => Result<V, E>
): Result<V, E> {
  if (isErr(resultA)) return resultA;
  if (isErr(resultB)) return resultB;
  return fn(resultA.value, resultB.value);
}

/**
 * Async map over Result
 */
export async function mapAsync<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<U>
): Promise<Result<U, E>> {
  if (isErr(result)) {
    return result;
  }
  try {
    const mapped = await fn(result.value);
    return ok(mapped);
  } catch (error) {
    return err(toError(error) as E);
  }
}
```

### 3.4 Update Tests (Day 5)

```typescript
// packages/sdk/src/snapshot/create.test.ts
import { describe, it, expect } from 'vitest';
import { createSnapshot } from './create';
import { isOk, isErr } from '@snapback-oss/sdk';

describe('createSnapshot', () => {
  it('returns Ok with valid files', async () => {
    const result = await createSnapshot(['file1.ts', 'file2.ts']);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveProperty('id');
      expect(result.value.files).toHaveLength(2);
    }
  });

  it('returns Err with empty files', async () => {
    const result = await createSnapshot([]);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('No files');
    }
  });

  it('returns Err on storage failure', async () => {
    // Mock storage failure
    vi.spyOn(storage, 'save').mockRejectedValue(new Error('Disk full'));

    const result = await createSnapshot(['file.ts']);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('SNAPSHOT_CREATION_ERROR');
      expect(result.error.cause?.message).toBe('Disk full');
    }
  });
});
```

**Deliverable**: SDK refactored to use Result pattern with tests

---

## Day 6: Documentation & Migration Guide

### 6.1 Create Migration Guide

```markdown
# Result Pattern Migration Guide

## For Library Consumers

### Before (Throwing API)
\`\`\`typescript
try {
  const snapshot = await createSnapshot(files);
  console.log('Created:', snapshot.id);
} catch (error) {
  console.error('Failed:', error);
}
\`\`\`

### After (Result API)
\`\`\`typescript
const result = await createSnapshot(files);
if (isOk(result)) {
  console.log('Created:', result.value.id);
} else {
  console.error('Failed:', result.error.message);
}
\`\`\`

## For Library Authors

### Returning Results
\`\`\`typescript
// ✅ Good
export async function myOperation(): Promise<Result<Data, MyError>> {
  if (!validated) {
    return err(new ValidationError('...'));
  }
  return ok(data);
}

// ❌ Bad - Mixing throw and Result
export async function myOperation(): Promise<Result<Data, MyError>> {
  if (!validated) {
    throw new Error('...'); // Don't do this!
  }
  return ok(data);
}
\`\`\`

### Error Chaining
\`\`\`typescript
try {
  const data = await externalAPI();
  return ok(data);
} catch (error) {
  // ✅ Chain the error for debugging
  return err(new MyOperationError(
    'Operation failed',
    { context: 'info' },
    toError(error) // Original error as cause
  ));
}
\`\`\`
\`\`\`

### 6.2 Update API Documentation

Add to each refactored function:

```typescript
/**
 * Create a snapshot of the specified files.
 *
 * @param files - Array of file paths to snapshot
 * @returns Result containing the created Snapshot or an error
 *
 * @example
 * ```typescript
 * const result = await createSnapshot(['src/index.ts']);
 *
 * result
 *   .map(snapshot => console.log('Created:', snapshot.id))
 *   .mapErr(error => console.error('Failed:', error.message));
 * ```
 *
 * @since 2.0.0
 * @see {@link Snapshot}
 * @see {@link SnapshotCreationError}
 */
export async function createSnapshot(
  files: string[]
): Promise<Result<Snapshot, SnapshotCreationError | ValidationError>>
```

**Deliverable**: Migration guide and updated API docs

---

## Testing Checklist

- [ ] All unit tests passing
- [ ] Integration tests updated
- [ ] Error paths covered (>90%)
- [ ] Type checking passes
- [ ] Biome linting passes
- [ ] Documentation updated
- [ ] Migration guide complete

---

## Rollout Strategy

### Week 1: SDK Only
- Deploy SDK with Result pattern
- Keep old throwing APIs with `@deprecated` tags
- Monitor error rates in production

### Week 2: MCP Integration
- Update MCP tools to use new SDK
- Test with Cursor/Claude
- Monitor MCP tool success rates

### Week 3: API & Extension
- Update API endpoints
- Update VS Code extension
- Full rollout

### Week 4: Cleanup
- Remove deprecated throwing APIs
- Update all documentation
- Announce breaking change

---

## Monitoring

Track these metrics post-deployment:

```typescript
// packages/infrastructure/src/telemetry/error-tracking.ts
export function trackErrorHandling(error: SnapBackError) {
  posthog.capture('error_handled', {
    error_code: error.code,
    error_name: error.name,
    has_cause: !!error.cause,
    has_context: !!error.context,
    retryable: error.context?.retryable,
  });
}
```

**Dashboard Metrics**:
- Error rate by code (SNAPSHOT_CREATION_ERROR, etc.)
- Retry success rate
- Error chain depth (how many nested causes)
- Time to resolution

---

## Common Pitfalls

### ❌ Don't Mix Patterns
```typescript
// BAD: Mixing throw and Result
async function bad(): Promise<Result<Data, Error>> {
  if (!valid) throw new Error(); // ❌ Don't throw
  return ok(data);
}
```

### ❌ Don't Ignore Errors
```typescript
// BAD: Silent failure
const result = await createSnapshot(files);
// ... no error handling
```

### ❌ Don't Lose Context
```typescript
// BAD: Generic error
catch (error) {
  return err(new Error('Failed')); // ❌ Lost original error
}

// GOOD: Chain the error
catch (error) {
  return err(new MyError('Failed', {}, toError(error))); // ✅
}
```

---

## Success Criteria

✅ **Phase 1 Complete When**:
- [ ] All SDK public functions return Result<T, E>
- [ ] No `throw` statements in business logic
- [ ] Test coverage >90% for error paths
- [ ] Migration guide published
- [ ] At least one consuming package (MCP or API) updated

---

## Next Steps After Phase 1

Once Phase 1 is complete, proceed to Phase 2:
- 7-Layer Validation Pipeline
- Retry Logic Integration
- MCP Tool Standardization

See [AUDIT_IMPLEMENTATION_PLAN.md](./AUDIT_IMPLEMENTATION_PLAN.md) for full roadmap.

---

**Last Updated**: December 25, 2025
**Status**: Ready to Start
**Estimated Completion**: January 1, 2026
