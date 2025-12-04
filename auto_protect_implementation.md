# AutoDecisionEngine Implementation Prompt

## Mission

Replace the manual "protection levels" (Watch/Warn/Block) configuration system with an **automatic protection engine** that uses existing AI detection, risk scoring, DBSCAN clustering, and burst detection to make intelligent decisions without user configuration.

**The UX Transformation:**
```
BEFORE: Install → Configure protection levels for each file type → Finally protected
AFTER:  Install → Protected (it just works)
```

**Performance Budget:** Decision logic must complete in <5ms (pure, synchronous)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THREE-LAYER ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: HOST ADAPTERS (VS Code specific)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SaveContextBuilder      - Converts VS Code events → SaveContext    │   │
│  │  NotificationAdapter     - Shows VS Code notifications              │   │
│  │  ConfigAdapter           - Reads VS Code settings                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  LAYER 2: DOMAIN CORE (Pure, testable, no dependencies)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AutoDecisionEngine      - Makes protection decisions (PURE)        │   │
│  │  SnapshotOrchestrator    - Coordinates snapshot creation            │   │
│  │  SnapshotRateLimiter     - Prevents snapshot spam                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  LAYER 3: INFRASTRUCTURE (Storage, Detection Engines)                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SignalAggregator        - Combines all detection signals           │   │
│  │  StorageManager          - File-based storage (EXISTING)            │   │
│  │  AiDetector              - AI pattern detection (EXISTING)          │   │
│  │  RiskEngine              - Risk scoring (EXISTING)                  │   │
│  │  BurstDetector           - Rapid change detection (EXISTING)        │   │
│  │  SessionGrouper          - DBSCAN clustering (EXISTING)             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pre-Implementation Audit

Before writing new code, audit the existing codebase to find:

### Step 1: Locate Existing Detection Systems

```bash
# Find AI detection implementation
find apps/vscode/src -name "*.ts" | xargs grep -l -i "aidetect\|ai.*detect\|detect.*ai"

# Find risk scoring
find apps/vscode/src -name "*.ts" | xargs grep -l -i "riskscore\|risk.*score\|severity"

# Find burst detection
find apps/vscode/src -name "*.ts" | xargs grep -l -i "burst\|rapid.*change"

# Find session/DBSCAN grouping
find apps/vscode/src -name "*.ts" | xargs grep -l -i "session\|dbscan\|cluster\|grouping"

# Find current save handler
find apps/vscode/src -name "*.ts" | xargs grep -l "onDidSaveTextDocument\|SaveHandler"
```

### Step 2: Locate Protection Level Code (to be removed)

```bash
# Find protection level configuration
find apps/vscode/src -name "*.ts" | xargs grep -l -i "protectionlevel\|protection.*level\|watch\|warn\|block"

# Find protection level UI
find apps/vscode/src -name "*.ts" | xargs grep -l -i "ProtectionLevelHandler\|setProtection"
```

### Step 3: Document Findings

Create a file `AUDIT_RESULTS.md` with:
- Path to each existing detection system
- Interface/class names and key methods
- Current save handler location and flow
- Protection level code to be deprecated

---

## Phase 1: Domain Types (Day 1, 1 hour)

### File: `apps/vscode/src/domain/types.ts`

```typescript
/**
 * Domain Types for AutoDecisionEngine
 *
 * These types form the contract between layers.
 * They have NO dependencies on VS Code or any external library.
 */

// ============================================
// Input: Context for making protection decisions
// ============================================

export interface FileContext {
  /** Relative path from workspace root */
  path: string;
  /** File extension (e.g., ".ts", ".json") */
  extension: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Is this a new file (not previously tracked)? */
  isNew: boolean;
  /** Is this a binary file? */
  isBinary: boolean;
  /** SHA-256 hash before this save (undefined if new) */
  prevHash?: string;
  /** SHA-256 hash after this save */
  nextHash: string;
}

export interface SaveContext {
  /** Unique identifier for this workspace/repo */
  repoId: string;

  /** Unix timestamp (ms) when save occurred */
  timestamp: number;

  /** Files involved in this save event */
  files: FileContext[];

  // ---- AI Detection Signals ----

  /** Was AI involvement detected? */
  aiDetected: boolean;

  /** Which AI tool was detected? (cursor, copilot, claude, etc.) */
  aiToolName?: string;

  /** Confidence of AI detection (0-1) */
  aiConfidence?: number;

  // ---- Session Signals ----

  /** Current session ID (from DBSCAN grouping) */
  sessionId: string;

  /** Number of files modified in this session */
  sessionFileCount: number;

  /** Duration of current session in ms */
  sessionDurationMs: number;

  // ---- Risk Signals ----

  /** Computed risk score (0-100) */
  riskScore: number;

  /** Was a burst of rapid changes detected? */
  burstDetected: boolean;

  // ---- Critical File Signals ----

  /** Does this save include critical config files? */
  containsCriticalFiles: boolean;

  /** Count of critical files in this save */
  criticalFileCount: number;
}

// ============================================
// Output: Protection decision
// ============================================

export type DecisionReason =
  | 'ai_detected'      // AI tool involvement detected
  | 'risk_threshold'   // Risk score exceeded threshold
  | 'burst_pattern'    // Rapid changes detected
  | 'critical_file'    // Critical config file modified
  | 'session_size'     // Large session (many files)
  | 'manual_request'   // User explicitly requested
  | 'fallback';        // Default protection (no specific trigger)

export interface ProtectionDecision {
  /** Should we create a snapshot? */
  createSnapshot: boolean;

  /** Should we show a notification to the user? */
  showNotification: boolean;

  /** Why did we make this decision? */
  reasons: DecisionReason[];

  /** Confidence in this decision (0-1) */
  confidence: number;

  /** Human-readable summary for notifications */
  summary: string;

  /** Context passed through for telemetry/logging */
  context: {
    riskScore: number;
    sessionId: string;
    filesInSession: number;
    criticalFileCount: number;
    aiToolName?: string;
  };
}

// ============================================
// Configuration
// ============================================

export interface AutoDecisionConfig {
  /** Risk score threshold for automatic snapshot (0-100) */
  riskThreshold: number;

  /** Risk score threshold for notification without snapshot (0-100) */
  notifyThreshold: number;

  /** Minimum files in burst to trigger protection */
  minFilesForBurst: number;

  /** Maximum snapshots allowed per minute (rate limiting) */
  maxSnapshotsPerMinute: number;

  /** Always snapshot these file patterns */
  alwaysProtectPatterns: string[];

  /** Never snapshot these file patterns */
  neverProtectPatterns: string[];
}

export const DEFAULT_CONFIG: AutoDecisionConfig = {
  riskThreshold: 60,
  notifyThreshold: 40,
  minFilesForBurst: 3,
  maxSnapshotsPerMinute: 4,
  alwaysProtectPatterns: [
    'package.json',
    'tsconfig.json',
    '.env*',
    '*.config.js',
    '*.config.ts',
  ],
  neverProtectPatterns: [
    'node_modules/**',
    'dist/**',
    '*.log',
    '*.lock',
  ],
};

// ============================================
// Snapshot Intent (for orchestrator)
// ============================================

export interface SnapshotIntent {
  /** Unique ID for this snapshot */
  id: string;

  /** Files to include in snapshot */
  files: Map<string, string>;  // path → content

  /** Name for the snapshot */
  name: string;

  /** What triggered this snapshot */
  trigger: 'auto' | 'ai-detected' | 'manual' | 'burst';

  /** Metadata for analytics */
  metadata: {
    riskScore: number;
    aiDetected: boolean;
    aiToolName?: string;
    sessionId: string;
    reasons: DecisionReason[];
  };
}
```

