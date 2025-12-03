# Open Core Implementation Checklist

This is your step-by-step guide to implementing the open core strategy for SnapBack.

---

## Phase 1: Repository Setup (Week 1, Day 1-2)

### Create Public OSS Repository

- [ ] **Create new GitHub repository**
  ```bash
  # On GitHub.com/snapback-dev
  # Create new repo: "snapback-oss"
  # Description: "Open source snapshot and file protection system"
  # License: MIT
  # Initialize with README
  ```

- [ ] **Clone and set up structure**
  ```bash
  git clone https://github.com/snapback-dev/snapback-oss.git
  cd snapback-oss

  # Copy workspace setup from private repo
  cp ../SnapBack-Site/pnpm-workspace.yaml .
  cp ../SnapBack-Site/.npmrc .
  cp ../SnapBack-Site/turbo.json .
  cp ../SnapBack-Site/tsconfig.json .

  # Initialize pnpm
  corepack enable
  pnpm install
  ```

- [ ] **Create folder structure**
  ```bash
  mkdir -p apps/cli
  mkdir -p apps/vscode
  mkdir -p packages/sdk
  mkdir -p packages/core
  mkdir -p packages/contracts
  mkdir -p packages/config
  mkdir -p packages/events
  mkdir -p examples
  mkdir -p docs/community
  mkdir -p .github/workflows
  ```

- [ ] **Set up git configuration**
  ```bash
  # .gitignore
  cat > .gitignore << 'EOF'
  node_modules/
  dist/
  .turbo/
  .env
  .env.local
  *.log
  .DS_Store
  EOF

  git add .
  git commit -m "chore: initial repository structure"
  git push origin main
  ```

---

## Phase 2: Package Extraction (Week 1, Day 3-5)

### Extract @snapback/contracts

- [ ] **Copy package to OSS repo**
  ```bash
  cd snapback-oss
  cp -r ../SnapBack-Site/packages/contracts packages/
  cd packages/contracts

  # Update package.json
  # Remove any private dependencies
  # Set "private": false
  ```

- [ ] **Review and sanitize**
  - [ ] Check for proprietary types
  - [ ] Remove internal API types
  - [ ] Keep only public interfaces
  - [ ] Update README.md

- [ ] **Test build**
  ```bash
  pnpm install
  pnpm build
  pnpm test
  ```

### Extract @snapback/events

- [ ] **Copy package**
  ```bash
  cp -r ../SnapBack-Site/packages/events packages/
  ```

- [ ] **Sanitize**
  - [ ] Review EventEmitter2 implementation
  - [ ] Remove proprietary event types
  - [ ] Keep core event system

### Extract @snapback/config

- [ ] **Copy and sanitize**
  ```bash
  cp -r ../SnapBack-Site/packages/config packages/
  ```

- [ ] **Remove proprietary configs**
  - [ ] Delete Stripe configs
  - [ ] Delete integration configs
  - [ ] Keep only basic utilities

### Extract @snapback/core (Community Edition)

- [ ] **Copy package**
  ```bash
  cp -r ../SnapBack-Site/packages/core packages/
  ```

- [ ] **Create community version**
  - [ ] Keep snapshot logic
  - [ ] Keep basic AI detection
  - [ ] Remove cloud sync features
  - [ ] Remove advanced integrations
  - [ ] Update dependencies to only use OSS packages

### Extract @snapback/sdk

- [ ] **Copy SDK**
  ```bash
  cp -r ../SnapBack-Site/packages/sdk packages/
  ```

- [ ] **Update for OSS**
  - [ ] Remove proprietary API calls
  - [ ] Keep local storage features
  - [ ] Update documentation

### Extract apps/cli

- [ ] **Copy CLI**
  ```bash
  cp -r ../SnapBack-Site/apps/cli apps/
  ```

- [ ] **Remove commercial features**
  - [ ] Remove cloud sync commands
  - [ ] Keep local snapshot commands
  - [ ] Update help text

### Extract apps/vscode

- [ ] **Copy VS Code extension**
  ```bash
  cp -r ../SnapBack-Site/apps/vscode apps/
  ```

- [ ] **Community edition features**
  - [ ] Keep local snapshots
  - [ ] Keep file protection
  - [ ] Remove cloud features
  - [ ] Update extension manifest

---

## Phase 3: CI/CD Configuration (Week 2, Day 1-3)

