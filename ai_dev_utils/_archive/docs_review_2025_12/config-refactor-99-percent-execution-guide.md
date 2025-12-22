# SnapBack Config Refactor: 99.9% Accuracy Execution Guide

**Framework**: Hybrid TDD_CORE + config_refactor
**Target**: 99.9% accuracy, zero data loss
**Duration**: 10-15 days
**Status**: Ready to execute

---

## 🚨 PRE-FLIGHT CHECKLIST (BLOCKERS)

**Run these checks BEFORE starting. Any ❌ is a BLOCKER.**

```bash
# 1. ConfigStore test coverage (currently 0%)
vitest test/unit/storage/ConfigStore.red.test.ts --coverage
# Expected: ❌ 0% coverage (BLOCKER - must implement first)

# 2. Schema/type alignment
echo "Schema enum:" && rg '"Watched".*"Warning".*"Protected"' --type json
echo "Code types:" && rg 'watch.*warn.*block' src/types --type ts
# Expected: ❌ MISMATCH FOUND (BLOCKER - must fix first)

# 3. Baseline tests
vitest --run
# Expected: ✅ All passing (if ❌, fix broken tests first)

# 4. State directory structure
ls -la ai_dev_utils/state/config-refactor/
# Expected: ❌ Directory doesn't exist (create first)
```

### ⛔ STOP if ANY check fails. Fix blockers first.

---

## 📁 SETUP (30 minutes)

### 1. Create State Directory Structure

```bash
mkdir -p ai_dev_utils/state/config-refactor/{sessions,archives}
touch ai_dev_utils/state/config-refactor/{discovery-state.json,migration-state.json,cleanup-queue.json}
```

### 2. Initialize State Files

**discovery-state.json**:

```json
{
  "phase": "discovery",
  "passes_completed": [],
  "findings": {},
  "duplications": {},
  "opportunities": {}
}
```

**migration-state.json**:

```json
{
  "phase": "migrate",
  "opportunities_completed": [],
  "opportunities_in_progress": [],
  "opportunities_blocked": [],
  "test_coverage": {},
  "validation_results": {
    "schema_validation": "PENDING",
    "business_logic_validation": "PENDING",
    "multi_source_consistency": "PENDING"
  },
  "rollout_status": null
}
```

**cleanup-queue.json**:

```json
{
  "phase": "cleanup",
  "items": []
}
```

### 3. Fix Schema/Type Mismatch (BLOCKER FIX)

```bash
# Find the schema definition
rg "Watched.*Warning.*Protected" -A 5 -B 5

# Update to match code types
# Change: "enum": ["Watched", "Warning", "Protected"]
# To: "enum": ["watch", "warn", "block"]

# Or change code to match schema (your choice, but be consistent)
```

### 4. Implement ConfigStore Tests (BLOCKER FIX)

```bash
# Convert all TODO tests to real tests
# File: test/unit/storage/ConfigStore.red.test.ts

# Run until all pass
vitest test/unit/storage/ConfigStore.test.ts --watch
```

**Minimum tests required (15 total)**:

- ✅ Create config.json on first run
- ✅ Load valid v1 config
- ✅ Detect config version
- ✅ Backup before migration
- ✅ Migrate v1 → v2
- ✅ Validate after migration
- ✅ Rollback on migration failure
- ✅ Handle corrupted JSON
- ✅ Handle missing fields
- ✅ Atomic write operations
- ✅ Concurrent modification safety
- ✅ Large config performance (10K entries)
- ✅ Config precedence (VSCode > RC > Store)
- ✅ Multi-source consistency
- ✅ State validation

### 5. Create Test Fixtures

```bash
mkdir -p test/fixtures/configs/{v1,v2}

# Create 20+ fixtures
cat > test/fixtures/configs/v1/empty.json <<'EOF'
{"version": 1, "protections": {}, "engine": {"cooldown": 5000, "burstThreshold": 3}}
EOF

cat > test/fixtures/configs/v1/simple.json <<'EOF'
{
  "version": 1,
  "protections": {
    "src/**/*.ts": {"level": "watch"},
    "package.json": {"level": "block"}
  },
  "engine": {"cooldown": 5000, "burstThreshold": 3}
}
EOF

# Create: complex.json, edge-cases.json, corrupted.json, large.json
# (10K+ entries for performance testing)
```

