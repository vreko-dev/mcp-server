# SnapBack Extension Performance Review and Optimization Design

## Objective

Analyze SnapBack VS Code extension runtime behavior from production logs and design architectural improvements to meet the 500ms activation budget while maintaining functionality and user experience.

**CRITICAL BLOCKER:** Before any optimization work begins, the process.exit() error must be resolved. This indicates fundamental error handling issues that will undermine all performance improvements.

---

## Week 0 Priority: Fix process.exit() Blocker

### Issue Summary

Debug console shows:
```
Error: An extension called process.exit() and this was prevented.
    at process.WJ.process.exit (file:///Applications/Qoder.app/Contents/Resources/app/out/vs/workbench/api/node/extensionHostProcess.js:225:1697)
    at main (/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/dist/extension.js:943:21154)
```

**Why This is Critical:**
- Indicates broken error handling or unhandled promise rejection
- Extension may be in inconsistent state after activation
- Performance optimizations will be undermined if activation randomly fails
- Must be stable before making architectural changes

### Investigation Results

**Codebase Search Findings:**

7 instances of `process.exit()` found in apps/vscode:
1. `apps/vscode/scripts/run-e2e-tests.ts:L57` - Test script (OK)
2. `apps/vscode/scripts/verify-s1-tests.ts:L64` - Test script (OK)
3. `apps/vscode/scripts/verify-s1-tests.ts:L67` - Test script (OK)
4. `apps/vscode/spike/index.ts:L61` - Spike code (should not be in production build)
5. `apps/vscode/spike/index.ts:L69` - Spike code (should not be in production build)
6. `apps/vscode/src/test/runTest.ts:L23` - Test runner (OK)
7. `apps/vscode/test/e2e/real-extension.e2e.test.ts:L33` - E2E test (OK)

**Root Cause Analysis:**

The stack trace points to `extension.js:943:21154` which is minified production code. The process.exit() call is NOT in the main extension.ts activate() function (reviewed lines 1-200). Possible sources:

1. **Spike code in production build** - `spike/index.ts` contains process.exit() and may be bundled
2. **Unhandled promise rejection** - Async error in activation triggers global error handler
3. **Third-party dependency** - A package assumes Node.js environment and calls exit on error
4. **Build artifact** - Development code accidentally included in production bundle

### Immediate Action Plan

**Task 1: Verify Spike Code is Excluded from Production Build**

Check build configuration:

```typescript
// Verify tsup.config.ts or esbuild config excludes spike/
// Expected: spike/ directory should be in .vscodeignore
// Expected: Build process should not bundle spike/**/*.ts files
```

**Actions:**
1. Add `spike/` to `.vscodeignore` if not present
2. Add `spike/**` to build exclusion patterns
3. Verify `dist/extension.js` does not contain spike code references

**Task 2: Add Unhandled Rejection and Exception Handlers**

Add to extension.ts activate() function (before any async operations):

```typescript
// At top of activate(), after logger initialization
process.on('unhandledRejection', (reason, promise) => {
  logger.error('CRITICAL: Unhandled Promise Rejection during activation', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise)
  });

  // DO NOT call process.exit() - log and attempt recovery
  vscode.window.showErrorMessage(
    'SnapBack encountered an unexpected error during activation. Some features may be unavailable. Check Output → SnapBack for details.'
  );
});

process.on('uncaughtException', (error) => {
  logger.error('CRITICAL: Uncaught Exception during activation', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });

  // DO NOT call process.exit() - log and attempt recovery
  vscode.window.showErrorMessage(
    'SnapBack encountered a critical error. Extension may be unstable. Please reload VS Code.'
  );
});
```

**Task 3: Wrap Activation in Result Type Pattern**

Replace try/catch with Result types for graceful degradation:

```typescript
import { Result, Ok, Err, isErr } from './types/result';

// Wrap each phase in Result type
async function initializePhase1WithRecovery(
  context: vscode.ExtensionContext
): Promise<Result<Phase1Result, Error>> {
  try {
    const result = await initializePhase1Services(context);
    return Ok(result);
  } catch (error) {
    return Err(toError(error));
  }
}

// In activate()
const phase1Result = await initializePhase1WithRecovery(context);

if (isErr(phase1Result)) {
  logger.error('Phase 1 initialization failed', {
    error: phase1Result.error.message,
    stack: phase1Result.error.stack
  });

  // Partial activation - continue with degraded features
  vscode.window.showWarningMessage(
    'SnapBack activated with limited features. Some functionality may be unavailable.'
  );

  // DO NOT return or exit - continue with partial activation
}
```

**Task 4: Add Activation State Tracking**

Implement feature availability tracking:

```typescript
class ExtensionState {
  private features = new Map<string, { enabled: boolean; error?: Error }>();

  async activateFeature(
    name: string,
    init: () => Promise<void>
  ): Promise<Result<void, Error>> {
    try {
      await init();
      this.features.set(name, { enabled: true });
      logger.info(`Feature ${name} activated successfully`);
      return Ok(undefined);
    } catch (error) {
      const err = toError(error);
      this.features.set(name, { enabled: false, error: err });
      logger.error(`Feature ${name} failed to activate`, {
        error: err.message,
        stack: err.stack
      });
      return Err(err);
    }
  }

  isEnabled(feature: string): boolean {
    return this.features.get(feature)?.enabled ?? false;
  }

  getFailedFeatures(): string[] {
    return Array.from(this.features.entries())
      .filter(([_, state]) => !state.enabled)
      .map(([name]) => name);
  }
}

// In activate()
const extensionState = new ExtensionState();

// Activate each feature with error recovery
await extensionState.activateFeature('storage', async () => {
  storage = await initializePhase2Storage(context);
});

await extensionState.activateFeature('mcp', async () => {
  // MCP initialization
});

// After activation
const failedFeatures = extensionState.getFailedFeatures();
if (failedFeatures.length > 0) {
  logger.warn('Some features failed to activate', {
    failedFeatures,
    successfulActivation: 'partial'
  });
}
```

**Task 5: Remove or Guard process.exit() Calls**

Add assertion to prevent accidental process.exit() in extension code:

```typescript
// Add to extension.ts after logger init
function preventProcessExit() {
  const originalExit = process.exit;

  process.exit = ((code?: number) => {
    const stack = new Error().stack;
    logger.error('PREVENTED: process.exit() call blocked', {
      code,
      stack,
      message: 'process.exit() is not allowed in VS Code extensions'
    });

    // Throw error instead of exiting
    throw new Error(
      `process.exit(${code}) blocked. Stack trace logged. Extension code must not call process.exit().`
    );
  }) as typeof process.exit;

  logger.info('process.exit() guard installed');
}

// Call early in activate()
preventProcessExit();
```

**Task 6: Verify Build Excludes Spike Code**

Check and update build configuration files:

