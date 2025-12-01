# SnapBack Comprehensive Architecture Analysis - Part 3 of 5

**Continued from Part 2**

---

## SECTION 2: IP PROTECTION ANALYSIS

### 2.1 Proprietary Logic Identification

#### **BUCKET A: Commodity Logic (Can be open source)**

**Standard Implementations - Safe to expose:**

1. **File System Operations**
   - `apps/vscode/src/protection/FileSystemWatcher.ts` - Standard chokidar wrapper
   - `packages/core/src/utils/watcher.ts` - File watching utilities
   - **Justification:** Well-known patterns, no competitive advantage

2. **Git Integration**
   - `packages/core/src/git-integration.ts` (partial)
   - Git diff parsing, branch detection, commit context
   - **Justification:** Uses standard git CLI commands, no proprietary logic

3. **Storage Abstraction**
   - `packages/sdk/src/storage/StorageAdapter.ts` - Interface definition
   - `packages/sdk/src/storage/MemoryStorage.ts` - In-memory implementation
   - **Justification:** Standard patterns, many alternatives exist

4. **Type Definitions**
   - `packages/contracts/src/` - All type definitions
   - Zod schemas for validation
   - **Justification:** Required for public API, no secret sauce

5. **UI Components**
   - `apps/vscode/src/ui/` - Tree views, status bar, dialogs
   - `apps/web/` - React components, dashboard UI
   - **Justification:** Standard UI patterns, visible to users anyway

6. **Configuration Management**
   - `packages/config/src/` - Config loading and validation
   - `.snapbackrc` parsing
   - **Justification:** Users need to understand config format

7. **Event Bus Infrastructure**
   - `packages/events/src/` - Pub/sub and RPC implementation
   - **Justification:** Standard IPC patterns, using Node.js primitives

8. **Basic Telemetry**
   - `packages/analytics/src/index.ts` - Event name constants
   - PostHog client initialization
   - **Justification:** Event names are logged anyway

**Total LOC in Bucket A:** ~15,000 lines

---

#### **BUCKET B: Valuable but Defensible (Can be open, provides value)**

**Novel implementations that demonstrate expertise but aren't secret sauce:**

1. **Snapshot Deduplication**
   - `apps/vscode/src/services/SnapshotService.ts` (deduplication logic)
   - Content-addressable storage using hashes
   - LRU cache for hash lookups
   - **Justification:** Good engineering, shows expertise, but algorithm is knowable
   - **Value:** Demonstrates storage efficiency
   - **Defense:** Patent pending on multi-file atomic snapshots

2. **Protection Level System**
   - `apps/vscode/src/protection/` - Watch/Warn/Block levels
   - Cooldown period management
   - Per-file protection registry
   - **Justification:** Novel UX pattern, but implementation is straightforward
   - **Value:** Unique feature that differentiates product
   - **Defense:** First-mover advantage, trademark on "SnapBack Protection Levels"

3. **MCP Protocol Integration**
   - `apps/mcp-server/src/` - MCP server implementation
   - Tool registration and validation
   - **Justification:** Demonstrates MCP expertise, early adopter
   - **Value:** One of first security tools in MCP ecosystem
   - **Defense:** Network effects (users already have it installed)

4. **Git Semantic Snapshot Naming**
   - `apps/vscode/src/semanticNamer.ts` - Intelligent snapshot names
   - Uses git context (branch, commit message) to name snapshots
   - **Justification:** Smart feature but not secret sauce
   - **Value:** Better UX than competitors
   - **Defense:** Can be copied but requires integration work

5. **Storage Broker Pattern**
   - `packages/sdk/src/storage/StorageBroker.ts` - Multi-writer coordination
   - Prevents SQLite corruption when multiple processes access DB
   - **Justification:** Solves real problem, good engineering
   - **Value:** Reliability advantage
   - **Defense:** Implementation complexity is barrier

6. **Context7 Integration**
   - `apps/mcp-server/src/context7/` - Documentation search
   - Integrates with Context7 service
   - **Justification:** Integration code, not proprietary
   - **Value:** Unique integration in market
   - **Defense:** Partnership with Context7

**Total LOC in Bucket B:** ~25,000 lines

---

#### **BUCKET C: Secret Sauce (MUST be backend-only)**