---

## 🔍 PHASE 1: DISCOVERY (Days 1-2)

**Goal**: Map ALL config systems without changing code.

### Pass 1: Detection Tier System (SYS_DET)

```bash
# Find all detection tier references
rg "watch|warn|block" --type ts -g '!test' -g '!node_modules' > findings-det.txt

# Analyze results
node <<'EOF'
const fs = require('fs');
const findings = fs.readFileSync('findings-det.txt', 'utf8').split('\n');
const parsed = findings.map(line => {
  const [file, content] = line.split(':', 2);
  return { file, usage: content?.trim(), type: 'detection-tier' };
}).filter(f => f.usage);

console.log(JSON.stringify(parsed, null, 2));
EOF
```

**Update state**:

```bash
# Manually add to discovery-state.json under "findings.F_DETECT_TIER_USAGES"
# Or create script: ai_dev_utils/scripts/update-discovery-state.mjs
```

### Pass 2: Config Storage (SYS_CONFIG)

```bash
# Find all config store usages
rg "ConfigStore|ProtectionConfigManager|SnapBackRCLoader" --type ts -g '!test' > findings-config.txt

# Analyze (similar to above)
# Update discovery-state.json under "findings.F_CONFIG_STORE_USAGES"
```

### Pass 3: Schema Definitions (SYS_SCHEMA)

```bash
# Find all schemas
rg "z\.object|interface.*Config|type.*Config" --type ts > findings-schema.txt

# Analyze for mismatches
# Update discovery-state.json under "findings.F_SCHEMA_DEFINITIONS"
```

### Identify Duplications

```bash
# Manual analysis or script
# Look for:
# - Protection levels stored in multiple places
# - Config loading in multiple places
# - Validation in multiple places

# Add to discovery-state.json under "duplications"
# Example:
# "D_TIER_DETECTION": {
#   "sources": ["ConfigStore", "ProtectionConfigManager"],
#   "conflict": "Both store protection levels",
#   "recommendation": "Consolidate to ConfigStore"
# }
```

### Create Opportunities

Based on duplications, create opportunities:

```json
{
  "opportunities": {
    "OP_CONFIG_STORE_V2": {
      "priority": "P0",
      "impact": "High",
      "risk": "High",
      "estimated_loc": 500,
      "files_affected": 12,
      "tests_required": 50,
      "description": "Consolidate config storage to single source with migrations"
    },
    "OP_SCHEMA_ALIGNMENT": {
      "priority": "P0",
      "impact": "Medium",
      "risk": "Low",
      "estimated_loc": 50,
      "files_affected": 3,
      "tests_required": 10,
      "description": "Fix enum mismatch between schema and code"
    }
  }
}
```

### Human Checkpoint ✋

**Review findings**:

```bash
cat ai_dev_utils/state/config-refactor/discovery-state.json | jq '.opportunities'
```

**Decision**: Approve top opportunities? [y/N]

**Commit state**:

```bash
git add ai_dev_utils/state/config-refactor/discovery-state.json
git commit -m "discovery: config refactor opportunities identified"
```

---

## 🎨 PHASE 2: DESIGN (Days 3-5)

**For EACH approved opportunity, run TDD Phases 0-1.**

### TDD Phase 0: Architecture Audit

```bash
# Load TDD_CORE.md rules
# Search for existing patterns

# Check for duplicates
rg "migrateConfig|ConfigMigration|BackupConfig" --type ts

# Document canonical locations
# Verify not recreating existing utilities
```

**Gate**:

```bash
./ai_dev_utils/scripts/tdd-gate.sh audit
# Or manual checklist from TDD_CORE.md Phase 0
```

### TDD Phase 1: RED (Write Tests First)

**Write characterization tests**:

```typescript
// test/unit/storage/ConfigStore.test.ts
describe('ConfigStore v1 behavior', () => {
  test('loads valid v1 config', async () => {
    const config = await configStore.load(fixtures.v1.simple);
    expect(config.version).toBe(1);
    expect(config.protections['src/**/*.ts'].level).toBe('watch');
  });

  // 15+ tests for current behavior
});
```

**Write migration tests**:

```typescript
// test/migrations/v1-to-v2.test.ts
describe('v1 → v2 migration', () => {
  test('migrates simple config', async () => {
    const v1 = fixtures.v1.simple;
    const v2 = await migrateV1ToV2(v1); // ❌ Doesn't exist yet

    expect(v2.version).toBe(2);
    expect(v2.protections['src/**/*.ts'].level).toBe('watch');
  });

  test('backs up before migration', async () => {
    const v1 = fixtures.v1.simple;
    await migrateV1ToV2(v1);

    const backup = await readBackup();
    expect(backup).toEqual(v1);
  });

  test('rolls back on failure', async () => {
    const v1 = fixtures.v1.corrupted;
    await expect(migrateV1ToV2(v1)).rejects.toThrow();

    const current = await configStore.load();
    expect(current).toEqual(v1); // Restored from backup
  });

  // 20+ migration scenarios
});
```

**Write property-based tests**:

```typescript
import fc from 'fast-check';

test('any valid v2 config validates', () => {
  const configArbitrary = fc.record({
    version: fc.constant(2),
    protections: fc.dictionary(
      fc.string(),
      fc.record({
        pattern: fc.string(),
        level: fc.constantFrom('watch', 'warn', 'block'),
      })
    ),
    engine: fc.record({
      cooldown: fc.integer({ min: 0, max: 60000 }),
      burstThreshold: fc.integer({ min: 1, max: 100 }),
    }),
  });

  fc.assert(
    fc.property(configArbitrary, (config) => {
      const result = ConfigSchemaV2.safeParse(config);
      expect(result.success).toBe(true);
    })
  );
});
```

**Run tests (should FAIL)**:

```bash
vitest test/migrations --run
# Expected: 50+ tests FAILING (correct for RED phase)
```

**Gate**:

```bash
./ai_dev_utils/scripts/tdd-gate.sh red

# Checks:
# ✅ Tests fail correctly
# ✅ Test coverage plan >90 scenarios
# ✅ Fixtures cover edge cases
```

### Design Schemas

**Create ConfigSchemaV2**:

```typescript
// src/storage/schemas/ConfigSchemaV2.ts
import { z } from 'zod';

export const ConfigSchemaV2 = z.object({
  version: z.literal(2),
  protections: z.record(z.object({
    pattern: z.string(),
    level: z.enum(['watch', 'warn', 'block']), // ✅ Fixed mismatch
    reason: z.string().optional(),
    clusterId: z.string().optional(),
  })),
  engine: z.object({
    cooldown: z.number().min(0).max(60000),
    burstThreshold: z.number().min(1).max(100),
  }),
});

export type ConfigV2 = z.infer<typeof ConfigSchemaV2>;
```

### Design Migration Function

```typescript
// src/storage/migrations/v1-to-v2.ts
import type { ConfigV1 } from './ConfigSchemaV1';
import type { ConfigV2 } from './ConfigSchemaV2';

export async function migrateV1ToV2(v1: ConfigV1): Promise<ConfigV2> {
  // Transform structure (keeping same data)
  return {
    version: 2,
    protections: Object.fromEntries(
      Object.entries(v1.protections).map(([pattern, config]) => [
        pattern,
        {
          pattern,
          level: config.level,
          reason: config.reason,
        },
      ])
    ),
    engine: v1.engine,
  };
}
```

**Update state**:

```bash
# Add to migration-state.json
{
  "opportunities_in_progress": ["OP_CONFIG_STORE_V2"],
  "design_artifacts": {
    "OP_CONFIG_STORE_V2": {
      "schema": "src/storage/schemas/ConfigSchemaV2.ts",
      "migration": "src/storage/migrations/v1-to-v2.ts",
      "tests_written": 50,
      "status": "design_complete"
    }
  }
}

git add ai_dev_utils/state/config-refactor/migration-state.json
git commit -m "design: ConfigStore v2 schema + migration (50 tests RED)"
```

---

## ✅ PHASE 3: MIGRATE (Days 6-9)

**Run TDD Phases 2-5 for each opportunity.**

### TDD Phase 2: GREEN (Make Tests Pass)

**Implement ConfigStore v2**:

