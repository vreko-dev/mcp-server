# Open Core Strategy Implementation - Complete Walkthrough

This document walks through everything that has been created to implement SnapBack's open core repository strategy.

![Architecture Overview](/Users/user1/.gemini/antigravity/brain/d755a3d3-5b7b-498c-b2a0-42b4faf6bd1d/open_core_architecture_1764710841168.png)

## Summary

I've implemented the open core strategy in priority order as requested:

1. ✅ **Option 1: Start Implementation** - Repository setup and extraction scripts
2. ✅ **Option 3: Configuration Files** - CI/CD and deployment configs
3. ✅ **Option 2: Documentation** - Community guidelines and security policy

## What Was Created

### 📦 Phase 1: Implementation Scripts (4 files)

#### 1. Repository Setup Script
**File**: `scripts/setup-oss-repo.sh`

Creates the complete OSS repository structure with:
- Folder structure (apps/, packages/, examples/, docs/)
- Configuration files (package.json, turbo.json, pnpm-workspace.yaml)
- Git initialization
- README with quick start guide

**Usage**:
```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
chmod +x scripts/setup-oss-repo.sh
./scripts/setup-oss-repo.sh
```

#### 2-4. Package Extraction Scripts

Three specialized scripts to extract packages to OSS repo:

- **`extract-contracts.sh`** - Extracts `@snapback/contracts` (types/interfaces)
- **`extract-sdk.sh`** - Extracts `@snapback/sdk` (client SDK)
- **`extract-cli.sh`** - Extracts `@snapback/cli` (CLI tool)

Each script:
- Copies package to OSS repo
- Updates package.json for public publishing
- Removes proprietary dependencies
- Creates package-specific README

**Usage**:
```bash
chmod +x scripts/extract-*.sh
./scripts/extract-contracts.sh
./scripts/extract-sdk.sh
./scripts/extract-cli.sh
```

### ⚙️ Phase 2: CI/CD Workflows (5 files)

All GitHub Actions workflows are ready to be placed in `.github/workflows/` directory.

#### 1. NPM Release Workflow
**File**: `github-workflow-npm-release.yml`

- Triggers: Push to main
- Uses Changesets for versioning
- Automatically publishes to npm
- Creates version bump PRs

#### 2. VS Code Extension Publish
**File**: `github-workflow-vscode-publish.yml`

- Triggers: Git tags matching `vscode-v*`
- Publishes to VS Code Marketplace
- Optionally publishes to Open VSX
- Creates GitHub releases with VSIX artifacts

#### 3. Continuous Integration
**File**: `github-workflow-ci.yml`

- Triggers: PRs and pushes to main
- Runs: build, test, type-check, lint
- Includes code coverage reporting

#### 4. API Deployment
**File**: `github-workflow-deploy-api.yml`

- Triggers: Changes to `apps/api/**`
- Deploys to Fly.io automatically
- Verifies deployment with health checks

#### 5. MCP Deployment
**File**: `github-workflow-deploy-mcp.yml`

- Triggers: Changes to `apps/mcp-server/**`
- Deploys to Fly.io automatically
- Verifies deployment with health checks

### 🚀 Phase 3: Deployment Configs (4 files)

#### 1. Fly.io API Configuration
**File**: `fly-api.toml`

Production-ready Fly.io config for API service:
- Auto-scaling (1-10 instances)
- Health checks
- Resource limits (512MB memory)
- Environment variables setup

**To use**:
```bash
cp fly-api.toml apps/api/fly.toml
cd apps/api
fly launch --name snapback-api --config fly.toml
```

#### 2. Fly.io MCP Configuration
**File**: `fly-mcp.toml`

Production-ready Fly.io config for MCP server:
- Auto-scaling (1-5 instances)
- Health checks
- Resource limits (256MB memory)

**To use**:
```bash
cp fly-mcp.toml apps/mcp-server/fly.toml
cd apps/mcp-server
fly launch --name snapback-mcp --config fly.toml
```

#### 3. Vercel Web Configuration
**File**: `vercel-web.json`

Vercel config for web app:
- Monorepo build commands
- Security headers
- API proxy configuration
- Custom redirects

**To use**:
```bash
cp vercel-web.json apps/web/vercel.json
cd apps/web
vercel link
```

#### 4. Vercel Docs Configuration
**File**: `vercel-docs.json`

Vercel config for documentation:
- Monorepo build commands
- Caching headers
- Documentation redirects

**To use**:
```bash
cp vercel-docs.json apps/docs/vercel.json
cd apps/docs
vercel link
```

### 📚 Phase 4: Community Documentation (2 files)

#### 1. Contributing Guidelines
**File**: `CONTRIBUTING.md`

