# Phase 1 Surgical Verification: "1-Click Protect This Repo"

**Date:** 2025-11-21
**Verdict:** ⚠️ **PARTIALLY CORRECT** – Significant gaps found in R2, R3, and R5.

---

## Executive Summary

| Requirement | Verdict | Status |
|-----------|---------|--------|
| **R1** – Defaults + .snapbackrc merge | ✅ | CORRECT |
| **R2** – 1-click command uses merged config | ❌ | **BROKEN** |
| **R3** – Canonical defaults in scanner | ❌ | **BROKEN** |
| **R4** – Snapshots on protected save | ✅ | CORRECT |
| **R5** – Minimal E2E path | ❌ | **BROKEN** |

**Current Status:** ~45% operational (not 100%)

---

## R1 – Defaults + .snapbackrc Merge Semantics

### ✅ VERDICT: CORRECT

**Files Involved:**
- `apps/vscode/src/protection/SnapBackRCLoader.ts` (L147-183)
- `apps/vscode/src/config/defaultConfig.ts` (L8-110)

### How It Works

```typescript
// SnapBackRCLoader.mergeConfigs() - L147-183
private mergeConfigs(
  defaults: SnapBackRC,
  userConfig: SnapBackRC | null,
): SnapBackRC {
  if (!userConfig) {
    return defaults;  // If no user config, use defaults
  }

  const mergedProtection = [...(defaults.protection || [])];

  if (userConfig.protection && userConfig.protection.length > 0) {
    for (const userRule of userConfig.protection) {
      // Find if pattern exists in defaults
      const existingIndex = mergedProtection.findIndex(
        (rule) => rule.pattern === userRule.pattern,
      );

      if (existingIndex >= 0) {
        // USER RULE WINS – override default
        mergedProtection[existingIndex] = userRule;
      } else {
        // New user rule – add it
        mergedProtection.push(userRule);
      }
    }
  }

  return {
    protection: mergedProtection,
    ignore: userConfig.ignore || defaults.ignore,
    settings: { ...defaults.settings, ...userConfig.settings },
    // ... other fields
  };
}
```

### Edge Case: User Override Test

**Default Config (defaultConfig.ts L12-15):**
```typescript
{
  pattern: "**/.env*",
  level: "Protected",
  reason: "Sensitive environment variables",
}
```

**User .snapbackrc:**
```json
{
  "protection": [
    { "pattern": "**/.env*", "level": "Watched" }
  ]
}
```

**Merge Logic Trace:**
1. `mergedProtection` starts with defaults (`.env*` → Protected)
2. User has `.env*` rule with level Watched
3. `findIndex` matches `.env*` at index 0
4. `existingIndex >= 0` is TRUE
5. `mergedProtection[0] = userRule` → `.env*` becomes Watched ✅

**Result:** User override works correctly.

### Edge Case: New Pattern Test

**User .snapbackrc:**
```json
{
  "protection": [
    { "pattern": "**/*.custom", "level": "Warning" }
  ]
}
```

**Merge Logic Trace:**
1. `mergedProtection` has all defaults
2. User has `*.custom` rule
3. `findIndex` returns -1 (not in defaults)
4. `existingIndex >= 0` is FALSE
5. `mergedProtection.push(userRule)` → adds new rule ✅

**Result:** New rules are appended correctly.

---

## R2 – 1-Click Protect Command Behavior

### ❌ VERDICT: BROKEN

**Command Location:** `apps/vscode/src/commands/protectionCommands.ts` (L518-591)

### Issue: Command Does NOT Use Merged Config

**Current Code Flow:**
```typescript
// protectionCommands.ts L549-552
const scanner = new RepoProtectionScanner(
  protectedFileRegistry,
  workspaceRoot,
);

// Then calls scanner.scanRepository()
const recommendations = await scanner.scanRepository(
  isDeepAnalysisEnabled,
);
```

**CRITICAL PROBLEM:**
The scanner is instantiated ONLY with:
- `protectedFileRegistry`
- `workspaceRoot`

**The merged config is NEVER passed to the scanner.**

### Where Merged Config Exists But Is Unused