```typescript
// src/storage/ConfigStore.ts
import { ConfigSchemaV2 } from './schemas/ConfigSchemaV2';
import { migrateV1ToV2 } from './migrations/v1-to-v2';

export class ConfigStore {
  private configPath: vscode.Uri;
  private backupPath: vscode.Uri;

  async load(): Promise<ConfigV2> {
    const raw = await this.readFile();

    // Check version
    if (!raw.version || raw.version === 1) {
      return await this.migrateToV2(raw);
    }

    // Validate v2
    const result = ConfigSchemaV2.safeParse(raw);
    if (!result.success) {
      throw new Error(`Invalid config: ${result.error.message}`);
    }

    return result.data;
  }

  private async migrateToV2(v1: unknown): Promise<ConfigV2> {
    // Backup before migration
    await this.backup(v1);

    try {
      // Migrate
      const v2 = await migrateV1ToV2(v1);

      // Validate
      const result = ConfigSchemaV2.safeParse(v2);
      if (!result.success) {
        throw new Error(`Migration validation failed: ${result.error.message}`);
      }

      // Write v2
      await this.write(v2);

      return v2;
    } catch (error) {
      // Rollback on failure
      await this.rollback();
      throw error;
    }
  }

  async backup(config: unknown): Promise<void> {
    await vscode.workspace.fs.writeFile(
      this.backupPath,
      Buffer.from(JSON.stringify(config, null, 2))
    );
  }

  async rollback(): Promise<void> {
    const backup = await vscode.workspace.fs.readFile(this.backupPath);
    await vscode.workspace.fs.writeFile(this.configPath, backup);
  }

  private async readFile(): Promise<unknown> {
    const content = await vscode.workspace.fs.readFile(this.configPath);
    return JSON.parse(content.toString());
  }

  private async write(config: ConfigV2): Promise<void> {
    await vscode.workspace.fs.writeFile(
      this.configPath,
      Buffer.from(JSON.stringify(config, null, 2))
    );
  }
}
```

**Run tests**:

```bash
vitest test/migrations --run
# Expected: All 50 tests PASSING ✅
```

**Gate**:

```bash
./ai_dev_utils/scripts/tdd-gate.sh green

# Checks:
# ✅ All tests pass
# ✅ No placeholder tests
# ✅ Coverage >95%
```

### TDD Phase 3: REFACTOR

**Extract reusable components**:

```typescript
// src/storage/ConfigMigrator.ts
export class ConfigMigrator {
  private migrations: Map<string, MigrationFn> = new Map([
    ['1->2', migrateV1ToV2],
    // Future: ['2->3', migrateV2ToV3],
  ]);

  async migrate(from: number, to: number, config: unknown): Promise<ConfigV2> {
    const key = `${from}->${to}`;
    const migration = this.migrations.get(key);

    if (!migration) {
      throw new Error(`No migration path: ${key}`);
    }

    return await migration(config);
  }
}

// src/storage/ConfigValidator.ts
export class ConfigValidator {
  validate(config: unknown): ValidationResult {
    // Schema validation
    const schemaResult = ConfigSchemaV2.safeParse(config);
    if (!schemaResult.success) {
      return { valid: false, errors: schemaResult.error.errors };
    }

    // Business logic validation
    const logicErrors = this.validateBusinessLogic(schemaResult.data);
    return logicErrors.length > 0
      ? { valid: false, errors: logicErrors }
      : { valid: true };
  }

  private validateBusinessLogic(config: ConfigV2): string[] {
    const errors: string[] = [];

    // No duplicate patterns
    const patterns = Object.values(config.protections).map(p => p.pattern);
    if (new Set(patterns).size !== patterns.length) {
      errors.push('Duplicate patterns detected');
    }

    // Engine values sensible
    if (config.engine.cooldown > 60000) {
      errors.push('Cooldown too large (>60s)');
    }

    return errors;
  }
}
```

**Run tests again**:

```bash
vitest test/migrations --run
# Expected: Still all passing ✅
```

**Gate**:

```bash
./ai_dev_utils/scripts/tdd-gate.sh refactor

# Checks:
# ✅ Tests still pass
# ✅ Code complexity reduced
# ✅ DRY violations eliminated
```

### TDD Phase 4: QUALITY

**Run quality checks**:

```bash
# Type check
pnpm --filter @snapback/vscode type-check

# Lint
biome check apps/vscode/src/storage/

# Test coverage
vitest test/migrations --coverage

# Performance benchmarks
vitest test/unit/performance/config-migration.test.ts
```

