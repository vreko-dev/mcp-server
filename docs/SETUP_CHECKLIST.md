# Workflow & Environment Setup Checklist

**Last Updated:** 2025-12-05
**Purpose:** Step-by-step setup guide for dev/staging/production workflows

---

## 🎯 Overview

This checklist guides you through setting up a complete CI/CD pipeline with:
- ✅ Docker-based local development
- ✅ Vercel preview deployments (staging)
- ✅ Vercel production deployments
- ✅ GitHub Actions workflows
- ✅ Environment secrets management
- ✅ IP protection for open-core packages

---

## Part 1: GitHub Repository Setup

### 1.1 Enable Required GitHub Features

```bash
# Repository Settings → General
✅ Allow squash merging (keep history clean)
✅ Automatically delete head branches (cleanup after merge)
✅ Require branches to be up to date before merging

# Repository Settings → Branches → Branch Protection Rules (main)
✅ Require pull request reviews (1+ approvals)
✅ Require status checks to pass (CI, build, lint)
✅ Require conversation resolution before merging
✅ Do not allow bypassing the above settings
```

### 1.2 Add Repository Secrets

**Path:** Settings → Secrets and variables → Actions → Repository secrets

```yaml
VERCEL_TOKEN: "<get_from_vercel_account_settings>"
VERCEL_ORG_ID: "<get_from_vercel_project_settings>"
VERCEL_PROJECT_ID_WEB: "<web_project_id>"
VERCEL_PROJECT_ID_DOCS: "<docs_project_id>"
NPM_TOKEN: "<npm_automation_token>"  # For publishing OSS packages
```

**How to get Vercel secrets:**
```bash
# 1. Install Vercel CLI
npm install -g vercel@latest

# 2. Login to Vercel
vercel login

# 3. Link to your project
cd apps/web
vercel link

# 4. Get org and project IDs (saved in .vercel/project.json)
cat .vercel/project.json
```

### 1.3 Create GitHub Environments

**Path:** Settings → Environments → New environment

#### Environment: `preview`
```
Name: preview
Deployment branches: All branches (for PR previews)

Environment secrets:
  DATABASE_URL: <staging_database_connection_string>
  POSTHOG_KEY: <staging_posthog_key>
  STRIPE_SECRET_KEY: sk_test_<test_mode_key>

Protection rules:
  ☑ None (allow automatic deployments)
```

#### Environment: `production`
```
Name: production
Deployment branches: Selected branches → main only

Environment secrets:
  DATABASE_URL: <production_database_connection_string>
  POSTHOG_KEY: <production_posthog_key>
  STRIPE_SECRET_KEY: sk_live_<live_mode_key>

Protection rules:
  ☑ Required reviewers: 1+ maintainers
  ☑ Wait timer: 0 minutes (deploy immediately after approval)
```

---

## Part 2: Vercel Project Setup

### 2.1 Create Vercel Projects

**Option 1: Via Vercel Dashboard**
```
1. Go to https://vercel.com/new
2. Import Git Repository (connect to your GitHub repo)
3. Select Framework Preset: Next.js
4. Root Directory: apps/web (for web project)
5. Click "Deploy"
```

**Option 2: Via Vercel CLI**
```bash
cd apps/web
vercel --prod  # Follow prompts to create project
```

**Repeat for docs:**
```bash
cd apps/docs
vercel --prod
```

### 2.2 Configure Environment Variables in Vercel

**Path:** Project Settings → Environment Variables

#### For **Preview** Environment:
```bash
# Core
NODE_ENV=preview
VERCEL_ENV=preview
NEXT_PUBLIC_API_URL=https://api-staging.snapback.dev

# Database
DATABASE_URL=<staging_db_url>

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_SHOW_DEBUG_PANEL=true

# Cloud Services
POSTHOG_KEY=phc_staging_xxx
STRIPE_SECRET_KEY=sk_test_xxx

# Auth
BETTER_AUTH_SECRET=<staging_secret_32_chars>
BETTER_AUTH_URL=https://api-staging.snapback.dev

# CORS
CORS_ORIGIN=https://*.vercel.app,https://staging.snapback.dev
```

#### For **Production** Environment:
```bash
# Core
NODE_ENV=production
VERCEL_ENV=production
NEXT_PUBLIC_API_URL=https://api.snapback.dev

# Database
DATABASE_URL=<production_db_url>

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SHOW_DEBUG_PANEL=false

# Cloud Services
POSTHOG_KEY=phc_prod_xxx
STRIPE_SECRET_KEY=sk_live_xxx

# Auth
BETTER_AUTH_SECRET=<production_secret_32_chars>
BETTER_AUTH_URL=https://api.snapback.dev

# CORS
CORS_ORIGIN=https://snapback.dev,https://docs.snapback.dev,https://app.snapback.dev
```

