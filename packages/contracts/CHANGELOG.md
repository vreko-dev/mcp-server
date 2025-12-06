# @snapback/contracts

## 0.2.0

### Minor Changes

## [Unreleased]

## [0.2.0] - 2025-12-06

### 🚀 Added
- Pricing tier type definitions and enums
- Device trial contract types
- Expanded subscription type definitions

### 📝 Changed
- Tier names standardized across types
- Type names aligned with Pattern Memory terminology
- JSDoc examples use behavior-focused descriptions

### 🎯 What You See
- Type safety prevents tier name inconsistencies
- Device trial types clearly separate trial from paid accounts
- Types guarantee Free/Pro/Team/Enterprise consistency

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
