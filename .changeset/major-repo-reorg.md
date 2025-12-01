---
"@snapback/sdk": minor
"@snapback/contracts": minor
"@snapback/core": minor
"@snapback/events": minor
"@snapback/web": minor
"@snapback/vscode": minor
"@snapback/cli": minor
"@snapback/mcp-server": minor
"@snapback/infrastructure": minor
"@snapback/integrations": minor
"@snapback/platform": minor
"@snapback/config": minor
---

refactor: Major repository reorganization

-   Consolidated 10 packages into 4 new packages:
    -   @snapback/infrastructure (logging, metrics, tracing)
    -   @snapback/integrations (email, payments)
    -   @snapback/platform (database schemas, Supabase client)
    -   @snapback/config (utility functions, feature flags)
-   Removed deprecated packages: @snapback/database, @snapback/storage, @snapback/telemetry, @snapback/logs, @snapback/observability, @snapback/payments, @snapback/mail, @snapback/feature-flags, @snapback/utils, @snapback/supabase
-   Updated dependencies across all packages to use new consolidated packages
-   Moved utility functions from @snapback/utils to @snapback/config/src/utils
-   Moved feature flag management to @snapback/contracts/src/feature-manager.ts
-   Updated VS Code extension to use new package structure
-   Updated SDK to use @snapback/infrastructure instead of @snapback/logs
-   Updated all import paths to reflect new package structure