### 2.3 Disable Vercel Auto-Deployments (Use GitHub Actions Instead)

**Path:** Project Settings → Git

```
✅ Production Branch: main
☑ Automatic Deployments (Branch): DISABLED
   (We'll use GitHub Actions for controlled deployments)

✅ Preview Branches: All branches
☑ Automatic Deployments (Preview): DISABLED
   (GitHub Actions handles preview deployments too)
```

---

## Part 3: Local Development Setup

### 3.1 Clone Repository

```bash
git clone https://github.com/your-org/snapback.git
cd snapback
```

### 3.2 Install Dependencies

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm@latest

# Install workspace dependencies
pnpm install
```

### 3.3 Configure Local Environment

```bash
# Copy Docker environment example
cp .env.docker.example .env.docker

# Edit .env.docker with your local values
# Minimum required changes:
# - POSTGRES_PASSWORD (set a secure password)
# - BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)
```

**Required changes in `.env.docker`:**
```bash
# Change these values:
POSTGRES_PASSWORD=your_local_secure_password
BETTER_AUTH_SECRET=your_generated_32_char_secret

# Optional: Add your development API keys
STRIPE_SECRET_KEY=sk_test_your_test_key
POSTHOG_KEY=phc_dev_your_dev_key
```

### 3.4 Start Docker Development Environment

```bash
# Option 1: Holistic environment (all services)
make dev-holistic

# Option 2: Individual services
make dev  # Start main services only

# Option 3: Manual Docker Compose
docker-compose -f docker-compose.holistic.yml up
```

**Verify services are running:**
```bash
# Check all containers
docker ps

# Expected services:
# - postgres (port 5432)
# - redis (port 6379)
# - api (port 8080)
# - web (port 3000)
# - docs (port 3001)
# - mailhog (port 8025)
```

**Access services:**
```
Web App: http://snapback.dev (or http://localhost:3000)
Docs: http://docs.snapback.dev (or http://localhost:3001)
API: http://api.snapback.dev:8080
MailHog: http://localhost:8025
Grafana: http://localhost:3002 (admin/admin)
Prometheus: http://localhost:9090
```

---

## Part 4: Workflow Verification

### 4.1 Test CI Workflow

```bash
# Create a test branch
git checkout -b test/ci-verification

# Make a small change (add a comment to a file)
echo "// Test CI" >> packages-oss/sdk/src/index.ts

# Commit and push
git add .
git commit -m "test: verify CI workflow"
git push origin test/ci-verification

# Open PR on GitHub
gh pr create --title "Test CI Workflow" --body "Testing automated CI"

# Monitor workflow: GitHub → Actions tab
# Expected: ✅ lint, ✅ typecheck, ✅ test-unit, ✅ build
```

### 4.2 Test Preview Deployment

```bash
# Use the same PR from above
# Expected workflow: deploy-preview.yml

# Verify:
# 1. GitHub Actions runs "Deploy Preview"
# 2. Bot comments on PR with preview URL
# 3. Click URL to test staging environment
```

### 4.3 Test Production Deployment

```bash
# Merge your test PR to main
gh pr merge test/ci-verification --squash

# Monitor GitHub Actions
# Expected workflow: deploy-production.yml

# Verify:
# 1. Production deployment succeeds
# 2. Visit https://snapback.dev (or your domain)
# 3. Changes are live
```

### 4.4 Test OSS Leak Detection

```bash
# Create a branch with intentional leak
git checkout -b test/oss-leak-detection

# Add forbidden import to OSS package
echo "import { auth } from '@snapback/auth';" >> packages-oss/sdk/src/index.ts

# Push and create PR
git add .
git commit -m "test: trigger OSS leak detection"
git push origin test/oss-leak-detection
gh pr create --title "Test OSS Leak Detection" --body "Testing IP protection"

# Expected: ❌ CI fails with "OSS IP Leak Detection" error
# Clean up: Close PR without merging
```

---

## Part 5: Team Onboarding

### 5.1 Update CODEOWNERS

**File:** `.github/CODEOWNERS`

```bash
# Replace placeholders with real GitHub usernames:
# - @your-github-username → Your actual username
# - @devops-team → Your DevOps team
# - @oss-maintainers → OSS package maintainers
# - @docs-team → Documentation reviewers
# - @backend-team → Backend engineers
# - @frontend-team → Frontend engineers
# - @senior-engineers → Senior/principal engineers
```

### 5.2 Add Team Members to Environments

**Path:** Settings → Environments → production → Required reviewers

```
Add 1-2 trusted maintainers who can approve production deployments
```

### 5.3 Document Local Setup

Share this checklist with new team members. Recommended onboarding flow:

```markdown
## New Developer Setup (30 minutes)

