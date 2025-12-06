# Open Core Repository Strategy for SnapBack

## Overview

This plan outlines a comprehensive open core repository strategy for SnapBack that protects your IP while fostering community growth, aligns with industry standards, and provides scalable deployment solutions.

## Current Architecture Analysis

### Apps (6 total)
- **@snapback/api** - Hono.js API service → Deploy to Fly.io
- **@snapback/mcp-server** - Model Context Protocol server → Deploy to Fly.io
- **@snapback/cli** - NPM CLI tool → Publish to npm
- **@snapback/web** - Next.js marketing/SaaS web app → Deploy to Vercel
- **@snapback/docs** - Next.js documentation → Deploy to Vercel
- **snapback-vscode** - VS Code extension → Publish to marketplace

### Packages (11 consolidated packages)
- **@snapback/config** - Configuration and utilities
- **@snapback/contracts** - Shared types and interfaces
- **@snapback/core** - Core functionality (AI detection, etc.)
- **@snapback/events** - Event system
- **@snapback/infrastructure** - Logging, metrics, tracing
- **@snapback/integrations** - Third-party integrations (Stripe, email, feature flags)
- **@snapback/platform** - Database schemas, queries
- **@snapback/sdk** - Platform-agnostic TypeScript SDK
- **@snapback/auth** - Authentication
- **@snapback/health** - Health checks
- **@snapback/policy-engine** - Policy engine

---

## Recommended Open Core Strategy

### 🎯 Core Philosophy

**Open Source** (Community Edition):
- Core snapshot functionality
- Local storage and file protection
- CLI and SDK
- VS Code extension
- Basic AI detection

**Proprietary** (Commercial/Enterprise):
- Cloud sync infrastructure
- Advanced integrations (Stripe payments, HubSpot, etc.)
- Team collaboration features
- Enterprise authentication
- Advanced analytics and observability
- Compliance features

---

## 📦 Package Classification

### PUBLIC PACKAGES (Open Source - MIT/Apache 2.0)

#### Tier 1: Core Open Source
These should be in a **public GitHub monorepo** (`snapback-dev/snapback-oss`):

1. **@snapback/sdk** ✅
   - Reason: Community adoption, client library
   - License: MIT
   - Deployment: npm public registry

2. **@snapback/core** ✅ (with limitations)
   - Reason: Core snapshot logic, AI detection basics
   - License: Apache 2.0
   - Note: Extract proprietary features first
   - Deployment: npm public registry

3. **@snapback/contracts** ✅
   - Reason: TypeScript types needed by SDK consumers
   - License: MIT
   - Deployment: npm public registry

4. **@snapback/config** ✅ (sanitized version)
   - Reason: Configuration utilities
   - License: MIT
   - Note: Remove proprietary service configs
   - Deployment: npm public registry

5. **@snapback/cli** ✅
   - Reason: Developer tool, community adoption
   - License: MIT
   - Deployment: npm public registry (`@snapback/cli`)

6. **@snapback/events** ✅
   - Reason: Event system using EventEmitter2 (industry standard)
   - License: MIT
   - Deployment: npm public registry

7. **snapback-vscode** ✅
   - Reason: Primary community touchpoint
   - License: MIT
   - Deployment: VS Code Marketplace

### PRIVATE PACKAGES (Proprietary)

#### Tier 2: Commercial Infrastructure
These stay in your **private monorepo** (`Marcelle-Labs/snapback.dev`):

1. **@snapback/api** 🔒
   - Reason: Contains business logic, integrations
   - Deployment: Fly.io (private)

2. **@snapback/mcp-server** 🔒
   - Reason: Proprietary MCP implementation
   - Deployment: Fly.io (private)

3. **@snapback/platform** 🔒
   - Reason: Database schemas, proprietary queries
   - Alternative: Create OSS version with basic schema

4. **@snapback/infrastructure** 🔒
   - Reason: Proprietary observability, logging
   - Alternative: Use basic console logging in OSS

5. **@snapback/integrations** 🔒
   - Reason: Stripe, email, feature flags = revenue features
   - Keep entirely private