### Set up npm Publishing

- [ ] **Create npm organization**
  ```bash
  # On npmjs.com
  # Create organization: @snapback
  # Add your account as owner
  ```

- [ ] **Get npm token**
  ```bash
  npm login
  npm token create --read-only=false
  # Copy token to GitHub secrets: NPM_TOKEN
  ```

- [ ] **Create publish workflow**
  ```bash
  # .github/workflows/release.yml
  ```
  - [ ] Copy from implementation plan
  - [ ] Test with dry run

- [ ] **Set up Changesets**
  ```bash
  pnpm add -D @changesets/cli
  pnpm changeset init

  # Configure .changeset/config.json
  ```

### Set up VS Code Publishing

- [ ] **Get Azure DevOps PAT**
  - [ ] Visit dev.azure.com
  - [ ] Create Personal Access Token
  - [ ] Scopes: Marketplace (Publish)
  - [ ] Add to GitHub secrets: VSCE_PAT

- [ ] **Create VS Code publish workflow**
  ```bash
  # .github/workflows/publish-vscode.yml
  ```

### Set up GitHub Actions

- [ ] **Create CI workflow**
  - [ ] Build all packages
  - [ ] Run tests
  - [ ] Type check
  - [ ] Lint

---

## Phase 4: Private Repo Integration (Week 2, Day 4-5)

### Update Private Repo Dependencies

- [ ] **Wait for first npm publish** (or use git submodules temporarily)

- [ ] **Update package.json in private repo**
  ```json
  {
    "dependencies": {
      "@snapback/sdk": "^1.0.0",
      "@snapback/core": "^1.0.0",
      "@snapback/contracts": "^1.0.0"
    }
  }
  ```

- [ ] **Test integration**
  ```bash
  cd ../SnapBack-Site
  pnpm install
  pnpm build
  pnpm test
  ```

- [ ] **Update imports**
  - [ ] Verify all imports work
  - [ ] Update any breaking changes

---

## Phase 5: Deployment Setup (Week 3)

### Fly.io Setup

- [ ] **Install flyctl**
  ```bash
  curl -L https://fly.io/install.sh | sh
  fly auth login
  ```

- [ ] **Deploy API**
  ```bash
  cd apps/api
  fly launch --name snapback-api
  # Set all secrets
  fly deploy
  ```

- [ ] **Deploy MCP**
  ```bash
  cd apps/mcp-server
  fly launch --name snapback-mcp
  fly deploy
  ```

- [ ] **Create GitHub Actions for Fly.io**
  ```bash
  # .github/workflows/deploy-api.yml
  # .github/workflows/deploy-mcp.yml
  ```

### Vercel Setup

- [ ] **Connect Vercel**
  - [ ] Link private repo to Vercel
  - [ ] Import apps/web
  - [ ] Import apps/docs

- [ ] **Configure build settings**
  - [ ] Set build command
  - [ ] Set output directory
  - [ ] Configure monorepo support

- [ ] **Set environment variables**
  - [ ] Database URL
  - [ ] Auth secrets
  - [ ] API keys

- [ ] **Test deployments**
  - [ ] Create test PR
  - [ ] Verify preview deployment
  - [ ] Merge to main
  - [ ] Verify production deployment

---

## Phase 6: Documentation (Week 4)

### OSS Repository

- [ ] **Write README.md**
  - [ ] Project overview
  - [ ] Features (community vs commercial)
  - [ ] Quick start
  - [ ] Installation
  - [ ] Basic usage examples
  - [ ] Link to docs

- [ ] **Create CONTRIBUTING.md**
  - [ ] How to contribute
  - [ ] Code of conduct
  - [ ] Development setup
  - [ ] PR process
  - [ ] CLA requirement

- [ ] **Add LICENSE files**
  - [ ] MIT for SDK, CLI, contracts
  - [ ] Apache 2.0 for core

- [ ] **Create issue templates**
  - [ ] Bug report
  - [ ] Feature request
  - [ ] Question

- [ ] **Set up GitHub Discussions**
  - [ ] Enable discussions
  - [ ] Create welcome post
  - [ ] Add categories

### Documentation Site

- [ ] **Update docs**
  - [ ] Add OSS installation guide
  - [ ] Add CLI documentation
  - [ ] Add SDK reference
  - [ ] Add VS Code extension guide
  - [ ] Add comparison table (free vs paid)

