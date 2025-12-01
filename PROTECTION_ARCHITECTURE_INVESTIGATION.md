# SnapBack "Protect This Repo" System - Architecture Investigation Report

**Investigation Date:** November 2025
**Scope:** VS Code Extension (`apps/vscode/src`)
**Methodology:** Codebase analysis using VS Code API best practices and Architecture Reference Model

---

## Executive Summary

This report documents the current state of SnapBack's "Protect This Repo" protection model as of Phase 1 completion. The system demonstrates solid foundational work with clear protection level semantics and configuration merging logic. However, several architectural patterns remain implicit rather than explicit, creating coupling that will impact Phase 2 development (stack detection and AI risk integration).

**Key Finding:** The system is **transaction-ready** for Phase 2 but requires minimal **service-layer abstraction** to reduce coupling and enable clean feature insertion.

---

## Part 1: Current-State Map

### 1. Protection Level Model

#### Current Implementation

**File:** `/src/types/protection.ts` and `/src/views/types.ts`

```typescript
// Type definition
export type ProtectionLevel = "Watched" | "Warning" | "Protected";

// Metadata (for UI rendering)
export const PROTECTION_LEVELS: Record<ProtectionLevel, ProtectionLevelMetadata> = {
  Watched: { icon: "🟢", label: "Watch", description: "Silent auto-snapshot on save", ... },
  Warning: { icon: "🟡", label: "Warn", description: "Notify before save with options", ... },
  Protected: { icon: "🔴", label: "Block", description: "Require snapshot or explicit override", ... }
};
```

#### Semantics Across the System

| Component | Level Handling | Reference |
|-----------|---|-----------|
| **Registry Storage** | Stored in `ProtectedFileEntry.protectionLevel` (ProtectionLevel type) | `protectedFileRegistry.ts:86` |
| **Config (RC File)** | Defined in `SnapBackRC.protection[].level` (ProtectionLevel type) | `snapbackrc.types.ts:17` |
| **Save Handler** | Switch statement on `protectionLevel` → handler delegation | `ProtectionLevelHandler.ts:159-184` |
| **Commands** | Quick pick UI with icons and descriptions from metadata | `protectionCommands.ts:159-163` |
| **Status Bar** | Counts files by level (`watchCount`, `warnCount`, `blockCount`) | `statusBarCommands.ts:53-59` |

#### Legacy Mapping Analysis

**Status:** ✅ **PRESENT but IMPLICIT, not centralized**

- No formal enum or mapping layer
- String literals are the source of truth
- Levels are used consistently across codebase
- **Coupling point:** UI labels (e.g., "Watch", "Block") hardcoded in metadata object; changing one requires updating PROTECTION_LEVELS in two locations

#### Inconsistencies Detected

1. **In `policy.types.ts`:** Uses lowercase `"watch" | "warn" | "block" | "unprotected"` for overrides (line 20)
   - Conflicts with canonical `"Watched" | "Warning" | "Protected"` in protection.ts
   - **Risk:** Potential for mismatch if policy system is integrated without explicit mapping

2. **Save handler switch default:** Treats undefined/missing level as "Watched" (line 62 of ProtectionLevelHandler.ts)
   - Not explicitly documented as semantic behavior

### 2. Config & Policy

#### Configuration Loading Path

```
Disk (.snapbackrc)
    ↓
SnapBackRCLoader.readConfig()
    ↓
Merge with defaults: SnapBackRCLoader.mergeConfigs()
    ↓
Merged SnapBackRC object
    ↓
Apply to registry: protectedFileRegistry.add() per matching file
```

**Files Involved:**

| File | Responsibility |
|------|---|
| `protection/SnapBackRCLoader.ts` | Load, parse, merge, watch for changes |
| `protection/ProtectionConfigManager.ts` | Alternative: legacy config file manager (parallel system) |
| `config/defaultConfig.ts` | Canonical defaults (referenced but not fully examined) |
| `types/snapbackrc.types.ts` | Type definitions for user config |

#### Merge Logic Detail

**File:** `SnapBackRCLoader.ts:150-186` (mergeConfigs method)

```typescript
private mergeConfigs(defaults: SnapBackRC, userConfig: SnapBackRC | null): SnapBackRC {
  // 1. Start with defaults
  const mergedProtection = [...(defaults.protection || [])];

  // 2. User rules override by pattern match
  if (userConfig.protection && userConfig.protection.length > 0) {
    for (const userRule of userConfig.protection) {
      const existingIndex = mergedProtection.findIndex(r => r.pattern === userRule.pattern);
      if (existingIndex >= 0) {
        mergedProtection[existingIndex] = userRule;  // Override
      } else {
        mergedProtection.push(userRule);  // Add new
      }
    }
  }

  // 3. Settings merged (user extends/overrides defaults)
  return {
    protection: mergedProtection,
    ignore: userConfig.ignore || defaults.ignore,
    settings: { ...defaults.settings, ...userConfig.settings },
    // ...
  };
}
```

