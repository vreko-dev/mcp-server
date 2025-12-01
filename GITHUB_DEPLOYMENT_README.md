# SnapBack GitHub Deployment Guide

This guide provides instructions for deploying SnapBack from your GitHub repository. All client-side Guardian code has been removed and replaced with backend API calls.

## Key Changes Made

### 1. Backend API Integration
- All analysis functionality moved to backend API
- Client-side extensions now call backend endpoints
- IP protection achieved by keeping proprietary algorithms server-side

### 2. VSCode Extension Updates
- Removed all Guardian client-side code
- Created new API client service
- Updated save handlers to use backend API
- Added offline fallback functionality

### 3. MCP Server Updates
- Removed local Guardian detection
- Updated to proxy all analysis requests to backend API

### 4. CLI Updates
- Removed local Guardian detection
- Updated to use backend API with offline fallback

## Files to Commit

### Core API Client Files
```
apps/vscode/src/services/api-client.ts
apps/mcp-server/src/client/snapback-api.ts
apps/cli/src/services/api-client.ts
```

### VSCode Extension Updates
```
apps/vscode/src/handlers/SaveHandler.ts
apps/vscode/src/ai/fs/agentWatcher.ts
apps/vscode/src/ai/copilot/intercept.ts
apps/vscode/src/providers/DetectionCodeActionProvider.ts
apps/vscode/ARCHIVE/removed.md
```

### MCP Server Updates
```
apps/mcp-server/src/index.ts
```

### CLI Updates
```
apps/cli/src/check.ts
```

### Backend Configuration
```
packages/api/vercel.json
packages/api/src/index.ts
packages/api/src/routes/health.ts
```

## Environment Variables

Set the following environment variables in your deployment environment:

```
SNAPBACK_API_URL=https://your-api-url.com
SNAPBACK_API_KEY=your-api-key
```

For local development, you can also create `~/.snapback/config.json`:
```json
{
  "apiKey": "your-api-key"
}
```

## Deployment Steps

### 1. Backend Deployment
```bash
cd packages/api
vercel deploy --prod
```

### 2. Update Configuration
Update the API base URL in:
- VSCode extension settings
- MCP server configuration
- CLI configuration

### 3. Publish Extensions
- Publish updated VSCode extension
- Deploy updated MCP server
- Package and distribute updated CLI

## Testing

Run end-to-end tests to verify backend integration:
```bash
cd apps/vscode
pnpm test -- test/e2e/backend-e2e.test.ts
```

## Fallback Behavior

When the backend API is unavailable:
- VSCode extension falls back to basic pattern detection
- MCP server provides basic analysis
- CLI operates in offline mode

This ensures continued operation even when backend services are temporarily unavailable.

## Support

For deployment issues, contact the SnapBack development team.