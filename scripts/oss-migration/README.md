# Phase 1 OSS Migration - Quick Start

**Status**: Ready to execute
**Duration**: 2-3 days (with manual review)
**Goal**: Create `packages-oss/` with infrastructure, contracts, and SDK

---

## Execution Order

### Option 1: Automated (Recommended)
```bash
# Run master script (handles all steps)
chmod +x scripts/oss-migration/*.sh
./scripts/oss-migration/run-migration.sh
```

### Option 2: Manual (Step-by-step)
```bash
# Step 1: Setup
./scripts/oss-migration/setup-oss-packages.sh
pnpm test -- validate-oss-structure

# Step 2: Split infrastructure
./scripts/oss-migration/split-infrastructure.sh
# MANUAL: Update PostHog imports in private packages
pnpm test -- infrastructure-split

# Step 3: Filter contracts
./scripts/oss-migration/filter-contracts.sh
pnpm test -- contracts-filter

# Step 4: Migrate SDK
./scripts/oss-migration/migrate-sdk.sh
pnpm test -- sdk-migration

# Step 5: Finalize
pnpm install
pnpm build
pnpm test
```

---

## What Gets Created

```
packages-oss/
├── infrastructure/          # @snapback-oss/infrastructure
│   ├── src/
│   │   ├── logging/        # Pino logger
│   │   ├── metrics/        # Generic metrics
│   │   └── tracing/        # OpenTelemetry
│   └── package.json
├── contracts/              # @snapback-oss/contracts
│   ├── src/
│   │   ├── auth/          # Auth types (filtered)
│   │   ├── events/        # Events (no infrastructure.ts)
│   │   └── types/         # Public types
│   └── package.json
└── sdk/                    # @snapback-oss/sdk
    ├── src/               # Full SDK (no better-sqlite3)
    └── package.json

packages/
└── analytics-infra/        # @snapback/analytics-infra (NEW, private)
    ├── src/posthog/       # PostHog moved here
    └── package.json
```

---

## Manual Actions Required

### During Migration

1. **After infrastructure split**:
   ```bash
   # Find files that import PostHog from old infrastructure
   grep -r "@snapback/infrastructure.*posthog" packages/ apps/

   # Update them to:
   import { ... } from "@snapback/analytics-infra";
   ```

2. **After SDK migration**:
   ```bash
   # Check for better-sqlite3 usage
   grep -r "better-sqlite3" packages-oss/sdk/src

   # Remove or make conditional if found
   ```

3. **Update pnpm-workspace.yaml**:
   ```yaml
   packages:
     - 'packages/*'
     - 'packages-oss/*'  # Add this line
     - 'apps/*'
   ```

### After Migration

1. **Verify builds**:
   ```bash
   pnpm --filter "@snapback-oss/*" build
   ```

2. **Run tests**:
   ```bash
   pnpm --filter "@snapback-oss/*" test
   ```

3. **Check for IP leaks**:
   ```bash
   grep -r "tier\|subscription\|stripe" packages-oss/
   grep -r "posthog\|analytics" packages-oss/
   ```

---

## Rollback

If anything goes wrong:
```bash
./scripts/oss-migration/migration-rollback.sh
```

This will:
- Remove `packages-oss/`
- Remove `packages/analytics-infra/`
- Restore backups
- Reinstall dependencies

**Note**: Does NOT restore import changes in private packages (manual review needed)

---

## Validation

### Quick Check
```bash
# Structure
tree packages-oss -L 2

# Builds
pnpm --filter "@snapback-oss/*" build

# Tests
pnpm test -- validate-oss-structure
pnpm test -- infrastructure-split
pnpm test -- contracts-filter
pnpm test -- sdk-migration
```

### Detailed Check
```bash
# No PostHog in OSS
grep -r "posthog" packages-oss/  # Should be empty

# No private imports
grep -r "@snapback/platform\|@snapback/core\|@snapback/analytics[^-]" packages-oss/  # Should be empty

# Has OSS imports
grep -r "@snapback-oss" packages-oss/  # Should find many
```

---

## Troubleshooting

### Build Fails
```bash
# Check TypeScript errors
pnpm --filter "@snapback-oss/infrastructure" typecheck
pnpm --filter "@snapback-oss/contracts" typecheck
pnpm --filter "@snapback-oss/sdk" typecheck

# Check for missing dependencies
pnpm --filter "@snapback-oss/*" install
```

### Tests Fail
```bash
# Run individual test files
pnpm test scripts/oss-migration/__tests__/validate-oss-structure.test.ts
pnpm test scripts/oss-migration/__tests__/infrastructure-split.test.ts
pnpm test scripts/oss-migration/__tests__/contracts-filter.test.ts
pnpm test scripts/oss-migration/__tests__/sdk-migration.test.ts
```

### Import Errors
```bash
# Find all old imports that need updating
grep -r "from.*@snapback/infrastructure" packages/ apps/ | grep -v node_modules
grep -r "from.*@snapback/contracts[^-]" packages/ apps/ | grep -v node_modules
```

---

## TODO Markers

Search for these if you need to continue:
```bash
grep -r "TODO(phase1)" scripts/oss-migration/
grep -r "FIXME(phase1)" scripts/oss-migration/
grep -r "TEST(phase1)" scripts/oss-migration/
grep -r "VALIDATE(phase1)" scripts/oss-migration/
```

---

## Success Criteria

- [ ] `packages-oss/` directory exists with 3 packages
- [ ] `packages/analytics-infra/` exists with PostHog code
- [ ] All OSS packages build without errors
- [ ] No PostHog/tier/subscription logic in OSS packages
- [ ] SDK uses `@snapback-oss/*` dependencies
- [ ] Full monorepo test suite passes
- [ ] No better-sqlite3 in OSS SDK

---

## Next Phase

After Phase 1 is complete and validated:
- **Phase 2**: Extract policy-engine (Weeks 3-4)
- **Phase 3**: Create VSCode OSS variant (Weeks 5-6)
- **Phase 4**: Set up CI/CD sync (Week 7)
