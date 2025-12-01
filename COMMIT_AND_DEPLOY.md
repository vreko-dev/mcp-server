# Commit and Deploy Instructions

This document provides step-by-step instructions for committing all changes and deploying SnapBack from your GitHub repository.

## Summary of Changes

All client-side Guardian code has been removed and replaced with backend API calls. This includes:

1. **VSCode Extension**:
   - Removed all Guardian client-side code
   - Created new API client service
   - Updated save handlers to use backend API
   - Added offline fallback functionality

2. **MCP Server**:
   - Removed local Guardian detection
   - Updated to proxy all analysis requests to backend API

3. **CLI**:
   - Removed local Guardian detection
   - Updated to use backend API with offline fallback

4. **Backend API**:
   - Created REST endpoints for all analysis functionality
   - Moved all proprietary algorithms server-side

## Files to Commit

### VSCode Extension Files
```
apps/vscode/src/services/api-client.ts
apps/vscode/src/handlers/SaveHandler.ts
apps/vscode/src/ai/fs/agentWatcher.ts
apps/vscode/src/ai/copilot/intercept.ts
apps/vscode/src/providers/DetectionCodeActionProvider.ts
apps/vscode/ARCHIVE/removed.md
```

### MCP Server Files
```
apps/mcp-server/src/index.ts
apps/mcp-server/src/client/snapback-api.ts
```

### CLI Files
```
apps/cli/src/check.ts
apps/cli/src/services/api-client.ts
```

### Backend API Files
```
packages/api/vercel.json
packages/api/src/index.ts
packages/api/src/routes/health.ts
packages/api/src/routes/v1/analyze.ts
packages/api/src/routes/v1/detect-secrets.ts
packages/api/src/routes/v1/policy-evaluate.ts
packages/api/src/services/guardian.ts
```

### Documentation Files
```
DEPLOYMENT_SUMMARY.md
GITHUB_DEPLOYMENT_README.md
```

## Commit Instructions

1. **Stage all changes**:
   ```bash
   git add .
   ```

2. **Commit with descriptive message**:
   ```bash
   git commit -m "feat: Migrate to backend API architecture - Remove client-side Guardian, add API clients"
   ```

3. **Push to GitHub**:
   ```bash
   git push origin main
   ```

## Deployment Instructions

### Backend API Deployment (Vercel)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   cd packages/api
   vercel deploy --prod
   ```

### VSCode Extension Deployment

1. **Update package version** in `apps/vscode/package.json`

2. **Package the extension**:
   ```bash
   cd apps/vscode
   npm run package-vsce
   ```

3. **Publish to marketplace**:
   ```bash
   npm run deploy
   ```

### MCP Server Deployment

Deploy your MCP server with the updated code that proxies to the backend API.

### CLI Deployment

Package and distribute the updated CLI with backend API integration.

## Environment Variables

Ensure the following environment variables are set in your deployment environments:

### Backend API
```
DATABASE_URL=your-postgresql-connection-string
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

### Client Applications
```
SNAPBACK_API_URL=https://your-deployed-api-url
SNAPBACK_API_KEY=your-api-key
```

## Testing

After deployment, run the end-to-end tests to verify the integration:

```bash
cd apps/vscode
npm run test -- test/e2e/backend-e2e.test.ts
```

## Rollback Plan

If issues occur after deployment:

1. Revert to the previous commit:
   ```bash
   git revert HEAD
   ```

2. Redeploy the previous version

3. Investigate and fix issues before redeploying

## Support

For deployment issues, contact the SnapBack development team.