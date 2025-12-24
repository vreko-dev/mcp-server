# SnapBack Requirements Matrix

## Overview
This document maps expected capabilities to evidence of implementation status in the SnapBack codebase.

## Capabilities

### onboarding.flow
**Must have:**
- Auth-gated waitlist/onboarding
- API key create/rotate UX
- Extension first-run wizard

**Status: Implemented**
- Auth-gated waitlist/onboarding: Implemented with waitlist database tables
- API key create/rotate UX: Implemented with API endpoints and UI hooks
- Extension first-run wizard: Implemented as VS Code walkthrough

**Effort: S**

### analytics.foundation
**Must have:**
- Unified event schema
- Activation funnel
- Retention (D7/D30)
- GDPR deletion hygiene (FK CASCADE)

**Status: Partial**
- Unified event schema: Implemented with AnalyticsEvents constants
- Activation funnel: Partially implemented with onboarding events
- Retention (D7/D30): Implemented with retention service and config
- GDPR deletion hygiene (FK CASCADE): Implemented in database schema

**Effort: S**

### guardian.ui
**Must have:**
- Prevention UI present
- Prevented-incident metric

**Status: Implemented**
- Prevention UI present: Implemented in VS Code extension
- Prevented-incident metric: Implemented with warning events

**Effort: S**

### rollback.detection
**Must have:**
- Rollback events with context

**Status: Implemented**
- Rollback events with context: Implemented with SNAPSHOT_RESTORED events

**Effort: S**

### docs.minimal
**Must have:**
- Single Fumadocs source
- FAQ in footer
- No duplicates

**Status: Partial**
- Single Fumadocs source: Implemented with Nextra
- FAQ in footer: Not clearly implemented
- No duplicates: Not verified

**Effort: M**

### testing.foundation
**Must have:**
- e2e install→auth→key→first-success
- Extension mocking
- Contract tests ext↔MCP

**Status: Partial**
- e2e install→auth→key→first-success: Partially implemented
- Extension mocking: Implemented
- Contract tests ext↔MCP: Not clearly implemented

**Effort: M**

### performance.budgets
**Must have:**
- VSIX ≤ 2MB
- cold_start_ms in CI

**Status: Pending**
- VSIX ≤ 2MB: Not verified
- cold_start_ms in CI: Not clearly implemented

**Effort: S**

### platform.hardening
**Must have:**
- pnpm catalog
- lockfile/workspace guards
- lefthook+biome
- scoped typecheck

**Status: Implemented**
- pnpm catalog: Implemented
- lockfile/workspace guards: Implemented
- lefthook+biome: Implemented
- scoped typecheck: Implemented

**Effort: M**