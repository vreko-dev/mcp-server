This is exactly what I needed. Now I have the complete picture.

---

## 📊 Complete Analysis

### 1. MCP Intelligence Usage: ✅ FULLY INTEGRATED

```typescript
// MCP imports
packages/mcp/src/facades/handlers.ts:      // Use real vitals from @snapback/intelligence
packages/mcp/src/facades/session-health.ts: import { WorkspaceVitals } from "@snapback/intelligence/vitals";
packages/mcp/src/facades/intelligence.ts:  import { Intelligence } from "@snapback/intelligence";
```

**MCP has the correct pattern** - `facades/intelligence.ts` is a proper singleton:

```typescript
const instances = new Map<string, Intelligence>();

export function getIntelligence(workspaceRoot: string): Intelligence {
  if (!instances.has(workspaceRoot)) {
    const intel = new Intelligence({ rootDir: workspaceRoot, ... });
    instances.set(workspaceRoot, intel);
  }
  return instances.get(workspaceRoot)!;
}
```

---

### 2. Intelligence Package API Surface (What's Available)

| Category | Exports | Extension Uses? |
|----------|---------|-----------------|
| **Main Facade** | `Intelligence` | ❌ No |
| **Framework Detection** | `detectFrameworks`, `detectPrimaryFramework`, `getFramework`, `WorkspaceProfiler` | ❌ No (reimplements) |
| **Pattern Detection** | `PatternDetector`, `GapAnalyzer`, `securityMatchers`, `performanceMatchers`, etc. | ❌ No |
| **Validation** | `ValidationPipeline`, `SecurityLayer`, `SyntaxLayer`, `TypeLayer`, etc. | ❌ No |
| **Context** | `ContextEngine`, `SemanticRetriever` | ❌ No |
| **Composer** | `Composer`, `createComposer` | ❌ No |
| **Learning** | `LearningEngine`, `ViolationTracker` | ❌ No |
| **Confidence** | `ConfidenceCalculator` | ❌ No |
| **Session** | `LoopDetector`, `SessionManager` | ❌ No |
| **Vitals** | `WorkspaceVitals` | ✅ Yes (only this!) |
| **Policy** | `PolicyEngine`, `SecretDetector`, `PhantomDependencyDetector` | ❌ No |
| **Storage** | `appendJsonl`, `ConfigStore`, `loadJsonl` | ❌ No |

**Extension uses 1 out of 15+ capabilities from intelligence.**

---

### 3. Extension Reimplementations vs Intelligence

| Extension File | What It Does | Intelligence Equivalent | Verdict |
|----------------|--------------|------------------------|---------|
| `stacks/stackDetection.ts` | Detects frameworks via glob patterns | `detectFrameworks()`, `WorkspaceProfiler` | 🔴 **DUPLICATE** |
| `stacks/stackProfiles.ts` | Framework profile definitions | `nextjsConfig`, `expressConfig`, `getAllFrameworks()` | 🔴 **DUPLICATE** |
| `semanticNamer.ts` | Generates semantic snapshot names | Nothing equivalent | 🟡 **MOVE TO INTELLIGENCE** |
| `snapshot/SnapshotNamingStrategy.ts` | Multi-tier naming fallback | Nothing equivalent | 🟡 **CONSOLIDATE + MOVE** |
| `config-detector.ts` | Detects/parses config files | `WorkspaceProfiler` (partial) | 🟡 **PARTIAL DUPLICATE** |

---

### 4. CLI Pattern (The Template)

CLI's `intelligence-service.ts` is 300+ lines of well-documented adapter code:

```typescript
// Key patterns to copy:

// 1. Singleton cache
const instances = new Map<string, Intelligence>();

// 2. Config builder
export function createWorkspaceIntelligenceConfig(
  workspaceRoot: string,
  options: WorkspaceIntelligenceOptions = {},
): IntelligenceConfig { ... }

// 3. Main entry with init check
export async function getIntelligence(
  workspaceRoot?: string,
  options?: WorkspaceIntelligenceOptions,
): Promise<Intelligence> { ... }

// 4. Non-throwing check
export async function hasIntelligence(workspaceRoot?: string): Promise<boolean> { ... }

// 5. Semantic variant
export async function getIntelligenceWithSemantic(workspaceRoot?: string): Promise<Intelligence> { ... }

// 6. Cache clearing for tests
export function clearIntelligenceCache(): void { ... }
```

