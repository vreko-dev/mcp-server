# ⚠️ CRITICAL: LOAD ALL RULES BEFORE ANY WORK

**This rule has HIGHEST PRIORITY. Execute FIRST before any other task.**

---

## What to Do At Start of Every Session

**IMMEDIATELY, before answering any user query:**

### Step 1: Load ALL Rule Files

Automatically discover and read from these directories:
- `.qoder/rules/*.md` (workspace-level rules)
- `apps/web/.qoder/rules/*.md` (web app rules)
- `apps/vscode/.qoder/rules/*.md` (VS Code extension rules)
- Any other app-specific rule directories

**Current rule inventory (9 files):**
1. `00-LOAD-ALL-RULES-FIRST.md` (this file)
2. `always-better-auth-canonical.md` (No custom auth)
3. `always-monorepo-imports.md` (Workspace-wide imports)
4. `always-result-type-pattern.md` (Error handling)
5. `always-typescript-patterns.md` (Type safety patterns)
6. `decision-logging-observability.md` (Structured logging)
7. `decision-oauth-multi-service.md` (OAuth architecture)
8. `files-docker-deployment.md` (Docker/deployment)
9. `files-testing-vitest.md` (Testing standards)

### Step 2: Read ALL Files Completely

**Never skip or assume:**
- Read entire files, not just summaries
- Note all patterns, not just the main points
- Capture both "always do" and "never do" sections
- Understand the rationale, not just the rules

### Step 3: Categorize Rules by Type

**Always-On Rules** (apply to every task):
- `always-better-auth-canonical.md` → All auth goes through `@snapback/auth`
- `always-monorepo-imports.md` → All cross-package imports use `@snapback/*`
- `always-result-type-pattern.md` → Public APIs use `Result<T, E>`
- `always-typescript-patterns.md` → Use discriminated unions, const assertions, type guards

**Decision Rules** (apply based on task type):
- `decision-logging-observability.md` → For critical path operations, request handlers, errors
- `decision-oauth-multi-service.md` → For OAuth/multi-service setup

**File-Specific Rules** (apply to specific operations):
- `files-docker-deployment.md` → For Docker/deployment changes
- `files-testing-vitest.md` → For test writing

### Step 4: Acknowledge Which Rules Apply to Current Task

**Example responses:**
```
Rules loaded (9 total):
  ✅ Always-on (4): better-auth, imports, result-type, typescript-patterns
  ✅ Decision (2): logging (request handler), oauth (multi-service context)
  ✅ File-specific (2): testing (writing unit tests)

Applying: All 4 always-on + logging + testing
```

### Step 5: ONLY THEN Respond to User Query

With complete rule context available

---

## Why This Matters

### The Problem (Previous Sessions)
- **24 rules** crafted across workspace-level and app-specific locations
- **Partial loading:** Only 4 rules discovered, 20 missed
- **Architectural violations:** Custom auth code, wrong import patterns, unsafe types
- **Token waste:** Revisiting same issues, fixing incomplete solutions
- **Time lost:** Debugging problems rules would have prevented

### The Solution
**Automatic comprehensive rule loading** makes this impossible:
- All 9+ rules loaded and read at session start
- Every decision evaluated against complete rule set
- Consistent architectural patterns applied
- Fewer errors, faster problem solving

---

## Rule Categories & Quick Reference

### Always-On Rules (Required for ALL Tasks)

**1. `always-better-auth-canonical.md` (415 lines)**
- Pattern: NO custom auth logic ever
- Uses: `@snapback/auth` wrapper around better-auth
- Methods: `auth.api.getSession()`, `snapbackAuth.requireAuth()`
- Services receive `userId` from auth layer, never handle auth
- Plugins: better-auth's JWT, OAuth, 2FA, rate limiting, RBAC

**2. `always-monorepo-imports.md` (271 lines)**
- Pattern: All cross-package imports use `@snapback/*`
- Dependencies: `workspace:*` for internal, `catalog:` for external
- Module resolution: `bundler` mode in tsconfig
- Forbidden: Relative paths crossing package boundaries

**3. `always-result-type-pattern.md` (299 lines)**
- Pattern: `Result<T, E>` = `{ success: true; value: T } | { success: false; error: E }`
- Guards: `isOk()` and `isErr()` for type narrowing
- Use for: Expected failures, recoverable errors, public APIs
- Don't use for: Programming errors (throw instead)

**4. `always-typescript-patterns.md` (234 lines)**
- Discriminated unions for state machines (Resource<T>)
- Const assertions instead of enums
- Type guards with `is` predicate
- Assertion functions with `asserts value is T`
- Conditional types for transformations

