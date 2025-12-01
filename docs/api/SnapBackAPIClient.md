# SnapBack API Client Documentation

## Overview
The `SnapBackAPIClient` is a TypeScript HTTP client that communicates with the SnapBack backend API. It provides methods for code analysis, snapshot management, session tracking, and safety guideline retrieval. The client is located at:

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/client/snapback-api.ts`

---

## Configuration

### SnapBackConfig Interface
```typescript
export interface SnapBackConfig {
	baseUrl: string;      // API base URL (e.g., "https://api.snapback.dev")
	apiKey: string;       // Bearer token for API authentication
}
```

### Constructor
```typescript
constructor(config: SnapBackConfig)
```

**Parameters**:
- `config`: Configuration object containing `baseUrl` and `apiKey`

**Usage**:
```typescript
const client = new SnapBackAPIClient({
	baseUrl: "https://api.snapback.dev",
	apiKey: "test-api-key"
});
```

---

## API Methods

### 1. analyzeFast()

**Signature**:
```typescript
async analyzeFast(request: AnalysisRequest): Promise<AnalysisResponse>
```

**Request Type**:
```typescript
export interface AnalysisRequest {
	code: string;                    // Code to analyze
	filePath: string;                // Path to the file
	context?: {
		surroundingCode?: string;    // Additional context
		projectType?: string;        // Project type (e.g., "node", "react")
		language?: string;           // Programming language
	};
}
```

**Response Type**:
```typescript
export interface AnalysisResponse {
	riskLevel: string;               // Risk level: "safe" | "low" | "medium" | "high" | "critical"
	score: number;                   // Risk score (0-1 range)
	factors: string[];               // Factors contributing to risk (e.g., ["large insertion", "complex logic"])
	analysisTimeMs: number;          // Analysis execution time in milliseconds
	issues: Array<{
		severity: string;            // Issue severity: "low" | "medium" | "high" | "critical"
		message: string;             // Human-readable issue description
		line?: number;               // Optional: line number where issue detected
		column?: number;             // Optional: column number where issue detected
	}>;
}
```

**Endpoint**: `POST /api/analyze/fast`

**Usage**:
```typescript
const result = await client.analyzeFast({
	code: "function test() { return 'test'; }",
	filePath: "test.js",
	context: {
		projectType: "node",
		language: "javascript"
	}
});

console.log(result.riskLevel);        // "medium"
console.log(result.score);             // 0.75
console.log(result.issues);            // Array of detected issues
```

**Performance Budget**: <200ms

**Error Handling**:
```typescript
try {
	const result = await client.analyzeFast(request);
} catch (error) {
	// Throws: Error with message format "API error: {status} {statusText}"
	// Example: "API error: 500 Internal Server Error"
}
```

---

### 2. getIterationStats()

**Signature**:
```typescript
async getIterationStats(filePath: string): Promise<IterationStats>
```

**Return Type**:
```typescript
export interface IterationStats {
	consecutiveAIEdits: number;      // Number of consecutive AI edits
	riskLevel: string;               // Aggregated risk level
	velocity: number;                // Edit velocity metric
	recommendation: string;          // Recommendation message
}
```

**Endpoint**: `GET /api/session/iteration-stats?filePath={filePath}`

**Usage**:
```typescript
const stats = await client.getIterationStats("test.js");

console.log(stats.consecutiveAIEdits);  // 3
console.log(stats.riskLevel);           // "medium"
console.log(stats.recommendation);      // "Consider manual review"
```

**Error Handling**:
```typescript
try {
	const stats = await client.getIterationStats(filePath);
} catch (error) {
	// Throws Error with API error message
}
```

---

### 3. createSnapshot()

**Signature**:
```typescript
async createSnapshot(request: SnapshotRequest): Promise<SnapshotResponse>
```

**Request Type**:
```typescript
export interface SnapshotRequest {
	filePath: string;               // Path to file to snapshot
	reason?: string;                // Optional: reason for snapshot
	source: string;                 // Source identifier (e.g., "mcp", "vscode")
}
```

**Response Type**:
```typescript
export interface SnapshotResponse {
	id: string;                     // Snapshot ID
	timestamp: number;              // Creation timestamp (ms since epoch)
	meta: Record<string, any>;      // Metadata object
}
```

**Endpoint**: `POST /api/snapshots/create`

**Usage**:
```typescript
const snapshot = await client.createSnapshot({
	filePath: "test.js",
	reason: "Manual snapshot via MCP",
	source: "mcp"
});

