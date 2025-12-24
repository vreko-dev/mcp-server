# Snapshot Creation UX Enhancements - Migration Guide

**Version:** v1.1.0 (December 2025)  
**Impact:** Non-breaking enhancement to `snapback.create_snapshot`

---

## What's New

The `create_snapshot` tool has been enhanced with significant UX improvements to bridge the dev/AI gap:

### 🎯 Key Improvements

1. **Pre-flight File Validation** - Checks file existence before attempting to read
2. **Fuzzy Path Matching** - Suggests similar files when path not found
3. **Flexible Error Handling** - Choose how to handle missing files (`error`, `warn`, `skip`)
4. **Rich Error Messages** - Clear context with workspace paths and actionable suggestions
5. **Validation Summary** - Track requested vs included vs skipped files
6. **Path Sanitization** - Secure error messages that don't leak internal paths

---

## Migration Path

### ✅ Backward Compatible

All existing code continues to work without changes:

```typescript
// Old code - still works!
snapback.create_snapshot({
  files: ["src/auth.ts"],
  reason: "Before refactor"
})
```

### 🆕 New Features (Optional)

#### 1. Handle Missing Files Gracefully

**Before:** Errors were cryptic and stopped execution

```typescript
// Old behavior
snapback.create_snapshot({
  files: ["src/auth.ts", "missing.ts"]
})
// ❌ Error: ENOENT: no such file or directory
```

**After:** Clear error with file status

```typescript
// New behavior (default)
snapback.create_snapshot({
  files: ["src/auth.ts", "missing.ts"]
})
// Returns detailed error:
// ⚠️  Snapshot validation found issues
// File status:
//   ✅ src/auth.ts (12.5 KB)
//   ❌ missing.ts
//
// 🔍 Did you mean one of these?
//   1. src/missing-old.ts (85% match)
//      Common pattern: files in src/ directory
```

#### 2. Continue with Valid Files

**New:** Skip missing files and snapshot what exists

```typescript
snapback.create_snapshot({
  files: ["src/auth.ts", "maybe-missing.ts"],
  onMissingFile: "warn" // or "skip"
})
// ✅ Success with validation details:
// {
//   snapshot: { id: "snap_abc123", ... },
//   validation: {
//     requested: 2,
//     included: 1,
//     skipped: 1
//   }
// }
```

#### 3. Get Path Suggestions

**New:** Automatic fuzzy matching for typos

```typescript
snapback.create_snapshot({
  files: ["index.ts"], // Typo - missing 'src/' prefix
  suggestAlternatives: true // Default
})
// Returns:
// 🔍 Did you mean one of these?
//   1. src/index.ts (85% match)
//      Common pattern: files in src/ directory
//   2. app/index.ts (75% match)
//      Try with common extensions
```

---

## Parameter Reference

### New Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `onMissingFile` | `"error" \| "warn" \| "skip"` | `"error"` | **error**: Fail immediately<br>**warn**: Log warning, continue with valid files<br>**skip**: Silently skip missing files |
| `suggestAlternatives` | `boolean` | `true` | Enable fuzzy path matching and suggestions |

### Existing Parameters (Unchanged)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `files` | `string[]` | Required | File paths relative to workspace root |
| `reason` | `string` | Optional | Description of why snapshot is being created |
| `trigger` | Enum | `"mcp"` | Source that triggered snapshot creation |

---

## Response Format Changes

### Enhanced Response

```typescript
{
  success: true,
  snapshot: {
    id: string,
    timestamp: number,
    fileCount: number,
    totalBytes: number,
    // NEW: Validation details
    validation: {
      requested: number,  // Total files requested
      included: number,   // Files successfully included
      skipped: number     // Files skipped (missing/invalid)
    }
  }
}
```

### Error Response

```typescript
{
  success: false,
  error: string, // Enhanced with context and suggestions
  validationResults?: {
    total: number,
    valid: number,
    failed: number,
    files: FileValidationResult[]
  }
}
```

---

## Use Cases

### Use Case 1: Resilient Batch Snapshots

**Scenario:** AI assistant wants to snapshot multiple files, some may not exist

```typescript
// Before: Single failure stops everything
snapback.create_snapshot({
  files: ["src/auth.ts", "src/db.ts", "config/app.json"]
})
// ❌ Fails if ANY file missing

// After: Continue with valid files
snapback.create_snapshot({
  files: ["src/auth.ts", "src/db.ts", "config/app.json"],
  onMissingFile: "warn"
})
// ✅ Creates snapshot with available files, logs warnings for missing ones
```

### Use Case 2: Typo Recovery

**Scenario:** User/AI makes typo in file path

```typescript
// Before: Cryptic error
snapback.create_snapshot({
  files: ["scr/auth.ts"] // Typo: scr instead of src
})
// ❌ ENOENT error

// After: Helpful suggestions
snapback.create_snapshot({
  files: ["scr/auth.ts"],
  suggestAlternatives: true
})
// Returns:
// 🔍 Did you mean: src/auth.ts (95% match)?
```

### Use Case 3: Dynamic File Lists

**Scenario:** AI generates file list from analysis, some files may have been deleted

```typescript
// Snapshot all TypeScript files mentioned in git diff
const changedFiles = getFilesFromGitDiff(); // May include deleted files

snapback.create_snapshot({
  files: changedFiles,
  onMissingFile: "skip", // Silent - we know some may not exist
  reason: "Pre-commit snapshot"
})
// ✅ Snapshots existing files, ignores deleted ones
```