---

## Phase 7: Testing (Week 4)

### OSS Packages

- [ ] **Test npm packages**
  ```bash
  # In a fresh directory
  mkdir test-snapback
  cd test-snapback
  npm init -y
  npm install @snapback/sdk @snapback/cli
  ```

- [ ] **Test CLI**
  ```bash
  npx @snapback/cli init
  npx @snapback/cli snapshot create
  ```

- [ ] **Test VS Code extension**
  - [ ] Install from marketplace
  - [ ] Test file protection
  - [ ] Test snapshot creation
  - [ ] Test restore

### Private Services

- [ ] **Test API on Fly.io**
  ```bash
  curl https://api.snapback.dev/health
  ```

- [ ] **Test MCP**
  ```bash
  curl https://mcp.snapback.dev/health
  ```

- [ ] **Test Web App**
  - [ ] Visit https://snapback.dev
  - [ ] Test sign up flow
  - [ ] Test pricing page

---

## Phase 8: Soft Launch (Week 5)

### Internal Testing

- [ ] **Invite team members**
  - [ ] Test OSS installation
  - [ ] Test CLI commands
  - [ ] Test VS Code extension
  - [ ] Gather feedback

- [ ] **Fix critical bugs**

### Limited Beta

- [ ] **Invite 10-20 external users**
  - [ ] Friends, colleagues
  - [ ] Early supporters
  - [ ] Ask for feedback

- [ ] **Monitor**
  - [ ] npm downloads
  - [ ] VS Code installs
  - [ ] Error logs
  - [ ] User feedback

---

## Phase 9: Public Launch (Week 6)

### Pre-Launch

- [ ] **Prepare announcement**
  - [ ] Blog post
  - [ ] Twitter/X thread
  - [ ] LinkedIn post
  - [ ] Dev.to article

- [ ] **Set up monitoring**
  - [ ] Sentry for error tracking
  - [ ] PostHog for analytics
  - [ ] GitHub star tracking

### Launch Day

- [ ] **Publish announcement**
  - [ ] Post on Hacker News
  - [ ] Share on Reddit (r/vscode, r/coding)
  - [ ] Share on Twitter/X
  - [ ] Share on LinkedIn
  - [ ] Email to early supporters

- [ ] **Monitor and respond**
  - [ ] Watch GitHub issues
  - [ ] Respond to questions
  - [ ] Fix urgent bugs
  - [ ] Gather feedback

---

## Post-Launch (Ongoing)

### Week 1 After Launch

- [ ] **Daily monitoring**
  - [ ] Check error rates
  - [ ] Review feedback
  - [ ] Fix critical bugs

- [ ] **Engagement**
  - [ ] Respond to issues
  - [ ] Thank contributors
  - [ ] Update FAQ

### Month 1

- [ ] **Review metrics**
  - [ ] npm downloads
  - [ ] VS Code installs
  - [ ] GitHub stars
  - [ ] Conversion rate

- [ ] **Plan improvements**
  - [ ] Based on feedback
  - [ ] Prioritize features
  - [ ] Update roadmap

### Quarterly

- [ ] **Community health check**
  - [ ] Active contributors
  - [ ] Issue response time
  - [ ] PR merge rate
  - [ ] User satisfaction

- [ ] **Business review**
  - [ ] Free to paid conversion
  - [ ] Enterprise leads
  - [ ] Revenue impact

---

## Quick Reference Links

- [ ] **OSS Repo**: https://github.com/snapback-dev/snapback-oss
- [ ] **Private Repo**: https://github.com/Marcelle-Labs/snapback.dev
- [ ] **npm Organization**: https://www.npmjs.com/org/snapback
- [ ] **Fly.io Dashboard**: https://fly.io/dashboard
- [ ] **Vercel Dashboard**: https://vercel.com/marcelle-labs
- [ ] **VS Code Marketplace**: https://marketplace.visualstudio.com/publishers/MarcelleLabs

---

## Emergency Contacts

- **Fly.io Support**: https://community.fly.io
- **Vercel Support**: https://vercel.com/support
- **npm Support**: https://www.npmjs.com/support
- **GitHub Support**: https://support.github.com

---

## Notes

- Keep this checklist updated as you progress
- Mark items complete with `[x]`
- Add notes for any blockers
- Update timeline as needed