console.log(snapshot.id);           // "snap-123"
console.log(snapshot.timestamp);    // 1234567890
```

**Error Handling**:
```typescript
try {
	const snapshot = await client.createSnapshot(request);
} catch (error) {
	// Throws Error with API error message
}
```

---

### 4. getCurrentSession()

**Signature**:
```typescript
async getCurrentSession(): Promise<SessionResponse>
```

**Return Type**:
```typescript
export interface SessionResponse {
	consecutiveAIEdits: number;     // AI edits in current session
	lastEditTimestamp: number;      // Timestamp of last edit (ms)
	filePath: string;               // File being edited
	riskLevel: string;              // Current session risk level
}
```

**Endpoint**: `GET /api/session/current`

**Usage**:
```typescript
const session = await client.getCurrentSession();

console.log(session.consecutiveAIEdits);  // 2
console.log(session.riskLevel);           // "low"
console.log(session.lastEditTimestamp);   // 1234567890
```

**Error Handling**:
```typescript
try {
	const session = await client.getCurrentSession();
} catch (error) {
	// Throws Error with API error message
}
```

---

### 5. getSafetyGuidelines()

**Signature**:
```typescript
async getSafetyGuidelines(): Promise<string>
```

**Return Type**: Plain text string containing safety guidelines

**Endpoint**: `GET /api/guidelines/safety`

**Usage**:
```typescript
const guidelines = await client.getSafetyGuidelines();

console.log(guidelines);  // "Safety guidelines content..."
```

**Error Handling**:
```typescript
try {
	const guidelines = await client.getSafetyGuidelines();
} catch (error) {
	// Throws Error with API error message
}
```

---

## Internal Methods

### fetchAPI()

**Signature** (Private):
```typescript
private async fetchAPI<T>(
	endpoint: string,
	options?: RequestInit
): Promise<T>
```

**Description**:
Generic HTTP fetch wrapper that:
1. Constructs full URL from baseUrl + endpoint
2. Adds authentication headers (Bearer token)
3. Handles JSON serialization/deserialization
4. Throws on HTTP errors (non-2xx status codes)

**Features**:
- Automatic Bearer token injection
- JSON content-type header
- HTTP error handling
- Generic type support for responses

**Error Handling**:
```typescript
if (!response.ok) {
	throw new Error(`API error: ${response.status} ${response.statusText}`);
}
```

---

## Request/Response Validation

All responses are validated using **Zod schemas** before being returned to the caller:

```typescript
// AnalysisResponse validation
const AnalysisResponseSchema = z.object({
	riskLevel: z.string(),
	score: z.number(),
	factors: z.array(z.string()),
	analysisTimeMs: z.number(),
	issues: z.array(z.object({
		severity: z.string(),
		message: z.string(),
		line: z.number().optional(),
		column: z.number().optional(),
	})),
});

// Used in analyzeFast():
return AnalysisResponseSchema.parse(response);
```

**Validation Schemas**:
1. `AnalysisResponseSchema` - Validates analyze/fast responses
2. `IterationStatsSchema` - Validates iteration stats responses
3. `SnapshotResponseSchema` - Validates snapshot creation responses
4. `SessionResponseSchema` - Validates session responses

---

## Error Types

The client throws standard JavaScript `Error` objects with the following message formats:

### HTTP Errors
```
"API error: 500 Internal Server Error"
"API error: 404 Not Found"
"API error: 401 Unauthorized"
```

### Validation Errors
Zod validation errors thrown when API responses don't match expected schema:
```
ZodError: {
	issues: [
		{
			code: "invalid_type",
			expected: "number",
			received: "string",
			path: ["score"],
			message: "Expected number, received string"
		}
	]
}
```

---

## Authentication

The client uses **Bearer token authentication** via the `Authorization` header:

```typescript
headers: {
	"Authorization": `Bearer ${config.apiKey}`
}
```

**API Key Formats** (from auth.ts):
- **Free tier**: No API key / empty string
- **Pro tier**: Starts with `sb_live_` (e.g., `sb_live_abc123`)
- **Admin tier**: Starts with `sb_live_admin_` (e.g., `sb_live_admin_xyz789`)

---

## Performance Characteristics

| Operation | Target Budget | Typical Performance |
|-----------|---------------|-------------------|
| `analyzeFast()` | <200ms | 45-150ms |
| `getIterationStats()` | <300ms | 50-200ms |
| `createSnapshot()` | <500ms | 100-300ms |
| `getCurrentSession()` | <300ms | 50-200ms |
| `getSafetyGuidelines()` | <500ms | 100-400ms |

---

## Usage in MCP Server

The client is instantiated in the MCP server (apps/mcp-server/src/index.ts) as part of the **API-first architecture**:

```typescript
import { SnapBackAPIClient } from "./client/snapback-api.js";