**Gate**:

```bash
./ai_dev_utils/scripts/tdd-gate.sh quality

# Checks:
# ✅ Types pass
# ✅ Lint passes
# ✅ Coverage >95%
# ✅ Performance <1s for 10K entries
```

### TDD Phase 5: CERTIFICATION

**Final validation**:

```bash
# Full test suite
vitest --run

# Rollback testing
vitest test/migrations/rollback.test.ts --run

# Accuracy testing
vitest test/migrations/accuracy.test.ts --run

# Integration testing
vitest test/integration/config-consistency.test.ts --run
```

**Gate**:

```bash
./ai_dev_utils/scripts/tdd-gate.sh certify

# Checks:
# ✅ All requirements met
# ✅ Rollback verified
# ✅ 99.9%+ accuracy demonstrated
```

### Feature Flag Rollout

**Add feature flag**:

```typescript
// src/featureFlags.ts
export function useConfigStoreV2(): boolean {
  // Check PostHog or environment variable
  return process.env.FEATURE_CONFIG_V2 === 'true' ||
         posthog?.isFeatureEnabled('config_store_v2') === true;
}

// src/storage/index.ts
export async function loadConfig(): Promise<Config> {
  if (useConfigStoreV2()) {
    return await configStoreV2.load();
  } else {
    return await configStoreV1.load();
  }
}
```

**Rollout stages**:

```bash
# Stage 1: Internal (0%, manual override)
export FEATURE_CONFIG_V2=true
# Test for 1 day

# Stage 2: 10% users
# Update PostHog: config_store_v2 → 10%
# Monitor for 2 days

# Stage 3: 50% users
# Update PostHog: config_store_v2 → 50%
# Monitor for 2 days

# Stage 4: 100% users
# Update PostHog: config_store_v2 → 100%
# Monitor for 7 days (cooldown period)
```

**Monitoring**:

```typescript
// src/telemetry/configMigration.ts
export function trackMigrationSuccess(fromVersion: number, toVersion: number) {
  posthog?.capture('config_migration_success', {
    from: fromVersion,
    to: toVersion,
    duration: performance.now(),
  });
}

export function trackMigrationError(error: Error) {
  posthog?.capture('config_migration_error', {
    error: error.message,
    stack: error.stack,
  });

  // Alert if error rate >0.1%
  checkErrorRate();
}
```

**Update state**:

```bash
# migration-state.json
{
  "opportunities_completed": ["OP_CONFIG_STORE_V2"],
  "rollout_status": {
    "feature_flag": "config_store_v2",
    "rollout_percentage": 100,
    "error_rate": 0.0005,
    "user_reports": 0,
    "cooldown_start": "2025-12-11"
  }
}

git add ai_dev_utils/state/config-refactor/migration-state.json
git commit -m "migrate: ConfigStore v2 at 100% rollout (0.05% error rate)"
```

---

## 🧹 PHASE 4: CLEANUP (Days 10-15)

**After 7-day cooldown + validation.**

### Verify Prerequisites

```bash
# 1. Migration complete for 7+ days
MIGRATION_DATE=$(jq -r '.rollout_status.cooldown_start' migration-state.json)
DAYS_SINCE=$(( ($(date +%s) - $(date -d $MIGRATION_DATE +%s)) / 86400 ))

if [ $DAYS_SINCE -lt 7 ]; then
  echo "❌ Only $DAYS_SINCE days since migration (need 7+)"
  exit 1
fi

# 2. Error rate <0.1%
ERROR_RATE=$(jq -r '.rollout_status.error_rate' migration-state.json)
if [ $(echo "$ERROR_RATE > 0.001" | bc) -eq 1 ]; then
  echo "❌ Error rate too high: $ERROR_RATE (need <0.1%)"
  exit 1
fi

# 3. Tests still passing
vitest --run
if [ $? -ne 0 ]; then
  echo "❌ Tests failing"
  exit 1
fi

# 4. Feature flag at 100%
ROLLOUT=$(jq -r '.rollout_status.rollout_percentage' migration-state.json)
if [ $ROLLOUT -ne 100 ]; then
  echo "❌ Feature flag not at 100% (at $ROLLOUT%)"
  exit 1
fi

echo "✅ All prerequisites met"
```

