# SnapBack Workflow & Environment Configuration Guide

**Created:** 2025-12-05
**Purpose:** Comprehensive dev/staging/production workflow setup following 2025 best practices
**Architecture:** Open-core with IP protection

---

## 🎯 Overview

This guide establishes a frictionless development workflow with:
- **Local Development:** Docker-based with hot reload
- **Staging:** Vercel Preview (auto-deploy on PR)
- **Production:** Vercel Production (deploy on main merge)
- **Secrets Management:** GitHub Environment Secrets + Vercel
- **IP Protection:** OSS package filtering and leak detection

---

## 🏗️ Architecture: Environment Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                           │
│                                                          │
│  Local Machine → Docker Compose                         │
│  - Hot reload enabled                                    │
│  - .env.docker (not committed)                          │
│  - All services containerized                           │
│  - Full monorepo access                                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     STAGING                              │
│                                                          │
│  PR → GitHub Actions → Vercel Preview                   │
│  - Auto-deploy on PR open/update                        │
│  - Environment: "preview"                               │
│  - Test data, non-production APIs                       │
│  - Temporary URL per PR                                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   PRODUCTION                             │
│                                                          │
│  main branch → GitHub Actions → Vercel Production       │
│  - Deploy on merge to main                              │
│  - Environment: "production"                            │
│  - Production APIs and data                             │
│  - snapback.dev & docs.snapback.dev                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Environment Files Structure

### Local Development

**File:** `.env.docker` (gitignored)
```bash
# Database
DATABASE_URL="postgresql://snapback:snapback@postgres:5432/snapback_dev"
POSTGRES_USER="snapback"
POSTGRES_PASSWORD="snapback"
POSTGRES_DB="snapback_dev"

# Services
NODE_ENV="development"
PORT="3000"
API_URL="http://localhost:3001"

# Feature Flags (Local)
ENABLE_HOT_RELOAD="true"
ENABLE_DEBUG_LOGGING="true"

# Cloud Services (Development keys)
POSTHOG_KEY="phc_dev_xxxxxx"
STRIPE_SECRET_KEY="sk_test_xxxxxx"

# Security (Relaxed for dev)
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
JWT_SECRET="dev_secret_change_in_production"
```

**File:** `.env.docker.example` (committed template)
```bash
# Database
DATABASE_URL="postgresql://snapback:snapback@postgres:5432/snapback_dev"
POSTGRES_USER="snapback"
POSTGRES_PASSWORD="snapback"
POSTGRES_DB="snapback_dev"

# Services
NODE_ENV="development"
PORT="3000"
API_URL="http://localhost:3001"

# Feature Flags
ENABLE_HOT_RELOAD="true"
ENABLE_DEBUG_LOGGING="true"

# Cloud Services (Get from team)
POSTHOG_KEY="<get_from_team>"
STRIPE_SECRET_KEY="<get_from_team_or_use_test_key>"

# Security
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
JWT_SECRET="<generate_random_string>"
```

### Vercel Staging (Preview)

**Managed in:** Vercel Dashboard → Project Settings → Environment Variables → Preview

```bash
# Database
DATABASE_URL="<staging_database_connection_string>"

# Services
NODE_ENV="preview"
VERCEL_ENV="preview"
NEXT_PUBLIC_API_URL="https://api-staging.snapback.dev"

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS="false"
NEXT_PUBLIC_SHOW_DEBUG_PANEL="true"

# Cloud Services
POSTHOG_KEY="phc_staging_xxxxxx"
STRIPE_SECRET_KEY="sk_test_xxxxxx"  # Test mode

# Security
CORS_ORIGINS="https://*.vercel.app,https://staging.snapback.dev"
JWT_SECRET="<staging_secret_from_github_secrets>"
```

### Vercel Production

**Managed in:** Vercel Dashboard → Project Settings → Environment Variables → Production

