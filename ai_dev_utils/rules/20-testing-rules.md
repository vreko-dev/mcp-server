---
description: "Testing infrastructure and patterns"
globs:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/test/**/*.ts"
  - "**/vitest.config.ts"
alwaysApply: false
---

# Testing Rules

**Applies to:** All test files and test configurations

---

## Vitest Config Standard

All packages MUST use `@snapback/vitest-config`:

```typescript
import { nodeConfig, mergeConfigs } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

export default defineProject(
  mergeConfigs(nodeConfig, {
    test: {
      name: "@snapback/my-package",
      include: ["test/**/*.test.ts"],
    },
  })
);
```

---

## Available Presets

| Preset | Use Case |
|--------|----------|
| `nodeConfig` | Node.js packages, SDK, CLI, API |
| `jsdomConfig` | React components, browser testing |
| `vscodeConfig` | VS Code extension testing |
| `integrationConfig` | Integration tests (30s timeout) |
| `e2eConfig` | End-to-end tests (60s timeout) |

---

## Test File Naming

- Use `.test.ts` exclusively (NOT `.spec.ts`)
- Standard location: `test/**/*.test.ts`
- Integration tests: `test/integration/**/*.test.ts`

---

## 🚨 NO PLACEHOLDER TESTS (Critical)

**NEVER leave placeholder assertions:**

```typescript
// ❌ BANNED
expect(true).toBe(true);
expect(true).toBeTruthy(); // TODO: Implement
```

**Verification step (MANDATORY):**
```bash
grep -rn 'expect(true).toBe(true)\|// TODO' test/
# If matches found, FIX THEM before proceeding
```

---

## 4-Path Coverage Required

All test files MUST cover:
1. **Happy path** (success case)
2. **Sad path** (expected failure)
3. **Edge case** (boundary conditions)
4. **Error case** (unexpected failures)

---

## Assertion Rules

```typescript
// ❌ BANNED - Vague assertions
.toBeTruthy()
.toBeDefined()
.toBeFalsy()

// ✅ REQUIRED - Specific assertions
.toEqual(expectedValue)
.toBe(specificValue)
.toMatchObject({ key: value })
```

**Exception:** `toBeUndefined()` is valid for asserting absence.
