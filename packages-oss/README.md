# SnapBack OSS Packages

> Open-source packages that power the SnapBack ecosystem and are published to npm under the `@snapback-oss` namespace.

This directory contains fully public packages available to the open-source community. All packages are published to npm and available under the MIT license.

## Packages

### Core Packages

- **[infrastructure](./infrastructure/README.md)** (`@snapback-oss/infrastructure`)
  - Generic logging, metrics, and tracing utilities
  - Privacy-first observability (no proprietary analytics)
  - Safe for all use cases
  - Published: ✅

- **[contracts](./contracts/README.md)** (`@snapback-oss/contracts`)
  - TypeScript types and Zod schemas
  - Generated OpenAPI specifications
  - Event definitions for pub/sub
  - Filtered version of private contracts (see sync process below)
  - Published: ✅

- **[sdk](./sdk/README.md)** (`@snapback-oss/sdk`)
  - Public client SDK for SnapBack API
  - Privacy-first design (metadata only)
  - Full TypeScript support
  - Works without private dependencies
  - Published: ✅

### Utility Packages

- **[config](./config/README.md)** (`@snapback-oss/config`)
  - Configuration utilities and validation
  - Environment variable parsing
  - Configuration schema definitions
  - Published: ✅

- **[events](./events/README.md)** (`@snapback-oss/events`)
  - Event bus implementation
  - Pub/sub patterns
  - Type-safe event handling
  - Published: ✅

## Architecture

### Public vs Private Packages

SnapBack maintains two versions of some packages for strategic reasons:

```
Private Packages              Public Packages
─────────────────             ─────────────────
@snapback/contracts      →    @snapback-oss/contracts
@snapback/infrastructure →    @snapback-oss/infrastructure
@snapback/sdk            →    @snapback-oss/sdk
@snapback/core           ✗    (private, no OSS version)
```

**Why the split?**
- **Private packages** include proprietary features (analytics, subscription logic, advanced algorithms)
- **Public packages** contain only battle-tested utilities safe for community use
- **Shared contracts** use conditional exports to hide private features from npm builds

### Import Boundaries

To maintain clean separation:

```typescript
// ✅ ALLOWED - OSS packages can import from other OSS packages
import { logger } from "@snapback-oss/infrastructure";
import type { Snapshot } from "@snapback-oss/contracts";

// ❌ FORBIDDEN - OSS packages NEVER import from private packages
import { analyticsClient } from "@snapback/infrastructure";
import { SnapshotManager } from "@snapback/core";
```

## Development

### Quick Start

```bash
# From monorepo root
cd /path/to/snapback

# Install dependencies
pnpm install

# Build all OSS packages
pnpm --filter "@snapback-oss/*" build

# Test all OSS packages
pnpm --filter "@snapback-oss/*" test

# Type check
pnpm --filter "@snapback-oss/*" typecheck

# Lint
pnpm --filter "@snapback-oss/*" lint
```

### Package-Specific Development

```bash
# Development with watch mode
pnpm --filter "@snapback-oss/sdk" dev

# Run tests for specific package
pnpm --filter "@snapback-oss/contracts" test

# Build specific package
pnpm --filter "@snapback-oss/infrastructure" build
```

### Testing

```bash
# Test all OSS packages
pnpm --filter "@snapback-oss/*" test

# Test with coverage
pnpm --filter "@snapback-oss/*" test --coverage

# Watch mode
pnpm --filter "@snapback-oss/*" test --watch
```

## Rules for OSS Packages

We take great care to ensure OSS packages are safe, auditable, and maintainable.

### ✅ You CAN add:
- Utility functions and helpers
- Type definitions and schemas
- Event definitions
- Generic infrastructure code (logging, metrics, tracing)
- Configuration utilities
- Documentation and examples

### ❌ You NEVER add:
- Database schemas or migrations
- Proprietary algorithms
- Analytics/telemetry to SnapBack services (use logging only)
- Subscription/tier logic
- Feature flags for proprietary features
- Internal platform code
- Hardcoded secrets or API keys

### Code Review Checklist

Before submitting a PR to OSS packages:

- [ ] No imports from `@snapback/*` (private packages)
- [ ] No hardcoded secrets or API keys
- [ ] No database schemas or migrations
- [ ] All dependencies are safe for public use
- [ ] Types don't expose private implementation details
- [ ] Tests pass with public dependencies only
- [ ] Documentation is clear and complete
- [ ] License headers are correct (MIT)

## Synchronization Process

OSS packages are automatically synced from private packages when possible:

### How It Works

1. **Source of Truth**: `packages/contracts`, `packages/infrastructure`, `packages/sdk` are the master versions
2. **Build-Time Filtering**: During publication, private exports are removed
3. **Conditional Exports**: `package.json` exports hide private paths from npm
4. **Manual Sync**: For packages without direct sync, code is manually copied and audited

### Contracts Sync Example

```typescript
// packages/contracts/src/events/core.ts (public)
export type Snapshot = { /* ... */ };

// packages/contracts/src/events/infrastructure.ts (private)
export type AnalyticsEvent = { /* ... */ };

// package.json conditional exports
"exports": {
  "./events/core": {
    "import": "./dist/events/core.js",
    "types": "./dist/events/core.d.ts"
  },
  // ./events/infrastructure NOT exported to npm
}
```

## Publishing to npm

**Only maintainers** publish OSS packages to npm.

### Pre-Publication Checklist

```bash
# 1. Verify all tests pass
pnpm --filter "@snapback-oss/*" test

# 2. Verify all builds succeed
pnpm --filter "@snapback-oss/*" build

# 3. Verify no private imports
grep -r "@snapback/" packages-oss/src 2>/dev/null || echo "✓ No private imports"

# 4. Update CHANGELOG.md in each package
# 5. Update version in package.json
# 6. Commit and tag release
# 7. Publish to npm
pnpm --filter "@snapback-oss/*" publish
```

## Contributing

See [CONTRIBUTING.md](/docs/contributing) in the main docs for:
- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## Security

If you discover a security vulnerability in an OSS package:

1. **Do NOT** open a public GitHub issue
2. **Email** security@snapback.dev with details
3. We will investigate and fix promptly
4. Security fixes are released as patch versions

## License

All code in `packages-oss/` is licensed under **MIT License**. See [LICENSE](./LICENSE) for details.

---

**Want to use SnapBack?** Check out the [Quick Start Guide](/docs/quick-start) or [SDK Documentation](/docs).

**Want to contribute?** See [Contributing Guide](/docs/contributing).