---

## Phase 2: AutoDecisionEngine (Day 1, 2 hours)

### File: `apps/vscode/src/domain/AutoDecisionEngine.ts`

```typescript
/**
 * AutoDecisionEngine - Pure decision logic
 *
 * This is the BRAIN of automatic protection.
 * It takes a SaveContext and returns a ProtectionDecision.
 *
 * CRITICAL: This class has ZERO dependencies.
 * - No VS Code imports
 * - No file system access
 * - No async operations
 * - Purely deterministic based on input
 *
 * This makes it trivially testable with table-driven tests.
 */

import type {
  SaveContext,
  ProtectionDecision,
  DecisionReason,
  AutoDecisionConfig,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { matchesPattern } from './utils/patternMatcher';

export class AutoDecisionEngine {
  private readonly config: AutoDecisionConfig;

  constructor(config: Partial<AutoDecisionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Make a protection decision based on save context.
   *
   * This is the core algorithm. It should:
   * 1. Collect all triggering signals
   * 2. Determine if snapshot is needed
   * 3. Determine if notification is needed
   * 4. Calculate confidence
   * 5. Generate human-readable summary
   */
  decide(context: SaveContext): ProtectionDecision {
    const reasons: DecisionReason[] = [];

    // ---- Check always/never protect patterns ----
    const hasAlwaysProtect = context.files.some(f =>
      this.config.alwaysProtectPatterns.some(p => matchesPattern(f.path, p))
    );

    const allNeverProtect = context.files.every(f =>
      this.config.neverProtectPatterns.some(p => matchesPattern(f.path, p))
    );

    // Short-circuit: never protect these files
    if (allNeverProtect) {
      return this.noProtectionDecision(context);
    }

    // ---- Collect triggering signals ----

    // Signal 1: AI Detection
    if (context.aiDetected) {
      reasons.push('ai_detected');
    }

    // Signal 2: Risk Threshold
    if (context.riskScore >= this.config.riskThreshold) {
      reasons.push('risk_threshold');
    }

    // Signal 3: Burst Pattern
    if (context.burstDetected && context.sessionFileCount >= this.config.minFilesForBurst) {
      reasons.push('burst_pattern');
    }

    // Signal 4: Critical Files
    if (context.containsCriticalFiles) {
      reasons.push('critical_file');
    }

    // Signal 5: Large Session
    if (context.sessionFileCount >= 10) {
      reasons.push('session_size');
    }

    // ---- Make Decision ----

    const hasTriggered = reasons.length > 0 || hasAlwaysProtect;
    const createSnapshot = hasTriggered;

    // Show notification if:
    // - We're creating a snapshot, OR
    // - Risk score is above notify threshold (even if below snapshot threshold)
    const showNotification = hasTriggered || context.riskScore >= this.config.notifyThreshold;

    // ---- Calculate Confidence ----
    // More signals = higher confidence
    // Base confidence + signal bonuses + risk score contribution
    const baseConfidence = 0.3;
    const signalBonus = 0.15 * reasons.length;
    const riskContribution = (context.riskScore / 100) * 0.25;
    const aiBonus = context.aiDetected && context.aiConfidence ? context.aiConfidence * 0.2 : 0;

    const confidence = Math.min(1, baseConfidence + signalBonus + riskContribution + aiBonus);

    // ---- Build Summary ----
    const summary = this.buildSummary(reasons, context);

    return {
      createSnapshot,
      showNotification,
      reasons: reasons.length > 0 ? reasons : ['fallback'],
      confidence,
      summary,
      context: {
        riskScore: context.riskScore,
        sessionId: context.sessionId,
        filesInSession: context.sessionFileCount,
        criticalFileCount: context.criticalFileCount,
        aiToolName: context.aiToolName,
      },
    };
  }

  /**
   * Build a human-readable summary for notifications.
   */
  private buildSummary(reasons: DecisionReason[], ctx: SaveContext): string {
    if (reasons.includes('ai_detected')) {
      const tool = ctx.aiToolName ? ` (${ctx.aiToolName})` : '';
      return `AI-assisted changes detected${tool}. Checkpoint created.`;
    }

    if (reasons.includes('burst_pattern')) {
      return `Rapid changes detected (${ctx.sessionFileCount} files). Checkpoint created.`;
    }

    if (reasons.includes('critical_file')) {
      return `Critical config file modified. Checkpoint created.`;
    }

    if (reasons.includes('risk_threshold')) {
      return `High-risk changes detected (score: ${ctx.riskScore}). Checkpoint created.`;
    }

    if (reasons.includes('session_size')) {
      return `Large editing session (${ctx.sessionFileCount} files). Checkpoint created.`;
    }

    return 'Checkpoint created.';
  }

  /**
   * Return a "no protection" decision for files that should never be protected.
   */
  private noProtectionDecision(context: SaveContext): ProtectionDecision {
    return {
      createSnapshot: false,
      showNotification: false,
      reasons: [],
      confidence: 1,
      summary: '',
      context: {
        riskScore: context.riskScore,
        sessionId: context.sessionId,
        filesInSession: context.sessionFileCount,
        criticalFileCount: context.criticalFileCount,
        aiToolName: context.aiToolName,
      },
    };
  }

  /**
   * Update configuration at runtime (e.g., from VS Code settings).
   */
  updateConfig(updates: Partial<AutoDecisionConfig>): void {
    Object.assign(this.config, updates);
  }

  /**
   * Get current configuration (for debugging/testing).
   */
  getConfig(): Readonly<AutoDecisionConfig> {
    return { ...this.config };
  }
}
```