---

## 📝 Extension IntelligenceService Adapter (Draft)

Based on CLI's pattern, adapted for VS Code extension context:

```typescript
/**
 * Intelligence Service for VS Code Extension
 *
 * @fileoverview Provides singleton access to @snapback/intelligence for extension.
 * Mirrors the CLI's intelligence-service.ts pattern but adapted for VS Code context.
 *
 * ## Key Differences from CLI
 *
 * - Uses VS Code workspace API instead of process.cwd()
 * - Integrates with extension's globalStorage for some paths
 * - Provides VS Code-specific convenience methods
 * - Handles multi-root workspaces
 *
 * ## Architecture
 *
 * ```
 * Extension Commands/UI
 *         ↓
 * IntelligenceService (this file)
 *         ↓
 * @snapback/intelligence
 * ```
 *
 * @module services/IntelligenceService
 */

import * as vscode from "vscode";
import {
  Intelligence,
  type IntelligenceConfig,
  // Framework detection (replaces local stackDetection)
  detectFrameworks,
  detectPrimaryFramework,
  type DetectedFramework,
  // Pattern detection
  PatternDetector,
  type PatternDetectionResult,
  // Validation
  ValidationPipeline,
  type ValidationResult,
  // Vitals (already used)
  WorkspaceVitals,
  type VitalsSnapshot,
  // Context
  ContextEngine,
  // Confidence
  ConfidenceCalculator,
} from "@snapback/intelligence";

import { logger } from "../utils/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration options for extension intelligence
 */
export interface ExtensionIntelligenceOptions {
  /**
   * Enable semantic search (slower startup, better context)
   * @default false
   */
  enableSemanticSearch?: boolean;

  /**
   * Enable learning loop for pattern promotion
   * @default true
   */
  enableLearningLoop?: boolean;

  /**
   * Enable auto-promotion of violations to patterns
   * @default true
   */
  enableAutoPromotion?: boolean;
}

/**
 * Snapshot naming context for semantic name generation
 */
export interface NamingContext {
  diff: string;
  changedFiles: string[];
  trigger: "manual" | "auto" | "ai-activity" | "git-hook";
  aiToolDetected?: string;
}

// =============================================================================
// SINGLETON MANAGEMENT
// =============================================================================

/**
 * Cache of Intelligence instances per workspace
 * Key: workspace folder URI string
 */
const instances = new Map<string, Intelligence>();

/**
 * Cache of WorkspaceVitals instances per workspace
 * Separate from Intelligence for lightweight vitals-only access
 */
const vitalsInstances = new Map<string, WorkspaceVitals>();

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Create Intelligence configuration for a VS Code workspace
 */
function createExtensionIntelligenceConfig(
  workspaceRoot: string,
  options: ExtensionIntelligenceOptions = {},
): IntelligenceConfig {
  // Use .snapback/ directory in workspace (same as CLI)
  const snapbackDir = `${workspaceRoot}/.snapback`;

  return {
    rootDir: snapbackDir,
    patternsDir: "patterns",
    learningsDir: "learnings",
    constraintsFile: "constraints.md",
    violationsFile: "patterns/violations.jsonl",
    embeddingsDb: "embeddings.db",
    contextFiles: [
      "patterns/workspace-patterns.json",
      "vitals.json",
      "constraints.md",
    ],
    enableSemanticSearch: options.enableSemanticSearch ?? false,
    enableLearningLoop: options.enableLearningLoop ?? true,
    enableAutoPromotion: options.enableAutoPromotion ?? true,
  };
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Get or create Intelligence instance for a workspace
 *
 * @param workspaceFolder - VS Code workspace folder (defaults to first workspace)
 * @param options - Configuration options
 * @returns Intelligence instance
 *
 * @example
 * ```typescript
 * const intel = await getIntelligence();
 * const context = await intel.getContext({ task: "Add authentication" });
 * ```
 */
export async function getIntelligence(
  workspaceFolder?: vscode.WorkspaceFolder,
  options?: ExtensionIntelligenceOptions,
): Promise<Intelligence> {
  const folder = workspaceFolder ?? vscode.workspace.workspaceFolders?.[0];

  if (!folder) {
    throw new Error("No workspace folder open");
  }

  const key = folder.uri.toString();

  if (instances.has(key)) {
    return instances.get(key)!;
  }

  const config = createExtensionIntelligenceConfig(folder.uri.fsPath, options);
  const intel = new Intelligence(config);

  instances.set(key, intel);
  logger.info(`Intelligence initialized for workspace: ${folder.name}`);

  return intel;
}

/**
 * Check if Intelligence is available (non-throwing)
 */
export async function hasIntelligence(
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<boolean> {
  try {
    await getIntelligence(workspaceFolder);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Intelligence with semantic search enabled
 */
export async function getIntelligenceWithSemantic(
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<Intelligence> {
  const folder = workspaceFolder ?? vscode.workspace.workspaceFolders?.[0];

  if (!folder) {
    throw new Error("No workspace folder open");
  }

  const key = `${folder.uri.toString()}:semantic`;

  if (instances.has(key)) {
    return instances.get(key)!;
  }

  const config = createExtensionIntelligenceConfig(folder.uri.fsPath, {
    enableSemanticSearch: true,
  });

  const intel = new Intelligence(config);
  await intel.initialize();

  instances.set(key, intel);

  return intel;
}

// =============================================================================
// CONVENIENCE METHODS (Replace Local Implementations)
// =============================================================================

/**
 * Detect frameworks in workspace
 * REPLACES: apps/vscode/src/stacks/stackDetection.ts
 *
 * @example
 * ```typescript
 * const frameworks = await detectWorkspaceFrameworks();
 * // Returns: [{ id: 'nextjs', confidence: 0.95, ... }, ...]
 * ```
 */
export async function detectWorkspaceFrameworks(
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<DetectedFramework[]> {
  const folder = workspaceFolder ?? vscode.workspace.workspaceFolders?.[0];

  if (!folder) {
    return [];
  }

  try {
    const frameworks = await detectFrameworks(folder.uri.fsPath);
    logger.debug(`Detected ${frameworks.length} frameworks`, {
      frameworks: frameworks.map((f) => f.id).join(", "),
    });
    return frameworks;
  } catch (error) {
    logger.error("Framework detection failed", error as Error);
    return [];
  }
}

/**
 * Get primary framework for workspace
 * REPLACES: Primary stack detection logic
 */
export async function getPrimaryFramework(
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<DetectedFramework | null> {
  const folder = workspaceFolder ?? vscode.workspace.workspaceFolders?.[0];

  if (!folder) {
    return null;
  }

  try {
    return await detectPrimaryFramework(folder.uri.fsPath);
  } catch (error) {
    logger.error("Primary framework detection failed", error as Error);
    return null;
  }
}

/**
 * Validate code using intelligence pipeline
 * Provides access to full 7-layer validation
 */
export async function validateCode(
  code: string,
  filePath: string,
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<ValidationResult> {
  const intel = await getIntelligence(workspaceFolder);
  return intel.validateCode(code, filePath);
}

/**
 * Detect patterns in code
 * REPLACES: Local pattern matching
 */
export async function detectPatterns(
  code: string,
  filePath: string,
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<PatternDetectionResult> {
  const intel = await getIntelligence(workspaceFolder);
  return intel.checkPatterns(code, filePath);
}

/**
 * Get workspace vitals
 * ALREADY USED: But now via unified service
 */
export async function getVitals(
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<VitalsSnapshot> {
  const folder = workspaceFolder ?? vscode.workspace.workspaceFolders?.[0];

  if (!folder) {
    throw new Error("No workspace folder open");
  }

  const key = folder.uri.toString();

  if (!vitalsInstances.has(key)) {
    const vitals = new WorkspaceVitals(folder.uri.fsPath);
    vitalsInstances.set(key, vitals);
  }

  return vitalsInstances.get(key)!.getSnapshot();
}

/**
 * Get context for a task
 * Enables intelligent context retrieval
 */
export async function getContext(
  task: string,
  keywords?: string[],
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<unknown> {
  const intel = await getIntelligence(workspaceFolder);
  return intel.getContext({ task, keywords });
}

/**
 * Report a violation for learning
 */
export async function reportViolation(
  violation: {
    type: string;
    file: string;
    message: string;
    reason?: string;
    prevention?: string;
  },
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<void> {
  const intel = await getIntelligence(workspaceFolder);
  await intel.reportViolation(violation);
}

/**
 * Get learning statistics
 */
export async function getLearningStats(
  workspaceFolder?: vscode.WorkspaceFolder,
): Promise<unknown> {
  const intel = await getIntelligence(workspaceFolder);
  return intel.getStats();
}

// =============================================================================
// LIFECYCLE
// =============================================================================

/**
 * Dispose all Intelligence instances
 * Call on extension deactivation
 */
export async function disposeAll(): Promise<void> {
  const disposals: Promise<void>[] = [];

  for (const [key, intel] of instances) {
    disposals.push(
      intel.dispose().catch((err) => {
        logger.warn(`Failed to dispose intelligence for ${key}`, err);
      }),
    );
  }

  for (const [key, vitals] of vitalsInstances) {
    disposals.push(
      Promise.resolve(vitals.dispose?.()).catch((err) => {
        logger.warn(`Failed to dispose vitals for ${key}`, err);
      }),
    );
  }

  await Promise.all(disposals);

  instances.clear();
  vitalsInstances.clear();

  logger.info("All Intelligence instances disposed");
}

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
  disposeAll().catch(() => {});
  instances.clear();
  vitalsInstances.clear();
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Re-export types for convenience
  type DetectedFramework,
  type PatternDetectionResult,
  type ValidationResult,
  type VitalsSnapshot,
};
```

