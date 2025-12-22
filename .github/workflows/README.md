# GitHub Actions Workflows

This directory contains all GitHub Actions workflows for the SnapBack project.
**Last Consolidated:** 2025-12-21

---

## Workflow Categories (24 files)

### Primary CI
| Workflow | Purpose | Trigger |
|----------|---------|--------|
| `turborepo-ci.yml` | **PRIMARY** - Lint, type-check, test, build | push/PR to main, develop |

### Reusable Validators (called by turborepo-ci or standalone)
| Workflow | Purpose |
|----------|--------|
| `vscode-validate.yml` | VS Code extension validation |
| `vscode-test.yml` | VS Code test matrix (ubuntu/macOS/Windows) |
| `vscode-performance.yml` | VS Code performance budgets |
| `mcp-validate.yml` | MCP server validation |
| `web-validate.yml` | Web app validation |
| `cli-validate.yml` | CLI validation |

### Deployment
| Workflow | Purpose |
|----------|--------|
| `deploy.yml` | Main deployment orchestrator |
| `deploy-web.yml` | Web app to Vercel (reusable) |
| `deploy-mcp.yml` | MCP server to Fly.io (reusable) |

### Testing
| Workflow | Purpose |
|----------|--------|
| `e2e.yml` | E2E tests (Playwright) |
| `e2e-web-auth.yml` | Web auth E2E tests |
| `integration-test-npm.yml` | Daily npm integration tests |

### Quality & Security
| Workflow | Purpose |
|----------|--------|
| `validate-architecture.yml` | Import boundaries, license compliance |
| `verify.yml` | DB schema assertions |
| `security-scan.yml` | Security audit + secret scanning |
| `performance.yml` | Performance budget enforcement |

### Publishing
| Workflow | Purpose |
|----------|--------|
| `publish-vscode-extension.yml` | VS Code marketplace |
| `publish-cli.yml` | CLI to npm |
| `release.yml` | Release automation |
| `update-version.yml` | Version bump on release |

### Maintenance
| Workflow | Purpose |
|----------|--------|
| `dependency-update.yml` | Weekly dependency updates |
| `sync-oss.yml` | OSS package sync |
| `labeler.yml` | PR auto-labeling |

---

## Required Secrets

| Secret | Purpose |
|--------|--------|
| `TURBO_TOKEN` | Turborepo remote caching |
| `TURBO_TEAM` | Turborepo team name |
| `CODECOV_TOKEN` | Coverage reporting |
| `STRIPE_TEST_KEY` | Payment integration tests |
| `DATABASE_URL` | DB schema verification |

---

## Branch Protection

Configure branch protection to require:
- `Turborepo CI / ci-status`

---

## Best Practices (2025)

1. **Reusable workflows** via `workflow_call` - avoid duplication
2. **Path filters** - only run relevant jobs for changed files
3. **Single primary CI** - `turborepo-ci.yml` is authoritative
4. **Turborepo caching** - remote cache for faster builds