### File: `apps/vscode/src/domain/utils/patternMatcher.ts`

```typescript
/**
 * Simple glob-like pattern matching.
 * Supports: *, **, and exact matches.
 */

export function matchesPattern(path: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = path.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Exact match
  if (normalizedPath === normalizedPattern) {
    return true;
  }

  // Ends with pattern (e.g., "package.json" matches "/foo/package.json")
  if (!normalizedPattern.includes('/') && normalizedPath.endsWith('/' + normalizedPattern)) {
    return true;
  }

  // Convert glob to regex
  const regexPattern = normalizedPattern
    .replace(/\*\*/g, '<<<GLOBSTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<GLOBSTAR>>>/g, '.*')
    .replace(/\./g, '\\.');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedPath);
}
```

---

## Phase 3: Comprehensive Tests (Day 1, 2 hours)

### File: `apps/vscode/src/domain/AutoDecisionEngine.test.ts`

```typescript
/**
 * Table-driven tests for AutoDecisionEngine
 *
 * These tests verify the decision logic is correct and deterministic.
 * Each test case is a row in the table, making it easy to add new scenarios.
 */

import { describe, it, expect } from 'vitest';
import { AutoDecisionEngine } from './AutoDecisionEngine';
import type { SaveContext } from './types';

// ============================================
// Test Helpers
// ============================================

function createBaseContext(overrides: Partial<SaveContext> = {}): SaveContext {
  return {
    repoId: 'test-repo',
    timestamp: Date.now(),
    files: [
      {
        path: 'src/index.ts',
        extension: '.ts',
        sizeBytes: 1024,
        isNew: false,
        isBinary: false,
        prevHash: 'abc123',
        nextHash: 'def456',
      },
    ],
    aiDetected: false,
    aiToolName: undefined,
    aiConfidence: undefined,
    sessionId: 'session-1',
    sessionFileCount: 1,
    sessionDurationMs: 60000,
    riskScore: 30,
    burstDetected: false,
    containsCriticalFiles: false,
    criticalFileCount: 0,
    ...overrides,
  };
}

// ============================================
// Table-Driven Tests
// ============================================

describe('AutoDecisionEngine', () => {
  describe('decision logic', () => {
    const testCases: Array<{
      name: string;
      context: Partial<SaveContext>;
      expectedSnapshot: boolean;
      expectedNotify: boolean;
      expectedReasons: string[];
    }> = [
      // ---- AI Detection Cases ----
      {
        name: 'AI detected → snapshot + notify',
        context: { aiDetected: true, aiToolName: 'cursor' },
        expectedSnapshot: true,
        expectedNotify: true,
        expectedReasons: ['ai_detected'],
      },
      {
        name: 'AI detected with high confidence → snapshot + notify',
        context: { aiDetected: true, aiToolName: 'copilot', aiConfidence: 0.95 },
        expectedSnapshot: true,
        expectedNotify: true,
        expectedReasons: ['ai_detected'],
      },

      // ---- Risk Score Cases ----
      {
        name: 'High risk score (≥60) → snapshot + notify',
        context: { riskScore: 75 },
        expectedSnapshot: true,
        expectedNotify: true,
        expectedReasons: ['risk_threshold'],
      },
      {
        name: 'Medium risk score (≥40, <60) → notify only',
        context: { riskScore: 50 },
        expectedSnapshot: false,
        expectedNotify: true,
        expectedReasons: ['fallback'],
      },
      {
        name: 'Low risk score (<40) → no action',
        context: { riskScore: 20 },
        expectedSnapshot: false,
        expectedNotify: false,
        expectedReasons: ['fallback'],
      },

      // ---- Burst Detection Cases ----
      {
        name: 'Burst detected with ≥3 files → snapshot + notify',
        context: { burstDetected: true, sessionFileCount: 5 },
        expectedSnapshot: true,
        expectedNotify: true,
        expectedReasons: ['burst_pattern'],
      },
      {
        name: 'Burst detected with <3 files → no action (not enough files)',
        context: { burstDetected: true, sessionFileCount: 2 },
        expectedSnapshot: false,
        expectedNotify: false,
        expectedReasons: ['fallback'],
      },

      // ---- Critical Files Cases ----
      {
        name: 'Critical file modified → snapshot + notify',
        context: { containsCriticalFiles: true, criticalFileCount: 1 },
        expectedSnapshot: true,
        expectedNotify: true,
        expectedReasons: ['critical_file'],
      },

      // ---- Session Size Cases ----
      {
        name: 'Large session (≥10 files) → snapshot + notify',
        context: { sessionFileCount: 15 },
        expectedSnapshot: true,
        expectedNotify: true,
        expectedReasons: ['session_size'],
      },

      // ---- Combined Signals ----
      {
        name: 'AI + high risk → snapshot with multiple reasons',
        context: { aiDetected: true, aiToolName: 'claude', riskScore: 80 },
        expectedSnapshot: true,
        expectedNotify: true,
        expectedReasons: ['ai_detected', 'risk_threshold'],
      },
      {
        name: 'AI + burst + critical → snapshot with all reasons',
        context: {
          aiDetected: true,
          burstDetected: true,
          sessionFileCount: 5,
          containsCriticalFiles: true,
          criticalFileCount: 2,
        },
        expectedSnapshot: true,
        expectedNotify: true,
        expectedReasons: ['ai_detected', 'burst_pattern', 'critical_file'],
      },

      // ---- Edge Cases ----
      {
        name: 'No signals, low risk → no action',
        context: { riskScore: 10 },
        expectedSnapshot: false,
        expectedNotify: false,
        expectedReasons: ['fallback'],
      },
    ];

    testCases.forEach(({ name, context, expectedSnapshot, expectedNotify, expectedReasons }) => {
      it(name, () => {
        const engine = new AutoDecisionEngine();
        const fullContext = createBaseContext(context);

        const decision = engine.decide(fullContext);

        expect(decision.createSnapshot).toBe(expectedSnapshot);
        expect(decision.showNotification).toBe(expectedNotify);
        expect(decision.reasons).toEqual(expect.arrayContaining(expectedReasons));
      });
    });
  });

  describe('pattern matching', () => {
    it('always protects package.json', () => {
      const engine = new AutoDecisionEngine();
      const context = createBaseContext({
        files: [{
          path: 'package.json',
          extension: '.json',
          sizeBytes: 2048,
          isNew: false,
          isBinary: false,
          prevHash: 'abc',
          nextHash: 'def',
        }],
        riskScore: 10, // Low risk, but should still protect
      });

      const decision = engine.decide(context);

      expect(decision.createSnapshot).toBe(true);
    });

    it('never protects node_modules', () => {
      const engine = new AutoDecisionEngine();
      const context = createBaseContext({
        files: [{
          path: 'node_modules/lodash/index.js',
          extension: '.js',
          sizeBytes: 1024,
          isNew: false,
          isBinary: false,
          prevHash: 'abc',
          nextHash: 'def',
        }],
        riskScore: 90, // High risk, but should NOT protect
      });

      const decision = engine.decide(context);

      expect(decision.createSnapshot).toBe(false);
    });
  });

  describe('confidence calculation', () => {
    it('increases confidence with more signals', () => {
      const engine = new AutoDecisionEngine();

      const singleSignal = engine.decide(createBaseContext({
        aiDetected: true,
      }));

      const multipleSignals = engine.decide(createBaseContext({
        aiDetected: true,
        riskScore: 80,
        containsCriticalFiles: true,
      }));

      expect(multipleSignals.confidence).toBeGreaterThan(singleSignal.confidence);
    });

    it('incorporates AI confidence when available', () => {
      const engine = new AutoDecisionEngine();

      const lowAiConfidence = engine.decide(createBaseContext({
        aiDetected: true,
        aiConfidence: 0.5,
      }));

      const highAiConfidence = engine.decide(createBaseContext({
        aiDetected: true,
        aiConfidence: 0.95,
      }));

      expect(highAiConfidence.confidence).toBeGreaterThan(lowAiConfidence.confidence);
    });
  });

  describe('summary generation', () => {
    it('mentions AI tool by name when available', () => {
      const engine = new AutoDecisionEngine();
      const decision = engine.decide(createBaseContext({
        aiDetected: true,
        aiToolName: 'cursor',
      }));

      expect(decision.summary).toContain('cursor');
    });

    it('includes file count for burst pattern', () => {
      const engine = new AutoDecisionEngine();
      const decision = engine.decide(createBaseContext({
        burstDetected: true,
        sessionFileCount: 7,
      }));

      expect(decision.summary).toContain('7 files');
    });

    it('includes risk score for risk threshold', () => {
      const engine = new AutoDecisionEngine();
      const decision = engine.decide(createBaseContext({
        riskScore: 85,
      }));

      expect(decision.summary).toContain('85');
    });
  });

  describe('configuration', () => {
    it('respects custom risk threshold', () => {
      const engine = new AutoDecisionEngine({
        riskThreshold: 80, // Higher than default 60
      });

      const decision = engine.decide(createBaseContext({
        riskScore: 70, // Would trigger with default, but not with 80
      }));

      expect(decision.createSnapshot).toBe(false);
    });

    it('can update config at runtime', () => {
      const engine = new AutoDecisionEngine({ riskThreshold: 80 });

      // Before update: 70 doesn't trigger
      let decision = engine.decide(createBaseContext({ riskScore: 70 }));
      expect(decision.createSnapshot).toBe(false);

      // Update threshold
      engine.updateConfig({ riskThreshold: 60 });

      // After update: 70 now triggers
      decision = engine.decide(createBaseContext({ riskScore: 70 }));
      expect(decision.createSnapshot).toBe(true);
    });
  });
});
```