### Create Cleanup Item

```bash
# Add to cleanup-queue.json
{
  "items": [
    {
      "id": "ARC_OLD_PROTECTION_MGR",
      "description": "Remove old ProtectionConfigManager after ConfigStore v2 migration",
      "files": [
        "src/protection/OldProtectionConfigManager.ts",
        "test/unit/protection/oldProtectionConfigManager.test.ts"
      ],
      "lines_to_delete": 247,
      "status": "READY",
      "prerequisites": {
        "migration_complete": true,
        "tests_passing": true,
        "feature_flag_100": true,
        "cooldown_complete": true,
        "human_approval": false
      },
      "backup_location": ".archive/2025-12-11/ARC_OLD_PROTECTION_MGR.tar.gz"
    }
  ]
}
```

### Archive Old Code

```bash
# Create archive
mkdir -p .archive/$(date +%Y-%m-%d)
tar -czf .archive/$(date +%Y-%m-%d)/ARC_OLD_PROTECTION_MGR.tar.gz \
  src/protection/OldProtectionConfigManager.ts \
  test/unit/protection/oldProtectionConfigManager.test.ts

# Verify archive
tar -tzf .archive/$(date +%Y-%m-%d)/ARC_OLD_PROTECTION_MGR.tar.gz
```

### Human Approval ✋

**Present for approval**:

```
Delete 247 lines from 2 files?

Files:
- src/protection/OldProtectionConfigManager.ts (216 lines)
- test/unit/protection/oldProtectionConfigManager.test.ts (31 lines)

Prerequisites:
✅ Migration complete (7 days ago)
✅ Tests passing (96% coverage)
✅ Feature flag at 100%
✅ Error rate 0.05% (<0.1%)
✅ 7-day cooldown complete
✅ Code archived to .archive/2025-12-11/

Backup: .archive/2025-12-11/ARC_OLD_PROTECTION_MGR.tar.gz
Rollback: git revert HEAD && tar -xzf ...

Approve deletion? [y/N]
```

### Delete Old Code (After Approval)

```bash
# Delete files
rm src/protection/OldProtectionConfigManager.ts
rm test/unit/protection/oldProtectionConfigManager.test.ts

# Run tests (should still pass)
vitest --run

# Commit
git add .
git commit -m "cleanup: remove old ProtectionConfigManager [ARC_OLD_PROTECTION_MGR]

Migration: ConfigStore v2 (stable for 7 days)
Error rate: 0.05%
Archived: .archive/2025-12-11/ARC_OLD_PROTECTION_MGR.tar.gz

Rollback procedure:
1. git revert HEAD
2. tar -xzf .archive/2025-12-11/ARC_OLD_PROTECTION_MGR.tar.gz
3. cp -r src/ /path/to/repo/
"

# Update state
# cleanup-queue.json: status → COMPLETE
git add ai_dev_utils/state/config-refactor/cleanup-queue.json
git commit -m "cleanup: ARC_OLD_PROTECTION_MGR complete"
```

---

## 📊 STATE VALIDATION (After Every Step)

### Automatic Validation

```bash
# Run after ANY change
cat > ai_dev_utils/scripts/validate-state.sh <<'SCRIPT'
#!/bin/bash
set -e

# 1. State files exist
for file in discovery-state.json migration-state.json cleanup-queue.json; do
  if [ ! -f "ai_dev_utils/state/config-refactor/$file" ]; then
    echo "❌ Missing state file: $file"
    exit 1
  fi
done

# 2. Valid JSON
for file in discovery-state.json migration-state.json cleanup-queue.json; do
  jq empty "ai_dev_utils/state/config-refactor/$file" 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "❌ Invalid JSON: $file"
    exit 1
  fi
done

# 3. Test coverage threshold
if [ -f "coverage/coverage-summary.json" ]; then
  COVERAGE=$(jq '.total.statements.pct' coverage/coverage-summary.json)
  if [ $(echo "$COVERAGE < 95" | bc) -eq 1 ]; then
    echo "⚠️ Coverage below 95%: $COVERAGE%"
  fi
fi

echo "✅ State validation passed"
SCRIPT

chmod +x ai_dev_utils/scripts/validate-state.sh
./ai_dev_utils/scripts/validate-state.sh
```

