# Snapback Agent - Quick Reference

## 🚦 Stop Points (Critical Checkpoints)

```
Discovery → STOP → Research → STOP → Red Test → STOP →
Green Code → STOP → Lefthook → STOP → Refactor → STOP → Validate
```

## ⚡ Performance Budgets

| Operation        | Budget | Alert If Exceeded  |
| ---------------- | ------ | ------------------ |
| Snapshot Capture | 50ms   | Profile & optimize |
| Diff Analysis    | 100ms  | Consider caching   |
| Pattern Match    | 25ms   | Optimize regex     |
| UI Update        | 16ms   | Throttle rendering |
| File Watch       | 300ms  | Already debounced  |

## 🔍 Pre-Code Checklist

Before writing ANY code:

-   [ ] Used context7 to verify what exists
-   [ ] Checked package.json for dependencies
-   [ ] Reviewed existing patterns in codebase
-   [ ] Confirmed lefthook is passing
-   [ ] Validated approach is minimal

## 🧪 TDD Quick Pattern

```typescript
// 1. RED: Write failing test
describe("Feature", () => {
	it("does specific thing", () => {
		expect(actual).toBe(expected); // ✗ Fails
	});
});

// 2. GREEN: Minimal code to pass
function feature() {
	return expected; // ✓ Passes
}

// 3. REFACTOR: Improve without changing behavior
function feature() {
	// Better implementation, same result
	return computeExpected(); // ✓ Still passes
}
```

## 📦 Library Integration Protocol

```
1. Search package.json → Already installed?
2. Check bundle size → Under 50kb?
3. Test VS Code compat → Documented?
4. Map data flow → Integration clear?
5. Profile performance → Within budget?
```

## 🚫 Instant Red Flags

```typescript
// ❌ Don't do these:
class AbstractFactory<T> {} // Over-engineering
async function maybeDoSomething(); // Speculative code
const data: any = await fetch(); // Type safety lost
```

## ✅ Good Patterns

```typescript
// ✓ Do these:
function captureSnapshot(file: string): Snapshot; // Focused
if (!isValid) {
	notify();
} // Unobtrusive
const cached = memo.get(key) ?? compute(); // Performance
```

## 🔧 When Lefthook Fails

```bash
$ lefthook run pre-commit
✗ Tests failed

# IMMEDIATELY:
1. Identify failing test/lint
2. Fix ONLY that issue
3. Verify fix works
4. Resume original task

# NEVER skip fixing critical path!
```

## 📊 Code Review Post-Check

After implementation:

```
✓ Feature in code review doc
✓ Tests written (Red → Green)
✓ Lefthook passes
✓ Performance under budget
✓ No `any` types
✓ UI unobtrusive
✓ Snapshot integrity maintained
```

## 🎯 Response Templates

### Discovery Phase

```
Current: [exists in codebase]
Missing: [needs implementation]
Research: [areas to investigate]
```

### Implementation Phase

```
Test: [minimal failing test]
Code: [minimal passing implementation]
Lefthook: ✓ / ✗ [details]
```

### Decision Phase

```
Problem: [one sentence]
Exists: [current solution]
Proposal: [minimal change]
Why: [concrete reasons]
```

## 💡 Remember

**Invisible = Success**
Only surface issues. Silent when working.

**Existing > New**
Check codebase before suggesting.

**Minimal > Complete**
Ship smallest working solution.

**Test > Implement**
Red, Green, Refactor, Validate.

---

Keep this handy while working with the agent!
