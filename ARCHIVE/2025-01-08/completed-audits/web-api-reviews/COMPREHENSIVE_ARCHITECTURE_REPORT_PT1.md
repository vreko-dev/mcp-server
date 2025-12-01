# SnapBack Comprehensive Architecture Analysis - Part 1 of 5

**Date:** November 6, 2025  
**Repository:** snapback.dev (Marcelle-Labs)  
**Branch:** snapback-ux-safety-layer  
**Analysis Scope:** Complete monorepo codebase

---

## Executive Summary

### Overall Assessment

SnapBack is a **Turborepo monorepo** implementing an AI code safety platform across multiple surfaces (VSCode extension, MCP server, backend API, SDK, CLI, and web dashboard). The codebase consists of **~80,000+ lines of TypeScript** distributed across 18 packages and 4 applications.

**Current State:**
- ✅ **Strengths:** Modular package structure, type-safe contracts, working MVP across all surfaces
- ⚠️ **Concerns:** Significant IP exposure in client-side packages, duplicate detection logic, missing backend services
- 🚨 **Critical Issues:** Proprietary risk algorithms exposed in npm packages, no centralized policy engine, incomplete telemetry

### Key Findings

| Metric | Value | Status |
|--------|-------|--------|
| Total Packages | 18 | ✅ Good modularization |
| Total Apps | 4 (VSCode, MCP, CLI, Web) | ✅ Multi-surface coverage |
| Lines of Code | ~80,000+ TypeScript (excl. tests) | ⚠️ Large codebase |
| Code in Client Apps | ~40,000 LOC (50%) | 🚨 High IP exposure |
| Backend Services | 2 (Guardian, Secret Detection) | ⚠️ Insufficient |
| Database Tables Used | ~15% of schema | 🚨 Missing data capture |
| Duplicate Logic Instances | 10+ critical areas | 🚨 High maintenance burden |

### Top 3 Priorities

#### **Priority 1: IP Protection (CRITICAL - 2 weeks)**
- **Problem:** Risk scoring algorithms, detection patterns, and policy logic exposed in client packages (`@snapback/core`, VSCode extension)
- **Impact:** Competitors can reverse-engineer proprietary logic; no competitive moat
- **Solution:** Move all proprietary algorithms to backend API services, use client-side stubs
- **Effort:** 10-12 days

#### **Priority 2: Eliminate Redundancy (HIGH - 1 week)**  
- **Problem:** Risk analysis logic duplicated in 3+ places; detection plugins repeated across packages
- **Impact:** Inconsistent results, maintenance nightmare, 3x bug surface area
- **Solution:** Consolidate to single source of truth in `@snapback/core`, import everywhere else
- **Effort:** 5-7 days

#### **Priority 3: Database Schema Alignment (HIGH - 1 week)**
- **Problem:** Generating data (risk scores, user decisions, bypass attempts) but not persisting; 85% of schema unused
- **Impact:** No analytics, no ML training data, no audit trail for compliance
- **Solution:** Add persistence layer for all critical events, wire up existing schema
- **Effort:** 5-7 days

---

## SECTION 1: CURRENT ARCHITECTURE INVENTORY

### 1.1 Package/App Enumeration

#### **Packages (18 total)**

##### **packages/core** 
- **Purpose:** Core detection logic, Guardian plugin system, MCP client, risk analysis
- **Dependencies:** `@snapback/config`, `@snapback/contracts`
- **Exports:** `Guardian`, `RiskAnalyzer`, `SecretDetectionPlugin`, `MockReplacementPlugin`, `PhantomDependencyPlugin`, `MCPClientManager`, `DependencyAnalyzer`, `GitIntegration`, `ThreatDetection`
- **LOC:** 5,394 (TypeScript)
- **Test Coverage:** ~40% (estimated from test file count)
- **Primary Responsibility:** Detection + Orchestration
- **Key Files:**
  - `src/guardian.ts` - Plugin-based analysis engine (504 lines)
  - `src/risk-analyzer.ts` - Risk scoring algorithms (499 lines)
  - `src/detection/plugins/secret-detection.ts` - Secret patterns
  - `src/detection/plugins/mock-replacement.ts` - Mock detection
  - `src/detection/plugins/phantom-dependency.ts` - Dependency analysis
  - `src/mcp-client.ts` - MCP protocol client
  - `src/threat-detection.ts` - Threat detection logic

