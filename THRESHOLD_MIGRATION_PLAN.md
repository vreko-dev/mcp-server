# Threshold Migration Plan

## Overview
Migrate all hardcoded thresholds from VSCode, CLI, and MCP applications to use centralized `@snapback/sdk` THRESHOLDS configuration.

## Phase 15: Full Threshold Migration

### VSCode Extension Migration

#### File: `apps/vscode/src/constants.ts`

**Current Hardcoded Values:**
```typescript
export const TIMING_CONSTANTS = {
  SNAPSHOT_DEBOUNCE_MS: 5 * 60 * 1000,        // 300000ms (5 min)
  SESSION_IDLE_TIMEOUT_MS: 105 * 1000,        // 105000ms (105 sec)
  SESSION_MAX_DURATION_MS: 60 * 60 * 1000,    // 3600000ms (1 hour)
  LOCK_TIMEOUT_MS: 30000,                     // 30s (no SDK equivalent - DB specific)
  COOLDOWN_DEFAULT_MS: 5 * 60 * 1000,         // 300000ms (5 min)
};

export const SIZE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,            // 10MB
  MAX_TOTAL_SIZE: 500 * 1024 * 1024,          // 500MB
  MAX_FILES: 10000,
  DEFAULT_PAGE_SIZE: 100,                     // No SDK equivalent - UI specific
  MAX_PAGE_SIZE: 1000,                        // No SDK equivalent - UI specific
  DEFAULT_MAX_SNAPSHOTS: 500,
  DEFAULT_MAX_RETENTION_MS: 30 * 24 * 60 * 60 * 1000,  // 30 days (no SDK equivalent)
};

export const DETECTION_THRESHOLDS = {
  SECRET_DETECTION_THRESHOLD: 4.0,            // UNUSED - dead code
  HIGH_ENTROPY_WEIGHT: 3,                     // UNUSED - dead code
};

export const RISK_THRESHOLDS = {
  BLOCK_SCORE: 8,
  WARN_SCORE: 5,
};
```

**Mapping to SDK Thresholds:**

| VSCode Constant | SDK Threshold | Match | Notes |
|----------------|---------------|-------|-------|
| `TIMING_CONSTANTS.SESSION_IDLE_TIMEOUT_MS` | `THRESHOLDS.session.idleTimeout` | ✅ 105000 | Perfect match |
| `TIMING_CONSTANTS.SESSION_MAX_DURATION_MS` | `THRESHOLDS.session.maxSessionDuration` | ✅ 3600000 | Perfect match |
| `TIMING_CONSTANTS.COOLDOWN_DEFAULT_MS` | `THRESHOLDS.protection.otherCooldown` | ✅ 300000 | Perfect match |
| `TIMING_CONSTANTS.SNAPSHOT_DEBOUNCE_MS` | `THRESHOLDS.protection.otherCooldown` | ✅ 300000 | Same as COOLDOWN_DEFAULT_MS |
| `TIMING_CONSTANTS.LOCK_TIMEOUT_MS` | N/A | - | DB-specific, keep local |
| `SIZE_LIMITS.MAX_FILE_SIZE` | `THRESHOLDS.resources.checkpointMaxFileSize` | ✅ 10MB | Perfect match |
| `SIZE_LIMITS.MAX_TOTAL_SIZE` | `THRESHOLDS.resources.checkpointMaxTotalSize` | ✅ 500MB | Perfect match |
| `SIZE_LIMITS.MAX_FILES` | `THRESHOLDS.resources.checkpointMaxFiles` | ✅ 10000 | Perfect match |
| `SIZE_LIMITS.DEFAULT_MAX_SNAPSHOTS` | `THRESHOLDS.resources.dedupCacheSize` | ✅ 500 | Perfect match |
| `SIZE_LIMITS.DEFAULT_PAGE_SIZE` | N/A | - | UI-specific, keep local |
| `SIZE_LIMITS.MAX_PAGE_SIZE` | N/A | - | UI-specific, keep local |
| `SIZE_LIMITS.DEFAULT_MAX_RETENTION_MS` | N/A | - | Retention policy, keep local |
| `DETECTION_THRESHOLDS.SECRET_DETECTION_THRESHOLD` | `THRESHOLDS.detection.entropyThreshold` | ❌ Dead code | Remove (unused) |
| `DETECTION_THRESHOLDS.HIGH_ENTROPY_WEIGHT` | N/A | ❌ Dead code | Remove (unused) |
| `RISK_THRESHOLDS.BLOCK_SCORE` | `THRESHOLDS.risk.blockingThreshold` | ✅ 8.0 | Perfect match |
| `RISK_THRESHOLDS.WARN_SCORE` | `THRESHOLDS.risk.highThreshold` | ✅ 5.0 | Perfect match |

