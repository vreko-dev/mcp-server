# MCP Server Bundling Implementation Checklist

**Source**: docs/implementation/MASTER_IMPLEMENTATION_PLAN.md

## Pre-Implementation Setup

### Dependencies to Install
```bash
# In apps/mcp-server
pnpm add posthog-node
pnpm add @snapback/auth

# Verify Guardian Lite package exists
cd packages/guardian-lite && pnpm build
```

### Environment Variables
Create `apps/mcp-server/.env`:
```bash
# PostHog (server-side constant - get from PostHog dashboard)
POSTHOG_API_KEY=phc_...

# Backend API
SNAPBACK_API_URL=https://api.snapback.dev

# Optional: SnapBack API key for server-to-server calls
SNAPBACK_API_KEY=sb_...
```

## Workstream Status

### ✅ WS1: Guardian Lite Package
- [ ] Create package.json with metadata
- [ ] Implement GuardianLite class with 15 patterns
- [ ] Write tests (5 test cases)
- [ ] Verify performance (<50ms for 1000 lines)
- [ ] Build and export types
- [ ] Document all patterns in README

**Files**:
- `packages/guardian-lite/package.json`
- `packages/guardian-lite/src/guardian-lite.ts`
- `packages/guardian-lite/src/guardian-lite.test.ts`
- `packages/guardian-lite/src/index.ts`
- `packages/guardian-lite/README.md`
- `packages/guardian-lite/tsconfig.json`

**See**: `packages/guardian-lite/IMPLEMENTATION_GUIDE.md`

### ⏳ WS2: MCP Build & Bundle
- [ ] Update esbuild config to bundle MCP server
- [ ] Add Guardian Lite to MCP server dependencies
- [ ] Configure build output to apps/vscode/dist/mcp-server.js
- [ ] Test bundled MCP server runs standalone
- [ ] Verify VSIX size <15 MB

**Files**:
- `apps/mcp-server/esbuild.config.js` (update)
- `apps/vscode/package.json` (add bundledDependencies)

### ⏳ WS3: Extension Lifecycle Manager
- [ ] Implement MCPLifecycleManager class
- [ ] Add exponential backoff logic (2s → 4s → 8s)
- [ ] Unix socket health checks
- [ ] Graceful shutdown with SIGTERM/SIGKILL
- [ ] Error dialogs after 3 failed restarts
- [ ] Integration with extension.ts Phase 2

**Files**:
- `apps/vscode/src/services/MCPLifecycleManager.ts` (create)
- `apps/vscode/src/extension.ts` (update Phase 2)

**See**: `apps/vscode/src/services/MCPLifecycleManager.IMPLEMENTATION.ts`

### ⏳ WS4: Analysis Router + Auth
- [ ] Implement FeatureFlagClient (PostHog)
- [ ] Implement AnalysisRouter
- [ ] Integrate Better Auth API key verification
- [ ] Add tier-based routing logic
- [ ] Update MCP server index.ts to use router
- [ ] Test free/pro/enterprise tier flows

**Files**:
- `apps/mcp-server/src/services/FeatureFlagClient.ts` (create)
- `apps/mcp-server/src/services/AnalysisRouter.ts` (create)
- `apps/mcp-server/src/index.ts` (update)
- `apps/mcp-server/.env.example` (update)

**See**:
- `apps/mcp-server/src/services/FeatureFlagClient.IMPLEMENTATION.ts`
- `apps/mcp-server/src/services/AnalysisRouter.IMPLEMENTATION.ts`

### ⏳ WS5: Circuit Breaker
- [ ] Implement CircuitBreaker class
- [ ] Add three states (Closed, Open, Half-Open)
- [ ] Test failure threshold and recovery
- [ ] Integrate with AnalysisRouter
- [ ] Add monitoring/logging

**Files**:
- `apps/mcp-server/src/services/CircuitBreaker.ts` (create)

**See**: `apps/mcp-server/src/services/CircuitBreaker.IMPLEMENTATION.ts`

### ⏳ WS6: Performance Monitoring
- [ ] Add performance metrics for analysis operations
- [ ] Track circuit breaker state changes
- [ ] Monitor MCP startup time
- [ ] Log feature flag fetch performance
- [ ] Add telemetry for tier usage

**Files**:
- Add to existing telemetry infrastructure