##### **packages/sdk**
- **Purpose:** Client SDK for SnapBack API, storage abstraction layer
- **Dependencies:** `@snapback/contracts`, `@snapback/infrastructure`, `better-sqlite3`, `ky`, `minimatch`
- **Exports:** `Snapback`, `SnapbackClient`, `SnapshotClient`, `ProtectionClient`, `SnapbackAnalyticsClient`, `SnapshotManager`, `ProtectionManager`, `LocalStorage`, `MemoryStorage`, `StorageBroker`, `StorageBrokerAdapter`, `StorageAdapter`
- **LOC:** 3,452 (TypeScript)
- **Test Coverage:** ~50% (has dedicated test directories)
- **Primary Responsibility:** Storage + API Client
- **Key Files:**
  - `src/Snapback.ts` - Main SDK entry point
  - `src/client/SnapbackClient.ts` - HTTP API client
  - `src/storage/LocalStorage.ts` - SQLite storage
  - `src/storage/StorageBroker.ts` - Multi-writer coordination

##### **packages/policy-engine**
- **Purpose:** Policy evaluation rules (minimal implementation)
- **Dependencies:** `zod`
- **Exports:** Policy types (not fully implemented)
- **LOC:** 402 (TypeScript)
- **Test Coverage:** ~20%
- **Primary Responsibility:** Policy (INCOMPLETE)
- **Key Files:**
  - `src/provider-gates.ts` - Provider-based access control
  - `src/rbac.ts` - Role-based access control
  - `src/index.ts` - Policy types

##### **packages/analytics**
- **Purpose:** Analytics event definitions
- **Dependencies:** None
- **Exports:** `AnalyticsEvents` enum
- **LOC:** 73 (TypeScript)
- **Test Coverage:** 0%
- **Primary Responsibility:** Telemetry (definitions only)
- **Key Files:**
  - `src/index.ts` - Event constants

##### **packages/api**
- **Purpose:** Backend API routes and services
- **Dependencies:** `@snapback/auth`, `@snapback/config`, `@snapback/core`, `@snapback/events`, `@snapback/infrastructure`, `@snapback/integrations`, `@snapback/platform`, `@snapback/policy-engine`, `hono`, `better-auth`, `drizzle-orm`
- **Exports:** API routes, `GuardianService`, `SecretDetectionService`
- **LOC:** 1,683 (TypeScript)
- **Test Coverage:** ~30%
- **Primary Responsibility:** API + Backend Services
- **Key Files:**
  - `src/services/guardian.ts` - Backend risk analysis (513 lines)
  - `src/services/secret-detection.ts` - Backend secret detection
  - `src/routes/v1/policy-evaluate.ts` - Policy evaluation endpoint
  - `src/routes/health.ts` - Health check endpoint

##### **packages/auth**
- **Purpose:** Authentication and authorization (better-auth integration)
- **Dependencies:** `@snapback/config`, `@snapback/contracts`, `@snapback/infrastructure`, `@snapback/integrations`, `better-auth`, `bcrypt`, `cookie`, `drizzle-orm`
- **Exports:** Auth client, session management
- **LOC:** 19,309 (TypeScript - includes generated types)
- **Test Coverage:** ~25%
- **Primary Responsibility:** Authentication & Authorization
- **Key Files:**
  - `src/auth.ts` - Main auth configuration
  - Various provider integrations

##### **packages/events**
- **Purpose:** Event bus for inter-process communication (IPC)
- **Dependencies:** `@snapback/config`, `@snapback/sdk`
- **Exports:** `SnapBackEventBus`, `SnapBackEvent`
- **LOC:** 997 (TypeScript)
- **Test Coverage:** ~35%
- **Primary Responsibility:** Orchestration (IPC)
- **Key Files:**
  - `src/index.ts` - Event bus implementation
  - Pub/sub and request/response patterns