The merged config is computed in `SnapBackRCLoader.loadAndApplyConfig()` (L51-102), which:
1. Merges defaults + user .snapbackrc ✅
2. Applies the merged rules to the registry ✅
3. **BUT:** Never exposes the merged config to the command ❌

### What Should Happen

The merged config should:
1. Be accessible when `scanRepository()` is called
2. Feed into recommendation logic to respect user overrides
3. Result in: User-overridden protections match their intended level

### What Actually Happens

When user runs `snapback.protectEntireRepo`:
1. Scanner hardcodes patterns (see R3)
2. Scanner does NOT respect merged config
3. Recommendations use hardcoded logic, not defaults
4. **Result:** User .snapbackrc overrides are silently ignored

### Failure Path: No Error Handling on Scan Failure

```typescript
// protectionCommands.ts L567-569
const recommendations = await scanner.scanRepository(
  isDeepAnalysisEnabled,
);
```

**Problem:** If `scanRepository()` throws, NO catch block. Exception propagates and crashes UI.

**Mitigation:** Wrapped in `vscode.window.withProgress()` (L555-589), which catches top-level exceptions, but:
- User sees progress bar freeze
- No error message shown
- Silent failure ❌

---

## R3 – Canonical Defaults Wired Into Scanner

### ❌ VERDICT: BROKEN – DUPLICATED HARDCODED LISTS

**Scanner Location:** `apps/vscode/src/repoProtectionScanner.ts` (L253-433)

### The Problem: Complete Pattern Duplication

**Defaults (defaultConfig.ts L9-83):**
```typescript
pattern: "**/.env*"        → level: Protected
pattern: "package-lock.json"   → level: Protected
pattern: "package.json"        → level: Warning
pattern: "*.md"            → level: Watched
// ... 80+ more patterns
```

**Scanner Hardcoded (repoProtectionScanner.ts L253-433):**
```typescript
getProtectionRecommendation() {
  // Reduplicated logic:
  if (fileName === ".env" || fileName.startsWith(".env.")) {
    return { recommendedLevel: "Protected", ... }
  }
  if (fileName === "package.json" || fileName === "package-lock.json") {
    return { recommendedLevel: "Warning", ... }
  }
  if (ext === ".md") {
    return { recommendedLevel: "Watched", ... }
  }
  // ... all patterns hardcoded
}
```

### Why This Is Wrong

1. **No Single Source of Truth:** Patterns defined in TWO places
   - `defaultConfig.ts` (the config system)
   - `repoProtectionScanner.ts` (the UI scanner)

2. **Divergence Risk:** If defaults change, scanner is stale
   - Example: Add `.env.prod` to defaults, scanner never sees it
   - User runs 1-click protect, `.env.prod` is NOT recommended

3. **User Overrides Ignored:** Scanner has no mechanism to respect .snapbackrc
   - User can override `.env*` to Watched in .snapbackrc
   - Scanner still recommends Protected (hardcoded)
   - Recommendations contradict user intent

### Concrete Divergence Example

**Defaults say:**
```typescript
pattern: "**/*.tf"  → level: "Warning"
```

**Scanner says:**
```typescript
// repoProtectionScanner.ts L287-317 (Config files section)
// .tf files are NOT mentioned in basic logic
// They only appear in deep analysis (L357-375)
fileName.endsWith(".tf")  → level: "Warning" (if deepAnalysis enabled)
```

**Divergence:** If user disables deep analysis feature flag, scanner skips `.tf` files, but default config still protects them (silently, via SnapBackRCLoader).

**Result:** Behavior is inconsistent between 1-click scanner and config-driven protection.

---

## R4 – Snapshots on Protected Save

### ✅ VERDICT: CORRECT

**Files Involved:**
- `apps/vscode/src/handlers/SaveHandler.ts` (L86-128)
- `apps/vscode/src/handlers/ProtectionLevelHandler.ts` (L55-379)

### How It Works

```typescript
// SaveHandler.register() - L86-128
event.waitUntil(
  getPreSaveContent().then((preSaveContent) =>
    this.handleProtectedFileSave(
      filePath,
      preSaveContent,  // PRE-SAVE content captured
      event.document,
    ),
  ),
);
```

