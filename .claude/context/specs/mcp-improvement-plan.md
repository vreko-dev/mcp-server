# SnapBack MCP Improvement Plan

**Generated:** 2025-12-29
**Status:** Ready for Implementation
**Scope:** packages/mcp, .snapback/learnings

---

## Executive Summary

The SnapBack MCP server has **excellent foundational architecture** with:
- 92% token reduction via wire format
- 24 → 7 tool consolidation
- Tiered learning system (hot/warm/cold)

However, **domain-aware learning loading is incomplete**, reducing effectiveness by ~40%.

---

## Current Architecture Grade: B+

### Strengths

| Area | Score | Details |
|------|-------|---------|
| Token Efficiency | A+ | 🧢|TYPE|fields format = ~100 tokens vs ~1300 |
| Tool Consolidation | A | 7 unified tools replace 24 legacy |
| Tiered Learning | A- | Hot/Warm/Cold with auto-promotion |
| Validation | A | Zod schemas, path traversal protection |
| Branding | A | Consistent 🧢 SnapBack voice |

### Gaps Identified

| Gap | Severity | Impact |
|-----|----------|--------|
| Domain files not in intent mappings | P0 | 40% learning relevance loss |
| Keyword-domain detection missing | P0 | Domain context ignored |
| Check 'l' mode undocumented | P1 | Schema/code mismatch |
| Error handling inconsistent | P1 | Mixed response formats |
| Session state fragmented | P2 | Potential state drift |

---

## Gap Analysis Detail

### 1. INTENT_LEARNING_FILES Incomplete

**Location:** `packages/mcp/src/services/tiered-learning-service.ts:97-103`

**Current:**
```typescript
export const INTENT_LEARNING_FILES: Record<TaskIntent, string[]> = {
  implement: ["architecture-patterns.jsonl", "domain-intelligence.jsonl", "architecture-context.jsonl"],
  debug: ["anti-patterns.jsonl", "domain-testing.jsonl"],
  refactor: ["workflow-patterns.jsonl", "architecture-context.jsonl"],
  review: ["anti-patterns.jsonl", "domain-testing.jsonl"],
  explore: ["architecture-context.jsonl"],
};
```

**Missing Files:**
- `domain-vscode.jsonl` (7 patterns for extension work)
- `domain-web.jsonl` (6 patterns for Next.js/React)
- `domain-api.jsonl` (6 patterns for API/backend)
- `domain-mcp-cli.jsonl` (7 patterns for MCP/CLI)

### 2. Keyword-Domain Mapping Not Implemented

**Documented in:** `.snapback/learnings/INDEX.md:40-46`

```markdown
| Keyword | Domain File |
|---------|-------------|
| VSCode, extension, activation | domain-vscode.jsonl |
| Next.js, web, React, client | domain-web.jsonl |
| API, procedure, service | domain-api.jsonl |
| MCP, CLI, Commander | domain-mcp-cli.jsonl |
| vitest, test, coverage | domain-testing.jsonl |
| validation, learning, vitals | domain-intelligence.jsonl |
```

**Not in code.** TieredLearningService doesn't detect keywords to load domain files.

### 3. Check Schema Missing 'l' Mode

**Location:** `packages/mcp/src/validation.ts:235-246`

```typescript
export const checkSchema = z.object({
  m: z
    .enum(["q", "f", "p", "b", "i", "c", "d"])  // Missing "l"
    .optional()
    .describe("Mode: q=quick, f=full, p=patterns, b=build, i=impact, c=circular, d=docs"),
  // ...
});
```

But `check.ts:129-133` handles mode 'l' for learning maintenance.

---

## Improvement Plan

### P0 - Critical (Implement This Week)

#### 1. Complete INTENT_LEARNING_FILES

**File:** `packages/mcp/src/services/tiered-learning-service.ts`

**Change:**
```typescript
export const INTENT_LEARNING_FILES: Record<TaskIntent, string[]> = {
  implement: [
    "architecture-patterns.jsonl",
    "architecture-context.jsonl",
    "domain-intelligence.jsonl",
    // ADD domain-specific files based on common implement scenarios
  ],
  debug: [
    "anti-patterns.jsonl",
    "domain-testing.jsonl",
    "architecture-patterns.jsonl",  // ADD: errors often violate patterns
  ],
  refactor: [
    "workflow-patterns.jsonl",
    "architecture-context.jsonl",
    "anti-patterns.jsonl",  // ADD: avoid known pitfalls
  ],
  review: [
    "anti-patterns.jsonl",
    "domain-testing.jsonl",
    "architecture-patterns.jsonl",
  ],
  explore: [
    "architecture-context.jsonl",
    "workflow-patterns.jsonl",
  ],
};
```

**Effort:** 15 minutes

#### 2. Add Keyword-Domain Detection

**File:** `packages/mcp/src/services/tiered-learning-service.ts`

