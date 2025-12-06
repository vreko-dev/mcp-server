# Workflow & CI/CD Documentation

**Last Updated:** 2025-12-05
**Status:** Production-ready
**Compliance:** 2025 best practices

---

## 🎯 Overview

This directory contains comprehensive documentation for the SnapBack dev/staging/production workflow setup.

**What's implemented:**
- ✅ Docker-based local development
- ✅ GitHub Actions CI/CD pipelines
- ✅ Vercel preview deployments (staging)
- ✅ Vercel production deployments
- ✅ Environment-based secrets management
- ✅ IP protection for open-core packages
- ✅ CODEOWNERS enforcement

---

## 📚 Documentation Index

### Getting Started

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[Setup Checklist](../SETUP_CHECKLIST.md)** | Step-by-step initial setup | First-time setup, onboarding |
| **[Quick Reference](../QUICK_REFERENCE.md)** | Common commands & troubleshooting | Daily development |
| **[Environment Variables](../ENVIRONMENT_VARIABLES_REFERENCE.md)** | Complete env var reference | Configuring environments |

### Deep Dives

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[Workflow Guide](../WORKFLOW_ENVIRONMENT_GUIDE.md)** | Complete architecture reference (776 lines) | Understanding workflows |
| **[Setup Summary](../WORKFLOW_SETUP_SUMMARY.md)** | High-level overview | Project briefing |

### Related Documentation

| Document | Purpose |
|----------|---------|
| **[npm Traction Strategy](../open-core/NPM_TRACTION_STRATEGY.md)** | Package marketing plan |
| **[SEO Optimization Guide](../open-core/SEO_OPTIMIZATION_GUIDE.md)** | snapback.dev SEO |
| **[Repository Polish](../open-core/REPOSITORY_POLISH_SUMMARY.md)** | OSS package updates |

---

## 🚀 Quick Start

### For New Developers

```bash
# 1. Clone and install
git clone https://github.com/your-org/snapback.git
cd snapback
pnpm install

# 2. Configure environment
cp .env.docker.example .env.docker
# Edit .env.docker with secure passwords

# 3. Start development environment
make dev-holistic

# 4. Verify
open http://snapback.dev

# 5. Read the setup guide
open docs/SETUP_CHECKLIST.md
```

### For DevOps Engineers

```bash
# 1. Add GitHub secrets (see SETUP_CHECKLIST.md)
# 2. Create GitHub Environments (preview, production)
# 3. Configure Vercel environment variables
# 4. Update CODEOWNERS with team usernames
# 5. Test CI/CD pipeline with sample PR
```

---

## 🔄 Workflow Architecture

```
┌──────────────────────────────────────────────┐
│        LOCAL DEVELOPMENT (Docker)            │
│                                              │
│  make dev-holistic → All services running   │
│  - PostgreSQL, Redis, API, Web, Docs        │
│  - Hot reload enabled                       │
│  - .env.docker (gitignored)                 │
└──────────────────┬───────────────────────────┘
                   │
                   │ git push → Open PR
                   ▼
┌──────────────────────────────────────────────┐
│    STAGING (Vercel Preview + GitHub CI)     │
│                                              │
│  CI Jobs: lint, typecheck, test, build      │
│  Deploy: Auto-preview on PR                 │
│  Environment: preview                       │
│  Approval: Not required                     │
└──────────────────┬───────────────────────────┘
                   │
                   │ Merge to main
                   ▼
┌──────────────────────────────────────────────┐
│      PRODUCTION (Vercel + GitHub CD)        │
│                                              │
│  Deploy: On main branch merge               │
│  Environment: production                    │
│  Approval: 1+ reviewer required             │
│  URL: https://snapback.dev                  │
└──────────────────────────────────────────────┘
```

---

## 📁 File Structure

### GitHub Actions Workflows

```
.github/
├── workflows/
│   ├── ci.yml                    # Quality gates (every PR)
│   ├── deploy-preview.yml        # Staging deployments
│   ├── deploy-production.yml     # Production deployments
│   └── integration-test-npm.yml  # npm validation
└── CODEOWNERS                     # Required reviewers
```

### Documentation

```
docs/
├── workflows/
│   └── README.md                      # This file
├── WORKFLOW_ENVIRONMENT_GUIDE.md      # Complete reference
├── SETUP_CHECKLIST.md                 # Step-by-step setup
├── QUICK_REFERENCE.md                 # Daily commands
├── ENVIRONMENT_VARIABLES_REFERENCE.md # Env var guide
└── WORKFLOW_SETUP_SUMMARY.md          # High-level overview
```

---

## 🛠️ Common Tasks

### Run CI Locally

```bash
# Lint
pnpm biome check .

# Type check
pnpm typecheck

# Test
pnpm test

# Build
pnpm build
```

### Deploy Preview Manually

```bash
cd apps/web
vercel
# Follow prompts, select preview environment
```

### Deploy Production Manually

```bash
cd apps/web
vercel --prod
# Requires Vercel production access
```

### Check Workflow Status

```
GitHub → Repository → Actions tab
- View all workflow runs
- Filter by workflow name
- Re-run failed jobs
```

---

## 🔐 Secrets Management

### Required GitHub Secrets

**Path:** Settings → Secrets and variables → Actions

```yaml
Repository Secrets:
  VERCEL_TOKEN           # From Vercel account settings
  VERCEL_ORG_ID          # From .vercel/project.json
  VERCEL_PROJECT_ID_WEB  # Web project ID
  VERCEL_PROJECT_ID_DOCS # Docs project ID
  NPM_TOKEN              # npm automation token
```

### Required GitHub Environments

