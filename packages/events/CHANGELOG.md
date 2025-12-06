# @snapback/events

## 1.0.2

### Patch Changes

- Tier-specific event types for Free | Pro | Team | Enterprise
- Device trial events for multi-device evaluation tracking
- Improved event names using Pattern Memory terminology

### What You See

- Subscribe to tier-gated events: only Pro/Team/Enterprise emit certain events
- Device trial events show trial-specific behavior separate from paid accounts
- Event names are clear: `FileProtected` not `FileSafeguardInitiated`

## 1.1.0

### Minor Changes

- 884ce9e: refactor: Major repository reorganization

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
  - @snapback/sdk@0.2.0
  - @snapback/contracts@0.2.0
  - @snapback/config@0.2.0
