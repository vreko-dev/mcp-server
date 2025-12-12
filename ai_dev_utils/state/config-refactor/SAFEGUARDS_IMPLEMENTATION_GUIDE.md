# Safeguards Implementation Guide (TDD-First Approach)

**Authority**: TDD_CORE.md (test-first, 4-path coverage)  
**Status**: Ready for implementation  
**Effort**: ~12-14 hours (can be parallelized across team)  

---

## 🎯 Quick Start

This guide provides **test-first templates** for each safeguard. Follow this pattern:

```
1. Write failing tests (RED phase)
2. Implement to make tests pass (GREEN phase)
3. Refactor for quality (REFACTOR phase)
4. Run phase gates
```

---

## Safeguard 1: Migration Checksums

**Purpose**: Detect silent data loss during v1→v2 migration

### RED Phase: Write Tests First

**File**: `packages/config/src/__tests__/safeguard-1-checksums.test.ts`

**Test Template**:
```typescript
describe('Safeguard 1: Migration Checksums', () => {
  // HAPPY PATH
  describe('should calculate and validate checksums', () => {
    it('should generate consistent checksums for identical configs');
    it('should preserve data integrity (before/after protection count)');
    it('should validate checksum match returns true for valid migration');
  });
  
  // SAD PATH
  describe('should detect data loss', () => {
    it('should detect missing protections in migration');
    it('should detect engine config corruption');
    it('should fail validation when checksums differ');
  });
  
  // EDGE PATH
  describe('should handle boundary conditions', () => {
    it('should handle empty configs (0 protections)');
    it('should handle large configs (10K+ entries)');
    it('should handle special characters in paths');
  });
  
  // ERROR PATH
  describe('should handle errors gracefully', () => {
    it('should throw on null/undefined config');
    it('should log migration audit with success flag');
    it('should log failures with error details');
  });
});
```

### GREEN Phase: Implementation

**File**: `packages/config/src/safeguards/checksums.ts`

```typescript
import crypto from 'crypto';

export function calculateConfigChecksum(config: V1Config): string {
  // Implementation: Use JSON.stringify + SHA256
  // Must be deterministic (same config = same hash)
  // Strategy: Stringify sorted JSON, then SHA256
}

export function validateChecksumIntegrity(before: string, after: string): boolean {
  // Implementation: Compare checksums
  // For migrations, checksums should match exactly (no data loss)
}

export async function logMigrationAudit(log: MigrationAuditLog): Promise<void> {
  // Implementation: Write audit log to ~/.snapback/migration-logs/
  // Include timestamp, hashes, protection counts, success flag
}
```

**Test Execution**:
```bash
pnpm --filter @snapback/config test -- safeguard-1-checksums.test.ts --run
```

---

## Safeguard 2: Chokidar Integration

**Purpose**: Prevent file watcher crashes and race conditions

### RED Phase: Write Tests

**File**: `packages/config/src/__tests__/safeguard-2-file-watcher.test.ts`

**Test Template**:
```typescript
describe('Safeguard 2: Chokidar File Watcher', () => {
  // HAPPY PATH
  describe('should watch config file for changes', () => {
    it('should detect config file changes');
    it('should reload config on change');
    it('should debounce rapid changes');
  });
  
  // SAD PATH
  describe('should handle watcher errors', () => {
    it('should gracefully handle EMFILE errors');
    it('should retry on transient failures');
    it('should stop watching if max errors exceeded');
  });
  
  // EDGE PATH
  describe('should handle edge cases', () => {
    it('should handle file moves/renames');
    it('should handle atomic writes');
    it('should respect resource limits (max 50 watchers)');
  });
  
  // ERROR PATH
  describe('should handle watcher lifecycle', () => {
    it('should close watcher and cleanup');
    it('should handle concurrent modifications');
  });
});
```

### GREEN Phase: Implementation

**File**: `packages/config/src/safeguards/file-watcher.ts`

```typescript
import chokidar from 'chokidar';

export class ConfigWatcher {
  startWatching(configPath: string): void {
    // Implementation using Chokidar with:
    // - awaitWriteFinish: { stabilityThreshold: 200 }
    // - depth: 0 (only this file)
    // - maxListeners: 10
  }
  
  private handleConfigChange(path: string): void {
    // Implementation: Debounce with 300ms delay
  }
  
  stopWatching(): void {
    // Implementation: Close watcher, cleanup
  }
}

export class WatcherResourceManager {
  canStartWatcher(): boolean;
  getWatcherHealth(): { active: number; max: number; capacity: number };
}
```

---

## Safeguard 3: Performance Monitoring

**Purpose**: Detect config load performance degradation

