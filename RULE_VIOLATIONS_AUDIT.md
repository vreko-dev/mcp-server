# Rule Violations Audit Report

**Generated:** 2025-11-20
**Total Violations Found:** 65+
**Critical Rules Violated:** 5/9

---

## Executive Summary

| Rule | Type | Count | Severity |
|------|------|-------|----------|
| decision-logging-observability.md | Console logging instead of logger | 45+ | 🔴 Critical |
| always-monorepo-imports.md | Cross-package relative imports | 7+ | 🔴 Critical |
| always-typescript-patterns.md | Enum instead of const assertions | 11 | 🟠 High |
| decision-oauth-multi-service.md | OAuth/env configuration | 2 | 🟠 High |
| files-docker-deployment.md | Dockerfile script validation | 1 | 🟡 Medium |

---

## 🔴 CRITICAL: Console Logging Violations (45+)

**Rule:** `decision-logging-observability.md` - Must use `logger` from `@snapback/infrastructure`

### Apps/API Module

1. **apps/api/lib/health-check.ts** (3 violations)
   - Line 37: `console.error("[Health] Database check failed:", error);`
   - Line 56: `console.error("[Health] Redis check failed:", error);`
   - Line 75: `console.error("[Health] S3 check failed:", error);`

2. **apps/api/lib/redis-client.ts** (2 violations)
   - Line 66: `console.log("Redis initialization skipped in MVP...");`
   - Line 71: `console.log("Redis client close skipped in MVP...");`

3. **apps/api/lib/sentry.ts** (3 violations)
   - Line 21: `console.warn("[Sentry] DSN not configured...");`
   - Line 53: `console.log("[Sentry] Initialized", {...});`
   - Line 135: `console.error("[Sentry] Exception captured", {...});`

4. **apps/api/middleware/with-usage-tracking.ts** (1 violation)
   - Line 182: `.catch(console.error);`

5. **apps/api/modules/analytics/procedures/ingest-events.ts** (2 violations)
   - Line 26: `console.warn("[Analytics] PostHog not available:", error);`
   - Line 86: `console.warn("[Analytics] PostHog forwarding failed:", phError);`
   - Line 101: `console.error("[Analytics] Ingestion error:", error);`

6. **apps/api/modules/risk/procedures/analyze-risk.ts** (1 violation)
   - Line 306: `.catch(console.error);`

7. **apps/api/modules/snapshots/procedures/create-snapshot.ts** (2 violations)
   - Line 250: `.catch(console.error);`
   - Line 277: `// console.error("Failed to track first snapshot...");` (commented but should use logger)

8. **apps/api/modules/snapshots/procedures/restore-snapshot.ts** (1 violation)
   - Line 151: `.catch(console.error);`

9. **apps/api/modules/telemetry/procedures/enrich-event.ts** (1 violation)
   - Line 153: `.catch(console.error);`

10. **apps/api/modules/telemetry/procedures/ingest-events.ts** (2 violations)
    - Line 417: `console.warn("Invalid telemetry events detected:", invalidEvents);`
    - Line 449: `console.error("Telemetry ingestion failed", error);`

11. **apps/api/modules/telemetry/procedures/track-event.ts** (1 violation)
    - Line 117: `.catch(console.error);`

12. **apps/api/src/server.ts** (2 violations)
    - Line 173: `console.log(\`🚀 API Server ready at http://localhost:\${port}/api\`);`
    - Line 224: `console.error("Server error:", error);`

### Packages

13. **packages/analytics/src/client.ts** (1 violation)
    - Line 392: `console.log(\`[AnalyticsClient] \${message}\`);`

14. **packages/analytics/src/ingest.ts** (2 violations)
    - Line 130: `console.warn(\`Unknown event type: \${event.eventType}\`);`
    - Line 184: `console.error(\`Error processing batch \${batchId}:\`, error);`

15. **packages/analytics/src/retention.ts** (2 violations)
    - Line 33: `console.warn("Database client not available, using mock objects");`
    - Line 119: `console.warn(\`Unknown table name in retention config: \${config.tableName}\`);`

