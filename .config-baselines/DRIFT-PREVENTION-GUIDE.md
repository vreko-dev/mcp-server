# Configuration Drift Prevention Guide

This guide explains how the monorepo prevents configuration drift across 150+ config files using automated scanning, hashing, and allowlisting.

## Quick Start

```bash
# Scan current patterns
node tooling/scripts/scan-config-patterns.mjs --report

# Check for drift against baseline
pnpm config:check-drift

# Update baseline after intentional changes
pnpm config:update-baseline
```

## Architecture

### 1. **Baseline Manifest** (`.config-baselines/manifest.json`)

Stores SHA-256 hashes of critical config files:
- Root-level configs: `biome.json`, `tsconfig.base.json`, `turbo.json`, `.lefthook.yml`, `.snapbackrc`
- Workspace-specific: `packages/platform/drizzle.config.ts`

```json
{
  "version": "1.0.0",
  "configs": {
    "biome.json": {
      "hash": "sha256:e4e6a8...",
      "scope": "root-only",
      "allowWorkspaceExtend": false
    }
  }
}
```

### 2. **Allowlist** (`tooling/scripts/config-drift-allowlist.json`)

Defines which workspace configs can deviate from base configs and how:

```json
{
  "workspaceConfigs": {
    "apps/*/biome.json": {
      "reason": "Apps can extend root biome.json",
      "requiresExtends": "../../biome.json"
    },
    "packages/*/tsconfig.json": {
      "requiresExtends": ["../../tsconfig.base.json"]
    }
  }
}
```

**Key fields:**
- `requiresExtends`: null → allow any content (e.g., app-specific .snapbackrc)
- `requiresExtends`: string/array → must extend these base configs
- `ignoredPaths`: glob patterns to completely skip

### 3. **Drift Detection Hook** (`.lefthook.yml`)

Runs on every `git commit`:

```yaml
pre-commit:
  commands:
    config-drift-detect:
      run: node tooling/scripts/config-drift-check.mjs --warn-only
```

**How it works:**
1. Gets staged files from git index
2. Looks up their hashes in `manifest.json`
3. Compares actual hashes against expected
4. Checks allowlist for exceptions
5. Fails with details if unallowed drift detected

### 4. **Pattern Scanner** (`tooling/scripts/scan-config-patterns.mjs`)

Analyzes all configs to identify:

```bash
node tooling/scripts/scan-config-patterns.mjs --report
```

Output includes:
- **Categorization**: Which configs exist at root/app/package level
- **Inheritance patterns**: Who extends whom
- **Schema variations**: Configs with same name but different structure
- **Drift risks**: Duplication, version variation, orphaned files

## Workflow

### Normal Development

1. **Make config changes** → Edit file
2. **Stage changes** → `git add config-file`
3. **Pre-commit hook runs** → Drift detection validates
4. **If allowed** → Commit succeeds ✅
5. **If forbidden** → Commit fails, shows what drifted ❌

### After Intentional Changes

If you modify a baseline config (e.g., updating `biome.json`):

```bash
# Option 1: Warn only (let it through, mark for review)
git commit  # Hook runs with --warn-only flag

# Option 2: Update baseline (for intentional changes)
pnpm config:update-baseline

# Verify what changed
git diff .config-baselines/manifest.json
```

## Common Scenarios

### ✅ Scenario 1: Extend Root Config in App

**File**: `apps/web/biome.json`
```json
{
  "extends": "../../biome.json",
  "json": {
    "parser": {
      "allowComments": true
    }
  }
}
```

**Result**: ✅ PASS - Allowed by allowlist pattern `apps/*/biome.json`

### ❌ Scenario 2: Drift in Root Config

**File**: `biome.json` (root)
- Accidentally modified to fix a linting rule
- Hash no longer matches manifest

**Detection**:
```
❌ Error: Configuration drift detected
   📄 biome.json
      Hash mismatch (config drift detected)
      Expected: sha256:e4e6a8...
      Actual:   sha256:xyz123...

💡 If these changes are intentional, update the baseline:
   pnpm config:update-baseline
```

**Fix**:
```bash
# Option 1: Revert the change
git checkout biome.json

# Option 2: Accept change (intentional)
pnpm config:update-baseline
git add .config-baselines/manifest.json
```

### ⚠️ Scenario 3: Workspace Config Not Extending Base