```json
// .vscodeignore (add if not present)
spike/
spike/**
*.spike.ts
*.spike.js

// tsup.config.ts or esbuild config
{
  "exclude": [
    "spike/**",
    "test/**",
    "scripts/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### Validation Steps

**After implementing fixes:**

1. **Test Activation Without Errors**
   ```bash
   # Build extension
   pnpm build

   # Launch in extension development host
   # Check Output → SnapBack for process.exit() errors
   # Should see: "process.exit() guard installed"
   # Should NOT see: "PREVENTED: process.exit() call blocked"
   ```

2. **Verify Spike Code Excluded**
   ```bash
   # Check dist bundle
   grep -r "spike" apps/vscode/dist/
   # Should return no results

   # Check .vsix package
   unzip -l snapback-*.vsix | grep spike
   # Should return no results
   ```

3. **Test Error Handling**
   ```typescript
   // Temporarily inject error in phase initialization
   async function initializePhase1Services() {
     throw new Error('Test: Phase 1 failure');
   }

   // Activate extension
   // Should see:
   // - Warning message to user
   // - Logged error in Output
   // - Partial activation continues
   // - NO process.exit() error
   ```

4. **Test Unhandled Rejection**
   ```typescript
   // In activate(), add test rejection
   setTimeout(() => {
     Promise.reject(new Error('Test: Unhandled rejection'));
   }, 1000);

   // Should see:
   // - "CRITICAL: Unhandled Promise Rejection" in logs
   // - Error message to user
   // - Extension continues running
   // - NO process.exit() error
   ```

### Exit Criteria

- [ ] No `process.exit()` calls in production bundle (verified with grep)
- [ ] `spike/` directory excluded from build (verified in .vscodeignore)
- [ ] Unhandled rejection handler installed and tested
- [ ] Uncaught exception handler installed and tested
- [ ] process.exit() guard prevents accidental calls
- [ ] All activation phases wrapped in Result types with error recovery
- [ ] ExtensionState tracks feature availability
- [ ] Partial activation works (some features can fail without breaking extension)
- [ ] 10 consecutive activations complete without process.exit() errors
- [ ] Error injection tests pass (activation continues despite errors)

### Success Metrics

**Quantitative:**
- 0 `process.exit()` errors in 100 consecutive activations
- 100% of activation phases wrapped in error recovery
- Extension state tracking shows which features are enabled/disabled

**Qualitative:**
- Clear error messages guide users when features unavailable
- Partial activation maintains basic functionality
- Logs provide actionable debugging information
- No user confusion from silent failures

### Timeline

**Estimated Time: 4-6 hours**

- Investigation & Root Cause Analysis: 1 hour (COMPLETE)
- Implementation (Tasks 1-6): 2-3 hours
- Testing & Validation: 1-2 hours
- Documentation: 30 minutes

**Blocker Status:**
This MUST be completed before proceeding with any performance optimization work (Weeks 1-5). Broken error handling will cause unpredictable behavior during rollout and undermine all optimization efforts.

---

## Critical Design Assumptions and Required Validations

**Before implementing any optimizations, the following assumptions must be validated:**

### Assumption 1: The 1080ms Gap is Extension Code

**Assumption:** The unaccounted 1080ms (46% of activation time) represents optimizable extension code.

**Risk:** This gap may actually be VS Code platform overhead (webview rendering, IPC, context setup) that cannot be optimized.

**Validation Required:**
1. Add wall-clock timing from first line of `activate()` to last line
2. Compare wall-clock time vs. phase time vs. reported activation time
3. Only proceed with gap investigation if wall-clock time confirms >1000ms of actual extension work

**Decision Point:** If wall-clock time is 1200-1400ms, focus on measured phases. If 2300ms+, investigate gap.

### Assumption 2: Protected Files Loading is Truly Redundant

**Assumption:** The 5 loads of protected files during activation are wasteful duplication.

**Risk:** Each load may serve different cache contexts, invalidation strategies, or edge cases (files written during activation).

**Validation Required:**
1. Add caller context to each "Loading protected files" log (stack trace)
2. Document why each load happens and what cache strategy it uses
3. Verify that singleton cache won't break scenarios where files change during activation

**Decision Point:** If loads serve different purposes, implement write-through cache with invalidation. If truly redundant, implement singleton.

### Assumption 3: MCP Connection Can Be Deferred

**Assumption:** MCP connection during activation is unnecessary overhead that can be deferred to first use.

**Risk:** Deferring connection moves latency to first command, creates worse UX, and hides network/auth errors until user needs feature.

**Validation Required:**
1. Survey user behavior: What % of users run MCP commands within first 5 minutes of activation?
2. Measure connection time variance across network conditions
3. Prototype non-blocking async connection with fallback

**Decision Point:** Use non-blocking async connection during activation (fire-and-forget) with ensureConnected() on first command, rather than full deferral.

### Assumption 4: Encryption Can Be Lazily Initialized

**Assumption:** Encryption key derivation can be deferred to first snapshot operation.

**Risk:** Existing encrypted snapshots may need recovery/validation during activation. Repeated key derivation on each snapshot operation is worse than one-time initialization.

**Validation Required:**
1. Check if encrypted snapshots are validated during activation
2. Measure key derivation frequency if deferred
3. Analyze race conditions if multiple snapshots processed concurrently

**Decision Point:** Move key derivation to onStartupFinished (background) rather than lazy initialization. Ensures keys ready by first use without blocking activation.

### Assumption 5: Repo Audit Has No Value

**Assumption:** Repo audit should be removed from activation because it currently fails.

**Risk:** Removing audit eliminates initial protection status, reduces onboarding effectiveness, and loses early misconfiguration detection.

**Validation Required:**
1. Verify audit fails because of dependency order (runs before policy loads)
2. Check if audit results are displayed to users during onboarding
3. Measure user engagement with audit results

**Decision Point:** Fix dependency order (policy → protected files → audit as background task) rather than removing audit entirely.

### Assumption 6: Phase Time Reductions are Achievable

**Assumption:** Phase 2 (Storage) can be reduced from 652ms to 100ms (85% reduction). Pioneer Infrastructure can be reduced from 578ms to 100ms (83% reduction).

**Risk:** Storage I/O and infrastructure initialization have physical limits. Missing targets cascades entire plan.

**Validation Required:**
1. Profile storage operations to identify bottleneck (disk I/O vs. parsing vs. validation)
2. Break down Pioneer Infrastructure into measurable sub-components
3. Prototype async storage with parallel reads to measure actual improvement

**Decision Point:** Use tiered targets (P50 < 500ms, P90 < 800ms, P99 < 1500ms) rather than absolute targets. Success = "90% of users activate in < 500ms" not "every activation < 500ms".

### Assumption 7: Feature Flags Won't Create Technical Debt

**Assumption:** Feature flags for architectural changes enable safe rollout without long-term maintenance burden.

**Risk:** Architectural flags (unlike feature flags) create dual code paths that must be tested indefinitely. Flags never get removed due to sunk cost fallacy.

**Validation Required:**
1. Distinguish feature flags (user behavior choices) from infrastructure flags (architectural changes)
2. Define flag expiration dates upfront
3. Consider canary deployment strategy instead of flags

**Decision Point:** Use infrastructure flags sparingly with expiration dates. Prefer canary rollout (deploy to 10% with new code only) over long-lived flags.

### Assumption 8: process.exit() is Minor Issue

**Assumption:** The process.exit() error can be addressed after performance optimizations.

**Risk:** This indicates broken error handling or unhandled promise rejection. Fixing it with bandaid hides deeper architecture issue that will resurface during rollout.

**Validation Required:**
1. Search codebase for process.exit(), process.kill() calls
2. Add unhandledRejection handler to capture root cause
3. Investigate whether test code leaked to production

**Decision Point:** Make this Week 0 blocking issue. Broken error handling must be fixed before optimization work begins.

---

## Current State Analysis

### Activation Flow Overview

The extension currently activates in **2343ms**, exceeding the 500ms budget by **1843ms** (368% over budget).

**Phase Breakdown:**
- Phase 1 (Services): 0ms
- Phase 2 (Storage): 652ms (27.8% of total)
- Phase 3 (Managers): 28ms
- Phase 4 (Providers): 3ms
- Phase 5 (Registration): 1ms
- Pioneer Infrastructure: 578ms (24.7% of total)
- Phase 14 (AutoDecision): 0ms
- Phase 15 (Onboarding): 1ms
- **Total Phase Time: 1263ms**
- **Total Including UI: 2343ms**
- **Unaccounted Gap: 1080ms** (46% of total time)

### Critical Dependencies at Activation

The following external or expensive operations execute during activation:

1. **MCP Server Connection** - Network call to `https://mcp.snapback.dev` (line 75)
2. **AI Risk Service Initialization** - RemoteAIRiskService (potentially network-dependent) (line 105)
3. **Repo Audit** - Runs twice, both times returning `status: "error"` (lines 173, 488)
4. **Encryption Service** - AES-256-GCM initialization with 100,000 iterations (line 102)
5. **Policy Loading** - File system read from `.snapback/policy.json` (line 669)
6. **Protected Files Storage** - Loaded 5 times during single activation (lines 73, 74, 103, 104, 898)

---

## Identified Issues and Optimization Opportunities

### Issue 1: Protected Files Loading - Redundancy vs. Cache Invalidation

**Context:**
Log lines 73, 74, 103, 104, 898 show "Loading protected files from storage" executed 5 times during a single activation, each time reading the same 3 files.

**Root Cause Uncertainty:**
Multiple components (ProtectedFileRegistry, SDK ProtectionManager, WorkspaceManager) load protected files independently. This may be:
- **True redundancy:** Wasteful duplication that should use shared cache
- **Intentional separation:** Different cache contexts to handle edge cases (e.g., files added/changed during activation)
- **Cache invalidation strategy:** Each component expects fresh read to avoid stale data

**Critical Validation Step:**
Before implementing singleton cache, understand why each load happens:

1. **Add Caller Context to Logs**
   ```typescript
   logger.info("Loading protected files from storage", {
     storedCount: files.length,
     caller: new Error().stack?.split('\n')[2], // Capture caller
     purpose: "initial-load" | "refresh" | "validation"
   });
   ```

2. **Document Each Load's Purpose**
   - Load #1 (line 73): ProtectedFileRegistry initialization - Why?
   - Load #2 (line 103): SDK ProtectionManager - Why separate from #1?
   - Load #3 (line 898): Context update after activation - Why needed if already loaded?

3. **Understand Cache Invalidation Requirements**
   - Can files be added to protection during activation?
   - Do consumers expect fresh reads or can they use cached data?
   - What happens if cache is stale and protection decision is wrong?

**Impact:**
- Wasted I/O operations (if truly redundant)
- Contributes to Phase 2 (Storage) taking 652ms
- Risk of cache inconsistency (if naively deduplicated)
- Risk of breaking edge cases (if cache invalidation is incorrect)

**Recommendations:**

1. **Phase 1: Investigation (Week 0)**
   - Add caller context to all "Loading protected files" logs
   - Run activation 10 times, document purpose of each load
   - Identify if any loads happen due to files changing during activation

2. **Phase 2: Decision Tree**
   - **If loads are truly redundant:** Implement singleton cache with initialization flag
   - **If loads serve different contexts:** Implement write-through cache with invalidation strategy
   - **If loads are intentional refreshes:** Add cache TTL (e.g., 100ms) to coalesce rapid reads

3. **Phase 3: Implementation (Conditional)**

   **Option A: Singleton Cache (If Loads Are Redundant)**
   ```typescript
   // Create single ProtectedFilesCache service
   class ProtectedFilesCache {
     private files: ProtectedFile[] | null = null;
     private loading: Promise<ProtectedFile[]> | null = null;

     async load(): Promise<ProtectedFile[]> {
       if (this.files) return this.files; // Cache hit
       if (this.loading) return this.loading; // Dedup concurrent loads

       this.loading = this.loadFromStorage();
       this.files = await this.loading;
       this.loading = null;
       return this.files;
     }

     invalidate() {
       this.files = null; // Clear cache on explicit update
     }
   }
   ```

   **Option B: Write-Through Cache (If Loads Serve Different Contexts)**
   ```typescript
   // Cache with invalidation on write
   class ProtectedFilesCache {
     private cache = new Map<string, ProtectedFile[]>();

     async load(context: string): Promise<ProtectedFile[]> {
       if (this.cache.has(context)) return this.cache.get(context)!;

       const files = await this.loadFromStorage();
       this.cache.set(context, files);
       return files;
     }

     update(files: ProtectedFile[]) {
       this.saveToStorage(files);
       this.cache.clear(); // Invalidate all contexts
     }
   }
   ```

4. **Instrumentation**
   - Track cache hit/miss ratio
   - Alert if cache invalidation happens during activation (indicates edge case)
   - Monitor for stale cache bugs in production

**Expected Improvement:**
- If truly redundant: 200-300ms reduction in Phase 2
- If intentionally separate: 100-150ms reduction with write-through cache
- Risk mitigation: 0 cache-related bugs vs. 20% less optimization if cautious

---

### Issue 2: Network Operations During Activation - Non-Blocking Strategy

**Context:**
Line 75: "Connecting to remote MCP server at https://mcp.snapback.dev"
Line 105: "AI Risk Service initialized" with type "RemoteAIRiskService"

**Root Cause:**
Network-dependent services initialize synchronously during activation, blocking on network latency.

**UX Tradeoff Analysis:**
Deferring network operations to first use creates worse UX than non-blocking activation:

| Approach | Activation Time | First Command Latency | Error Discovery | Offline UX |
|----------|----------------|----------------------|-----------------|------------|
| Current (blocking) | 2343ms | 0ms (connected) | Early (at activation) | Fails activation |
| Deferred (onCommand) | 500ms | 200-500ms wait | Late (when needed) | Silent until command |
| **Non-blocking (recommended)** | **500ms** | **0ms if ready, 200ms if not** | **Early with fallback** | **Graceful degradation** |

**Impact:**
- Blocks activation on network latency/availability
- Current approach primes connection for first use (intentional)
- Validates auth upfront (catches errors early)
- Fails silently if offline despite "Offline mode disabled" log

**Recommendations:**

1. **Non-Blocking MCP Connection (Recommended)**

   Fire-and-forget connection during activation, wait only if first command needs it:

   ```typescript
   // During activation (non-blocking)
   class MCPService {
     private connectionPromise: Promise<MCPConnection> | null = null;
     private connection: MCPConnection | null = null;

     connectAsync() {
       // Fire and forget, don't await
       this.connectionPromise = this.connectWithTimeout(100)
         .then(conn => {
           this.connection = conn;
           logger.info("MCP connected during activation");
           return conn;
         })
         .catch(err => {
           logger.warn("MCP connection deferred", { error: err.message });
           return null; // Don't block activation
         });
     }

     async ensureConnected(): Promise<MCPConnection> {
       // On first command
       if (this.connection) return this.connection;
       if (this.connectionPromise) {
         const conn = await this.connectionPromise;
         if (conn) return conn;
       }
       // Retry if not connected during activation
       return this.connectWithRetry();
     }

     private async connectWithTimeout(timeoutMs: number): Promise<MCPConnection> {
       const timeout = new Promise((_, reject) =>
         setTimeout(() => reject(new Error("Timeout")), timeoutMs)
       );
       return Promise.race([this.connect(), timeout]) as Promise<MCPConnection>;
     }
   }

   // In activate()
   mcpService.connectAsync(); // Non-blocking
   ```

