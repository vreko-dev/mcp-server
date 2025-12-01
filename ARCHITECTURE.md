# SnapBack Architecture

This document describes the current architecture of the SnapBack monorepo after package consolidation and library simplification.

## Package Structure

After consolidation, the SnapBack monorepo now contains 11 packages:

### Core Packages

1. **@snapback/config** - Configuration and utilities

    - Contains all configuration files and utility functions
    - Merged from: `config` + `utils`

2. **@snapback/contracts** - Shared types and interfaces

    - Contains shared TypeScript types and interfaces used across packages

3. **@snapback/core** - Core functionality

    - Contains AI detection, dependency analysis, and other core features
    - Merged from: `ai` + `storage`

4. **@snapback/events** - Event system

    - Contains event handling and messaging functionality using EventEmitter2

5. **@snapback/infrastructure** - Infrastructure components

    - Contains logging, metrics, tracing, and other infrastructure-related functionality
    - Merged from: `analytics` + `logs` + `observability` + `telemetry`

6. **@snapback/integrations** - Third-party integrations

    - Contains integrations with external services like payments, email, and feature flags
    - Merged from: `payments` + `mail` + `feature-flags`
    - Includes Stripe payment processing, email sending via Resend, and feature flag management

7. **@snapback/platform** - Platform services

    - Contains database schemas, queries, and Supabase client
    - Merged from: `database` + `supabase`

8. **@snapback/sdk** - Client SDK

    - Platform-agnostic TypeScript SDK for SnapBack functionality

9. **@snapback/api-service** - API Service (Standalone)

    - Standalone Hono.js-based API service with Docker containerization
    - Ready for Fly.io deployment
    - Provides all backend functionality via REST and RPC endpoints
    - Migrated from: `packages/api`

10. **@snapback/web** - Web application

    - Next.js web application for the SnapBack dashboard

11. **snapback-vscode** - VS Code extension
    - Native VS Code extension for IDE integration

### Consolidation Summary

| Original Packages (18)                       | Consolidated Into    | New Package Count |
| -------------------------------------------- | -------------------- | ----------------- |
| analytics, logs, observability, telemetry    | infrastructure       | 4 → 1             |
| ai, storage                                  | core                 | 2 → 1             |
| payments, mail, feature-flags                | integrations         | 3 → 1             |
| database, supabase                           | platform             | 2 → 1             |
| config, utils                                | config               | 2 → 1             |
| api                                          | api-service (moved)  | 1 → 1             |
| contracts, events, sdk, web, snapback-vscode | (no change)          | 5 → 5             |
| **Total**                                    |                      | **18 → 11**       |

## Simplified Architecture with Industry-Standard Libraries

The SnapBack architecture has been significantly simplified by replacing custom implementations with industry-standard libraries:

### HTTP Client: ky + cockatiel
- **Replaces**: Custom fetchAPI wrapper
- **Location**: [apps/mcp-server/src/client/snapback-api.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/client/snapback-api.ts)
- **Benefits**: Automatic retries, circuit breaker pattern, timeout handling

### Caching: lru-cache
- **Replaces**: Custom LRU cache implementation
- **Location**: [apps/mcp-server/src/auth.ts](file:///Users/user1/WebstreamProjects/SnapBack-Site/apps/mcp-server/src/auth.ts)
- **Benefits**: Memory-efficient LRU eviction, TTL support

### Event System: EventEmitter2
- **Replaces**: TCP socket-based EventBus
- **Location**: [packages/events/src/EventBusEventEmitter2.ts](file:///Users/user1/WebstreamProjects/SnapBack-Site/packages/events/src/EventBusEventEmitter2.ts)
- **Benefits**: Publish/subscribe messaging, request/response RPC, QoS levels

### Offline Queuing: p-queue
- **Location**: [apps/vscode/src/services/QueuedNetworkAdapter.ts](file:///Users/user1/WebstreamProjects/SnapBack-Site/apps/vscode/src/services/QueuedNetworkAdapter.ts)
- **Benefits**: Concurrency control, automatic retry, priority queuing

This consolidation reduced ~1,650 lines of custom code and development time from 10-12 days to 6-8 days (40% faster).

## Benefits of Consolidation

1. **Reduced Complexity**: Fewer packages to manage and understand
2. **Improved Developer Experience**: Simpler import paths and dependency management
3. **Better Maintainability**: Related functionality is grouped together
4. **Faster Builds**: Fewer packages to build and test
5. **Easier LLM Agent Context**: Simplified codebase structure for AI assistance
6. **Industry Standards**: Using battle-tested libraries instead of custom implementations

## Migration Guide

### For Developers

When importing modules, use the new consolidated package names:

-   Instead of `@snapback/analytics`, `@snapback/logs`, etc., use `@snapback/infrastructure`
-   Instead of `@snapback/ai`, `@snapback/storage`, use `@snapback/core`
-   Instead of `@snapback/payments`, `@snapback/mail`, etc., use `@snapback/integrations`
-   Instead of `@snapback/database`, `@snapback/supabase`, use `@snapback/platform`
-   Instead of `@snapback/utils`, use `@snapback/config/utils`

### For CI/CD

Update any scripts or workflows that reference the old package names to use the new consolidated package names.

## Developer Documentation

For detailed information about the current architecture and implementation, see the [Canonical Developer Guide](./docs/development/canonical-developer-guide.md).