1. Clone repository
2. Install pnpm: `npm install -g pnpm`
3. Install dependencies: `pnpm install`
4. Copy environment: `cp .env.docker.example .env.docker`
5. Update `.env.docker` with secure passwords
6. Start Docker: `make dev-holistic`
7. Verify: Visit http://snapback.dev
8. Create test PR to trigger CI

Questions? Check /docs/WORKFLOW_ENVIRONMENT_GUIDE.md
```

---

## Part 6: Security Best Practices

### 6.1 Secret Rotation Schedule

```
Production Secrets:
  - BETTER_AUTH_SECRET: Rotate every 90 days
  - STRIPE_SECRET_KEY: Rotate annually (or after breach)
  - DATABASE_URL password: Rotate every 180 days

Staging Secrets:
  - Can be longer-lived (180 days)

Development Secrets:
  - Use test keys only, no rotation needed
```

### 6.2 Audit Log Review

**Monthly checklist:**
```
☑ Review GitHub Actions logs for failed deployments
☑ Check Vercel deployment logs for errors
☑ Verify no unauthorized secret access
☑ Review CODEOWNERS changes
☑ Scan dependencies for vulnerabilities: pnpm audit
```

### 6.3 Access Control

```
GitHub Repository:
  - Admin: 1-2 owners only
  - Maintainer: Senior engineers
  - Write: All engineers
  - Read: Everyone

Vercel Projects:
  - Owner: Same as GitHub admins
  - Member: DevOps team

Environment Secrets:
  - Production: Only admins can view
  - Staging: DevOps + senior engineers
```

---

## Part 7: Troubleshooting

### Issue: "Cannot find module @snapback/auth"

**Cause:** Missing workspace package during Docker build

**Solution:**
```bash
# Ensure all packages exist
pnpm install
pnpm build

# Rebuild Docker images
docker-compose -f docker-compose.holistic.yml build --no-cache
```

### Issue: "Vercel deployment failed: No VERCEL_TOKEN"

**Cause:** Missing GitHub repository secret

**Solution:**
```bash
# 1. Get Vercel token: https://vercel.com/account/tokens
# 2. Add to GitHub: Settings → Secrets → Actions → New secret
# 3. Name: VERCEL_TOKEN
# 4. Re-run failed workflow
```

### Issue: "OSS leak detection false positive"

**Cause:** Keyword match in comments or documentation

**Solution:**
```bash
# Update .github/workflows/ci.yml to exclude false positives:
# Add --exclude="*.md" to grep command
if grep -ri "stripe" packages-oss/ --include="*.ts" --include="*.tsx" --exclude="*.md"; then
```

### Issue: "Production deployment requires approval but no reviewers"

**Cause:** Environment protection not configured

**Solution:**
```bash
# Settings → Environments → production → Required reviewers
# Add 1+ maintainers
```

---

## Part 8: Success Metrics

**After completing this checklist, you should have:**

✅ CI runs on every PR (lint, typecheck, test, build)
✅ Preview deployments auto-generated for PRs
✅ Production deploys only on main branch merge
✅ OSS packages protected from IP leaks
✅ Environment secrets isolated (preview vs production)
✅ CODEOWNERS enforcing required reviews
✅ Local Docker environment functional
✅ Team members onboarded with documentation

**Expected workflow efficiency:**

| Metric | Target | Actual |
|--------|--------|--------|
| PR open → CI complete | < 10 minutes | _____ |
| PR merge → Production deploy | < 15 minutes | _____ |
| New developer setup time | < 30 minutes | _____ |
| Zero-downtime deployments | 100% | _____ |

---

## Next Steps

1. **Test everything:** Follow Part 4 verification steps
2. **Update CODEOWNERS:** Replace placeholders with real usernames
3. **Document edge cases:** Add team-specific notes to this file
4. **Schedule reviews:** Set calendar reminders for secret rotation
5. **Monitor usage:** Track workflow run times and optimize

---

**Need help?** Check `/docs/WORKFLOW_ENVIRONMENT_GUIDE.md` for detailed reference.

**Last Updated:** 2025-12-05
**Maintained By:** DevOps Team