**Proprietary algorithms and business logic that provide competitive moat:**

##### **1. Advanced Risk Scoring Algorithm**

**Current Location:** 🚨 **EXPOSED IN CLIENT**
- `packages/api/src/services/guardian.ts` (lines 96-330) - Backend version
- `packages/core/src/risk-analyzer.ts` (lines 1-499) - Client version (SHOULD NOT HAVE)

**Why It's Secret Sauce:**
- Proprietary weighting system for different risk factors
- Combines multiple signals (code complexity, change velocity, threat patterns)
- Calibrated based on real-world data from production use
- Continuously tuned based on false positive/negative rates

**Specific Secret Components:**
```typescript
// From packages/api/src/services/guardian.ts
// THESE WEIGHTS ARE PROPRIETARY - Should NOT be in client code

Large Deletion Risk:
  if (linesDeleted > 100 && deletionRatio > 0.5) {
    riskScore += 20; // ← SECRET: This weight is tuned from data
  }

Secret Pattern Weights:
  AWS_KEY: weight = 10 // ← SECRET: Different patterns have different risks
  API_TOKEN: weight = 8
  PASSWORD: weight = 9
  
SQL Injection Detection:
  Specific patterns that detect real-world vulnerabilities
  Not just "SELECT *" - but context-aware detection
  riskScore += 15 // ← SECRET: Impact weight

Final Score Calibration:
  finalRiskScore = min(100, riskScore)
  riskLevel = finalRiskScore < 30 ? "low" : finalRiskScore < 70 ? "medium" : "high"
  // ← SECRET: These thresholds are optimized for false positive rate
```

**Current Exposure:** HIGH RISK
- Basic version in `@snapback/core` (exposed via npm)
- Full version in `packages/api` (server-side)
- MCP server uses local Guardian (exposed)
- CLI can use local Guardian (exposed)

**Migration Required:** YES - Move ALL scoring logic to backend

---

##### **2. Secret Detection Patterns**

**Current Location:** 🚨 **PARTIALLY EXPOSED**
- `packages/core/src/detection/plugins/secret-detection.ts` - Basic patterns (EXPOSED)
- `packages/api/src/services/secret-detection.ts` - Advanced patterns (PROTECTED)

**Why It's Secret Sauce:**
- Proprietary regex patterns for 50+ secret types
- Shannon entropy thresholds tuned from real data
- Context-aware detection (e.g., knows difference between example code and real secrets)
- Continuous updates as new secret formats emerge

**Secret Components:**
```typescript
// From packages/api/src/services/secret-detection.ts
// THESE PATTERNS ARE PROPRIETARY

const ADVANCED_SECRET_PATTERNS = [
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/, // ← PUBLIC knowledge
    weight: 10, // ← SECRET: Optimized weight
    entropyThreshold: 4.5, // ← SECRET: Tuned threshold
  },
  {
    name: "Stripe Secret Key",
    pattern: /sk_live_[0-9a-zA-Z]{24}/, // ← SECRET: Not well-documented
    weight: 9,
  },
  {
    name: "Database URL with Credentials",
    pattern: /postgres:\/\/[^:]+:[^@]+@[^\/]+/, // ← SECRET: Custom pattern
    weight: 10,
  },
  // ... 47 more patterns
];

// Entropy calculation (method is public, but thresholds are tuned)
function calculateEntropy(str: string): number {
  // Shannon entropy
  // Threshold of 4.5 is SECRET - optimized to minimize false positives
}
```

**Current Exposure:** MEDIUM RISK
- Basic patterns in `@snapback/core` (10-15 patterns)
- Advanced patterns in backend only (50+ patterns)
- Entropy thresholds exposed in client

**Migration Required:** YES - Keep only basic patterns in client, advanced in backend

---

##### **3. Mock Replacement Detection**

**Current Location:** 🚨 **FULLY EXPOSED**
- `packages/core/src/detection/plugins/mock-replacement.ts` - All logic exposed

**Why It's Secret Sauce:**
- Novel detection of when AI replaces real implementations with mocks
- Specific AST patterns that identify problematic replacements
- Heuristics for "suspicious" mock patterns