**Migration Strategy for constants.ts:**
1. Import THRESHOLDS from `@snapback/sdk`
2. Replace matching constants with SDK references
3. Keep VSCode-specific constants (LOCK_TIMEOUT_MS, pagination, retention)
4. Remove unused DETECTION_THRESHOLDS entirely (dead code)

#### Files Using constants.ts

Files that import from constants.ts will automatically use centralized thresholds once constants.ts is updated:
- `apps/vscode/src/handlers/CooldownService.ts` - Uses SNAPSHOT_DEBOUNCE_MS, SESSION_IDLE_TIMEOUT_MS
- `apps/vscode/src/snapshot/SnapshotManager.ts` - Uses SIZE_LIMITS
- `apps/vscode/src/storage/SqliteSnapshotStorage.ts` - Uses LOCK_TIMEOUT_MS, SIZE_LIMITS

### MCP Server Migration

#### File: `apps/mcp-server/src/index.ts`

**Current Hardcoded Values:**
```typescript
const PERFORMANCE_BUDGETS: Record<string, number> = {
  analyze_risk: 200,
  create_checkpoint: 500,
};
```

**Migration Strategy:**
These are operational performance budgets, not data thresholds. Options:
1. **Keep local** - These are MCP-specific operational constraints
2. **Add to SDK** - Add `qos.performanceBudgets` category
3. **Document** - Add comments referencing SDK QoS thresholds for context

**Recommendation:** Keep local with documentation linking to SDK QoS thresholds for context.

### CLI Migration

#### Status
Need to audit CLI codebase for hardcoded thresholds.

## Migration Checklist

### Phase 1: VSCode Constants Migration
- [ ] Update `apps/vscode/src/constants.ts` to import and use SDK THRESHOLDS
- [ ] Remove unused DETECTION_THRESHOLDS
- [ ] Verify all importing files still work
- [ ] Update tests that reference old constants

### Phase 2: Component-Level Migration
- [ ] Audit `CooldownService.ts` - verify cooldown logic
- [ ] Audit `SnapshotManager.ts` - verify size limits
- [ ] Audit `SqliteSnapshotStorage.ts` - verify database config

### Phase 3: MCP Server
- [ ] Document PERFORMANCE_BUDGETS relationship to SDK QoS thresholds
- [ ] Consider adding performance budgets to SDK if used across multiple apps

### Phase 4: CLI
- [ ] Audit CLI for hardcoded thresholds
- [ ] Migrate CLI thresholds to SDK

### Phase 5: Testing
- [ ] Run VSCode unit tests
- [ ] Run VSCode integration tests
- [ ] Run MCP server tests
- [ ] Run CLI tests
- [ ] Manual testing of snapshot creation
- [ ] Manual testing of session coordination
- [ ] Manual testing of cooldown behavior

### Phase 6: Documentation
- [ ] Update VSCode README with SDK threshold references
- [ ] Update MCP README with SDK threshold references
- [ ] Create migration notes in CLAUDE.md files
- [ ] Document any thresholds kept local and why

## Benefits of Migration

1. **Single Source of Truth** - All threshold values centralized in SDK
2. **Consistency** - Same behavior across VSCode, CLI, MCP, Web
3. **Runtime Configuration** - Can tune thresholds without code changes
4. **A/B Testing** - Feature flags can modify thresholds dynamically
5. **Type Safety** - TypeScript ensures correct threshold access
6. **Documentation** - SDK includes inline docs for all thresholds
7. **Maintainability** - Change threshold once, updates everywhere
8. **Testing** - Shared test utilities for threshold validation

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing tests | High | Update tests incrementally |
| Behavioral changes from mismatched values | High | Verify exact value matches before migration |
| Circular dependencies | Medium | SDK has no dependencies on apps/* |
| Build time increase | Low | SDK is already a dependency |
| Runtime performance | Low | Constant access is O(1) |

## Success Criteria

- ✅ All VSCode tests pass
- ✅ All MCP tests pass
- ✅ All CLI tests pass
- ✅ Zero hardcoded threshold values in apps/* (except documented exceptions)
- ✅ All constants.ts files reference SDK THRESHOLDS
- ✅ Documentation updated
- ✅ Clean git diff showing systematic replacements
- ✅ No behavioral regressions in manual testing
