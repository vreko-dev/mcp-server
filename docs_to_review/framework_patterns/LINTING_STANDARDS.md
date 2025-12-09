# Linting & Code Quality Standards

**Last Updated:** 2025-12-03
**Applies to:** All TypeScript, JavaScript, and YAML files in SnapBack monorepo

---

## Overview

This document captures the code quality standards and linting best practices for the SnapBack project. All contributors should familiarize themselves with these standards to ensure consistent, maintainable code.

---

## Linting Tools & Configuration

### Biome (Code Formatter & Linter)

**Configuration:** `biome.json` (root of monorepo)

Biome enforces consistent code style and catches common errors:

```bash
# Check all files
pnpm biome check .

# Auto-fix formatting issues
pnpm biome format --write <file>

# Check specific file
pnpm biome check <file>
```

### TypeScript Type Checking

**Configuration:** `tsconfig.base.json` with `"strict": true`

```bash
# Run full type check
pnpm type-check

# Watch mode (if available)
pnpm type-check --watch
```

---

## Code Quality Standards

### 1. TypeScript Strict Mode

All code must pass TypeScript in strict mode:

```typescript
// ✅ CORRECT: Explicit types
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: "123",
  name: "John",
  email: "john@example.com",
};

// ❌ WRONG: Implicit any
const user = {
  // TypeScript can't infer if this is safe
};
```

### 2. Unused Variables

Unused variables must be prefixed with underscore:

```typescript
// ✅ CORRECT: Prefix with underscore
const result = middleware(_request, _response, (_data) => {
  return null;
});

// ❌ WRONG: Unused without prefix
const result = middleware(request, response, (data) => {
  return null; // Biome warning: unused 'data'
});
```

### 3. Node.js Built-in Module Imports

Use the `node:` protocol for built-in modules:

```typescript
// ✅ CORRECT
import path from "node:path";
import fs from "node:fs/promises";
import { EventEmitter } from "node:events";

// ❌ WRONG: Direct import without node: prefix
import path from "path";
import fs from "fs/promises";
```

### 4. Import Organization

Organize imports in groups (with blank lines):

```typescript
// ✅ CORRECT: Organized imports
// 1. External dependencies
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@snapback/infrastructure";

// 2. Internal monorepo packages
import { publicProcedure } from "../../orpc/procedures.js";
import type { User } from "@snapback/contracts";

// 3. Local relative imports
import { getClientIP } from "./helpers";
import type { Config } from "../types";
```

### 5. Named Exports vs Default Exports

Prefer named exports for better tree-shaking and refactoring safety:

```typescript
// ✅ CORRECT: Named exports
export function createUser(name: string): User {
  return { id: generateId(), name };
}

export const MAX_RETRIES = 3;

// ❌ AVOID: Default exports
export default function createUser(name: string) {
  return { id: generateId(), name };
}
```

### 6. Proper Error Handling

Use discriminated union or Result<T, E> pattern:

```typescript
// ✅ CORRECT: Type-safe error handling
async function findUser(id: string): Promise<Result<User, NotFoundError>> {
  const user = await db.users.findOne(id);
  if (!user) {
    return Err(new NotFoundError("User not found"));
  }
  return Ok(user);
}

// ❌ WRONG: Untyped error handling
async function findUser(id: string) {
  try {
    const user = await db.users.findOne(id);
    return user;
  } catch (error: unknown) {
    // Error type unknown, no proper handling
    throw error;
  }
}
```

### 7. Null/Undefined Handling

Use proper null coalescing and optional chaining:

```typescript
// ✅ CORRECT: Safe null handling
const value = data?.nested?.property ?? defaultValue;
const count = (data?.items ?? []).length;

// ✅ CORRECT: Null assertion when safe
const metrics = await aggregator.getUserMetrics(userId);
const percentage = Math.round(((metrics?.snapshots30d ?? 0) / limit) * 100);

// ❌ WRONG: Unsafe access
const value = data.nested.property; // Can throw if data is null
const count = data.items.length; // Crashes if data is null
```

---

## Framework-Specific Standards

### oRPC Procedures