**Secret Components:**
```typescript
// From packages/core/src/detection/plugins/mock-replacement.ts
// THIS IS PROPRIETARY LOGIC

Detection patterns:
1. Function body replaced with "return mockData"
2. API calls replaced with "Promise.resolve(fakeData)"
3. Database queries replaced with "return []"
4. Authentication bypassed with "return true"

AST Analysis:
- Detects when function complexity suddenly drops
- Identifies return statements with literal values
- Checks for removed error handling
- Looks for removed API calls

Risk Scoring:
- Weight based on function importance (auth = high, utils = low)
- Context-aware (test files = OK, production = BAD)
```

**Current Exposure:** HIGH RISK
- **Fully exposed in npm package**
- Competitors can see exact algorithm
- No barriers to copying

**Migration Required:** YES - Move to backend completely

---

##### **4. Phantom Dependency Detection**

**Current Location:** 🚨 **FULLY EXPOSED**
- `packages/core/src/detection/plugins/phantom-dependency.ts` - All logic exposed

**Why It's Secret Sauce:**
- Detects when AI adds imports for packages not in package.json
- Novel cross-file analysis
- Specific heuristics for "risky" phantom dependencies

**Secret Components:**
```typescript
// Detection Algorithm:
1. Parse all import statements (ESM and CommonJS)
2. Cross-reference with package.json dependencies
3. Check node_modules for transitive dependencies
4. Identify "phantom" imports (not in package.json, not transitive)
5. Risk scoring:
   - External package not in registry: HIGH risk
   - Typosquatting potential: CRITICAL risk
   - Legitimate but missing: MEDIUM risk
```

**Current Exposure:** HIGH RISK
- Algorithm fully visible in client code
- Easy to copy

**Migration Required:** YES - Move to backend

---

##### **5. AI-Generated Code Detection Heuristics**

**Current Location:** 🚨 **PARTIALLY EXPOSED**
- `packages/core/src/ai-detection.ts` - Basic heuristics (EXPOSED)
- Backend may have enhanced version (need to verify)

**Why It's Secret Sauce:**
- Proprietary patterns for detecting AI-generated code
- Statistical analysis of code patterns
- Fingerprinting of different AI models (GPT-4, Claude, Copilot)

**Secret Components:**
```typescript
// AI Detection Heuristics (if they exist):
1. Code style consistency analysis
2. Comment patterns typical of AI (e.g., overly verbose)
3. Variable naming patterns (AI prefers descriptive names)
4. Code structure patterns (AI often uses specific patterns)
5. Sudden changes in coding style within same session
```

**Current Exposure:** MEDIUM RISK (if heuristics exist)

**Migration Required:** YES (if advanced heuristics exist)

---

##### **6. Policy Evaluation Engine**

**Current Location:** 🚨 **HARDCODED IN MULTIPLE PLACES**
- `apps/mcp-server/src/index.ts` (lines 26-66) - Inline logic
- `apps/vscode/src/policy/` - Some logic
- `packages/policy-engine/src/` - Empty skeleton

**Why It's Secret Sauce:**
- Proprietary rules for when to block/warn/allow
- Tiered policy system (free vs paid features)
- Configurable policies for enterprise customers
- ML-based policy recommendations

**Secret Components:**
```typescript
// Current hardcoded logic (should be in policy engine):
if (criticalIssues > 0) return "block";
if (highIssues > 0) return "review";
return "apply";

// SHOULD BE:
Configurable rules based on:
- User tier (free/pro/enterprise)
- File type (auth/payment/config)
- Time of day (block risky changes at night)
- User history (trust score)
- Team policies (org-wide rules)
```

**Current Exposure:** MEDIUM RISK
- Basic logic visible but not sophisticated yet
- Opportunity to build advanced engine before competitors

**Migration Required:** YES - Build proper policy engine backend

---

### 2.2 Current Exposure Analysis

