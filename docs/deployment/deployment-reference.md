# Quick Deployment Reference

## Fly.io Deployments

### API Service
```bash
# Initial setup
cd apps/api
fly launch --name snapback-api --region ord

# Set secrets
fly secrets set \
  DATABASE_URL="postgresql://..." \
  STRIPE_SECRET_KEY="sk_..." \
  BETTER_AUTH_SECRET="..." \
  POSTHOG_API_KEY="..."

# Deploy
fly deploy

# View logs
fly logs

# Scale
fly scale count 2
fly scale vm shared-cpu-2x
```

### MCP Server
```bash
# Initial setup
cd apps/mcp-server
fly launch --name snapback-mcp --region ord

# Set secrets
fly secrets set \
  SNAPBACK_API_URL="https://api.snapback.dev" \
  SNAPBACK_API_KEY="..."

# Deploy
fly deploy

# View status
fly status
```

---

## NPM Publishing

### SDK Package
```bash
cd packages/sdk
pnpm build
pnpm publish --access public

# Or with changeset
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

### CLI Package
```bash
cd apps/cli
pnpm build
pnpm publish --access public
```

### All OSS Packages (from root)
```bash
# Using changesets (recommended)
pnpm changeset
pnpm changeset version
pnpm build
pnpm release
```

---

## VS Code Extension

### Manual Publish
```bash
cd apps/vscode

# Build
pnpm build

# Package
npx @vscode/vsce package

# Publish to VS Code Marketplace
npx @vscode/vsce publish -p $VSCE_PAT

# Publish to Open VSX (optional)
npx ovsx publish -p $OVSX_PAT
```

### Version Bump
```bash
cd apps/vscode
npm version patch  # or minor, major
git push --tags
```

---

## Vercel Deployments

### Web App
```bash
cd apps/web

# Link to Vercel project
vercel link

# Pull environment variables
vercel env pull

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Docs App
```bash
cd apps/docs
vercel link
vercel --prod
```

### Set Environment Variables
```bash
# Via CLI
vercel env add DATABASE_URL production

# Or use Vercel dashboard
# https://vercel.com/marcelle-labs/snapback-web/settings/environment-variables
```

---

## GitHub Actions Triggers

### Trigger API Deployment
```bash
# Push to main with API changes
git add apps/api/
git commit -m "feat(api): add new endpoint"
git push origin main
# → Auto-deploys to Fly.io
```

### Trigger NPM Publish
```bash
# Create changeset
pnpm changeset

# Commit and push
git add .changeset/
git commit -m "chore: add changeset"
git push
# → Creates PR with version bumps

# Merge PR to main
# → Auto-publishes to npm
```

### Trigger VS Code Extension Publish
```bash
# Tag release
git tag vscode-v1.2.3
git push --tags
# → Auto-publishes to marketplace
```

---

## Health Checks

### API Service
```bash
curl https://api.snapback.dev/health
curl https://api.snapback.dev/api/reference # Scalar API docs
```

### MCP Server
```bash
curl https://mcp.snapback.dev/health
```

### Web App
```bash
curl https://snapback.dev
```

### Docs
```bash
curl https://docs.snapback.dev
```

---

## Rollback Procedures

### Fly.io Rollback
```bash
# List releases
fly releases

# Rollback to previous
fly releases rollback

# Or specific version
fly releases rollback v42
```

### Vercel Rollback
```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

### NPM Unpublish (within 72 hours)
```bash
npm unpublish @snapback/sdk@1.2.3

# Or deprecate (preferred)
npm deprecate @snapback/sdk@1.2.3 "Bug in release, use 1.2.4"
```

---

## Monitoring

### Fly.io Metrics
```bash
fly dashboard
# → Opens https://fly.io/dashboard

fly metrics
fly logs -a snapback-api
```

### Vercel Analytics
```bash
vercel --logs
# Or visit dashboard
# https://vercel.com/marcelle-labs/snapback-web/analytics
```

### NPM Stats
```bash
# View downloads
npm info @snapback/sdk

# Or use npm stat
npx npm-stats @snapback/sdk
```

### VS Code Extension Stats
- Visit: https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode
- View: Ratings, installs, downloads