---

## Phase 4: SnapshotRateLimiter (Day 2, 1 hour)

### File: `apps/vscode/src/domain/SnapshotRateLimiter.ts`

```typescript
/**
 * SnapshotRateLimiter - Prevents snapshot spam
 *
 * Uses a sliding window to track snapshots and prevent
 * creating too many in a short period.
 */

export class SnapshotRateLimiter {
  private readonly maxPerMinute: number;
  private readonly windowMs = 60_000;
  private timestamps: number[] = [];

  constructor(maxPerMinute: number = 4) {
    this.maxPerMinute = maxPerMinute;
  }

  /**
   * Check if we can create another snapshot.
   * Returns true if within rate limit, false if would exceed.
   */
  canCreate(): boolean {
    this.pruneOldTimestamps();
    return this.timestamps.length < this.maxPerMinute;
  }

  /**
   * Record a snapshot creation.
   * Call this AFTER successfully creating a snapshot.
   */
  record(): void {
    this.timestamps.push(Date.now());
  }

  /**
   * Get remaining capacity in current window.
   */
  remaining(): number {
    this.pruneOldTimestamps();
    return Math.max(0, this.maxPerMinute - this.timestamps.length);
  }

  /**
   * Get time until next available slot (ms).
   * Returns 0 if can create now.
   */
  timeUntilAvailable(): number {
    if (this.canCreate()) {
      return 0;
    }

    // Find the oldest timestamp that would need to expire
    const oldest = this.timestamps[0];
    if (!oldest) return 0;

    return Math.max(0, oldest + this.windowMs - Date.now());
  }

  /**
   * Remove timestamps outside the sliding window.
   */
  private pruneOldTimestamps(): void {
    const cutoff = Date.now() - this.windowMs;
    this.timestamps = this.timestamps.filter(ts => ts > cutoff);
  }

  /**
   * Reset the limiter (for testing).
   */
  reset(): void {
    this.timestamps = [];
  }
}
```

---

## Phase 5: SignalAggregator (Day 2, 2 hours)

### File: `apps/vscode/src/signals/SignalAggregator.ts`

