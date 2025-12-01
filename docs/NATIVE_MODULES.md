# Native Module Handling in Monorepo

## Overview

This monorepo contains packages that require **different runtime binaries** for the same native module (`better-sqlite3`):

-   **`apps/vscode`**: VSCode extension → Electron binaries (MODULE_VERSION 107)
-   **`packages/sdk`**: Node.js SDK → Node.js binaries (MODULE_VERSION 127)

## The Problem

pnpm's default behavior is to deduplicate packages, giving both packages a **single shared installation** of `better-sqlite3`. This causes:

❌ MODULE_VERSION mismatches
❌ Test failures (SDK gets Electron binary)
❌ Runtime errors in production
❌ Cached prebuilds from npm that are incorrect

## The Solution

### 1. `.pnpmfile.cjs` Configuration

Forces separate installations of `better-sqlite3` per package:

```javascript
module.exports = {
	hooks: {
		readPackage(pkg) {
			if (pkg.dependencies?.["better-sqlite3"]) {
				pkg.dependenciesMeta = pkg.dependenciesMeta || {};
				pkg.dependenciesMeta["better-sqlite3"] = {
					injected: true, // Force separate installation
				};
			}
			return pkg;
		},
	},
};
```

### 2. SDK Postinstall Script

`packages/sdk/scripts/postinstall.js` automatically rebuilds `better-sqlite3` for Node.js:

```bash
npm rebuild better-sqlite3 --build-from-source
```

This ensures the SDK always gets the correct Node.js binary, even if VSCode rebuilt it for Electron.

### 3. VSCode Postinstall Script

`apps/vscode/scripts/postinstall.js` rebuilds `better-sqlite3` for Electron:

```bash
npm rebuild better-sqlite3 --runtime=electron --target=20.0.0
```

## Troubleshooting

### SDK Tests Failing with MODULE_VERSION Errors

**Symptoms:**

```
Error: The module 'better-sqlite3' was compiled against a different Node.js version
using NODE_MODULE_VERSION 107. This version of Node.js requires
NODE_MODULE_VERSION 127.
```

**Root Cause:** SDK is using Electron binary instead of Node.js binary

**Fix:**

```bash
# 1. Clear contaminated prebuild cache
rm -rf ~/.npm/_prebuilds/*better-sqlite3*electron*.tar.gz

# 2. Force rebuild for Node.js
cd packages/sdk
npm rebuild better-sqlite3 --build-from-source

# 3. Verify tests pass
pnpm test
```

### VSCode Extension Fails to Load

**Symptoms:** VSCode extension crashes on activation with native module errors

**Root Cause:** VSCode is using Node.js binary instead of Electron binary

**Fix:**

```bash
# Rebuild for Electron
cd apps/vscode
npm rebuild better-sqlite3 --runtime=electron --target=20.0.0 --disturl=https://electronjs.org/headers
```

### After `pnpm install` Tests Fail

**Root Cause:** Both postinstall scripts run, whichever runs last overwrites the shared binary

**Fix:** This is why `.pnpmfile.cjs` forces separate installations. If you still see issues:

```bash
# Nuclear option: delete and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Best Practices

### ✅ DO

-   Use the postinstall scripts in both packages
-   Keep `.pnpmfile.cjs` configuration
-   Clear prebuild cache when switching Node versions
-   Test both packages after `pnpm install`

### ❌ DON'T

-   Share native modules between Electron and Node.js packages
-   Manually delete `better-sqlite3` from node_modules
-   Disable postinstall scripts
-   Use global `pnpm rebuild` (rebuilds shared installation)

## Verification

### Check SDK Binary

```bash
# Should show current timestamp (recently compiled)
stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" \
  node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/better_sqlite3.node

# Should show: Mach-O 64-bit bundle arm64
file node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

### Run Tests

```bash
# SDK tests should pass (99%+ pass rate)
cd packages/sdk && pnpm test

# VSCode tests should pass
cd apps/vscode && pnpm test:unit
```

## Architecture Decision

**Why not remove better-sqlite3 from SDK?**

Considered alternatives:

-   `sqlite3` (Node.js native, but older API)
-   `sql.js` (WASM, slower performance)
-   Different storage backends per package

**Decision:** Keep current architecture with proper isolation via `.pnpmfile.cjs`. The performance and API benefits of `better-sqlite3` outweigh the configuration complexity.

## Related Issues

-   **Issue Date:** October 22, 2025
-   **Root Cause Analysis:** [Sequential thinking analysis in commit history]
-   **Resolution:** `.pnpmfile.cjs` + postinstall scripts

## Monitoring

### CI/CD Checks

Add to your test pipeline:

```bash
# Verify binary is correct
node -e "require('better-sqlite3')(':memory:')"

# Check test pass rate
pnpm test --reporter=json | jq '.passRate' | grep -E "^(9[5-9]|100)$"
```

If pass rate drops below 95%, investigate native module issues first.