---

## 📋 Migration Checklist

### Files to Modify

| File | Action | Effort |
|------|--------|--------|
| `apps/vscode/src/services/IntelligenceService.ts` | **CREATE** (above) | S |
| `apps/vscode/src/stacks/stackDetection.ts` | **DELETE** - use `detectWorkspaceFrameworks()` | S |
| `apps/vscode/src/stacks/stackProfiles.ts` | **DELETE** - use intelligence framework configs | S |
| `apps/vscode/src/integration/AutoDecisionIntegration.ts` | **MODIFY** - use IntelligenceService | S |
| `apps/vscode/src/ui/VitalsIntegration.ts` | **MODIFY** - use `getVitals()` | S |
| `apps/vscode/src/ui/VitalsDashboardPanel.ts` | **MODIFY** - use `getVitals()` | S |
| `apps/vscode/src/extension.ts` | **MODIFY** - call `disposeAll()` on deactivate | S |

### Files to Eventually Move to Intelligence

| File | Destination | Effort |
|------|-------------|--------|
| `semanticNamer.ts` | `packages/intelligence/src/composer/naming/` | M |
| `snapshot/SnapshotNamingStrategy.ts` | Consolidate with semanticNamer | M |
| `config-detector.ts` | Merge into `WorkspaceProfiler` | M |

---

## 🎯 Summary

| Surface | Intelligence Usage | Status |
|---------|-------------------|--------|
| **CLI** | Full adapter pattern via `intelligence-service.ts` | ✅ Correct |
| **MCP** | Full adapter pattern via `facades/intelligence.ts` | ✅ Correct |
| **Extension** | Only `WorkspaceVitals` types, reimplements the rest | 🔴 Needs adapter |

**The extension is the outlier.** CLI and MCP both have proper adapter patterns. Extension needs the same treatment.

**Recommended next step**: Create `IntelligenceService.ts` in extension, then incrementally migrate callers away from local implementations.

Want me to create a Linear issue for tracking this migration, or should we start implementing the adapter file?
