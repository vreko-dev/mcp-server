---
trigger: decision
context: When encountering ESM module mocking issues, TypeScript compilation problems in tests, or "function is not a function" errors in Vitest
---

# TypeScript + ESM Testing Patterns in Monorepos

**Applies to:** TypeScript monorepos using Vitest with composite projects
**Authority:** Critical troubleshooting patterns from production debugging sessions
**Context:** When testing ESM modules with dynamic imports, React components, or workspace dependencies

---

## Decision Framework

### When to Use This Rule

Apply these patterns when you encounter:

1. **Module Mocking Failures:**
   - `(0, myFunction) is not a function`
   - `Cannot access 'vi' before initialization`
   - Module only exports first function, rest are `undefined`

2. **Dynamic Import Issues:**
   - TypeScript transforms `await import()` to static imports
   - Top-level imports fail in test environment
   - Module crashes mid-evaluation

3. **Test Environment Incompatibilities:**
   - React Email components fail in Node test environment
   - Workspace packages (`@snapback/*`) fail to mock
   - Circular dependency issues in tests

---

## Core Principle: Prefer Dependency Injection Over Mocking

### ❌ AVOID: vi.mock() in TypeScript Monorepos

**Why vi.mock() Fails:**

```typescript
// This pattern has multiple fatal flaws:
import { vi } from "vitest";
import { sendEmail } from "../email-service.js";

// PROBLEM 1: Hoisting causes reference errors
vi.mock("@snapback/infrastructure", () => ({
  logger: { info: vi.fn() }  // ❌ Cannot access 'vi' before initialization
}));

// PROBLEM 2: Vitest may load from dist/ instead of src/
// If dist/ has static imports that fail, module partially loads
```

**Root Causes:**

1. **Hoisting Behavior:** `vi.mock()` is hoisted before all imports, making `vi` inaccessible in factory
2. **Module Resolution:** Package `exports` field may point to `dist/`, not source
3. **Compiler Optimization:** TypeScript transforms dynamic imports to static imports in compiled output
4. **Partial Module Loading:** When top-level import fails, only successfully loaded exports are available

---

### ✅ SOLUTION 1: Dependency Injection Pattern

**Implementation:**

```typescript
// src/services/email-service.ts
import type { Logger } from "@snapback/infrastructure";
import type { EmailProvider } from "../types.js";

export interface EmailServiceDependencies {
  logger: Logger;
  emailProvider: EmailProvider;
  templateRenderer: (template: ReactElement) => Promise<string>;
}

/**
 * Default dependencies with lazy initialization
 * CRITICAL: Use async function + dynamic imports to avoid top-level imports
 */
async function getDefaultDependencies(): Promise<EmailServiceDependencies> {
  // Dynamic imports prevent TypeScript from hoisting to top-level
  const { logger } = await import("@snapback/infrastructure");
  const { render } = await import("@react-email/render");
  const { sendEmail } = await import("../providers/resend.js");

  return {
    logger,
    emailProvider: { send: sendEmail },
    templateRenderer: render,
  };
}

/**
 * Public API with optional dependency injection
 * Production: Uses default dependencies (real implementations)
 * Tests: Injects mock dependencies
 */
export async function sendWelcomeEmail(
  userId: string,
  email: string,
  deps?: EmailServiceDependencies  // ✅ Optional injection point
): Promise<void> {
  const dependencies = deps || await getDefaultDependencies();

  dependencies.logger.info("Sending welcome email", { userId, email });

  // Lazy load React components to prevent module evaluation issues
  const { WelcomeEmail } = await import("../emails/WelcomeEmail.js");

  const html = await dependencies.templateRenderer(
    WelcomeEmail({ userId })
  );

  await dependencies.emailProvider.send({
    to: email,
    subject: "Welcome!",
    html,
  });
}
```

**Test Implementation:**

```typescript
// __tests__/email-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EmailServiceDependencies } from "../email-service.js";
import { sendWelcomeEmail } from "../email-service.js";

// ✅ Create mock dependencies - NO vi.mock() needed!
const createMockDeps = (): EmailServiceDependencies => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  emailProvider: {
    send: vi.fn().mockResolvedValue({ id: "msg_123" }),
  },
  templateRenderer: vi.fn().mockResolvedValue("<html>Mock Email</html>"),
});

describe("sendWelcomeEmail", () => {
  let mockDeps: EmailServiceDependencies;

  beforeEach(() => {
    mockDeps = createMockDeps();
  });

  it("sends welcome email with rendered template", async () => {
    await sendWelcomeEmail("user_123", "user@example.com", mockDeps);

    expect(mockDeps.logger.info).toHaveBeenCalledWith(
      "Sending welcome email",
      { userId: "user_123", email: "user@example.com" }
    );

    expect(mockDeps.templateRenderer).toHaveBeenCalled();

    expect(mockDeps.emailProvider.send).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: "Welcome!",
      html: "<html>Mock Email</html>",
    });
  });

  it("handles email provider errors gracefully", async () => {
    mockDeps.emailProvider.send = vi.fn().mockRejectedValue(
      new Error("Network timeout")
    );

    await expect(
      sendWelcomeEmail("user_123", "user@example.com", mockDeps)
    ).rejects.toThrow("Network timeout");

    expect(mockDeps.logger.error).toHaveBeenCalled();
  });
});
```