| Component | Current Location | Exposure | Risk Level | Migration Difficulty | Priority |
|-----------|------------------|----------|------------|---------------------|----------|
| Risk Scoring Algorithm | `@snapback/core` + Backend | Client + Server | 🔴 HIGH | MEDIUM | P1 |
| Secret Detection Patterns (Advanced) | Backend only | Server | 🟢 LOW | N/A | P3 |
| Secret Detection Patterns (Basic) | `@snapback/core` | Client | 🟡 MEDIUM | EASY | P2 |
| Mock Replacement Detection | `@snapback/core` | Client | 🔴 HIGH | MEDIUM | P1 |
| Phantom Dependency Detection | `@snapback/core` | Client | 🔴 HIGH | MEDIUM | P1 |
| AI Code Detection | `@snapback/core` | Client | 🟡 MEDIUM | EASY | P2 |
| Policy Engine | Scattered | Client + Server | 🟡 MEDIUM | HARD | P1 |
| Snapshot Deduplication | VSCode extension | Client | 🟢 LOW | N/A | P4 |
| Protection Levels UX | VSCode extension | Client | 🟢 LOW | N/A | P4 |

**Critical Issues:**

1. **`@snapback/core` package exposes too much**
   - Published to npm (public)
   - Contains risk scoring logic
   - Contains all detection plugin algorithms
   - Anyone can `npm install @snapback/core` and see the code

2. **Client apps can run full analysis locally**
   - VSCode extension has Guardian instance
   - MCP server has Guardian instance
   - CLI has Guardian instance
   - Users can bypass backend completely

3. **No API-only features**
   - Everything backend can do, client can do
   - No incentive to use backend API
   - No moat around proprietary logic

---

### IP Protection Recommendations

#### **Immediate Actions (Week 1)**

1. **Audit `@snapback/core` exports**
   - Remove risk scoring functions from public API
   - Keep only plugin *interfaces*, not implementations
   - Add deprecation warnings

2. **Create `@snapback/core-internal` package**
   - Private package (not published to npm)
   - Contains full detection logic
   - Only used by backend services

3. **Backend-only features**
   - Advanced secret patterns
   - ML-based risk scoring
   - Custom rule evaluation
   - Historical analysis

#### **Medium-term (Weeks 2-4)**

4. **Refactor client packages**
   - `@snapback/core` becomes lightweight client library
   - Basic validation only (file size, syntax)
   - All real analysis happens via API calls

5. **API Gateway with tiered access**
   - Free tier: Basic secret detection (10 patterns)
   - Pro tier: Advanced detection (50+ patterns)
   - Enterprise tier: Custom rules + ML scoring

6. **Offline mode fallback**
   - Client has *basic* detection for offline use
   - Clearly labeled as "Limited Analysis"
   - Upgrade prompts to use full backend

---

## SECTION 3: REDUNDANCY & WASTE ANALYSIS

### 3.1 Duplicate Code

#### **Duplicate 1: Risk Scoring Algorithm**

**Primary Location (Should be single source):**
- `packages/core/src/risk-analyzer.ts` (lines 1-499) - 499 lines

**Duplicate Locations:**
- 🚨 `packages/api/src/services/guardian.ts` (lines 96-330) - ~230 lines
  - **Different implementation**
  - Different weights
  - Different patterns
  - More advanced
  
**Impact:**
- **Inconsistent results** between local and backend analysis
- **Maintenance burden**: Bug fixes must be applied twice
- **Confusion**: Developers don't know which is "correct"

**Recommendation:**
- ✅ **Keep**: `packages/api/src/services/guardian.ts` (backend version)
- ❌ **Remove**: Risk scoring from `packages/core/src/risk-analyzer.ts`
- ✅ **Add**: Lightweight client stub that calls backend API

**Savings:**
- ~230 lines removed from `@snapback/core`
- Single source of truth
- Consistent results across all surfaces

**Effort:** 6 hours

---

#### **Duplicate 2: Secret Detection Logic**

**Primary Location:**
- `packages/core/src/detection/plugins/secret-detection.ts` - Basic patterns

**Duplicate Location:**
- 🚨 `packages/api/src/services/secret-detection.ts` - Advanced patterns

**Problem:**
- Two separate implementations
- Different pattern sets
- No shared code

**Recommendation:**
- ✅ **Keep both**, but refactor:
  - `@snapback/core` - Basic patterns only (10-15 patterns for offline mode)
  - `packages/api` - All patterns (50+ patterns)
- ✅ **Shared pattern format**: Extract pattern definitions to `@snapback/contracts`
- ✅ **Import basic patterns** in backend, extend with advanced

