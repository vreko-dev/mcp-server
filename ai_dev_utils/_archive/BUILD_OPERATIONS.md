# Build Operations Guide

**Last Updated:** 2025-12-11  
**Location:** `ai_dev_utils/scripts/`

This guide documents the automated build system maintenance scripts for the SnapBack monorepo.

---

## Quick Start

### Before Building
```bash
# Check build system health
./ai_dev_utils/scripts/pre-build-check.sh

# Auto-fix any detected issues
./ai_dev_utils/scripts/pre-build-check.sh --fix

# Then build
pnpm build
```

### Clean Build
```bash
# Safe cleanup (keeps node_modules)
./ai_dev_utils/scripts/clean-build.sh

# Full cleanup (removes everything)
./ai_dev_utils/scripts/clean-build.sh --deep

# Then rebuild
pnpm install
pnpm build
```

---

## Scripts Overview

### 1. `pre-build-check.sh` - Pre-Build Health Check

**Purpose:** Validates build system health BEFORE attempting to build.

**Usage:**
```bash
./ai_dev_utils/scripts/pre-build-check.sh              # Check only
./ai_dev_utils/scripts/pre-build-check.sh --fix        # Check and fix
./ai_dev_utils/scripts/pre-build-check.sh --verbose    # Show details
```

**What It Checks:**
- ✓ No stale `.next` build directories
- ✓ pnpm workspace configuration valid
- ✓ TypeScript configuration correct
- ✓ No orphaned build artifacts
- ✓ Package.json build scripts configured
- ✓ Dependencies integrity (lock file exists)

**Exit Codes:**
- `0`: All checks passed, ready to build
- `1`: Issues found, use `--fix` flag to resolve

**Example Output:**
```
═══════════════════════════════════════════════════════════════
Pre-Build Health Check
═══════════════════════════════════════════════════════════════

ℹ CHECK 1: Verifying no stale .next directories...
✓ No stale .next directories

ℹ CHECK 2: Validating pnpm-workspace.yaml...
✓ .next directory properly excluded

ℹ CHECK 3: Validating TypeScript configuration...
✓ TypeScript moduleResolution configured

ℹ CHECK 4: Checking for orphaned build artifacts...
✓ No orphaned build artifacts

ℹ CHECK 5: Validating package.json build scripts...
✓ Build script configured correctly

ℹ CHECK 6: Checking dependencies...
✓ pnpm lock file exists

═══════════════════════════════════════════════════════════════
Pre-Build Check Results
  ✓ Passed:  6
  ✗ Failed:  0
  ⚠ Warned:  0
═══════════════════════════════════════════════════════════════

ℹ ✓ Build system is ready!

Ready to run: pnpm build
```

---

### 2. `clean-build.sh` - Enhanced Build Cleanup

**Purpose:** Safely remove build artifacts and caches without permission errors.

**Usage:**
```bash
./ai_dev_utils/scripts/clean-build.sh              # Safe cleanup
./ai_dev_utils/scripts/clean-build.sh --deep       # Full cleanup
./ai_dev_utils/scripts/clean-build.sh --verbose    # Show details
```

**What It Removes:**

**Safe Cleanup (default):**
- `.next` directories (Next.js)
- `dist/` directories (build output)
- `build/` directories (build output)
- `.turbo/` directory (turbo cache)
- `*.tsbuildinfo` files (TypeScript cache)
- Next.js caches

**Deep Cleanup (with `--deep`):**
- Everything from safe cleanup PLUS:
- All `node_modules/` directories
- `pnpm-lock.yaml` (forces fresh install)

**Why Deep Cleanup:**
- Resolves dependency conflicts
- Clears corrupted caches
- Ensures clean environment for CI/CD
- Takes longer but guarantees fresh state

**Safety Features:**
- Validates paths before removal
- Refuses to remove `/` or `.`
- Skips missing directories gracefully
- Non-fatal errors (continues cleanup)
- Detailed logging of all operations

