---
description: "MCP server and intelligence package patterns"
globs:
  - "ai_dev_utils/mcp/**/*.ts"
  - "apps/mcp-server/**/*.ts"
  - "packages/intelligence/**/*.ts"
alwaysApply: false
---

# MCP & Intelligence Rules

**Applies to:** MCP servers, intelligence package

---

## Dual-Use Architecture

| Aspect | Internal (`ai_dev_utils/mcp`) | External (`@snapback/intelligence`) |
|--------|-------------------------------|--------------------------------------|
| **Server Name** | `"codebase"` | `"snapback"` |
| **Tool Prefix** | `mcp_codebase_*` | `mcp_snapback_*` |
| **Users** | SnapBack dev team | Platform customers |
| **Data Location** | `ai_dev_utils/` | Customer workspace |
| **ROUTER.md Access** | ✅ Full | ❌ None |

**Same algorithms, different data sources.**

---

## @snapback/intelligence Import Paths

```typescript
// Main facade
import { Intelligence } from "@snapback/intelligence";

// Subpath imports
import { ValidationPipeline } from "@snapback/intelligence/validation";
import { LearningEngine, ViolationTracker } from "@snapback/intelligence/learning";
import { ContextEngine, SemanticRetriever } from "@snapback/intelligence/context";
import { JsonlStore, ConfigStore } from "@snapback/intelligence/storage";
```

---

## 7-Layer Validation Pipeline

| Layer | Checks |
|-------|--------|
| `syntax` | Bracket matching, semicolons |
| `types` | `any` usage, @ts-ignore |
| `tests` | Vague assertions, 4-path coverage |
| `architecture` | Layer boundaries, service bypass |
| `security` | Hardcoded secrets, eval() |
| `dependencies` | Deprecated packages |
| `performance` | console.log, sync I/O |

---

## Path Resolution in ESM

```typescript
// ❌ WRONG - fails when launched via absolute path
const dir = process.cwd();

// ✅ CORRECT - works in all ESM contexts
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

---

## HTTP Server Auth Enforcement

**CRITICAL:** MCP HTTP server MUST use `@snapback/auth` for production auth.

```typescript
// ❌ WRONG - Placeholder that accepts any token
private authenticateRequest(req: IncomingMessage): boolean {
    return token.length > 0;  // NEVER validates
}

// ✅ CORRECT - Use canonical auth package
import { auth } from "@snapback/auth";

private async authenticateRequest(req: IncomingMessage): Promise<boolean> {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) return false;

    const verified = await auth.api.verifyApiKey({ key: apiKey });
    return verified?.isValid === true;
}
```

**Violation Type:** `placeholder-auth` (track in violations.jsonl)

---

## Violation Auto-Promotion

| Threshold | Action |
|-----------|--------|
| 1x | Store in `violations.jsonl` |
| 3x | Promote to `codebase-patterns.md` |
| 5x | Add automated detection rule |