16. **packages/analytics/test/plane-b.perf.spec.ts** (4 violations)
    - Line 80: `console.warn("Database not available, skipping test");`
    - Line 114: `console.log(\`Ingested \${eventCount} events in \${ingestDuration}ms\`);`
    - Line 125: `console.log(\`Read \${result?.length || 0} records in \${readDuration}ms\`);`
    - Line 138: `console.warn("Database not available, skipping test");`
    - Line 171: `console.log(\`\${query.name}: \${duration}ms\`);`

17. **packages/auth/src/better-auth-adapter.ts** (7 violations)
    - Line 48: `console.error("[BetterAuthAdapter] getSessionFromHeaders error:", error);`
    - Line 58: `console.error("[BetterAuthAdapter] verifyApiKeyOrNull error:", error);`
    - Line 72: `console.error("[BetterAuthAdapter] getOrganization error:", error);`
    - Line 88: `console.error("[BetterAuthAdapter] getOrgMembership error:", error);`
    - Line 104: `console.error("[BetterAuthAdapter] isMFAEnabled error:", error);`
    - Line 121: `console.error("[BetterAuthAdapter] isEmailVerified error:", error);`
    - Line 132: `console.error("[BetterAuthAdapter] isTwoFactorEnabled error:", error);`
    - Line 147: `console.error("[BetterAuthAdapter] hasPasskey error:", error);`

### Web Application

18. **apps/web/lib/auth/middleware.ts** (2 violations)
    - Line 60: `console.error("Session validation error:", error);`
    - Line 200-205: `console.warn(\`Slow session validation: \${duration}ms for \${request.nextUrl.pathname}\`);`

19. **apps/web/lib/auth/middleware-secure.ts** (1 violation)
    - Line 177-180: `console.warn(\`Slow middleware execution: \${duration}ms for \${request.nextUrl.pathname}\`);`

---

## 🔴 CRITICAL: Monorepo Import Violations (7+)

**Rule:** `always-monorepo-imports.md` - Must use `@snapback/*` for cross-package imports

### Test/Integration Files Using Relative Imports

1. **apps/mcp-server/test/integration/score-dominance.spec.ts:L3**
   ```typescript
   ❌ import { Guardian } from "../../../../packages/core/src/guardian.js";
   ✅ Should be: import { Guardian } from "@snapback/core";
   ```

2. **apps/mcp-server/test/performance/benchmarks.comprehensive.spec.ts:L11**
   ```typescript
   ❌ import { RiskAnalyzer as SDKRiskAnalyzer } from "../../../../packages/sdk/src/analysis/RiskAnalyzer.js";
   ✅ Should be: import { RiskAnalyzer } from "@snapback/sdk";
   ```

3. **test/integration/mcp-guard.spec.ts:L2**
   ```typescript
   ❌ import { analyzeBeforeApply, formatAnalysisResult } from "../../packages/core/src/mcp/analyze_before_apply";
   ✅ Should be: import { analyzeBeforeApply, formatAnalysisResult } from "@snapback/core/mcp";
   ```

4. **test/integration/plane-b.ingest-e2e.spec.ts:L3-6** (4 violations)
   ```typescript
   ❌ import { TelemetryIngestHandler } from "../../packages/analytics/src/ingest";
   ❌ import { TelemetrySinkDb } from "../../packages/platform/src/db/adapters/TelemetrySinkDb";
   ❌ import { db } from "../../packages/platform/src/db/client";
   ❌ import * as schema from "../../packages/platform/src/db/schema/snapback";

   ✅ Should be:
   import { TelemetryIngestHandler } from "@snapback/analytics";
   import { TelemetrySinkDb, db } from "@snapback/platform";
   import * as schema from "@snapback/platform/db/schema";
   ```

---

## 🟠 HIGH: TypeScript Pattern Violations (11)

**Rule:** `always-typescript-patterns.md` - Use const assertions instead of enums

### Enum Declarations That Should Use Const Assertions

1. **apps/vscode/src/errors/index.ts:L648**
   ```typescript
   ❌ export enum ErrorSeverity { ... }
   ✅ const ERROR_SEVERITY = ["low", "medium", "high", "critical"] as const;
   type ErrorSeverity = typeof ERROR_SEVERITY[number];
   ```