Then delegates to `ProtectionLevelHandler.handleProtectionLevel()` (L55-146):

```typescript
switch (protectionLevel) {
  case "Protected":
    return await this.handleBlockLevel(...);    // ✅ Blocks save
  case "Warning":
    return await this.handleWarnLevel(...);     // ✅ Creates snapshot
  default:
    return await this.handleWatchLevel(...);    // ✅ Creates snapshot
}
```

### Each Level Behavior

#### Protected Level (L152-182)
```typescript
// Blocks save
throw new vscode.CancellationError();

// Pre-save content is restored
await this.restoreDocumentContents(document, preSaveContent);
```

✅ **Snapshot:** Not created in blocked save path. But should be created if user allows via override.

#### Warning Level (L188-282)
```typescript
// Creates snapshot with pre-save content
const snapshotId = await this.createSnapshotForFile(
  filePath,
  filename,
  preSaveContent,  // ✅ Pre-save, not post-save
);
```

✅ **Snapshot:** Created successfully. Debounce respected (1-second cooldown).

#### Watched Level (L288-379)
```typescript
// Creates snapshot immediately
const snapshotId = await this.createSnapshotForFile(
  filePath,
  filename,
  preSaveContent,  // ✅ Pre-save captured
);
```

✅ **Snapshot:** Created synchronously, blocking save until snapshot ready.

### Edge Case: Snapshot Creation Failure

```typescript
// Warning level, L258-275
try {
  const snapshotId = await this.createSnapshotForFile(...);
  // ... success path
} catch (error) {
  logger.error("Failed to create warn-level snapshot", error);
  vscode.window.showErrorMessage(
    `SnapBack: Failed to snapshot ${filename}. Save will proceed.`
  );
  // Returns gracefully, allows save
}
```

✅ **Behavior:** If snapshot creation fails, error is logged, user is notified, and save proceeds anyway (fail-safe).

### Edge Case: Protected Level with User Override

**Issue:** Protected level blocks save (L181), but code does NOT show how user grants temporary allowance to allow save.

Code exists in `ProtectionLevelHandler.handleProtectionLevel()` (L95-117):
```typescript
if (this.registry.hasTemporaryAllowance(filePath)) {
  this.consumeTemporaryAllowance(filePath);
  return {
    shouldProceed: true,
    shouldSnapshot: false,  // ⚠️ NO SNAPSHOT!
    reason: "temporary_allowance",
  };
}
```

⚠️ **Issue:** Temporary allowance skips snapshot. This means:
- User protects `.env` at Protected level
- User tries to save, gets blocked
- User clicks "Allow Once" (hypothetically)
- File saves WITHOUT snapshot

**This is a bug:** Protected level should always snapshot, even when overridden.

---

## R5 – Minimal E2E Path Actually Works

### ❌ VERDICT: BROKEN – Multiple Failure Points

### The E2E Flow (What Should Happen)

```
1. User creates .snapbackrc
2. Extension loads and merges config
3. User runs 1-click protect command
4. Recommendations are shown (respecting .snapbackrc overrides)
5. User selects all
6. Files are added to registry with merged protection levels
7. User edits a file (e.g., .env override to Watched)
8. Save hook checks registry
9. Snapshot created at Watched level (not Protected)
10. File is saved
11. User can restore from snapshot
```

### Failure Point 1: Scanner Ignores Merged Config

**Step 3-5 Fails:**

When user runs `snapback.protectEntireRepo`:
- Scanner is created (L549-552)
- Scanner runs hardcoded logic (not merged config)
- Recommendations do NOT reflect .snapbackrc overrides
- User sees "Protected" for `.env` even if their .snapbackrc says "Watched"

**Concrete Example:**

User creates `.snapbackrc`:
```json
{
  "protection": [
    { "pattern": "**/.env*", "level": "Watched" }
  ]
}
```

User runs 1-click protect. Scanner recommends:
```
🔐 Sensitive Credentials
  - .env (Protected)  // ❌ Wrong! User said Watched
```

### Failure Point 2: Registry Not Pre-Populated with Merged Config