### RED Phase: Tests

**File**: `packages/config/src/__tests__/safeguard-3-performance.test.ts`

```typescript
describe('Safeguard 3: Performance Monitoring', () => {
  // HAPPY PATH
  it('should measure config load under 100ms');
  it('should track performance metrics to PostHog');
  
  // SAD PATH
  it('should alert if load time exceeds 500ms');
  it('should log slow operations with context');
  
  // EDGE PATH
  it('should handle 10K+ entry configs');
  it('should measure with minimal overhead');
  
  // ERROR PATH
  it('should continue operating if monitoring fails');
});
```

### GREEN Phase: Implementation

```typescript
export class ConfigLoadPerformanceMonitor {
  async measureConfigLoad<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<{ result: T; duration: number }>;
}
```

---

## Safeguard 4: Feature Flag Validation

**Purpose**: Prevent feature flag edge cases

### RED Phase: Tests

```typescript
describe('Safeguard 4: Feature Flag Validation', () => {
  // HAPPY PATH
  it('should validate true/"1" as enabled');
  it('should validate false/"0" as disabled');
  
  // SAD PATH
  it('should reject invalid values (default to true)');
  it('should handle undefined gracefully');
  
  // EDGE PATH
  it('should handle case-insensitivity');
  it('should trim whitespace');
  
  // ERROR PATH
  it('should log invalid flags');
});
```

### GREEN Phase: Implementation

```typescript
export class FeatureFlagValidator {
  validateFeatureFlag(value: string | undefined): boolean;
  evaluateWithSourceTracking(): FeatureFlagSource;
  async validateFeatureFlagHealth(): Promise<boolean>;
}
```

---

## Safeguard 5: Atomic Writes & Locks

**Purpose**: Prevent data corruption during concurrent writes

### RED Phase: Tests

```typescript
describe('Safeguard 5: Atomic Writes & Locks', () => {
  // HAPPY PATH
  it('should write config atomically (temp → rename)');
  it('should fsync to disk');
  it('should acquire and release locks');
  
  // SAD PATH
  it('should fail safely if lock timeout');
  it('should cleanup temp file on error');
  
  // EDGE PATH
  it('should handle concurrent write attempts');
  it('should recover from partial writes');
  
  // ERROR PATH
  it('should throw ConfigWriteError on failure');
});
```

### GREEN Phase: Implementation

```typescript
export async function atomicWriteConfig(
  filePath: string,
  config: ConfigStoreV2
): Promise<Result<void>>;

export class FileLock {
  async acquireLock(timeoutMs?: number): Promise<Result<void>>;
  releaseLock(): void;
}

export class ConfigBackupManager {
  async createBackup(config: ConfigStoreV2): Promise<string>;
  async detectCorruptedConfig(configPath: string): Promise<boolean>;
  async restoreFromBackup(configPath: string): Promise<Result<ConfigStoreV2>>;
}
```

---

## Safeguard 6: Compatibility Shim

**Purpose**: Support v1 config format while running v2 internally

### RED Phase: Tests

```typescript
describe('Safeguard 6: Compatibility Shim', () => {
  // HAPPY PATH
  it('should read v1 format configs');
  it('should convert v1 requests to v2 internally');
  
  // SAD PATH
  it('should handle v2-only features gracefully');
  
  // EDGE PATH
  it('should maintain backward compatibility');
  
  // ERROR PATH
  it('should log unsupported features');
});
```

### GREEN Phase: Implementation

```typescript
export class ConfigV1CompatibilityShim {
  async readV1Format(filePath: string): Promise<V1Config | null>;
  async handleLegacyRequest(v1Request: any): Promise<V2Response>;
}
```

---

## Safeguard 7: Percentage-Based Rollout

**Purpose**: Gradual rollout without PostHog (while integrating)

### RED Phase: Tests

```typescript
describe('Safeguard 7: Percentage Rollout', () => {
  // HAPPY PATH
  it('should enable for 100% of users at 1.0');
  it('should disable for 0% of users at 0.0');
  it('should enable for ~50% at 0.5');
  
  // SAD PATH
  it('should handle invalid percentages');
  
  // EDGE PATH
  it('should be deterministic (same user always gets same result)');
  it('should use consistent hashing');
  
  // ERROR PATH
  it('should default to enabled on calculation error');
});
```

### GREEN Phase: Implementation

```typescript
export class PercentageBasedRollout {
  isEnabledForUser(userId: string, percentage: number): boolean;
  private hashUserId(userId: string): number;
}
```

---

## Safeguard 8: Rollback Testing

**Purpose**: Ensure rollback works correctly before production