Comprehensive guide covering:
- Code of conduct reference
- How to report bugs and suggest features
- Development setup instructions
- Coding standards (TypeScript, testing, commits)
- Pull request process
- CLA information

**To use**:
Place in OSS repo root after review.

#### 2. Security Policy
**File**: `SECURITY.md`

Security vulnerability disclosure process:
- Supported versions
- How to report vulnerabilities privately
- Response timeline expectations
- Security best practices
- Scope definition

**To use**:
Place in OSS repo root and update security@snapback.dev contact.

---

## Implementation Priority Order

As requested, deliverables were created in interchangeable priority order:

### Priority 1: Foundation (Setup + Extraction)
✅ Repository setup script
✅ Package extraction scripts
- These enable the physical separation of OSS code

### Priority 2: Automation (CI/CD)
✅ GitHub Actions workflows
✅ Deployment configurations
- These enable automated publishing and deployment

### Priority 3: Community (Documentation)
✅ Contributing guidelines
✅ Security policy
- These enable community participation

---

## Next Steps

### Immediate Actions

1. **Run Setup Script**
   ```bash
   cd /Users/user1/WebstormProjects/SnapBack-Site
   ./scripts/setup-oss-repo.sh
   ```

2. **Review OSS Repo Structure**
   ```bash
   cd ../snapback-oss
   ls -la
   ```

3. **Extract First Package (Contracts)**
   ```bash
   cd ../SnapBack-Site
   ./scripts/extract-contracts.sh
   ```

4. **Review Extracted Package**
   ```bash
   cd ../snapback-oss/packages/contracts
   # Manually review for proprietary code
   # Remove any sensitive types
   ```

5. **Test Build**
   ```bash
   cd ../snapback-oss
   pnpm install
   pnpm --filter @snapback/contracts build
   pnpm --filter @snapback/contracts test
   ```

### Week by Week Plan

**Week 1: Repository Setup**
- [ ] Run setup script
- [ ] Extract all packages (contracts, SDK, CLI)
- [ ] Manual code review and sanitization
- [ ] Initial commit to new repo

**Week 2: CI/CD Configuration**
- [ ] Copy GitHub Actions workflows to `.github/workflows/`
- [ ] Set up GitHub secrets (NPM_TOKEN, VSCE_PAT, FLY_API_TOKEN)
- [ ] Test CI pipeline
- [ ] Set up Changesets

**Week 3: Deployment Setup**
- [ ] Copy Fly.io configs to apps
- [ ] Deploy API to Fly.io
- [ ] Deploy MCP to Fly.io
- [ ] Copy Vercel configs to apps
- [ ] Deploy web and docs to Vercel
- [ ] Verify all health checks

**Week 4: Community & Testing**
- [ ] Add CONTRIBUTING.md to OSS repo
- [ ] Add SECURITY.md to OSS repo
- [ ] Create issue templates
- [ ] Enable GitHub Discussions
- [ ] Invite beta testers
- [ ] Gather feedback

**Week 5: Soft Launch**
- [ ] Publish first versions to npm
- [ ] Publish VS Code extension
- [ ] Limited announcement
- [ ] Monitor metrics

**Week 6: Public Launch**
- [ ] Public announcement
- [ ] Social media promotion
- [ ] Submit to Hacker News, Reddit
- [ ] Respond to community

---

## Required Secrets Setup

### GitHub Secrets (OSS Repo)

```bash
# NPM Publishing
gh secret set NPM_TOKEN --body "npm_xxx..."

# VS Code Marketplace
gh secret set VSCE_PAT --body "xxx..."

# Open VSX (optional)
gh secret set OVSX_PAT --body "xxx..."
```

### GitHub Secrets (Private Repo)

```bash
# Fly.io Deployment
gh secret set FLY_API_TOKEN --body "xxx..."
```

### Fly.io Secrets

```bash
# API Service
fly secrets set -a snapback-api \
  DATABASE_URL="postgresql://..." \
  BETTER_AUTH_SECRET="..." \
  STRIPE_SECRET_KEY="sk_..." \
  POSTHOG_API_KEY="phc_..."

# MCP Server
fly secrets set -a snapback-mcp \
  SNAPBACK_API_URL="https://api.snapback.dev" \
  SNAPBACK_API_KEY="..."
```

### Vercel Environment Variables

Via Vercel dashboard or CLI:
```bash
vercel env add DATABASE_URL production
vercel env add BETTER_AUTH_SECRET production
vercel env add NEXT_PUBLIC_API_URL production
```

---

## Manual Review Required

### Before Publishing Packages

Each extracted package needs manual review:

**@snapback/contracts**
- [ ] Remove internal API types
- [ ] Remove proprietary service contracts
- [ ] Keep only public interfaces

**@snapback/sdk**
- [ ] Remove cloud sync features
- [ ] Remove API client for proprietary endpoints
- [ ] Keep only local storage features
- [ ] Update dependencies to OSS-only

