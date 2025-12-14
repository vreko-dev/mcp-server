# Performance Instrumentation for Critical Paths

## Overview

This design introduces lightweight performance monitoring to critical code paths in the VSCode extension. The instrumentation will track execution time and warn when operations exceed predefined performance budgets, enabling early detection of performance regressions without impacting normal operation.

## Goals

1. Measure execution time of critical operations (snapshot creation, AI detection, rollback)
2. Alert when operations exceed performance budgets
3. Maintain zero overhead when operations complete within budget
4. Provide actionable performance data for optimization

## Non-Goals

- Distributed tracing or APM integration
- Performance profiling or flamegraph generation
- Real-time performance dashboards
- Historical performance metrics storage

## Performance Budget Definition

Performance budgets establish maximum acceptable execution times for critical operations based on user experience requirements:

| Operation | Budget | Rationale |
|-----------|--------|-----------|
| AI Detection | 10ms | Must not delay editor responsiveness during typing |
| Pre-checkpoint Creation | 15ms | Minimal delay before file save allowed |
| Post-checkpoint Creation | 100ms | User tolerates brief pause after save for safety |
| Save Intercept | 50ms | Must complete before file write commits |
| Rollback | 500ms | User-initiated action, expectation of brief processing time |

Budget violations trigger console warnings but do not block execution, ensuring development visibility without production impact.

## Instrumentation Utilities

### Performance Measurement Module

Location: `apps/vscode/src/utils/perf.ts`

The module provides two primary functions for synchronous and asynchronous measurement:

**Synchronous Measurement Function**

Wraps synchronous operations and measures their execution time. If the operation exceeds its defined budget, a warning is logged to the console.

Signature:
- Function name: `measure`
- Generic type parameter: `<T>` (return type of measured function)
- Parameters:
  - `name` (string): Operation identifier used for budget lookup
  - `fn` (function returning T): Operation to measure
- Returns: Result of type T from the measured function
- Side effects: Console warning if budget exceeded

Behavior:
1. Capture start timestamp using `performance.now()`
2. Execute the provided function
3. Calculate duration regardless of success or failure
4. Compare duration against budget from `BUDGETS` map
5. Log warning if duration exceeds budget
6. Return or throw the function's result/error

**Asynchronous Measurement Function**

Wraps asynchronous operations (Promise-returning functions) and measures their total execution time including async resolution.

Signature:
- Function name: `measureAsync`
- Generic type parameter: `<T>` (resolved type of Promise)
- Parameters:
  - `name` (string): Operation identifier used for budget lookup
  - `fn` (function returning Promise<T>): Async operation to measure
- Returns: Promise<T> that resolves to the measured function's result
- Side effects: Console warning if budget exceeded

Behavior:
1. Capture start timestamp using `performance.now()`
2. Await the provided async function
3. Calculate duration in finally block (executes regardless of success/failure)
4. Compare duration against budget from `BUDGETS` map
5. Log warning if duration exceeds budget
6. Return or throw the async function's result/error

**Performance Budget Map**

A constant object mapping operation names to their maximum allowed duration in milliseconds:

```
BUDGETS: Record<string, number>
  - 'detection': 10ms
  - 'pre-checkpoint': 15ms
  - 'post-checkpoint': 100ms
  - 'save-intercept': 50ms
  - 'rollback': 500ms
```

**Warning Format**

Console warnings follow this structure:
```
[Perf] {operation_name} exceeded budget: {actual_duration}ms > {budget_limit}ms
```

Example: `[Perf] detection exceeded budget: 15.3ms > 10ms`

## Integration Points

### AutoDecisionEngine Integration

**Target Method:** `AutoDecisionEngine.makeDecision()`

**Current Location:** `apps/vscode/src/integration/AutoDecisionIntegration.ts`

Modification approach:
1. Import `measure` from `../utils/perf`
2. Wrap the decision logic inside `measure('detection', () => { ... })`
3. Ensure the wrapper encompasses AI presence detection and risk analysis but excludes UI presentation

Scope of measurement:
- Includes: AI detection heuristics, risk score calculation, decision matrix evaluation
- Excludes: VSCode API calls for showing warnings/blocks

**Target Method:** `SnapshotStore.createPreCheckpoint()`

Location discovery needed via codebase search for:
- Class name: `SnapshotStore`
- Method name: `createPreCheckpoint`
- Expected location: `packages/sdk/src/storage/` or `apps/vscode/src/snapshot/`

Modification approach:
1. Import `measureAsync` from appropriate relative path to `perf.ts`
2. Wrap the checkpoint creation logic: `await measureAsync('pre-checkpoint', async () => { ... })`
3. Ensure measurement includes file metadata collection and state serialization

Scope of measurement:
- Includes: File content snapshot, metadata gathering, timestamp generation
- Excludes: Storage write operations (those belong to post-checkpoint)