### ⏳ WS7: Integration & Testing
- [ ] End-to-end test: Free tier (local only)
- [ ] End-to-end test: Pro tier with ML flag
- [ ] End-to-end test: Pro tier without ML flag (gradual rollout)
- [ ] End-to-end test: Circuit breaker failover
- [ ] End-to-end test: Offline mode (cached flags)
- [ ] Performance validation (<3s activation, <2s MCP start)
- [ ] VSIX build and size check (<15 MB)

**Files**:
- `apps/vscode/test/integration/mcp-bundling.test.ts` (create)
- `apps/mcp-server/test/analysis-router.test.ts` (create)

## Critical Path

### Phase 1: Foundation (Days 1-2)
1. ✅ Complete WS1 (Guardian Lite) - Can start immediately
2. ✅ Complete WS5 (Circuit Breaker) - Can start immediately
3. ✅ Complete WS2 (MCP Build) - Can start immediately

### Phase 2: Integration (Days 3-4)
4. Complete WS3 (Lifecycle Manager) - Depends on WS2
5. Complete WS4 (Analysis Router) - Depends on WS1, WS5

### Phase 3: Testing & Polish (Days 5-7)
6. Complete WS6 (Performance Monitoring) - Depends on WS4
7. Complete WS7 (Integration Testing) - Depends on all

## PostHog Feature Flags Setup

**Required Feature Flags**:
```javascript
{
  'ml-detection': {
    rollout: 100,
    filters: [
      { property: 'subscriptionTier', value: 'pro' },
      { property: 'subscriptionTier', value: 'enterprise' }
    ]
  },
  'cloud-sync': {
    rollout: 100,
    filters: [
      { property: 'subscriptionTier', value: 'pro' },
      { property: 'subscriptionTier', value: 'enterprise' }
    ]
  },
  'custom-rules': {
    rollout: 100,
    filters: [
      { property: 'subscriptionTier', value: 'enterprise' }
    ]
  },
  'api-analysis-enabled': {
    rollout: 100, // Global kill switch
    filters: []
  },
  'experimental-ast-analysis': {
    rollout: 10, // 10% gradual rollout
    filters: [
      { property: 'subscriptionTier', value: 'pro' }
    ]
  }
}
```

## Success Criteria

- [ ] Single VSIX install enables extension + MCP
- [ ] Extension activates in <3 seconds
- [ ] MCP starts in <2 seconds (background, non-blocking)
- [ ] Local analysis <50ms, API analysis <200ms
- [ ] Works 100% offline (no network dependencies for core features)
- [ ] VSIX size <15 MB
- [ ] Zero manual MCP configuration for 95% of users
- [ ] Feature flags control tier capabilities

## Testing Scenarios

### Scenario 1: Free Tier User
- No API key provided
- Should use local Guardian Lite only
- Should show upgrade prompts
- Should work 100% offline

### Scenario 2: Pro Tier with ML Detection
- Valid API key
- `ml-detection` flag enabled
- `api-analysis-enabled` flag enabled
- Should use API analysis
- Should fall back to local if API unavailable

### Scenario 3: Pro Tier Without ML Detection (Gradual Rollout)
- Valid API key
- `ml-detection` flag disabled (in 10% rollout)
- Should use local Guardian Lite
- Should show "Coming soon" message
- No upgrade prompts (already Pro)

### Scenario 4: API Unavailable
- Valid API key
- API returns errors
- Circuit breaker should open after 5 failures
- Should fall back to local Guardian Lite gracefully

### Scenario 5: Offline Mode
- Valid API key
- No network connection
- Should use cached feature flags (1 minute TTL)
- Should fall back to free tier if no cache

## Common Issues & Solutions

### Issue: PostHog not returning flags
**Solution**: Check POSTHOG_API_KEY is correct, verify user properties match filter criteria

### Issue: Circuit breaker stuck open
**Solution**: Check recoveryTimeout (30s default), verify API is actually available

### Issue: MCP server not starting
**Solution**: Check bundled binary exists at dist/mcp-server.js, verify socket permissions

### Issue: Performance degradation
**Solution**: Verify Guardian Lite <50ms, check API response times, review circuit breaker logs

## Documentation Updates After Implementation

- [ ] Update main README.md with MCP bundling information
- [ ] Add tier comparison table (Free vs Pro vs Enterprise)
- [ ] Document PostHog setup for self-hosting
- [ ] Add troubleshooting guide for common issues
- [ ] Update CHANGELOG.md with new features