### Manual Validation Checkpoints

**After Discovery**:

```bash
jq '.opportunities | length' ai_dev_utils/state/config-refactor/discovery-state.json
# Should show number of opportunities identified
```

**After Design**:

```bash
jq '.opportunities_in_progress' ai_dev_utils/state/config-refactor/migration-state.json
# Should show opportunities being designed
```

**After Migration**:

```bash
jq '.rollout_status' ai_dev_utils/state/config-refactor/migration-state.json
# Should show rollout percentage and error rate
```

**After Cleanup**:

```bash
jq '.items[] | select(.status=="COMPLETE")' ai_dev_utils/state/config-refactor/cleanup-queue.json
# Should show completed cleanup items
```

---

## 🎯 SUCCESS CRITERIA CHECKLIST

### Code Quality ✅

- [ ] All tests passing (200+ total)
- [ ] Test coverage >95% (ConfigStore, migrations)
- [ ] No placeholder tests (`expect(true).toBe(true)`)
- [ ] No skipped tests without GitHub issue
- [ ] Type check passes (`pnpm type-check`)
- [ ] Lint passes (`biome check`)
- [ ] Performance benchmarks met (<1s for 10K entries)

### Migration Safety ✅

- [ ] Backup mechanism implemented and tested
- [ ] Rollback tested successfully (all 4 levels)
- [ ] 50+ migration scenarios tested
- [ ] Property-based tests passing (fast-check)
- [ ] Corruption recovery tested
- [ ] Concurrent modification tested
- [ ] Large-scale performance tested (10K+ entries)

### State Management ✅

- [ ] All state files up-to-date
- [ ] No config drift detected
- [ ] Multi-source consistency validated
- [ ] State validation passing
- [ ] Session summaries generated
- [ ] Git commits reference state files

### Production Readiness ✅

- [ ] Feature flag configured (PostHog)
- [ ] Monitoring dashboards ready
- [ ] Error rate <0.1%
- [ ] 7-day cooldown complete
- [ ] Human approval granted for cleanup
- [ ] Rollback procedures documented and tested

### Documentation ✅

- [ ] TDD_CORE.md updated (refactoring rules)
- [ ] refactor_system_arch.md complete
- [ ] Migration guide written
- [ ] Rollback procedures documented
- [ ] State files committed to git
- [ ] Session summaries archived

### Accuracy Validation ✅

- [ ] Migration success rate >99.9%
- [ ] Data loss incidents: 0
- [ ] Rollback success rate: 100%
- [ ] User-reported issues: 0
- [ ] Production uptime: 100%

---

## 🚨 EMERGENCY PROCEDURES

### Migration Failure in Production

```bash
# 1. Immediate rollback (30 seconds)
# Via PostHog dashboard: config_store_v2 → 0%

# 2. Alert team
echo "🚨 Config migration failure - rolled back to v1" | notify-team

# 3. Check logs
tail -100 ~/.vscode/extensions/snapback.*/extension.log | grep "config_migration"

# 4. Manual config restore (if needed)
cp ~/.config/Code/User/globalStorage/snapback.id/config.v1.bak \
   ~/.config/Code/User/globalStorage/snapback.id/config.json

# 5. Reload extension
# VSCode: Cmd+Shift+P → "Reload Window"
```

### State File Corruption

```bash
# 1. Restore from git
git checkout HEAD -- ai_dev_utils/state/config-refactor/*.json

# 2. Validate
./ai_dev_utils/scripts/validate-state.sh

# 3. If still broken, reinitialize
rm ai_dev_utils/state/config-refactor/*.json
# Manually recreate from scratch (see SETUP section)
```

### Tests Suddenly Failing

```bash
# 1. Check what changed
git diff HEAD~1

# 2. Isolate failing test
vitest test/migrations/v1-to-v2.test.ts --reporter=verbose

# 3. Check state files
./ai_dev_utils/scripts/validate-state.sh

# 4. Rollback last commit if needed
git revert HEAD
```

---

## 📈 PROGRESS TRACKING

### Daily Checklist

**End of each day**:

```bash
# 1. Update state files
# (manually or via script)

# 2. Commit state
git add ai_dev_utils/state/config-refactor/*.json
git commit -m "state: end of day $(date +%Y-%m-%d)"

# 3. Generate session summary
cat > ai_dev_utils/state/config-refactor/sessions/$(date +%Y-%m-%d).md <<EOF
# Session: $(date +%Y-%m-%d)

## Phase: [discovery|design|migrate|cleanup]
## Opportunity: [OP_*]

### Completed Today
- [ ] Task 1
- [ ] Task 2

### Tests Status
- Unit: X/Y passing
- Migration: X/Y passing
- Integration: X/Y passing

### Next Steps
- [ ] Task 3
- [ ] Task 4

### Blockers
- None

### Decisions Made
1. Decision 1 with rationale
2. Decision 2 with rationale
EOF

# 4. Run validation
./ai_dev_utils/scripts/validate-state.sh
```

### Weekly Checkpoint

**Every Friday**:

```bash
# 1. Full test suite
vitest --run --coverage

# 2. Review state files
cat ai_dev_utils/state/config-refactor/*.json | jq .

# 3. Check accuracy metrics
# (error rate, migration success rate, coverage)

# 4. Update project board/issues
# (GitHub, Linear, etc.)
```

---

## ⏱️ ESTIMATED TIMELINE

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Setup** | 0.5 days | State files, fix blockers, test infra |
| **Discovery** | 2 days | Findings, duplications, opportunities |
| **Design** | 3 days | Schemas, migrations, 50+ tests (RED) |
| **Migrate** | 4 days | Implementation, rollout, monitoring |
| **Cleanup** | 1.5 days | Archive, delete old code |
| **TOTAL** | **11 days** | 99.9% accuracy achieved |

**Variance**: ±20% (9-13 days depending on complexity)

---

## 🎓 KEY LEARNINGS

### What Makes This 99.9% Accurate

1. **Test-First** (TDD RED → GREEN): Can't break what's tested
2. **Backup Before Migration**: Zero data loss guarantee
3. **Rollback Capability**: 4 levels (flag, config, code, archive)
4. **Feature Flags**: Gradual rollout, instant rollback
5. **State Tracking**: JSON files prevent context drift
6. **Human Approval Gates**: Critical decisions reviewed
7. **7-Day Cooldown**: Production stability validation
8. **Property-Based Testing**: Catch edge cases automatically
9. **Multi-Source Validation**: Config consistency guaranteed
10. **Performance Benchmarks**: No regressions in production

### Common Pitfalls to Avoid

❌ Skipping backup before migration
❌ Big-bang deployment (no feature flags)
❌ Writing implementation before tests
❌ Ignoring schema/type mismatches
❌ Deleting old code before cooldown
❌ Manual state tracking (use JSON files)
❌ Assuming test coverage without measuring
❌ Trusting migrations without property testing
❌ Skipping human approval gates
❌ Not documenting rollback procedures

---

## 📞 WHEN TO ASK FOR HELP

**STOP and ask if**:

- Test coverage drops below 95%
- Error rate exceeds 0.1%
- Any test starts failing that was passing
- State files become inconsistent
- Migration takes >2 seconds for 10K entries
- User reports data loss
- Rollback fails during testing
- Schema/type mismatches discovered
- Ambiguous precedence rules found
- Feature flag system not working

**DO NOT proceed** without resolving blockers.

---

## ✅ COMPLETION VERIFICATION

**Before claiming 99.9% accuracy achieved**:

```bash
# Run full validation suite
./ai_dev_utils/scripts/final-validation.sh

# Expected output:
✅ All 200+ tests passing
✅ Coverage: 96% (>95% target)
✅ Migration success rate: 99.95% (>99.9% target)
✅ Data loss incidents: 0
✅ Error rate: 0.05% (<0.1% target)
✅ Rollback success: 100%
✅ Feature flag: 100% rollout
✅ Cooldown: 7 days complete
✅ State files: Valid and consistent
✅ Documentation: Complete

🎉 Config refactor complete with 99.9% accuracy!
```

---

**READY TO EXECUTE?**

Start with Pre-Flight Checklist → Setup → Phase 1: Discovery

Good luck! 🚀

---

**Last Updated**: 2025-12-11
**Version**: 1.0
**Frameworks**: TDD_CORE + config_refactor (Hybrid)
**Authority**: Synthesized from codebase analysis + TDD best practices