**Example Usage:**
```bash
# Before a problematic build
./ai_dev_utils/scripts/clean-build.sh --verbose
pnpm build

# If build still fails
./ai_dev_utils/scripts/clean-build.sh --deep --verbose
pnpm install
pnpm build
```

---

### 3. `build-verify.sh` - Build Issue Detection & Auto-Fix

**Purpose:** Detects and automatically fixes common build issues.

**Usage:**
```bash
./ai_dev_utils/scripts/build-verify.sh              # Detect only
./ai_dev_utils/scripts/build-verify.sh --fix        # Detect and fix
./ai_dev_utils/scripts/build-verify.sh --verbose    # Show details
```

**Issues It Detects:**

1. **Stale .next Directory**
   - Problem: Next.js generates `.next/standalone` which pnpm sees as duplicate workspace
   - Fix: Remove the directory
   - Impact: Prevents "Failed to add workspace" errors

2. **Missing pnpm-workspace.yaml Exclusion**
   - Problem: `.next` directory not excluded from workspace packages
   - Fix: Add `- "!apps/web/.next/**"` to pnpm-workspace.yaml
   - Impact: Prevents duplicate workspace detection

3. **Unused Imports**
   - Problem: Unused `Route` import in test utilities causes TypeScript errors
   - Fix: Remove unused imports
   - Impact: Allows build to proceed

4. **Logger Module Resolution**
   - Problem: Synchronous `require()` of optional dependency fails at build time
   - Fix: Implement lazy initialization pattern
   - Impact: Works in browser and Node.js environments

5. **Workspace Cache Issues**
   - Problem: Corrupted pnpm cache directories
   - Fix: Validates integrity (no auto-removal)
   - Impact: Identifies cache problems

**Fix Strategy:**
- Run with `--fix` to automatically resolve detected issues
- Manual review recommended for complex fixes
- Each fix includes detailed logging

---

## Common Scenarios

### Scenario 1: Build Fails with Workspace Error

**Error:**
```
Failed to add workspace "@snapback/web" from "apps/web/.next/standalone/apps/web/package.json", 
it already exists at "apps/web/package.json"
```

**Solution:**
```bash
./ai_dev_utils/scripts/pre-build-check.sh --fix
./ai_dev_utils/scripts/clean-build.sh
pnpm build
```

### Scenario 2: Build Fails with Module Resolution Error

**Error:**
```
Module not found: Can't resolve '@snapback/infrastructure'
```

**Solution:**
```bash
./ai_dev_utils/scripts/build-verify.sh --fix --verbose
./ai_dev_utils/scripts/clean-build.sh
pnpm build
```

### Scenario 3: Clean Command Hangs or Fails

**Problem:** Standard `pnpm clean` fails with permission errors

**Solution:**
```bash
# Use the enhanced clean script
./ai_dev_utils/scripts/clean-build.sh --verbose

# For severe issues
./ai_dev_utils/scripts/clean-build.sh --deep --verbose
pnpm install
```

### Scenario 4: Intermittent Build Failures

**Problem:** Build sometimes fails, sometimes succeeds

**Solution:**
```bash
# Full diagnostic
./ai_dev_utils/scripts/pre-build-check.sh --verbose
./ai_dev_utils/scripts/build-verify.sh --verbose

# Clean and rebuild
./ai_dev_utils/scripts/clean-build.sh --verbose
pnpm build
```

---

## Integration with package.json

You can add these scripts to `package.json` for convenient access:

```json
{
  "scripts": {
    "build:pre-check": "./ai_dev_utils/scripts/pre-build-check.sh",
    "build:pre-check:fix": "./ai_dev_utils/scripts/pre-build-check.sh --fix",
    "clean": "./ai_dev_utils/scripts/clean-build.sh",
    "clean:deep": "./ai_dev_utils/scripts/clean-build.sh --deep",
    "build:verify": "./ai_dev_utils/scripts/build-verify.sh",
    "build:verify:fix": "./ai_dev_utils/scripts/build-verify.sh --fix",
    "build:safe": "./ai_dev_utils/scripts/pre-build-check.sh --fix && pnpm build"
  }
}
```

