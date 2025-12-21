# SnapBack Constraints

**Hard rules enforced by gate-runner.ts**
**Violations are tracked and auto-promoted**
**Last updated:** 2025-12-21

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
EXCEPTION: toBeUndefined() is valid for asserting absence
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

### C-004a: No Placeholder Tests
```
RULE: Tests MUST contain real assertions, never placeholders
BANNED: expect(true).toBe(true)
BANNED: expect(true).toBeTruthy() with comment "// TODO: Implement"
BANNED: Test blocks with only TODO comments
REQUIRED: Every test MUST assert actual behavior with specific expectations
VERIFICATION: grep -rn 'expect(true).toBe(true)\|// TODO' test/
VIOLATION_TYPE: INCOMPLETE_TEST_IMPLEMENTATION
SOURCE: Violation 2025-12-21 - 25 placeholder tests passed with zero coverage
ROOT_CAUSE: Focused on failing tests without auditing passing tests
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

### C-009: Test File Location

```
RULE: Test files MUST be in the correct directory per project config
CHECK: VSCode extension tests MUST be in test/ directory, NOT src/
CHECK: Verify vitest.config.ts test.include pattern before creating test files
VIOLATION_TYPE: TEST_FILE_LOCATION_ERROR
SOURCE: Violation 2025-12-21 - test file in src/ was ignored by runner
```

### C-010: Path Resolution in MCP/ESM

```
RULE: MCP servers launched with absolute paths MUST use import.meta.url for paths
BANNED: process.cwd() for relative path resolution in MCP servers
REQUIRED: fileURLToPath(import.meta.url) + path.dirname()
VIOLATION_TYPE: PATH_RESOLUTION_BUG
SOURCE: Violation 2025-12-21 - prompt-cache.ts failed to load static context
```

### C-011: Vitest Workspace Glob Patterns

```
RULE: Vitest projects glob MUST exclude non-package files
CHECK: Exclude .md files, standalone .ts files like vercel-entry.ts
REQUIRED: Explicit package paths for packages-oss/* instead of broad globs
REQUIRED: All internal packages in vitest-config aliases
VIOLATION_TYPE: CONFIG_PATH_RESOLUTION
SOURCE: Violation 2025-12-21 - glob matched README.md, vercel-entry.ts
```

### C-012: MCP Tool Usage Before Implementation

```
RULE: MUST call codebase:get_context() BEFORE any implementation
CHECK: Any code changes require prior get_context call
VIOLATION_TYPE: IGNORED_ROUTER_INSTRUCTIONS
SOURCE: Violation 2025-12-21 - started task without querying knowledge layer
```

### C-013: Stub Component Lifecycle Tracking

```
RULE: Stub components MUST be tracked and have completion criteria
CHECK: Stub components must have:
  - Issue/ticket reference in comment
  - Completion criteria (what's needed to de-stub)
  - Target completion date or blocking dependency
BANNED: Stub components without tracking (orphaned stubs)
VIOLATION_TYPE: ORPHANED_STUB_COMPONENT
KNOWN_STUBS:
  - ActiveOrganizationProvider
  - DeleteOrganizationForm
  - OrganizationInvitationModal
  - ResetPasswordForm
  - ChangeNameForm
  - DeleteAccountForm
  - UserList
  - OrganizationList
SOURCE: Historical analysis 2025-12-21 - 10 stub components identified without completion tracking
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
| C-004a | red, green | ✅ Yes | error |
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