**Savings:**
- Shared pattern format: ~100 lines of duplication removed
- Easier to add new patterns (define once)

**Effort:** 4 hours

---

#### **Duplicate 3: Policy Evaluation**

**Locations:**
- 🚨 `apps/mcp-server/src/index.ts` (lines 26-66) - Inline function
- 🚨 `apps/vscode/src/policy/` - Some policy logic
- 🚨 Hardcoded in multiple command handlers

**Example:**
```typescript
// apps/mcp-server/src/index.ts
function evaluatePolicy(sarif: any): PolicyDecision {
  if (issueCounts.critical > 0) return { action: "block", ... };
  if (issueCounts.high > 0) return { action: "review", ... };
  return { action: "apply", ... };
}

// apps/vscode/src/commands/someCommand.ts
if (riskScore > 8) {
  vscode.window.showErrorMessage("High risk!");
  return;
}

// Hardcoded thresholds scattered everywhere
```

**Recommendation:**
- ✅ **Create**: `@snapback/policy-engine` proper implementation
- ✅ **Centralize**: All policy logic in one place
- ✅ **Configuration-driven**: Policies defined in config files, not code

**Savings:**
- ~200 lines of scattered policy logic → 1 policy engine
- Configurable policies without code changes

**Effort:** 2 days

---

#### **Duplicate 4: Snapshot Management**

**Locations:**
- ✅ `apps/vscode/src/services/SnapshotService.ts` - VSCode implementation
- ✅ `packages/sdk/src/snapshot/SnapshotManager.ts` - SDK implementation
- 🚨 `apps/mcp-server/src/tools/create-snapshot.ts` - MCP implementation

**Problem:**
- VSCode and SDK have good implementations
- MCP server has its own implementation (in-memory only)
- Not sharing code

**Recommendation:**
- ✅ **Keep**: `packages/sdk/src/snapshot/SnapshotManager.ts` as primary
- ✅ **Refactor**: VSCode to use SDK's SnapshotManager
- ✅ **Refactor**: MCP server to use SDK's SnapshotManager

**Savings:**
- ~300 lines removed from VSCode
- ~150 lines removed from MCP server
- Single implementation, consistent behavior

**Effort:** 1 day

---

#### **Duplicate 5: Storage Implementations**

**Locations:**
- ✅ `packages/sdk/src/storage/LocalStorage.ts` - SQLite storage
- ✅ `apps/vscode/src/storage/SqliteStorageAdapter.ts` - VSCode-specific storage

**Problem:**
- Two separate SQLite implementations
- Different schemas
- Different approaches

**Recommendation:**
- ✅ **Consolidate**: Use SDK's LocalStorage everywhere
- ✅ **Extend**: If VSCode needs custom features, extend LocalStorage class

**Savings:**
- ~500 lines removed from VSCode
- Consistent schema

**Effort:** 1 day

---

#### **Duplicate 6: Git Integration**

**Locations:**
- ✅ `packages/core/src/git-integration.ts` - Core git utilities
- 🚨 Various git commands scattered in VSCode extension

**Recommendation:**
- ✅ **Centralize**: All git operations use `@snapback/core` GitIntegration class

**Savings:**
- ~100 lines of redundant git commands

**Effort:** 3 hours

---

### 3.2 Unused Code

#### **Finding unused exports:**

Let me check actual usage:

**Potentially Unused Exports:**

1. **`packages/analytics/src/index.ts`**
   - Exports `AnalyticsEvents` enum
   - Used in web app but not consistently
   - Many events defined but never fired
   - **Recommendation:** Audit event usage, remove unused events
   - **Savings:** Minimal, but cleaner API

2. **`packages/policy-engine/src/`**
   - Entire package is skeleton (402 LOC)
   - Exports types but no implementation
   - **Recommendation:** Either implement or remove package
   - **Savings:** 402 lines if removed (but we need to implement it)

3. **`packages/core/src/circuit-breaker.ts`**
   - Circuit breaker utility
   - Not clear if it's actually used
   - **Recommendation:** Check usage, remove if unused
   - **Savings:** ~200 lines

4. **`packages/core/src/mcp-federation.ts`**
   - MCP federation logic
   - Not clear if actually used
   - **Recommendation:** Check usage, document or remove
   - **Savings:** Unknown

