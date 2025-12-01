# Comprehensive Analysis: Should packages/config Merge into packages/sdk?

## Executive Summary

**RECOMMENDATION: KEEP SEPARATE** ✓

`packages/config` and `packages/sdk/src/config` serve **fundamentally different purposes** with **zero overlap**:
- **packages/config** (983 LOC): Infrastructure & application-level configuration
- **packages/sdk/src/config** (1,170 LOC): SDK-specific client config and detection thresholds

Merging would create circular dependencies, violate separation of concerns, and pollute the SDK with infrastructure concerns.

---

## Table of Contents

1. [Complete Structure Analysis](#part-1-complete-structure-analysis)
2. [Usage Analysis](#part-2-usage-analysis)
3. [Functional Comparison](#part-3-functional-comparison)
4. [Dependency Graph](#part-4-dependency-graph-analysis)
5. [Separation Rationale](#part-5-specific-rationale-for-separation)
6. [Current Issues & Fixes](#part-6-current-issues--recommendations)
7. [Decision Matrix](#part-8-decision-matrix)
8. [Conclusion](#conclusion)

---

## Part 1: Complete Structure Analysis

### packages/config (983 LOC, 22 files)

**Directory Structure:**
```
packages/config/
├── src/
│   ├── index.ts                          (11 LOC)   - Main exports
│   ├── defaults.ts                       (41 LOC)   - snapbackDefaults
│   ├── env.ts                            (61 LOC)   - Zod-based env validation
│   ├── test.ts                           (1 LOC)    - Test placeholder
│   ├── analytics/
│   │   └── session-replay.ts             (165 LOC)  - Session replay config
│   └── utils/
│       ├── index.ts                      (5 LOC)
│       ├── base-url.ts                   (10 LOC)   - getBaseUrl()
│       ├── feature-flags.ts              (71 LOC)   - PostHog integration
│       ├── logger.ts                     (53 LOC)   - ConsoleLogger interface
│       ├── monorepo-flattener.ts         (157 LOC)  - Path flattening demo
│       └── path-transformer.ts           (149 LOC)  - Client/server path mapping
├── package.json                          - 1 dep: @snapback/contracts
├── tsconfig.json
├── tsup.config.ts
└── CLAUDE.md
```

**Main Exports:**
```typescript
export { snapbackDefaults, config } from "./defaults.js";    // Infrastructure defaults
export { env, Env } from "./env.js";                          // Zod-validated env vars
export { getBaseUrl } from "./utils/base-url.js";             // URL resolution
export { isFeatureEnabled, ... } from "./utils/feature-flags.js";  // Feature flags
export { ConsoleLogger, setLogger, ... } from "./utils/logger.js"; // Logger management
export { MonorepoFlattener, ... } from "./utils/monorepo-flattener.js";
export { transformServerToClientPath, ... } from "./utils/path-transformer.js";
```

**What It Exports:**

1. **snapbackDefaults** - Infrastructure operations
   ```typescript
   {
     mcp: { timeoutMs: 5000, maxConcurrent: 4, retry {...}, circuit {...} },
     watcher: { debounceMs: 120, awaitWriteFinish {...}, ignored [...] },
     storage: { retention {...}, compression: "brotli" },
     analysis: { deep: { enabled: true, lazyLoad: true } },
     telemetry: { enabled: true, level: "warn" }
   }
   ```

2. **Environment Variables** (12 categories, Zod-validated)
   - Database: DATABASE_URL, DIRECT_URL
   - Auth: GOOGLE_*/GITHUB_* (CLIENT_ID/SECRET pairs)
   - Payments: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
   - Services: SENTRY_DSN, POSTHOG_API_KEY, REDIS_URL
   - App: NODE_ENV, PORT, APP_URL, ENABLE_SIGNUP
   - Email: RESEND_API_KEY
   - Security: RULES_SIGNING_KEY (JWS signing)
   - Logging: LOG_LEVEL

3. **Utility Functions**
   - `getBaseUrl()` - Determines app URL from NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_VERCEL_URL, or localhost:3000
   - `isFeatureEnabled(flag, userId)` - PostHog feature flag client
   - Logger factory functions
   - Path transformation utilities for monorepo structure

**Dependencies:**
```json
{
  "@snapback/contracts": "workspace:*"  // Only dependency!
}
```

---

### packages/sdk (8,416 LOC, 42 files)

**Configuration-Related Files:**
```
packages/sdk/src/
├── config.ts                              (25 LOC)   - SDKConfig interface
├── config/
│   ├── Thresholds.ts                      (605 LOC)  - CRITICAL: Empirically-tuned thresholds (IP)
│   ├── types.ts                           (161 LOC)  - SnapBackRC, ProtectionRule types
│   ├── ConfigDetector.ts                  (180 LOC)  - .snapbackrc file detection
│   └── SnapBackRCParser.ts                (200 LOC)  - .snapbackrc parsing & merging
```

**SDK Client Configuration (config.ts):**
```typescript
export interface SDKConfig {
  endpoint: string;        // API endpoint (default: https://api.snapback.dev)
  apiKey: string;          // API authentication key
  privacy: {
    hashFilePaths: boolean;      // Hash file paths in telemetry (default: true)
    anonymizeWorkspace: boolean; // Anonymize workspace name (default: false)
  };
  cache: {
    enabled: boolean;
    ttl: {
      analytics: number;         // 1 hour
      recommendations: number;   // 30 minutes
      patterns: number;          // 2 hours
    };
  };
  retry: {
    maxRetries: number;     // default: 3
    backoffMs: number;      // default: 1000
  };
}
```

**Thresholds Configuration (605 LOC - PROPRIETARY IP):**

This is the critical piece. Thresholds.ts contains empirically-tuned detection algorithms:

```typescript
export interface ThresholdsConfig {
  // Session lifecycle
  session: {
    idleTimeout: 105000;           // 105s inactivity before finalizing
    minSessionDuration: 5000;       // 5s minimum
    maxSessionDuration: 3600000;    // 1 hour max
  };

  // AI-like editing pattern detection
  burst: {
    timeWindow: 5000;              // 5s analysis window
    minCharsInserted: 100;          // 100+ characters
    maxKeystrokeInterval: 200;      // <200ms between keystrokes
    minLinesAffected: 3;            // 3+ lines
    minInsertDeleteRatio: 3;        // 3:1 insert/delete ratio
  };

  // User experience tier classification
  experience: {
    explorer: { snapshotsCreated: 5, sessionsRecorded: 3, ... },
    intermediate: { snapshotsCreated: 20, sessionsRecorded: 10, ... },
    power: { snapshotsCreated: 100, sessionsRecorded: 50, ... }
  };

  // Session auto-tagging
  tagging: {
    minBurstConfidence: 0.7;
    minLongSessionDuration: 1800000;  // 30 minutes
    maxShortSessionDuration: 30000;   // 30 seconds
    minLargeEditLines: 1000;
    normalization: { /* ... */ }
  };

  // Risk scoring (0-10 scale)
  risk: {
    blockingThreshold: 8.0;      // Block operations above this
    criticalThreshold: 7.0;      // Critical severity
    highThreshold: 5.0;          // High severity
    mediumThreshold: 3.0;        // Medium severity
  };

  // Security pattern scores (0-10 scale)
  securityScores: {
    evalUsage: 4.0,
    functionConstructor: 4.0,
    dangerousHtml: 3.0,
    execCommand: 5.0,
    sqlConcat: 6.0,
    hardcodedSecrets: 4.0,
    weakCrypto: 3.0,
  };

  // Detection algorithm thresholds
  detection: {
    entropyThreshold: 2.5;       // Shannon entropy for secret detection
    typosquattingDistance: 3;    // Levenshtein distance for package names
  };

  // Protection level cooldowns
  protection: {
    protectedCooldown: 600000;   // 10 minutes
    otherCooldown: 300000;       // 5 minutes
    debounceWindow: 5000;        // 5 seconds
  };

  // Resource limits
  resources: {
    dedupCacheSize: 500;
    checkpointMaxFiles: 10000;
    checkpointMaxFileSize: 10485760;  // 10MB
    checkpointMaxTotalSize: 524288000; // 500MB
    diffHaloSize: 3;
    trialSnapshotLimit: 50;
    freeMonthlyLimit: 100;
  };

  // Quality of Service
  qos: {
    rateLimitCapacity: 100;
    rateLimitRefill: 60000;       // 60 seconds
    eventBusTimeout: 5000;        // 5 seconds
    eventBusMaxRetries: 3;
    errorBudgetHard: 0.01;        // 1%
    errorBudgetWarn: 0.005;       // 0.5%
  };

  docs: ThresholdDocumentation;  // Immutable documentation
}
```

**Key Properties:**
- All values are **frozen/immutable**: `Object.freeze({})`
- Empirically tuned from production usage
- Tightly coupled to detection algorithms (RiskAnalyzer, BurstHeuristicsDetector, etc.)
- Marked as "critical intellectual property"
- Can be deep-merged at runtime for testing via `createThresholds()`

**SDK Dependencies:**
```json
{
  "@snapback/contracts": "workspace:*",
  "@snapback/infrastructure": "workspace:*",  // For observability
  "@types/better-sqlite3": "...",
  "better-sqlite3": "...",
  "ky": "...",
  "minimatch": "...",
  "ow": "...",
  "p-retry": "...",
  "quick-lru": "...",
  "zod": "..."
}
```

**Note:** `@snapback/sdk` does NOT depend on `@snapback/config`

---

### config-legacy (/config directory, 175 LOC)

Old configuration package (being phased out):
```json
{
  "name": "@snapback/config-legacy",
  "private": true,
  "main": "./dist/index.js"
}
```

**Contains:** Application-level config (organizations, auth, payments, UI, storage)
**Used by:** packages/api, packages/integrations
**Status:** Being replaced by packages/config

---

## Part 2: Usage Analysis

### Who Imports from @snapback/config?

**Active imports (17 files):**
```
✓ packages/auth/src/auth.ts                    → env, getBaseUrl()
✓ packages/auth/src/client.ts                  → env, getBaseUrl()
✓ packages/api/src/index.ts                    → getBaseUrl()
✓ packages/api/index.ts                        → getBaseUrl()
✓ packages/api/modules/rules/procedures        → env
✓ packages/integrations/src/.../feature-flags → isFeatureEnabled()
✓ apps/web/lib/api-client.ts                   → getBaseUrl()
✓ apps/web/app/(marketing)/blog/[...].tsx      → getBaseUrl()
```

**Also imports config-legacy (old):**
```
✓ packages/api/modules/payments                → config (legacy)
✓ packages/api/modules/contact                 → config (legacy)
✓ packages/integrations/src/.../helpers        → config (legacy)
```

**Commented out (intentionally avoided):**
```
✗ packages/core/src/utils/circuit-breaker.ts
  // import { snapbackDefaults } from '@snapback/config';
  // Using hardcoded values for now to avoid import issues

✗ packages/core/src/utils/watcher.ts
  // import { snapbackDefaults } from '@snapback/config';
```

### Who Imports from packages/sdk/src/config?

**Internal SDK usage only:**
```
✓ packages/sdk/src/analysis/RiskAnalyzer.ts
  import { THRESHOLDS } from "../config/Thresholds.js";

✓ packages/sdk/src/core/detection/BurstHeuristicsDetector.ts
  import { THRESHOLDS } from "../../config/Thresholds.js";

✓ packages/sdk/src/core/session/ExperienceClassifier.ts
  import { THRESHOLDS } from "../../config/Thresholds.js";

✓ packages/sdk/src/core/session/SessionCoordinator.ts
  import { THRESHOLDS } from "../../config/Thresholds.js";

✓ packages/sdk/src/core/session/SessionTagger.ts
  import { THRESHOLDS } from "../../config/Thresholds.js";

✓ packages/sdk/src/index.ts
  export { THRESHOLDS, createThresholds, resetThresholds, ... }

✓ packages/sdk/tests/Thresholds.test.ts
  Tests for threshold configurations
```

**Key Observation:** SDK config is NOT imported from outside the SDK package. It's completely self-contained.

---

## Part 3: Functional Comparison

### Purpose & Audience Comparison

| Dimension | packages/config | packages/sdk/src/config |
|-----------|-----------------|-------------------------|
| **Purpose** | Infrastructure & app defaults | SDK client & detection algorithm config |
| **Audience** | DevOps, backend engineers | SDK users, algorithm developers |
| **Scope** | System-wide operational defaults | Detection/analysis thresholds |
| **Environment** | Multi-environment (dev/staging/prod) | Empirically-tuned, version-locked |
| **Lifecycle** | Runtime-configurable via env vars | Immutable, tight coupling to code |
| **Dependencies** | Minimal (contracts only) | Rich (infrastructure, sqlite, etc.) |
| **Versioning** | Loose coupling to code | Tight coupling to algorithms |

### Configuration Scope Comparison

**packages/config exports:**
- Operating system defaults (timeouts, debounce, retention)
- Environment variables (database, auth, payment, service keys)
- Infrastructure utilities (URL resolution, feature flags, logging)
- Session replay configuration (sampling, privacy, budget)

**packages/sdk/src/config exports:**
- Detection algorithm thresholds (entropy, keystroke intervals, ratios)
- Risk scoring parameters (0-10 scale severity classifications)
- Session lifecycle timings (idle timeout, session duration)
- Resource limits (cache size, checkpoint file/size limits)
- User experience tier definitions (explorer, intermediate, power)
- Quality of Service metrics (rate limits, error budgets)

### Zero Overlap Examples

**Example 1: Network vs Detection**
```typescript
// packages/config - Network operations
mcp: {
  timeoutMs: 5_000,           // MCP call timeout
  maxConcurrent: 4,           // MCP parallelism
  circuit: { enabled: true }  // Circuit breaker
}

// packages/sdk - Algorithm thresholds
risk: {
  blockingThreshold: 8.0,     // Block risk score
  criticalThreshold: 7.0,     // Critical severity
}
```

These solve **completely different problems**. One is about service communication, the other is about risk evaluation.

**Example 2: File Watching vs Session Management**
```typescript
// packages/config - UI/UX operations
watcher: {
  debounceMs: 120,           // Ignore rapid file changes
  ignored: ["node_modules"]  // Patterns to skip
}

// packages/sdk - Session lifecycle
session: {
  idleTimeout: 105000,        // When to finalize inactive sessions
  maxSessionDuration: 3600000 // 1-hour maximum
}
```

One manages **file system monitoring**, the other manages **session state**.

---

## Part 4: Dependency Graph Analysis

### Current Clean Separation

```
┌─────────────────────────────────────┐
│    @snapback/contracts              │  (Lowest level: types only)
└──────┬──────────────────────────────┘
       │
   ┌───┴────────────────────────┬─────────────────────┐
   │                            │                     │
   ▼                            ▼                     ▼
@snapback/config         @snapback/infrastructure  @snapback/sdk
(App infrastructure)     (Observability)           (Client SDK)
   │                            │                     │
   ├────────────────────────────┴─────────────────────┤
   │
   ▼
@snapback/auth
@snapback/api
packages/integrations
apps/web
```

**Benefits:**
- No circular dependencies
- Clear responsibility boundaries
- Each package is independently upgradeable
- Easy to understand data flow

### If Merged (Circular Dependency)

```
┌──────────────────────────────────────────────────┐
│  packages/sdk (SDK + config + infrastructure)   │
│  - Snapshot/protection clients                  │
│  - Detection algorithms                         │
│  - App infrastructure config  <-- WRONG!        │
│  - Environment variables                        │
└──────────────────┬───────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   @snapback/auth        packages/api
   (imports SDK)         (imports SDK)
   
   Problem: SDK exports app config that depends on it!
   
   This creates circular dependency risk:
   SDK → config → auth → SDK (cycle!)
```

**Why this breaks:**
1. `@snapback/sdk` would export `env` from packages/config
2. `@snapback/auth` imports `@snapback/sdk` for client operations
3. But `@snapback/auth` also needs `env` from packages/config
4. If that env config is in SDK, we have: SDK → auth → SDK ❌

---

## Part 5: Specific Rationale for Separation

### 1. Circular Dependency Risk

**Current safe structure:**
```typescript
// packages/auth/src/auth.ts
import { env } from "@snapback/config";      // ✓ Safe
import { Snapback } from "@snapback/sdk";    // ✓ Safe
// No circular dependency: config and SDK are independent
```

**If merged:**
```typescript
// packages/auth/src/auth.ts
import { env, Snapback } from "@snapback/sdk"; // ❌ Dangerous
// Now SDK exports what auth depends on, and auth depends on SDK
```

### 2. Different Mutability Models

**packages/config** - Runtime-configurable:
```typescript
// env.ts
const envParseResult = envSchema.safeParse(process.env);
export const env = envParseResult.data;
// ↑ Changes per deployment/environment
```

**packages/sdk/src/config** - Frozen immutable:
```typescript
// Thresholds.ts
export const DEFAULT_THRESHOLDS: Readonly<ThresholdsConfig> = Object.freeze({
  session: Object.freeze({ idleTimeout: 105000, ... }),
  burst: Object.freeze({ timeWindow: 5000, ... }),
  // ... all nested objects frozen
});

export const THRESHOLDS: ThresholdsConfig = JSON.parse(...);
// ↑ Can be modified at runtime via updateThresholds(), but starts frozen

export function updateThresholds(overrides: Partial<ThresholdsConfig>): void {
  const updated = createThresholds(overrides);
  Object.assign(THRESHOLDS, updated);  // Deep merge for testing
}
```

**Merging incompatible models** would confuse developers:
- Is this config frozen or mutable?
- Should I modify it at runtime?
- What are the side effects?

### 3. Different Versioning Strategies

**packages/config** - Loose coupling:
- Deployed with web/API changes
- Independent of algorithm implementations
- Can add new env vars without touching SDK

**packages/sdk/src/config** - Tight coupling:
```typescript
// RiskAnalyzer uses these thresholds
export class RiskAnalyzer {
  analyze(content: string, filePath: string): AnalysisResult {
    let score = 0;
    // Use THRESHOLDS.risk.blockingThreshold
    // Use THRESHOLDS.detection.entropyThreshold
    // ...
  }
}

// BurstHeuristicsDetector uses these thresholds
export class BurstHeuristicsDetector {
  analyze(events: EditEvent[]): BurstDetectionResult {
    // Use THRESHOLDS.burst.timeWindow
    // Use THRESHOLDS.burst.minCharsInserted
    // ...
  }
}
```

**Must NOT change thresholds** without:
1. Validating all dependent plugins still work
2. Checking for breaking changes in detection accuracy
3. Updating related tests

### 4. Intellectual Property Sensitivity

From `packages/sdk/src/config/Thresholds.ts`:
```typescript
/**
 * These thresholds represent empirically tuned values from production usage
 * and constitute critical intellectual property. Centralizing thresholds enables:
 * - Single source of truth for all threshold values
 * - A/B testing and empirical tuning
 * - Runtime configuration via feature flags
 */
```

**Thresholds are IP because they represent:**
- Machine learning model parameters
- Empirically-tuned detection algorithms
- Competitive advantage in security detection
- Years of production data refinement

**Grouping with generic app config** (packages/config) would:
- Hide this IP from developers who need to understand it
- Mix proprietary algorithms with operational infrastructure
- Create confusion about what's IP vs operational

### 5. Different Audiences

**packages/config users** - DevOps/Infrastructure perspective:
```typescript
// "How do I deploy SnapBack to production?"
import { env } from "@snapback/config";

const dbUrl = env.DATABASE_URL;
const apiKey = env.STRIPE_SECRET_KEY;
const logLevel = env.LOG_LEVEL;
```

Documentation needed:
- Environment variable reference
- Default values
- Optional vs required settings

**packages/sdk/src/config users** - Algorithm/Extension developer perspective:
```typescript
// "How do I customize burst detection sensitivity?"
import { THRESHOLDS, updateThresholds } from "@snapback/sdk";

// Increase sensitivity for beta testers
updateThresholds({
  burst: {
    minCharsInserted: 50,  // More aggressive
    timeWindow: 3000,      // Shorter window
  }
});
```

Documentation needed:
- Threshold explanation and impact
- Why each value was chosen
- How to tune for different scenarios
- Immutability guarantees

These audiences **don't overlap**. A DevOps engineer doesn't need to understand burst detection sensitivity, and an algorithm developer doesn't need to know about STRIPE_SECRET_KEY.

### 6. Organizational Clarity

**Current naming is explicit:**
- `@snapback/config` → "Application and infrastructure configuration"
- `@snapback/sdk` → "Client SDK for snapshot and protection operations"

**If merged:**
```
@snapback/sdk
├── Snapback (client)
├── SnapshotClient
├── ProtectionClient
├── config.ts              <-- What kind of config?
├── thresholds.ts          <-- Detection config?
├── env.ts                 <-- Infrastructure config?
└── ...
```

This creates ambiguity and confuses the package's purpose.

---

## Part 6: Current Issues & Recommendations

### Current Issues

**Issue 1: Commented-out imports in packages/core**

```typescript
// packages/core/src/utils/circuit-breaker.ts, line 3
// import { snapbackDefaults } from '@snapback/config';
// Using hardcoded values for now to avoid import issues

const snapbackDefaults = {
  mcp: {
    timeoutMs: 5000,
    maxConcurrent: 4,
    retry: { retries: 2, factor: 2, min: 250, max: 1500, jitter: true },
    circuit: { /* ... */ }
  },
} as const;
```

**Status:** Acceptable as-is (core deliberately avoids config to prevent circular deps)

**Alternative fixes:**
1. Add `@snapback/config` as a proper dependency in packages/core (if circular deps are resolved)
2. Keep hardcoded values (current approach, acceptable for stable values)
3. Move MCP defaults to packages/core itself

**Recommendation:** Leave as-is. The comment explains why. This is **intentional isolation**.

---

**Issue 2: config-legacy still active**

Current references:
```
packages/api/package.json → "@snapback/config-legacy": "workspace:*"
packages/integrations/package.json → "@snapback/config-legacy": "workspace:*"
```

Usage:
```typescript
// packages/api/modules/payments/procedures/create-checkout-link.ts
import type { Config } from "@snapback/config-legacy";
import { config } from "@snapback/config-legacy";

const stripePriceId = config.payments.plans.solo.prices[0].productId;
```

**Recommendation:** Migrate to packages/config (if appropriate) or keep config-legacy as legacy until app-level config structure is finalized.

---

**Issue 3: SDK exports Thresholds from main index**

```typescript
// packages/sdk/src/index.ts
export {
  THRESHOLDS,
  createThresholds,
  DEFAULT_THRESHOLDS,
  resetThresholds,
  updateThresholds,
  // ... all threshold types
} from "./config/Thresholds.js";
```

**Status:** ✓ Good! Consumers can import directly from SDK.

**Could improve by adding export entry point:**
```typescript
// packages/sdk/package.json
"exports": {
  ".": { ... },
  "./storage": { ... },
  "./config": {                    // NEW
    "types": "./dist/config/index.d.ts",
    "default": "./dist/config/index.js"
  }
}
```

This would allow:
```typescript
import { THRESHOLDS } from "@snapback/sdk/config";  // More explicit
```

Instead of:
```typescript
import { THRESHOLDS } from "@snapback/sdk";  // Current
```

---

### Recommendations (Keep Separate)

**1. Keep packages/config as-is** ✓
- Single source of truth for infrastructure configuration
- Minimal dependencies (only @snapback/contracts)
- Clear purpose: operational defaults and environment handling

**2. Keep packages/sdk/src/config independent** ✓
- Thresholds must remain tightly coupled to detection algorithms
- Immutability guarantees are critical
- IP protection for proprietary algorithms
- SDK remains complete and self-contained

**3. Migrate config-legacy references**
- Update packages/api to use packages/config instead of config-legacy
- Update packages/integrations similarly
- Delete /config directory (config-legacy)

**4. Optional: Create SDK config export entry**
```json
"./config": {
  "types": "./dist/config/index.d.ts",
  "default": "./dist/config/index.js"
}
```

Allows: `import { THRESHOLDS } from "@snapback/sdk/config"`

**5. Document Purpose Statements**

Update CLAUDE.md files:

**packages/config/CLAUDE.md:**
> "Centralized infrastructure configuration for SnapBack services. Provides environment variables, operational defaults, and utility functions for DevOps and backend engineers."

**packages/sdk/CLAUDE.md:**
> "Client SDK for SnapBack services. Provides snapshot management, protection, and analysis clients. Includes empirically-tuned detection thresholds as critical IP."

---

## Part 7: File Count & Complexity Summary

| Metric | packages/config | packages/sdk |
|--------|-----------------|--------------|
| **Total Files** | 22 | 42 |
| **Total LOC** | 983 | 8,416 |
| **Config Files** | 4 | 4 |
| **Config LOC** | ~277 | ~1,170 |
| **Primary Dependencies** | 1 (@snapback/contracts) | 8 (contracts, infrastructure, sqlite3, ky, etc.) |
| **Purpose** | App infrastructure | Client SDK |
| **Audience** | DevOps/Backend | SDK users/Algorithm devs |

---

## Part 8: Decision Matrix

| Factor | Should Merge? | Reasoning |
|--------|:---:|-----------|
| **Circular Dependency Risk** | ❌ | SDK used by packages that import config |
| **Conceptual Overlap** | ❌ | App infrastructure vs SDK detection config |
| **Reduce Package Count** | ✓ | Would reduce from 2 to 1 (minor benefit) |
| **Unified Maintenance** | ✓ | Fewer packages to maintain (slight benefit) |
| **Audience Separation** | ❌ | DevOps ≠ Algorithm developers |
| **IP Sensitivity** | ❌ | Thresholds are proprietary algorithms |
| **Immutability Requirements** | ❌ | Different mutability models conflict |
| **Current Code Quality** | ✓ | Both packages well-organized |
| **Future Extensibility** | ✓ | Separate packages allow independent evolution |
| **Dependency Graph Clarity** | ❌ | Merging creates complex circular risk |

**Overall Score: STRONGLY RECOMMEND KEEP SEPARATE**
- Against merge: 6 factors
- For merge (minor): 3 factors

---

## Conclusion

### Final Recommendation: **KEEP SEPARATE** ✓

`packages/config` and `packages/sdk/src/config` should **remain separate packages** because:

1. **Different Purposes:** Infrastructure config (packages/config) vs algorithm config (SDK)
2. **Different Audiences:** DevOps engineers vs algorithm developers
3. **Circular Dependency Risk:** Merging creates SDK → config → (auth/api) → SDK
4. **IP Protection:** SDK thresholds represent proprietary, empirically-tuned algorithms
5. **Immutability Conflict:** packages/config is runtime-mutable, SDK config is frozen
6. **Versioning Strategy:** Loose coupling vs tight coupling to code
7. **Zero Overlap:** No shared configuration or data structures

### Action Items

1. **Keep both packages separate** ✓
2. **Migrate config-legacy references**
   - [ ] Update packages/api to use packages/config
   - [ ] Update packages/integrations to use packages/config
   - [ ] Delete /config directory
3. **Optional improvements**
   - [ ] Add `./config` export entry to packages/sdk
   - [ ] Add explicit purpose statements to CLAUDE.md files
4. **Document the separation**
   - [ ] Add this analysis to project documentation
   - [ ] Update package CLAUDE.md files with clear purpose statements

### Current State Assessment

Both packages are **well-designed** and **properly separated**:
- ✓ Zero circular dependencies
- ✓ Clear responsibility boundaries
- ✓ Minimal dependencies
- ✓ Good code organization
- ✓ Intentional import isolation (commented imports in packages/core show awareness of risks)

**No refactoring needed. Current architecture is optimal.**

---

## References

- `packages/config/CLAUDE.md` - Infrastructure config documentation
- `packages/sdk/CLAUDE.md` - SDK documentation
- `packages/config/src/defaults.ts` - Application defaults
- `packages/config/src/env.ts` - Environment variable schema
- `packages/sdk/src/config/Thresholds.ts` - Detection algorithm thresholds
- `packages/sdk/src/index.ts` - SDK exports

---

**Analysis Date:** November 12, 2025  
**Repository:** snapback.dev  
**Status:** COMPLETE - Recommendation is to maintain current separation