```bash
# Database
DATABASE_URL="<production_database_connection_string>"

# Services
NODE_ENV="production"
VERCEL_ENV="production"
NEXT_PUBLIC_API_URL="https://api.snapback.dev"

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
NEXT_PUBLIC_SHOW_DEBUG_PANEL="false"

# Cloud Services
POSTHOG_KEY="phc_prod_xxxxxx"
STRIPE_SECRET_KEY="sk_live_xxxxxx"  # Live mode

# Security
CORS_ORIGINS="https://snapback.dev,https://docs.snapback.dev,https://app.snapback.dev"
JWT_SECRET="<production_secret_from_github_secrets>"
```

---

## 🔐 Secrets Management Strategy

### GitHub Secrets (Repository Level)

**Path:** Settings → Secrets and variables → Actions → Repository secrets

```yaml
# Vercel Integration
VERCEL_TOKEN: "<vercel_api_token>"
VERCEL_ORG_ID: "<vercel_org_id>"
VERCEL_PROJECT_ID_WEB: "<web_project_id>"
VERCEL_PROJECT_ID_DOCS: "<docs_project_id>"

# npm Publishing (OSS packages)
NPM_TOKEN: "<npm_automation_token>"

# GitHub Actions
GH_TOKEN: "<github_pat_for_cross_repo_access>"

# Shared Secrets
JWT_SECRET_STAGING: "<staging_jwt_secret>"
JWT_SECRET_PRODUCTION: "<production_jwt_secret>"
```

### GitHub Environment Secrets (Best Practice 2025)

**Why:** Isolate secrets per environment, leverage approvals & restrictions

**Environments to Create:**
1. `development` (local dev, not used in CI)
2. `preview` (staging/PR deployments)
3. `production` (main branch deployments)

**Setup:**
```
Settings → Environments → New environment

Environment: preview
├── Deployment branches: Selected branches → Only PRs
├── Secrets:
│   ├── DATABASE_URL (staging DB)
│   ├── POSTHOG_KEY (staging key)
│   └── STRIPE_SECRET_KEY (test mode)
└── Protection rules: None

Environment: production
├── Deployment branches: Selected branches → main
├── Secrets:
│   ├── DATABASE_URL (production DB)
│   ├── POSTHOG_KEY (production key)
│   └── STRIPE_SECRET_KEY (live mode)
└── Protection rules:
    ├── Required reviewers: 1+ maintainers
    └── Wait timer: 0 minutes
```

---

## 🔄 CI/CD Workflow Files

### File Structure
```
.github/
├── workflows/
│   ├── ci.yml                    # Run on all PRs
│   ├── deploy-preview.yml        # Deploy to Vercel staging
│   ├── deploy-production.yml     # Deploy to Vercel production
│   ├── test-oss-packages.yml     # OSS leak detection
│   └── integration-test-npm.yml  # npm package validation
├── actions/
│   └── setup-node-pnpm/          # Reusable setup action
│       └── action.yml
└── CODEOWNERS                     # Require reviews for sensitive files
```

---

## 📜 Workflow: CI (Quality Gates)

**File:** `.github/workflows/ci.yml`

**Purpose:** Run on every PR to ensure code quality before merge

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Job 1: Lint & Format Check
  lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for better diff

      - uses: ./.github/actions/setup-node-pnpm

      - name: Run Biome lint
        run: pnpm biome check .

      - name: Check for formatting issues
        run: pnpm biome format --check .

  # Job 2: Type Check
  typecheck:
    name: TypeScript Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/setup-node-pnpm

      - name: Build packages (for type references)
        run: pnpm build

      - name: Type check all packages
        run: pnpm typecheck

  # Job 3: Unit Tests
  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/setup-node-pnpm

      - name: Run unit tests
        run: pnpm test:unit --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          flags: unit

  # Job 4: OSS Package Leak Detection
  oss-leak-detection:
    name: OSS Leak Detection
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.changed_files, 'packages-oss/')

    steps:
      - uses: actions/checkout@v4

      - name: Scan for proprietary imports
        run: |
          echo "🔍 Scanning for IP leaks in OSS packages..."

          # Check for forbidden imports
          if grep -r "@snapback/auth\|@snapback/platform\|@snapback/analytics" packages-oss/; then
            echo "❌ Found proprietary package imports in OSS code!"
            exit 1
          fi

          # Check for forbidden keywords
          if grep -ri "stripe\|posthog\|subscription\|tier\|enterprise" packages-oss/ --include="*.ts" --include="*.tsx"; then
            echo "❌ Found proprietary keywords in OSS code!"
            exit 1
          fi

          echo "✅ No IP leaks detected"

  # Job 5: Build Verification
  build:
    name: Build All Packages
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/setup-node-pnpm

      - name: Build all packages
        run: pnpm build

      - name: Verify build artifacts
        run: |
          # Check that dist/ folders exist
          test -d packages-oss/sdk/dist || (echo "SDK build failed" && exit 1)
          test -d apps/web/.next || (echo "Web build failed" && exit 1)
