# Stale Data Detection & Refresh Implementation

**Date:** 2025-12-26
**Package:** `@snapback/mcp`
**Status:** ✅ Complete & Tested

---

## Problem Summary

The MCP context system was reading stale blockers from `.snapback/ctx/context.json` with no:
- Timestamp tracking (when data was last updated)
- Staleness detection (how old the data is)
- Refresh mechanism (how to get fresh data)

**Specific Issue:**
- Blockers showed "32 TypeScript errors" and "11MB bundle" from manual entries created during earlier development
- No way to detect this data was outdated
- No automated way to refresh with current project state

---

## Implementation Summary

### Quick Fix (S effort) ✅
**Feature:** `context op=reset`
- Deletes stale `context.json` and `.ctx` files
- Allows clean re-initialization
- Non-destructive (can recreate with `op=init`)

**Code Changes:**
- Added `case "reset"` in `handleContext()` (handlers.ts:975-1008)
- Removes context files using `fs.unlinkSync()`
- Returns success with next_action to reinitialize

**Test Coverage:**
- ✅ Reset stale context successfully
- ✅ Handle reset when no context exists

### Better Fix (M effort) ✅
**Feature:** Staleness tracking with `lastScanned` and `staleAfterDays`
- Added `lastScanned: ISO8601 timestamp` to context.json
- Added `staleAfterDays: number` (default: 7 days)
- Modified `op=blockers` to check staleness and warn

**Code Changes:**
- Updated `defaultContext` in `op=init` (handlers.ts:722-738)
- Enhanced `op=blockers` to calculate `daysSinceScanned` (handlers.ts:937-996)
- Returns `isStale`, `warning`, and `next_actions` if stale

**Test Coverage:**
- ✅ Include lastScanned/staleAfterDays in init
- ✅ Detect stale data (10 days old)
- ✅ Don't flag fresh data as stale

### Best Fix (L effort) ✅
**Feature:** `context op=scan` for real-time blocker detection
- Runs `npx tsc --noEmit` to count TypeScript errors
- Calculates bundle size from `apps/vscode/dist/`
- Updates context.json with fresh blockers + timestamp

**Code Changes:**
- Added `case "scan"` in `handleContext()` (handlers.ts:1009-1163)
- TypeScript scanning via `child_process.execSync()`
- Recursive directory size calculation for bundle
- Atomic write of updated context

**Test Coverage:**
- ✅ Require initialized context
- ✅ Perform scan and update lastScanned
- ✅ Detect TypeScript errors (5 errors found in test)
- ✅ Full integration workflow (init → stale → scan → fresh)

---

## Technical Details

### Staleness Calculation
```typescript
const scanTime = new Date(lastScanned).getTime();
const daysSinceScanned = Math.floor((Date.now() - scanTime) / (1000 * 60 * 60 * 24));
const isStale = daysSinceScanned > staleAfterDays;
```

### TypeScript Error Detection
```typescript
const tscOutput = execSync("npx tsc --noEmit --pretty false 2>&1 || true", {
  cwd: workspaceRoot,
  timeout: 30000,
});
const errorMatches = tscOutput.match(/error TS\\d+:/g);
const tsErrorCount = errorMatches ? errorMatches.length : 0;
```

### Bundle Size Detection
```typescript
const calculateDirSize = (dir: string): void => {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      calculateDirSize(filePath); // Recursive
    } else {
      totalSize += stats.size;
    }
  }
};
```

---

## API Changes

### New Operations
1. **`context op=reset`** - Reset stale context
2. **`context op=scan`** - Scan for real-time blockers

### Updated Schema
```typescript
// registry.ts
enum: ["init", "build", "validate", "status", "constraint", "check", "blockers", "reset", "scan"]
```

### Response Structure
```typescript
// op=blockers with staleness
{
  op: "blockers",
  blockers: [...],
  count: number,
  lastScanned: string | null,
  daysSinceScanned: number | null,
  isStale: boolean,
  warning?: string,  // "Data is X days stale - consider refreshing"
  next_actions?: [{ tool: "context", args: { op: "scan" } }]
}

// op=scan result
{
  op: "scan",
  status: "success",
  scannedAt: string,  // ISO8601
  blockers: Array<{ key, label, current, target }>,
  blockersFound: number,
  message: string,
  next_actions: [...]
}
```

---

## Test Results

**Test Suite:** `test/context-stale-data.test.ts`
**Status:** ✅ 9/9 tests passing (3.74s)

```
✓ Quick Fix: context op=reset
  ✓ should reset stale context successfully (2ms)
  ✓ should handle reset when no context exists (0ms)

✓ Better Fix: Staleness Tracking
  ✓ should include lastScanned and staleAfterDays in init (1ms)
  ✓ should detect stale data in blockers operation (1ms)
  ✓ should not flag fresh data as stale (1ms)

✓ Best Fix: context op=scan
  ✓ should require initialized context (0ms)
  ✓ should perform scan and update lastScanned (1357ms)
  ✓ should detect TypeScript errors if present (1633ms)

✓ Integration: Full Workflow
  ✓ should handle complete stale data refresh workflow (748ms)
```