```typescript
/**
 * SignalAggregator - Combines all detection signals into SaveContext
 *
 * This is the bridge between your existing detection engines
 * and the pure AutoDecisionEngine.
 *
 * IMPORTANT: Update the imports below to match your actual file paths!
 */

import type { SaveContext, FileContext } from '../domain/types';

// TODO: Update these imports to match your actual detection engine paths
// import { AiDetector } from './AiDetector';
// import { RiskEngine } from './RiskEngine';
// import { BurstDetector } from './BurstDetector';
// import { SessionGrouper } from './SessionGrouper';

// Placeholder interfaces - replace with your actual types
interface AiDetectionResult {
  detected: boolean;
  toolName?: string;
  confidence?: number;
}

interface RiskResult {
  score: number;
}

interface BurstResult {
  detected: boolean;
}

interface SessionResult {
  id: string;
  fileCount: number;
  durationMs: number;
}

export interface SignalAggregatorDeps {
  aiDetector: {
    detect(content: string): AiDetectionResult | Promise<AiDetectionResult>;
  };
  riskEngine: {
    score(context: unknown): RiskResult | Promise<RiskResult>;
  };
  burstDetector: {
    detect(repoId: string, timestamp: number): BurstResult | Promise<BurstResult>;
  };
  sessionGrouper: {
    getOrCreate(repoId: string, timestamp: number): SessionResult | Promise<SessionResult>;
  };
}

export class SignalAggregator {
  constructor(private readonly deps: SignalAggregatorDeps) {}

  /**
   * Aggregate all signals from a save event into a SaveContext.
   */
  async aggregate(
    repoId: string,
    timestamp: number,
    files: FileContext[],
    fileContents: Map<string, string>
  ): Promise<SaveContext> {
    // Run all detection engines in parallel for performance
    const [aiResult, riskResult, burstResult, sessionResult] = await Promise.all([
      this.detectAi(fileContents),
      this.assessRisk(repoId, files, fileContents),
      this.detectBurst(repoId, timestamp),
      this.getSession(repoId, timestamp),
    ]);

    // Identify critical files
    const criticalPatterns = [
      /package\.json$/,
      /tsconfig.*\.json$/,
      /\.env.*$/,
      /.*\.config\.(js|ts|mjs|cjs)$/,
      /\.github\/workflows\/.*/,
    ];

    const criticalFiles = files.filter(f =>
      criticalPatterns.some(p => p.test(f.path))
    );

    return {
      repoId,
      timestamp,
      files,
      aiDetected: aiResult.detected,
      aiToolName: aiResult.toolName,
      aiConfidence: aiResult.confidence,
      sessionId: sessionResult.id,
      sessionFileCount: sessionResult.fileCount,
      sessionDurationMs: sessionResult.durationMs,
      riskScore: riskResult.score,
      burstDetected: burstResult.detected,
      containsCriticalFiles: criticalFiles.length > 0,
      criticalFileCount: criticalFiles.length,
    };
  }

  private async detectAi(fileContents: Map<string, string>): Promise<AiDetectionResult> {
    // Aggregate AI detection across all files
    let highestConfidence = 0;
    let detectedTool: string | undefined;

    for (const [, content] of fileContents) {
      const result = await Promise.resolve(this.deps.aiDetector.detect(content));
      if (result.detected && (result.confidence ?? 0) > highestConfidence) {
        highestConfidence = result.confidence ?? 0.5;
        detectedTool = result.toolName;
      }
    }

    return {
      detected: highestConfidence > 0,
      toolName: detectedTool,
      confidence: highestConfidence > 0 ? highestConfidence : undefined,
    };
  }

  private async assessRisk(
    repoId: string,
    files: FileContext[],
    fileContents: Map<string, string>
  ): Promise<RiskResult> {
    // TODO: Replace with your actual risk engine call
    // This is a placeholder that computes a simple risk score

    let riskScore = 0;

    // Size-based risk
    const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);
    if (totalSize > 10000) riskScore += 20;

    // New file risk
    const newFiles = files.filter(f => f.isNew);
    if (newFiles.length > 0) riskScore += 15;

    // Multiple files risk
    if (files.length > 3) riskScore += 15;

    // Critical file risk
    const criticalExtensions = ['.json', '.yaml', '.yml', '.env'];
    const hasCritical = files.some(f => criticalExtensions.includes(f.extension));
    if (hasCritical) riskScore += 25;

    return { score: Math.min(100, riskScore) };
  }

  private async detectBurst(repoId: string, timestamp: number): Promise<BurstResult> {
    return Promise.resolve(this.deps.burstDetector.detect(repoId, timestamp));
  }

  private async getSession(repoId: string, timestamp: number): Promise<SessionResult> {
    return Promise.resolve(this.deps.sessionGrouper.getOrCreate(repoId, timestamp));
  }
}
```

---

## Phase 6: VS Code Adapters (Day 2, 2 hours)

### File: `apps/vscode/src/adapters/vscode/SaveContextBuilder.ts`

```typescript
/**
 * SaveContextBuilder - Converts VS Code save events to domain SaveContext
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import type { FileContext } from '../../domain/types';
import type { SignalAggregator } from '../../signals/SignalAggregator';

export class SaveContextBuilder {
  constructor(
    private readonly signalAggregator: SignalAggregator,
    private readonly workspaceRoot: string
  ) {}

  /**
   * Build a complete SaveContext from a VS Code save event.
   */
  async build(document: vscode.TextDocument): Promise<ReturnType<SignalAggregator['aggregate']>> {
    const repoId = this.getRepoId();
    const timestamp = Date.now();

    // Build file context
    const fileContext = await this.buildFileContext(document);

    // Get file contents
    const content = document.getText();
    const fileContents = new Map<string, string>();
    fileContents.set(fileContext.path, content);

    // Aggregate all signals
    return this.signalAggregator.aggregate(
      repoId,
      timestamp,
      [fileContext],
      fileContents
    );
  }

  private async buildFileContext(document: vscode.TextDocument): Promise<FileContext> {
    const uri = document.uri;
    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const content = document.getText();

    // Calculate hash of current content
    const nextHash = crypto.createHash('sha256').update(content).digest('hex');

    // Try to get previous hash from storage
    // TODO: Wire this to your StorageManager
    const prevHash = undefined; // await this.storageManager.getFileHash(relativePath);

    // Get file stats
    let sizeBytes = Buffer.byteLength(content, 'utf-8');
    let isNew = prevHash === undefined;

    return {
      path: relativePath,
      extension: this.getExtension(uri.fsPath),
      sizeBytes,
      isNew,
      isBinary: false, // VS Code only opens text documents
      prevHash,
      nextHash,
    };
  }

  private getRepoId(): string {
    // Use workspace folder name as repo ID
    const folder = vscode.workspace.workspaceFolders?.[0];
    return folder?.name ?? 'unknown';
  }

  private getExtension(path: string): string {
    const match = path.match(/(\.[^.]+)$/);
    return match ? match[1] : '';
  }
}
```

