# Workflow Quick Reference

**Last Updated:** 2025-12-05
**For:** Development, Staging, Production workflows

---

## 🚀 Common Commands

### Local Development

```bash
# Start all services in Docker
make dev-holistic

# Start main services only
make dev

# Run individual services
docker-compose up web
docker-compose up api
docker-compose up postgres redis

# View logs
make logs-web
make logs-api
docker-compose logs -f web
```

### Testing

```bash
# Run all tests
pnpm test

# Run unit tests with coverage
pnpm test:unit --coverage

# Run specific test file
pnpm test path/to/test.test.ts

# Lint and format
pnpm biome check .
pnpm biome format --write .

# Type check
pnpm typecheck
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @snapback-oss/sdk build
pnpm --filter @snapback/web build

# Build OSS packages only
pnpm build:oss
```

### Deployment

```bash
# Preview (manual)
cd apps/web
vercel

# Production (manual)
cd apps/web
vercel --prod

# Via GitHub Actions (automatic)
# - Preview: Open PR → Auto-deploys
# - Production: Merge to main → Auto-deploys
```

---

## 🔄 Workflow Triggers

| Workflow | Trigger | Environment | Approval Required |
|----------|---------|-------------|-------------------|
| **CI** | Every PR, push to main/develop | N/A | No |
| **Deploy Preview** | PR opened/updated on `main` | preview | No |
| **Deploy Production** | Push to `main` branch | production | Yes (1+ approver) |
| **NPM Integration Test** | Daily cron, manual, push to main | N/A | No |

---

## 📋 Branch Workflow

### Feature Development

```bash
# 1. Create feature branch
git checkout -b feat/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to remote
git push origin feat/your-feature-name

# 4. Open PR on GitHub
gh pr create --title "feat: Add new feature" --body "Description..."

# 5. Wait for CI to pass
# Expected checks: lint, typecheck, test-unit, build, oss-leak-detection

# 6. Request review from CODEOWNERS

# 7. After approval, squash and merge
gh pr merge feat/your-feature-name --squash
```

### Hotfix

```bash
# 1. Create hotfix from main
git checkout main
git pull
git checkout -b hotfix/critical-bug-fix

# 2. Make minimal changes
git add .
git commit -m "fix: critical bug in production"

# 3. Push and create PR
git push origin hotfix/critical-bug-fix
gh pr create --title "hotfix: Critical bug fix" --body "Fixes production issue..."

# 4. Get expedited review
# Tag reviewers: @your-username urgent review needed

# 5. Merge and deploy
gh pr merge hotfix/critical-bug-fix --squash
# Automatic production deployment starts
```

---

## 🔐 Environment Variables

### Required for Local Development

```bash
# .env.docker (copy from .env.docker.example)
POSTGRES_PASSWORD=your_password
BETTER_AUTH_SECRET=your_32_char_secret
DATABASE_URL=postgresql://snapback:password@postgres:5432/snapback
```

### Required GitHub Secrets

```yaml
Repository Secrets:
  VERCEL_TOKEN: <from_vercel_account>
  VERCEL_ORG_ID: <from_.vercel/project.json>
  VERCEL_PROJECT_ID_WEB: <from_.vercel/project.json>
  VERCEL_PROJECT_ID_DOCS: <from_.vercel/project.json>
  NPM_TOKEN: <from_npm_account>

Environment: preview
  DATABASE_URL: <staging_db>
  POSTHOG_KEY: <staging_key>
  STRIPE_SECRET_KEY: sk_test_xxx

Environment: production
  DATABASE_URL: <production_db>
  POSTHOG_KEY: <production_key>
  STRIPE_SECRET_KEY: sk_live_xxx
```

### Required Vercel Variables

**Preview Environment:**
- `NODE_ENV=preview`
- `NEXT_PUBLIC_API_URL=https://api-staging.snapback.dev`
- `BETTER_AUTH_URL=https://api-staging.snapback.dev`

**Production Environment:**
- `NODE_ENV=production`
- `NEXT_PUBLIC_API_URL=https://api.snapback.dev`
- `BETTER_AUTH_URL=https://api.snapback.dev`

---

## 🛠️ Troubleshooting

### CI Failures

**Lint errors:**
```bash
pnpm biome check .
pnpm biome format --write .
git add .
git commit -m "fix: lint errors"
git push
```

