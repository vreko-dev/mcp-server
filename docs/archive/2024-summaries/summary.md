# SnapBack Architecture Executive Summary

## Package Overview

Total packages: 25

1. **@snapback/analytics** - Analytics and telemetry collection for SnapBack platform
2. **@snapback/api** - Core API service for SnapBack platform
3. **@snapback/api-simple** - Simplified API service for SnapBack platform
4. **@snapback/api-vercel** - Vercel-specific API service for SnapBack platform
5. **@snapback/auth** - Authentication and authorization services for SnapBack platform
6. **@snapback/auth-mock** - Mock authentication service for testing
7. **@snapback/cli** - Command-line interface for SnapBack
8. **@snapback/config** - Shared configuration utilities
9. **@snapback/config-legacy** - Legacy configuration utilities
10. **@snapback/contracts** - Type definitions and contracts for SnapBack platform
11. **@snapback/core** - Core utilities and shared logic for SnapBack platform
12. **@snapback/events** - Event system for SnapBack platform
13. **@snapback/github-action** - GitHub Action for SnapBack
14. **@snapback/infrastructure** - Infrastructure utilities for SnapBack platform
15. **@snapback/integrations** - Third-party integrations for SnapBack platform
16. **@snapback/mcp-server** - Model Context Protocol server for SnapBack
17. **@snapback/platform** - Platform services for SnapBack
18. **@snapback/policy-engine** - Policy engine for SnapBack platform
19. **@snapback/scripts** - Utility scripts for development
20. **@snapback/sdk** - SDK for SnapBack platform
21. **@snapback/tailwind-config** - Tailwind CSS configuration
22. **@snapback/tsconfig** - Shared TypeScript configuration
23. **@snapback/web** - Web frontend for SnapBack platform
24. **snapback-vscode** - VS Code extension for SnapBack

## Chokepoints (Top 5 Fan-in)

1. **@snapback/core** - Fan-in: 2 (used by @snapback/api, @snapback/auth)
2. **@snapback/platform** - Fan-in: 2 (used by @snapback/api, @snapback/auth)
3. **@snapback/tsconfig** - Fan-in: 2 (used by @snapback/analytics, @snapback/config)
4. **@snapback/contracts** - Fan-in: 1 (used by @snapback/platform)
5. **@snapback/events** - Fan-in: 1 (used by @snapback/analytics)

## Dead Code Summary

Based on the analysis, no significant dead code was identified in the repository. All packages appear to be actively used or have clear purposes within the architecture.

Estimated dead code: 0 LOC across 0 files

## Architecture Health Score: 65/100

The architecture health score is computed from several factors:

- **Cycles (30% weight)**: 15/30 - Some circular dependencies detected in the platform package
- **Instability (20% weight)**: 12/20 - Most packages have reasonable instability scores
- **Catalog Compliance (15% weight)**: 11/15 - 72% compliance with pnpm catalog (18/25 packages)
- **Unused Exports (15% weight)**: 15/15 - No significant unused exports detected
- **Unvalidated Env Vars (10% weight)**: 7/10 - Most environment variables are properly validated
- **Cross-layer Violations (10% weight)**: 5/10 - Some violations detected (presentation layer accessing data directly)

## Highest ROI Refactors

1. **Fix Catalog Compliance Issues** (Effort: M)
   - Address the 7 packages with version mismatches to improve dependency consistency
   - Run `syncpack fix-mismatches` to automatically fix most issues

2. **Resolve Circular Dependencies** (Effort: M)
   - Fix the circular dependencies in the platform package schema definitions
   - Improve module separation and dependency flow

3. **Layer Violation Corrections** (Effort: L)
   - Review and correct direct data access from presentation layer
   - Ensure proper separation of concerns between layers

## Tools Used

- pnpm: Available and used for workspace analysis
- turbo: Available through pnpm for build pipeline analysis
- madge: Available for circular dependency detection
- syncpack: Available for catalog compliance checking
- git: Available for change detection

## Raw Data Sources

All raw analysis data is available in `docs/architecture/raw/`:
- pnpm-workspace.json: Workspace structure
- turbo-graph.json: Build pipeline dependencies
- madge-api.json: Circular dependency analysis
- syncpack.txt: Dependency version mismatches
- env-usage.txt: Environment variable usage
- changed-files.txt: Recent file changes