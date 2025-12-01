# TypeScript Build Issue Prevention Guide

This document explains the preventive measures we've implemented to avoid the TypeScript build issues we encountered where output directories were empty despite successful build commands.

## Root Causes Identified

1. **Incorrect tsbuildinfo caching**: TypeScript's incremental build system was incorrectly reporting projects as "up to date" when no files were actually generated.
2. **Dependency errors**: TypeScript errors in dependencies were preventing proper compilation.
3. **Configuration issues**: Module resolution and import extension handling required specific configuration.
4. **Build order dependencies**: Some packages depend on others, requiring correct build order.

## Preventive Measures Implemented

### 1. Automated Build Verification

We've implemented a verification script that checks if dist directories are properly populated after building:

```bash
pnpm verify-build
```

This script checks:

-   If dist directories exist
-   If dist directories contain files
-   If expected output files (.js and .d.ts) are present

### 2. Clean Build Scripts

We've created scripts to ensure clean build states:

```bash
pnpm clean-build        # Cleans dist directories and tsbuildinfo files
pnpm force-rebuild      # Forces a complete rebuild with verification
```

### 3. Post-build Hooks

Each package now has a post-build verification step that automatically runs after the build process:

```json
{
	"scripts": {
		"build": "tsc --build && node ../../scripts/verify-build.js"
	}
}
```

### 4. Configuration Improvements

We've updated tsconfig.json files with better settings:

-   Added `allowImportingTsExtensions: true` to handle .ts extensions in import statements
-   Added `emitDeclarationOnly: true` to work with the above setting
-   Ensured consistent `moduleResolution: "bundler"` across all packages

### 5. Root-level Scripts

Added convenient scripts to the root package.json:

```bash
pnpm verify-build       # Verify all package builds
pnpm clean-build        # Clean all build artifacts
pnpm force-rebuild      # Force a complete rebuild with verification
```

## Build Order Dependencies

Some packages depend on others and must be built in the correct order:

1. `@snapback/contracts` - Core types and interfaces (no dependencies)
2. `@snapback/config` - Configuration defaults (depends on contracts)

When building manually, always build `@snapback/contracts` first, then `@snapback/config`.

The turbo build system handles this automatically, so using `pnpm build` from the root is recommended.

## Best Practices to Avoid This Issue

1. **Always verify builds**: Run the verification script after building packages
2. **Use clean builds**: When encountering issues, use `pnpm clean-build` followed by `pnpm build`
3. **Force rebuilds**: Use `pnpm force-rebuild` when TypeScript caching seems to be causing issues
4. **Check dependencies**: Ensure no TypeScript errors in dependencies by using `skipLibCheck: true`
5. **Monitor tsbuildinfo files**: These files can become stale and cause incorrect "up to date" reports
6. **Follow build order**: Build dependent packages in the correct order

## Troubleshooting Steps

If you encounter empty output directories despite successful build commands:

1. Run `pnpm verify-build` to confirm the issue
2. Run `pnpm clean-build` to clean all artifacts
3. Run `pnpm build` to rebuild (uses turbo for correct order)
4. If the issue persists, run `pnpm force-rebuild`
5. Check the tsconfig.json files for proper configuration
6. Ensure import statements use the correct extensions (.js in built files)
7. Verify build order dependencies are satisfied

## Future Improvements

We're considering adding:

-   Automated CI checks to verify builds
-   More sophisticated cache invalidation strategies
-   Enhanced error reporting for build failures