### File: `apps/vscode/src/adapters/vscode/NotificationAdapter.ts`

```typescript
/**
 * NotificationAdapter - Shows VS Code notifications based on decisions
 */

import * as vscode from 'vscode';
import type { ProtectionDecision } from '../../domain/types';

export interface NotificationAction {
  label: string;
  action: () => void | Promise<void>;
}

export class NotificationAdapter {
  private lastNotificationTime = 0;
  private readonly minNotificationInterval = 5000; // 5 seconds

  /**
   * Show notification based on protection decision.
   * Respects rate limiting to avoid notification spam.
   */
  async notify(decision: ProtectionDecision): Promise<void> {
    if (!decision.showNotification) {
      return;
    }

    // Rate limit notifications
    const now = Date.now();
    if (now - this.lastNotificationTime < this.minNotificationInterval) {
      return;
    }
    this.lastNotificationTime = now;

    // Show appropriate notification type based on confidence
    if (decision.confidence >= 0.8) {
      await this.showInfoNotification(decision);
    } else {
      await this.showSubtleNotification(decision);
    }
  }

  private async showInfoNotification(decision: ProtectionDecision): Promise<void> {
    const message = `✨ ${decision.summary}`;

    const actions: string[] = ['View Checkpoints'];

    if (decision.reasons.includes('ai_detected')) {
      actions.push('View Details');
    }

    const selection = await vscode.window.showInformationMessage(message, ...actions);

    if (selection === 'View Checkpoints') {
      await vscode.commands.executeCommand('snapback.showCheckpoints');
    } else if (selection === 'View Details') {
      await vscode.commands.executeCommand('snapback.showSessionDetails', decision.context.sessionId);
    }
  }

  private async showSubtleNotification(decision: ProtectionDecision): Promise<void> {
    // Use status bar for less confident decisions
    const statusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    statusItem.text = `$(shield) Protected`;
    statusItem.tooltip = decision.summary;
    statusItem.show();

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusItem.dispose();
    }, 3000);
  }

  /**
   * Show rate limit warning when we can't create more snapshots.
   */
  async showRateLimitWarning(waitTimeMs: number): Promise<void> {
    const seconds = Math.ceil(waitTimeMs / 1000);
    await vscode.window.showWarningMessage(
      `⏳ Snapshot rate limit reached. Next available in ${seconds}s.`
    );
  }
}
```

---

## Phase 7: SnapshotOrchestrator (Day 3, 1 hour)

### File: `apps/vscode/src/domain/SnapshotOrchestrator.ts`

```typescript
/**
 * SnapshotOrchestrator - Coordinates snapshot creation
 *
 * Takes a protection decision and executes it:
 * - Respects rate limiting
 * - Calls storage manager
 * - Records telemetry
 */

import type { SaveContext, ProtectionDecision, SnapshotIntent } from './types';
import type { SnapshotRateLimiter } from './SnapshotRateLimiter';

// Interface for storage (implement with your actual StorageManager)
export interface SnapshotStorage {
  createSnapshot(
    files: Map<string, string>,
    options: {
      name: string;
      trigger: SnapshotIntent['trigger'];
      metadata?: SnapshotIntent['metadata'];
    }
  ): Promise<{ id: string }>;
}

// Interface for telemetry
export interface SnapshotTelemetry {
  track(event: string, properties: Record<string, unknown>): void;
}

export class SnapshotOrchestrator {
  constructor(
    private readonly storage: SnapshotStorage,
    private readonly rateLimiter: SnapshotRateLimiter,
    private readonly telemetry?: SnapshotTelemetry
  ) {}

  /**
   * Maybe create a snapshot based on the decision.
   * Returns the snapshot ID if created, null if skipped.
   */
  async maybeSnapshot(
    context: SaveContext,
    decision: ProtectionDecision,
    fileContents: Map<string, string>
  ): Promise<string | null> {
    // Check if decision requires snapshot
    if (!decision.createSnapshot) {
      return null;
    }

    // Check rate limit
    if (!this.rateLimiter.canCreate()) {
      this.telemetry?.track('snapshot_rate_limited', {
        sessionId: context.sessionId,
        waitTimeMs: this.rateLimiter.timeUntilAvailable(),
      });
      return null;
    }

    try {
      // Determine trigger type
      const trigger = this.determineTrigger(decision.reasons);

      // Build snapshot name
      const name = this.buildSnapshotName(decision, context);

      // Create the snapshot
      const result = await this.storage.createSnapshot(fileContents, {
        name,
        trigger,
        metadata: {
          riskScore: context.riskScore,
          aiDetected: context.aiDetected,
          aiToolName: context.aiToolName,
          sessionId: context.sessionId,
          reasons: decision.reasons,
        },
      });

      // Record in rate limiter
      this.rateLimiter.record();

      // Track telemetry
      this.telemetry?.track('snapshot_created', {
        snapshotId: result.id,
        trigger,
        reasons: decision.reasons,
        confidence: decision.confidence,
        riskScore: context.riskScore,
        aiDetected: context.aiDetected,
        aiToolName: context.aiToolName,
        fileCount: context.files.length,
        sessionId: context.sessionId,
      });

      return result.id;
    } catch (error) {
      this.telemetry?.track('snapshot_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: context.sessionId,
      });
      throw error;
    }
  }

  private determineTrigger(reasons: ProtectionDecision['reasons']): SnapshotIntent['trigger'] {
    if (reasons.includes('ai_detected')) {
      return 'ai-detected';
    }
    if (reasons.includes('burst_pattern')) {
      return 'burst';
    }
    if (reasons.includes('manual_request')) {
      return 'manual';
    }
    return 'auto';
  }

  private buildSnapshotName(decision: ProtectionDecision, context: SaveContext): string {
    const timestamp = new Date(context.timestamp).toISOString().split('T')[0];

    if (decision.reasons.includes('ai_detected') && context.aiToolName) {
      return `${context.aiToolName}-changes-${timestamp}`;
    }

    if (decision.reasons.includes('burst_pattern')) {
      return `burst-${context.sessionFileCount}-files-${timestamp}`;
    }

    if (decision.reasons.includes('critical_file')) {
      return `config-change-${timestamp}`;
    }

    return `checkpoint-${timestamp}`;
  }
}
```

