# @snapback/config

## 0.2.0

### Minor Changes

## [Unreleased]

## [0.2.0] - 2025-12-06

### 🚀 Added
- Explicit tier config loading
- Device trial configuration support
- Improved validation error messages

### 📝 Changed
- Config schema includes pricing tiers
- Utils exported explicitly for direct imports
- Better error messages showing which setting failed

### 🎯 What You See
- Load config for specific tier: Pro features show/hide based on config
- Trial devices get different config than paid accounts
- Validation errors tell you exactly what's wrong

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