**Precedence Rules:**
1. Default protection rules are base layer
2. User .snapbackrc **overrides by pattern** (matching pattern replaces entire rule)
3. Settings use shallow merge (user settings override defaults)

#### Effective Policy Representation

**Status:** ✅ **EXISTS but IMPLICIT**

- **Explicit:** `SnapBackRC` type defines structure (protection array, settings, policies, etc.)
- **Implicit:** No single "EffectivePolicy" object after merge
- **Application:** Rules are applied directly to registry; no intermediate policy object created

**Missing:**
- No "policy version" or "policy metadata" tracking
- No "policy precedence" or "policy audit trail"
- Merged config stored in `this.mergedConfig` but not exposed via public getter with guarantees

#### Config Versioning

**Status:** ✅ **SCHEMA ONLY**

- `policy.types.ts` defines `version: "1.0"` as required field
- No versioning in actual `.snapbackrc` type (SnapBackRC.ts)
- **Gap:** Migration path for future config schema changes not defined

### 3. Registry, Manager, and Service Layers

#### ProtectedFileRegistry

**File:** `services/protectedFileRegistry.ts`

**Role:** Central state container for protected files

**Key Methods:**
```typescript
isProtected(filePath: string): boolean        // O(1) lookup via index
getProtectionLevel(filePath: string): ProtectionLevel | undefined
add(path, options?: { protectionLevel?: ProtectionLevel }): Promise<void>
remove(path: string): Promise<void>
updateProtectionLevel(path: string, level: ProtectionLevel): Promise<void>
hasTemporaryAllowance(filePath: string): boolean
setTemporaryAllowance(filePath: string, durationMs?: number): Promise<void>
consumeTemporaryAllowance(filePath: string): void
list(): Promise<ProtectedFileEntry[]>
```

**Storage:** VS Code `Memento` + file system persistence + O(1) in-memory index

#### Manager/Service Pattern Analysis

**Current Layering:**

```
┌─────────────────────────────────────────┐
│  VS Code Commands (protectionCommands)  │  ← Direct registry calls
│  - snapback.protectFile                 │
│  - snapback.setWatchLevel               │
│  - snapback.protectEntireRepo           │
└──────────────┬──────────────────────────┘
               │
               ↓ Direct calls
┌──────────────────────────────────────────┐
│  ProtectedFileRegistry                  │  ← Single source of truth
│  - Stores protection levels              │
│  - Persists to Memento                   │
│  - Maintains O(1) lookup index          │
└──────────────────────────────────────────┘
               ↑
               │ Direct access
┌──────────────┴──────────────────────────┐
│  Save Handler (SaveHandler)             │  ← Implements protection logic
│  - Reads level from registry             │
│  - Executes level-specific behavior     │
│  - Records audit trail                   │
└──────────────────────────────────────────┘
```

**Missing Abstractions:**

1. **ProtectionManager** (or similar facade)
   - Would encapsulate: "compute protection status across repo"
   - Would provide: repo-level analytics (total protected, coverage %)
   - **Current Gap:** No single place to ask "what's the repo protection status?"

2. **ProtectionService** (vs raw registry)
   - Would encapsulate: policy application logic
   - Would provide: level-based behavior execution
   - **Current Gap:** `ProtectionLevelHandler` handles level logic, but orchestration is scattered

3. **ProtectionPolicy** object
   - Would represent: merged effective policy
   - Would track: provenance, version, metadata
   - **Current Gap:** Merged config exists in `SnapBackRCLoader.mergedConfig` but is opaque

#### Direct Coupling Points

**Commands → Registry:**
- `protectionCommands.ts:172` - `protectedFileRegistry.add(filePath, { protectionLevel })`
- `protectionCommands.ts:293` - `protectedFileRegistry.remove(fileUri.fsPath)`
- **Risk for Phase 2:** New stack/AI rules need to insert before registry calls

**Save Handler → Registry:**
- `SaveHandler.ts:91` - `this.registry.isProtected(filePath)`
- `ProtectionLevelHandler.ts:62` - `this.registry.getProtectionLevel(filePath)`
- **Risk for Phase 2:** Protection level logic might need to consult policy/stack info first

**Views → Registry:**
- `statusBarCommands.ts:243-247` - Direct filtering by protection level
- **Risk for Phase 2:** New "protection status" might require re-computing, not just reading

### 4. Protect Repo Command & Audit Behavior

#### snapback.protectEntireRepo Command

**File:** `commands/protectionCommands.ts:518-604`

**Current Behavior:**