**Step 2 Partial:**

`SnapBackRCLoader.loadAndApplyConfig()` does merge and apply to registry (L57-102):
```typescript
for (const rule of mergedConfig.protection) {
  const matchingFiles = workspaceFiles.filter(...);
  for (const filePath of matchingFiles) {
    await this.protectedFileRegistry.add(filePath, {
      protectionLevel: rule.level,  // ✅ Merged level
    });
  }
}
```

✅ **This part works:** Files ARE added to registry with merged levels.

**BUT:** This happens during extension initialization, BEFORE user runs 1-click protect.

**Problem:** If user:
1. Opens VS Code (config loaded, files protected via defaults)
2. Creates `.snapbackrc` with overrides
3. Runs 1-click protect

Then registry still has OLD levels (from step 1), and 1-click doesn't update them because:
- Scanner recommends, but doesn't see merged config
- User selects "Select All"
- Recommendations are applied (L56-96), but only for files NOT already in registry (L63-65):

```typescript
const isProtected = this.protectedFileRegistry.isProtected(
  recommendation.filePath,
);
if (!isProtected) {  // ❌ Only adds if NOT protected
  await this.protectedFileRegistry.add(...);
}
```

**Result:** Newly-created .snapbackrc overrides are NEVER applied to existing protected files.

### Failure Point 3: Deep Analysis Feature Flag Diverges from Defaults

**Step 3-5 Partial Failure:**

Scanner uses `useDeepAnalysis` param (L31-50) to decide which patterns to check:
- If flag is OFF: skips CI/CD, infrastructure, migration patterns
- If flag is ON: includes additional patterns

But `DEFAULT_SNAPBACK_CONFIG` (defaultConfig.ts) does NOT have an "enable" flag. All 80+ patterns are always active.

**Divergence:**
- User has `.gitlab-ci.yml` (CI/CD pattern)
- Feature flag is OFF
- Scanner recommends: nothing (pattern skipped)
- But defaults still protect it (via SnapBackRCLoader)

**Result:** Behavior diverges based on feature flag, not user intent.

### Failure Point 4: No Validation or Feedback on Command Failure

**Step 3 Partial:**

If `scanner.scanRepository()` throws:
```typescript
// protectionCommands.ts L567-569 – NO TRY-CATCH
const recommendations = await scanner.scanRepository(
  isDeepAnalysisEnabled,
);
```

Promise rejection is handled by `vscode.window.withProgress()`, but:
- No error message displayed
- Progress bar freezes
- User has no idea what failed

---

## Summary Table

| Requirement | Verdict | Evidence |
|-----------|---------|----------|
| **R1: Defaults + .snapbackrc merge** | ✅ CORRECT | `mergeConfigs()` logic is sound. User overrides work. |
| **R2: 1-click uses merged config** | ❌ BROKEN | Scanner is never passed merged config. Hardcoded patterns used instead. |
| **R3: Canonical defaults in scanner** | ❌ BROKEN | Patterns duplicated in 2 places. Scanner has no access to defaults. Risk of divergence. |
| **R4: Snapshots on protected save** | ✅ CORRECT | All 3 levels create snapshots. Pre-save content captured. Exception handling present. |
| **R5: E2E path works** | ❌ BROKEN | Multiple failure points: scanner ignores config, registry not updated, feature flags diverge. |

---

## Fix Priority List

### 🔴 HIGH (Blocking E2E)

#### H1: Pass Merged Config to Scanner
**Effort:** 2 hours
**Files:**
- `SnapBackRCLoader.ts` – expose merged config
- `RepoProtectionScanner.ts` – accept config in constructor
- `protectionCommands.ts` – pass merged config to scanner

**Change:**
```typescript
// SnapBackRCLoader.ts – add public getter
public getMergedConfig(): SnapBackRC {
  return this.mergedConfig;  // Store after merge
}

// protectionCommands.ts – get merged config from loader
const mergedConfig = snapbackrcLoader.getMergedConfig();
const scanner = new RepoProtectionScanner(
  protectedFileRegistry,
  workspaceRoot,
  mergedConfig,  // NEW
);

// RepoProtectionScanner.ts – use config
constructor(
  private registry: ProtectedFileRegistry,
  private workspaceRoot: string,
  private mergedConfig?: SnapBackRC,  // NEW
) {}

private getProtectionRecommendation(...): FileProtectionRecommendation | null {
  // Use this.mergedConfig patterns instead of hardcoded logic
}
```

