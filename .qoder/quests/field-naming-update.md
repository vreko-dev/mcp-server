# Field Naming Update: BlobStore Documentation Alignment

## Objective

Update JSDoc comments in `apps/vscode/src/storage/BlobStore.ts` to align with the established field naming convention where the `blob` field in `SnapshotFileRef` should be referred to as `blobHash` in documentation for clarity.

## Scope

This is a **documentation-only change** with zero functional impact. The implementation is already correct per audit findings.

## Background

### Current State

The `BlobStore.store()` method returns:
```
{ hash: string; size: number; isNew: boolean }
```

This return value is consumed by `SnapshotStore.create()` at line 70-71:
```
const { hash, size } = await this.blobStore.store(content);
fileRefs[filePath] = { blob: hash, size };
```

The `SnapshotFileRef` type at `apps/vscode/src/storage/types.ts` line 21-26:
```
export interface SnapshotFileRef {
  /** SHA-256 hash of content (blob ID) */
  blob: string;
  /** Original file size in bytes */
  size: number;
}
```

### Issue

The JSDoc comment at line 35 in `BlobStore.ts` states:
```
Store content and return its hash (blob ID).
```

The terminology "blob ID" is ambiguous because:
- The method returns a `hash` field (not `blob`)
- The value ultimately becomes the `blob` field in `SnapshotFileRef`
- Documentation should clarify this is a "blob hash" to distinguish from other hash types

## Changes Required

### File: apps/vscode/src/storage/BlobStore.ts

Update JSDoc comment at line 34-36 from:
```
/**
 * Store content and return its hash (blob ID).
 * If content already exists, returns hash without writing.
 */
```

To:
```
/**
 * Store content and return its content hash (blobHash).
 * If content already exists, returns hash without writing.
 */
```

**Rationale**: Using "blobHash" in documentation aligns with the semantic meaning (a hash identifying blob content) while maintaining the existing `hash` field name in the return type.

## Validation Criteria

1. TypeScript compilation succeeds (no type errors)
2. All existing tests pass without modification
3. JSDoc accurately reflects that the returned `hash` field represents a blob content hash
4. No functional behavior changes

## Impact Analysis

| Aspect | Impact |
|--------|--------|
| Runtime Behavior | None - documentation only |
| Type Safety | None - no type changes |
| API Surface | None - return type unchanged |
| Tests | None - no test changes needed |
| Dependent Code | None - callers unchanged |

## Related Files

Reference only (no changes required):

| File | Purpose |
|------|---------|
| `apps/vscode/src/storage/types.ts` | Defines `SnapshotFileRef` with `blob` field |
| `apps/vscode/src/storage/SnapshotStore.ts` | Consumes `BlobStore.store()` return value |
| `apps/vscode/src/storage/utils/hash.ts` | Implements `hashContent()` utility |

## Risk Assessment

**Risk Level**: Minimal

- Documentation-only change
- No code execution impact
- Existing tests provide regression safety
- Single-line change with clear intent