### Snapshot Creation Integration

**Target Method:** `SnapshotStore.create()`

Expected location: Same class as `createPreCheckpoint()`

Modification approach:
1. Import `measureAsync` from appropriate relative path
2. Wrap the full snapshot creation: `await measureAsync('post-checkpoint', async () => { ... })`
3. Measurement should include storage write and index updates

Scope of measurement:
- Includes: Snapshot serialization, storage adapter write, index update
- Excludes: Event bus notifications (non-critical path)

### Rollback Integration

**Target Method:** `RollbackService.rollbackTo()`

Location discovery needed via codebase search for:
- Class or service name containing "Rollback"
- Method signature accepting snapshot ID or timestamp
- Expected location: `apps/vscode/src/services/` or `packages/sdk/src/core/`

Modification approach:
1. Import `measureAsync` from appropriate relative path
2. Wrap the rollback operation: `await measureAsync('rollback', async () => { ... })`
3. Measurement should include file restoration and validation

Scope of measurement:
- Includes: Snapshot retrieval, file content restoration, integrity verification
- Excludes: User confirmation dialogs or success notifications

### Save Intercept Integration

**Target Location:** File save event handler in VSCode extension

Expected location: `apps/vscode/src/extension.ts` or document save listener registration

Modification approach:
1. Import `measure` or `measureAsync` depending on handler synchronicity
2. Wrap pre-save validation and checkpoint trigger: `await measureAsync('save-intercept', async () => { ... })`
3. Ensure measurement covers decision to checkpoint before allowing save

Scope of measurement:
- Includes: Protection level check, pre-save validation, checkpoint trigger decision
- Excludes: Actual save operation (handled by VSCode)

## Validation Strategy

### Normal Operation Validation

Success criteria for operations completing within budget:
- Zero console warnings during typical development workflow
- No measurable latency increase in editor responsiveness
- All protected file saves complete without delay

Test scenarios:
1. Open and edit protected files (AI detection should stay under 10ms)
2. Save files with pre-checkpoint enabled (should stay under 15ms)
3. Trigger snapshot creation manually (should stay under 100ms)
4. Execute rollback on recent snapshot (should stay under 500ms)

### Budget Violation Detection

Success criteria for operations exceeding budget:
- Console warning appears with correct format
- Warning includes operation name, actual duration, and budget limit
- Operation completes successfully despite warning
- No user-facing errors or interruptions

Test scenarios:
1. Simulate slow AI detection (mock delay > 10ms) → verify warning appears
2. Simulate slow checkpoint creation (large file > 15ms) → verify warning
3. Simulate slow rollback (many files > 500ms) → verify warning
4. Verify warning does not prevent operation completion

### Performance Regression Detection

Developers use console warnings to identify performance degradation:
- New code changes that trigger budget warnings indicate regression
- Repeated warnings for same operation suggest optimization needed
- Warning frequency helps prioritize performance work

## Implementation Notes

### Error Handling

Performance measurement must not interfere with error propagation:
- Use `try/finally` blocks to ensure duration calculation even on errors
- Re-throw all errors from measured functions
- Ensure async errors propagate through Promise chain

### TypeScript Considerations

Generic type parameters preserve type safety:
- `measure<T>` infers return type from measured function
- `measureAsync<T>` infers Promise resolution type
- No type casting or `any` types required

### Performance of Performance Measurement

The instrumentation itself must have minimal overhead:
- `performance.now()` is high-resolution but fast (sub-microsecond)
- Conditional logging only triggers on budget violations
- No object allocation except for warning strings
- No async overhead for synchronous operations

### Console Output Strategy

Warnings use `console.warn` for visibility in VSCode developer tools:
- Grouped with other diagnostic output
- Does not interfere with structured logging (if present)
- Can be filtered in production builds if needed

## Future Considerations

Potential enhancements not included in this design:
- Aggregate statistics (p50, p95, p99 latencies)
- Performance metrics export to telemetry system
- Dynamic budget adjustment based on hardware capabilities
- Performance test automation with budget assertions
- Integration with VSCode performance profiler

## Dependencies

Required imports:
- Node.js `performance.now()` API (available in VSCode extension host)
- No external npm packages required

Affected files:
- New file: `apps/vscode/src/utils/perf.ts`
- Modified: `apps/vscode/src/integration/AutoDecisionIntegration.ts`
- Modified: Snapshot store implementation (location TBD)
- Modified: Rollback service implementation (location TBD)
- Modified: Save event handler (location TBD)

## Risk Assessment

**Low Risk:**
- Non-blocking instrumentation (warnings only)
- Minimal performance overhead
- No changes to business logic
- Easy to remove if problematic

**Mitigation:**
- Thoroughly test that errors still propagate correctly
- Verify no impact on extension activation time
- Ensure console warnings don't spam on legitimate slow operations- Verify no impact on extension activation time