6. **@snapback/auth** 🔒
   - Reason: Authentication with better-auth integration
   - Alternative: Basic auth in OSS, advanced in commercial

7. **@snapback/health** 🔒
   - Reason: Operational infrastructure

8. **@snapback/policy-engine** 🔒
   - Reason: Enterprise feature

9. **@snapback/web** 🔒
   - Reason: Your SaaS product UI/UX IP
   - Deployment: Vercel (private)

10. **@snapback/docs** 🟡 (Hybrid approach)
    - Content: Open source
    - Theme/Design: Can be proprietary
    - Deployment: Vercel (public)

---

## 🏗️ Repository Architecture

### Option 1: Dual Monorepo (RECOMMENDED) ⭐

This is the industry standard for open core (used by Sentry, GitLab, Cal.com, etc.)

#### Structure:

**Public Repo**: `github.com/snapback-dev/snapback-oss`
```
snapback-oss/
├── apps/
│   ├── cli/                    # @snapback/cli
│   └── vscode/                 # snapback-vscode extension
├── packages/
│   ├── sdk/                    # @snapback/sdk
│   ├── core/                   # @snapback/core (OSS version)
│   ├── contracts/              # @snapback/contracts
│   ├── config/                 # @snapback/config (sanitized)
│   └── events/                 # @snapback/events
├── examples/
│   ├── basic-usage/
│   └── custom-integration/
├── docs/
│   └── community/              # Community docs
├── .github/
│   └── workflows/
│       ├── publish-npm.yml     # Auto-publish to npm
│       ├── vscode-publish.yml  # Publish to marketplace
│       └── ci.yml              # Tests
├── LICENSE (MIT or Apache 2.0)
└── README.md
```

**Private Repo**: `github.com/Marcelle-Labs/snapback.dev` (current)
```
snapback.dev/
├── apps/
│   ├── api/                    # @snapback/api → Fly.io
│   ├── mcp-server/             # @snapback/mcp-server → Fly.io
│   ├── web/                    # @snapback/web → Vercel
│   └── docs/                   # @snapback/docs → Vercel
├── packages/
│   ├── platform/               # Database, proprietary
│   ├── infrastructure/         # Observability
│   ├── integrations/           # Stripe, email, etc.
│   ├── auth/                   # Advanced auth
│   ├── health/
│   └── policy-engine/
├── packages-oss/              # Git submodules or pnpm workspace links
│   ├── sdk@ → ../snapback-oss/packages/sdk
│   ├── core@ → ../snapback-oss/packages/core
│   └── contracts@ → ../snapback-oss/packages/contracts
└── .github/
    └── workflows/
        ├── deploy-api-fly.yml
        ├── deploy-mcp-fly.yml
        ├── deploy-web-vercel.yml
        └── deploy-docs-vercel.yml
```

#### Integration Strategy:
- Use **git submodules** or **pnpm workspace protocol** to reference OSS packages
- OSS packages published to npm can be consumed by private repo
- CI/CD: OSS repo publishes to npm → private repo depends on published versions

---

## 🚀 Deployment Strategy

### API Service (@snapback/api) → Fly.io

**Setup:**
```bash
# In private repo
cd apps/api
fly launch --name snapback-api --region ord
fly secrets set DATABASE_URL="..."
fly secrets set STRIPE_SECRET_KEY="..."
```

**fly.toml:**
```toml
app = "snapback-api"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"

[[services.ports]]
  handlers = ["http"]
  port = 80
  force_https = true

[[services.ports]]
  handlers = ["tls", "http"]
  port = 443

[services.concurrency]
  type = "connections"
  hard_limit = 1000
  soft_limit = 500
```

**CI/CD (.github/workflows/deploy-api.yml):**
```yaml
name: Deploy API to Fly.io

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: ./apps/api
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

### MCP Server (@snapback/mcp-server) → Fly.io

**Setup:**
```bash
cd apps/mcp-server
fly launch --name snapback-mcp --region ord
```

**fly.toml:**
```toml
app = "snapback-mcp"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  NODE_ENV = "production"
  MCP_VERSION = "1.0.0"

[[services]]
  internal_port = 8080
  protocol = "tcp"