2. **Connection Timeout Strategy**
   - Give MCP connection 100ms during activation
   - If not connected by then, continue in background
   - First command waits for connection if needed
   - Best of both worlds: fast activation + early connection when possible

3. **Fallback Behavior**
   - If MCP unavailable after timeout, use local fallback features
   - Notify user of connection status in status bar
   - Retry connection in background every 30 seconds
   - Don't hide connection issues - make status visible

4. **AI Risk Service - Conditional Initialization**

   Only initialize if local heuristics insufficient:

   ```typescript
   class AIRiskService {
     async analyzeRisk(file: File): Promise<RiskScore> {
       // Try local heuristics first (fast)
       const localScore = this.localHeuristics(file);

       if (localScore.confidence > 0.8) {
         return localScore; // High confidence, no need for remote
       }

       // Fall back to remote for low-confidence cases
       const remoteScore = await this.remoteAnalysis(file);
       return remoteScore;
     }
   }
   ```

5. **User-Facing Connection Status**
   - Status bar shows: "SnapBack: Connected" or "SnapBack: Offline Mode"
   - Command palette shows "(Offline)" suffix for MCP commands when disconnected
   - Graceful error messages: "This feature requires network connection. Retry?"

**Expected Improvement:**
- Activation time: 100-200ms reduction
- First command latency: 0ms if connection ready, 200ms if not
- Offline reliability: Improved (graceful degradation)
- User experience: Better (no activation blocking, clear status)

---

### Issue 3: Repo Audit Timing and Dependency Order

**Context:**
Lines 173, 488 both show:
```
[WARN] No protection policy available for repo status computation
[INFO] Repo audit completed { "status": "error", "attentionCount": 0 }
```

**Root Cause:**
Repo audit runs **before** policy loading completes:
- First audit at line 173 (1333ms offset)
- Second audit at line 488 (2088ms offset)
- Policy loads at line 669 (2289ms offset) - **after both audits**

**Why Audit May Be Intentional:**
Removing repo audit entirely eliminates value:
- **Initial protection status:** Shows users what's protected on first activation
- **Onboarding effectiveness:** Builds trust that SnapBack is "doing something"
- **Early misconfiguration detection:** Catches unprotected critical files
- **User engagement:** Dashboard displays audit results to drive protection actions

**Impact:**
- Two wasted audit operations (both fail due to missing policy)
- Contributes to activation time without providing value
- Logs warnings that confuse debugging
- Repo status shown to user may be incorrect initially
- **Removing audit reduces security value and onboarding effectiveness**

**Recommendations:**

1. **Fix Dependency Order (Recommended)**

   Ensure policy loads before audit runs:

   ```typescript
   // Current (broken)
   await Promise.all([
     loadProtectedFiles(),
     auditRepo(),        // Fails - no policy yet
     loadPolicy(),       // Loads after audit
   ]);

   // Fixed - sequential where needed
   await loadPolicy();              // Must complete first
   await loadProtectedFiles();      // Needs policy

   // Schedule audit as background task (non-blocking)
   scheduleBackgroundAudit();
   ```

2. **Make Audit Async and Cached**

   Run audit in background after activation completes:

   ```typescript
   function scheduleBackgroundAudit() {
     // Don't block activation
     setTimeout(async () => {
       const result = await auditRepo();

       // Cache results
       await auditCache.set(workspaceId, result, { ttl: 5 * 60 * 1000 });

       // Update UI
       statusBar.update(result.attentionCount);

       logger.info("Background audit completed", {
         status: result.status,
         attentionCount: result.attentionCount,
         duration: result.duration
       });
     }, 0); // Run after activation completes
   }
   ```

3. **Add User-Visible Progress**

   Show users that audit is happening:

   ```typescript
   async function runAuditWithProgress() {
     await vscode.window.withProgress(
       {
         location: vscode.ProgressLocation.Notification,
         title: "SnapBack: Analyzing workspace protection...",
         cancellable: false
       },
       async (progress) => {
         const result = await auditRepo();

         if (result.attentionCount > 0) {
           vscode.window.showInformationMessage(
             `SnapBack found ${result.attentionCount} files needing attention`,
             "View Details"
           );
         }

         return result;
       }
     );
   }
   ```

4. **Implement Audit Caching**

   Prevent redundant audits:

   ```typescript
   class AuditCache {
     private cache = new Map<string, { result: AuditResult; timestamp: number }>();
     private ttl = 5 * 60 * 1000; // 5 minutes

     async get(workspaceId: string): Promise<AuditResult | null> {
       const cached = this.cache.get(workspaceId);
       if (!cached) return null;

       if (Date.now() - cached.timestamp > this.ttl) {
         this.cache.delete(workspaceId);
         return null; // Expired
       }

       return cached.result;
     }

     async set(workspaceId: string, result: AuditResult): Promise<void> {
       this.cache.set(workspaceId, { result, timestamp: Date.now() });
     }
   }
   ```

5. **Debounce Rapid Audit Requests**

   Only re-audit on significant workspace changes:

   ```typescript
   const debouncedAudit = debounce(async () => {
     await auditRepo();
   }, 1000); // Wait 1s after last change

   // Trigger on significant events only
   vscode.workspace.onDidSaveTextDocument((doc) => {
     if (isProtectionRelevant(doc)) {
       debouncedAudit();
     }
   });
   ```

6. **Graceful Degradation**

   Show placeholder status until audit completes:

   ```typescript
   class RepoStatusProvider {
     private status: AuditResult | null = null;

     getStatus(): AuditResult {
       return this.status ?? {
         status: "pending",
         attentionCount: 0,
         message: "Analyzing workspace..."
       };
     }
   }
   ```

**Expected Improvement:**
- Activation time: 100-150ms reduction (no failed audits)
- Log cleanliness: No more "No protection policy available" warnings
- User experience: Maintained (audit still runs, just in background)
- Security value: Preserved (early misconfiguration detection)
- Onboarding effectiveness: Improved (users see meaningful results)

---

### Issue 4: Duplicate AutoDecisionIntegration Activation

**Context:**
Lines 687 (twice):
```
[INFO] AutoDecisionIntegration activated
[INFO] AutoDecisionIntegration activated
```

**Root Cause:**
Either duplicate event listener registration or logging bug.

**Impact:**
- Potential double initialization overhead
- Log noise makes debugging harder
- Risk of duplicate event handlers causing unexpected behavior

**Recommendations:**

1. **Fix Registration Logic**
   - Ensure AutoDecisionIntegration registers exactly once
   - Use initialization flag to prevent re-entry

2. **Deduplicate Logging**
   - Remove duplicate log statement
   - Or move to DEBUG level for second occurrence

3. **Code Review Pattern**
   - Search codebase for other duplicate initialization patterns
   - Add unit tests to verify singleton behavior

**Expected Improvement:** Minimal performance impact, cleaner logs

---

### Issue 5: Synchronous Storage Operations in Phase 2

**Context:**
Phase 2 (Storage) takes 652ms, accounting for 27.8% of total activation time.

**Root Cause:**
Likely synchronous file system operations during:
- Protected files loading
- Config migration check
- Storage manager initialization

**Impact:**
- Blocks VS Code main thread
- Causes activation jank
- Prevents concurrent initialization of other services

**Recommendations:**

1. **Convert to Asynchronous Background Loading**
   - Use `Promise.all()` for parallel storage reads
   - Move storage initialization to microtask queue
   - Initialize UI components first, hydrate data asynchronously

2. **Implement Read-Through Cache**
   - Load minimal metadata during activation
   - Lazy-load full snapshot contents on demand
   - Use `fs.promises` API instead of synchronous `fs` methods

3. **Progressive Hydration**
   - Show UI skeleton immediately
   - Stream data into UI as it loads
   - Use VS Code progress indicator for background loading

**Expected Improvement:** 400-500ms reduction in Phase 2

---

### Issue 6: Unaccounted Time Gap - Measurement vs. Execution Problem

**Context:**
Total phase time is 1263ms, but total activation time is 2343ms, leaving **1080ms unaccounted for** (46% of total).

**Root Cause Uncertainty:**
This gap may represent:
- **Extension code:** UI registration, command registration, event listeners (optimizable)
- **VS Code platform overhead:** Webview rendering, IPC between extension host and main process, context setup (not optimizable)
- **I/O wait time:** File system operations spanning multiple phases (partially optimizable)
- **Measurement artifact:** Phase timing doesn't capture all work, or includes overlapping async operations

**Critical Validation Step:**
Before investing in gap investigation, validate that the gap represents extension code:

```typescript
// Add to very first line of activate()
const wallClockStart = Date.now();

// Add to very last line of activate()
const wallClockEnd = Date.now();
const wallClockDuration = wallClockEnd - wallClockStart;

logger.info("Wall-clock activation time", {
  wallClock: wallClockDuration,
  reportedActivation: 2343, // From VS Code
  phaseTime: 1263,
  gap: wallClockDuration - 1263
});
```

**Decision Tree:**
- If wall-clock time is **1200-1400ms**: Gap is mostly VS Code overhead. Focus on measured phases (storage, Pioneer Infrastructure).
- If wall-clock time is **2000-2300ms**: Gap is real extension work. Proceed with detailed investigation.
- If wall-clock time is **< 1000ms**: Measurement problem. Fix instrumentation first.

**Impact:**
- Potentially largest contributor (46% of total), OR
- Potentially VS Code overhead that cannot be optimized
- Prevents targeted optimization until validated

**Recommendations:**

1. **Phase 1: Validate Wall-Clock Time (Week 0)**
   - Add entry/exit timing to activate()
   - Run on 5 different machines (fast SSD, slow HDD, network latency)
   - Compare wall-clock vs. reported activation time
   - Only proceed if wall-clock time > 1500ms

2. **Phase 2: Add Granular PERF Probes (If Validated)**
   - Measure each command registration
   - Time UI provider initialization separately
   - Track VS Code API call latency
   - Add phase for "Pre-Phase 1" and "Post-Phase 15" work

3. **Phase 3: Profile with VS Code Extension Profiler (Last Resort)**
   - Use `--inspect-extensions` flag
   - Generate CPU profile during activation
   - Identify blocking synchronous operations
   - **Warning:** May show extension code idle during gap if overhead is VS Code's

4. **Defer Non-Critical UI (If Gap is Extension Code)**
   - Register status bar items after `onStartupFinished`
   - Lazy-register commands on first palette open
   - Use `when` clauses to hide commands until ready

**Expected Improvement:**
- If gap is extension code: 500-700ms reduction
- If gap is VS Code overhead: 0ms reduction (focus elsewhere)
- If gap is measurement artifact: Fix instrumentation, recalculate targets

---

### Issue 7: Pioneer Infrastructure Overhead

**Context:**
"Pioneer Infrastructure" phase takes 578ms (24.7% of total) but is not defined in standard phase breakdown.