**Type errors:**
```bash
pnpm typecheck
# Fix errors in reported files
pnpm build  # Rebuild packages
pnpm typecheck  # Verify
```

**Test failures:**
```bash
pnpm test  # Run all tests
pnpm test path/to/failing.test.ts  # Run specific test
# Fix failing test
git add .
git commit -m "fix: failing test"
git push
```

**OSS leak detection:**
```bash
# Check packages-oss/ for forbidden imports
grep -r "@snapback/auth\|@snapback/platform" packages-oss/
# Remove proprietary imports
git add .
git commit -m "fix: remove proprietary imports from OSS"
git push
```

### Deployment Failures

**Preview deployment failed:**
```bash
# Check GitHub Actions logs
# Common issues:
# 1. Missing VERCEL_TOKEN → Add in repo secrets
# 2. Build error → Fix locally: pnpm build
# 3. Missing env var → Add in Vercel dashboard (preview env)
```

**Production deployment failed:**
```bash
# 1. Check approval status (production requires reviewer)
# 2. Check GitHub Actions logs
# 3. Manual rollback if needed:
vercel rollback <previous_deployment_url> --prod
```

### Docker Issues

**Containers not starting:**
```bash
# Check logs
docker-compose logs

# Rebuild without cache
docker-compose build --no-cache

# Remove all containers and restart
docker-compose down -v
make dev-holistic
```

**Port conflicts:**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :8080

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
```

**Database connection error:**
```bash
# Ensure .env.docker has correct DATABASE_URL
# Format: postgresql://user:password@postgres:5432/dbname

# Check postgres is running
docker-compose ps postgres

# Restart postgres
docker-compose restart postgres
```

---

## 📊 Monitoring & Logs

### GitHub Actions

```
Repository → Actions tab
- View all workflow runs
- Filter by workflow name
- Re-run failed workflows
```

### Vercel Deployments

```
Vercel Dashboard → Your Project → Deployments
- View deployment status
- Check build logs
- Rollback to previous deployment
```

### Docker Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 web
```

### Application Logs

**Local (Docker):**
```
Web: http://snapback.dev → Browser Console
API: docker-compose logs -f api
```

**Preview:**
```
Vercel Dashboard → Deployments → Preview URL → Functions → Logs
```

**Production:**
```
Vercel Dashboard → Deployments → Production → Functions → Logs
Sentry: https://sentry.io (if configured)
```

---

## 🔄 Rollback Procedures

### Vercel Production Rollback

**Option 1: Via Dashboard**
```
1. Vercel Dashboard → Deployments
2. Find last good deployment
3. Click "⋯" → Promote to Production
```

**Option 2: Via CLI**
```bash
vercel rollback <deployment_url> --prod
```

**Option 3: Revert Git Commit**
```bash
# Find bad commit
git log --oneline

# Revert it
git revert <commit_hash>
git push origin main

# New deployment auto-triggers
```

### Database Migration Rollback

```bash
# If migration failed, rollback
pnpm prisma migrate resolve --rolled-back <migration_name>

# Apply last good state
pnpm prisma migrate deploy
```

---

## 📞 Emergency Contacts

**Production Down:**
1. Check Vercel status: https://vercel-status.com
2. Check deployment logs: Vercel Dashboard
3. Rollback: See "Rollback Procedures" above
4. Notify team: Slack #incidents

**Security Incident:**
1. Rotate compromised secrets immediately
2. Check audit logs: GitHub → Settings → Security → Audit log
3. Review access: Settings → Collaborators
4. Notify: security@yourcompany.com

**CI/CD Issues:**
1. Check GitHub Actions status: https://githubstatus.com
2. Disable auto-deployments temporarily
3. Deploy manually: `vercel --prod`

---

## 📚 Additional Resources

- **Full Guide:** `/docs/WORKFLOW_ENVIRONMENT_GUIDE.md`
- **Setup Checklist:** `/docs/SETUP_CHECKLIST.md`
- **npm Traction Strategy:** `/docs/open-core/NPM_TRACTION_STRATEGY.md`
- **SEO Guide:** `/docs/open-core/SEO_OPTIMIZATION_GUIDE.md`

---

**Questions?** Ask in team chat or check documentation first.

**Last Updated:** 2025-12-05
