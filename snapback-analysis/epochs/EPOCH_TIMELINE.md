# SnapBack Epoch Timeline

> 751 commits across 27 days (Dec 1-27, 2025) = ~28 commits/day average
> Peak: Dec 21 (70 commits), Dec 11 (58), Dec 6 (53)

## Epoch Overview

| Epoch | Dates | Commits | Theme | Key Artifacts |
|-------|-------|---------|-------|---------------|
| 1 | Dec 1 | 1-10 | Genesis & Marketing | Initial commit, marketplace links |
| 2 | Dec 2 | 11-50 | Protection Infrastructure | Guardian-Lite, notifications, SnapshotStore |
| 3 | Dec 3 | 51-110 | Auth & Telemetry | RFC 8628, GDPR, dashboard metrics |
| 4 | Dec 4 | 111-160 | TDD Marathon | 213 tests, domain types, AutoDecisionEngine |
| 5 | Dec 5-8 | 161-280 | OSS & Testing | 330+ tests, 100% command coverage |
| 6 | Dec 6-10 | 281-380 | Marketing & Consolidation | Pattern memory messaging, code audit |
| 7 | Dec 10-14 | 381-450 | Real-time & Integration | Supabase hooks, Phases 2-6 |
| 8 | Dec 15-19 | 451-550 | Engine V2 | Signal bridge, V1->V2 migration |
| 9 | Dec 20-24 | 551-675 | Intelligence Package | @snapback/intelligence, policy engine |
| 10 | Dec 25-27 | 676-751 | Engine V2 Completion | Signal orchestrator, daemon, webview |

---

## Epoch 1: Genesis & Marketing Foundation (Dec 1)

**Commits**: 884ce9e62 - 451436b7d (1-10)
**Character**: Infrastructure setup with marketing focus

### Key Decisions
- Marketing-only deployment initially (SaaS routes excluded)
- VS Code extension marketplace as primary distribution
- Subdomain architecture (docs.snapback.dev -> new-docs.snapback.dev)

### Architectural Seeds
- SnapshotStore with atomic write utilities
- Storage test suite foundation
- @snapback/auth and @snapback/infrastructure dependencies

### Pattern: "Ship Marketing First"
The initial commit already had a mature VS Code extension - this was a migration from a prior repo, not a green-field start.

---

## Epoch 2: Protection Infrastructure (Dec 2)

**Commits**: 8280b0ade - 0770a2e0e (11-50)
**Character**: Core protection features with TDD foundation

### Key Features
- Protection notification infrastructure with rate limiting
- .snapbackrc configuration file format
- Activation phases with improved initialization
- Session tree view provider
- Guardian-Lite code analysis engine

### Architectural Patterns
- Non-blocking activation (perf: defer heavy ops to background)
- Phase-based initialization
- Grouping modes and constants for UX
- Extraction scripts for package separation

### Testing Evolution
- Unit tests for notification system
- Non-blocking activation test suite
- Platform test snapshots

### AI-Relevant Insight
**Guardian-Lite** = Lightweight code analysis engine specifically for AI-generated code detection. This is the first sign of SnapBack's AI-awareness.

---

## Epoch 3: Auth & Telemetry (Dec 3)

**Commits**: 08a930193 - 1d39cf525 (51-110)
**Character**: Enterprise features and data infrastructure

### Key Features
- RFC 8628 Device Authorization Flow (OAuth for CLI/extensions)
- GDPR compliance and audit logging
- Diagnostic event tracking
- Dashboard metrics collection and aggregation
- Cloud explorer integration

### TDD Methodology Crystallizes
- RED tests first: 25 API contract tests
- GREEN phase: Implementation matching tests
- Contracts package with dashboard metrics types

### Telemetry Architecture
- Event naming standardized to dot.notation
- Skip reason tracking with semantic distinction
- Nudge system and analytics tests

### Pattern: "Contracts-First TDD"
The contracts package defines types BEFORE implementation - preventing drift between API and clients.

---

## Epoch 4: TDD Marathon (Dec 4)

**Commits**: 4bf3e9daa - bee7591d9 (111-160)
**Character**: Massive test coverage push

### Test Coverage Explosion
- **Phases 1-7**: 213 tests
  - Domain types
  - AutoDecisionEngine
  - PatternMatcher
  - RateLimiter
  - SignalAggregator
  - SaveContextBuilder
  - NotificationAdapter
- **Phase 9**: ExtensionWiring integration (38 tests)
- **Phases 10-12**: 308 total tests, deprecation notices

### Key Components Tested
- Risk factor descriptions formalized as SDK utility
- Design token system for marketing pages
- Better-auth API integration

### Architectural Decision: AutoDecisionEngine
The engine that decides whether to auto-protect files based on:
- Pattern matching (code patterns, file patterns)
- Rate limiting (burst detection)
- Signal aggregation (multiple risk signals)

---

## Epoch 5: OSS & Test Stabilization (Dec 5-8)

**Commits**: b75626331 - ff917c04f (161-280)
**Character**: Test infrastructure hardening and OSS preparation

### Test Infrastructure Overhaul
- 143 broken tests categorized by root cause
- Deterministic testing infrastructure
- 113 robust integration tests
- 89 Guardian/utility/session tests
- 128 additional tests for 100% command coverage

### OSS Preparation
- @snapback-oss namespace created
- Licenses, changelogs, codecov setup
- Community foundation (GitHub templates, workflows, SLA)

