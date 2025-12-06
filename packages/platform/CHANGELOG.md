# @snapback/platform

## 0.7.0

### Major Changes

- Major schema expansion for trust engine and pattern memory
  - New database tables for reputation scores, trust calibration, and engagement tracking
  - Device fingerprinting and trial management schemas
  - Pattern synchronization and prediction tracking tables
  - Repository personality analysis for per-repo intelligence

### Features

**What You See:**
- Platform now tracks which devices developers use and learns their patterns
- Trust scores show confidence in predictions - higher as developers use SnapBack longer
- Engagement tracking shows which features users actually use vs ignore
- Repository personalities capture what's unique about each repo's history
- Predictions table stores "SnapBack learned your repo commits bad refactors" data

### Database Changes

- engagement_tracking: Tracks Free vs Pro vs Team feature usage
- trust_scores: Stores per-prediction confidence levels (Day 1: 94%, Day 30: 98%)
- repo_personalities: Analyzes repo commit patterns to catch repo-specific mistakes
- patterns: Synchronizes learned patterns across platform
- predictions: Stores what SnapBack predicted and whether it was right
- github_integrations: Hooks into repo history for pattern learning

## 0.1.0

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
  - @snapback/contracts@0.2.0
  - @snapback/infrastructure@0.2.0
  - @snapback/config@0.2.0