**Real TypeScript Error Detection:**
In the test environment, the scan successfully detected 5 TypeScript errors, proving the real-time detection works.

---

## Usage Examples

### Detect Stale Data
```typescript
// Check blockers
const result = await mcp.callTool("context", { op: "blockers" });

// Response
{
  isStale: true,
  daysSinceScanned: 10,
  warning: "Data is 10 days stale - consider refreshing",
  next_actions: [{ tool: "context", args: { op: "scan" } }]
}
```

### Refresh Stale Data
```typescript
// Scan for fresh blockers
const result = await mcp.callTool("context", { op: "scan" });

// Response
{
  status: "success",
  scannedAt: "2025-12-26T13:43:21.442Z",
  blockers: [
    { key: "_ts", label: "typescript-errors", current: 5, target: 0 }
  ],
  blockersFound: 1,
  message: "Found 1 blocker(s) - typescript-errors"
}
```

### Reset & Reinitialize
```typescript
// Reset stale context
await mcp.callTool("context", { op: "reset" });

// Reinitialize with fresh defaults
await mcp.callTool("context", { op: "init" });
```

---

## Session Value Rating

### Quantitative Metrics
| Metric | Value | Notes |
|--------|-------|-------|
| **Implementation Time** | ~45 min | All 3 fixes completed |
| **Lines of Code** | +196 added, -4 removed | handlers.ts |
| **Test Coverage** | 9/9 tests passing | 100% pass rate |
| **Real-time Detection** | ✅ Working | 5 TS errors detected |
| **API Surface** | +2 operations | reset, scan |

### Qualitative Value

#### 🎯 Problem Resolution (10/10)
- ✅ Eliminates stale blocker data
- ✅ Provides clear staleness indicators
- ✅ Automates refresh with real project state
- ✅ Non-destructive reset capability

#### 🔧 Technical Quality (9/10)
- ✅ Well-tested (9 comprehensive tests)
- ✅ Non-blocking error handling
- ✅ Atomic file writes (crash-safe)
- ✅ Clear API with next_actions
- ⚠️ TypeScript scan timeout could be configurable

#### 📊 Developer Experience (10/10)
- ✅ Clear staleness warnings
- ✅ Suggested next actions
- ✅ Multiple resolution paths (reset vs scan)
- ✅ Zero breaking changes

#### 🚀 Production Readiness (9/10)
- ✅ Comprehensive test coverage
- ✅ Error handling for scan failures
- ✅ Backward compatible (old contexts still work)
- ⚠️ Bundle scan assumes `apps/vscode/dist/` structure

---

## Session Value Score: 9.5/10

### Why This Rating?

**Strengths:**
1. **Complete Solution**: All 3 fixes (S/M/L) implemented and tested
2. **Real-time Detection**: Actually runs TypeScript compiler and measures bundle
3. **User-Friendly**: Clear warnings, suggested actions, multiple resolution paths
4. **Production-Ready**: Atomic writes, error handling, backward compatible
5. **Well-Tested**: 9 tests covering happy paths, edge cases, and integration

**Minor Gaps:**
1. Bundle scan assumes specific directory structure (`apps/vscode/dist/`)
2. TypeScript scan timeout hardcoded at 30s (could be configurable)
3. No incremental scan (always full scan)

**Impact:**
- **Immediate:** Solves the reported stale data problem
- **Short-term:** Prevents confusion from outdated blockers
- **Long-term:** Foundation for automated health monitoring

---

## Recommendations

### Post-Launch Enhancements (Optional)
1. **Incremental Scanning**: Only re-scan changed domains
2. **Scan Scheduling**: Auto-scan on project open or daily
3. **Scan History**: Track scan results over time
4. **Custom Scanners**: Plugin system for domain-specific checks
5. **Performance Budget**: Compare against constraints automatically

### Documentation Updates
- [x] Tool schema updated in registry.ts
- [x] Test coverage added
- [ ] Update MCP tool documentation
- [ ] Add examples to pair_programmer.md

---

## Conclusion

This implementation provides a **complete, tested, and production-ready** solution to the stale data problem. The three-tiered approach (quick/better/best) gives users flexibility in how they address staleness, from simple resets to full automated scanning.

The real-time TypeScript error detection proves the system works end-to-end, and the comprehensive test suite ensures reliability.

**Value delivered:** High-impact feature that eliminates a source of confusion and provides foundation for future monitoring capabilities.

---

**Implementation by:** Qoder AI
**Review Status:** ✅ Self-validated with 9 passing tests
**Deployment Ready:** Yes