**Path:** Settings → Environments

```yaml
Environment: preview
  - DATABASE_URL (staging)
  - POSTHOG_KEY (staging)
  - STRIPE_SECRET_KEY (test mode)

Environment: production
  - DATABASE_URL (production)
  - POSTHOG_KEY (production)
  - STRIPE_SECRET_KEY (live mode)
  - Required reviewers: 1+
```

### Required Vercel Variables

**Configure in:** Vercel Dashboard → Project → Environment Variables

See [Environment Variables Reference](../ENVIRONMENT_VARIABLES_REFERENCE.md) for complete list.

---

## 🛡️ IP Protection

### OSS Leak Detection

**Triggered:** When PR modifies `packages-oss/`

**Scans for forbidden imports:**
- `@snapback/auth`
- `@snapback/platform`
- `@snapback/analytics`

**Scans for forbidden keywords:**
- `stripe`, `posthog`, `subscription`, `tier`, `enterprise`

**Action:** CI fails, blocks PR merge

### CODEOWNERS

Required reviewers for sensitive paths:
- `.github/workflows/` → DevOps team
- `packages-oss/` → OSS maintainers
- `.env*` → DevOps team
- `**/migrations/` → Backend team

---

## 📊 Monitoring

### GitHub Actions

```
Repository → Actions → Workflow name
- View run history
- Check job logs
- Re-run failed workflows
```

### Vercel Deployments

```
Vercel Dashboard → Project → Deployments
- View deployment status
- Check build logs
- Rollback to previous version
```

### Application Logs

**Local:**
```bash
docker-compose logs -f web
docker-compose logs -f api
```

**Preview/Production:**
```
Vercel Dashboard → Deployment → Functions → Logs
```

---

## 🚨 Troubleshooting

### CI Failures

| Issue | Solution |
|-------|----------|
| Lint errors | `pnpm biome format --write .` |
| Type errors | `pnpm typecheck`, fix reported errors |
| Test failures | `pnpm test`, fix failing tests |
| OSS leak | Check packages-oss/ for forbidden imports |

### Deployment Failures

| Issue | Solution |
|-------|----------|
| Missing VERCEL_TOKEN | Add to GitHub repository secrets |
| Build error | Fix locally: `pnpm build` |
| Missing env var | Add to Vercel environment variables |
| Approval required | Wait for reviewer, or add reviewers |

### Docker Issues

| Issue | Solution |
|-------|----------|
| Port conflicts | `lsof -i :3000`, kill process |
| DB connection error | Check `.env.docker` DATABASE_URL |
| Containers not starting | `docker-compose logs`, rebuild |

**See [Quick Reference](../QUICK_REFERENCE.md) for detailed troubleshooting.**

---

## 📈 Performance Metrics

**Target workflow times:**

| Workflow | Target | Acceptable |
|----------|--------|------------|
| CI (lint, test, build) | < 10 min | < 15 min |
| Preview deployment | < 8 min | < 12 min |
| Production deployment | < 10 min | < 15 min |
| OSS leak detection | < 2 min | < 5 min |

**If slower:** Review GitHub Actions logs, optimize build steps, check caching.

---

## 🔄 Workflow Updates

### Making Changes to Workflows

```bash
# 1. Create branch
git checkout -b workflow/update-ci

# 2. Edit workflow file
vim .github/workflows/ci.yml

# 3. Test with PR
git add .github/workflows/ci.yml
git commit -m "workflow: update CI job"
git push origin workflow/update-ci
gh pr create

# 4. Monitor workflow run
# GitHub → Actions → Your workflow

# 5. Get DevOps approval (CODEOWNERS)
```

### Best Practices

- ✅ Test workflow changes in PR first
- ✅ Use workflow_dispatch for manual testing
- ✅ Add timeouts to prevent runaway jobs
- ✅ Use concurrency groups for preview deploys
- ✅ Document changes in PR description

---

## 📞 Support

**Questions?**
1. Check [Quick Reference](../QUICK_REFERENCE.md)
2. Review [Setup Checklist](../SETUP_CHECKLIST.md)
3. Read [Workflow Guide](../WORKFLOW_ENVIRONMENT_GUIDE.md)
4. Ask in team chat

**Found a bug?**
- Open GitHub issue
- Tag: `ci-cd`, `workflows`, `deployment`

**Need access?**
- Request Vercel project access from admin
- Request GitHub repository access from admin

---

## 🎓 Learning Resources

### External Documentation

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [pnpm Workspace Guide](https://pnpm.io/workspaces)
- [Docker Compose Reference](https://docs.docker.com/compose/)

### 2025 Best Practices

- [CI/CD Best Practices (Graphite)](https://graphite.com/guides/in-depth-guide-ci-cd-best-practices)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/deployment/about-deployments/deploying-with-github-actions)
- [Environment Secrets Management](https://github.com/orgs/community/discussions/170113)

---

## ✅ Success Checklist

**After completing setup, verify:**

- [ ] CI runs on every PR
- [ ] Preview deployments auto-create URLs
- [ ] Production deploys require approval
- [ ] OSS leak detection catches violations
- [ ] Local Docker environment works
- [ ] Team members can access Vercel
- [ ] CODEOWNERS enforced
- [ ] Environment secrets configured

---

**Implementation Date:** 2025-12-05
**Next Review:** 2025-12-19 (2 weeks)
**Maintained By:** DevOps Team

---

## 🎉 Ready to Deploy!

You now have a complete, production-grade CI/CD workflow.

**Next step:** Follow [Setup Checklist](../SETUP_CHECKLIST.md) to configure secrets and test.

**Happy shipping! 🚀**