```typescript
// 1. Check feature flag for deep analysis
const isDeepAnalysisEnabled = await featureFlagService.isFeatureEnabled(
  userId, "risk.deep_analysis"
);

// 2. Load merged config from SnapBackRCLoader
const mergedConfig = snapbackrcLoader.getMergedConfig();

// 3. Create scanner with merged config
const scanner = new RepoProtectionScanner(
  protectedFileRegistry,
  workspaceRoot,
  mergedConfig || undefined
);

// 4. Run scan (with or without deep analysis)
const recommendations = await scanner.scanRepository(isDeepAnalysisEnabled);

// 5. Show QuickPick for user selection
await scanner.showRecommendationsQuickPick(recommendations);

// 6. Apply selected recommendations
// (applyRecommendations internally calls protectedFileRegistry.add)

// 7. Refresh views
refreshViews();
```

**Recommendation Workflow:**

**File:** `repoProtectionScanner.ts:34-54`

```typescript
async scanRepository(useDeepAnalysis: boolean = false): Promise<FileProtectionRecommendation[]> {
  // 1. Get all workspace files
  const files = await this.getAllWorkspaceFiles();

  // 2. Categorize & recommend for each file
  for (const file of files) {
    const recommendation = this.getProtectionRecommendation(file, useDeepAnalysis);
    if (recommendation) {
      recommendations.push(recommendation);
    }
  }

  return recommendations;
}
```

#### Current Audit/Status Capabilities

**What Exists:**

| Feature | File | Status |
|---------|------|--------|
| Save-level audit trail | `handlers/AuditLogger.ts` | ✅ Per-save logging |
| Cooldown tracking | `handlers/CooldownService.ts` | ✅ Prevents rapid re-saves |
| Repo-level protection count | `statusBarCommands.ts:53-59` | ✅ Count by level |
| Repo scan recommendations | `repoProtectionScanner.ts` | ✅ Pattern-based analysis |

**What's Missing:**

| Gap | Impact | Severity |
|-----|--------|----------|
| No "protection status" enum (unprotected/partial/complete/error) | Can't report repo-level state | HIGH |
| No "audit trail" for config changes | Can't track who changed protection rules | MEDIUM |
| No "at-risk files" list (AI, missing snapshots, etc.) | Can't surface "needs attention" items | HIGH |
| No VS Code context keys for protection status | Can't update UI conditionally on repo status | HIGH |

#### VS Code Context Keys Update

**File:** `contextManager.ts`

```typescript
// Updates on active file change or protection status change:
"snapback.isProtected" = boolean
"snapback.currentLevel" = ProtectionLevel | undefined
"snapback.canProtect" = boolean
```

**Missing Context Keys:**

For Phase 2 target "status strip + attention list":
```typescript
"snapback.protectionStatus" = "unprotected" | "partial" | "complete" | "error"
"snapback.attentionCount" = number
"snapback.hasUnprotectedCriticalFiles" = boolean
```

### 5. Stack Detection & Profiles

#### Current Stack Detection

**Location:** `repoProtectionScanner.ts:200-260` (getAllWorkspaceFiles + pattern matching)

**Heuristics Detected:**

```typescript
// File pattern categories (in getProtectionRecommendation):
Critical Files: package.json, .env, tsconfig.json, Dockerfile, etc.
Configuration: *.config.* files, *.yaml, *.yml
Database: *.sql, migrations/*, schemas/*
Testing: *.test.ts, *.spec.ts
Build: webpack.config.js, rollup.config.js, vite.config.js
```

**File:** `repoProtectionScanner.ts` lines 250-350 (recommend logic excerpt)

```typescript
private getProtectionRecommendation(filePath: string, useDeepAnalysis: boolean): FileProtectionRecommendation | null {
  // Inline category detection:
  let category = "Other";
  let fileType = "unknown";

  if (filePath.includes("package.json")) {
    category = "Package Manager";
    fileType = "critical";
    recommendedLevel = "Protected";  // Block level
  } else if (filePath.match(/\.env(\.[a-z]+)?$/)) {
    category = "Environment";
    fileType = "secret";
    recommendedLevel = "Protected";  // Block level
  } else if (filePath.endsWith("Dockerfile")) {
    category = "Infrastructure";
    fileType = "infra";
    recommendedLevel = "Warning";    // Warn level
  }
  // ... more hardcoded patterns
}
```

#### Stack Profile Infrastructure

**Status:** ❌ **NOT PRESENT**

**Missing Components:**

1. **StackProfile data model**
   ```typescript
   // Would look like:
   interface StackProfile {
     id: string;                    // "nextjs", "python-poetry"
     name: string;                  // Display name
     detect: string[];              // Glob patterns or heuristics
     protect: ProtectionRule[];     // Recommended protection rules
   }
   ```

2. **Stack detection function**
   ```typescript
   // Would be something like:
   function detectStacks(workspaceRoot: string): Promise<StackProfile[]>
   ```

3. **Registry of known profiles**
   - Currently: hardcoded in `getProtectionRecommendation`
   - Future: data-driven via `STACK_PROFILES` constant

#### Phase 2 Insertion Point