Then use:
```bash
pnpm build:pre-check:fix
pnpm clean:deep
pnpm build
```

---

## Recommended Workflow

### For Local Development

```bash
# Start of development session
./ai_dev_utils/scripts/pre-build-check.sh --fix
pnpm build
pnpm dev

# If build fails
./ai_dev_utils/scripts/build-verify.sh --fix
./ai_dev_utils/scripts/clean-build.sh
pnpm build
```

### For CI/CD Pipeline

```bash
# Before main build
./ai_dev_utils/scripts/pre-build-check.sh --fix
./ai_dev_utils/scripts/build-verify.sh --fix

# Clean environment
./ai_dev_utils/scripts/clean-build.sh --deep
pnpm install

# Build
pnpm build
```

### For Production Releases

```bash
# Full verification
./ai_dev_utils/scripts/pre-build-check.sh --verbose
./ai_dev_utils/scripts/build-verify.sh --verbose

# Clean build
./ai_dev_utils/scripts/clean-build.sh --deep --verbose
pnpm install

# Build with verification
pnpm build
```

---

## Troubleshooting

### Issue: Script Says Permission Denied

```bash
# Make scripts executable
chmod +x ai_dev_utils/scripts/*.sh
```

### Issue: Scripts Not Found

```bash
# Verify you're in project root
pwd  # Should end with /SnapBack-Site

# Or use full path
./ai_dev_utils/scripts/pre-build-check.sh
```

### Issue: sed: Can't Find File

```bash
# Use full path
cd /Users/user1/WebstormProjects/SnapBack-Site
./ai_dev_utils/scripts/pre-build-check.sh --fix
```

### Issue: Build Still Fails After Running Scripts

1. Check verbose output: `./ai_dev_utils/scripts/pre-build-check.sh --verbose`
2. Deep clean: `./ai_dev_utils/scripts/clean-build.sh --deep --verbose`
3. Reinstall: `pnpm install`
4. Try again: `pnpm build`

---

## Configuration Files

These scripts reference and modify:

- **pnpm-workspace.yaml** - Workspace package definitions
  - Added: `.next` directory exclusion
  
- **package.json** - Build scripts
  - Uses: Standard `pnpm build` command
  
- **tsconfig.base.json** - TypeScript configuration
  - Validates: Module resolution settings

---

## Monitoring & Logging

All scripts support `--verbose` flag for detailed output:

```bash
./ai_dev_utils/scripts/pre-build-check.sh --verbose
./ai_dev_utils/scripts/clean-build.sh --verbose
./ai_dev_utils/scripts/build-verify.sh --verbose
```

This shows:
- Exact files being processed
- What changes are being made
- Which checks passed/failed
- Detailed diagnostic information

---

## Performance Notes

- **pre-build-check.sh**: < 1 second
- **clean-build.sh**: 2-5 seconds (safe mode), 10-30 seconds (deep)
- **build-verify.sh**: < 2 seconds

Deep clean is slower because it:
- Traverses entire node_modules tree
- Removes many directories
- Deletes lock file

---

## Future Enhancements

Potential improvements:
- [ ] Automated daily cleanup jobs
- [ ] Build system health monitoring
- [ ] Integration with lefthook pre-commit
- [ ] Automated issue reporting
- [ ] Performance metrics tracking
- [ ] Cache size monitoring

---

## Contact & Support

For issues or improvements to these scripts:

1. Check troubleshooting section above
2. Review script verbose output
3. Verify you're in correct directory
4. Check filesystem permissions

---

**Version:** 1.0  
**Status:** Production Ready  
**Last Tested:** 2025-12-11
