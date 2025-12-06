# SDK Wrapping Pattern - Preventing Type Resolution Issues

**Applies to:** All third-party SDK integrations (`@snapback/infrastructure`, `@snapback-oss/infrastructure`)
**Authority:** Workspace-wide SDK safety standard
**Enforcement:** Critical - prevents DTS generation failures and type pollution
**Issue:** Sentry RollupError (Dec 6, 2025) - `RequestOptions` not exported by `node:http`

---

## The Problem: Full Namespace Re-exports

### What Goes Wrong

```typescript
// ❌ WRONG - This causes DTS failures
export { Sentry };  // Re-exports full @sentry/node namespace
```

**Why:**
1. Exporting the full `Sentry` namespace causes tsup's DTS generator to resolve ALL transitive types
2. @sentry/node imports `RequestOptions` from `node:http` (Node.js built-in)
3. `RequestOptions` is not exported by `node:http` - it's internal
4. **Result:** RollupError during DTS generation → build failure → pipeline blocked

### Real Example: Sentry Integration

```
@snapback/infrastructure/src/sentry/index.ts
  └─> export { Sentry }
      └─> imports @sentry/node
          └─> imports node:http
              └─> attempts to resolve RequestOptions
                  └─> FAILS (not exported)
```

---

## The Solution: Wrapper-First Exports

### ✅ CORRECT Pattern

```typescript
// @snapback/infrastructure/src/sentry/index.ts

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// 1. Export wrapper functions ONLY
export function initSentry(options: SentryInitOptions): void {
  Sentry.init({
    ...options,
    integrations: [nodeProfilingIntegration(), ...options.integrations || []],
  });
}

export function captureError(error: Error, context?: Record<string, any>): void {
  Sentry.captureException(error, { contexts: context });
}

export function captureMessage(message: string, level: "info" | "warn" | "error" = "info"): void {
  Sentry.captureMessage(message, level);
}

// 2. Export specific types only (if needed)
export type { SentryInitOptions };

// 3. DO NOT re-export the full namespace
// Applications that need direct Sentry access can still import it:
// import * as Sentry from "@sentry/node"
```

### Key Principles

| ❌ Don't | ✅ Do |
|---------|------|
| `export { Sentry }` | `export { initSentry, captureError }` |
| `export * from "@sentry/node"` | Export only wrapper functions |
| Re-export SDK namespaces | Define specific exported types |
| Hide SDK behind opaque interface | Document when apps should use SDK directly |

---

## Implementation Checklist

### For New SDK Integrations

- [ ] **Create wrapper functions** - Each SDK feature has a typed wrapper
- [ ] **Export functions, not namespaces** - `export function initSDK()` not `export { SDK }`
- [ ] **Document direct access** - Add comment showing how to import SDK directly if needed
- [ ] **Test DTS generation** - Run `pnpm turbo build --filter="@snapback/infrastructure"` before push
- [ ] **Update tsup.config.ts** - Add SDK to `noExternal` list if it has type issues

### For Existing SDK Integrations

1. **Audit all exports** - Find any `export { X }` where X is from node_modules
2. **Replace with function wrappers** - Create explicit wrapper functions
3. **Verify type exports** - Only export specific types, not namespaces
4. **Add to Turbo inputs** - Include `src/{sdk-name}/**/*` in turbo.json
5. **Test locally** - `pnpm turbo build --filter="@snapback/infrastructure"`

---

## Turbo Configuration

Ensure SDK wrapper changes trigger builds via explicit inputs:

```json
"@snapback/infrastructure#build": {
  "inputs": [
    "$TURBO_DEFAULT$",
    "tsup.config.ts",
    "src/sentry/**/*"  // ← Include SDK directory
  ],
  "cache": true
}
```

---

## Type Configuration

### tsup.config.ts - SDK Handling