**Recommended Location:** New file `/src/stacks/stackDetection.ts`
- Keep pattern matching logic separate
- Define StackProfile interface
- Create detectStacks() function
- Reference from repoProtectionScanner on demand

### 6. AI Risk System

#### Current AI-Related Code

**Minimal Presence:**

| File | Code | Status |
|------|------|--------|
| `ai/copilot/intercept.ts` | Watches Copilot interactions | 🟡 Stub |
| `ai/fs/agentWatcher.ts` | Watches file system for AI patterns | 🟡 Stub |
| `handlers/AnalysisCoordinator.ts` | Calls risk API and publishes diagnostics | ✅ Functional |

#### Risk Analysis Integration

**File:** `handlers/AnalysisCoordinator.ts`

Currently bridges to API risk analysis:

```typescript
// Calls external API for risk analysis
const analysis = await fetch(`${baseUrl}/api/risk/analyze`, {
  method: "POST",
  body: JSON.stringify({
    filePath,
    before: preSaveContent,
    after: document.getText(),
    category: determineCategory(filePath)
  })
});

// Publishes diagnostics based on result
if (analysis.diagnostics?.length > 0) {
  this.diagnosticCollection.set(uri, analysis.diagnostics);
}
```

**API Risk Data Model (from API codebase):**

```typescript
// From apps/api/modules/risk/procedures/analyze-risk.ts
export interface RiskAnalysis {
  riskLevel: "low" | "medium" | "high";
  riskScore: number;              // 0-100
  riskFactors: string[];
  summary: string;
  diagnostics?: Diagnostic[];     // VS Code diagnostic objects
}
```

#### Missing AI Risk Infrastructure

**In VS Code Extension:**

1. **No AIRiskService interface**
   ```typescript
   interface AIRiskService {
     assessChange(input: {
       filePath: string;
       before: string;
       after: string;
       category: FileCategory;
     }): Promise<AIRiskAssessment>;
   }
   ```

2. **No risk-based gating**
   - Risk score doesn't block saves (only shows diagnostics)
   - No "AI risk threshold" config
   - No per-level risk thresholds (e.g., Block level requires low risk OR user override)

3. **No caching/optimization**
   - Every save triggers API call (if enabled)
   - No client-side risk detection fallback

#### Configuration Flags

**Existing** (in package.json):

```json
"snapback.guardian.enabled": boolean,
"snapback.guardian.protectionLevel": "none" | "warn" | "block",
"snapback.guardian.thresholds.warn": number,
"snapback.guardian.thresholds.block": number
```

**Assessment:** Flags exist but are **not fully wired** into extension behavior

### 7. VS Code UX & Context

#### Current UI Architecture

**Configuration Points:**

**File:** `package.json` (contributes section)

1. **Views (Sidebar panels)**
   ```json
   "views": {
     "snapback": [
       { "id": "snapback.main", "name": "Snapshots", "when": "snapback.isActive" }
     ],
     "explorer": [
       { "id": "snapback.protectedFiles", "name": "SnapBack Protected Files", ... },
       { "id": "snapbackExplorer", "name": "SnapBack Workspace", ... }
     ]
   }
   ```

2. **Context Menus**
   ```json
   "menus": {
     "explorer/context": [...],        // Right-click in file explorer
     "editor/context": [...],           // Right-click in editor
     "view/item/context": [...],        // Right-click in tree view
     "view/title": [...]                // Title bar buttons
   }
   ```

3. **Commands (41 total)**
   - `snapback.protectFile` - Main protection command
   - `snapback.setWatchLevel`, `setWarnLevel`, `setBlockLevel` - Quick protection
   - `snapback.showStatus` - Show protection status
   - `snapback.protectEntireRepo` - Scan & recommend
   - Many snapshot-related commands

#### Current UX Surfaces

**Protection-Related:**

1. **Status Bar**
   - Shows file count: "🧢 X files protected"
   - Command on click: `snapback.showStatus`

2. **Protected Files View** (in Explorer sidebar)
   - Tree showing all protected files
   - Grouped by protection level
   - Actions: protect/unprotect, change level, snapshot, restore

3. **Status Command** (`snapback.showStatus`)
   **File:** `commands/statusBarCommands.ts:32-234`
   - Shows protection level breakdown (🟢 Watch, 🟡 Warn, 🔴 Block counts)
   - Drill-down: view files at each level
   - Quick actions: protect current file, refresh, settings, docs

#### Gap Analysis vs Target UX

**Target (from design spec):**
```
├─ View Title: "Protect This Repo" button with dynamic label based on status
├─ Status Strip: "Protection: X/Y files (partial)"
├─ Attention List: "Needs Review" files
│  ├─ Unprotected critical files
│  ├─ AI-risky files
│  └─ Missing recent snapshots
└─ Full Protected Files List
```

**Current:**
```
├─ Status Bar: File count only
├─ Dedicated View: Protected files tree (in sidebar)
├─ Status Command: Breakdown + drilldown (OK but not in view title)
└─ No explicit "Attention" section
```