---

## Error Handling Strategies

### Strategy 1: Strict Mode (Default)

**When to use:** Critical snapshots where all files must exist

```typescript
snapback.create_snapshot({
  files: ["src/auth.ts", "src/session.ts"],
  onMissingFile: "error" // Fail fast
})
```

**Result:** Immediate failure with detailed error report

---

### Strategy 2: Best Effort Mode

**When to use:** Opportunistic snapshots, partial is better than nothing

```typescript
snapback.create_snapshot({
  files: dynamicFileList,
  onMissingFile: "warn" // Log but continue
})
```

**Result:** Success with warnings logged, validation summary in response

---

### Strategy 3: Silent Mode

**When to use:** Bulk operations where you expect some failures

```typescript
snapback.create_snapshot({
  files: allPossibleFiles,
  onMissingFile: "skip" // No warnings
})
```

**Result:** Quiet success, check `validation.skipped` for count

---

## Troubleshooting

### Issue: "Absolute paths not allowed"

**Error Message:**
```
❌ Failed to create snapshot
Problem: File not found
  Path requested: /Users/dev/project/src/auth.ts
  Workspace root: /Users/dev/project
  Resolved to: /Users/dev/project/src/auth.ts

⚠️  Absolute paths are not allowed
  Use paths relative to workspace root: /Users/dev/project

Example:
  ❌ /Users/dev/project/src/auth.ts
  ✅ src/auth.ts
```

**Fix:**
```typescript
// ❌ Wrong
files: ["/absolute/path/to/file.ts"]

// ✅ Correct
files: ["src/file.ts"]
```

---

### Issue: No suggestions appearing

**Cause:** `suggestAlternatives: false`

**Fix:**
```typescript
snapback.create_snapshot({
  files: ["missing.ts"],
  suggestAlternatives: true // Ensure enabled
})
```

---

### Issue: All files skipped

**Cause:** All provided paths invalid + `onMissingFile: "skip"`

**Detection:**
```typescript
const result = await snapback.create_snapshot({
  files: ["missing1.ts", "missing2.ts"],
  onMissingFile: "skip"
})

if (result.snapshot.validation.skipped === result.snapshot.validation.requested) {
  console.error("Warning: All files were skipped!")
}
```

---

## Testing Recommendations

### Test Case 1: Happy Path

```typescript
const result = await snapback.create_snapshot({
  files: ["src/index.ts"],
  reason: "Test"
})

assert(result.success === true)
assert(result.snapshot.validation.included === 1)
assert(result.snapshot.validation.skipped === 0)
```

### Test Case 2: Error Mode

```typescript
const result = await snapback.create_snapshot({
  files: ["src/index.ts", "missing.ts"],
  onMissingFile: "error"
})

assert(result.success === false)
assert(result.error.includes("File status:"))
assert(result.error.includes("✅ src/index.ts"))
assert(result.error.includes("❌ missing.ts"))
```

### Test Case 3: Warn Mode

```typescript
const result = await snapback.create_snapshot({
  files: ["src/index.ts", "missing.ts"],
  onMissingFile: "warn"
})

assert(result.success === true)
assert(result.snapshot.validation.included === 1)
assert(result.snapshot.validation.skipped === 1)
```

### Test Case 4: Suggestions

```typescript
const result = await snapback.create_snapshot({
  files: ["index.ts"], // Missing 'src/' prefix
  suggestAlternatives: true
})

assert(result.success === false)
assert(result.error.includes("🔍 Did you mean"))
```

---

## Performance Impact

- **Pre-flight validation:** ~1-5ms per file (filesystem stat calls)
- **Fuzzy matching:** ~10-20ms when file not found (generates variations and checks)
- **Overall impact:** Negligible for typical use (<10 files)

---

## Security Considerations

### Path Sanitization

Error messages sanitize absolute paths to prevent information leakage:

```typescript
// Internal error: "ENOENT: /Users/alice/secret-project/keys.ts"
// Sanitized output: "Failed to read file: ENOENT: /***/keys.ts"
```

### No Data Sent

Pre-flight validation and fuzzy matching are **100% local** - no network calls.

---

## FAQ

**Q: Does this change existing API behavior?**  
A: No, all changes are backward-compatible. Existing code works unchanged.

**Q: Can I disable suggestions?**  
A: Yes, set `suggestAlternatives: false`.

**Q: What if ALL files are missing with `onMissingFile: "warn"`?**  
A: Returns error: "No valid files found. All provided paths failed validation."

**Q: Are suggestions cached?**  
A: No, fuzzy matching runs fresh each time to catch newly created files.

**Q: Can I get ALL suggestions, not just top 3?**  
A: Currently limited to 3 to keep error messages readable. Check `validationResults.files` for full details.

---

## Rollout Plan

1. ✅ **Phase 1 (Dec 2025):** Implementation complete
2. ✅ **Phase 2:** Unit tests (390+ test cases)
3. ✅ **Phase 3:** Documentation updates
4. 🔜 **Phase 4:** E2E tests demonstrating UX improvements
5. 🔜 **Phase 5:** Release v1.1.0 with changelog

---

## Related Documentation

- [MCP Server README](../README.md)
- [Snapshot API Reference](https://docs.snapback.dev/api/snapshots)
- [Error Handling Best Practices](https://docs.snapback.dev/guides/error-handling)

---

**Last Updated:** December 23, 2025  
**Version:** 1.1.0  
**Author:** SnapBack Team
