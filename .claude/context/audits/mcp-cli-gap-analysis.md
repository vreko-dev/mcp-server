# SnapBack MCP/CLI Gap Analysis

**Date**: 2025-12-26
**Scope**: Analysis of MCP tools, CLI commands, and Intelligence package
**Goal**: Identify where implementation falls short of providing meaningful code quality assurance

---

## Executive Summary

SnapBack's current implementation provides a **facade of code quality assurance** without the depth needed for genuine protection. The system relies almost entirely on **regex-based pattern matching** rather than actual code parsing, **keyword-based** rather than semantic retrieval, and **path-based heuristics** rather than code analysis.

**Critical Finding**: The 0.95 confidence score returned by `check_patterns` can be generated while missing 13+ substantive issues in code. This creates a **false sense of security** for AI agents and developers.

---

## 1. Tool Inventory & Actual Behavior

### 1.1 `begin_task` / `get_context`
**Location**: `packages/mcp/src/facades/begin-task.ts:330`

| Aspect | Expected | Actual | Gap |
|--------|----------|--------|-----|
| **Input** | Task description, files, keywords | Correctly accepted | - |
| **Risk Assessment** | Code analysis | **Path-based heuristics only** | Checks if path contains "auth", "payment", etc. |
| **Pattern Retrieval** | Semantic search | **Keyword substring matching** | `searchText.includes(keyword.toLowerCase())` |
| **Confidence** | Based on analysis depth | **Arbitrary** | High confidence with minimal analysis |

**Code Evidence**:
```typescript
// packages/mcp/src/facades/begin-task.ts:84-117
function assessRisk(files: string[], _workspaceRoot: string): RiskAssessment {
  for (const file of files) {
    const lowerPath = file.toLowerCase();
    if (lowerPath.includes("auth") || lowerPath.includes("login")) {
      riskAreas.push("auth");
    }
    // ... more path checks
  }
}
```

**False Positive Risk**: HIGH - A file named `daemon-auth-handler.ts` with buffer overflow vulnerabilities would be flagged as "high risk" for the wrong reason (path contains "auth"), while the actual vulnerabilities go undetected.

---

### 1.2 `check_patterns` / `validate`
**Location**: `packages/intelligence/src/validation/ValidationPipeline.ts`

| Layer | Expected | Actual | Gap |
|-------|----------|--------|-----|
| 1. Syntax | AST parsing | **Bracket counting** | `(code.match(/\{/g) || []).length` |
| 2. Types | TypeScript compiler | **Regex for `any`** | `code.match(/:\s*any\b/g)` |
| 3. Tests | Coverage analysis | **String matching** | `code.includes(".toBeTruthy()")` |
| 4. Architecture | Import graph | **String matching** | `code.includes("@snapback/infrastructure")` |
| 5. Security | Semgrep/SAST | **Basic regex** | 4 patterns total |
| 6. Dependencies | Package audit | **Hardcoded list** | 3 deprecated packages |
| 7. Performance | Profiling | **Regex** | `code.includes("console.log")` |

**Code Evidence**:
```typescript
// packages/intelligence/src/validation/layers/index.ts:37-46
// Layer 1: Syntax Validation
const openBrackets = (code.match(/\{/g) || []).length;
const closeBrackets = (code.match(/\}/g) || []).length;
if (openBrackets !== closeBrackets) {
  issues.push({ severity: "critical", type: "SYNTAX_ERROR", ... });
}
```

**False Positive Risk**: CRITICAL - This will flag valid code like:
```typescript
const obj = { key: '}' };  // String containing brace
```

---

### 1.3 `get_learnings`
**Location**: `packages/intelligence/src/learning/LearningEngine.ts:161`

| Aspect | Expected | Actual | Gap |
|--------|----------|--------|-----|
| **Relevance Algorithm** | Semantic similarity | **Keyword substring** | `allText.includes(kw)` |
| **Scoring** | TF-IDF, embeddings | **Occurrence count** | `score += 1` per match |
| **Context Window** | Similar tasks | **No task context** | Returns any matching learning |

**Code Evidence**:
```typescript
// packages/intelligence/src/learning/LearningEngine.ts:161-171
query(keywords: string[]): Learning[] {
  return learnings.filter((learning) => {
    const allText = [...triggers, learning.action].join(" ").toLowerCase();
    return lowerKeywords.some((kw) => allText.includes(kw));
  });
}
```

