# Build Automation Scripts

Quick reference for build system maintenance scripts.

## Available Scripts

### 1. Pre-Build Health Check
```bash
./pre-build-check.sh              # Check only
./pre-build-check.sh --fix        # Check and auto-fix
./pre-build-check.sh --verbose    # Show details
```

**What it checks:**
- ✓ No stale `.next` directories
- ✓ pnpm workspace configuration
- ✓ TypeScript settings
- ✓ Build artifacts
- ✓ Package.json scripts
- ✓ Dependencies

### 2. Enhanced Clean Build
```bash
./clean-build.sh              # Safe cleanup
./clean-build.sh --deep       # Full cleanup
./clean-build.sh --verbose    # Show details
```

**What it cleans:**
- `.next` directories
- `dist/` and `build/` folders
- `.turbo/` cache
- TypeScript build state
- (Optional) `node_modules/` and lock file

### 3. Build Issue Verification
```bash
./build-verify.sh              # Detect issues
./build-verify.sh --fix        # Detect and fix
./build-verify.sh --verbose    # Show details
```

**What it detects:**
- Stale build artifacts
- Workspace configuration issues
- Unused imports
- Module resolution problems
- Cache problems

## Using from package.json

```bash
pnpm build:pre-check              # Check build system
pnpm build:pre-check:fix          # Check and fix
pnpm build:verify                 # Verify and detect
pnpm build:verify:fix             # Verify and fix
pnpm build:safe                   # Pre-check + build
pnpm clean                        # Safe cleanup
pnpm clean:deep                   # Full cleanup
```

## Common Workflows

### Before Building
```bash
pnpm build:pre-check:fix
pnpm build
```

### After Build Fails
```bash
pnpm build:verify:fix
pnpm clean
pnpm build
```

### Full Recovery
```bash
pnpm clean:deep
pnpm install
pnpm build
```

## Full Documentation

See `BUILD_OPERATIONS.md` for:
- Detailed documentation
- Troubleshooting guide
- Integration examples
- Performance notes
- Maintenance instructions

---

**Location:** `ai_dev_utils/scripts/`  
**Last Updated:** 2025-12-11  
**Status:** ✅ Production Ready