### Consolidation Patterns
- Retry utility consolidated into canonical SDK
- Duplicate logger removed from @snapback/config
- Error helpers consolidated

### Pattern: "Canonical Source of Truth"
Each utility should have ONE canonical location - others import from it.

---

## Epoch 6: Marketing & Consolidation (Dec 6-10)

**Commits**: 7565a835e - 432d98edb (281-380)
**Character**: Brand messaging and code quality

### Marketing Evolution
- "Pattern Memory" messaging across pricing, features, homepage
- Tier naming standardization: Free | Pro | Team | Enterprise
- SEO optimization with standardized GitHub/npm links

### Build Stability
- Comprehensive build stability hardening
- Contracts package circular dependency fixed
- Corrupted device-trials service removed

### API Key Flow
- API key tests with MSW
- Waitlist and API key flows completed

### Pattern: "Messaging Coherence"
Technical features need marketing translation - "Pattern Memory" is the human-readable version of SnapBack's learning capabilities.

---

## Epoch 7: Real-time & Integration (Dec 10-14)

**Commits**: d02655ae4 - 290dbafe1 (381-450)
**Character**: Real-time infrastructure and pipeline hardening

### Supabase Integration
- Phase 2: useProtectionStatus, useBulkProtectionStatus hooks
- Phase 3: Real-time hooks integrated into dashboard
- Phase 4: Real-time callbacks and data-driven metrics
- Phase 5: Data-driven metrics completion
- Phase 6: Context7 best practices

### Pipeline Hardening
- Namespace-only architecture migration
- Export integrity validation layer
- Phase 1-2 pipeline hardening learnings documented

### Catalog Dependencies
- All hardcoded versions converted to catalog: protocol
- Monorepo convention standardization

### Pattern: "Phased Rollout"
Major features implemented in numbered phases with documentation at each step.

---

## Epoch 8: Engine V2 (Dec 15-19)

**Commits**: 196f1e0d8 - 45a17fd8f (451-550)
**Character**: Core architecture rewrite

### Engine Restructure
- snapback/ -> packages/engine migration
- Signal system introduced:
  - Burst detection signal
  - AI detection signal
  - Velocity signal
  - Risk-score signal

### Decision Engine
- Orchestrator with 19 tests
- Phase 1: Core capabilities with 160 passing tests
- SignalBridge + EventBridge wiring

### V1 -> V2 Migration
- Security and patterns validators
- Restore and notify actions
- Editor decorations migrated
- Guardian-Lite removed in favor of V2

### Pattern: "Signal-Based Architecture"
Decoupled signals that can be composed - each signal is independent but orchestrated together.

---

## Epoch 9: Intelligence Package (Dec 20-24)

**Commits**: fe0f952f0 - ed12c5b0f (551-675)
**Character**: AI intelligence extraction

### @snapback/intelligence Package
- Policy engine integration
- Learning system embedded
- Vitals intelligence module
- Advisory rules system

### MCP Server Integration
- Intelligence dependency added
- Config store integration
- Telemetry improvements

### Cleanup
- Obsolete @snapback/policy-engine removed
- Legacy learning and validation modules removed

### Pattern: "Extract When Mature"
Intelligence features extracted into dedicated package only after proving themselves in the extension.

---

## Epoch 10: Engine V2 Completion (Dec 25-27)

**Commits**: 618327a9b - b67efd928 (676-751)
**Character**: Infrastructure completion for demo

### New Infrastructure
- Daemon package
- Webview package
- UI infrastructure with design tokens
- Signal orchestrator

### Current Architecture
```
apps/
  api/        - Backend API
  cli/        - Command-line interface
  docs/       - Documentation site
  vscode/     - VS Code extension
  web/        - Marketing & dashboard

packages/
  auth/         - Authentication
  config/       - Configuration management
  contracts/    - Shared type contracts
  core/         - Core utilities
  engine/       - V2 signal engine
  intelligence/ - AI intelligence & policy
  mcp/          - MCP server
  mcp-config/   - MCP configuration
  platform/     - Platform infrastructure
  sdk/          - Client SDK
  testing/      - Test utilities
  ui/           - UI components
```

### Pattern: "Demo-Driven Development"
Final sprint clearly focused on demo readiness - webview, daemon, and UI polish.

---

## Cross-Epoch Patterns

### 1. TDD Rhythm
Every major feature follows RED -> GREEN -> BLUE (refactor) cycle with explicit documentation.

### 2. Consolidation Loops
Periods of rapid feature addition followed by consolidation (removing duplicates, canonical sources).

### 3. Phased Implementation
Major features split into numbered phases (5-12 typical), each documented and tested.

### 4. Migration Discipline
V1 -> V2 migrations done incrementally with bridge patterns, not big-bang rewrites.

### 5. Privacy-First
GDPR compliance, audit logging, and metadata-only approaches baked in from Epoch 3.

### 6. Signal Architecture
From monolithic code to signal-based composition - each concern is a separate signal.

---

## Velocity Analysis

| Week | Dates | Commits | Dominant Activity |
|------|-------|---------|-------------------|
| 1 | Dec 1-7 | 227 | Foundation + TDD |
| 2 | Dec 8-14 | 189 | Testing + Integration |
| 3 | Dec 15-21 | 213 | Engine V2 + Intelligence |
| 4 | Dec 22-27 | 122 | Completion + Polish |

**Observation**: Steady velocity with slight reduction in final week (holiday period, completion focus).