**Example Failure**: Searching for "daemon IPC socket permissions" might return learnings about "archived package tests" because both contain the word "test" somewhere in the text.

---

### 1.4 `analyze_risk` (via RiskAnalyzer)
**Location**: `packages/core/src/risk-analyzer.ts`

| Aspect | Expected | Actual | Gap |
|--------|----------|--------|-----|
| **Threat Detection** | SAST, dataflow | **4 regex patterns** | `rm -rf`, `DROP TABLE`, passwords |
| **Complexity** | Cyclomatic complexity | **Line/function counting** | `(content.match(/function\s+\w+/g) || [])` |
| **Vulnerability Scan** | CVE database | **None** | No external threat intel |

**Code Evidence** (threat-detection.ts:14-31):
```typescript
const threatPatterns = {
  critical: [
    { pattern: /rm\s+-rf/i, description: "rm -rf", severity: 1.0 },
    { pattern: /DROP\s+TABLE/i, description: "DROP TABLE", severity: 1.0 },
  ],
  high: [
    { pattern: /password\s*[:=]\s*['"]/i, description: "hardcoded password" },
    { pattern: /api_?key\s*[:=]\s*['"]/i, description: "exposed API key" },
  ],
};
```

**Missing Patterns**:
- Path traversal (`../../../etc/passwd`)
- Command injection (`` `${userInput}` ``)
- Buffer limits
- Socket permissions
- Prototype pollution
- SSRF
- XXE
- Open redirect
- Insecure deserialization

---

## 2. Learning Store Analysis

### 2.1 Schema
**Location**: `packages/intelligence/src/types/learning.ts`

```typescript
interface Learning {
  id: string;            // L-{uuid}
  type: LearningType;    // pattern | pitfall | efficiency | discovery | workflow
  trigger: string;       // What triggers this learning
  action: string;        // What to do
  solution?: string;     // Alias for action
  source?: string;       // Where learned from
  timestamp: string;     // ISO date
}
```

**Issues**:
- No embedding vector for semantic search
- No project/workspace scope
- No confidence score
- No expiration/staleness tracking
- No validation that learnings are still applicable

### 2.2 Storage
- **Format**: JSONL (line-delimited JSON)
- **Location**: `.snapback/learnings/learnings.jsonl`
- **Query Method**: Full file scan + substring matching
- **Performance**: O(n) for every query

### 2.3 Relevance Scoring
```typescript
// packages/mcp/src/facades/begin-task.ts:210-220
const scored = learnings.map((learning) => {
  let score = 0;
  const searchText = `${learning.trigger} ${learning.action}`.toLowerCase();
  for (const keyword of keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      score += 1;  // Just count occurrences
    }
  }
  return { ...learning, score };
});
```

**Problems**:
1. **No term frequency**: "socket" appearing 5 times doesn't increase score
2. **No inverse document frequency**: Common words weighted equally
3. **No semantic understanding**: "IPC" won't match "inter-process communication"
4. **No context weighting**: All fields weighted equally

---

## 3. Pattern Matching Capabilities

### 3.1 Current State: Regex-Only

**Security Matchers** (`packages/intelligence/src/patterns/matchers/security.ts`):
| Pattern | Detection Method | Coverage |
|---------|-----------------|----------|
| Helmet | `/import.*helmet/g` | Import only |
| CORS | `/Access-Control-Allow-Origin/g` | String match |
| Rate Limit | `/express-rate-limit/g` | Import only |
| SQL Injection | `/query\s*\(\s*[\`'"].*\$\{/g` | Template literals only |
| XSS | `/dangerouslySetInnerHTML/g` | React only |
| Secrets | `/api_key.*['"][^'"]{20,}/g` | Basic patterns |

**What's Missing**:
- No AST parsing (cannot understand code structure)
- No dataflow analysis (cannot track tainted inputs)
- No type-aware analysis (cannot leverage TypeScript)
- No cross-file analysis (cannot follow imports)

### 3.2 Pattern File Format
```typescript
interface PatternMatcher {
  id: string;
  name: string;
  category: string;
  files: string[];        // Glob patterns
  isPositive: boolean;    // Good pattern or anti-pattern
  importance: string;
  description: string;
  match: (content: string, filePath: string) => PatternMatch[];
}
```