**Missing for Phase 2:**
- View title button that reflects repo status
- "Needs Attention" items section in view
- Dynamic status label based on protection audit
- AI risk items integrated with protection items

### 8. Test Coverage

#### Test Infrastructure

**Location:** `/test/`, `/test/unit/`, `/test/integration/`, `/test/e2e/`

**Test Framework:** Vitest + Playwright (for E2E)

#### Coverage by Area

| Area | Test Files | Coverage |
|------|-----------|----------|
| ProtectedFileRegistry | `test/unit/services/protectedFileRegistry.test.ts` | ✅ Good |
| SnapBackRC Loading | `test/unit/protection/snapbackrc.test.ts` | ✅ Good |
| Protection Commands | `test/unit/commands/protectionCommands.test.ts` | ✅ Partial |
| SaveHandler | `test/unit/handlers/SaveHandler.test.ts` | ✅ Good |
| ProtectionLevelHandler | `test/unit/handlers/ProtectionLevelHandler.test.ts` | ✅ Partial |
| RepoProtectionScanner | (Not found - likely missing) | ❌ LOW |
| AnalysisCoordinator | (Not found - likely missing) | ❌ LOW |
| ContextManager | (Not found - likely missing) | ❌ LOW |

#### Test Utilities

**Good Helpers Exist:**
- Mock ProtectedFileRegistry
- Mock VS Code ExtensionContext
- Fake file system watchers
- Mock memento storage

**Missing Helpers for Phase 2:**
- Mock ProtectionPolicy
- Mock StackProfile system
- Mock AIRiskService
- Repo-level status assertions

---

## Part 2: Gap Analysis vs Target Architecture

### 2.1 Protection Level Model

#### Alignment

✅ **String literal types are clean and semantic**
- Source of truth is clear (protection.ts)
- Metadata provides UI rendering hints

✅ **Handling is consistent across codebase**
- Switch statements work correctly
- No type mismatches in hot paths

#### Divergence

⚠️ **No explicit legacy mapping layer**
- Policy system uses lowercase (`"watch" | "warn" | "block"`)
- Risk assessment might use different conventions
- **Phase 2 Risk:** Integration point between systems needs mapping

⚠️ **Metadata and type live in different files**
- `protection.ts` defines type
- `views/types.ts` duplicates metadata
- **Phase 2 Risk:** Changes require updating both files

### 2.2 Config & Policy

#### Alignment

✅ **Clear precedence: defaults < user config**
- Merge logic is explicit
- Pattern-based override is working

✅ **Config loading is automatic & silent**
- File watcher triggers reload
- No interruptions unless errors occur

#### Divergence

⚠️ **No "ProtectionPolicy" object after merge**
- Merged config exists but is not exposed with contract
- Registry receives rules directly without policy wrapper

⚠️ **No version tracking or migration support**
- Can't distinguish config versions at runtime
- No way to show what rules came from where

⚠️ **Stack-specific rules not separated**
- All rules live in single array
- No way to enable/disable stack profiles

### 2.3 Registry & Managers

#### Alignment

✅ **ProtectedFileRegistry is correct single source of truth**
- O(1) lookup via index
- Proper persistence via Memento

✅ **Protection level logic is isolated** (ProtectionLevelHandler)
- Switch statement handles level semantics
- Temporary allowances work correctly

#### Divergence

⚠️ **No service facade pattern** (HIGH IMPACT)
- Commands call registry directly
- No "ProtectionService" to mediate
- **Phase 2 Impact:** Stack/AI rules need to insert decision logic BEFORE registry operations

⚠️ **No "ProtectionManager"** for repo-level operations
- Can't ask "what's the repo protection status?"
- Status computation happens in multiple places
- **Phase 2 Impact:** Audit computation will be scattered

⚠️ **No policy object after merge**
- No place to ask "what rules are currently active?"
- No place to track "which rule matched this file?"

### 2.4 Protect Repo Command

#### Alignment

✅ **Repo scan command exists and is functional**
- Pattern-based recommendations work
- User-selected application prevents over-protection

✅ **Integration with .snapbackrc config**
- Merged config passed to scanner
- Existing rules respected

#### Divergence

⚠️ **No comprehensive "audit" result** (HIGH IMPACT)
- Scanner provides recommendations but not status
- Can't compute "files still unprotected"
- **Phase 2 Impact:** Status audit will need separate implementation

⚠️ **No context keys for repo status**
- Can't conditionally show "Protect This Repo" button
- Can't show attention count in UI

⚠️ **Stack profiles hardcoded in scanner**
- Pattern recommendations baked into getProtectionRecommendation()
- Can't enable/disable stacks independently

### 2.5 Stack Detection

#### Alignment

✅ **Basic pattern matching works well**
- File type detection functions
- Categorization logic is clear