2. **apps/vscode/src/security/pathValidator.ts:L8**
   ```typescript
   ❌ enum FileSystemErrorCode { ... }
   ✅ const FILE_SYSTEM_ERROR_CODES = [...] as const;
   ```

3. **apps/vscode/src/semanticNamer.ts:L9**
   ```typescript
   ❌ export enum ChangeType { ... }
   ✅ const CHANGE_TYPES = [...] as const;
   ```

4. **apps/vscode/src/services/UserExperienceService.ts:L22**
   ```typescript
   ❌ export enum ExperienceLevel { ... }
   ✅ const EXPERIENCE_LEVELS = [...] as const;
   ```

5. **apps/vscode/src/utils/logger.ts:L6**
   ```typescript
   ❌ export enum LogLevel { ... }
   ✅ const LOG_LEVELS = [...] as const;
   ```

6. **apps/vscode/test/helpers/network-mock.ts:L52**
   ```typescript
   ❌ export enum NetworkCondition { ... }
   ✅ const NETWORK_CONDITIONS = [...] as const;
   ```

7. **packages/contracts/src/logger.ts:L48**
   ```typescript
   ❌ export enum LogLevel { ... }
   ✅ const LOG_LEVELS = [...] as const;
   ```

8. **packages/events/src/EventBusEventEmitter2.ts:L5-17**
   ```typescript
   ❌ export enum SnapBackEvent { ... }
   ❌ export enum QoSLevel { ... }
   ✅ Use const assertions instead
   ```

9. **packages/infrastructure/src/metrics/core/sampling.ts:L18**
   ```typescript
   ❌ export enum EventTier { ... }
   ✅ const EVENT_TIERS = [...] as const;
   ```

10. **packages/sdk/src/storage/BlobStore.ts:L35**
    ```typescript
    ❌ export enum BlobStoreErrorCode { ... }
    ✅ const BLOB_STORE_ERROR_CODES = [...] as const;
    ```

---

## 🟠 HIGH: OAuth Configuration Issues (2)

**Rule:** `decision-oauth-multi-service.md` - Proper OAuth/env configuration

### Issues

1. **packages/auth/src/auth.ts:L34-41** - Hardcoded localhost ports
   ```typescript
   ❌ Hardcoded: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
   ✅ Should derive from env.NEXT_PUBLIC_SITE_URL
   ```

2. **packages/config/src/env.ts** - Environment validation disabled
   - Lines 92-111: Environment validation is bypassed for development
   - Missing `GOOGLE_CLIENT_ID` fails silently instead of logging warnings

---

## 🟡 MEDIUM: Docker Deployment Issues (1)

**Rule:** `files-docker-deployment.md` - Package references and script names

### Potential Issues

1. **apps/mcp-server/Dockerfile:L25**
   ```dockerfile
   ❌ RUN pnpm run build
   ⚠️ Verify script exists in apps/mcp-server/package.json
   Suggested check: List available scripts in package.json
   ```

---

## Summary by Severity

### 🔴 Critical (Ready to Fix)
- **Console Logging:** 45+ violations across 19 files
- **Monorepo Imports:** 7+ violations in test files

### 🟠 High Priority
- **Enum Usage:** 11 violations across 10 files
- **OAuth Configuration:** 2 issues in auth/config packages

### 🟡 Medium Priority
- **Docker Scripts:** 1 potential issue requiring verification

---

## Impact Assessment

| Violation | Impact | User-Facing | Build Impact |
|-----------|--------|-------------|--------------|
| Console logging | Observability loss, poor debugging | No | No |
| Monorepo imports | Refactoring fragility | No | Potential |
| Enums | Code maintainability | No | No |
| OAuth config | Silent credential failures | Yes | Deployment |
| Docker scripts | Build failures | No | Yes |

---

## Remediation Priority

1. **Phase 1 (Immediate):** Fix console logging (quick wins, high impact)
2. **Phase 2 (This sprint):** Fix monorepo imports in tests
3. **Phase 3 (Next sprint):** Replace enums with const assertions
4. **Phase 4 (Before deployment):** Fix OAuth configuration
5. **Phase 5 (Verification):** Test Docker builds with corrected scripts
