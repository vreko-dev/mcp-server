---
description: "CI/CD and GitHub Actions patterns"
globs:
  - ".github/workflows/**"
  - ".github/actions/**"
alwaysApply: false
---

# CI/CD Rules

**Applies to:** GitHub Actions workflows and CI/CD configuration
**Last Updated:** 2025-12-21

---

## Workflow Architecture

### Primary CI Workflow
```
turborepo-ci.yml
├── setup (caching)
├── lint
├── type-check
├── test (with PostgreSQL service)
├── build
├── test-matrix (Node 18/20/22, ubuntu/macos/windows)
├── security
└── ci-status (aggregated check)
```

### Reusable Workflow Pattern
```yaml
# ✅ CORRECT - Define as reusable
on:
  workflow_call:
    inputs:
      run-performance-tests:
        type: boolean
        default: false

# ❌ WRONG - Duplicate triggers in multiple files
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

---

## Canonical Workflows (24 files)

| Category | Primary Workflow | Status |
|----------|-----------------|--------|
| **CI** | `turborepo-ci.yml` | AUTHORITATIVE |
| **VS Code** | `vscode-validate.yml` | Reusable |
| **MCP** | `mcp-validate.yml` | Reusable |
| **Web** | `web-validate.yml` | Reusable |
| **CLI** | `cli-validate.yml` | Reusable |
| **Deploy** | `deploy.yml` | Orchestrator |
| **Security** | `security-scan.yml` | Includes gitleaks |
| **Performance** | `performance.yml` | All budgets |

---

## Best Practices (2025)

### 1. Reusable Workflows
```yaml
# Caller workflow
jobs:
  validate-vscode:
    uses: ./.github/workflows/vscode-validate.yml
    with:
      run-performance-tests: true
    secrets: inherit
```

### 2. Path Filtering
```yaml
on:
  push:
    paths:
      - "apps/vscode/**"
      - "packages/core/**"
```

### 3. Turborepo Remote Caching
```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

### 4. Concurrency Control
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

## Anti-Patterns

| Pattern | Issue | Fix |
|---------|-------|-----|
| Multiple CI workflows | Confusion, duplication | Single `turborepo-ci.yml` |
| `continue-on-error: true` | Hides failures | Remove or make explicit |
| No path filtering | Runs on every change | Add `paths:` filter |
| Hardcoded Node version | Drift between workflows | Use `env.NODE_VERSION` |
| Missing concurrency | Wastes resources | Add `cancel-in-progress` |

---

## Required Secrets

| Secret | Purpose | Required By |
|--------|---------|-------------|
| `TURBO_TOKEN` | Remote caching | `turborepo-ci.yml` |
| `TURBO_TEAM` | Team namespace | `turborepo-ci.yml` |
| `CODECOV_TOKEN` | Coverage upload | `turborepo-ci.yml` |
| `STRIPE_TEST_KEY` | Payment tests | `turborepo-ci.yml` |
| `DATABASE_URL` | Schema verification | `verify.yml` |

---

## Branch Protection

**Required status checks:**
- `Turborepo CI / ci-status`

**Recommended:**
- Require PR reviews
- Dismiss stale reviews on new commits
- Require conversation resolution

---

## Adding New Workflows

1. **Check if existing workflow can be extended** first
2. **Use `workflow_call`** for reusability
3. **Add path filtering** to limit scope
4. **Document in `.github/workflows/README.md`**
5. **Update this rules file** if adding new category

---

**Reference:** `.github/workflows/README.md`
