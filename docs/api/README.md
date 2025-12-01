# SnapBack API Documentation

This directory contains comprehensive documentation for the SnapBack API client and related API integrations.

## Files in This Directory

### 1. SnapBackAPIClient.md (Complete Documentation)
**Full 500+ line comprehensive guide** to the `SnapBackAPIClient` class.

Contains:
- Complete class definition with all method signatures
- Detailed description of each public method (5 methods)
- Full request/response type definitions with field descriptions
- Constructor details and initialization patterns
- Authentication mechanisms (Bearer token, API key formats)
- Request/Response validation with Zod schemas
- Error types and handling patterns
- Performance characteristics and budgets
- Usage examples for each method
- Integration points with MCP server and future AnalysisRouter
- Testing information and coverage details
- Environment variables reference
- Complete usage flow example

**Use this for:** Deep understanding, implementation details, troubleshooting

### 2. SnapBackAPIClient-QuickReference.md (Quick Lookup)
**Quick reference card** (280 lines) for day-to-day development.

Contains:
- File locations and links
- Class structure overview
- Method reference table (endpoint, budget, input/output)
- Type definitions (all 4 response types)
- Usage example
- Authentication quick facts
- Error handling patterns
- Performance budgets table
- Testing commands
- Common patterns and workflows
- Integration points

**Use this for:** Quick lookups, common patterns, quick integration

## Source Files

- **Implementation**: `apps/mcp-server/src/client/snapback-api.ts` (176 lines)
  - `SnapBackAPIClient` class
  - 5 public methods
  - 1 private method
  - 4 Zod validation schemas
  - 5 TypeScript interfaces

- **Tests**: `apps/mcp-server/test/client/snapback-api.test.ts` (203 lines)
  - 100% method coverage
  - Error handling tests
  - Parameter validation
  - Response validation

- **Related**: `apps/mcp-server/src/auth.ts`
  - API key validation
  - Tier mapping (free/pro/admin)
  - Authentication caching

## Quick Start

### Initialization
```typescript
import { SnapBackAPIClient } from "@snapback/mcp-server/client/snapback-api";

const client = new SnapBackAPIClient({
  baseUrl: "https://api.snapback.dev",
  apiKey: process.env.SNAPBACK_API_KEY
});
```

### Analyze Code for Risk
```typescript
const result = await client.analyzeFast({
  code: "const SECRET = 'aws_key_12345';",
  filePath: "config.ts",
  context: { language: "typescript" }
});

console.log(`Risk Level: ${result.riskLevel}`);
console.log(`Score: ${result.score}`);
console.log(`Issues:`, result.issues);
```

### Create Snapshot
```typescript
const snapshot = await client.createSnapshot({
  filePath: "app.ts",
  reason: "Pre-risky-change checkpoint",
  source: "mcp"
});

console.log(`Snapshot ID: ${snapshot.id}`);
```

### Check Iteration Stats
```typescript
const stats = await client.getIterationStats("app.ts");

if (stats.consecutiveAIEdits > 5) {
  console.log(`Recommendation: ${stats.recommendation}`);
}
```

## API Methods Overview

| Method | Purpose | Endpoint | Budget |
|--------|---------|----------|--------|
| `analyzeFast()` | Code risk analysis | POST /api/analyze/fast | <200ms |
| `getIterationStats()` | Session metrics | GET /api/session/iteration-stats | <300ms |
| `createSnapshot()` | Safe point creation | POST /api/snapshots/create | <500ms |
| `getCurrentSession()` | Active session info | GET /api/session/current | <300ms |
| `getSafetyGuidelines()` | Safety guidelines | GET /api/guidelines/safety | <500ms |

## Key Features

- **Type-Safe**: Full TypeScript typing with Zod validation
- **Error Handling**: Clear error messages with HTTP status codes
- **Performance**: Sub-200ms response times for analysis
- **Authentication**: Bearer token with tier-based access (free/pro/admin)
- **Response Validation**: Zod schemas ensure response correctness
- **Comprehensive Tests**: 100% method coverage in unit tests

## Architecture Context

The `SnapBackAPIClient` is part of SnapBack's **API-first architecture**:

- **Purpose**: Centralized risk analysis engine for consistency across all clients
- **Benefits**: Feature flags, circuit breaker support, centralized updates
- **Future**: `AnalysisRouter` will provide tier-based routing (local Guardian Lite for Free, API for Pro)

## Related Documentation

- [MCP Server Documentation](../../apps/mcp-server/CLAUDE.md)
- [Core Detection Engine](../../packages/core/CLAUDE.md)
- [SDK Documentation](../../packages/sdk/CLAUDE.md)
- [Event Bus Documentation](../../packages/events/CLAUDE.md)
- [VS Code Extension](../../apps/vscode/CLAUDE.md)

## Testing

Run tests:
```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
pnpm test apps/mcp-server
```

Test coverage includes:
- All 5 public methods
- HTTP error handling
- Response validation
- Authorization headers
- Parameter encoding

## Environment Variables

```env
# Required
SNAPBACK_API_URL=https://api.snapback.dev
SNAPBACK_API_KEY=sk_...

# Optional (for testing)
SNAPBACK_NO_NETWORK=true|false
SNAPBACK_BACKEND_URL=https://backend.dev
```

## Performance Targets

| Operation | Target | Typical |
|-----------|--------|---------|
| `analyzeFast()` | <200ms | 45-150ms |
| `getIterationStats()` | <300ms | 50-200ms |
| `createSnapshot()` | <500ms | 100-300ms |
| `getCurrentSession()` | <300ms | 50-200ms |
| `getSafetyGuidelines()` | <500ms | 100-400ms |

## Next Steps

1. **For implementation details**: Read `SnapBackAPIClient.md`
2. **For quick lookups**: Use `SnapBackAPIClient-QuickReference.md`
3. **For integration**: See the MCP Server documentation
4. **For testing**: Run `pnpm test apps/mcp-server`
5. **For architecture**: Review the main project CLAUDE.md

---

**Last Updated**: November 17, 2025
**Documentation Version**: 1.0
**Implementation Status**: Complete and tested