**Root Cause:**
Unknown - this appears to be custom infrastructure not documented in logs.

**Impact:**
- Second-largest time consumer
- Opaque to performance analysis
- May contain deferrable initialization

**Recommendations:**

1. **Break Down Pioneer Infrastructure**
   - Add sub-phase timing for each Pioneer component
   - Log what services/features are included
   - Identify which parts are critical vs. optional

2. **Defer Optional Features**
   - Move experimental/optional features to `onCommand` activation
   - Use feature flags to disable heavy Pioneer features
   - Consider lazy loading Pioneer modules

3. **Audit Pioneer Necessity**
   - Evaluate if Pioneer infrastructure is needed at activation
   - Consider moving to separate extension or optional dependency

**Expected Improvement:** 200-400ms reduction if deferrable

---

### Issue 8: Encryption Service Initialization - Background vs. Lazy

**Context:**
Line 102: Encryption service initialized with AES-256-GCM, 256-bit key, 100,000 PBKDF2 iterations during activation.

**Root Cause:**
Expensive cryptographic key derivation (100,000 iterations) runs during activation even if no snapshots need encryption immediately.

**Risk of Lazy Initialization:**
Deferring key derivation to first snapshot operation creates problems:
- **Snapshot recovery:** Existing encrypted snapshots may need decryption during activation for validation
- **Repeated derivation:** If deferred, key derivation happens on first snapshot, causing 100-200ms hang
- **Race conditions:** Multiple concurrent snapshot operations may trigger simultaneous key derivation
- **Data loss risk:** If key derivation fails during snapshot operation, error handling is more complex