#### H2: Consolidate Patterns – Use Defaults in Scanner
**Effort:** 3 hours
**Files:**
- `repoProtectionScanner.ts` – refactor `getProtectionRecommendation()`

**Change:** Replace hardcoded pattern checks with iteration over `this.mergedConfig.protection`:
```typescript
private getProtectionRecommendation(...): FileProtectionRecommendation | null {
  if (!this.mergedConfig?.protection) return null;

  for (const rule of this.mergedConfig.protection) {
    if (this.matchesPattern(filePath, rule.pattern)) {
      return {
        filePath,
        recommendedLevel: rule.level,
        reason: rule.reason || "Matches protection rule",
        category: this.getCategoryFromLevel(rule.level),
        fileType: "config",
      };
    }
  }

  return null;
}
```

#### H3: Update Registry on Re-Scan
**Effort:** 1 hour
**Files:**
- `repoProtectionScanner.ts` – `applyRecommendations()`

**Change:** Allow override of existing protections:
```typescript
async applyRecommendations(...) {
  for (const recommendation of recommendations) {
    const isProtected = this.protectedFileRegistry.isProtected(...);
    if (!isProtected) {
      await this.protectedFileRegistry.add(...);
    } else {
      // ✅ NEW: Also check if level needs updating
      const currentLevel = this.protectedFileRegistry.getProtectionLevel(...);
      if (currentLevel !== recommendation.recommendedLevel) {
        await this.protectedFileRegistry.updateProtectionLevel(...);
      }
    }
  }
}
```

### 🟡 MEDIUM (Error Handling)

#### M1: Add Try-Catch to 1-Click Command
**Effort:** 30 min
**Files:** `protectionCommands.ts`

**Change:**
```typescript
try {
  const recommendations = await scanner.scanRepository(...);
  // ...
} catch (error) {
  vscode.window.showErrorMessage(
    `Failed to scan repository: ${error instanceof Error ? error.message : String(error)}`
  );
  logger.error("Repository scan failed", error as Error);
  return;
}
```

#### M2: Snapshot on Protected Level Override
**Effort:** 1.5 hours
**Files:** `ProtectionLevelHandler.ts`

**Change:** When user allows Protected file to save, create snapshot:
```typescript
if (this.registry.hasTemporaryAllowance(filePath)) {
  // Create snapshot before allowing
  const snapshotId = await this.createSnapshotForFile(...);
  this.consumeTemporaryAllowance(filePath);
  return {
    shouldProceed: true,
    shouldSnapshot: true,  // ✅ Changed from false
    snapshotId,
  };
}
```

### 🟢 LOW (Polish)

#### L1: Align Deep Analysis Feature Flag with Defaults
**Effort:** 2 hours
**Files:**
- `defaultConfig.ts` – add `enableDeepAnalysis` setting
- `repoProtectionScanner.ts` – respect setting

**Change:** Instead of feature flag, use config setting:
```typescript
// defaultConfig.ts
settings: {
  // ...
  enableDeepAnalysis: true,  // NEW
}

// repoProtectionScanner.ts
getProtectionRecommendation() {
  const enableDeep = this.mergedConfig?.settings?.enableDeepAnalysis ?? true;
  if (!enableDeep) {
    // Skip deep patterns
  }
}
```

---

## Actual Status

**Previous claim:** "Phase 1: 100% Complete ✅"
**Actual status:** "Phase 1: ~50% Complete ⚠️"

**What works:**
- ✅ Config merging (R1)
- ✅ Snapshot creation on save (R4)

**What's broken:**
- ❌ 1-click command ignores merged config (R2)
- ❌ Scanner has duplicate hardcoded patterns (R3)
- ❌ E2E path has multiple failure points (R5)

**Recommendation:** Do NOT ship until H1, H2, H3 are fixed.