##### **packages/infrastructure**
- **Purpose:** Logging, telemetry, PostHog integration
- **Dependencies:** `@snapback/contracts`, `pino`, `posthog-node`
- **Exports:** `Logger`, `Analytics`, `Telemetry`
- **LOC:** 2,248 (TypeScript)
- **Test Coverage:** ~30%
- **Primary Responsibility:** Telemetry + Logging
- **Key Files:**
  - PostHog client setup
  - Pino logger configuration

##### **packages/integrations**
- **Purpose:** Third-party integrations (Stripe, HubSpot, Email)
- **Dependencies:** `@snapback/config`, `@snapback/contracts`, `@snapback/infrastructure`, `@snapback/platform`, `stripe`, `@hubspot/api-client`, `@react-email/components`
- **Exports:** Stripe provider, HubSpot provider, email templates
- **LOC:** 3,390 (TypeScript)
- **Test Coverage:** ~15%
- **Primary Responsibility:** API (external integrations)
- **Key Files:**
  - `src/stripe/` - Stripe integration
  - `src/hubspot/` - HubSpot integration
  - `src/email/` - Email templates

##### **packages/contracts**
- **Purpose:** Shared TypeScript types and Zod schemas
- **Dependencies:** `zod`, `@asteasolutions/zod-to-openapi`
- **Exports:** All shared types, schemas, OpenAPI specs
- **LOC:** 5,664 (TypeScript)
- **Test Coverage:** 0% (types don't need tests)
- **Primary Responsibility:** API (type contracts)
- **Key Files:**
  - `src/types/snapshot.ts` - Snapshot types
  - `src/types/protection.ts` - Protection types
  - `src/types/config.ts` - Config types
  - `src/schemas.ts` - Zod schemas
  - `src/events/` - Event type definitions

##### **packages/platform**
- **Purpose:** Database schema and queries (Drizzle ORM)
- **Dependencies:** `@snapback/contracts`, `drizzle-orm`, `postgres`, `@supabase/supabase-js`
- **Exports:** Database client, queries, schema
- **LOC:** ~2,000 (TypeScript + schema definitions)
- **Test Coverage:** ~20%
- **Primary Responsibility:** Storage (database)
- **Key Files:**
  - `src/db/schema/` - Database schema definitions
  - `src/db/queries/` - Query builders
  - `src/db/database-service.ts` - DB client

##### **packages/config**
- **Purpose:** Configuration management
- **Dependencies:** None
- **Exports:** Config loaders and validators
- **LOC:** ~150 (TypeScript)
- **Test Coverage:** ~10%
- **Primary Responsibility:** Configuration

##### **packages/auth-mock** (Minimal)
- **Purpose:** Mock auth for testing
- **LOC:** Minimal
- **Primary Responsibility:** Testing

##### **packages/github-action**
- **Purpose:** GitHub Action for CI/CD integration
- **LOC:** ~500 (TypeScript + action config)
- **Primary Responsibility:** CLI

##### **packages/mcp-server-public** (Minimal)
- **Purpose:** Public MCP server variant
- **LOC:** Minimal
- **Primary Responsibility:** Orchestration

##### **packages/storage** (Not Found)
- **Note:** Listed in workspace but directory doesn't exist; storage logic is in `@snapback/sdk`

---

#### **Applications (4 total)**

##### **apps/vscode**
- **Purpose:** VS Code extension - main user interface for SnapBack
- **Dependencies:** `@snapback/contracts`, `@snapback/core`, `@snapback/events`, `@snapback/infrastructure`, `@snapback/sdk`, `vscode`, `better-sqlite3`, `chokidar`, `conf`, `diff`, `fast-glob`, `inquirer`, `pino`
- **Exports:** VS Code extension (packaged as VSIX)
- **LOC:** 34,516 (TypeScript)
- **Test Coverage:** ~35% (extensive test suite)
- **Primary Responsibility:** UI + Orchestration + Storage
- **Key Files:**
  - `src/extension.ts` - Main entry point (456 lines)
  - `src/handlers/SaveHandler.ts` - File save interception
  - `src/commands/` - 25+ command implementations
  - `src/services/SnapshotService.ts` - Snapshot management
  - `src/storage/SqliteStorageAdapter.ts` - Local SQLite storage
  - `src/protection/` - Protection logic
  - `src/ui/` - UI components (dialogs, tree views, status bar)
  - `src/telemetry.ts` - Telemetry tracking
  - `src/policy/` - Policy enforcement

##### **apps/cli**
- **Purpose:** Command-line interface for SnapBack
- **Dependencies:** `@snapback/contracts`, `@snapback/core`, `chalk`, `commander`, `ora`, `@inquirer/prompts`
- **Exports:** CLI binary (`snapback` command)
- **LOC:** 957 (TypeScript)
- **Test Coverage:** ~25%
- **Primary Responsibility:** CLI
- **Key Files:**
  - `src/index.ts` - CLI entry point
  - `src/commands/` - Command implementations
  - `src/services/api-client.ts` - API client for backend

##### **apps/mcp-server**
- **Purpose:** Model Context Protocol server for AI tools (Claude, Cursor, etc.)
- **Dependencies:** `@snapback/analytics`, `@snapback/auth`, `@snapback/config`, `@snapback/contracts`, `@snapback/core`, `@snapback/events`, `@snapback/github-action`, `@snapback/integrations`, `@snapback/policy-engine`, `@snapback/sdk`, `@modelcontextprotocol/sdk`, `better-sqlite3`, `express`, `cors`, `helmet`
- **Exports:** MCP server (stdio transport)
- **LOC:** 3,866 (TypeScript)
- **Test Coverage:** ~30%
- **Primary Responsibility:** Orchestration + Detection
- **Key Files:**
  - `src/index.ts` - MCP server entry point (799 lines)
  - `src/tools/` - MCP tool implementations
  - `src/client/extension-ipc.ts` - IPC with VSCode extension
  - `src/client/snapback-api.ts` - Backend API client
  - `src/context7/` - Context7 service integration
  - `src/http-server.ts` - HTTP server for remote MCP

##### **apps/web**
- **Purpose:** Next.js web dashboard and marketing site
- **Dependencies:** `@snapback/api`, `@snapback/auth`, `@snapback/config`, `@snapback/core`, `@snapback/infrastructure`, `@snapback/integrations`, `@snapback/platform`, `next`, `react`, 30+ UI libraries
- **Exports:** Web application
- **LOC:** ~15,000+ (TypeScript + React)
- **Test Coverage:** ~10%
- **Primary Responsibility:** UI + Dashboard
- **Key Files:**
  - Marketing pages
  - SaaS dashboard
  - User management
  - Analytics visualization

---

### 1.2 Logic Distribution Analysis

#### **Risk Analysis Logic**

**Primary Locations:**
- ✅ `packages/core/src/risk-analyzer.ts` (lines 1-499) - **SHOULD BE PRIMARY**
  - `analyzeFileChanges()` - Main risk analysis
  - `analyzeFileComplexity()` - Complexity scoring
  - Git integration for context
  
**Duplicate/Related Locations:**
- 🚨 `packages/api/src/services/guardian.ts` (lines 1-513) - **BACKEND DUPLICATE**
  - `analyze()` - Complete risk analysis with different algorithm
  - Secret detection patterns
  - Custom rule evaluation
  - Database persistence
  
- 🚨 `apps/vscode/src/services/api-client.ts` - **CLIENT CALLS BACKEND**
  - Makes HTTP calls to backend guardian service
  - Should use `@snapback/core` instead for offline mode
  
- 🚨 `apps/mcp-server/src/index.ts` (lines 26-66) - **MCP POLICY EVALUATION**
  - `evaluatePolicy()` function - SARIF-based policy logic
  - Should use `@snapback/policy-engine` (doesn't exist yet)

**Problem:** Risk scoring algorithms are **duplicated** with **different implementations**. The backend version in `packages/api/src/services/guardian.ts` has proprietary detection patterns that should NOT be exposed in client packages.

---

#### **Detection Logic**

**Primary Locations:**
- ✅ `packages/core/src/detection/plugins/secret-detection.ts` - Secret patterns
- ✅ `packages/core/src/detection/plugins/mock-replacement.ts` - Mock detection
- ✅ `packages/core/src/detection/plugins/phantom-dependency.ts` - Dependency checks
- ✅ `packages/core/src/guardian.ts` - Plugin orchestration

**Duplicate/Related Locations:**
- 🚨 `packages/api/src/services/secret-detection.ts` - **BACKEND DUPLICATE**
  - Different secret patterns
  - Different scoring weights
  - Database persistence
  
- 🚨 `packages/api/src/services/guardian.ts` - **INLINE DETECTION**
  - Large deletion detection (lines 100-120)
  - Secret pattern matching (lines 140-180)
  - SQL injection detection (lines 190-220)
  - Hardcoded credentials (lines 230-260)
  - Should use plugins from `@snapback/core`

**Problem:** Detection logic is **scattered across 3 packages** with **inconsistent patterns**. Backend has proprietary patterns not in core package.

---

#### **Policy Engine**

**Primary Locations:**
- ⚠️ `packages/policy-engine/src/` - **SKELETON ONLY**
  - `provider-gates.ts` - Provider-based gates (minimal)
  - `rbac.ts` - RBAC types (minimal)
  - `index.ts` - Exports only
  - **ONLY 402 LOC - NOT IMPLEMENTED**

**Actual Policy Logic (Scattered):**
- 🚨 `apps/mcp-server/src/index.ts` (lines 26-66)
  - `evaluatePolicy()` - SARIF-based decisions
  - Hardcoded thresholds (critical=0 → block, high>0 → review)
  
- 🚨 `apps/vscode/src/policy/` directory
  - Policy enforcement in extension
  - Protection level logic (watch/warn/block)
  
- 🚨 `packages/api/src/routes/v1/policy-evaluate.ts`
  - Backend policy evaluation endpoint
  - Permission checks
  - No actual policy engine used

**Problem:** No centralized policy engine. Policy logic is **hardcoded in 3+ places**. The `@snapback/policy-engine` package is essentially empty.

---

#### **Snapshot Management**

**Primary Locations:**
- ✅ `apps/vscode/src/services/SnapshotService.ts`
  - `createSnapshot()` - Main creation logic
  - `saveSnapshotData()` - Persistence
  - Deduplication logic
  
- ✅ `packages/sdk/src/snapshot/SnapshotManager.ts`
  - SDK-level snapshot management
  - Storage abstraction
  
- ✅ `packages/sdk/src/storage/LocalStorage.ts`
  - SQLite persistence layer
  
- ✅ `apps/mcp-server/src/tools/create-snapshot.ts`
  - MCP tool for snapshot creation
  - Blake3 content-addressable IDs

**Database Persistence:**
- 🚨 `packages/platform/src/db/schema/snapback.ts` - Schema defined but **UNDERUTILIZED**
  - Snapshots table exists
  - Most columns unused (risk_score, trigger, metadata)

**Problem:** Snapshot creation works well locally (SQLite) but **not syncing to cloud database**. Backend API has snapshot endpoints but they're not fully wired up.

---

#### **Authentication & Authorization**

**Primary Locations:**
- ✅ `packages/auth/src/auth.ts` - better-auth configuration
- ✅ `apps/mcp-server/src/auth.ts` - API key validation
- ✅ `packages/api/src/routes/v1/policy-evaluate.ts` (lines 70-95)
  - Permission checks (advancedDetection, customRules, policyEvaluation)
  
**Database Layer:**
- ✅ `packages/platform/src/db/schema/postgres.ts`
  - `apiKeys` table
  - `user` table
  - `session` table
  - `account` table

**Problem:** Auth works but **permission system not enforced consistently**. Some routes check permissions, others don't.

---

#### **Telemetry & Analytics**

**Primary Locations:**
- ⚠️ `packages/analytics/src/index.ts` - **ONLY DEFINITIONS** (73 LOC)
  - `AnalyticsEvents` enum
  - No implementation
  
- ✅ `packages/infrastructure/src/` - PostHog integration
  - Server-side telemetry
  
- ✅ `apps/vscode/src/telemetry.ts` - Extension telemetry
  - Tracks extension events
  
- ✅ `apps/web/services/analytics.ts` - Web analytics
  - PostHog tracking

**Database Persistence:**
- 🚨 `packages/platform/src/db/schema/snapback.ts`
  - `analysisEvents` table - **RARELY USED**
  - `userSafetyProfiles` table - **RARELY UPDATED**
  - Most telemetry goes to PostHog, not database

**Problem:** Telemetry is **sent to PostHog but not persisted in database**. No historical analytics data for ML training or compliance audits.

---

#### **User Decision Handling**

**Primary Locations:**
- ✅ `apps/vscode/src/handlers/SaveHandler.ts`
  - Intercepts file saves
  - Shows dialogs based on protection level
  - Records user decisions (allow/block/bypass)
  
- ✅ `apps/vscode/src/ui/dialogs.ts`
  - User decision UI
  
**Database Persistence:**
- 🚨 **NOT PERSISTED**
  - User decisions (allow/block/bypass) are **NOT saved to database**
  - No audit trail of who bypassed what warnings
  - No data for analyzing false positives

**Problem:** Critical compliance data (user decisions, bypass reasons) is **generated but not persisted**.

---

#### **File System Operations**

**Primary Locations:**
- ✅ `apps/vscode/src/protection/FileSystemWatcher.ts`
  - Watches protected files
  - Triggers snapshots on changes
  
- ✅ `packages/core/src/git-integration.ts`
  - Git operations
  - Diff parsing
  - Commit context

**Problem:** Works well, no major issues.

---

#### **MCP Protocol Handling**

**Primary Locations:**
- ✅ `apps/mcp-server/src/index.ts` - Main MCP server
- ✅ `packages/core/src/mcp-client.ts` - MCP client
- ✅ `packages/core/src/mcp-federation.ts` - MCP federation

**Tools Implemented:**
- `snapback.analyze_risk` - Risk analysis
- `snapback.create_checkpoint` - Snapshot creation
- `snapback.restore_checkpoint` - Snapshot restoration
- `snapback.list_checkpoints` - List snapshots
- `snapback.get_protection_status` - Protection info
- Context7 tools (documentation search)

**Problem:** MCP server currently uses **local Guardian instance** instead of backend API for risk analysis. Should call backend for IP protection.

---

#### **VSCode Integration**

**Primary Locations:**
- ✅ `apps/vscode/src/extension.ts` - Main extension
- ✅ `apps/vscode/src/commands/` - 25+ commands
- ✅ `apps/vscode/src/ui/` - Tree views, status bar, dialogs
- ✅ `apps/vscode/src/providers/` - Various providers

**Integration Points:**
- Status bar
- Tree views (snapshots, protected files)
- CodeLens
- Diagnostics
- Quick fixes
- Context menus
- Walkthroughs

**Problem:** Too much business logic in extension (should be in `@snapback/core` or backend).

---

### Summary of Logic Distribution Issues

| Logic Domain | Primary Location | Duplicates | Database Persistence | Status |
|-------------|------------------|------------|---------------------|---------|
| Risk Analysis | `@snapback/core` | Backend API, MCP Server | ✅ Partial (backend only) | 🚨 Duplicated |
| Detection | `@snapback/core` plugins | Backend API | ✅ Partial (backend only) | 🚨 Duplicated |
| Policy Engine | None | MCP, VSCode, Backend | ❌ No | 🚨 Missing |
| Snapshots | VSCode, SDK | MCP Server | ⚠️ Local only | ⚠️ Not synced |
| Auth | `@snapback/auth` | None | ✅ Yes | ✅ Good |
| Telemetry | PostHog | None | ❌ No | 🚨 Not persisted |
| User Decisions | VSCode UI | None | ❌ No | 🚨 Not persisted |
| File System | VSCode, Core | None | N/A | ✅ Good |
| MCP Protocol | MCP Server | None | N/A | ⚠️ Uses local logic |
| VSCode UI | VSCode | None | N/A | ⚠️ Too much logic |

---

## End of Part 1

**Next:** Part 2 will cover Section 1.3 (Data Flow Mapping) with detailed user journey traces.
