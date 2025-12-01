# SnapBack API Client - Quick Reference

## Files
- **Implementation**: `apps/mcp-server/src/client/snapback-api.ts` (176 lines)
- **Tests**: `apps/mcp-server/test/client/snapback-api.test.ts` (203 lines)
- **Documentation**: `docs/api/SnapBackAPIClient.md` (full docs)

## Class at a Glance

```typescript
export class SnapBackAPIClient {
  constructor(config: { baseUrl: string; apiKey: string })
  
  // Public methods
  async analyzeFast(request: AnalysisRequest): Promise<AnalysisResponse>
  async getIterationStats(filePath: string): Promise<IterationStats>
  async createSnapshot(request: SnapshotRequest): Promise<SnapshotResponse>
  async getCurrentSession(): Promise<SessionResponse>
  async getSafetyGuidelines(): Promise<string>
  
  // Private
  private fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T>
}
```

## Method Reference

| Method | Endpoint | Budget | Input | Output |
|--------|----------|--------|-------|--------|
| `analyzeFast()` | POST /api/analyze/fast | <200ms | code, filePath, context? | riskLevel, score, factors, issues |
| `getIterationStats()` | GET /api/session/iteration-stats | <300ms | filePath | consecutiveAIEdits, riskLevel, velocity, recommendation |
| `createSnapshot()` | POST /api/snapshots/create | <500ms | filePath, reason?, source | id, timestamp, meta |
| `getCurrentSession()` | GET /api/session/current | <300ms | (none) | consecutiveAIEdits, lastEditTimestamp, filePath, riskLevel |
| `getSafetyGuidelines()` | GET /api/guidelines/safety | <500ms | (none) | string (text) |

## Type Definitions

### AnalysisResponse
```typescript
{
  riskLevel: "safe" | "low" | "medium" | "high" | "critical"
  score: number                    // 0-1
  factors: string[]                // ["large insertion", "complex logic", ...]
  analysisTimeMs: number           // Execution time
  issues: Array<{
    severity: "low" | "medium" | "high" | "critical"
    message: string
    line?: number
    column?: number
  }>
}
```

### IterationStats
```typescript
{
  consecutiveAIEdits: number
  riskLevel: string
  velocity: number
  recommendation: string
}
```

### SnapshotResponse
```typescript
{
  id: string
  timestamp: number
  meta: Record<string, any>
}
```

### SessionResponse
```typescript
{
  consecutiveAIEdits: number
  lastEditTimestamp: number
  filePath: string
  riskLevel: string
}
```

## Usage Example

```typescript
import { SnapBackAPIClient } from "@snapback/mcp-server/client/snapback-api";

const client = new SnapBackAPIClient({
  baseUrl: "https://api.snapback.dev",
  apiKey: process.env.SNAPBACK_API_KEY
});

// Analyze code
const result = await client.analyzeFast({
  code: "const SECRET = 'aws_key_12345';",
  filePath: "config.ts",
  context: { language: "typescript" }
});

if (result.score > 0.7) {
  console.warn(`High risk: ${result.riskLevel}`);
  
  // Create snapshot
  const snapshot = await client.createSnapshot({
    filePath: "config.ts",
    reason: "High-risk code detected",
    source: "mcp"
  });
  
  console.log(`Snapshot: ${snapshot.id}`);
}

// Check stats
const stats = await client.getIterationStats("config.ts");
console.log(`AI edits: ${stats.consecutiveAIEdits}`);
```

## Authentication

**Method**: Bearer token via `Authorization` header

**API Key Formats**:
- Free: (empty or no key)
- Pro: `sb_live_*` (e.g., `sb_live_abc123`)
- Admin: `sb_live_admin_*` (e.g., `sb_live_admin_xyz789`)

**Headers Injected**:
```typescript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {apiKey}"
}
```

## Error Handling

**HTTP Errors**:
```typescript
try {
  const result = await client.analyzeFast(request);
} catch (error) {
  // Error: "API error: 500 Internal Server Error"
  // Error: "API error: 401 Unauthorized"
}
```

**Validation Errors**:
```typescript
// ZodError thrown if response doesn't match schema
// Each method validates response before returning
```

## Response Validation

All public methods validate responses using Zod schemas:
- `AnalysisResponseSchema`
- `IterationStatsSchema`
- `SnapshotResponseSchema`
- `SessionResponseSchema`

If validation fails, a `ZodError` is thrown.

## Initialization

```typescript
// Minimal
const client = new SnapBackAPIClient({
  baseUrl: "https://api.snapback.dev",
  apiKey: "your-api-key"
});

// With environment variables
const client = new SnapBackAPIClient({
  baseUrl: process.env.SNAPBACK_API_URL || "https://api.snapback.dev",
  apiKey: process.env.SNAPBACK_API_KEY
});
```

## Performance Budgets

| Operation | Budget |
|-----------|--------|
| `analyzeFast()` | <200ms |
| `getIterationStats()` | <300ms |
| `createSnapshot()` | <500ms |
| `getCurrentSession()` | <300ms |
| `getSafetyGuidelines()` | <500ms |

## Testing

Test file: `apps/mcp-server/test/client/snapback-api.test.ts`

Run tests:
```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
pnpm test apps/mcp-server
```

Coverage:
- All 5 public methods tested
- Error handling tested
- Response validation tested
- Header injection verified

## Common Patterns

### Safe Checkpoint Flow
```typescript
// 1. Analyze for risk
const analysis = await client.analyzeFast({ code, filePath, context });

// 2. If risky, create snapshot
if (analysis.score > 0.7) {
  const snapshot = await client.createSnapshot({
    filePath,
    reason: "Pre-risky-change checkpoint",
    source: "mcp"
  });
}

// 3. Check iteration stats
const stats = await client.getIterationStats(filePath);
if (stats.consecutiveAIEdits > 5) {
  console.log(stats.recommendation);
}
```

### High-Risk Detection
```typescript
const result = await client.analyzeFast(request);

if (result.riskLevel === "critical") {
  // Block change
} else if (result.riskLevel === "high") {
  // Warn user
} else {
  // Allow change
}
```

### Session Monitoring
```typescript
const session = await client.getCurrentSession();

if (session.riskLevel === "high") {
  // Ask for manual review
}

if (session.consecutiveAIEdits > 10) {
  // Recommend break
}
```

## Integration Points

### MCP Server
Used in `apps/mcp-server/src/index.ts` for API-first risk analysis:
```typescript
import { SnapBackAPIClient } from "./client/snapback-api.js";

const apiClient = new SnapBackAPIClient({
  baseUrl: process.env.SNAPBACK_API_URL || "https://api.snapback.dev",
  apiKey: process.env.SNAPBACK_API_KEY
});
```

### Future: AnalysisRouter
Will provide tier-based routing:
- Free tier: Local Guardian Lite
- Pro tier: Remote API via SnapBackAPIClient

## Environment Variables

```env
# API Configuration
SNAPBACK_API_URL=https://api.snapback.dev
SNAPBACK_API_KEY=sk_...

# Testing
SNAPBACK_NO_NETWORK=true|false
```

## Related Documentation

- [Full API Documentation](./SnapBackAPIClient.md)
- [MCP Server Documentation](../../apps/mcp-server/CLAUDE.md)
- [Authentication Documentation](../../apps/mcp-server/src/auth.ts)