See [Framework Patterns & Best Practices](./FRAMEWORK_PATTERNS.md#orpc-framework-patterns)

```typescript
// ✅ CORRECT: Use .handler() not .query()
const getUser = publicProcedure
  .input(z.object({ userId: z.string() }))
  .handler(async ({ input }) => {
    // implementation
  });
```

### Drizzle ORM

See [Framework Patterns & Best Practices](./FRAMEWORK_PATTERNS.md#drizzle-orm-patterns)

```typescript
// ✅ CORRECT: Use PgDatabase<any>
export function createRouter(db: PgDatabase<any>) {
  // Safe implementation
}
```

### Next.js Middleware

See [Framework Patterns & Best Practices](./FRAMEWORK_PATTERNS.md#nextjs-middleware-patterns)

```typescript
// ✅ CORRECT: Synchronous rate limiting in middleware
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
  // Synchronous implementation
}
```

---

## Pre-commit Checks

All code must pass these checks before committing:

```bash
# 1. Format check
pnpm biome format

# 2. Linting check
pnpm biome check

# 3. Type checking
pnpm type-check

# 4. Tests (if applicable)
pnpm test

# All together
pnpm lint
```

### Using Lefthook

The project uses Lefthook for automated pre-commit checks. Configuration in `.lefthook.yml`:

```bash
# Verify hooks are installed
lefthook install

# Run hooks manually to test
lefthook run pre-commit
```

---

## Common Issues & Solutions

### Issue 1: "Cannot find module" errors

**Cause:** Wrong import path or missing .js extension

**Solution:**
```typescript
// Add .js extension for ES modules
import { module } from "./services/service.js"; // ✅ CORRECT

// Check actual file location
import { module } from "../../services/module"; // ❌ Wrong path depth
```

### Issue 2: "Implicit any" type errors

**Cause:** Function parameters without explicit types

**Solution:**
```typescript
// ✅ CORRECT: Explicit parameter types
function process(data: unknown): string {
  if (typeof data === "string") {
    return data.toUpperCase();
  }
  return String(data);
}

// ❌ WRONG: Implicit any
function process(data) {
  return data.toUpperCase();
}
```

### Issue 3: "Property doesn't exist" on Promise

**Cause:** Forgetting to await async function

**Solution:**
```typescript
// ✅ CORRECT: Await async calls
const result = await checkRateLimit(identifier);
if (!result.allowed) { /* ... */ }

// ❌ WRONG: Missing await
const result = checkRateLimit(identifier);
if (!result.allowed) { /* ... */ } // result is Promise!
```

### Issue 4: Unused imports or variables

**Cause:** Import/variable declared but not used

**Solution:**
```typescript
// ✅ CORRECT: Remove unused or use with underscore prefix
import { usedFunction } from "./module";
const _unusedVariable = getValue();

// ❌ WRONG: Keep unused
import { usedFunction, unusedFunction } from "./module";
const unusedVariable = getValue();
```

---

## Type Safety Best Practices

### 1. Discriminated Unions

```typescript
// ✅ CORRECT: Discriminated union
type ApiResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; code: string };

function handle<T>(response: ApiResponse<T>) {
  switch (response.status) {
    case "success":
      console.log(response.data); // Correctly typed
      break;
    case "error":
      console.error(response.code); // Correctly typed
      break;
  }
}
```

### 2. Type Guards

```typescript
// ✅ CORRECT: Type guard for narrowing
function assertDefined<T>(value: T | undefined): asserts value is T {
  if (value === undefined) {
    throw new Error("Value is undefined");
  }
}

const user = getUser();
assertDefined(user);
console.log(user.id); // Now safe to access
```

### 3. Conditional Types

```typescript
// ✅ CORRECT: Extract types from generic
type Awaited<T> = T extends Promise<infer U> ? U : T;

type Result = Awaited<Promise<string>>; // Result is string
```

---

## Performance Considerations

### 1. Tree-Shaking with Named Exports

```typescript
// ✅ CORRECT: Tree-shakeable
export function createUser(name: string) { /* ... */ }
export function deleteUser(id: string) { /* ... */ }

// ❌ WRONG: Not tree-shakeable
export default {
  createUser: (name: string) => { /* ... */ },
  deleteUser: (id: string) => { /* ... */ },
};
```

### 2. Lazy Imports for Heavy Modules

```typescript
// ✅ CORRECT: Lazy import for heavy module
async function processSnapshot(path: string) {
  const { process } = await import("./heavy-processor.js");
  return process(path);
}

// ❌ WRONG: Always load heavy module
import { process } from "./heavy-processor.js";

async function processSnapshot(path: string) {
  return process(path);
}
```

---

## Maintenance & Updates

When updating frameworks or tools, the following must be updated:

- [ ] FRAMEWORK_PATTERNS.md - If framework API changes
- [ ] This file (LINTING_STANDARDS.md) - If standards change
- [ ] biome.json - If formatter config changes
- [ ] tsconfig.base.json - If TypeScript config changes
- [ ] .lefthook.yml - If pre-commit hooks change

---

## References

- **Biome Documentation:** https://biomejs.dev
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/
- **Node.js Modules:** https://nodejs.org/docs/latest/api/
- **Framework Patterns:** See FRAMEWORK_PATTERNS.md
- **TypeScript Patterns:** See always-typescript-patterns.md
- **Monorepo Imports:** See always-monorepo-imports.md

---

## Review Checklist for Code Review

When reviewing code, ensure:

- [ ] Code passes `pnpm biome check`
- [ ] Code passes `pnpm type-check` with no errors
- [ ] No unused variables or imports
- [ ] Node.js imports use `node:` prefix
- [ ] Imports are properly organized
- [ ] Framework patterns are followed (oRPC, Drizzle, Next.js)
- [ ] Error handling uses Result<T, E> or discriminated unions
- [ ] Null/undefined handled properly (nullish coalescing, optional chaining)
- [ ] Types are explicit, no implicit `any`
- [ ] Functions have explicit parameter and return types

---

**Question?** Check FRAMEWORK_PATTERNS.md for framework-specific guidance or refer to individual framework documentation.