#### Divergence

⚠️ **No StackProfile data model**
- Heuristics are inline code, not data
- Can't reuse or extend without code changes

⚠️ **No stack detection function**
- Can't call "detectStacks(workspaceRoot)" to get active stacks
- Can't show user which stacks were detected

⚠️ **No registry of profiles**
- No way to enable/disable stacks
- No way to add custom stacks

### 2.6 AI Risk System

#### Alignment

✅ **API risk analysis integration exists**
- Calls external service correctly
- Publishes diagnostics to VS Code

#### Divergence

❌ **No AIRiskService interface** (CRITICAL GAP)
- Risk detection is API-only
- No local fallback or default implementation
- Can't mock for testing

❌ **No risk-based gating**
- High-risk changes don't block saves
- No enforcement of "AI risk thresholds"
- Config flags exist but unused

❌ **No caching or optimization**
- Every save triggers potential API call
- Network errors fail open (no offline fallback)

### 2.7 VS Code UX & Context

#### Alignment

✅ **Package.json contributions are comprehensive**
- Commands are well-defined
- Context menus are logical
- View containers exist

✅ **Basic status display works**
- Status bar shows file count
- Status command provides breakdown

#### Divergence

⚠️ **No view title dynamic state**
- Button label doesn't change with protection status
- Can't show "Protect This Repo" prominence

⚠️ **No "attention" section**
- No explicit "Needs Review" items
- Risk items not integrated with protection view

⚠️ **Context keys are file-level only**
- No repo-level context keys for conditional UI
- Can't hide/show repo-scan button based on status

### 2.8 Tests

#### Alignment

✅ **Core functionality has test coverage**
- Registry operations tested
- Config loading tested
- Command behavior tested

#### Divergence

⚠️ **Scanner and analyzer lack tests**
- RepoProtectionScanner not found in test suite
- AnalysisCoordinator not thoroughly tested
- **Phase 2 Risk:** New stack/AI logic will have no test baseline

⚠️ **No repo-level status assertion helpers**
- Can't write: `expect(repoStatus.unprotectedCriticalFiles).toEqual([])`
- Will need new test utilities for Phase 2

---

## Part 3: Phase 2 Readiness Notes

### Best Insertion Points for Phase 2 Components

#### 1. ProtectionLevel Enum + Mapping Layer

**Recommended Location:** `/src/types/protectionLevel.ts` (new file)

**Why this location:**
- Separate from current "views/types.ts" which mixes UI metadata
- Clean import path: `import { ProtectionLevel, mapLegacyLevel } from "@/types/protectionLevel"`

**Insertion Pattern:**
```typescript
// New file: types/protectionLevel.ts
export enum ProtectionLevel {
  Checkpoint = 1,   // Legacy "Watched"
  Guarded = 2,      // Legacy "Warning"
  Strict = 3,       // Legacy "Protected"
  Unprotected = 0
}

export function mapLegacyLevel(legacy: "Watched" | "Warning" | "Protected"): ProtectionLevel {
  return { Watched: 1, Warning: 2, Protected: 3 }[legacy];
}

export function mapToLegacy(level: ProtectionLevel): "Watched" | "Warning" | "Protected" {
  return ["Protected", "Checkpoint", "Guarded", "Strict"][level];
}
```

**Safe Starting Slice:**
1. Create new file (no changes to existing code)
2. Update type imports to support both old and new
3. Mapping layer makes conversion transparent

#### 2. ProtectionPolicy + ProtectionManager

**Recommended Location:** `/src/services/protectionPolicy.ts` (new file)

**Why:**
- Services layer already exists
- Clear separation: policy definition vs registry implementation

**Interface Design:**
```typescript
export interface ProtectionPolicy {
  version: "1.0" | "2.0";
  rules: ProtectionRule[];
  stacks: StackProfile[];
  defaults: {
    level: ProtectionLevel;
    requireSnapshotMessage: boolean;
  };
  audit: {
    loadedAt: number;
    source: "defaults" | "snapbackrc" | "merged";
    rulesCount: number;
  };
}

export class ProtectionManager {
  async computeRepoStatus(): Promise<{
    status: "unprotected" | "partial" | "complete" | "error";
    protectedCount: number;
    unprotectedCriticalCount: number;
    attentionItems: AttentionItem[];
  }>;

  getEffectivePolicy(): ProtectionPolicy;

  applyStackProfiles(stacks: StackProfile[]): ProtectionPolicy;
}
```

**Integration Point:**
- `SnapBackRCLoader` can create ProtectionPolicy after merging
- Commands can call `protectionManager.computeRepoStatus()`

#### 3. StackProfile Data Model + Detection

**Recommended Location:** `/src/stacks/stackDetection.ts` (new file)

**Why:**
- New directory keeps stacks isolated
- Clean from the start with data-driven design