**Benefits:**

- ✅ No module mocking complexity
- ✅ Type-safe dependency injection
- ✅ Works in all environments (Node, browser, edge)
- ✅ Easy to test - just pass mock dependencies
- ✅ Production code automatically uses real dependencies
- ✅ Avoids TypeScript compiler transformation issues

---

### ✅ SOLUTION 2: Vitest Configuration for TypeScript Source Testing

**Problem:** Vitest may resolve imports to `dist/` compiled output instead of TypeScript source.

**vitest.config.ts:**

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // Force resolution to source files, not dist
      "@/": path.resolve(__dirname, "./src/"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],

    // CRITICAL: Disable package.json "exports" field during tests
    // This prevents Vitest from using dist/ output
    conditions: ["development"],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],

    // CRITICAL: Exclude compiled output
    exclude: ["node_modules", "dist"],

    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/**/*.ts",
        "!src/**/*.test.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

**Key Configuration:**

1. `conditions: ["development"]` - Bypasses `package.json` exports field
2. `exclude: ["dist"]` - Prevents test discovery in compiled output
3. `resolve.alias` - Forces source file resolution

---

## Diagnostic Process

### Step 1: Verify Module Exports

```typescript
// Add debug test to check what's actually imported
import * as Module from "../my-module.js";

describe("Debug: Module exports", () => {
  it("should show available exports", () => {
    console.log("Module exports:", Object.keys(Module));
    console.log("myFunction type:", typeof Module.myFunction);
  });
});
```

### Step 2: Check TypeScript Compilation

```bash
# Inspect compiled output for static imports
head -30 dist/path/to/module.js

# Look for this pattern (indicates problem):
# import { dependency } from "@snapback/somewhere";  # ❌ Static import at top
#
# Instead of:
# const { dependency } = await import("@snapback/somewhere");  # ✅ Dynamic import
```

### Step 3: Test Direct Import

```bash
# Try importing module directly in Node (bypasses Vitest)
cd packages/my-package
node --input-type=module -e "
  import('./src/my-module.ts').then(m => {
    console.log('Exports:', Object.keys(m));
  }).catch(err => {
    console.error('Failed:', err.message);
  })
"
```

### Step 4: Check Vitest Cache

```bash
# Clear Vitest cache and rebuild
rm -rf node_modules/.vite
pnpm build
pnpm test
```

---

## Common Patterns

### Pattern: Lazy-Loading React Components

```typescript
// ❌ BAD - Top-level import fails in Node test environment
import { WelcomeEmail } from "../emails/WelcomeEmail.js";

export async function sendEmail() {
  const html = await render(WelcomeEmail({ name: "User" }));
  // ...
}

// ✅ GOOD - Lazy load inside function
export async function sendEmail() {
  const { WelcomeEmail } = await import("../emails/WelcomeEmail.js");
  const html = await render(WelcomeEmail({ name: "User" }));
  // ...
}
```

### Pattern: Safe Module Mocking (When Absolutely Necessary)

```typescript
// ✅ Safe - Node.js built-ins
vi.mock("node:fs");
vi.mock("node:fs/promises");

// ✅ Safe - External packages (no internal deps)
vi.mock("stripe", () => ({
  Stripe: vi.fn(),
}));

// ✅ Safe - Global browser APIs
global.fetch = vi.fn();

// ❌ NEVER - Internal workspace packages
vi.mock("@snapback/infrastructure");  // ❌ Use dependency injection instead

// ❌ NEVER - Modules with React components
vi.mock("@react-email/render");  // ❌ Use dependency injection instead
```

### Pattern: Testing Async Default Dependencies

```typescript
// Test that default dependencies work (integration test)
describe("sendWelcomeEmail with default dependencies", () => {
  it("uses real dependencies in production", async () => {
    // Mock only external services (not internal code)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg_123" }),
    });

    // Call without deps parameter - uses default
    await sendWelcomeEmail("user_123", "user@example.com");

    expect(global.fetch).toHaveBeenCalled();
  });
});
```

---