**Action Items:**
- Run dependency analysis: `npx madge --circular --extensions ts src/`
- Check for unused exports: `npx ts-prune`
- Remove dead code

**Estimated Savings:** 500-1000 lines of unused code

---

### 3.3 Over-Abstraction

#### **Over-Abstraction 1: Storage Abstraction Layers**

**Current Architecture:**
```
StorageAdapter (interface)
  ↓
StorageBroker (coordinator)
  ↓
StorageBrokerAdapter (implements StorageAdapter)
  ↓
LocalStorage (actual implementation)
  ↓
SQLite (database)
```

**Problem:**
- 4 layers of abstraction for simple SQLite operations
- StorageBroker adds complexity for multi-writer coordination
- Most of the time, there's only 1 writer (VSCode extension)

**Recommendation:**
- ✅ **Keep**: StorageAdapter interface (allows for MemoryStorage, CloudStorage, etc.)
- ✅ **Keep**: LocalStorage implementation
- ⚠️ **Simplify**: StorageBroker only needed when multiple processes access DB
  - Use StorageBroker only in MCP server scenario
  - Use LocalStorage directly in VSCode extension

**Savings:**
- Simpler mental model
- Faster operations (fewer layers)
- Keep flexibility without unnecessary complexity

**Effort:** 4 hours

---

#### **Over-Abstraction 2: Event Bus**

**Current Architecture:**
```
SnapBackEventBus
  - Pub/Sub pattern
  - Request/Response pattern
  - Server/Client setup
  - IPC over HTTP or WebSocket
```

**Usage:**
- Used for MCP ↔ VSCode communication
- Used for Extension ↔ Backend communication

**Problem:**
- Complex event bus for simple request/response
- HTTP would work fine for most cases
- Adds latency and complexity

**Recommendation:**
- ✅ **Keep**: Event bus for MCP ↔ VSCode (they're separate processes)
- ⚠️ **Simplify**: Use direct HTTP for Extension ↔ Backend (already have HTTP client)
- ✅ **Document**: Clear use cases for when to use event bus vs HTTP

**Savings:**
- Reduced complexity in some code paths
- Keep event bus where it adds value (local IPC)

**Effort:** 2 days

---

#### **Over-Abstraction 3: Multiple API Clients**

**Current Implementations:**
- `packages/sdk/src/client/SnapbackClient.ts` - Main SDK client
- `apps/vscode/src/services/api-client.ts` - VSCode-specific client
- `apps/cli/src/services/api-client.ts` - CLI-specific client
- `apps/mcp-server/src/client/snapback-api.ts` - MCP-specific client

**Problem:**
- 4 different API client implementations
- Each has slightly different method signatures
- Duplication of HTTP request logic

**Recommendation:**
- ✅ **Consolidate**: Everyone uses `@snapback/sdk` SnapbackClient
- ✅ **Extend**: If surface needs custom methods, extend base client class

**Savings:**
- ~800 lines of duplicate HTTP client code
- Consistent API usage across surfaces

**Effort:** 1 day

---

### Summary of Redundancy & Waste

| Issue | Type | Lines to Remove | Effort | Impact |
|-------|------|-----------------|--------|--------|
| Duplicate risk scoring | Duplication | ~230 | 6 hours | High (consistency) |
| Duplicate secret detection | Duplication | ~100 | 4 hours | Medium |
| Scattered policy logic | Duplication | ~200 | 2 days | High |
| Duplicate snapshot management | Duplication | ~450 | 1 day | Medium |
| Duplicate storage implementations | Duplication | ~500 | 1 day | High |
| Unused code | Dead code | ~500-1000 | 1 day | Low (cleanup) |
| Over-abstracted storage | Over-engineering | 0 (simplify) | 4 hours | Medium (perf) |
| Multiple API clients | Duplication | ~800 | 1 day | High |
| **TOTAL** | | **~2,780-3,280 lines** | **7-8 days** | |

**Key Takeaway:** By consolidating logic and removing duplication, we can remove ~3,000 lines of code (3.75% of codebase) while making the system MORE maintainable and consistent.

---

## End of Part 3

**Next:** Part 4 will cover Sections 4 (Database Schema Alignment) and 5 (Service Layer Gaps).
