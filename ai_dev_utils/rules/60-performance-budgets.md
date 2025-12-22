---
description: "Performance budgets for all SnapBack components"
globs:
  - "apps/**/*.ts"
  - "packages/**/*.ts"
alwaysApply: false
---

# Performance Budget Rules

**Applies to:** All production code
**Source:** Consolidated from `qoder-config.yaml` budgets section

---

## VS Code Extension Budgets

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| **Activation P95** | 500ms | CI perf tests |
| **Activation P50** | 200ms | CI perf tests |
| **Memory Peak** | 200MB | Runtime monitoring |
| **Webview Bundle** | 300KB | Build check |
| **VSIX Size** | 10MB | CI artifact check |

### Phase-Level Breakdown

| Phase | Target | Max |
|-------|--------|-----|
| Phase 1 (services) | <10ms | 20ms |
| Phase 2 (storage) | <100ms | 150ms |
| Phase 3 (managers) | <200ms | 300ms |
| Phase 4 (providers) | <150ms | 200ms |
| Phase 5 (registration) | <50ms | 75ms |

---

## MCP Server Budgets

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| **Tool Response Time** | 200ms | Performance tests |
| **analyze_risk** | <200ms | Logged if exceeded |
| **check_dependencies** | <300ms | Logged if exceeded |
| **create_checkpoint** | <500ms | Includes IPC |

---

## API Server Budgets

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| **P95 Response Time** | 500ms | Monitoring |
| **P50 Response Time** | 100ms | Monitoring |
| **Docker Build** | 300s | CI timeout |

---

## Core Package Budgets

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| **Guardian Analysis P95** | 200ms | Perf tests |
| **Memory Resident** | 100MB | Runtime |
| **Cache Hit Ratio** | >80% | Metrics |

---

## SDK Budgets

| Operation | Local | API |
|-----------|-------|-----|
| **Snapshot Create** | <50ms | <200ms |
| **List Queries** | <100ms | <500ms |
| **Offline Fallback** | <10ms | N/A |

---

## Web App Budgets

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| **LCP** | <2.5s | Vercel Analytics |
| **FID** | <100ms | Vercel Analytics |
| **CLS** | <0.1 | Vercel Analytics |
| **Realtime Latency** | <500ms | Supabase metrics |
| **Polling Fallback** | 5s | Code constant |

---

## Enforcement Strategy

1. **CI Checks:** Perf tests run on every PR
2. **Logging:** Budget violations logged to stderr with unique ID
3. **Monitoring:** PostHog dashboards track P95/P99
4. **Alerts:** PagerDuty for sustained budget violations

---

## Violation Reporting

When budget is exceeded:

```typescript
// Automatically logged by trackPerformance()
logger.warn("Performance budget exceeded", {
  operation: "analyze_risk",
  budget_ms: 200,
  actual_ms: 347,
  violation_id: "PERF-abc123"
});
```

---

**Last Updated:** 2025-12-21
**Source:** `qoder-config.yaml` + package CLAUDE.md files