**File**: `packages/core/tsconfig.json`
```json
{
  "compilerOptions": { "strict": false }
}
```

**Detection**:
```
❌ Error: Configuration drift detected
   📄 packages/core/tsconfig.json
      Workspace config must extend base config: tsconfig.base.json
```

**Fix**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "strict": false }
}
```

### 🤝 Scenario 4: New Workspace Config

Adding `apps/cli/biome.json`:

```bash
# First, create the file extending the base
cat > apps/cli/biome.json << 'EOF'
{
  "extends": "../../biome.json"
}
EOF

git add apps/cli/biome.json
git commit -m "config: add biome config for cli app"
# ✅ PASS - Matches allowlist pattern
```

## Maintenance

### Monthly Review

```bash
# Scan for new patterns and risks
node tooling/scripts/scan-config-patterns.mjs --report

# Check results
cat .config-baselines/PATTERNS.md
```

**Look for:**
- New schema variations (different apps with different config structures)
- Unused configs (orphaned files)
- Version drift (package.json version inconsistencies)
- Inheritance loops (circular extends)

### Updating Allowlist

When you add a new workspace config type:

1. **Create the file** (following inheritance rules)
2. **Commit** (hook validates it)
3. **Add to allowlist** if different from default

Example: Adding Vite config to apps:

```json
// tooling/scripts/config-drift-allowlist.json
{
  "workspaceConfigs": {
    "apps/*/vite.config.ts": {
      "reason": "Apps can extend root vite config",
      "requiresExtends": "../../vite.config.ts"
    }
  }
}
```

## CI/CD Integration

The drift detection runs in GitHub Actions pre-commit hooks:

```yaml
# .github/workflows/pull-request.yml
- name: Validate config drift
  run: node tooling/scripts/config-drift-check.mjs
```

**Prevents:**
- Accidental config changes
- Inconsistent workspace structures
- Outdated version pins
- Missing inheritance relationships

## Troubleshooting

### "Config baseline manifest not found"

**Cause**: `.config-baselines/manifest.json` missing (fresh checkout)

**Fix**:
```bash
pnpm config:create-baseline
```

### "Hash mismatch" on safe changes

**Cause**: Intentional changes not reflected in manifest

**Fix**:
```bash
pnpm config:update-baseline
git add .config-baselines/manifest.json
```

### Hook running too slowly

**Cause**: Checking all configs on every commit

**Optimize**:
```bash
# Only check staged files (default)
node tooling/scripts/config-drift-check.mjs

# Force full check
node tooling/scripts/config-drift-check.mjs --all
```

## Scripts

**`pnpm config:create-baseline`**
- Generates initial manifest for all tracked configs
- Run once per fresh clone

**`pnpm config:update-baseline`**
- Updates manifest hashes to current state
- Run after intentional root config changes

**`pnpm config:check-drift`**
- Validates against manifest
- Returns exit code 1 if drift detected
- Used in pre-commit hook

**`node tooling/scripts/scan-config-patterns.mjs`**
- Analyzes all config files
- `--report`: Generate markdown report
- `--json`: Output raw JSON data
- `--fix`: Auto-generate allowlist suggestions

## Related Files

- **Validator**: `tooling/scripts/config-drift-check.mjs`
- **Scanner**: `tooling/scripts/scan-config-patterns.mjs`
- **Hook config**: `.lefthook.yml` (pre-commit section)
- **Baseline**: `.config-baselines/manifest.json`
- **Allowlist**: `tooling/scripts/config-drift-allowlist.json`
- **Documentation**: `.config-baselines/README.md`

## Best Practices

1. **Always extend from base configs** when creating workspace versions
2. **Keep root configs stable** - they're the source of truth
3. **Review drift PRs carefully** - changes to root configs affect entire monorepo
4. **Use allowlist for variance** - document why workspace configs differ
5. **Scan monthly** - catch drift risks early

## Performance

- **Drift check**: <100ms (only staged files)
- **Full scan**: <500ms (all configs)
- **Pattern analysis**: <1s (includes inheritance analysis)
- **CI integration**: No-op when no config files changed

---

**Last Updated**: 2025-12-13  
**Manifest Version**: 1.0.0  
**Tracked Configs**: 6+ critical files  
**Workspace Configs**: ~150 app/package configs