### RED Phase: Tests

```typescript
describe('Safeguard 8: Rollback', () => {
  // HAPPY PATH
  it('should rollback from v2 to v1');
  it('should preserve data during rollback');
  
  // SAD PATH
  it('should handle rollback failures');
  
  // EDGE PATH
  it('should be idempotent (multiple rollbacks safe)');
  
  // ERROR PATH
  it('should auto-trigger on error rate >1%');
});
```

### GREEN Phase: Implementation

```typescript
export class AutomaticRollbackManager {
  startMonitoring(): void;
  private triggerRollback(reason: string, context: any): Promise<void>;
}
```

---

## TDD Execution Workflow

### For Each Safeguard (8 times):

**Step 1: RED Phase** (Write tests)
```bash
# Write tests in __tests__/safeguard-N-*.test.ts
# All tests FAIL initially
cd packages/config
pnpm test -- safeguard-N --run
# Expect: All fail ✗✗✗
```

**Step 2: GREEN Phase** (Implement minimum)
```bash
# Write implementations in src/safeguards/*.ts
# Just enough to make tests pass
pnpm test -- safeguard-N --run
# Expect: All pass ✓✓✓
```

**Step 3: REFACTOR Phase** (Improve code)
```bash
# Refactor for quality
# Tests still pass
pnpm test -- safeguard-N --run
# Expect: All pass ✓✓✓
```

**Step 4: Gate Check**
```bash
./ai_dev_utils/scripts/tdd-gate.sh green
# Expect: PASSED ✓
```

---

## File Structure

Create these directories and files:

```
packages/config/src/
├── safeguards/
│   ├── checksums.ts          (Safeguard 1)
│   ├── file-watcher.ts       (Safeguard 2)
│   ├── performance.ts        (Safeguard 3)
│   ├── feature-flags.ts      (Safeguard 4)
│   ├── atomic-writes.ts      (Safeguard 5)
│   ├── compatibility.ts      (Safeguard 6)
│   ├── percentage-rollout.ts (Safeguard 7)
│   └── rollback.ts           (Safeguard 8)
│
└── __tests__/
    ├── safeguard-1-checksums.test.ts
    ├── safeguard-2-file-watcher.test.ts
    ├── safeguard-3-performance.test.ts
    ├── safeguard-4-feature-flags.test.ts
    ├── safeguard-5-atomic-writes.test.ts
    ├── safeguard-6-compatibility.test.ts
    ├── safeguard-7-percentage-rollout.test.ts
    └── safeguard-8-rollback.test.ts
```

---

## Parallel Execution (Team Effort)

Team members can work in parallel:

```
Team Member 1: Safeguards 1, 2 (Checksums, File Watcher)
Team Member 2: Safeguards 3, 4 (Performance, Feature Flags)
Team Member 3: Safeguards 5, 6 (Atomic Writes, Compatibility)
Team Member 4: Safeguards 7, 8 (Rollout, Rollback)
```

**Synchronization Point**: After all safeguards GREEN, run full test suite:
```bash
pnpm --filter @snapback/config test --run
# Expect: 200+ tests passing
```

---

## Verification Checklist

After all 8 safeguards implemented:

- [ ] All safeguard tests written (4-path coverage each)
- [ ] All tests passing
- [ ] `pnpm test --run` shows 200+ passing tests
- [ ] `./tdd-gate.sh green` passes
- [ ] `./tdd-gate.sh refactor` passes
- [ ] `./tdd-gate.sh quality` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm typecheck` clean
- [ ] All code reviews approved
- [ ] Ready for Phase 2 rollout

---

## Effort Estimate

```
Safeguard 1 (Checksums):       2-3 hours
Safeguard 2 (File Watcher):    2-3 hours
Safeguard 3 (Performance):     1-2 hours
Safeguard 4 (Feature Flags):   1-2 hours
Safeguard 5 (Atomic Writes):   2-3 hours
Safeguard 6 (Compatibility):   1 hour
Safeguard 7 (Rollout):         1 hour
Safeguard 8 (Rollback):        1-2 hours

Total: 12-16 hours (parallelizable)
```

---

## Next Steps

1. **Pick a safeguard** (recommend starting with #1 or #4 - simpler)
2. **Write tests first** (RED phase)
3. **Implement** (GREEN phase)
4. **Refactor** (REFACTOR phase)
5. **Run gates** (verify TDD compliance)
6. **Repeat** for remaining 7 safeguards

---

**Authority**: TDD_CORE.md (test-first, 4-path coverage mandatory)  
**Status**: Ready for team execution  
**Risk Reduction**: 40% → <2% (upon completion)
