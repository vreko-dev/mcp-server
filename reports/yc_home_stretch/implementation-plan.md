# SNAPBACK IMPLEMENTATION PLAN
*Generated: 2025-11-07*

## Executive Summary

SnapBack has strong technical foundations with comprehensive telemetry, testing infrastructure, and privacy-first architecture. The critical path to launch focuses on activation funnel completion, analytics foundation, and friction reduction.

**Key Findings:**
- ✅ Core infrastructure implemented (auth, API keys, telemetry, database)
- ⚠️ Partial implementation of activation funnel tracking
- ❌ Missing FAQ, VSIX size validation, and complete e2e testing
- 🎯 Strong privacy-first design with metadata-only storage

## Critical Path (Now → Next → Later)

### NOW (Weeks 1-2) - Foundation & Measurement
1. **Complete Activation Funnel** [6h]
   - Implement missing funnel steps in analytics
   - Add conversion tracking install→auth→key→first-success
   - Evidence: `packages/analytics/src/events.ts` has partial events

2. **FAQ Implementation** [4h]
   - Add FAQ to web portal footer
   - Evidence: Not found in `apps/web` layout

3. **VSIX Bundle Size Check** [2h]
   - Add CI validation for 2MB limit
   - Evidence: No validation in `.github/workflows/vscode-validate.yml`

4. **Fix Placeholder Tests** [8h]
   - Replace placeholder e2e tests with actual validation
   - Evidence: `apps/web/tests/e2e/` has placeholders

5. **Session Replay Configuration** [4h]
   - Optimize Sentry replay sampling (currently 10% sessions, 100% errors)
   - Evidence: `autocapture-replay-config.json` shows current config

### NEXT (Weeks 3-4) - Optimization & Quality
1. **Contract Tests Extension↔MCP** [8h]
   - Implement missing contract tests
   - Evidence: Not found in test directories

2. **Performance Monitoring** [6h]
   - Add cold_start_ms to CI pipeline
   - Implement production performance dashboards
   - Evidence: Budgets defined but not enforced

3. **Documentation Consolidation** [8h]
   - Centralize web app documentation
   - Add API documentation for packages
   - Evidence: `documentation-consolidation.json` shows gaps

4. **Complete E2E Test Flow** [10h]
   - Full install→auth→key→success flow
   - Evidence: Partial implementation exists

5. **Test Coverage Improvement** [12h]
   - Increase MCP coverage from ~40% to 80%
   - Evidence: `mcp-audit.json` reports low coverage

### LATER (Weeks 5-8) - Scale & Polish
1. **Real-time Updates** [16h]
   - WebSocket implementation for activity feed
   - Evidence: Web portal could benefit from real-time

2. **Advanced Analytics** [12h]
   - Cohort analysis implementation
   - Retention correlation features
   - Evidence: Basic analytics exists, advanced features missing

3. **Team Features** [20h]
   - Granular permissions
   - Organization management improvements
   - Evidence: Basic team structure exists

## Top 10 Actions by ROI

| Rank | Action | ROI | UX | Analytics | Effort | Evidence |
|------|--------|-----|----|-----------:|--------|----------|
| 1 | Activation Funnel Completion | 4.5 | 5 | 5 | 6h | Partial events exist |
| 2 | FAQ Implementation | 4.0 | 5 | 3 | 4h | Not implemented |
| 3 | VSIX Size Validation | 3.8 | 4 | 4 | 2h | No CI check |
| 4 | Session Replay Optimization | 3.5 | 3 | 5 | 4h | 10% sampling active |
| 5 | Fix Placeholder Tests | 3.3 | 3 | 4 | 8h | Placeholders found |
| 6 | Contract Tests | 3.0 | 4 | 3 | 8h | Missing |
| 7 | Performance Dashboard | 2.8 | 3 | 4 | 6h | Budgets not enforced |
| 8 | Documentation Updates | 2.5 | 4 | 2 | 8h | Gaps identified |
| 9 | Test Coverage | 2.3 | 3 | 3 | 12h | ~40% current |
| 10 | Real-time Updates | 2.0 | 4 | 2 | 16h | Not implemented |

## Activation & Retention Strategy

### Current State
- **Onboarding**: VS Code walkthrough (5 steps) + waitlist system
- **Activation Events**: Partial tracking (ONBOARDING_STARTED, COMPLETED, SKIPPED)
- **Retention**: D7/D30 infrastructure exists with retention service

### Target Metrics
- **TTFV p75**: ≤ 5 minutes (install → first success)
- **Onboarding Completion**: ≥ 70%
- **D7 Retention**: Baseline + 20% relative lift
- **Crash-free Sessions**: ≥ 98%

### Key Actions
1. Complete funnel instrumentation
2. Add progress indicators in onboarding
3. Implement contextual help triggers
4. Optimize first-run wizard flow

## Experiments Backlog

### Experiment 1: Simplified Onboarding
- **Hypothesis**: Reducing steps from 5 to 3 increases completion by 15%
- **Metrics**: Completion rate, TTFV, D7 retention
- **Runtime**: 14 days
- **Sample Size**: 500 new users

### Experiment 2: AI Detection Threshold
- **Hypothesis**: Lower detection threshold increases engagement without false positives
- **Metrics**: Detection rate, false positive rate, user satisfaction
- **Runtime**: 7 days
- **Guardrails**: Error rate stable

### Experiment 3: Welcome Email Timing
- **Hypothesis**: Immediate welcome email increases activation by 10%
- **Metrics**: Email open rate, activation within 24h
- **Runtime**: 14 days

## Surveys & Feedback Plan

### NPS Survey
- **Trigger**: D7 and D30 for activated users
- **Cap**: 5% monthly, max 250 responses

### Feature Micro-surveys
- **Trigger**: After first snapshot restoration
- **Question**: "How easy was it to restore your code?"
- **Scale**: 1-5 difficulty

### Exit Survey
- **Trigger**: Subscription downgrade/cancel
- **Questions**: Reason for leaving, missing features

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Replay quota exhaustion | High | Medium | Weekly budget monitoring, adjust sampling |
| Incomplete cascade deletes | High | Low | Add FK constraints, test in CI |
| Low test coverage causing regressions | Medium | Medium | Increase to 80% coverage target |
| Documentation drift | Low | High | Automated doc generation |

## Success Metrics & Review Cadence

### Weekly Review
- D7 retention cohort analysis
- Activation funnel conversion rates
- Session replay sample (10 sessions)
- Error rate trends

### Monthly Review
- NPS scores and feedback themes
- Performance budget adherence
- Test coverage trends
- Documentation accuracy

### Quarterly Review
- ROI on completed initiatives
- Technical debt assessment
- Architecture evolution needs

## Gaps & Probes

### Missing Inputs
The following expected files were not found in the audit artifacts:
- `prioritized-scorecard.json` - Computing fresh ROI scores
- `events.yml`, `funnels.yml` - Using event catalog from JSON files
- `analytics-gaps.md`, `correlations.md` - Inferring from other documents
- `friction-inbox.md` - No rage click data available
- `ci-cd.json` - CI/CD configuration inferred from mentions

### Remediation Probes
1. Generate funnels.yml from telemetry events
2. Create prioritized scorecard from requirements matrix
3. Extract friction points from user feedback
4. Document CI/CD pipeline configuration