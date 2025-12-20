# SnapBack Constraints

**Hard rules enforced by gate-runner.ts**
**Violations are tracked and auto-promoted**

---

## Hard Rules (Non-Negotiable)

### C-001: Layer Boundary Enforcement
```
RULE: Presentation layer CANNOT import Infrastructure layer
CHECK: apps/vscode/** cannot contain "@snapback/infrastructure"
CHECK: apps/web/** cannot contain "@snapback/infrastructure"  
CHECK: apps/cli/** cannot contain "@snapback/infrastructure"
VIOLATION_TYPE: LAYER_BOUNDARY_VIOLATION
```

### C-002: Service Layer for Business Logic
```
RULE: Database queries MUST go through service layer
CHECK: apps/api/src/procedures/** cannot contain "db.query" or "db.select" directly
ALLOWED: apps/api/src/services/** can contain database operations
VIOLATION_TYPE: SERVICE_BYPASS
```

### C-003: Specific Test Assertions
```
RULE: Tests MUST use specific assertions, not vague ones
BANNED: .toBeTruthy(), .toBeDefined(), .toBeFalsy() without value comparison
REQUIRED: .toEqual(), .toBe(), .toMatchObject() with actual expected values
VIOLATION_TYPE: VAGUE_ASSERTION
```

### C-004: 4-Path Test Coverage
```
RULE: All test files MUST cover 4 paths
REQUIRED_PATHS:
  - Happy path (success case)
  - Sad path (expected failure)
  - Edge case (boundary conditions)
  - Error case (unexpected failures)
VIOLATION_TYPE: INCOMPLETE_COVERAGE
```

### C-005: Vitest Config Standard
```
RULE: All packages MUST use @snapback/vitest-config
REQUIRED: import { nodeConfig } from "@snapback/vitest-config"
REQUIRED: Use mergeConfigs() helper
BANNED: Custom vitest config without extending shared config
VIOLATION_TYPE: CONFIG_VIOLATION
```

### C-006: Privacy-First Telemetry
```
RULE: File content MUST never be sent to external services
CHECK: No file content in PostHog events
CHECK: No source code in API payloads
ALLOWED: File paths, timestamps, counts, hashes
VIOLATION_TYPE: PRIVACY_VIOLATION
```

### C-007: Console.log in Production
```
RULE: console.log MUST not appear in production code
ALLOWED: Test files, development scripts
REQUIRED: Use logger from @snapback/core for production logging
VIOLATION_TYPE: NO_CONSOLE
```

### C-008: Error Handling Required
```
RULE: All async operations MUST have error handling
CHECK: try/catch or .catch() for all await calls in service layer
CHECK: Error boundaries for React components
VIOLATION_TYPE: MISSING_ERROR_HANDLING
```

---

## Soft Rules (Warnings)

### S-001: Prefer Early Return
```
PREFERENCE: Use early return over nested if/else
REASON: Reduces cognitive complexity
```

### S-002: Max Function Length
```
PREFERENCE: Functions should be < 50 lines
REASON: Improves readability and testability
```

### S-003: Descriptive Naming
```
PREFERENCE: Variables/functions should describe intent
AVOID: x, temp, data, result (without context)
```

---

## Learned Constraints

<!-- AUTO-POPULATED: Constraints learned from 3x+ violations -->

| ID | Constraint | Source | Occurrences |
|----|------------|--------|-------------|
| LC-001 | Complete Step 3 in architecture audit and save to ... | MISSING_SERVICE_LOCATION | 10 |
| LC-002 | Use specific assertions: .toEqual(), .toBe(), .toM... | VAGUE_ASSERTION | 4 |
| LC-003 | Add tests for all 4 paths before completing | INCOMPLETE_COVERAGE | 4 |
---

## Constraint Validation Matrix

| Constraint | Gate Phase | Auto-Check | Severity |
|------------|------------|------------|----------|
| C-001 | audit, green | ✅ Yes | error |
| C-002 | green | ✅ Yes | error |
| C-003 | red | ✅ Yes | warning |
| C-004 | quality | ✅ Yes | warning |
| C-005 | audit | ❌ Manual | warning |
| C-006 | certify | ❌ Manual | error |
| C-007 | red, green | ✅ Yes | warning |
| C-008 | green | ❌ Partial | warning |

---

## Adding New Constraints

When a violation reaches **5x occurrences**, it should be:
1. Added to this file as a new constraint (C-XXX or LC-XXX)
2. Added to gate-runner.ts as an automated check
3. Documented with CHECK pattern for validation

```typescript
// Example: Adding constraint to gate-runner.ts
if (code.includes('BANNED_PATTERN')) {
  violations.push({
    type: 'NEW_VIOLATION_TYPE',
    message: 'Description of violation',
    prevention: 'How to fix it',
  });
}
```

---

*Constraints are enforced by TDD gates. Violations are tracked in patterns/violations.jsonl*