**@snapback/core**
- [ ] Remove integrations code
- [ ] Remove advanced AI features (keep basic)
- [ ] Remove telemetry to proprietary services
- [ ] Keep snapshot and protection logic

**@snapback/cli**
- [ ] Remove cloud commands
- [ ] Remove API-dependent features
- [ ] Keep local filesystem operations

**snapback-vscode**
- [ ] Remove cloud sync UI
- [ ] Remove team features
- [ ] Keep local snapshots and protection
- [ ] Update settings contributions

---

## Testing Checklist

### Local Testing

- [ ] OSS repo builds successfully
- [ ] All tests pass
- [ ] Type checking succeeds
- [ ] Linting passes
- [ ] VS Code extension loads and activates
- [ ] CLI commands work

### Integration Testing

- [ ] Install SDK from local build
- [ ] Test SDK methods work
- [ ] Test CLI creates snapshots
- [ ] Test VS Code extension creates snapshots
- [ ] Test file protection levels

### Deployment Testing

- [ ] Flyio health checks pass
- [ ] Vercel deployments succeed
- [ ] All endpoints respond
- [ ] Database migrations work
- [ ] Environment variables loaded

### Publishing Testing

- [ ] Test npm publish in dry-run mode
- [ ] Test VS Code extension packaging
- [ ] Verify package metadata
- [ ] Check bundle sizes

---

## Success Metrics

Track these metrics to measure success:

### Technical Metrics
- [ ] OSS repo builds without errors
- [ ] All workflows execute successfully
- [ ] Deployments complete in < 5 minutes
- [ ] Health checks pass consistently
- [ ] Zero critical security vulnerabilities

### Adoption Metrics (First Month)
- [ ] npm downloads > 100
- [ ] VS Code extension installs > 500
- [ ] GitHub stars > 50
- [ ] Discord/community members > 50
- [ ] GitHub issues/PRs > 10

### Quality Metrics
- [ ] Test coverage > 70%
- [ ] Build success rate > 95%
- [ ] Deployment success rate > 99%
- [ ] Average issue response time < 48 hours

---

## Troubleshooting

### Setup Script Fails
- Check you're in correct directory
- Ensure bash is available
- Check file permissions

### Extract Script Fails
- Verify OSS repo exists at `../snapback-oss`
- Check package exists in private repo
- Ensure no file permission issues

### CI Workflow Fails
- Verify GitHub secrets are set
- Check pnpm-lock.yaml is committed
- Ensure Node.js version matches (22)

### Deployment Fails
- Verify Fly.io/Vercel CLI is installed
- Check authentication tokens
- Verify configuration files are valid
- Check environment variables are set

### Health Checks Fail
- Verify application starts locally
- Check health endpoint implementation
- Verify DATABASE_URL is correct
- Check logs: `fly logs -a snapback-api`

---

## Files Created

### In Your Workspace
1. `scripts/setup-oss-repo.sh` - OSS repo initialization
2. `scripts/extract-contracts.sh` - Extract contracts package
3. `scripts/extract-sdk.sh` - Extract SDK package
4. `scripts/extract-cli.sh` - Extract CLI package

### In Artifacts Directory
1. `implementation_plan.md` - Complete strategy (approved ✅)
2. `deployment-reference.md` - Quick deployment commands
3. `implementation-checklist.md` - Step-by-step checklist
4. `github-workflow-npm-release.yml` - NPM publishing workflow
5. `github-workflow-vscode-publish.yml` - VS Code extension workflow
6. `github-workflow-ci.yml` - CI workflow
7. `github-workflow-deploy-api.yml` - API deployment workflow
8. `github-workflow-deploy-mcp.yml` - MCP deployment workflow
9. `fly-api.toml` - Fly.io API configuration
10. `fly-mcp.toml` - Fly.io MCP configuration
11. `vercel-web.json` - Vercel web configuration
12. `vercel-docs.json` - Vercel docs configuration
13. `CONTRIBUTING.md` - Contribution guidelines
14. `SECURITY.md` - Security policy
15. `open_core_architecture_*.png` - Architecture diagram

---

## Summary

You now have a complete, production-ready open core implementation package:

✅ **4 automation scripts** for setup and extraction
✅ **5 GitHub Actions workflows** for CI/CD
✅ **4 deployment configurations** for Fly.io and Vercel
✅ **2 community documents** for contributors
✅ **1 architecture diagram** visualizing the strategy
✅ **3 planning documents** guiding implementation

All deliverables are aligned with industry standards and best practices used by successful open core companies like GitLab, Sentry, and Cal.com.

**You're ready to execute the strategy!** 🚀

Start with running `./scripts/setup-oss-repo.sh` and follow the week-by-week plan above.