[[services.ports]]
  handlers = ["http"]
  port = 80
  force_https = true

[[services.ports]]
  handlers = ["tls", "http"]
  port = 443
```

---

### CLI (@snapback/cli) → npm

**Setup:**
In the **public OSS repo**:

```json
// apps/cli/package.json
{
  "name": "@snapback/cli",
  "version": "0.1.1",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**CI/CD (.github/workflows/publish-cli.yml):**
```yaml
name: Publish CLI to npm

on:
  push:
    tags:
      - 'cli-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10.14.0
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm --filter @snapback/cli build
      - run: pnpm --filter @snapback/cli publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Publishing:**
```bash
# In OSS repo
cd apps/cli
git tag cli-v0.1.2
git push --tags
# GitHub Actions will auto-publish
```

---

### VS Code Extension (snapback-vscode) → Marketplace

**Setup:**
```bash
# Get Personal Access Token from Azure DevOps
# https://dev.azure.com/marcelle-labs/_usersSettings/tokens

# Install vsce
npm install -g @vscode/vsce

# Package extension
cd apps/vscode
vsce package

# Publish
vsce publish
```

**CI/CD (.github/workflows/publish-vscode.yml):**
```yaml
name: Publish VS Code Extension

on:
  push:
    tags:
      - 'vscode-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: pnpm install
      - run: pnpm --filter snapback-vscode build

      - name: Publish to VS Code Marketplace
        run: |
          cd apps/vscode
          npx @vscode/vsce publish -p ${{ secrets.VSCE_PAT }}

      - name: Publish to Open VSX
        run: |
          cd apps/vscode
          npx ovsx publish -p ${{ secrets.OVSX_PAT }}
```

---

### Web App (@snapback/web) → Vercel

**Setup:**
```bash
# Link to Vercel project
cd apps/web
vercel link
vercel env pull
```

**vercel.json:**
```json
{
  "buildCommand": "pnpm run build",
  "devCommand": "pnpm run dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

**GitHub Integration:**
- Connect Vercel to your private GitHub repo
- Auto-deploy on push to `main`
- Preview deployments for PRs
- Environment variables in Vercel dashboard

**Monorepo Support:**
```json
{
  "buildCommand": "cd ../.. && pnpm run build --filter=@snapback/web",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

---

### Documentation (@snapback/docs) → Vercel

**Setup:**
```bash
cd apps/docs
vercel link
```

**vercel.json:**
```json
{
  "buildCommand": "pnpm run build",
  "devCommand": "pnpm run dev",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

**Hybrid Approach:**
- Deploy from private repo to Vercel
- Content source can be public (GitHub repo with just markdown)
- Use `next.config.js` remote content fetching:

```js
// apps/docs/next.config.js
export default {
  async rewrites() {
    return [
      {
        source: '/community/:path*',
        destination: 'https://raw.githubusercontent.com/snapback-dev/snapback-oss/main/docs/:path*'
      }
    ]
  }
}
```

---

## 📋 Package Publishing Strategy

### NPM Packages (from OSS repo)

**Packages to publish:**
- `@snapback/sdk`
- `@snapback/core`
- `@snapback/contracts`
- `@snapback/config`
- `@snapback/events`
- `@snapback/cli`

**Versioning Strategy:**
- Use **Changesets** (already configured)
- Semantic versioning
- Automated publishing via GitHub Actions

**Setup:**
```bash
# In OSS repo root
pnpm add -D @changesets/cli
pnpm changeset init
```

**.github/workflows/release.yml:**
```yaml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install
      - run: pnpm build

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 🔄 Integration Between Repos

### Approach 1: Published Package Dependencies (RECOMMENDED)

**Private repo uses published OSS packages:**

```json
// Private repo: apps/api/package.json
{
  "dependencies": {
    "@snapback/sdk": "^1.0.0",        // from npm
    "@snapback/core": "^1.0.0",       // from npm
    "@snapback/contracts": "^1.0.0",  // from npm
    "@snapback/platform": "workspace:*",  // local private package
    "@snapback/integrations": "workspace:*"  // local private package
  }
}
```

**Pros:**
- Clean separation
- Version control
- Easy to reason about

**Cons:**
- Delay between OSS changes and private repo updates
- Need to publish to npm for every change during development

### Approach 2: Git Submodules

```bash
# In private repo
git submodule add https://github.com/snapback-dev/snapback-oss.git packages-oss
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - apps/**
  - packages/**
  - packages-oss/packages/**  # OSS packages
```

**Pros:**
- Real-time development
- Single source of truth

**Cons:**
- More complex git workflow
- Submodule management overhead

### Approach 3: Hybrid (BEST FOR YOUR CASE)

**Development:**
- Use git submodules for rapid iteration
- Link OSS packages via workspace protocol

**Production:**
- Private repo CI/CD uses published npm versions
- Automated PR when new OSS version is published

---

## 🌍 Community Engagement Strategy

### GitHub Public Repo

**README.md highlights:**
- Clear community edition vs. commercial comparison
- Quick start guide
- Link to paid features
- Contribution guidelines

**Community Features (Free):**
- Local snapshots
- File protection (3 levels)
- Basic AI detection
- VS Code extension
- CLI tool
- SDK

**Commercial Features (Paid):**
- Cloud sync
- Team collaboration
- Advanced integrations (Stripe, HubSpot)
- Enterprise SSO
- Compliance features
- Priority support

### Contribution Model

**public repo (snapback-oss):**
- Accept community PRs
- CLA (Contributor License Agreement)
- Open issues, discussions
- Good first issues labeled

**private repo:**
- Closed development
- Team only

### License Strategy

**OSS Packages:**
- **MIT License** for `@snapback/sdk`, `@snapback/cli`, `@snapback/contracts`
- **Apache 2.0** for `@snapback/core` (allows patent protection)

**Commercial:**
- Proprietary license
- "Source Available" option for enterprise customers

---

## 📊 Recommended Implementation Timeline

### Week 1: Repository Setup
- [ ] Create `snapback-dev/snapback-oss` public repo
- [ ] Extract OSS packages from private monorepo
- [ ] Set up dual workspace structure
- [ ] Configure CI/CD for OSS publishing

### Week 2: Package Publishing
- [ ] Publish `@snapback/sdk` to npm
- [ ] Publish `@snapback/contracts` to npm
- [ ] Publish `@snapback/core` to npm
- [ ] Publish `@snapback/cli` to npm
- [ ] Update private repo to use published packages

### Week 3: Deployment Automation
- [ ] Set up Fly.io deployment for API
- [ ] Set up Fly.io deployment for MCP
- [ ] Configure Vercel deployments (web, docs)
- [ ] Test full deployment pipeline

### Week 4: Documentation & Community
- [ ] Write OSS contribution guidelines
- [ ] Create community documentation
- [ ] Set up discussions, issue templates
- [ ] Announce community edition

---

## 🚨 Critical Considerations

### Security
- [ ] Secret scanning in OSS repo (GitHub Advanced Security)
- [ ] No hardcoded API keys
- [ ] Environment variable validation
- [ ] Dependency scanning (Dependabot)

### IP Protection
- [ ] Code review for OSS extractions
- [ ] Remove all proprietary algorithms
- [ ] Sanitize commit history if needed
- [ ] Legal review of licenses

### Monitoring
- [ ] Track npm download stats
- [ ] Monitor VS Code extension installs
- [ ] Analytics on OSS repo stars, forks
- [ ] Community health metrics

---

## ✅ Success Metrics

### Technical
- OSS package downloads > 1,000/month (6 months)
- VS Code extension installs > 5,000
- Zero security incidents in OSS
- CI/CD uptime > 99.9%

### Business
- Community PRs > 10/quarter
- Conversion rate (free → paid) > 2%
- Enterprise leads from OSS > 5/quarter
- GitHub stars > 1,000 (12 months)

### Community
- Active contributors > 20
- Discord/Slack members > 500
- Monthly active discussions > 50

---

## Next Steps

1. **Review this plan** and provide feedback
2. **Legal review** of licensing strategy
3. **Create OSS repo** structure
4. **Extract and sanitize** OSS packages
5. **Set up CI/CD pipelines**
6. **Soft launch** to small community
7. **Monitor and iterate**