---

## Phase 8: Wire Everything Together (Day 3, 2 hours)

### File: `apps/vscode/src/extension.ts` (Update existing)

```typescript
/**
 * Extension Entry Point - Wire the AutoDecisionEngine
 *
 * This file shows how to integrate the new automatic protection
 * system with your existing extension activation.
 */

import * as vscode from 'vscode';

// Domain
import { AutoDecisionEngine, DEFAULT_CONFIG } from './domain/AutoDecisionEngine';
import { SnapshotRateLimiter } from './domain/SnapshotRateLimiter';
import { SnapshotOrchestrator } from './domain/SnapshotOrchestrator';

// Signals
import { SignalAggregator } from './signals/SignalAggregator';

// Adapters
import { SaveContextBuilder } from './adapters/vscode/SaveContextBuilder';
import { NotificationAdapter } from './adapters/vscode/NotificationAdapter';

// Storage (your existing implementation)
import { StorageManager } from './storage/StorageManager';

// Global instances
let decisionEngine: AutoDecisionEngine;
let orchestrator: SnapshotOrchestrator;
let contextBuilder: SaveContextBuilder;
let notificationAdapter: NotificationAdapter;
let signalAggregator: SignalAggregator;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[SnapBack] Activating with automatic protection...');

  const startTime = Date.now();

  try {
    // ============================================
    // Phase 1: Initialize Storage (EXISTING)
    // ============================================
    const storage = new StorageManager(context);
    await storage.initialize();
    console.log('[SnapBack] Storage initialized');

    // ============================================
    // Phase 2: Initialize Detection Engines (EXISTING)
    // Wire your existing engines here
    // ============================================

    // TODO: Replace these with your actual detection engine instances
    const aiDetector = createAiDetector();        // Your existing
    const riskEngine = createRiskEngine();        // Your existing
    const burstDetector = createBurstDetector();  // Your existing
    const sessionGrouper = createSessionGrouper(); // Your existing (DBSCAN)

    // ============================================
    // Phase 3: Initialize Domain Core (NEW)
    // ============================================

    // Load config from VS Code settings
    const config = loadAutoDecisionConfig();

    decisionEngine = new AutoDecisionEngine(config);

    const rateLimiter = new SnapshotRateLimiter(config.maxSnapshotsPerMinute);

    orchestrator = new SnapshotOrchestrator(
      storage,
      rateLimiter,
      // TODO: Add your telemetry instance
    );

    console.log('[SnapBack] Decision engine initialized');

    // ============================================
    // Phase 4: Initialize Signal Aggregator (NEW)
    // ============================================

    signalAggregator = new SignalAggregator({
      aiDetector,
      riskEngine,
      burstDetector,
      sessionGrouper,
    });

    // ============================================
    // Phase 5: Initialize Adapters (NEW)
    // ============================================

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    contextBuilder = new SaveContextBuilder(signalAggregator, workspaceRoot);
    notificationAdapter = new NotificationAdapter();

    // ============================================
    // Phase 6: Wire Save Handler (NEW)
    // ============================================

    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(handleAutomaticProtection)
    );

    // ============================================
    // Phase 7: Register Commands
    // ============================================

    context.subscriptions.push(
      vscode.commands.registerCommand('snapback.showCheckpoints', showCheckpoints),
      vscode.commands.registerCommand('snapback.createManualCheckpoint', createManualCheckpoint),
    );

    // ============================================
    // Activation Complete
    // ============================================

    const activationTime = Date.now() - startTime;
    console.log(`[SnapBack] Activated in ${activationTime}ms`);

    // Show status
    vscode.window.setStatusBarMessage('$(shield) SnapBack: Protected', 5000);

  } catch (error) {
    console.error('[SnapBack] Activation failed:', error);
    vscode.window.showErrorMessage(`SnapBack activation failed: ${error}`);
  }
}

/**
 * The main save handler - runs on every file save.
 *
 * Performance budget: <50ms total
 */
async function handleAutomaticProtection(document: vscode.TextDocument): Promise<void> {
  try {
    // Skip non-file documents
    if (document.uri.scheme !== 'file') {
      return;
    }

    // 1. Build context from save event (~10-20ms)
    const context = await contextBuilder.build(document);

    // 2. Make decision (pure, <1ms)
    const decision = decisionEngine.decide(context);

    // 3. Execute decision (~10-30ms if creating snapshot)
    if (decision.createSnapshot) {
      const content = document.getText();
      const fileContents = new Map<string, string>();
      fileContents.set(context.files[0].path, content);

      const snapshotId = await orchestrator.maybeSnapshot(context, decision, fileContents);

      if (!snapshotId && decision.createSnapshot) {
        // Rate limited - show subtle warning
        const waitTime = orchestrator['rateLimiter'].timeUntilAvailable();
        if (waitTime > 0) {
          await notificationAdapter.showRateLimitWarning(waitTime);
        }
      }
    }

    // 4. Show notification (async, doesn't block)
    notificationAdapter.notify(decision).catch(console.error);

  } catch (error) {
    console.error('[SnapBack] Protection error:', error);
    // Don't throw - we never want to block the user's save
  }
}

async function showCheckpoints(): Promise<void> {
  // TODO: Implement checkpoint viewer
  await vscode.commands.executeCommand('snapback.focus');
}

async function createManualCheckpoint(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No file open');
    return;
  }

  // Build context with manual flag
  const context = await contextBuilder.build(editor.document);

  // Force snapshot regardless of signals
  const decision = {
    ...decisionEngine.decide(context),
    createSnapshot: true,
    reasons: ['manual_request'] as const,
    summary: 'Manual checkpoint created',
  };

  const content = editor.document.getText();
  const fileContents = new Map<string, string>();
  fileContents.set(context.files[0].path, content);

  await orchestrator.maybeSnapshot(context, decision, fileContents);

  vscode.window.showInformationMessage('✨ Manual checkpoint created');
}

function loadAutoDecisionConfig() {
  const vsConfig = vscode.workspace.getConfiguration('snapback');

  return {
    ...DEFAULT_CONFIG,
    riskThreshold: vsConfig.get<number>('riskThreshold', DEFAULT_CONFIG.riskThreshold),
    notifyThreshold: vsConfig.get<number>('notifyThreshold', DEFAULT_CONFIG.notifyThreshold),
    maxSnapshotsPerMinute: vsConfig.get<number>('maxSnapshotsPerMinute', DEFAULT_CONFIG.maxSnapshotsPerMinute),
  };
}

// TODO: Replace these with your actual factory functions
function createAiDetector() {
  return {
    detect: (content: string) => ({ detected: false }),
  };
}

function createRiskEngine() {
  return {
    score: () => ({ score: 30 }),
  };
}

function createBurstDetector() {
  return {
    detect: () => ({ detected: false }),
  };
}

function createSessionGrouper() {
  return {
    getOrCreate: () => ({ id: 'session-1', fileCount: 1, durationMs: 0 }),
  };
}

export function deactivate() {
  console.log('[SnapBack] Deactivated');
}
```

