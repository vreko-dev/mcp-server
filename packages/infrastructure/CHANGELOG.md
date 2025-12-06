# @snapback/infrastructure

## 0.2.0

### Minor Changes

## [Unreleased]

## [0.2.0] - 2025-12-06

### 🚀 Added
- Tier-aware logging with Free vs Pro distinction
- Pricing tier enum exports (Free | Pro | Team | Enterprise)
- Better error context in logs

### �� Changed
- Logging messages use developer-native language
- Type safety for tier-based log routing
- Error messages show what broke, not codes

### �� What You See
- Logs distinguish: 'Pro user hit rate limit' vs generic 'limit exceeded'
- Infrastructure now knows about Free vs Premium paths
- Error logs include resolution steps

  - Consolidated 10 packages into 4 new packages:
    - @snapback/infrastructure (logging, metrics, tracing)
    - @snapback/integrations (email, payments)
    - @snapback/platform (database schemas, Supabase client)
    - @snapback/config (utility functions, feature flags)
  - Removed deprecated packages: @snapback/database, @snapback/storage, @snapback/telemetry, @snapback/logs, @snapback/observability, @snapback/payments, @snapback/mail, @snapback/feature-flags, @snapback/utils, @snapback/supabase
  - Updated dependencies across all packages to use new consolidated packages
  - Moved utility functions from @snapback/utils to @snapback/config/src/utils
  - Moved feature flag management to @snapback/contracts/src/feature-manager.ts
  - Updated VS Code extension to use new package structure
  - Updated SDK to use @snapback/infrastructure instead of @snapback/logs
  - Updated all import paths to reflect new package structure

### Patch Changes

- Updated dependencies [884ce9e]
  - @snapback/contracts@0.2.0