**Interface Design:**
```typescript
export interface StackProfile {
  id: string;
  name: string;
  detect: { glob: string; confidence: number }[];
  rules: ProtectionRule[];
  description?: string;
}

export const STACK_PROFILES: StackProfile[] = [
  {
    id: "nextjs",
    name: "Next.js",
    detect: [
      { glob: "next.config.js", confidence: 1.0 },
      { glob: "pages/**", confidence: 0.8 }
    ],
    rules: [
      { pattern: "next.config.js", level: ProtectionLevel.Strict },
      { pattern: ".env.local", level: ProtectionLevel.Strict }
    ]
  },
  // ... more profiles
];

export async function detectStacks(workspaceRoot: string): Promise<StackProfile[]> {
  const detected: StackProfile[] = [];
  for (const profile of STACK_PROFILES) {
    for (const detector of profile.detect) {
      const files = await vscode.workspace.findFiles(detector.glob);
      if (files.length > 0) {
        detected.push(profile);
        break;
      }
    }
  }
  return detected;
}
```

**Safe Starting Slice:**
1. Create stack detection as data-only (no behavior change)
2. Integrate into `ProtectionPolicy`
3. Show detected stacks in status UI
4. Eventually enable/disable stack profiles in settings

#### 4. AIRiskService Interface + Default Implementation

**Recommended Location:** `/src/services/aiRiskService.ts` (new file)

**Why:**
- Clean interface for testability
- Pluggable implementation pattern

**Interface Design:**
```typescript
export interface AIRiskAssessment {
  level: "low" | "medium" | "high";
  score: number;           // 0-100
  confidence: number;      // 0-1
  factors: string[];
  timestamp: number;
}

export interface AIRiskService {
  assessChange(input: {
    filePath: string;
    before: string;
    after: string;
    category: "config" | "code" | "test" | "docs";
  }): Promise<AIRiskAssessment>;

  getCachedRisk(filePath: string): AIRiskAssessment | null;
  clearCache(filePath: string): void;
}

export class NoopAIRiskService implements AIRiskService {
  async assessChange(): Promise<AIRiskAssessment> {
    return { level: "low", score: 0, confidence: 1, factors: [], timestamp: Date.now() };
  }
  getCachedRisk(): null { return null; }
  clearCache(): void {}
}

export class RemoteAIRiskService implements AIRiskService {
  // Calls API for risk assessment
  // Caches results per file
  // Fails gracefully if API unavailable
}
```

**Safe Starting Slice:**
1. Create interface + NoopAIRiskService (no behavior change)
2. Update AnalysisCoordinator to use service instead of direct API calls
3. Add cache layer
4. Expose config flag to enable/disable

### Flagged Risky Modules (Large, Mixed Concerns)

#### High Risk for Phase 2 Modifications

**1. SaveHandler.ts** (333 lines)
- **Concerns:** Coordinates analysis, protection, cooldown, audit
- **Recommendation:** Already well-designed with delegated handlers, but Phase 2 AI risk gating will add complexity
- **Mitigation:** Add AIRiskService as dependency, not inline

**2. ProtectionLevelHandler.ts** (576 lines)
- **Concerns:** Handles Watch/Warn/Block logic
- **Recommendation:** Will become more complex with AI risk thresholds per level
- **Mitigation:** Extract level-specific logic to strategy classes (WatchLevelHandler, WarnLevelHandler, StrictLevelHandler)

**3. RepoProtectionScanner.ts** (505 lines)
- **Concerns:** File scanning + pattern recommendations + stack detection
- **Recommendation:** Mixing concerns - should split scanner from recommender
- **Mitigation:** Extract stack-aware recommendation logic to StackRecommender class

**4. ProtectionConfigManager.ts** (241 lines)
- **Concerns:** File watching, pattern management, legacy config loading
- **Recommendation:** Parallel system to SnapBackRCLoader - will confuse Phase 2 developers
- **Mitigation:** Document which system is canonical, deprecate one

### Safe Starting Slices for Phase 2

#### Slice 1: Protection Level Model Unification
**Effort:** 2-3 hours
**Risk:** Very Low (new code, opt-in migration)
**Tasks:**
1. Create `/src/types/protectionLevel.ts` with enum + mapping
2. Add mapping functions for legacy compatibility
3. Update type imports in hot paths (step-wise)
4. All existing code continues to work

#### Slice 2: ProtectionPolicy Interface
**Effort:** 4-6 hours
**Risk:** Low (interfaces + new service, registry unchanged)
**Tasks:**
1. Create `/src/services/protectionPolicy.ts`
2. Extend SnapBackRCLoader to create ProtectionPolicy after merge
3. Expose via getter with contract
4. No behavior changes yet

#### Slice 3: Stack Profile Infrastructure
**Effort:** 6-8 hours
**Risk:** Low (data-driven, no behavior change)
**Tasks:**
1. Create `/src/stacks/stackDetection.ts` with interface + data
2. Implement detectStacks() function
3. Show detected stacks in status UI (informational only)
4. Can enable/disable without affecting protection logic