```

---

## 🚀 Workflow: Deploy to Vercel Preview

**File:** `.github/workflows/deploy-preview.yml`

```yaml
name: Deploy Preview (Staging)

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'apps/docs/**'
      - 'packages/**'

# Use environment for secrets isolation
environment:
  name: preview
  url: ${{ steps.deploy.outputs.preview-url }}

jobs:
  deploy-web-preview:
    name: Deploy Web to Vercel Preview
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/setup-node-pnpm

      - name: Pull Vercel Environment
        run: |
          npx vercel pull --yes \
            --environment=preview \
            --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_WEB }}

      - name: Build in CI
        run: |
          cd apps/web
          npx vercel build
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_WEB }}

      - name: Deploy to Vercel Preview
        id: deploy
        run: |
          cd apps/web
          PREVIEW_URL=$(npx vercel deploy --prebuilt \
            --token=${{ secrets.VERCEL_TOKEN }} 2>&1 | \
            grep -Eo 'https://[^ ]+')

          echo "preview-url=$PREVIEW_URL" >> $GITHUB_OUTPUT
          echo "🚀 Preview deployed to: $PREVIEW_URL"
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_WEB }}

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: `## 🚀 Preview Deployed

**Web:** ${{ steps.deploy.outputs.preview-url }}

Testing checklist:
- [ ] UI renders correctly
- [ ] Auth flow works
- [ ] No console errors`
            })

  deploy-docs-preview:
    name: Deploy Docs to Vercel Preview
    runs-on: ubuntu-latest
    timeout-minutes: 10
    if: contains(github.event.pull_request.changed_files, 'apps/docs/')

    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/setup-node-pnpm

      - name: Deploy Docs Preview
        run: |
          cd apps/docs
          npx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_DOCS }}
```

---

## 🎯 Workflow: Deploy to Production

**File:** `.github/workflows/deploy-production.yml`

```yaml
name: Deploy Production

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'apps/docs/**'
      - 'packages/**'
  workflow_dispatch:  # Manual trigger

# Use production environment (requires approval)
environment:
  name: production
  url: https://snapback.dev

jobs:
  deploy-web-production:
    name: Deploy Web to Production
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/setup-node-pnpm

      - name: Pull Vercel Environment (Production)
        run: |
          npx vercel pull --yes \
            --environment=production \
            --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_WEB }}

      - name: Build Production
        run: |
          cd apps/web
          npx vercel build --prod
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_WEB }}

      - name: Deploy to Vercel Production
        run: |
          cd apps/web
          npx vercel deploy --prebuilt --prod \
            --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_WEB }}

      - name: Notify Deployment
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.repos.createCommitStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              sha: context.sha,
              state: 'success',
              target_url: 'https://snapback.dev',
              description: 'Production deployment successful',
              context: 'vercel/production'
            })

  deploy-docs-production:
    name: Deploy Docs to Production
    runs-on: ubuntu-latest
    timeout-minutes: 15
    if: contains(github.event.commits.*.modified, 'apps/docs/')

    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/setup-node-pnpm

      - name: Deploy Docs to Production
        run: |
          cd apps/docs
          npx vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_DOCS }}