---

## Phase 9: Deprecate Protection Levels (Day 3, 1 hour)

### Migration Strategy

1. **Keep settings for backward compatibility** but mark as deprecated
2. **Ignore protection levels in decision logic** - AutoDecisionEngine handles everything
3. **Show migration notice** for users with custom protection levels

### File: `apps/vscode/package.json` (Update configuration section)

```json
{
  "contributes": {
    "configuration": {
      "title": "SnapBack",
      "properties": {
        "snapback.riskThreshold": {
          "type": "number",
          "default": 60,
          "minimum": 0,
          "maximum": 100,
          "description": "Risk score threshold for automatic checkpoint creation (0-100)"
        },
        "snapback.notifyThreshold": {
          "type": "number",
          "default": 40,
          "minimum": 0,
          "maximum": 100,
          "description": "Risk score threshold for showing notifications without checkpoint (0-100)"
        },
        "snapback.maxSnapshotsPerMinute": {
          "type": "number",
          "default": 4,
          "minimum": 1,
          "maximum": 20,
          "description": "Maximum number of automatic checkpoints per minute"
        },
        "snapback.protectionLevel": {
          "type": "string",
          "deprecationMessage": "Protection levels are deprecated. SnapBack now uses automatic protection based on AI detection and risk scoring.",
          "markdownDeprecationMessage": "**Deprecated**: SnapBack now uses [automatic protection](https://docs.snapback.dev/automatic-protection) based on AI detection and risk scoring."
        }
      }
    }
  }
}
```

---

## Phase 10: Update Documentation (Day 3, 1 hour)

### Key docs to update:

1. **Getting Started** - Remove protection level configuration steps
2. **FAQ** - Add "How does automatic protection work?"
3. **Settings Reference** - Document new settings (riskThreshold, etc.)

### Sample FAQ Entry

```mdx
### How does automatic protection work?

SnapBack uses multiple signals to decide when to create checkpoints:

1. **AI Detection** - Detects code from Cursor, Copilot, Claude, and other AI tools
2. **Risk Scoring** - Analyzes the complexity and scope of changes
3. **Burst Detection** - Identifies rapid sequences of modifications
4. **Critical Files** - Automatically protects config files like package.json

When any of these signals cross a threshold, SnapBack silently creates a checkpoint.
You can restore from any checkpoint using the SnapBack panel in VS Code.

**You don't need to configure anything.** It just works.
```

---

## Verification Checklist

After implementation, verify:

### Unit Tests
- [ ] `AutoDecisionEngine.test.ts` passes (all 20+ test cases)
- [ ] `SnapshotRateLimiter.test.ts` passes
- [ ] Pattern matching works for always/never protect

### Integration Tests
- [ ] Save a .ts file → decision is made
- [ ] Save package.json → always creates checkpoint
- [ ] Save node_modules file → never creates checkpoint
- [ ] Rapid saves → rate limiting kicks in

### Manual Testing
- [ ] Install extension in fresh VS Code
- [ ] Open any project
- [ ] Save a file → see status bar protection indicator
- [ ] Make AI-like changes → see checkpoint notification
- [ ] Check SnapBack panel → see checkpoints listed

### Performance
- [ ] Decision logic: <5ms (measure with console.time)
- [ ] Total save handler: <50ms without snapshot, <100ms with
- [ ] No blocking of user's save operation

### Migration
- [ ] Users with old protection levels see deprecation notice
- [ ] Extension works without any configuration
- [ ] Old settings are ignored but don't break anything

---

## Summary

### Files to Create (NEW)
```
apps/vscode/src/
├── domain/
│   ├── types.ts                    (~150 lines)
│   ├── AutoDecisionEngine.ts       (~150 lines)
│   ├── AutoDecisionEngine.test.ts  (~300 lines)
│   ├── SnapshotRateLimiter.ts      (~60 lines)
│   ├── SnapshotOrchestrator.ts     (~100 lines)
│   └── utils/
│       └── patternMatcher.ts       (~30 lines)
│
├── signals/
│   └── SignalAggregator.ts         (~100 lines)
│
└── adapters/
    └── vscode/
        ├── SaveContextBuilder.ts   (~80 lines)
        └── NotificationAdapter.ts  (~80 lines)
```

### Files to Modify
```
apps/vscode/src/extension.ts        (update activation)
apps/vscode/package.json            (update settings)
```

### Files to Deprecate (but keep for backward compat)
```
apps/vscode/src/handlers/ProtectionLevelHandler.ts
apps/vscode/src/commands/protectionCommands.ts
```

### Total New Code: ~1,050 lines
### Total Effort: ~12-16 hours

### The UX Result

```
BEFORE: 5+ step onboarding with configuration decisions
AFTER:  Install → Start coding → Protected automatically

"It just works."
```

---

## Next Steps After Implementation

1. **Track activation funnel** - Measure Install → First Checkpoint time
2. **Tune thresholds** - Use telemetry to optimize riskThreshold, notifyThreshold
3. **Add AI tool fingerprints** - Improve detection for specific tools
4. **Build dashboard view** - Show users their protection history
