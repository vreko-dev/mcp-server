# SnapBack Repository Inventory

## Repository Structure

### Root Files
- .dockerignore
- .editorconfig
- .env.docker.example
- .env.local.example
- .gitignore
- .gitleaks.toml
- .lefthook.yml
- .npmrc
- .snapbackignore
- .snapbackprotected
- .syncpackrc.json
- ACCESS_DASHBOARD.md
- ARCHITECTURE.md
- CLAUDE.md
- COMMIT_AND_DEPLOY.md
- COMPREHENSIVE_ARCHITECTURE_ANALYSIS.md
- CONTRIBUTING.md
- Dockerfile
- Dockerfile.dev
- README.md
- biome.json
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- qoder-config.yaml
- renovate.json
- tsconfig.base.json
- tsconfig.build.json
- tsconfig.json
- turbo.json
- vitest.config.ts
- vitest.workspace.ts

### Directories
- .changeset
- .claude
- .cursor
- .git
- .github
- .test-audit-tmp
- ARCHIVE
- apps
- builder_pack
- claudedocs
- config
- docker
- docs
- examples
- extensions
- packages
- refactor
- reports
- scripts
- test
- tooling
- tools

## Workspaces

Defined in `pnpm-workspace.yaml`:
- config
- apps/**
- packages/**
- tooling/*

## Pipelines

### GitHub Workflows (.github/workflows/)
- ci-cd.yml
- ci.yml
- cli-validate.yml
- config-gates.yml
- dependency-update.yml
- deploy-mcp.yml
- deploy-web.yml
- gitleaks.yml
- mcp-validate.yml
- publish-cli.yml
- publish-extension.yml
- publish-vscode-extension.yml
- release.yml
- security-scan.yml
- snapshot-release.yml
- sync-public-repo.yml
- turborepo-ci.yml
- update-version.yml
- validate-architecture.yml
- validate-prs.yml
- vscode-performance.yml
- vscode-test.yml
- vscode-validate.yml
- web-validate.yml

### Azure Pipelines
No Azure pipeline files found.

## Applications

### CLI (apps/cli)
Command-line interface for SnapBack

### MCP Server (apps/mcp-server)
- Path: apps/mcp-server
- Dependencies: @modelcontextprotocol/sdk, @snapback/analytics, @snapback/auth, @snapback/config, @snapback/contracts, @snapback/core, @snapback/events, @snapback/github-action, @snapback/integrations, @snapback/policy-engine, @snapback/sdk
- Description: Model Context Protocol server for AI assistant integration

### VS Code Extension (apps/vscode)
- Path: apps/vscode
- Engine: VS Code ^1.99.0
- Activation Events: onStartupFinished, onCommand:snapback.*, workspaceContains:.snapbackrc
- Description: VS Code extension for SnapBack protection

### Web Portal (apps/web)
- Path: apps/web
- Framework: Next.js
- Dependencies: @sentry/nextjs, @snapback/api, @snapback/auth, @snapback/config, @snapback/core, @snapback/infrastructure, @snapback/integrations, @snapback/platform, next, react, react-dom
- Analytics: PostHog, Sentry
- Description: Web portal/dashboard for SnapBack

## Packages

### Analytics (packages/analytics)
Analytics events and ingestion handling

### API (packages/api)
API services and routes

### Auth (packages/auth)
Authentication services

### Config (packages/config)
Configuration management

### Contracts (packages/contracts)
Shared contracts and types

### Core (packages/core)
Core SnapBack functionality

### Events (packages/events)
Event system and telemetry

### Infrastructure (packages/infrastructure)
Infrastructure utilities and logging

### Integrations (packages/integrations)
Third-party integrations

### Platform (packages/platform)
Database platform and schema
- ORM: Drizzle ORM
- Migrations path: packages/platform/drizzle/migrations

### Policy Engine (packages/policy-engine)
Policy evaluation engine

### SDK (packages/sdk)
SnapBack SDK for various platforms

## Database

### ORM
Drizzle ORM

### Migrations
- 0001_core.sql
- 0001_snapback_core_tables.sql
- 0001_wild_psynapse.sql
- 0002_snapshots.sql
- 0003_auth.sql
- 0003_supabase_extensions.sql
- 0004_views.sql
- 0005_retention.sql
- 0006_telemetry_daily_metrics.sql

### Telemetry Tables
- telemetry_events
- telemetry_idempotency_keys
- telemetry_daily_stats
- agent_suggestions
- post_accept_outcomes
- policy_evaluations
- loops
- feedback

## Analytics

### PostHog
- Client-side integration: Yes
- Webhook handler: Yes

### Sentry
- Used in: Web app

### Event Types
- snapshot_created
- snapshot_restored
- ai_edit_detected
- ai_edit_accepted
- warning_shown
- dashboard_viewed
- onboarding_started
- subscription_started

## Documentation

### Systems
- Fumadocs
- Nextra

### Paths
- docs/
- apps/web/app/(docs)/