```

---

## 🛠️ Reusable Action: Setup Node + pnpm

**File:** `.github/actions/setup-node-pnpm/action.yml`

```yaml
name: Setup Node & pnpm
description: Reusable action to setup Node.js and pnpm with caching

runs:
  using: composite
  steps:
    - name: Setup pnpm
      uses: pnpm/action-setup@v4
      with:
        version: 10

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      shell: bash

    - name: Verify workspace
      run: |
        echo "✅ Node version: $(node --version)"
        echo "✅ pnpm version: $(pnpm --version)"
        echo "✅ Workspace packages:"
        pnpm list --depth=0
      shell: bash
```

---

## 📋 CODEOWNERS

**File:** `.github/CODEOWNERS`

**Purpose:** Require reviews for sensitive files (IP protection)

```
# Global owners
* @your-username

# OSS packages require extra review
/packages-oss/ @your-username @oss-maintainers

# Workflows require security review
/.github/workflows/ @your-username @devops-team

# Environment files require approval
.env* @your-username @devops-team

# Secrets and configs
/config/ @your-username @devops-team

# Documentation can be reviewed by docs team
/apps/docs/ @docs-team
```

---

## 🎛️ Vercel Configuration

### File: `apps/web/vercel.json`

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://snapback.dev"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

## 📦 Package-Specific Configurations

### OSS Package Build Script

**File:** `package.json` (root)

```json
{
  "scripts": {
    "build": "turbo run build",
    "build:oss": "turbo run build --filter='@snapback-oss/*'",
    "test": "turbo run test",
    "test:unit": "vitest run --coverage",
    "test:e2e": "playwright test",
    "typecheck": "turbo run typecheck",
    "lint": "biome check .",
    "format": "biome format --write .",
    "dev": "turbo run dev --parallel",
    "dev:docker": "make dev-holistic"
  }
}
```

---

## 🔒 Security Best Practices

### 1. Secret Rotation Schedule
- **Production secrets:** Rotate every 90 days
- **Staging secrets:** Rotate every 180 days
- **Development keys:** Can be long-lived (test keys only)

### 2. Access Control
```yaml
# Limit who can access production environment
Environments → production → Deployment protection rules:
  - Required reviewers: [maintainer1, maintainer2]
  - Restrict to specific branches: main
```

### 3. Audit Logging
- Enable Vercel audit log
- Review GitHub Actions logs monthly
- Monitor failed deployments

---

## 📊 Monitoring & Observability

### Deployment Status Badge

Add to README.md:
```markdown
[![Deploy Production](https://github.com/your-org/snapback/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/your-org/snapback/actions/workflows/deploy-production.yml)
```

### Vercel Deployment Hooks

Configure webhooks for Slack/Discord notifications:
```
Vercel Project → Settings → Git → Deploy Hooks:
  - Production deployment success → Slack #deployments
  - Production deployment failure → Slack #alerts
```

---

## 🚀 Quick Start Checklist

### Initial Setup (One-time)

- [ ] Create Vercel projects (web, docs)
- [ ] Add Vercel secrets to GitHub repository
- [ ] Create GitHub Environments (preview, production)
- [ ] Configure environment secrets in GitHub
- [ ] Add environment variables to Vercel dashboard
- [ ] Copy `.env.docker.example` to `.env.docker`
- [ ] Add CODEOWNERS file
- [ ] Test local Docker setup: `make dev-holistic`

### Per PR Workflow

- [ ] Create feature branch
- [ ] Make changes locally (Docker environment)
- [ ] Run `pnpm lint` and `pnpm typecheck`
- [ ] Push to branch
- [ ] Open PR → CI runs automatically
- [ ] Review preview deployment URL
- [ ] Get approval from CODEOWNERS
- [ ] Merge to main → Production deployment

---

## 📚 References

- [GitHub Actions Best Practices 2025](https://docs.github.com/actions/deployment/about-deployments/deploying-with-github-actions)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [pnpm Workspace Guide](https://pnpm.io/workspaces)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**Last Updated:** 2025-12-05
**Next Review:** 2025-12-19
