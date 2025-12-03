# Open Core Strategy - Documentation Index

This directory contains the complete open core implementation strategy for SnapBack.

## 📚 Quick Navigation

### Start Here
- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[implementation_plan.md](./implementation_plan.md)** - Complete strategy (approved ✅)

### Implementation
- **[implementation-checklist.md](./implementation-checklist.md)** - Step-by-step tasks (9 phases)
- **[walkthrough.md](./walkthrough.md)** - Complete documentation of all deliverables

### Reference
- **[../deployment/deployment-reference.md](../deployment/deployment-reference.md)** - Deployment commands
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - For OSS repo
- **[SECURITY.md](./SECURITY.md)** - For OSS repo

## 🚀 Ready-to-Use Scripts

All scripts are in `../../scripts/`:
- `setup-oss-repo.sh` - Create OSS repository
- `extract-contracts.sh` - Extract contracts package
- `extract-sdk.sh` - Extract SDK package
- `extract-cli.sh` - Extract CLI package

## ⚙️ Configuration Templates

### GitHub Actions
Located in `../../.github/workflows-templates/`:
- `github-workflow-ci.yml`
- `github-workflow-npm-release.yml`
- `github-workflow-vscode-publish.yml`
- `github-workflow-deploy-api.yml`
- `github-workflow-deploy-mcp.yml`

### Deployment Configs
Located in `../../config-templates/`:
- `fly-api.toml` - Fly.io API configuration
- `fly-mcp.toml` - Fly.io MCP configuration
- `vercel-web.json` - Vercel web app configuration
- `vercel-docs.json` - Vercel docs configuration

## 📊 The Strategy

**7 OSS Packages** (Public):
- @snapback/sdk
- @snapback/core
- @snapback/contracts
- @snapback/config
- @snapback/events
- @snapback/cli
- snapback-vscode

**9 Proprietary Packages** (Private):
- API service → Fly.io
- MCP server → Fly.io
- Web app → Vercel
- Docs → Vercel
- Platform, Integrations, Auth, Health, Policy Engine

## ⚡ Quick Start

```bash
# 1. Create OSS repository
cd /Users/user1/WebstormProjects/SnapBack-Site
./scripts/setup-oss-repo.sh

# 2. Extract first package
./scripts/extract-contracts.sh

# 3. Review and build
cd ../snapback-oss
pnpm install
pnpm build
```

See [QUICKSTART.md](./QUICKSTART.md) for detailed instructions.

## 📅 Implementation Timeline

- **Week 1**: Repository setup + package extraction
- **Week 2**: CI/CD configuration
- **Week 3**: Deployment setup
- **Week 4**: Community & testing
- **Week 5**: Soft launch
- **Week 6**: Public launch

See [implementation-checklist.md](./implementation-checklist.md) for full details.

## 🎯 Success Metrics

### Month 1 Goals
- npm downloads > 100
- VS Code installs > 500
- GitHub stars > 50
- Community members > 50

### Technical Goals
- Test coverage > 70%
- Build success > 95%
- Deployment success > 99%

## 📞 Support

Review the documents above for detailed guidance. All files are production-ready and follow industry best practices.
