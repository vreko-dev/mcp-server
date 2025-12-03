# SnapBack OSS Packages

This directory contains open-source packages that will be synced to the public `snapback-oss` repository.

## Packages

- **infrastructure** - Generic logging, metrics, and tracing utilities
- **contracts** - TypeScript types and Zod schemas (filtered from private repo)
- **sdk** - Client SDK for interacting with SnapBack
- **config** - Configuration utilities
- **events** - Event bus implementation

## Development

```bash
# Build all OSS packages
pnpm --filter "@snapback-oss/*" build

# Test all OSS packages
pnpm --filter "@snapback-oss/*" test

# Typecheck
pnpm --filter "@snapback-oss/*" typecheck
```

## Rules

**Never add**:
- Database schemas
- Proprietary algorithms
- Analytics/telemetry code
- Subscription/tier logic
- Internal platform code

All code here must be safe for public consumption.