**Limitation**: Patterns are JavaScript functions, not declarative rules. This means:
- Cannot be edited without code deployment
- Cannot be shared between projects easily
- Cannot be validated statically

---

## 4. Static Analysis Integration

### 4.1 Current State

| Capability | Status | Location |
|------------|--------|----------|
| TypeScript Compiler | **Not integrated** | - |
| ESLint | **Not integrated** | - |
| Semgrep | **Not integrated** | - |
| Tree-sitter | **Not integrated** | - |
| Biome | **Not integrated** | - |

**Evidence**: The `@typescript-eslint/parser` mentioned in `packages/core/CLAUDE.md` is listed as a dependency but **not used** in any validation pipeline:

```bash
# Search for actual usage
grep -r "@typescript-eslint/parser" packages/intelligence/src/
# No results

grep -r "parseForESLint\|parse(" packages/intelligence/src/validation/
# No results
```

### 4.2 What's Actually Used

```typescript
// packages/core/src/detection/utils/ast-helpers.ts
// This file exists but is DEPRECATED per index.ts:1-9
```

The detection plugins are marked deprecated:
```typescript
// packages/core/src/detection/index.ts:1-9
/**
 * @deprecated These detection plugins are deprecated and will be removed in v1.0.0.
 * Use the V2 engine signals instead...
 */
```

However, the V2 engine referenced doesn't appear to have AST parsing either.

---

## 5. Spec Compliance Checking

### 5.1 Current State: **Not Implemented**

| Capability | Status |
|------------|--------|
| Parse markdown specs | Not implemented |
| Extract requirements | Not implemented |
| Track requirement coverage | Not implemented |
| Validate implementation | Not implemented |
| Generate compliance report | Not implemented |

**Evidence**: No code exists to:
1. Parse markdown/PRD documents
2. Extract requirements (MUST, SHOULD, etc.)
3. Map requirements to implementations
4. Track completion status

### 5.2 How It Should Work

```
┌─────────────────────────────────────────────────────┐
│                 Design Spec (MD)                     │
│  - R1: Socket permissions must be 0600              │
│  - R2: Buffer size limited to 64KB                  │
│  - R3: Authentication required for all commands     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│               Requirement Extractor                  │
│  Parse MUST/SHOULD/SHALL statements                 │
│  Generate testable assertions                       │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Implementation Scanner                  │
│  AST parse source code                              │
│  Match against requirement assertions               │
│  Report coverage                                    │
└─────────────────────────────────────────────────────┘
```

---

## 6. Gap Identification Matrix

| Capability | Expected | Actual | Gap Severity | Effort |
|------------|----------|--------|--------------|--------|
| Code Parsing | AST-based | Regex | **CRITICAL** | L |
| Type Analysis | TS compiler | None | **CRITICAL** | M |
| Security Scan | OWASP patterns | 4 regex | **CRITICAL** | M |
| Learning Search | Semantic | Keyword substring | HIGH | M |
| Pattern DSL | Declarative | JavaScript functions | HIGH | L |
| Spec Compliance | Requirement tracking | None | HIGH | L |
| Dependency Audit | CVE database | Hardcoded list | HIGH | S |
| Cross-file Analysis | Import graph | None | HIGH | L |
| Confidence Scoring | Analysis-based | Arbitrary | MEDIUM | S |
| Performance Profiling | Actual measurement | Regex patterns | MEDIUM | M |

**Legend**: S = Small (1-2 days), M = Medium (1-2 weeks), L = Large (1+ month)

---

## 7. Recommended Libraries & Approaches

### 7.1 For Code Parsing (AST-based)

| Library | Purpose | Benefit | Effort |
|---------|---------|---------|--------|
| **tree-sitter** | Fast incremental parsing | 100+ languages, real structure | M |
| **@typescript-eslint/parser** | Full TypeScript AST | Already a dependency, type-aware | S |
| **ts-morph** | TypeScript compiler API | Symbol resolution, refactoring | M |
| **oxc** | Rust-based fast parser | 10-100x faster than Babel | L |

**Recommendation**: Start with `@typescript-eslint/parser` since it's already a dependency.

### 7.2 For Security Analysis