### Decision Rules (Task-Dependent)

**5. `decision-logging-observability.md` (469 lines)**
- When: Critical path operations, request handlers, errors
- Pattern: `logger.info("message", { structured, data })`
- Import: `import { logger } from "@snapback/infrastructure"`
- Auth events: Track via better-auth `databaseHooks`, not custom events
- Redaction: Automatic for email, password, apiKey, tokens

**6. `decision-oauth-multi-service.md` (470 lines)**
- When: OAuth setup, multi-service architecture
- Architecture: API-first (API is canonical auth authority)
- URLs: `NEXT_PUBLIC_SITE_URL` (public) vs `BETTER_AUTH_URL` (internal)
- Callback: OAuth callback URL must match Google configuration exactly
- Validation: Environment variables validated at startup

### File-Specific Rules (Operation-Based)

**7. `files-docker-deployment.md` (377+ lines)**
- When: Docker setup, deployment changes
- See: Docker configuration patterns, health checks, entrypoints

**8. `files-testing-vitest.md` (266+ lines)**
- When: Writing unit tests
- Framework: Vitest with vi mocking
- Pattern: Mock `@snapback/auth`, `logger`, `Result<T, E>`

**9. `files-*.md` (other file-specific rules)**
- As discovered in `.qoder/rules/*.md`

---

## Implementation Checklist

When starting work on ANY user query:

- [ ] NEW session? Load all rules (skip if already loaded, acknowledge)
- [ ] `list_dir .qoder/rules` → identify all `.md` files
- [ ] `read_file` each rule completely (don't skim)
- [ ] Create mental map: Always-on (4) + Decision (2-5) + File-specific (N)
- [ ] Categorize current task → which rules apply?
- [ ] Acknowledge: "Rules loaded. Applying: [list]"
- [ ] THEN execute work with full context

---

## Anti-Patterns to Never Repeat

❌ **ANTI-PATTERN 1: Partial Rule Discovery**
```
AI: *calls fetch_rules on a few rules*
AI: *finds only 4 rules*
AI: *misses 5 other workspace rules*
Result: Architectural violations, wrong patterns applied
```

✅ **CORRECT: Exhaustive Discovery**
```
AI: `list_dir .qoder/rules` → finds ALL .md files
AI: `read_file` on EACH file completely
AI: Mental map of 9 rules categorized by type
Result: Complete context, consistent patterns
```

---

❌ **ANTI-PATTERN 2: Assuming Rules From Previous Context**
```
AI: "I loaded rules before, skipping..."
(But new rules added, old rules changed)
Result: Outdated patterns applied, missed rule updates
```

✅ **CORRECT: Always Validate**
```
AI: If session start → load all rules (safe, fast)
AI: If context window continuation → acknowledge loaded rules
AI: If ANY doubt → reload to verify
Result: Always using current rules
```

---

❌ **ANTI-PATTERN 3: Cherry-Picking Rules**
```
AI: "This task only needs the auth rule"
AI: Ignores import pattern rule
AI: Uses relative cross-package imports
Result: Build fails, architectural violation
```

✅ **CORRECT: Full Stack Application**
```
AI: Task "add auth to endpoint" →
  ✅ Auth rule (use @snapback/auth)
  ✅ Import rule (use @snapback/* imports)
  ✅ Result-type rule (return Result<T, E>)
  ✅ Logging rule (log auth events)
  ✅ TypeScript rule (use proper types)
Result: Complete, correct implementation
```

---

## Context Continuation

### If Continuing Previous Session

**Acknowledge at start of session:**
```
✅ Rules loaded from previous context:
  - All 9 workspace rules available
  - Ready to apply to current task
  - Will reload if any uncertainty
```

**Reload if:**
- You're uncertain about a rule
- Task type is different from previous
- More than 2 messages since rules loaded
- Any doubt whatsoever

### If Starting New Session

**Always:**
- Load all rules first
- Read each completely
- Acknowledge which apply to task
- Then execute work

---

## Performance Note

**Parallel reads are fast:**
- 9 files × ~400 lines average = 3600 lines
- Parallel `read_file` calls take ~5 seconds
- Prevents hours of mistakes and rework
- **Well worth the minimal overhead**

---

## Version History

- **2025-11-20 v2.0:** Complete rule categorization, anti-patterns, decision matrix
- **2025-11-20 v1.0:** Initial rule loading requirement

**Last Updated:** 2025-11-20
**Priority:** 🔴 CRITICAL - Execute first, every time
**Maintained By:** Architecture team
