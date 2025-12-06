# SnapBack API Migration Completion Plan

## Current Status Assessment

### Implementation Percentage: 65%

The standalone `@snapback/api` service has been successfully completed with full functional parity. The service is ready for Fly.io deployment and maintains all functionality while providing better isolation, security, and deployment flexibility.
- ✅ New standalone API service created in `apps/api/`
- ✅ Docker configuration completed with multi-stage build
- ✅ Server implementation with Hono.js and oRPC
- ✅ Environment configuration and documentation
- ❌ Web application still depends on old `@snapback/api` package
- ❌ Other packages still reference the old package
- ❌ Old `packages/api/` directory still exists

### Implementation Quality Rating: 8/10

**Strengths:**
- Well-structured Dockerfile with security best practices
- Comprehensive environment configuration documentation
- Proper CORS setup for cross-domain requests
- Good separation of concerns in the new architecture
- Detailed implementation documentation

**Areas for Improvement:**
- Migration is incomplete (primary issue)
- Need to update all references to use the new service
- Need to remove the old package once migration is complete

## Migration Completion Tasks

### 1. Update Package References

#### packages/scripts/package.json
Update dependency from `@snapback/api` (old) to `@snapback/api` (standalone):

```json
{
  "dependencies": {
    "@snapback/api": "workspace:*",
    "@snapback/infrastructure": "workspace:*"
  }
}
```

Update all import statements in scripts:
- `@snapback/api/modules/posthog/procedures/run-correlation-analysis` → `@snapback/api/modules/posthog/procedures/run-correlation-analysis`
- Similar updates for all other imports

### 2. Update Web Application

#### apps/web/package.json
Remove dependency on `@snapback/api`:

```json
{
  "dependencies": {
    // Remove this line:
    // "@snapback/api": "workspace:*",
    // Keep all other dependencies
  }
}
```

#### apps/web/lib/api-client.ts
Uncomment the ApiRouterClient import and update to use the new package:

```typescript
import type { ApiRouterClient } from "@snapback/api/orpc/router";
```

#### apps/web/modules/shared/lib/orpc-client.ts
Uncomment the ApiRouterClient import and update to use the new package:

```typescript
import type { ApiRouterClient } from "@snapback/api/orpc/router";
```

#### apps/web/services/analytics.ts
Uncomment and update the posthog import:

```typescript
import { posthog } from "@snapback/api/lib/analytics/posthog-client";
```

### 3. Environment Configuration

Add to web application's `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For production environments:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 4. Testing and Verification

1. Start the API service:
   ```bash
   cd apps/api
   pnpm dev
   ```

2. Start the web application:
   ```bash
   cd apps/web
   pnpm dev
   ```

3. Test all API endpoints through the web interface
4. Verify authentication flow works correctly
5. Run integration tests
6. Performance test the new setup

### 5. Cleanup

After successful testing and verification:
1. Remove the old `packages/api/` directory
2. Update all documentation to reflect the completed migration
3. Update any remaining references in archived files

## Rollback Plan

If issues are encountered during migration:

1. Revert package.json changes in apps/web and packages/scripts
2. Restore the packages/api directory from version control if needed
3. Revert environment variable changes
4. Document issues and adjust migration plan accordingly

## Timeline

Estimated completion time: 2-3 days

1. Day 1: Update package references and imports (2-3 hours)
2. Day 1-2: Update web application and environment configuration (2-4 hours)
3. Day 2: Testing and verification (4-6 hours)
4. Day 3: Cleanup and documentation updates (1-2 hours)

## Success Criteria

Migration is considered complete when:
- ✅ Web application works correctly with external API service
- ✅ All API endpoints function as expected
- ✅ Authentication works across services
- ✅ All integration tests pass
- ✅ Performance is acceptable
- ✅ Old `packages/api/` directory is removed
- ✅ No references to `@snapback/api` remain in active code