**New Function:**
```typescript
/**
 * Detect domain files from keywords
 * Based on INDEX.md domain signals
 */
const KEYWORD_DOMAIN_MAP: Record<string, string> = {
  // VSCode Extension
  vscode: "domain-vscode.jsonl",
  extension: "domain-vscode.jsonl",
  activation: "domain-vscode.jsonl",
  webview: "domain-vscode.jsonl",

  // Web/Next.js
  nextjs: "domain-web.jsonl",
  "next.js": "domain-web.jsonl",
  react: "domain-web.jsonl",
  client: "domain-web.jsonl",
  turbopack: "domain-web.jsonl",

  // API/Backend
  api: "domain-api.jsonl",
  procedure: "domain-api.jsonl",
  orpc: "domain-api.jsonl",
  service: "domain-api.jsonl",

  // MCP/CLI
  mcp: "domain-mcp-cli.jsonl",
  cli: "domain-mcp-cli.jsonl",
  commander: "domain-mcp-cli.jsonl",

  // Testing
  vitest: "domain-testing.jsonl",
  test: "domain-testing.jsonl",
  coverage: "domain-testing.jsonl",

  // Intelligence
  validation: "domain-intelligence.jsonl",
  learning: "domain-intelligence.jsonl",
  vitals: "domain-intelligence.jsonl",
};

function detectDomainFiles(keywords: string[]): string[] {
  const detected = new Set<string>();
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    const domain = KEYWORD_DOMAIN_MAP[lowerKeyword];
    if (domain) {
      detected.add(domain);
    }
  }
  return [...detected];
}
```

**Update loadTieredLearnings:**
```typescript
async loadTieredLearnings(options: LoadTieredLearningsOptions): Promise<ScoredLearning[]> {
  const { intent, keywords, maxLearnings = DEFAULT_MAX_LEARNINGS } = options;

  // ... existing hot tier loading ...

  // 2. Load warm tier based on intent
  const intentFiles = INTENT_LEARNING_FILES[intent as TaskIntent] || DEFAULT_DOMAIN_FILES;

  // 3. ADD: Load keyword-detected domain files
  const keywordFiles = detectDomainFiles(keywords);

  // Combine and dedupe
  const warmFiles = [...new Set([...intentFiles, ...keywordFiles])];

  for (const filename of warmFiles) {
    // ... existing warm loading logic ...
  }
}
```

**Effort:** 30 minutes

#### 3. Fix Check Schema

**File:** `packages/mcp/src/validation.ts:235-246`

**Change:**
```typescript
export const checkSchema = z.object({
  m: z
    .enum(["q", "f", "p", "b", "i", "c", "d", "l"])  // ADD "l"
    .optional()
    .describe("Mode: q=quick, f=full, p=patterns, b=build, i=impact, c=circular, d=docs, l=learnings"),
  // ...
});
```

**Effort:** 5 minutes

---

### P1 - Important (Next Sprint)

#### 4. Create Domain Mappings Module

**New File:** `packages/mcp/src/config/domain-mappings.ts`

Single source of truth for all domain → file → keyword mappings.

**Effort:** 45 minutes

#### 5. Unify Error Responses

**Files:** `packages/mcp/src/server.ts`, `packages/mcp/src/errors.ts`

Replace `CommonErrors` usage with `buildErrorResponse` from branding module.

**Effort:** 30 minutes

#### 6. Add File Path Domain Detection

Detect domain from file paths in task:
- `apps/vscode/**` → domain-vscode.jsonl
- `apps/web/**` → domain-web.jsonl
- `apps/api/**` → domain-api.jsonl
- `packages/mcp/**` → domain-mcp-cli.jsonl

**Effort:** 20 minutes

---

### P2 - Nice to Have (Backlog)

#### 7. Learning Analytics in snap_help

Show usage stats, top learnings, promotion candidates.

#### 8. SessionHealth Middleware

Apply session health to all tool responses via middleware.

#### 9. Auto-generate INDEX.md

Keep INDEX.md in sync with code automatically.

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Learning relevance score | ~0.4 | >0.7 |
| Domain files loaded per task | 1-3 | 3-5 |
| Hot tier coverage | 11 entries | 15-20 entries |
| Schema/code alignment | 90% | 100% |

---

## Implementation Order

```
Week 1:
├── P0-1: Complete INTENT_LEARNING_FILES (15 min)
├── P0-2: Add keyword-domain detection (30 min)
├── P0-3: Fix check schema (5 min)
└── Test all changes with consolidated.test.ts

Week 2:
├── P1-4: Create domain-mappings.ts (45 min)
├── P1-5: Unify error responses (30 min)
└── P1-6: File path domain detection (20 min)
```

---

## Testing Checklist

- [ ] All 7 consolidated tools pass existing tests
- [ ] Learning relevance improved (measure with debug logging)
- [ ] Domain files load based on keywords
- [ ] Check mode 'l' documented in schema
- [ ] Error responses use branded format