| Library | Purpose | Benefit | Effort |
|---------|---------|---------|--------|
| **Semgrep** | Polyglot SAST | 1000+ rules, custom patterns | M |
| **eslint-plugin-security** | Node.js patterns | Path traversal, buffer issues | S |
| **njsscan** | Node.js scanner | OWASP patterns | S |
| **osv-scanner** | Dependency audit | CVE database lookup | S |

**Recommendation**: Add `eslint-plugin-security` immediately (small effort, high value).

### 7.3 For Pattern Definition

| Library | Purpose | Benefit | Effort |
|---------|---------|---------|--------|
| **Semgrep patterns** | YAML-based DSL | Easy to write, share | M |
| **tree-sitter queries** | S-expression matching | Structural patterns | M |
| **ast-grep** | Fast AST matching | Simpler than Semgrep | S |

**Recommendation**: Adopt Semgrep-style YAML patterns for user-defined rules.

### 7.4 For Semantic Search

| Library | Purpose | Benefit | Effort |
|---------|---------|---------|--------|
| **transformers.js** | Local embeddings | Privacy-preserving, no API calls | M |
| **vectra** | Vector store | Simple, file-based | S |
| **OpenAI embeddings** | High-quality embeddings | Best accuracy, API cost | S |

**Recommendation**: Start with `vectra` + `transformers.js` for local semantic search.

### 7.5 For Spec Compliance

| Library | Purpose | Benefit | Effort |
|---------|---------|---------|--------|
| **remark/unified** | Markdown parsing | Extract requirements | S |
| **Gherkin/Cucumber** | BDD specs | Structured requirements | M |
| **Custom parser** | MUST/SHOULD extraction | Tailored to needs | S |

**Recommendation**: Use `remark` to parse markdown, extract requirements with regex.

---

## 8. Prioritized Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)
1. **Add eslint-plugin-security** - 15+ security patterns, minimal integration
2. **Add osv-scanner** - Dependency vulnerability scanning
3. **Fix confidence scoring** - Base on actual analysis coverage, not arbitrary
4. **Add path traversal patterns** - Critical for daemon/IPC code

### Phase 2: Foundation (2-4 weeks)
1. **Integrate @typescript-eslint/parser** - Already a dependency
2. **Add AST-based pattern matching** - Replace regex with tree queries
3. **Implement basic semantic search** - vectra + simple embeddings
4. **Add requirement extraction** - Parse markdown specs

### Phase 3: Advanced (1-2 months)
1. **Semgrep integration** - Full SAST pipeline
2. **Cross-file analysis** - Import graph, dataflow
3. **TypeScript compiler integration** - Type-aware analysis
4. **Requirement coverage tracking** - Map specs to tests

### Phase 4: Intelligence (2-3 months)
1. **LLM-based pattern detection** - For novel vulnerabilities
2. **Automated learning from violations** - Self-improving patterns
3. **Team learning aggregation** - Share patterns across workspaces
4. **Compliance dashboard** - Visual requirement tracking

---

## 9. Immediate Action Items

### 9.1 For Current Development
1. **Do not trust `check_patterns` confidence scores** - They are not meaningful
2. **Supplement with manual review** - Until real analysis is implemented
3. **Use external tools** - ESLint, TypeScript, Semgrep for actual validation

### 9.2 For SnapBack Improvement
1. **Acknowledge the gap** - Update documentation to reflect actual capabilities
2. **Lower confidence scores** - Until analysis is improved
3. **Add "experimental" warnings** - For security-critical analysis

### 9.3 For This Daemon Implementation
1. **Manual security review required** - SnapBack cannot detect the issues
2. **Add unit tests for security** - Explicit validation of permissions, buffers
3. **Use ESLint security plugin** - For path traversal, command injection

---

## Appendix: Code Locations Reference

| Component | Path |
|-----------|------|
| MCP Tool Handlers | `packages/mcp/src/facades/` |
| ValidationPipeline | `packages/intelligence/src/validation/` |
| Validation Layers | `packages/intelligence/src/validation/layers/` |
| Learning Engine | `packages/intelligence/src/learning/` |
| Pattern Matchers | `packages/intelligence/src/patterns/matchers/` |
| Risk Analyzer | `packages/core/src/risk-analyzer.ts` |
| Threat Detection | `packages/core/src/threat-detection.ts` |
| CLI Commands | `apps/cli/src/commands/` |
| Intelligence Facade | `packages/intelligence/src/Intelligence.ts` |
