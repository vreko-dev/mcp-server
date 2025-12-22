# SnapBack Intelligence Platform - Complete Feature Specification

**Version**: 2.0
**Status**: Definitive Implementation Target
**Date**: December 2025
**Pivot**: AI Coding Intelligence Platform (beyond safety net)

---

## Table of Contents

1. [Platform Vision](#1-platform-vision)
2. [Feature ROI Legend](#2-feature-roi-legend)
3. [VS Code Extension](#3-vs-code-extension-42-features)
4. [Web Dashboard](#4-web-dashboard-24-features)
5. [MCP Server](#5-mcp-server-17-features)
6. [CLI](#6-cli-12-features)
7. [Supporting Packages](#7-supporting-packages-55-features)
8. [Implementation Priority Matrix](#8-implementation-priority-matrix)

---

# 1. Platform Vision

## The Intelligence Platform Pivot

**Old Positioning**: "Safety net for AI-assisted development"
**New Positioning**: "Intelligence layer for AI-native coding"

### Core Value Propositions
1. **Reactive Protection** - Catch and rollback AI disasters
2. **Proactive Health** - Scan for vulnerabilities and inconsistencies
3. **AI Insights** - Track which AI tools work for your codebase
4. **Developer Intelligence** - Learn patterns, improve trust

### Key Narrative
> "42% of commits are AI-generated. You have zero visibility into which assistants are trustworthy. SnapBack tracks exactly which suggestions survive vs cause issues—so you learn which tool to trust for which tasks."

---

# 2. Feature ROI Legend

| ROI Tier | Impact | Build Time | Description |
|----------|--------|------------|-------------|
| **🔴 P0** | CRITICAL | N/A | Demo blockers, must ship |
| **🟠 P1** | HIGH | Worth it | Core differentiators, high value |
| **🟡 P2** | MEDIUM | Good ROI | Important but can defer |
| **⚪ P3** | LOW | OPTIONAL | Nice-to-have, low impact |

---

# 3. VS Code Extension (42 Features)

## 3.1 Foundation

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F0.1** | TypeScript Compilation Fix | 🔴 P0 | Resolve 32+ TS errors blocking builds |
| **F0.2** | Bundle Size Optimization | 🔴 P0 | 11MB → <2MB (demo blocker) |

## 3.2 Authentication

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F3.1** | Browser Auth Launch | 🔴 P0 | Opens web portal for OAuth |
| **F3.2** | Grant Code Exchange | 🔴 P0 | Extension receives token from web |
| **F3.3** | Secure Credential Storage | 🟠 P1 | VS Code SecretStorage API |
| **F3.4** | Token Refresh | 🟡 P2 | Automatic refresh before expiry |
| **F3.5** | Offline Mode | ⚪ P3 OPTIONAL | Graceful degradation without network |

## 3.3 Core Protection Engine

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F4.1** | SaveContext Type | 🔴 P0 | Type definition for save analysis |
| **F4.2** | ProtectionDecision Type | 🔴 P0 | Type for protection outcomes |
| **F4.3** | AutoDecisionEngine | 🟠 P1 | Automatic protection level selection |
| **F4.4** | Configuration Loading | 🟠 P1 | .snapbackrc parsing |
| **F4.5** | Pattern Matching | 🟠 P1 | Glob patterns for file targeting |
| **F4.6** | Protection Levels | 🔴 P0 | Watch/Warn/Block implementation |

## 3.4 Signal Detection

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F5.1** | SignalAggregator | 🟠 P1 | Combines multiple detection signals |
| **F5.2** | Detector Wiring | 🟠 P1 | Register AI, burst, session detectors |
| **F5.3** | SaveContextBuilder | 🟠 P1 | Constructs context for analysis |
| **F5.4** | Confidence Scoring | 🟡 P2 | Weighted signal confidence |
| **F5.5** | Signal Telemetry | 🟡 P2 | Track detection accuracy |

## 3.5 AI Detection (Local)

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F6.1** | Basic AI Detection | 🔴 P0 | Pattern-based detection (generic) |
| **F6.2** | Cursor Detection | 🟠 P1 | Cursor-specific patterns |
| **F6.3** | Copilot Detection | 🟠 P1 | Copilot-specific patterns |
| **F6.4** | Claude Code Detection | 🟠 P1 | Claude-specific patterns |

## 3.6 Burst Detection

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F7.1** | Burst Detector | 🟠 P1 | Rapid edit detection |
| **F7.2** | Burst Configuration | 🟡 P2 | Configurable thresholds |
| **F7.3** | Session Burst Start | 🟡 P2 | Detect burst session begins |
| **F7.4** | Burst Telemetry | ⚪ P3 OPTIONAL | Track burst patterns |

## 3.7 Storage (File-Based)

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F8.1** | CooldownCache | 🔴 P0 | In-memory cooldown tracking |
| **F8.2** | BlobStore | 🔴 P0 | Content-addressable storage |
| **F8.3** | SnapshotStore | 🔴 P0 | Snapshot manifests |
| **F8.4** | SessionStore | 🟠 P1 | Session manifests |
| **F8.5** | AuditLog | 🟡 P2 | JSONL audit trail |
| **F8.6** | StorageManager | 🔴 P0 | Unified storage interface |
| **F8.7** | Atomic Writes | 🔴 P0 | Crash-safe file writes |
| **F8.8** | Content Hashing | 🔴 P0 | SHA-256 for dedup |

## 3.8 Snapshots

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F10.1** | Snapshot Orchestrator | 🔴 P0 | Coordinates snapshot creation |
| **F10.2** | Rate Limiter | 🟡 P2 | Prevent snapshot flooding |
| **F10.3** | Deduplication | 🟠 P1 | Only store changed content |
| **F10.4** | Metadata Enrichment | 🟠 P1 | AI detection, risk score |
| **F10.5** | Session Association | 🟡 P2 | Link snapshots to sessions |
| **F10.6** | Snapshot Telemetry | 🟠 P1 | Track creation patterns |

## 3.9 Recovery

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F11.2** | Multi-File Restore | 🔴 P0 | Restore entire snapshot |
| **F11.4** | Restore Confirmation UI | 🟠 P1 | User confirms before restore |
| **F11.5** | Restore Telemetry | 🟠 P1 | Track restore usage |

## 3.10 Sessions

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F12.1** | Session Start | 🟠 P1 | Begin tracking session |
| **F12.2** | Session Finalize | 🟠 P1 | End and persist session |
| **F12.3** | File Tracking | 🟠 P1 | Track files in session |
| **F12.5** | Session Summary | 🟡 P2 | Generate session report |

## 3.11 Cloud Features

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F9.3** | Cross-Device Restore | ⚪ P3 OPTIONAL | Sync snapshots to cloud (Pro) |

## 3.12 Intelligence Features (New - Pivot)

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F40.1** | Quick Scan Command | 🟠 P1 | On-demand codebase scan |
| **F40.2** | Scan Results Webview | 🟠 P1 | Display findings in panel |
| **F40.3** | AI Tool Insights Status | 🟡 P2 | Status bar showing AI metrics |
| **F40.4** | Code Health Gutter | ⚪ P3 OPTIONAL | Inline health indicators |

---

# 4. Web Dashboard (24 Features)

## 4.1 Marketing Site

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F21.1** | Landing Page | 🔴 P0 | Hero + value proposition |
| **F21.2** | How It Works | 🟠 P1 | Feature explanation |
| **F21.3** | Pricing Page | 🟠 P1 | Tier comparison |
| **F21.4** | FAQ | ⚪ P3 OPTIONAL | Common questions |

## 4.2 Authentication

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F22.1** | Sign Up Flow | 🔴 P0 | GitHub/Google OAuth |
| **F22.2** | Login Flow | 🔴 P0 | Existing user login |
| **F22.3** | Email Verification | 🟡 P2 | Verify email address |
| **F22.4** | Password Reset | ⚪ P3 OPTIONAL | Recovery flow (OAuth makes this less critical) |

## 4.3 Dashboard - Core Metrics

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F23.1** | Metrics Grid | 🔴 P0 | Snapshot count, recoveries, files protected |
| **F23.2** | AI Detection Stats | 🔴 P0 | Detection by tool (Cursor, Copilot, Claude) |
| **F23.3** | Activity Feed | 🟠 P1 | Recent snapshots, restores, detections |

## 4.4 Dashboard - Intelligence (New - Pivot)

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F41.1** | AI Tool Trustworthiness | 🟠 P1 | Acceptance rate by tool |
| **F41.2** | Rollback Analytics | 🟠 P1 | Why rollbacks happen, patterns |
| **F41.3** | Code Health Trends | 🟡 P2 | Quality over time |
| **F41.4** | Team Insights | ⚪ P3 OPTIONAL | Per-developer patterns (Pro/Enterprise) |
| **F41.5** | Vulnerability Summary | 🟡 P2 | Issues found by scan |
| **F41.6** | AI Adoption Metrics | 🟡 P2 | % AI-generated commits |

## 4.5 API Key Management

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F24.1** | Key List | 🔴 P0 | Display user's API keys |
| **F24.2** | Create Key Modal | 🔴 P0 | Generate new key with permissions |
| **F24.3** | Revoke Key | 🔴 P0 | Invalidate existing key |

## 4.6 Settings

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F25.1** | Profile Settings | 🟡 P2 | Name, email, avatar |
| **F25.2** | Notification Preferences | ⚪ P3 OPTIONAL | Email preferences |
| **F25.3** | Billing Portal | 🟡 P2 | Stripe integration |
| **F25.4** | Team Management | ⚪ P3 OPTIONAL | Org/team settings (Pro/Enterprise) |

---

# 5. MCP Server (17 Features)

## 5.1 Transport

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F16.1** | STDIO Transport | 🔴 P0 | Standard MCP transport |
| **F16.2** | HTTP/SSE Transport | 🟡 P2 | Web-based transport |

## 5.2 Core Infrastructure

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F16.3** | Tool Registration | 🔴 P0 | Register tools with MCP SDK |
| **F16.4** | Authentication | 🔴 P0 | API key validation |
| **F16.5** | Input Validation | 🔴 P0 | Zod schema validation |
| **F16.6** | Error Sanitization | 🟠 P1 | Production-safe errors |

## 5.3 Tools - Protection

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F17.1** | analyze_risk (basic) | 🔴 P0 | Free tier risk analysis |
| **F17.2** | analyze_risk (enhanced) | 🟠 P1 | Pro tier with ML (server) |
| **F17.3** | check_dependencies | 🟠 P1 | Dependency risk analysis |
| **F17.4** | create_checkpoint | 🔴 P0 | Create snapshot (Pro) |
| **F17.5** | list_checkpoints | 🔴 P0 | List snapshots (Pro) |
| **F17.6** | restore_checkpoint | 🔴 P0 | Restore snapshot (Pro) |
| **F17.7** | catalog.list_tools | 🟡 P2 | List available MCP tools |

## 5.4 Tools - Intelligence (New - Pivot)

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F42.1** | scan_codebase | 🟠 P1 | On-demand health scan |
| **F42.2** | get_ai_insights | 🟠 P1 | AI tool trust metrics |
| **F42.3** | suggest_fix | 🟡 P2 | Auto-fix suggestions |

## 5.5 Context7 Integration

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F18.1** | resolve-library-id | 🟡 P2 | Resolve library to Context7 ID |
| **F18.2** | get-library-docs | 🟡 P2 | Fetch library documentation |
| **F18.3** | Caching | 🟡 P2 | TTL cache for responses |
| **F18.4** | Retry Logic | ⚪ P3 OPTIONAL | Exponential backoff |

---

# 6. CLI (12 Features)

## 6.1 Framework

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F19.1** | Commander Setup | 🟠 P1 | CLI framework |
| **F19.2** | Config Loading | 🟠 P1 | Load .snapbackrc |
| **F19.3** | Auth Command | 🟠 P1 | `snapback auth login` |
| **F19.4** | Output Formatting | 🟡 P2 | Table, JSON, SARIF formats |

## 6.2 Commands

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F20.1** | init | 🟠 P1 | Initialize SnapBack in project |
| **F20.2** | snapshot | 🟠 P1 | Manual snapshot creation |
| **F20.3** | restore | 🟠 P1 | Restore from snapshot |
| **F20.4** | status | 🟠 P1 | Show protection status |
| **F20.5** | scan | 🟠 P1 | Run codebase health scan |
| **F20.6** | config | 🟡 P2 | Manage configuration |

## 6.3 CI/CD Integration (New - Pivot)

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F43.1** | scan --fail-on | 🟠 P1 | Fail CI on severity threshold |
| **F43.2** | scan --format sarif | 🟡 P2 | GitHub Security tab format |

---

# 7. Supporting Packages (55 Features)

## 7.1 packages/auth

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F1.1** | GitHub OAuth | 🔴 P0 | GitHub provider |
| **F1.2** | Google OAuth | 🔴 P0 | Google provider |
| **F1.3** | Session Management | 🔴 P0 | Better Auth sessions |
| **F1.4** | Secure Cookies | 🔴 P0 | httpOnly, secure flags |
| **F1.5** | Logout | 🟠 P1 | Session invalidation |

## 7.2 packages/api

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F2.1** | Key Generation | 🔴 P0 | Create sk_live_* keys |
| **F2.2** | Key Hash Storage | 🔴 P0 | SHA-256 hashing |
| **F2.3** | Key Validation | 🔴 P0 | Validate incoming keys |
| **F2.4** | Usage Tracking | 🟠 P1 | Track API calls per key |
| **F2.5** | Key Rotation | 🟡 P2 | Rotate without downtime |
| **F2.6** | Permission Scopes | 🟡 P2 | Granular permissions |

## 7.3 packages/platform (Database)

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F0.5** | DB Migrations | 🔴 P0 | Drizzle migrations |
| **F44.1** | User Schema | 🔴 P0 | Better Auth user table |
| **F44.2** | API Key Schema | 🔴 P0 | Keys + metadata |
| **F44.3** | Snapshot Schema | 🔴 P0 | Snapshot metadata |
| **F44.4** | Telemetry Schema | 🟠 P1 | Event storage |
| **F44.5** | Session Schema | 🟠 P1 | Extension sessions |
| **F44.6** | Scan Results Schema | 🟡 P2 | Stored scan findings |
| **F44.7** | AI Metrics Schema | 🟡 P2 | Tool trustworthiness data |

## 7.4 packages/contracts

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F26.1** | Event Schemas (Zod) | 🔴 P0 | Type-safe events |
| **F26.2** | Core Events (7) | 🔴 P0 | save_attempt, snapshot_created, etc. |
| **F26.3** | Infrastructure Events | 🟠 P1 | 60 business events |
| **F26.4** | Event Bus Types | 🟠 P1 | Internal distribution |
| **F26.5** | Property Blocklist | 🔴 P0 | Privacy sanitization |

## 7.5 packages/sdk

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F45.1** | API Client | 🟠 P1 | Type-safe API calls |
| **F45.2** | Event Tracking | 🟠 P1 | track() method |
| **F45.3** | Config Loader | 🟠 P1 | Load .snapbackrc |
| **F45.4** | TypeScript Types | 🔴 P0 | Exported types |

## 7.6 packages/infrastructure

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F27.1** | Telemetry Client | 🔴 P0 | PostHog wrapper |
| **F27.2** | Privacy Sanitization | 🔴 P0 | Strip PII |
| **F27.3** | Rate Limiting | 🟠 P1 | Redis token bucket |

## 7.7 packages/analytics

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F0.4** | PostHog Consolidation | 🔴 P0 | Remove 6 unused providers |
| **F46.1** | Funnel Tracking | 🟠 P1 | Activation funnel |
| **F46.2** | Retention Tracking | 🟡 P2 | D7/D30 retention |
| **F46.3** | AI Tool Analytics | 🟠 P1 | Trust metrics by tool |

## 7.8 Server-Side Analysis (packages/api)

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F6.5** | ML AI Detection | 🟡 P2 | Server-side ML model (Pro) |
| **F9.1** | Cloud Sync Upload | ⚪ P3 OPTIONAL | Snapshot to S3 (Pro) |
| **F9.2** | Cloud Sync Download | ⚪ P3 OPTIONAL | Restore from S3 (Pro) |
| **F11.1** | Content Retrieval API | 🟡 P2 | Fetch snapshot content |
| **F11.3** | Rollback Validation | 🟡 P2 | Safety scoring |
| **F12.4** | DBSCAN Clustering | ⚪ P3 OPTIONAL | Smart session grouping |
| **F13.1** | Risk Engine Core | 🟠 P1 | Risk scoring algorithm |
| **F13.2** | Dependency Analysis | 🟠 P1 | madge integration |
| **F13.3** | AST Analysis | 🟡 P2 | Breaking change detection |
| **F13.4** | Risk Score Calculation | 🟠 P1 | Weighted scoring |
| **F13.5** | Risk Telemetry | 🟡 P2 | Track accuracy |
| **F14.1** | DBSCAN Endpoint | ⚪ P3 OPTIONAL | API for grouping |
| **F15.1** | Rollback Endpoint | 🟡 P2 | API for validation |

## 7.9 Tier Gating

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F28.1** | Free Tier Definition | 🔴 P0 | Basic features |
| **F28.2** | Pro Tier Definition | 🔴 P0 | Advanced features |
| **F28.3** | Enterprise Definition | ⚪ P3 OPTIONAL | Team features |
| **F28.4** | Feature Gate Middleware | 🔴 P0 | Check tier before action |
| **F28.5** | Upgrade Prompts | 🟠 P1 | Contextual upsells |
| **F29.1** | Usage Limits | 🟠 P1 | Free tier caps |
| **F29.2** | Limit Warning | 🟡 P2 | Approaching limit alerts |
| **F29.3** | Limit Enforcement | 🟠 P1 | Block at limit |

## 7.10 Intelligence Package (New - Pivot)

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F47.1** | Scanner Core | 🟠 P1 | Extensible rule engine |
| **F47.2** | Built-in Rules: npm audit | 🟠 P1 | Security vulnerabilities |
| **F47.3** | Built-in Rules: depcheck | 🟠 P1 | Unused dependencies |
| **F47.4** | Built-in Rules: naming | 🟡 P2 | Naming consistency |
| **F47.5** | Built-in Rules: AI patterns | 🟠 P1 | AI-generated code patterns |
| **F47.6** | Rule Plugin System | 🟡 P2 | Custom rule support |
| **F47.7** | Incremental Scanning | 🟡 P2 | Only scan changed files |
| **F47.8** | Result Caching | 🟡 P2 | Cache scan results |

## 7.11 Testing

| ID | Feature | ROI | Description |
|----|---------|-----|-------------|
| **F30.1** | Extension Unit Tests | 🟠 P1 | Vitest for extension |
| **F30.2** | Extension Integration | 🟠 P1 | VS Code test runner |
| **F30.3** | API Contract Tests | 🟠 P1 | oRPC schema validation |
| **F30.4** | E2E Activation Funnel | 🔴 P0 | Install → Auth → First Save |
| **F31.1** | Mock VS Code API | 🟠 P1 | Test isolation |
| **F32.1** | Playwright E2E | 🟠 P1 | Web dashboard tests |
| **F32.2** | Load Testing | ⚪ P3 OPTIONAL | API performance |

---

# 8. Implementation Priority Matrix

## 🔴 P0 - Demo Blockers (38 features)

Must ship for YC demo. No exceptions.

| Component | Features | Count |
|-----------|----------|-------|
| Extension | F0.1-F0.2, F3.1-F3.2, F4.1-F4.2, F4.6, F6.1, F8.1-F8.3, F8.6-F8.8, F10.1, F11.2 | 16 |
| Dashboard | F21.1, F22.1-F22.2, F23.1-F23.2, F24.1-F24.3 | 8 |
| MCP | F16.1, F16.3-F16.5, F17.1, F17.4-F17.6 | 8 |
| Packages | F0.4, F0.5, F1.1-F1.4, F2.1-F2.3, F26.1-F26.2, F26.5, F27.1-F27.2, F28.1-F28.2, F28.4, F45.4, F30.4 | 18 |

**Estimated Time**: 8-10 days focused sprint

## 🟠 P1 - Core Differentiators (52 features)

Ship within 2 weeks of demo. High value.

| Component | Features | Count |
|-----------|----------|-------|
| Extension | F3.3, F4.3-F4.5, F5.1-F5.3, F6.2-F6.4, F7.1, F8.4, F10.3-F10.4, F10.6, F11.4-F11.5, F12.1-F12.3, F40.1-F40.2 | 22 |
| Dashboard | F21.2-F21.3, F23.3, F41.1-F41.2 | 5 |
| MCP | F16.6, F17.2-F17.3, F42.1-F42.2 | 5 |
| CLI | F19.1-F19.3, F20.1-F20.5, F43.1 | 9 |
| Packages | F1.5, F2.4, F13.1-F13.2, F13.4, F27.3, F28.5, F29.1, F29.3, F30.1-F30.3, F31.1, F32.1, F45.1-F45.3, F46.1, F46.3, F47.1-F47.3, F47.5 | 21 |

**Estimated Time**: 10-14 days

## 🟡 P2 - Important Enhancements (35 features)

Ship within month 1. Good ROI.

| Component | Features | Count |
|-----------|----------|-------|
| Extension | F3.4, F5.4-F5.5, F7.2-F7.3, F8.5, F10.2, F10.5, F12.5, F40.3 | 10 |
| Dashboard | F22.3, F25.1, F25.3, F41.3, F41.5-F41.6 | 6 |
| MCP | F16.2, F17.7, F18.1-F18.3, F42.3 | 6 |
| CLI | F19.4, F20.6, F43.2 | 3 |
| Packages | F2.5-F2.6, F6.5, F11.1, F11.3, F13.3, F13.5, F15.1, F29.2, F44.6-F44.7, F46.2, F47.4, F47.6-F47.8 | 16 |

**Estimated Time**: 2-3 weeks

## ⚪ P3 - Optional/Low Impact (25 features)

Defer or cut. Nice-to-have only.

| Component | Features | Count |
|-----------|----------|-------|
| Extension | F3.5, F7.4, F9.3, F40.4 | 4 |
| Dashboard | F21.4, F22.4, F25.2, F25.4, F41.4 | 5 |
| MCP | F18.4 | 1 |
| Packages | F9.1-F9.2, F12.4, F14.1, F28.3, F32.2 | 6 |

**Recommendation**: Skip unless specifically requested

---

# Summary

## Feature Count by Priority

| Priority | Count | % of Total |
|----------|-------|------------|
| 🔴 P0 | 38 | 25% |
| 🟠 P1 | 52 | 35% |
| 🟡 P2 | 35 | 23% |
| ⚪ P3 OPTIONAL | 25 | 17% |
| **Total** | **150** | 100% |

## Critical Path for Demo

```
Week 1: Foundation (P0)
├── Extension: TS fix, bundle size, auth, storage, protection basics
├── Dashboard: Landing, OAuth, metrics, API keys
├── MCP: STDIO, auth, core tools
└── Packages: Auth, DB, contracts, analytics consolidation

Week 2: Differentiation (P1)
├── Extension: AI detection, sessions, signal aggregation
├── Dashboard: Activity feed, AI insights
├── MCP: Enhanced tools
├── CLI: Core commands
└── Packages: SDK, tier gating

Week 3-4: Polish (P2)
├── Intelligence features (scanning)
├── CI/CD integration
├── Additional analytics
└── Performance optimization
```

## Intelligence Platform Features (Pivot)

The following features specifically support the "AI Intelligence Platform" positioning:

| ID | Feature | ROI | Demo? |
|----|---------|-----|-------|
| F23.2 | AI Detection Stats | 🔴 P0 | ✅ |
| F41.1 | AI Tool Trustworthiness | 🟠 P1 | Optional |
| F41.2 | Rollback Analytics | 🟠 P1 | Optional |
| F41.6 | AI Adoption Metrics | 🟡 P2 | No |
| F40.1 | Quick Scan Command | 🟠 P1 | Optional |
| F42.1 | scan_codebase (MCP) | 🟠 P1 | Optional |
| F42.2 | get_ai_insights (MCP) | 🟠 P1 | Optional |
| F20.5 | CLI scan command | 🟠 P1 | Optional |
| F47.1-F47.5 | Scanner rules | 🟠 P1 | No |
| F46.3 | AI Tool Analytics | 🟠 P1 | Optional |

**Recommendation**: For YC demo, focus on F23.2 (AI Detection Stats) to show the intelligence angle. Full scanning features can be mentioned as roadmap.

ALSO!
This is some feedback I received on my SnapBack architecture is it applicable to our feature list? Do you agree? This is a strong, defensible architecture. Your decision to isolate the "Critical Activation Funnel" (Free/Local) from the "Value-Add Loop" (Pro/Server) is the correct strategic move. It ensures that the core promise—saving your work—is fast, private, and offline-capable, while the intelligence becomes the upsell.
However, there are three specific architectural risks (inconsistencies and UX traps) that could hurt adoption if not addressed before the demo or V1 launch.
1. The "Split-Brain" Storage Problem (MCP vs. Extension)
The Issue:
 * Extension Path: Snapshots are Local (BlobStore).
 * MCP Path: create_checkpoint is listed as Server-side (Pro).
 * CLI Path: snapback snapshot is Local BlobStore.
The Risk:
If a user is working in Cursor (using your MCP server) and triggers a checkpoint, and then switches to VS Code (using your Extension), they expect to see a unified history. If MCP writes to the Cloud (Server) and the Extension writes to Local Disk, you have a fragmented history. The user will lose trust if "Restore" in VS Code doesn't show the snapshot they just made in Cursor.
Recommendation:
Force the MCP server to write to the same Local BlobStore as the Extension and CLI.
 * Why? It creates a unified timeline regardless of the input source.
 * The Pro Angle: Don't make the storage Pro; make the analysis of that storage Pro. Let MCP create local snapshots for free, but if they want the risk_score metadata attached to it, that requires the server ping.
2. "Hostile Monetization" on Restore
The Issue:
In Table 2 (MCP), restore_checkpoint is marked as Pro.
In Table 3 (CLI), snapback restore is implied free (or at least local).
The Risk:
Gating recovery is dangerous. If a user installs the Free version, relies on it to save their work, breaks their code, and then tries to restore only to hit a paywall, they will feel held hostage. This is a "churn event"—they will uninstall immediately after (or if they can't) recover.
Recommendation:
Make "Restore" universally Free.
Gate the intelligence, not the insurance.
 * Free: Restore to Timestamp X (Manual).
 * Pro: "Smart Rollback" (e.g., "Rollback to the last state where unit tests passed" or "Undo the last AI-generated block").
3. Asynchronous Pro Loop (The "Laggy Save" Trap)
The Issue:
In the "Activation Paths" table, Step 5 (Advanced AI Detection) and Step 6 (Risk Analysis) happen on the Server.
If the Local Extension waits for these server responses before confirming the "Save" or updating the UI, the editor will feel sluggish.
Recommendation:
Ensure the Event Loop is Non-Blocking:
 * Local: Save Event → AutoDecision → Snapshot Created immediately. (User is safe).
 * Async: Fire-and-forget request to Server for ML Analysis.
 * Callback: Server returns risk_score and cluster_id → Extension updates the existing snapshot metadata in the background.
Architectural Refinement Diagram
Here is the revised processing flow to address the "Split-Brain" and "Blocking" issues.
Revised Priority Checklist (P0 - Demo Focus)
Based on the "Local-Only" insight, here is the concrete implementation checklist to get you to a working demo.
Phase 1: The "Happy Path" (Local Mechanics)
 * [ ] Shared Storage Layer: Implement a shared SnapshotService (TypeScript/Node) that both the VS Code Ext and MCP Server import. This ensures both write to .snapback/snapshots.
 * [ ] AutoDecision Engine (Stubbed): Implement the decide(context) function. For the demo, hardcode it to return true (always snapshot) or simple logic like if (change_size > 50 chars).
 * [ ] The "Time-Travel" UI: Build the simplest possible VS Code TreeView that lists timestamps from the local store.
 * [ ] Restore Action: A function that overwrites the current file content with the blob content (triggered from the TreeView).
Phase 2: The "Hook" (Telemetry & Basic Detection)
 * [ ] Save Listener: Wire up vscode.workspace.onWillSaveTextDocument.
 * [ ] Basic Pattern Matcher: A simple Regex check for "AI Slop" (e.g., look for common LLM comment patterns or rapid large diffs).
 * [ ] Telemetry: Fire a 'Snapshot Created' event to PostHog. This proves the system is "alive" during your demo.
Phase 3: The "Mock" (Pro Features)
 * Since the Server ML is Pro/P2, do not implement it for the demo.
 * [ ] Mock the Server: In your Extension code, create a simulateServerAnalysis() function that uses setTimeout to wait 1 second, then randomly assigns a "Risk Score" to the local snapshot.
 * [ ] UI Badge: Display this mock Risk Score in the UI. This demonstrates the value of the Pro tier without requiring the backend infrastructure yet.