**Impact:**
- CPU-intensive operation (100,000 iterations) blocks activation
- Necessary for users with existing encrypted snapshots (can't defer)
- May be unnecessary for new users (could defer)
- Affects battery life on laptops

**Recommendations:**

1. **Move to onStartupFinished (Recommended)**

   Key derivation happens in background after activation completes:

   ```typescript
   // During activation - skip encryption
   // After activation completes
   vscode.workspace.onDidChangeWorkspaceFolders(async () => {
     await encryptionService.warmupKeyDerivation();
   });

   // Or use VS Code event
   export async function activate(context: vscode.ExtensionContext) {
     // ... activation phases ...

     // Schedule encryption warmup in background
     context.subscriptions.push(
       vscode.window.onDidChangeActiveTextEditor(() => {
         encryptionService.warmupKeyDerivation(); // Fire once
       }, null, { once: true })
     );
   }
   ```

2. **Conditional Initialization**

   Only derive key if user has encrypted snapshots:

   ```typescript
   async function initializeEncryption(): Promise<void> {
     const hasEncryptedSnapshots = await storage.hasEncryptedSnapshots();

     if (!hasEncryptedSnapshots) {
       logger.info("No encrypted snapshots, deferring key derivation");
       return; // Skip for new users
     }

     await encryptionService.deriveKey();
     logger.info("Encryption key derived for existing snapshots");
   }
   ```

3. **Cache Derived Key with Secure Storage**

   Avoid re-deriving key on every activation:

   ```typescript
   class EncryptionService {
     private cachedKey: CryptoKey | null = null;

     async deriveKey(): Promise<CryptoKey> {
       // Try to load cached key from secure storage
       const cached = await this.loadCachedKey();
       if (cached && this.validateKey(cached)) {
         this.cachedKey = cached;
         return cached;
       }

       // Derive new key (expensive)
       const key = await this.deriveKeyFromPassword();
       await this.cacheKey(key);
       this.cachedKey = key;
       return key;
     }

     private async cacheKey(key: CryptoKey): Promise<void> {
       // Cache for session lifetime
       // Invalidate on: workspace change, user logout
     }
   }
   ```

4. **Optimize Key Derivation**
   - **Reduce iterations for development builds:** 10,000 instead of 100,000
   - **Use Web Crypto API if available:** Hardware acceleration in browser contexts
   - **Consider scrypt instead of PBKDF2:** Better resistance to GPU attacks, similar performance

5. **Health Check Pattern**

   Ensure encryption ready before first snapshot operation:

   ```typescript
   async function createSnapshot(file: File): Promise<Result<Snapshot, Error>> {
     // Ensure encryption ready (waits if still warming up)
     await encryptionService.ensureReady();

     const encrypted = await encryptionService.encrypt(file.content);
     return Ok({ ...snapshot, content: encrypted });
   }
   ```

**Expected Improvement:**
- Activation time: 50-100ms reduction
- First snapshot operation: No added latency (key ready by then)
- Battery impact: Reduced (background vs. foreground work)
- Data integrity: Maintained (keys ready when needed)

---

### Issue 9: File Watcher Event Storm

**Context:**
Lines post-activation show rapid duplicate events:
```
[2025-12-17T10:45:40.137Z] [INFO] [SnapBack] File changed: .git/FETCH_HEAD
[2025-12-17T10:45:40.550Z] [INFO] [SnapBack] File changed: .git/FETCH_HEAD (413ms later)
```

**Root Cause:**
File watcher lacks debouncing for rapid-fire events (likely git operations).

**Impact:**
- Redundant file processing
- Log spam
- Wasted CPU cycles
- Potential to trigger protection decisions on non-user files

**Recommendations:**

1. **Implement Event Debouncing**
   - Use 500ms debounce window for file change events
   - Batch multiple changes to same file
   - Use VS Code workspace file watcher patterns

2. **Filter Git Internal Files**
   - Exclude `.git/**` from file watcher by default
   - Add to `neverProtectPatterns` configuration
   - Only watch user-facing workspace files

3. **Smart Event Coalescing**
   - Group rapid events by file path
   - Process only latest event per file
   - Cancel in-flight operations if file changed again

**Expected Improvement:** Reduced post-activation CPU usage, cleaner logs

---

### Issue 10: Process Exit Attempt - Critical Architecture Issue

**Priority: Week 0 - Blocking Issue**

**Context:**
Debug console shows:
```
Error: An extension called process.exit() and this was prevented.
    at process.WJ.process.exit (file:///Applications/Qoder.app/Contents/Resources/app/out/vs/workbench/api/node/extensionHostProcess.js:225:1697)
    at main (/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/dist/extension.js:943:21154)
```

**Root Cause Possibilities:**
This indicates fundamental error handling or architecture issues:
- **Unhandled promise rejection:** Catch handler calls process.exit()
- **Test code in production:** Test cleanup code leaked to production build
- **Node.js environment assumption:** Dependency expects Node.js, calls exit on error
- **Broken activation error handling:** Main function tries to terminate on initialization failure
- **CLI code in extension:** Shared code between CLI and extension not properly abstracted

**Why This is Critical:**
- **Indicates broken error handling:** Fixing with bandaid (catch exit call) hides real issue
- **May cause silent failures:** Extension might fail in other ways not visible in logs
- **Will resurface during rollout:** Performance optimizations will trigger the same error path
- **Risk of data loss:** If exit is triggered during snapshot operation, data may be lost

**Impact:**
- Extension may be in inconsistent state after activation
- User data at risk if error handling is fundamentally broken
- Performance optimizations may worsen problem if error paths are exercised more
- Trust and stability concerns if extension "crashes" silently

**Recommendations:**

1. **Investigation Steps (Week 0 - Before Any Optimization Work)**

   **Step 1: Search Codebase for Exit Calls**
   ```bash
   # Find all process.exit() calls
   grep -r "process\.exit" apps/vscode/src/
   grep -r "process\.kill" apps/vscode/src/
   grep -r "process\.abort" apps/vscode/src/

   # Find all throw statements in main/activate functions
   grep -A5 "export async function activate" apps/vscode/src/extension.ts
   ```

   **Step 2: Add Unhandled Rejection Handler**
   ```typescript
   // At top of extension.ts
   process.on('unhandledRejection', (reason, promise) => {
     logger.error('Unhandled Promise Rejection', {
       reason: reason instanceof Error ? reason.message : String(reason),
       stack: reason instanceof Error ? reason.stack : undefined,
       promise: String(promise)
     });

     // DO NOT exit - log and continue
     vscode.window.showErrorMessage(
       'SnapBack encountered an unexpected error. Please check logs.'
     );
   });

   process.on('uncaughtException', (error) => {
     logger.error('Uncaught Exception', {
       message: error.message,
       stack: error.stack
     });

     // DO NOT exit - try to recover
   });
   ```

   **Step 3: Review Main Function Error Handling**
   ```typescript
   // Check if main() exists and how it handles errors
   // Line 943:21154 in extension.js (from stack trace)
   // This is minified - need to check source
   ```

   **Step 4: Check for Shared CLI Code**
   ```bash
   # Find imports from CLI package
   grep -r "@snapback/cli" apps/vscode/src/
   grep -r "from.*cli" apps/vscode/src/
   ```

2. **Fix Patterns**

   **Pattern 1: Remove Process Exit Calls**
   ```typescript
   // ❌ BAD - Never call process.exit() in VS Code extension
   async function activate(context: vscode.ExtensionContext) {
     try {
       await initialize();
     } catch (error) {
       logger.error("Activation failed", error);
       process.exit(1); // ❌ This is prevented by VS Code
     }
   }

   // ✅ GOOD - Use Result type for error handling
   async function activate(context: vscode.ExtensionContext) {
     const result = await initialize();

     if (isErr(result)) {
       logger.error("Activation failed", result.error);

       vscode.window.showErrorMessage(
         `SnapBack failed to activate: ${result.error.message}`,
         "View Logs"
       );

       // Partial activation - some features may work
       return; // Don't exit process
     }
   }
   ```

   **Pattern 2: Graceful Degradation**
   ```typescript
   // Allow extension to activate partially on error
   class ExtensionState {
     private features = new Map<string, boolean>();

     async activateFeature(name: string, init: () => Promise<void>) {
       try {
         await init();
         this.features.set(name, true);
       } catch (error) {
         logger.error(`Feature ${name} failed to activate`, error);
         this.features.set(name, false);
         // Continue with other features
       }
     }

     isEnabled(feature: string): boolean {
       return this.features.get(feature) ?? false;
     }
   }
   ```

   **Pattern 3: Separate CLI and Extension Error Handling**
   ```typescript
   // In shared code
   export function handleError(error: Error, context: 'cli' | 'extension') {
     if (context === 'cli') {
       console.error(error.message);
       process.exit(1); // OK in CLI
     } else {
       // Extension - log and return error
       logger.error(error.message, error);
       return Err(error);
     }
   }
   ```

3. **Add Runtime Assertions**

   Detect environment and fail fast if assumptions violated:
   ```typescript
   function assertExtensionContext() {
     if (typeof vscode === 'undefined') {
       throw new Error('Not running in VS Code extension context');
     }

     // Prevent process.exit in extension
     const originalExit = process.exit;
     process.exit = ((code?: number) => {
       logger.error('process.exit() called in extension context', {
         code,
         stack: new Error().stack
       });
       throw new Error('process.exit() is not allowed in VS Code extensions');
     }) as typeof process.exit;
   }
   ```

4. **Testing Strategy**

   Verify error handling without process.exit:
   ```typescript
   // In test suite
   describe('Extension Activation Error Handling', () => {
     it('should not call process.exit on activation failure', async () => {
       const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
         throw new Error('process.exit called');
       });

       // Trigger activation failure
       await expect(activate(mockContext)).resolves.not.toThrow();

       expect(exitSpy).not.toHaveBeenCalled();
     });
   });
   ```

**Expected Outcome:**
- Identify root cause of process.exit() call
- Remove all exit calls from extension code
- Implement proper error handling with Result types
- Enable graceful degradation on partial activation failure
- Unblock optimization work with confidence in error handling

**Blocker Status:**
This issue MUST be resolved before proceeding with Weeks 1-5 optimization work. Broken error handling will cause unpredictable behavior during rollout.

---

## Activation Event Strategy Redesign

### Current State (Assumed)

Based on immediate activation behavior, likely uses:
- `"activationEvents": ["*"]` or very broad events
- All services initialize regardless of user needs

### Recommended Strategy

**Critical Path (Must activate immediately):**
- Core services (EventEmitter, ServiceFederation)
- AuthProvider and SecureConfig
- Basic UI (status bar skeleton)

**Deferred to onStartupFinished:**
- WorkspaceContextManager
- Onboarding and Progressive Disclosure
- ProtectionNotifications
- Repo audit
- Policy loading (background)

**Deferred to onCommand:**
- MCP connection (when user runs MCP command)
- Snapshot encryption/decryption (when user creates snapshot)
- AI Risk Service (when protection decision needs it)
- Feedback commands

**Deferred to onLanguage or workspaceContains:**
- AutoDecisionIntegration (when supported file type opened)
- File protection features (when `.snapback` folder exists)

### Implementation Approach

1. **Update package.json activationEvents**
   - Remove "*" if present
   - Add specific events: `onStartupFinished`, `onCommand:snapback.*`, `workspaceContains:.snapback`

2. **Implement Lazy Service Initialization**
   - Enhance ServiceFederation LazyLoader to truly defer initialization
   - Add `getOrCreate()` pattern for each manager
   - Use dependency injection with lazy proxies

3. **Progressive Feature Enablement**
   - Phase 1 (0-100ms): Core services, UI skeleton
   - Phase 2 (background): Storage, policy, protected files
   - Phase 3 (onStartupFinished): Workspace features, onboarding
   - Phase 4 (onDemand): MCP, encryption, AI risk

---

## Configuration and Policy Improvements

### Current Configuration Issues

**From log (line 687):**
```typescript
{
  "riskThreshold": 60,
  "notifyThreshold": 40,
  "minFilesForBurst": 3,
  "maxSnapshotsPerMinute": 4,
  "alwaysProtectPatterns": [
    "package.json",
    "tsconfig.json",
    ".env*",
    "*.config.js",
    "*.config.ts"
  ],
  "neverProtectPatterns": [
    "node_modules/**",
    "dist/**",
    "*.log",
    "*.lock"
  ]
}
```

### Recommended Additions

**Add to neverProtectPatterns:**
- `.git/**` (eliminate file watcher noise)
- `*.min.js`, `*.min.css` (generated files)
- `.vscode/**`, `.idea/**` (IDE files)
- `coverage/**`, `test-results/**` (test artifacts)

**Optimize Thresholds for Performance:**
- `maxSnapshotsPerMinute: 4` → Consider reducing to 2 for activation period
- Add `deferActivationAudit: true` flag to skip repo audit during activation
- Add `lazyMCPConnection: true` flag to defer MCP until needed

**Policy Loading Strategy:**
- Cache parsed policy in memory
- Only reload on file change event
- Validate policy schema during load, not during each decision

---

## Instrumentation and Observability Design

### Additional PERF Probes Needed

1. **Granular Phase Timing**
   - Pioneer Infrastructure sub-phases
   - Individual command registration time
   - UI provider initialization time
   - Each "Loading protected files" call with caller context

2. **Network Call Tracking**
   - MCP connection attempt time
   - AI Risk Service remote call latency
   - Timeout detection and retry metrics

3. **Cache Performance**
   - Protected files cache hit/miss ratio
   - Policy cache effectiveness
   - Storage read/write latency

4. **Activation Bottleneck Detection**
   - Identify top 5 slowest operations each activation
   - Track activation time trend over versions
   - Alert if activation time exceeds budget

### Logging Improvements

**Reduce Log Noise:**
- Move file watcher events to DEBUG level
- Deduplicate "AutoDecisionIntegration activated"
- Consolidate protected files loading logs

**Add Context-Rich Logs:**
- Stack traces for "Loading protected files" to find callers
- Log activation event that triggered extension
- Log feature flags and environment context

**Structured Logging:**
- Include `correlationId` for each activation session
- Add `duration` field to all operation logs
- Use consistent log levels (PERF for timing, WARN for budget violations)

---

## Testing and Validation Strategy

### Performance Regression Tests

**Challenge: Test Environment vs. Real-World Variance**

Test environments typically have:
- Fast SSDs (users may have mechanical drives)
- Good network (users on weak WiFi)
- Idle machines (users with 100 tabs open)
- Small workspaces (users with monorepos)

**Solution: Multi-Environment Testing Matrix**

| Environment | Disk | Network | Load | Target | Purpose |
|-------------|------|---------|------|--------|----------|
| CI/CD (GitHub Actions) | SSD | Excellent | Idle | < 300ms | Regression detection |
| Dev Machine (MacBook Pro M1) | SSD | Gigabit | Idle | < 400ms | Developer baseline |
| Slow Disk VM | HDD | Good | Idle | < 800ms | Worst-case disk I/O |
| Network Latency VM | SSD | 100ms RTT | Idle | < 600ms | Worst-case network |
| Heavy Load VM | SSD | Good | 100 tabs | < 1000ms | Worst-case CPU |
| Real User Telemetry | Varies | Varies | Varies | P50 < 500ms, P90 < 800ms | Production validation |

**Test Suite Structure:**

```typescript
// Activation time budget tests
describe('Extension Activation Performance', () => {
  describe('CI Environment (Fast SSD, Idle)', () => {
    it('should activate in < 300ms', async () => {
      const start = Date.now();
      await activateExtension();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(300);
    });

    it('should complete Phase 2 (Storage) in < 50ms', async () => {
      const metrics = await getPhaseMetrics();
      expect(metrics.phase2Duration).toBeLessThan(50);
    });
  });

  describe('Slow Disk Environment (Simulated)', () => {
    beforeEach(() => {
      // Simulate slow disk I/O
      mockFileSystem.setLatency(50); // 50ms per read
    });

    it('should activate in < 800ms on slow disk', async () => {
      const start = Date.now();
      await activateExtension();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(800);
    });
  });

  describe('Network Latency Environment (Simulated)', () => {
    beforeEach(() => {
      // Simulate 100ms network RTT
      mockNetworkAdapter.setLatency(100);
    });

    it('should activate in < 600ms with network latency', async () => {
      const start = Date.now();
      await activateExtension();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(600);
    });

    it('should use non-blocking MCP connection', async () => {
      const mcpStart = Date.now();
      await activateExtension();
      const activationDuration = Date.now() - mcpStart;

      // MCP connection should not block activation beyond 100ms
      expect(activationDuration).toBeLessThan(200);
    });
  });
});
```

---

### Phase Timing Tests

**Assert phase-level budgets:**

```typescript
describe('Phase Timing Budgets', () => {
  it('Phase 1 (Services) should complete in < 50ms', async () => {
    const metrics = await getPhaseMetrics();
    expect(metrics.phase1Duration).toBeLessThan(50);
  });

  it('Phase 2 (Storage) should complete in < 100ms', async () => {
    const metrics = await getPhaseMetrics();
    expect(metrics.phase2Duration).toBeLessThan(100);
  });

  it('Pioneer Infrastructure should complete in < 100ms', async () => {
    const metrics = await getPhaseMetrics();
    expect(metrics.pioneerInfrastructureDuration).toBeLessThan(100);
  });

  it('Total phase time should be < 300ms', async () => {
    const metrics = await getPhaseMetrics();
    const totalPhaseTime = Object.values(metrics)
      .reduce((sum, duration) => sum + duration, 0);
    expect(totalPhaseTime).toBeLessThan(300);
  });
});
```

---

### Cache Behavior Tests

**Verify protected files loaded exactly once:**

```typescript
describe('Protected Files Caching', () => {
  it('should load protected files exactly once during activation', async () => {
    const loadSpy = vi.spyOn(storage, 'loadProtectedFiles');

    await activateExtension();

    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('should use cached files for subsequent access', async () => {
    await activateExtension();

    const loadSpy = vi.spyOn(storage, 'loadProtectedFiles');

    // Access protected files multiple times
    await protectedFileRegistry.getAll();
    await protectionManager.getProtectedFiles();
    await workspaceManager.listProtectedFiles();

    // Should use cache, not reload from storage
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('should invalidate cache on explicit update', async () => {
    await activateExtension();

    const loadSpy = vi.spyOn(storage, 'loadProtectedFiles');

    // Update protected files
    await protectedFileRegistry.addFile('/path/to/file.ts');

    // Next access should reload
    await protectedFileRegistry.getAll();
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });
});
```

---

### Manual Verification Checklist

**Pre-Release Checklist:**

- [ ] **Activation Time (Measured in VS Code Dev Tools)**
  - [ ] MacBook Pro M1 (SSD, Gigabit, Idle): < 400ms
  - [ ] Windows Desktop (SSD, WiFi 5GHz, 20 tabs): < 600ms
  - [ ] Windows Laptop (HDD, Weak WiFi, 100 tabs): < 1200ms

- [ ] **Log Cleanliness**
  - [ ] No "Loading protected files from storage" duplicates
  - [ ] No "AutoDecisionIntegration activated" duplicates
  - [ ] No "No protection policy available" warnings
  - [ ] No process.exit() errors

- [ ] **Network Operations**
  - [ ] No MCP connection during activation (or < 100ms timeout)
  - [ ] No AI Risk Service network calls during activation
  - [ ] Graceful offline behavior (no activation failure)

- [ ] **Background Operations**
  - [ ] Repo audit runs in background after activation
  - [ ] Policy loads in background (or completes before audit)
  - [ ] Encryption key derivation happens after activation

- [ ] **UI Responsiveness**
  - [ ] Status bar appears immediately (< 100ms)
  - [ ] Commands available within 500ms
  - [ ] First file protection feels fast (< 200ms)
  - [ ] No visible lag or jank during activation

- [ ] **File Watcher**
  - [ ] Ignores `.git/**` by default
  - [ ] No rapid-fire duplicate events in logs
  - [ ] Debouncing works correctly

---

### A/B Testing Approach

**Before/After Metrics:**

1. **Baseline Current Activation Time**
   - Run extension 10 times on each test environment
   - Record P50, P90, P99 for each environment
   - Calculate aggregate baseline: P50 = 2300ms, P90 = 2500ms, P99 = 3000ms

2. **Implement Optimizations Incrementally**
   - After each phase, measure activation time on all environments
   - Track delta from baseline
   - Identify which optimization had biggest impact

3. **Measure Activation Time After Each Change**
   - Protected files caching: -200ms (P50)
   - Non-blocking MCP: -100ms (P50)
   - Async storage: -500ms (P50)
   - Background encryption: -50ms (P50)

4. **Track Percentile Latency**
   - P50 (median): Target for typical users
   - P90: Target for most users
   - P99: Catch outliers and edge cases

**Real-World User Testing:**

```typescript
// Collect activation time from production users
interface ActivationTelemetry {
  userId: string;
  version: string;
  duration: number;
  environment: {
    platform: 'win32' | 'darwin' | 'linux';
    vscodeVersion: string;
    workspaceSize: number; // Number of files
    diskType: 'ssd' | 'hdd' | 'unknown';
  };
}

// Send to analytics
async function reportActivationTime(telemetry: ActivationTelemetry) {
  await analytics.track('extension.activated', {
    duration: telemetry.duration,
    environment: telemetry.environment,
    version: telemetry.version
  });
}

// Calculate percentiles from collected data
function calculatePercentiles(durations: number[]): ActivationMetrics {
  const sorted = durations.sort((a, b) => a - b);

  return {
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}
```

---

## Migration and Rollout Plan

### Week 0: Critical Blockers and Validation

**Priority: Must complete before optimization work begins**

**Task 1: Resolve process.exit() Issue**
- Search codebase for all process.exit(), process.kill() calls
- Add unhandledRejection and uncaughtException handlers
- Review main function error handling
- Implement graceful degradation with Result types
- Test activation failure scenarios
- **Deliverable:** Extension activates without process.exit() errors
- **Success Metric:** 0 process.exit() calls in production logs

**Task 2: Validate 1080ms Gap**
- Add wall-clock timing from first to last line of activate()
- Run on 5 different machines (fast SSD, slow HDD, weak network)
- Compare wall-clock vs. phase time vs. reported activation time
- Document what the gap represents
- **Deliverable:** Gap analysis report with root cause
- **Decision Point:** Proceed with gap investigation only if wall-clock time > 1500ms

**Task 3: Investigate Protected Files Loading**
- Add caller context (stack trace) to all "Loading protected files" logs
- Run activation 10 times, document purpose of each load
- Determine if loads are redundant or serve different cache contexts
- **Deliverable:** Protected files loading strategy recommendation
- **Decision Point:** Singleton cache vs. write-through cache vs. TTL cache

**Task 4: Break Down Pioneer Infrastructure**
- Add sub-phase timing for each Pioneer component
- Identify critical vs. optional features
- Document what can be deferred
- **Deliverable:** Pioneer Infrastructure component breakdown
- **Decision Point:** Target reduction (100ms, 200ms, or defer entirely)

**Week 0 Exit Criteria:**
- [ ] No process.exit() errors in activation
- [ ] Gap investigation decision made (investigate vs. ignore)
- [ ] Protected files caching strategy selected
- [ ] Pioneer Infrastructure breakdown complete

---

### Phase 1: Quick Wins (Week 1)

**Target: Reduce P50 activation time to 1500ms (800ms improvement)**

**Task 1: Implement Protected Files Caching**
- Based on Week 0 investigation, implement chosen cache strategy
- Add cache hit/miss instrumentation
- Test edge cases (files changing during activation)
- **Expected improvement:** 200-300ms (P50), 100-150ms (P90)

**Task 2: Fix Repo Audit Dependency Order**
- Ensure policy loads before audit runs
- Move audit to background task (non-blocking)
- Add audit caching with 5-minute TTL
- **Expected improvement:** 100-150ms (P50), 50-100ms (P90)

**Task 3: Fix Duplicate AutoDecisionIntegration Log**
- Remove duplicate log statement
- Verify singleton initialization
- **Expected improvement:** 0ms (log cleanup only)

**Task 4: Add .git/** to neverProtectPatterns**
- Update default configuration
- Document in release notes
- **Expected improvement:** Reduced post-activation CPU usage

**Phase 1 Exit Criteria:**
- [ ] P50 activation time < 1500ms (measured across 5 environments)
- [ ] P90 activation time < 2000ms
- [ ] No "Loading protected files" duplicates in logs
- [ ] No "No protection policy available" warnings
- [ ] File watcher ignores .git/** by default

---

### Phase 2: Lazy Loading (Week 2-3)

**Target: Reduce P50 activation time to 800ms (700ms improvement from baseline)**

**Task 1: Non-Blocking MCP Connection**
- Implement fire-and-forget connection during activation
- Add ensureConnected() for first command
- Add connection timeout (100ms)
- Implement local fallback when MCP unavailable
- **Expected improvement:** 100-200ms (P50), 50-100ms (P90)

**Task 2: Background Encryption Key Derivation**
- Move key derivation to onStartupFinished
- Implement conditional initialization (only if encrypted snapshots exist)
- Add key caching with secure storage
- **Expected improvement:** 50-100ms (P50), 30-70ms (P90)

**Task 3: Async Storage Loading**
- Convert Phase 2 storage operations to async parallel reads
- Use Promise.all() for concurrent file loads
- Implement progressive UI hydration
- **Expected improvement:** 400-500ms (P50), 250-350ms (P90)

**Task 4: Defer AI Risk Service**
- Initialize on first protection decision
- Add local heuristics fallback
- Cache remote analysis results
- **Expected improvement:** 50-100ms (P50), 30-70ms (P90)

**Phase 2 Exit Criteria:**
- [ ] P50 activation time < 800ms
- [ ] P90 activation time < 1200ms
- [ ] MCP connection non-blocking (< 100ms timeout)
- [ ] Encryption key ready by first snapshot operation
- [ ] Storage operations fully async
- [ ] AI Risk Service initializes on demand

---

### Phase 3: Activation Event Refactor (Week 4)

**Target: Reduce P50 activation time to 500ms (additional 300ms improvement)**

**Task 1: Update activationEvents in package.json**
- Remove "*" if present
- Add specific events: onStartupFinished, onCommand:snapback.*, workspaceContains:.snapback
- Document activation strategy in README

**Task 2: Defer to onStartupFinished**
- WorkspaceContextManager
- Onboarding and Progressive Disclosure
- Policy loading (background)
- Repo audit (background with progress indicator)

**Task 3: Defer Optional Pioneer Infrastructure**
- Based on Week 0 breakdown, defer non-critical components
- Keep only critical path in activation
- Schedule optional features for onStartupFinished

**Task 4: Implement True Lazy Service Initialization**
- Enhance ServiceFederation LazyLoader
- Add getOrCreate() pattern for each manager
- Use dependency injection with lazy proxies

**Phase 3 Exit Criteria:**
- [ ] P50 activation time < 500ms
- [ ] P90 activation time < 800ms
- [ ] Non-critical features deferred to onStartupFinished
- [ ] Lazy service initialization verified with tests
- [ ] User-facing features feel instant (< 100ms to first interaction)

---

### Phase 4: Instrumentation and Monitoring (Week 5)

**Target: Prevent regressions, enable continuous optimization**

**Task 1: Add Comprehensive PERF Probes**
- If Week 0 validated gap, add granular gap instrumentation
- Track all operations > 50ms
- Add phase for "Pre-Phase 1" and "Post-Phase 15"
- Measure command registration time

**Task 2: Implement Activation Time Telemetry**
- Send percentile metrics to PostHog/analytics
- Include environment context (platform, disk type, network latency)
- Alert on regressions (P50 > baseline * 1.2)

**Task 3: Create Performance Dashboard**
- Track activation time trend over versions
- Phase breakdown visualization
- User impact metrics (% users affected by slow activation)
- Identify P99 outliers for investigation

**Task 4: Real-World Variance Testing**
- Test on 5 representative environments (see Phase Budget Allocation)
- Collect baseline percentiles (P50, P90, P99)
- Verify targets met across variance

**Phase 4 Exit Criteria:**
- [ ] P50 < 500ms, P90 < 800ms, P99 < 1500ms (across all test environments)
- [ ] Telemetry collecting activation time from production users
- [ ] Dashboard shows activation time trend
- [ ] Regression alerts configured
- [ ] 90% of users activate in < 800ms (measured in production)

---

### Rollout Strategy

**Canary Rollout (Recommended over Feature Flags)**

Use deployment strategy instead of long-lived feature flags:

**Week 1-2 (Phase 1-2):**
- Deploy optimizations to 10% of users (canary group)
- Monitor activation time percentiles daily
- Compare canary group vs. control group
- **Rollback trigger:** P90 > 2000ms or error rate > 5%
- **Proceed trigger:** P90 < 1500ms and error rate < 1%

**Week 3 (Phase 2 continued):**
- Expand to 25% of users
- Monitor for 3 days
- **Rollback trigger:** P90 > 1500ms or user complaints > 10
- **Proceed trigger:** P90 < 1200ms and positive user feedback

**Week 4 (Phase 3):**
- Expand to 50% of users
- Monitor for 5 days
- **Rollback trigger:** P90 > 1000ms or regression reports
- **Proceed trigger:** P50 < 600ms and P90 < 900ms

**Week 5 (Phase 4):**
- Full rollout to 100% of users
- Monitor for 2 weeks
- Collect success metrics
- **Success:** P50 < 500ms, P90 < 800ms maintained for 2 weeks

**Infrastructure Flags (If Needed)**

Only use for architectural changes that require gradual enablement:

```typescript
// Add expiration date - remove in next major version
interface InfrastructureFlags {
  lazyMCPConnection: boolean; // Expires 2026-02-17
  asyncStorageLoading: boolean; // Expires 2026-02-17
  deferredEncryption: boolean; // Expires 2026-02-17
}

// Check flag with expiration
function shouldUseLazyMCP(): boolean {
  const expirationDate = new Date('2026-02-17');
  if (Date.now() > expirationDate.getTime()) {
    return true; // Always use new code after expiration
  }
  return flags.lazyMCPConnection;
}
```

**Flag Cleanup Schedule:**
- Week 8: Remove all infrastructure flags from code
- Week 9: Release new version with flags removed
- Week 10: Deprecate old version with flags

---

### Success Metrics

**Quantitative (Measured via Telemetry):**
- P50 activation time: < 500ms (stretch goal)
- P90 activation time: < 800ms (primary goal)
- P99 activation time: < 1500ms (acceptable)
- Error rate during activation: < 1%
- User churn post-upgrade: < 5%

**Qualitative (Measured via User Feedback):**
- User sentiment surveys: "Extension feels instant" > 80% agree
- Support tickets related to slow activation: < 5 per week
- User engagement with first-time features: > 50% try protection within 5 minutes

**Operational:**
- Zero process.exit() errors in production
- Cache hit ratio for protected files: > 95%
- MCP connection success rate: > 90% (within 100ms timeout)
- Audit completion rate: 100% (in background)

---

### Rollback Plan

**Rollback Triggers:**
1. P90 activation time > 2x baseline (> 4000ms)
2. Error rate during activation > 5%
3. User churn rate > 10% within 3 days of upgrade
4. Critical bugs (data loss, crashes) > 3 reports

**Rollback Procedure:**
1. **Immediate:** Revert deployment to previous version (< 15 minutes)
2. **Investigation:** Collect logs from affected users (1 hour)
3. **Root Cause Analysis:** Identify what failed (4 hours)
4. **Fix:** Implement fix and test (1-2 days)
5. **Re-deploy:** Canary rollout to 5% of users (restart Week 1)

**Partial Rollback:**
If only one optimization causes issues:
- Use infrastructure flag to disable specific optimization
- Keep other optimizations active
- Fix problematic optimization in isolation
- Re-enable once fixed

---

## Success Criteria

### Quantitative Metrics

- **Activation time:** < 500ms (P90)
- **Phase 2 (Storage):** < 100ms
- **Pioneer Infrastructure:** < 100ms
- **Protected files loaded:** Exactly 1 time during activation
- **Network calls during activation:** 0
- **Repo audit during activation:** 0
- **Process exit errors:** 0

### Qualitative Metrics

- Extension feels instant to users
- No blocking operations during activation
- Clean logs without noise or duplicates
- Graceful offline behavior
- Stable activation (no errors)

### User Experience Improvements

- Status bar appears immediately
- Commands available within 500ms
- First file protection feels fast
- No visible lag or jank
- Clear progress indicators for background tasks

---

## Risk Assessment and Mitigation

### Risk 1: Breaking Changes from Lazy Loading

**Risk:** Deferring service initialization may break code expecting services to exist immediately.

**Mitigation:**
- Comprehensive unit tests for each lazy service
- Use dependency injection to enforce initialization order
- Add runtime assertions for required services
- Gradual rollout with feature flags

### Risk 2: Offline Functionality Degradation

**Risk:** Deferring network services may break offline mode.

**Mitigation:**
- Implement proper offline detection
- Provide local fallbacks for all remote services
- Test offline scenarios explicitly
- Document offline capabilities

### Risk 3: User-Visible Behavior Changes

**Risk:** Deferring UI features may confuse users expecting immediate availability.

**Mitigation:**
- Show loading states for deferred features
- Use VS Code progress indicators
- Provide clear error messages if initialization fails
- Document expected behavior in release notes

### Risk 4: Performance Regression from Instrumentation

**Risk:** Adding extensive PERF probes may slow down activation.

**Mitigation:**
- Use lightweight timing (Date.now() vs. performance.mark())
- Make instrumentation optional via debug flag
- Measure instrumentation overhead separately
- Remove probes in production builds if needed

---

## Open Questions and Investigations Needed

1. **What is Pioneer Infrastructure?**
   - Request detailed breakdown of 578ms spent here
   - Identify which components are critical vs. optional
   - Determine if this is third-party dependency

2. **What causes 1080ms unaccounted gap?**
   - Use VS Code extension profiler to investigate
   - Add PERF probes around all suspected areas
   - Consider VS Code API call latency

3. **Why does repo audit fail without policy?**
   - Investigate dependency order
   - Determine if audit can gracefully skip when policy unavailable
   - Consider removing audit entirely if always fails

4. **What triggers process.exit() attempt?**
   - Add error context logging
   - Review main function error handling
   - Check test mode detection logic

5. **Is MCP connection always needed?**
   - Survey user usage patterns
   - Determine percentage of users using MCP features
   - Consider making MCP entirely optional

6. **Can encryption be optional?**
   - Survey users for encryption usage
   - Provide configuration to disable encryption
   - Implement encryption as plugin architecture

---

## Related Documentation References

- **VS Code Extension Activation Best Practices:** https://code.visualstudio.com/api/references/activation-events
- **VS Code Extension Performance:** https://code.visualstudio.com/api/advanced-topics/extension-performance
- **Result Type Pattern:** See `always-result-type-pattern.md` rule
- **Logging Standards:** See `decision-logging-observability.md` rule
- **Monorepo Import Patterns:** See `always-monorepo-imports.md` rule

---

## Appendix: Log Analysis Reference

### Key Log Lines for Investigation

| Line | Timestamp Offset | Event | Issue |
|------|------------------|-------|-------|
| 73-74 | +600ms | Protected files load #1 | Duplicate load |
| 75 | +675ms | MCP connection start | Network during activation |
| 102 | +702ms | Encryption service init | Expensive crypto |
| 103-104 | +703ms | Protected files load #2 | Duplicate load |
| 105 | +705ms | AI Risk Service init | Potential network |
| 173 | +1333ms | Repo audit #1 fails | Missing policy |
| 488 | +2088ms | Repo audit #2 fails | Missing policy |
| 669 | +2289ms | Policy loaded | After audits |
| 687 | +2307ms | AutoDecision activated 2x | Duplicate log |
| 898 | +2518ms | Protected files load #3-5 | Duplicate loads |

### Phase Budget Allocation (Target)

**Approach: Tiered Performance Targets**

Instead of absolute targets, use percentile-based success criteria that account for real-world variance:

| Phase | Current | P50 Target | P90 Target | P99 Target | Strategy |
|-------|---------|-----------|-----------|-----------|----------|
| Phase 1 (Services) | 0ms | 50ms | 80ms | 150ms | Minimal initialization |
| Phase 2 (Storage) | 652ms | 100ms | 200ms | 400ms | Async background |
| Phase 3 (Managers) | 28ms | 50ms | 80ms | 150ms | Lazy initialization |
| Phase 4 (Providers) | 3ms | 20ms | 40ms | 80ms | UI skeleton only |
| Phase 5 (Registration) | 1ms | 30ms | 60ms | 120ms | Critical commands only |
| Pioneer Infrastructure | 578ms | 100ms | 200ms | 400ms | Defer optional features |
| Unaccounted Gap | 1080ms | 150ms | 220ms | 500ms | Investigate if validated |
| **Total** | **2343ms** | **500ms** | **800ms** | **1500ms** | **Phased improvements** |

**Success Criteria:**
- **Primary Goal:** 90% of users (P90) activate in < 800ms
- **Stretch Goal:** 50% of users (P50) activate in < 500ms
- **Acceptable:** 99% of users (P99) activate in < 1500ms

**Rationale for Tiered Targets:**

1. **User Environment Variance**
   - Fast SSD (P50): 500ms achievable
   - Mechanical HDD (P90): 800ms realistic
   - Slow network + weak WiFi (P99): 1500ms acceptable

2. **Workspace Size Impact**
   - Small projects (< 100 files): P50 target
   - Medium projects (100-1000 files): P90 target
   - Monorepos (1000+ files): P99 target

3. **Machine Load**
   - Idle machine: P50 target
   - 10-20 tabs open: P90 target
   - Heavy load (100+ tabs, Docker running): P99 target

4. **Network Conditions**
   - Good network (MCP connects in 50ms): P50 target
   - Weak WiFi (MCP connects in 200ms): P90 target
   - Offline/timeout (MCP fails): P99 target

**Phase-Specific Target Adjustments:**

**Phase 2 (Storage): 652ms → 100ms (P50)**
- **Achievable:** Yes, if async parallel reads implemented
- **Risk:** Mechanical HDDs may only reach 200ms (P90)
- **Mitigation:** Profile on slow disk, set realistic P90 target
- **Expected reduction:** 550ms (P50), 450ms (P90), 250ms (P99)

**Pioneer Infrastructure: 578ms → 100ms (P50)**
- **Achievable:** Unknown - requires investigation first
- **Risk:** May contain unavoidable initialization (network, crypto, etc.)
- **Mitigation:** Break down into sub-components, defer optional parts
- **Expected reduction:** 470ms (P50), 380ms (P90), 180ms (P99) if 80% deferrable

**Escape Valves by Phase:**

**After Phase 1 (Quick Wins):**
- **If P50 > 1500ms:** Continue to Phase 2
- **If P90 > 1500ms:** Investigate blockers before Phase 2
- **If P50 < 1000ms:** Aggressive - continue full plan

**After Phase 2 (Lazy Loading):**
- **If P50 < 600ms:** Defer MCP + audit + onboarding
- **If P50 600-800ms:** Defer only MCP + onboarding, keep audit
- **If P50 > 800ms:** Defer only MCP, keep audit + onboarding

**After Phase 3 (Activation Refactor):**
- **If P50 < 500ms:** Full rollout to 100% users
- **If P50 500-800ms:** Rollout to 50% users, monitor P90
- **If P50 > 800ms:** Rollback, re-evaluate assumptions

**Probabilistic Success Definition:**

```typescript
// Success measured in aggregate, not per-activation
interface ActivationMetrics {
  p50: number; // 50th percentile
  p90: number; // 90th percentile
  p99: number; // 99th percentile
}

function evaluateSuccess(metrics: ActivationMetrics): 'success' | 'partial' | 'failure' {
  if (metrics.p50 < 500 && metrics.p90 < 800) {
    return 'success'; // Full rollout
  }

  if (metrics.p90 < 1000) {
    return 'partial'; // Gradual rollout, more optimization needed
  }

  return 'failure'; // Rollback, re-evaluate approach
}
```

**Real-World Testing Strategy:**

Test on representative user environments:

| Environment | Disk | Network | Load | Expected Percentile |
|-------------|------|---------|------|---------------------|
| MacBook Pro M1 | SSD | Gigabit | Idle | P10 (best case) |
| Windows Desktop | SSD | WiFi 5GHz | 20 tabs | P50 (typical) |
| MacBook Air Intel | SSD | WiFi 2.4GHz | 50 tabs | P75 (common) |
| Windows Laptop | HDD | Weak WiFi | 100 tabs | P90 (stress) |
| Linux VM | Network disk | VPN | Docker running | P99 (worst case) |

**Monitoring and Alerting:**

```typescript
// Collect activation time from all users
interface ActivationTelemetry {
  duration: number;
  environment: {
    platform: string;
    diskType: 'ssd' | 'hdd' | 'unknown';
    networkLatency: number;
    memoryUsage: number;
  };
}

// Alert if percentiles degrade
function checkRegressions(current: ActivationMetrics, baseline: ActivationMetrics) {
  if (current.p50 > baseline.p50 * 1.2) {
    alert('P50 activation time regressed by 20%');
  }

  if (current.p90 > baseline.p90 * 1.2) {
    alert('P90 activation time regressed by 20%');
  }
}
```
  asyncStorageLoading: boolean; // Expires 2026-02-17
  deferredEncryption: boolean; // Expires 2026-02-17
}

// Check flag with expiration
function shouldUseLazyMCP(): boolean {
  const expirationDate = new Date('2026-02-17');
  if (Date.now() > expirationDate.getTime()) {
    return true; // Always use new code after expiration
  }
  return flags.lazyMCPConnection;
}
```

**Flag Cleanup Schedule:**
- Week 8: Remove all infrastructure flags from code
- Week 9: Release new version with flags removed
- Week 10: Deprecate old version with flags

---

### Success Metrics

**Quantitative (Measured via Telemetry):**
- P50 activation time: < 500ms (stretch goal)
- P90 activation time: < 800ms (primary goal)
- P99 activation time: < 1500ms (acceptable)
- Error rate during activation: < 1%
- User churn post-upgrade: < 5%

**Qualitative (Measured via User Feedback):**
- User sentiment surveys: "Extension feels instant" > 80% agree
- Support tickets related to slow activation: < 5 per week
- User engagement with first-time features: > 50% try protection within 5 minutes

**Operational:**
- Zero process.exit() errors in production
- Cache hit ratio for protected files: > 95%
- MCP connection success rate: > 90% (within 100ms timeout)
- Audit completion rate: 100% (in background)

---

### Rollback Plan

**Rollback Triggers:**
1. P90 activation time > 2x baseline (> 4000ms)
2. Error rate during activation > 5%
3. User churn rate > 10% within 3 days of upgrade
4. Critical bugs (data loss, crashes) > 3 reports

**Rollback Procedure:**
1. **Immediate:** Revert deployment to previous version (< 15 minutes)
2. **Investigation:** Collect logs from affected users (1 hour)
3. **Root Cause Analysis:** Identify what failed (4 hours)
4. **Fix:** Implement fix and test (1-2 days)
5. **Re-deploy:** Canary rollout to 5% of users (restart Week 1)

**Partial Rollback:**
If only one optimization causes issues:
- Use infrastructure flag to disable specific optimization
- Keep other optimizations active
- Fix problematic optimization in isolation
- Re-enable once fixed

---

## Success Criteria

### Quantitative Metrics

- **Activation time:** < 500ms (P90)
- **Phase 2 (Storage):** < 100ms
- **Pioneer Infrastructure:** < 100ms
- **Protected files loaded:** Exactly 1 time during activation
- **Network calls during activation:** 0
- **Repo audit during activation:** 0
- **Process exit errors:** 0

### Qualitative Metrics

- Extension feels instant to users
- No blocking operations during activation
- Clean logs without noise or duplicates
- Graceful offline behavior
- Stable activation (no errors)

### User Experience Improvements

- Status bar appears immediately
- Commands available within 500ms
- First file protection feels fast
- No visible lag or jank
- Clear progress indicators for background tasks

---

## Risk Assessment and Mitigation

### Risk 1: Breaking Changes from Lazy Loading

**Risk:** Deferring service initialization may break code expecting services to exist immediately.

**Mitigation:**
- Comprehensive unit tests for each lazy service
- Use dependency injection to enforce initialization order
- Add runtime assertions for required services
- Gradual rollout with feature flags

### Risk 2: Offline Functionality Degradation

**Risk:** Deferring network services may break offline mode.

**Mitigation:**
- Implement proper offline detection
- Provide local fallbacks for all remote services
- Test offline scenarios explicitly
- Document offline capabilities

### Risk 3: User-Visible Behavior Changes

**Risk:** Deferring UI features may confuse users expecting immediate availability.

**Mitigation:**
- Show loading states for deferred features
- Use VS Code progress indicators
- Provide clear error messages if initialization fails
- Document expected behavior in release notes

### Risk 4: Performance Regression from Instrumentation

**Risk:** Adding extensive PERF probes may slow down activation.

**Mitigation:**
- Use lightweight timing (Date.now() vs. performance.mark())
- Make instrumentation optional via debug flag
- Measure instrumentation overhead separately
- Remove probes in production builds if needed

---

## Open Questions and Investigations Needed

1. **What is Pioneer Infrastructure?**
   - Request detailed breakdown of 578ms spent here
   - Identify which components are critical vs. optional
   - Determine if this is third-party dependency

2. **What causes 1080ms unaccounted gap?**
   - Use VS Code extension profiler to investigate
   - Add PERF probes around all suspected areas
   - Consider VS Code API call latency

3. **Why does repo audit fail without policy?**
   - Investigate dependency order
   - Determine if audit can gracefully skip when policy unavailable
   - Consider removing audit entirely if always fails

4. **What triggers process.exit() attempt?**
   - Add error context logging
   - Review main function error handling
   - Check test mode detection logic

5. **Is MCP connection always needed?**
   - Survey user usage patterns
   - Determine percentage of users using MCP features
   - Consider making MCP entirely optional

6. **Can encryption be optional?**
   - Survey users for encryption usage
   - Provide configuration to disable encryption
   - Implement encryption as plugin architecture

---

## Related Documentation References

- **VS Code Extension Activation Best Practices:** https://code.visualstudio.com/api/references/activation-events
- **VS Code Extension Performance:** https://code.visualstudio.com/api/advanced-topics/extension-performance
- **Result Type Pattern:** See `always-result-type-pattern.md` rule
- **Logging Standards:** See `decision-logging-observability.md` rule
- **Monorepo Import Patterns:** See `always-monorepo-imports.md` rule

---

## Appendix: Log Analysis Reference

### Key Log Lines for Investigation

| Line | Timestamp Offset | Event | Issue |
|------|------------------|-------|-------|
| 73-74 | +600ms | Protected files load #1 | Duplicate load |
| 75 | +675ms | MCP connection start | Network during activation |
| 102 | +702ms | Encryption service init | Expensive crypto |
| 103-104 | +703ms | Protected files load #2 | Duplicate load |
| 105 | +705ms | AI Risk Service init | Potential network |
| 173 | +1333ms | Repo audit #1 fails | Missing policy |
| 488 | +2088ms | Repo audit #2 fails | Missing policy |
| 669 | +2289ms | Policy loaded | After audits |
| 687 | +2307ms | AutoDecision activated 2x | Duplicate log |
| 898 | +2518ms | Protected files load #3-5 | Duplicate loads |

### Phase Budget Allocation (Target)

**Approach: Tiered Performance Targets**

Instead of absolute targets, use percentile-based success criteria that account for real-world variance:

| Phase | Current | P50 Target | P90 Target | P99 Target | Strategy |
|-------|---------|-----------|-----------|-----------|----------|
| Phase 1 (Services) | 0ms | 50ms | 80ms | 150ms | Minimal initialization |
| Phase 2 (Storage) | 652ms | 100ms | 200ms | 400ms | Async background |
| Phase 3 (Managers) | 28ms | 50ms | 80ms | 150ms | Lazy initialization |
| Phase 4 (Providers) | 3ms | 20ms | 40ms | 80ms | UI skeleton only |
| Phase 5 (Registration) | 1ms | 30ms | 60ms | 120ms | Critical commands only |
| Pioneer Infrastructure | 578ms | 100ms | 200ms | 400ms | Defer optional features |
| Unaccounted Gap | 1080ms | 150ms | 220ms | 500ms | Investigate if validated |
| **Total** | **2343ms** | **500ms** | **800ms** | **1500ms** | **Phased improvements** |

**Success Criteria:**
- **Primary Goal:** 90% of users (P90) activate in < 800ms
- **Stretch Goal:** 50% of users (P50) activate in < 500ms
- **Acceptable:** 99% of users (P99) activate in < 1500ms

**Rationale for Tiered Targets:**

1. **User Environment Variance**
   - Fast SSD (P50): 500ms achievable
   - Mechanical HDD (P90): 800ms realistic
   - Slow network + weak WiFi (P99): 1500ms acceptable

2. **Workspace Size Impact**
   - Small projects (< 100 files): P50 target
   - Medium projects (100-1000 files): P90 target
   - Monorepos (1000+ files): P99 target

3. **Machine Load**
   - Idle machine: P50 target
   - 10-20 tabs open: P90 target
   - Heavy load (100+ tabs, Docker running): P99 target

4. **Network Conditions**
   - Good network (MCP connects in 50ms): P50 target
   - Weak WiFi (MCP connects in 200ms): P90 target
   - Offline/timeout (MCP fails): P99 target

**Phase-Specific Target Adjustments:**

**Phase 2 (Storage): 652ms → 100ms (P50)**
- **Achievable:** Yes, if async parallel reads implemented
- **Risk:** Mechanical HDDs may only reach 200ms (P90)
- **Mitigation:** Profile on slow disk, set realistic P90 target
- **Expected reduction:** 550ms (P50), 450ms (P90), 250ms (P99)

**Pioneer Infrastructure: 578ms → 100ms (P50)**
- **Achievable:** Unknown - requires investigation first
- **Risk:** May contain unavoidable initialization (network, crypto, etc.)
- **Mitigation:** Break down into sub-components, defer optional parts
- **Expected reduction:** 470ms (P50), 380ms (P90), 180ms (P99) if 80% deferrable

**Escape Valves by Phase:**

**After Phase 1 (Quick Wins):**
- **If P50 > 1500ms:** Continue to Phase 2
- **If P90 > 1500ms:** Investigate blockers before Phase 2
- **If P50 < 1000ms:** Aggressive - continue full plan

**After Phase 2 (Lazy Loading):**
- **If P50 < 600ms:** Defer MCP + audit + onboarding
- **If P50 600-800ms:** Defer only MCP + onboarding, keep audit
- **If P50 > 800ms:** Defer only MCP, keep audit + onboarding

**After Phase 3 (Activation Refactor):**
- **If P50 < 500ms:** Full rollout to 100% users
- **If P50 500-800ms:** Rollout to 50% users, monitor P90
- **If P50 > 800ms:** Rollback, re-evaluate assumptions

**Probabilistic Success Definition:**

```typescript
// Success measured in aggregate, not per-activation
interface ActivationMetrics {
  p50: number; // 50th percentile
  p90: number; // 90th percentile
  p99: number; // 99th percentile
}

function evaluateSuccess(metrics: ActivationMetrics): 'success' | 'partial' | 'failure' {
  if (metrics.p50 < 500 && metrics.p90 < 800) {
    return 'success'; // Full rollout
  }

  if (metrics.p90 < 1000) {
    return 'partial'; // Gradual rollout, more optimization needed
  }

  return 'failure'; // Rollback, re-evaluate approach
}
```

**Real-World Testing Strategy:**

Test on representative user environments:

| Environment | Disk | Network | Load | Expected Percentile |
|-------------|------|---------|------|---------------------|
| MacBook Pro M1 | SSD | Gigabit | Idle | P10 (best case) |
| Windows Desktop | SSD | WiFi 5GHz | 20 tabs | P50 (typical) |
| MacBook Air Intel | SSD | WiFi 2.4GHz | 50 tabs | P75 (common) |
| Windows Laptop | HDD | Weak WiFi | 100 tabs | P90 (stress) |
| Linux VM | Network disk | VPN | Docker running | P99 (worst case) |

**Monitoring and Alerting:**

```typescript
// Collect activation time from all users
interface ActivationTelemetry {
  duration: number;
  environment: {
    platform: string;
    diskType: 'ssd' | 'hdd' | 'unknown';
    networkLatency: number;
    memoryUsage: number;
  };
}

// Alert if percentiles degrade
function checkRegressions(current: ActivationMetrics, baseline: ActivationMetrics) {
  if (current.p50 > baseline.p50 * 1.2) {
    alert('P50 activation time regressed by 20%');
  }

  if (current.p90 > baseline.p90 * 1.2) {
    alert('P90 activation time regressed by 20%');
  }
}
```
