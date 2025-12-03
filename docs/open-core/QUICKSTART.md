# 🚀 Quick Start: Open Core Implementation

## TL;DR

You have everything needed to implement your open core strategy. All scripts are ready, configurations are prepared, and documentation is complete.

## Immediate Next Step

Run this single command to get started:

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
./scripts/setup-oss-repo.sh
```

This creates your OSS repository structure at `../snapback-oss/`

## What You Have

### ✅ Ready to Run (4 Scripts)
All executable and tested:
1. `scripts/setup-oss-repo.sh` - Creates OSS repo structure
2. `scripts/extract-contracts.sh` - Moves contracts package to OSS
3. `scripts/extract-sdk.sh` - Moves SDK package to OSS
4. `scripts/extract-cli.sh` - Moves CLI package to OSS

### ✅ Ready to Deploy (9 Config Files)
Copy to appropriate locations:
- 5 GitHub Actions workflows (.github/workflows/)
- 2 Fly.io configurations (apps/api/, apps/mcp-server/)
- 2 Vercel configurations (apps/web/, apps/docs/)

### ✅ Ready to Publish (2 Docs)
Add to OSS repo root:
- CONTRIBUTING.md
- SECURITY.md

### ✅ Planning Documents (4 Guides)
Reference materials:
- implementation_plan.md (approved by you ✅)
- deployment-reference.md
- implementation-checklist.md
- walkthrough.md (this summary)

## The Strategy

**Public OSS** (7 packages):
- @snapback/sdk, @snapback/core, @snapback/contracts
- @snapback/config, @snapback/events
- @snapback/cli, snapback-vscode

**Private Commercial** (9 packages):
- API, MCP server, Web app, Docs
- Platform, Integrations, Auth, Health, Policy Engine

**Deployment**:
- Fly.io: API + MCP (auto-deploy from main)
- Vercel: Web + Docs (auto-deploy from main)
- npm: All OSS packages (changesets versioning)
- VS Code Marketplace: Extension (tag-triggered)

## First Hour Checklist

1. **Create OSS Repo** (5 min)
   ```bash
   ./scripts/setup-oss-repo.sh
   ```

2. **Extract First Package** (10 min)
   ```bash
   ./scripts/extract-contracts.sh
   cd ../snapback-oss/packages/contracts
   # Review for proprietary code
   ```

3. **Test Build** (5 min)
   ```bash
   cd ../snapback-oss
   corepack enable
   pnpm install
   pnpm build
   ```

4. **Initialize Git Remote** (5 min)
   ```bash
   # Create repo on GitHub: snapback-dev/snapback-oss
   git remote add origin https://github.com/snapback-dev/snapback-oss.git
   git push -u origin main
   ```

5. **Set Up CI** (10 min)
   - Copy workflows from artifacts to `.github/workflows/`
   - Set GitHub secrets: NPM_TOKEN, VSCE_PAT
   - Push to trigger first CI run

## Critical Secrets Needed

### For OSS Publishing
```bash
# Get from npmjs.com
NPM_TOKEN=npm_xxxxxxxxxxxxx

# Get from Azure DevOps
VSCE_PAT=xxxxxxxxxxxxx
```

### For Deployments
```bash
# Get from fly.io
FLY_API_TOKEN=xxxxxxxxxxxxx

# Set via Vercel dashboard
# DATABASE_URL, BETTER_AUTH_SECRET, etc.
```

## Week 1 Goals

- [ ] OSS repo created and pushed to GitHub
- [ ] First package (contracts) extracted and reviewed
- [ ] CI pipeline running successfully
- [ ] NPM organization created (@snapback)
- [ ] Changesets configured

## Common Issues

**"OSS repository not found"**
- Run `setup-oss-repo.sh` first

**"Permission denied"**
- Scripts are already executable (chmod +x already run)

**"Package build fails"**
- Check for proprietary dependencies in extracted package
- Remove references to @snapback/platform, @snapback/integrations

**"CI workflow fails"**
- Ensure NPM_TOKEN secret is set in GitHub
- Check pnpm-lock.yaml is committed

## Support Resources

- **Implementation Plan**: Full strategy details
- **Deployment Reference**: Quick command reference
- **Implementation Checklist**: Step-by-step tasks
- **Walkthrough**: Complete documentation of deliverables

## Ready to Start?

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
./scripts/setup-oss-repo.sh
```

That's it! You're on your way to building an open core community. 🎉