const apiClient = new SnapBackAPIClient({
	baseUrl: process.env.SNAPBACK_API_URL || "https://api.snapback.dev",
	apiKey: process.env.SNAPBACK_API_KEY
});
```

**Architectural Notes**:
- **Purpose**: Centralized analysis engine for consistency across all clients
- **Benefits**: Feature flags, circuit breaker support, centralized updates
- **Alternative**: Future `AnalysisRouter` will support tier-based routing (local Guardian Lite for Free, API for Pro)

---

## Integration Points

### AnalysisRouter (Planned)
The client will be integrated with a **AnalysisRouter** (see `AnalysisRouter.IMPLEMENTATION.ts`) that:
1. Routes requests to local Guardian Lite or remote API based on feature flags
2. Provides circuit breaker fallback if API is unavailable
3. Maps API responses to Guardian Lite format
4. Handles tier-based access control

### With Better Auth
API keys are validated using the `authenticate()` function from auth.ts, which:
- Caches results for 1 minute
- Maps keys to user tiers (free/pro/admin)
- Returns user context (userId, organizationId)

---

## Testing

Comprehensive unit tests are located at:
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/test/client/snapback-api.test.ts`

**Test Coverage**:
- ✅ analyzeFast() endpoint and parameter validation
- ✅ getIterationStats() query parameter encoding
- ✅ createSnapshot() request body validation
- ✅ getCurrentSession() endpoint
- ✅ getSafetyGuidelines() text response handling
- ✅ HTTP error handling (500, 401, etc.)
- ✅ Authorization header injection
- ✅ Response validation via Zod schemas

**Run Tests**:
```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
pnpm test apps/mcp-server
```

---

## Environment Variables

The client respects these environment variables:

```env
# API Configuration
SNAPBACK_API_URL=https://api.snapback.dev     # Base URL for API requests
SNAPBACK_API_KEY=sk_...                        # Server API key

# Feature Flags
SNAPBACK_NO_NETWORK=true|false                 # Use mock auth (testing)

# Backend
SNAPBACK_BACKEND_URL=https://backend.dev       # Backend service URL
```

---

## Example: Complete Usage Flow

```typescript
import { SnapBackAPIClient } from "@snapback/mcp-server/client/snapback-api";

// 1. Initialize client
const client = new SnapBackAPIClient({
	baseUrl: "https://api.snapback.dev",
	apiKey: process.env.SNAPBACK_API_KEY
});

// 2. Analyze code
const analysisResult = await client.analyzeFast({
	code: "const SECRET = 'aws_key_12345';",
	filePath: "config.ts",
	context: {
		projectType: "node",
		language: "typescript"
	}
});

if (analysisResult.score > 0.7) {
	console.warn(`High risk detected: ${analysisResult.riskLevel}`);
	
	// 3. Create snapshot before changes
	const snapshot = await client.createSnapshot({
		filePath: "config.ts",
		reason: "High-risk code detected, creating safe point",
		source: "mcp"
	});
	
	console.log(`Snapshot created: ${snapshot.id}`);
}

// 4. Check iteration stats
const stats = await client.getIterationStats("config.ts");
if (stats.consecutiveAIEdits > 5) {
	console.log(`Recommendation: ${stats.recommendation}`);
}
```

---

## Summary

The `SnapBackAPIClient` provides:
- **5 public API methods** for risk analysis, snapshot management, and session tracking
- **Zod-based validation** for all responses
- **Bearer token authentication** with tier-based access control
- **Generic HTTP layer** with JSON serialization and error handling
- **Performance budgets** for each operation
- **Full test coverage** with mocked HTTP layer

It serves as the bridge between the MCP server and the SnapBack backend API, enabling safe AI-assisted code changes through intelligent risk detection and snapshot management.