#### Slice 4: AIRiskService Interface + Noop Implementation
**Effort:** 3-4 hours
**Risk:** Low (interface + null object, swappable)
**Tasks:**
1. Create `/src/services/aiRiskService.ts` with interface
2. Create NoopAIRiskService (default: always low risk)
3. Inject into AnalysisCoordinator
4. Existing behavior preserved (API calls still work)

#### Slice 5: Repo Protection Status Audit
**Effort:** 8-10 hours
**Risk:** Medium (computes new data, adds context keys)
**Tasks:**
1. Create ProtectionManager.computeRepoStatus() method
2. Compute unprotected critical files via policy + registry
3. Set context keys for dynamic UI
4. Update view title to show status
5. Integrate AI risk (medium/high risk items) into attention list

### Especially Critical for Phase 2 Teams

#### Critical Success Factors

1. **Never modify ProtectedFileRegistry directly** from new code
   - Always go through ProtectionService facade
   - Ensures stack/AI rules can intercept decisions

2. **Keep stack detection data-driven**
   - Don't hardcode patterns in commands
   - Reference STACK_PROFILES, not magic strings

3. **Use AIRiskService interface, not API calls**
   - Enables testing, offline mode, custom implementations
   - Makes risk thresholds configurable

4. **Separate data (what rules apply) from logic (when to apply)**
   - ProtectionPolicy = data
   - ProtectionManager = logic
   - ProtectionLevelHandler = execution

#### Common Pitfalls to Avoid

❌ **Don't:** Add AI risk logic directly to SaveHandler
✅ **Do:** Create AIRiskService, inject into SaveHandler

❌ **Don't:** Check protection level in commands before calling service
✅ **Do:** Let ProtectionService.addProtection() compute level from policy + stacks

❌ **Don't:** Duplicate config merging logic for stacks
✅ **Do:** Extend ProtectionPolicy to include active stacks

---

## Appendix A: File Location Reference

### Protection Model
- `src/types/protection.ts` - Canonical ProtectionLevel type
- `src/views/types.ts` - Duplicate metadata (refactor target)
- `src/types/policy.types.ts` - Policy override types (uses different level names - ISSUE)

### Config & Merging
- `src/protection/SnapBackRCLoader.ts` - Config load + merge (lines 150-186)
- `src/config/defaultConfig.ts` - Default protection rules (not examined)
- `src/types/snapbackrc.types.ts` - Config schema + JSON schema

### Registry & Persistence
- `src/services/protectedFileRegistry.ts` - Central registry (726 lines)
- `src/storage/SqliteStorageAdapter.ts` - Database adapter

### Protection Logic
- `src/handlers/ProtectionLevelHandler.ts` - Level semantics (576 lines)
- `src/handlers/SaveHandler.ts` - Save orchestration (333 lines)
- `src/handlers/AuditLogger.ts` - Audit trail
- `src/handlers/CooldownService.ts` - Debounce + cooldown

### Commands & UX
- `src/commands/protectionCommands.ts` - Protection management commands (676 lines)
- `src/commands/statusBarCommands.ts` - Status display command (284 lines)
- `src/contextManager.ts` - VS Code context keys

### Repository Scan
- `src/repoProtectionScanner.ts` - Repo scan + recommendations (505 lines)

### Testing
- `test/unit/commands/protectionCommands.test.ts`
- `test/unit/handlers/ProtectionLevelHandler.test.ts`
- `test/unit/services/protectedFileRegistry.test.ts`

---

## Summary: Alignment with Target Architecture

| Target Component | Current Status | Phase 2 Readiness |
|------------------|---|---|
| **ProtectionLevel Model** | ✅ Implicit but consistent | Green - add explicit mapping layer |
| **Config & Policy Merge** | ✅ Explicit precedence | Green - wrap in ProtectionPolicy object |
| **Registry & Manager** | ⚠️ Registry present, manager missing | Yellow - add ProtectionService facade |
| **Protect Repo Audit** | ⚠️ Scan works, status missing | Yellow - add status computation |
| **Stack Detection** | ❌ Hardcoded in scanner | Red - extract to StackProfile system |
| **AI Risk System** | ⚠️ API integration present, interface missing | Yellow - add AIRiskService interface |
| **VS Code UX** | ✅ Basic functionality present | Green - add context keys + view title |
| **Test Coverage** | ⚠️ Partial, gaps in system tests | Yellow - add helpers for Phase 2 testing |

**Overall:** Phase 1 provides solid foundation. Phase 2 needs 2-3 new service interfaces + minor refactoring. Low breaking change risk if following recommended insertion points.

---

**Report Complete**
*Investigation Methodology: Context7 API documentation + codebase semantic analysis + VS Code extension best practices*
*Next Steps: Use Part 3 insertion points to plan surgical Phase 2 implementation*