```typescript
export default defineConfig({
  dts: {
    resolve: true,
    compilerOptions: {
      skipLibCheck: true,  // Skip validation of SDK's own types
      rootDir: undefined,  // Allow workspace deps outside rootDir
    },
  },
  // Prevent resolution of SDK's internal imports
  external: [
    "node:http",           // SDK imports these but they're built-ins
    "node:https",
    "diagnostics_channel",
  ],
  // Allow SDK itself to be processed (not marked external)
  noExternal: [
    "@sentry/node",
    "@sentry/profiling-node",
  ],
});
```

### tsconfig.json - DTS Support

Ensure `skipLibCheck` is enabled to prevent SDK type validation:

```json
{
  "compilerOptions": {
    "skipLibCheck": true,  // Skip SDK type checking
    "strict": true,        // But remain strict for own code
    "noEmitOnError": false // Allow DTS even with SDK type issues
  }
}
```

---

## Pre-Push Validation

Lefthook will catch DTS failures before push:

```bash
# This runs automatically before git push
# If DTS generation fails, the push is blocked

pnpm turbo build --filter="@snapback/infrastructure"
# If error: ❌ DTS build failed → shows helpful message pointing to this doc
# If success: ✅ All package builds verified
```

---

## Common DTS Errors and Fixes

### Error: `"X" is not exported by "node:Y"`

**Cause:** SDK imports non-exported types from Node.js built-ins
**Fix:** 
```typescript
// In tsup.config.ts
external: ["node:http", "node:https", "diagnostics_channel"]
```

### Error: `Cannot resolve module "X" from "Y"`

**Cause:** SDK has dependency not in workspace
**Fix:**
```typescript
// In tsup.config.ts
noExternal: ["@sentry/node"]  // Allow SDK to be bundled/processed
```

### Error: `Circular dependency detected`

**Cause:** SDK re-export creates circular import
**Fix:** Don't re-export the SDK namespace; export only functions

---

## Testing SDK Wrappers

Create tests that verify:
1. SDK is initialized correctly
2. Wrapper functions map to SDK methods
3. Type safety is enforced

```typescript
// test/sentry.test.ts
import { initSentry, captureError } from "@snapback/infrastructure";

describe("Sentry wrapper", () => {
  it("initializes Sentry with options", () => {
    // Verify initialization
  });

  it("captures errors through wrapper", () => {
    const error = new Error("Test");
    expect(() => captureError(error)).not.toThrow();
  });

  it("types are enforced", () => {
    // TypeScript compilation verifies types
  });
});
```

---

## When to Use Direct SDK Import

**DO use direct SDK import when:**
- You need advanced features not exposed in wrapper
- Wrapper would add unnecessary overhead
- You're in infrastructure code that owns the SDK

**Example:**
```typescript
// In @snapback/infrastructure internals, can use directly:
import * as Sentry from "@sentry/node";

Sentry.setUser({ id: "123" });
```

**DON'T export directly from package:**
```typescript
// ❌ DON'T
export { Sentry };

// ✅ DO - Wrap it
export function setUser(user: { id: string }): void {
  Sentry.setUser(user);
}
```

---

## References

- **Sentry DTS Issue:** Dec 6, 2025 - Infrastructure build failure (commit e7b8c3a)
- **Solution:** Remove `export { Sentry }` line + enhance tsup.config.ts
- **Impact:** 0 build failures after change, all DTS generation succeeds
- **Turbo Inputs:** Updated to include `src/sentry/**/*` for cache invalidation

---

## Checklist for Code Review

When reviewing SDK integrations:

- [ ] No `export { SDKNamespace }` statements
- [ ] All exports are function wrappers or types
- [ ] tsup.config.ts has SDK in `noExternal` list
- [ ] Node.js built-ins in `external` list if SDK imports them
- [ ] DTS build test passes: `pnpm turbo build --filter="@snapback/infrastructure"`
- [ ] Turbo.json includes SDK source in inputs
- [ ] Tests verify wrapper functions work correctly

**Last Updated:** 2025-12-06
**Author:** Build System Hardening Task
**Status:** Active - Enforced by pre-push lefthook validation
