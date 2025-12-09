# Configuration Drift Detection

This system protects critical configuration files from unintended changes and ensures consistency across the monorepo.

## What This Protects

- **biome.json** - Code quality and formatting rules
- **tsconfig.base.json** - TypeScript compiler settings shared across packages
- **.lefthook.yml** - Git hook automation and quality gates
- **turbo.json** - Build orchestration and caching configuration
- **drizzle configs** - Database schema management and migrations
- **.snapbackrc** - SnapBack file protection policies

## How It Works

Configuration files are tracked by SHA-256 hash in `.config-baselines/manifest.json`. When you commit changes, a pre-commit hook validates that config files match their expected hashes. This ensures all config changes are intentional and reviewed.

## Updating Configs (Normal Workflow)

When you need to legitimately change a tracked configuration:

1. **Edit the config file** as you normally would
   ```bash
   vim biome.json  # or any tracked config
   ```

2. **Attempt to commit** - the hook will detect drift
   ```bash
   git add biome.json
   git commit -m "chore: update biome rules"
   # ❌ Configuration drift detected: biome.json
   ```

3. **Update the baseline** to acknowledge the change
   ```bash
   pnpm config:update-baseline
   # Shows changes and asks for confirmation
   # Updates .config-baselines/manifest.json automatically
   ```

4. **Commit both changes together**
   ```bash
   git add biome.json .config-baselines/manifest.json
   git commit -m "chore: update biome rules and baseline"
   # ✅ Success
   ```

## Workspace Configurations

Workspace-specific configs (e.g., `apps/web/biome.json`) can extend base configurations. These are allowlisted and won't trigger drift detection IF they properly extend the base config:

```json
{
  "extends": "../../biome.json",
  "linter": {
    "rules": {
      // Workspace-specific overrides OK
    }
  }
}
```

## Why This Matters

Configuration drift can cause:

- **Inconsistent code quality** - Different rules in different packages
- **Build failures** - Mismatched compiler settings break CI/CD
- **Developer frustration** - "Works on my machine" due to config mismatches
- **Subtle bugs** - TypeScript strictness variations hide type errors
- **Security risks** - Unreviewed changes to git hooks or linting rules

## Emergency Bypass (Use Sparingly)

In genuine emergencies, you can bypass the hook:

```bash
git commit --no-verify -m "emergency: critical hotfix"
```

**Note**: Bypasses are logged for audit purposes. Use only when absolutely necessary (production outage, critical security fix, etc.).

## Troubleshooting

### "Drift detected" but I haven't changed the config

This usually means:

1. **Someone else changed it** - Pull latest changes first
2. **Whitespace changes** - Even formatting changes will trigger detection
3. **Git conflict resolution** - Merge/rebase may have modified the file

**Solution**: Review the actual changes with `git diff`, then update baseline if intentional.

### Update baseline command not working

Ensure you're in the repository root and have uncommitted changes to tracked configs:

```bash
cd /path/to/SnapBack-Site
git status  # Should show modified config files
pnpm config:update-baseline
```

### False positive for workspace config

Workspace configs must properly extend base configs. Check that your workspace config includes:

```json
{
  "extends": "../../biome.json"  // or appropriate relative path
}
```

If it doesn't extend the base, it will be treated as drift (intentionally).

## Performance

The drift detection hook is optimized for speed:

- **Target**: <500ms execution time
- **Strategy**: SHA-256 hash comparison (no parsing)
- **Scope**: Only validates staged files (not entire repo)
- **Parallelization**: Multiple configs checked concurrently

## Questions?

See the main project documentation or ask in #engineering-ops Slack channel.
