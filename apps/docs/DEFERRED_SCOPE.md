# Deferred Documentation Scope

**Created**: 2025-12-18
**Reason**: Focus on Minimum Viable Docs (MVD) for launch
**Review Date**: Q2 2025 (post-launch + 90 days)

---

## Archived from Original 45-Page Plan

These pages are **deferred, not deleted**. They represent valuable future work once:
1. Core product features are complete (73 unfinished items resolved)
2. MVD has been validated with users
3. Usage data shows demand for advanced guides

---

## Deferred Interactive Demos (Save 32 hours → redirect to product)

### ❌ Playground (XL = 16 hours)
**Original Plan**: Monaco editor integration with live SnapBack demo
**Why Deferred**:
- Complex to build and maintain
- Dashboard currently shows hardcoded zeros (Gap 1)
- Cloud backup not wired (Gap 2)
- Would demonstrate fake/incomplete features

**Revisit When**: Dashboard metrics are real, cloud backup works

---

### ❌ Risk Analyzer Demo (L = 8 hours)
**Original Plan**: Live risk analysis visualization
**Why Deferred**:
- Trust calibration currently uses `Math.random()` (Gap 4)
- No real AI confidence scores to display
- Would mislead users about AI learning capability

**Revisit When**: Trust calibration loop implemented with EWMA scoring

---

### ❌ Diff Visualizer (L = 8 hours)
**Original Plan**: Before/after snapshot comparison UI
**Why Deferred**:
- Visual nice-to-have, not critical for understanding
- Text-based diffs in terminal work fine
- Complex React component maintenance

**Revisit When**: User feedback requests visual diff tool

---

## Deferred Product Pages (Until Features Exist)

### ❌ SDK Reference (M = 4 hours)
**Original Plan**: TypeDoc-generated API documentation
**Why Deferred**:
- No external developers using SDK yet
- Package marked as premature (task-audit finding)
- Would document internal-only code

**Revisit When**: First external developer requests SDK access

---

### ❌ Dashboard Product Page (M = 4 hours)
**Original Plan**: console.snapback.dev overview and features
**Why Deferred**:
- Dashboard metrics hardcoded to zeros (Gap 1 unresolved)
- Empty dashboard on first use (UX Friction 1)
- Would showcase broken feature

**Revisit When**: Gap 1 (Dashboard Metrics Wiring) is fixed

---

## Deferred Framework Guides (Until Usage Data Shows Need)

### ❌ Next.js Guide (M = 4 hours)
**Original Plan**: SnapBack integration patterns for Next.js projects
**Why Deferred**:
- Unclear if users actually use SnapBack in Next.js context
- VS Code extension is primary use case (not framework-specific)
- No usage data showing Next.js adoption

**Revisit When**: Analytics show >10% of users request Next.js guidance

---

### ❌ React Guide (M = 4 hours)
**Original Plan**: SnapBack for React component development
**Why Deferred**: Same rationale as Next.js

**Revisit When**: User requests or usage data

---

### ❌ Node.js Guide (M = 4 hours)
**Original Plan**: Backend/API protection patterns
**Why Deferred**: Same rationale as Next.js

**Revisit When**: User requests or usage data

---

## Deferred Advanced Guides (Until Product Scales)

### ❌ Team Workflows (M = 4 hours)
**Original Plan**: Collaboration patterns for Team tier
**Why Deferred**:
- Team tier feature incomplete
- Need real Team tier users first
- Premature to document unused feature

**Revisit When**: Team tier has 10+ active organizations

---

### ❌ CI/CD Integration (M = 4 hours)
**Original Plan**: GitHub Actions, automation patterns
**Why Deferred**:
- Niche use case (CLI automation)
- CLI restore command not implemented (Incomplete 1)
- GitHub Action package is stub (v0.0.0)

**Revisit When**: CLI is feature-complete + automation adoption

---

### ❌ Large Codebase Tips (M = 4 hours)
**Original Plan**: Performance optimization for scale
**Why Deferred**:
- Optimization before scale is premature
- Storage deduplication disabled (would solve this)
- No user complaints about performance at scale

**Revisit When**: Users report performance issues >100K snapshots

---

### ❌ Claude Guide (M = 4 hours)
**Original Plan**: Using SnapBack with Claude Desktop
**Why Deferred**:
- MCP tools feature flag disabled (`experimental.mcp_tools: false`)
- Power user feature not yet enabled
- Would document unavailable feature

**Revisit When**: MCP tools feature flag enabled for users

---

## Deferred API Documentation (Until APIs Stabilize)

### ❌ REST API Reference (L = 8 hours)
**Original Plan**: Document api.snapback.dev endpoints
**Why Deferred**:
- API reference currently placeholder (Quality: 3/10)
- Should be generated from Zod schemas (not hand-written)
- Internal API, not public yet

**Revisit When**: Public API launched with external integrations

---

### ❌ Webhooks (S = 2 hours)
**Original Plan**: Webhook events documentation
**Why Deferred**:
- Feature doesn't exist yet
- Would be aspirational/"Coming Soon" page
- No user demand

**Revisit When**: Webhooks implemented and ready for beta

---

## Total Effort Saved: ~80 hours

| Category | Pages Deferred | Hours Saved |
|----------|----------------|-------------|
| Interactive Demos | 3 | 32h |
| Product Pages | 2 | 8h |
| Framework Guides | 3 | 12h |
| Advanced Guides | 4 | 16h |
| API Documentation | 2 | 10h |
| **TOTAL** | **14** | **78h** |

---

## What This Enables

**Redirect saved effort to:**
1. **Fix Gap 1** (Dashboard metrics wiring) → 6h
2. **Fix Gap 2** (Cloud backup integration) → 8h
3. **Complete CLI restore** (Incomplete 1) → 16h
4. **Write MVD** (8 must-have pages) → 20h
5. **Buffer for polish** → 28h

**Result:** Product + docs both ship-ready in same timeframe

---

## Review Criteria (Q2 2025)

Before un-deferring any page, validate:

1. **Feature Exists**: Is the feature actually implemented and working?
2. **User Demand**: Have ≥3 users requested this documentation?
3. **Usage Data**: Does analytics show adoption of the feature?
4. **Priority**: Does this serve more users than other doc work?

---

## Reference

- Original plan: `apps/docs/gap_analysis.md`
- Product gaps: `.qoder/quests/task-audit.md`
- Decision date: 2025-12-18
- Decision maker: Architecture review + scope reduction analysis