## Troubleshooting Decision Tree

```
Issue: "(0, myFunction) is not a function"
│
├─ Check 1: Module exports
│  └─ console.log(Object.keys(Module))
│     ├─ Only 1 export? → Module partially loaded
│     │  └─ FIX: Check for top-level import failures
│     └─ All exports present? → Import syntax issue
│        └─ FIX: Check import statement
│
├─ Check 2: Vitest resolution
│  └─ Is Vitest loading from dist/?
│     ├─ Yes → Add exclude: ["dist"] to vitest.config
│     │  └─ Add conditions: ["development"]
│     └─ No → Check TypeScript compilation
│
├─ Check 3: TypeScript compilation
│  └─ head -30 dist/module.js
│     ├─ Static imports at top? → TypeScript transformed dynamic imports
│     │  └─ FIX: Use dependency injection pattern
│     └─ Dynamic imports preserved? → Different issue
│
└─ Check 4: Test environment
   └─ Are you mocking workspace packages?
      ├─ Yes → Use dependency injection instead
      └─ No → Review module initialization
```

---

## Migration Guide: From vi.mock() to Dependency Injection

### Before (Problematic)

```typescript
// ❌ OLD: vi.mock() approach (fails in TypeScript monorepo)
import { vi } from "vitest";
import { sendEmail } from "../email-service.js";

vi.mock("@snapback/infrastructure", () => ({
  logger: { info: vi.fn() }  // ❌ Reference error
}));

it("sends email", async () => {
  await sendEmail("user@example.com", "Subject", "Body");
  // Test implementation
});
```

### After (Robust)

```typescript
// ✅ NEW: Dependency injection approach
import { vi } from "vitest";
import type { EmailServiceDependencies } from "../email-service.js";
import { sendEmail } from "../email-service.js";

const mockDeps: EmailServiceDependencies = {
  logger: { info: vi.fn() },
  emailProvider: { send: vi.fn() },
};

it("sends email", async () => {
  await sendEmail("user@example.com", "Subject", "Body", mockDeps);

  expect(mockDeps.logger.info).toHaveBeenCalled();
  expect(mockDeps.emailProvider.send).toHaveBeenCalled();
});
```

### Refactoring Steps

1. **Extract Dependencies Interface:**
   ```typescript
   export interface ServiceDependencies {
     logger: Logger;
     storage: Storage;
     // ... all external dependencies
   }
   ```

2. **Create Default Dependencies Function:**
   ```typescript
   async function getDefaultDependencies(): Promise<ServiceDependencies> {
     const { logger } = await import("@snapback/infrastructure");
     const { storage } = await import("./storage.js");
     return { logger, storage };
   }
   ```

3. **Add Optional Deps Parameter:**
   ```typescript
   export async function myFunction(
     param1: string,
     deps?: ServiceDependencies
   ) {
     const dependencies = deps || await getDefaultDependencies();
     // Use dependencies.logger instead of logger
   }
   ```

4. **Update Tests:**
   ```typescript
   const mockDeps = createMockDeps();
   await myFunction("value", mockDeps);
   ```

---

## Key Learnings

### What We Discovered

1. **TypeScript Compiler Behavior:**
   - Transforms `await import()` inside async functions to static top-level imports
   - This optimization breaks test isolation when imports fail

2. **Vitest Module Resolution:**
   - In monorepos, Vitest may use `package.json` exports field
   - Exports field points to `dist/`, not TypeScript source
   - Need `conditions: ["development"]` to bypass

3. **Partial Module Loading:**
   - When top-level import fails (e.g., React Email in Node), module crashes mid-evaluation
   - Only successfully loaded exports become available
   - Results in "(0, myFunction) is not a function" errors

4. **vi.mock() Limitations:**
   - Hoisting prevents accessing `vi` in factory
   - `vi.hoisted()` doesn't solve module resolution issues
   - Fundamentally incompatible with TypeScript monorepo architecture

### Best Practices

1. **Always use dependency injection for testable code**
2. **Never use vi.mock() for workspace packages**
3. **Lazy-load React components inside functions**
4. **Configure Vitest to test source, not dist**
5. **Use dynamic imports to avoid compiler optimization**

---

## References

- **Vitest ESM Mocking:** https://vitest.dev/guide/mocking/modules
- **TypeScript Module Resolution:** https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html
- **Testing Rule:** `files-testing-vitest.md` (updated 2025-12-03)
- **GitHub Issue (similar problem):** https://github.com/vitest-dev/vitest/issues/5359

**Last Updated:** 2025-12-03
**Reviewed By:** Testing team after comprehensive troubleshooting session
**Session Context:** Email service testing with React Email components in TypeScript monorepo
