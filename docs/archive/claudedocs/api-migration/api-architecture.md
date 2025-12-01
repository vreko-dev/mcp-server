# SnapBack API Architecture: Privacy-First Centralized Processing

## Executive Summary

This document outlines the comprehensive architecture for migrating processing capabilities from client-side implementations (VS Code extension, MCP server, CLI) to a centralized API service while maintaining SnapBack's core principle: **privacy-first, local-first operation with optional cloud enhancement**.

**Core Design Principles:**

-   **Privacy by Design**: Only file metadata crosses the wire, never file contents
-   **Local-First**: All core features work offline without API
-   **Opt-In Enhancement**: API provides value-add features for users who choose to enable it
-   **Zero-Trust Architecture**: API cannot reconstruct source code from metadata alone

---

## 1. Current State Analysis

### 1.1 Capability Classification

After analyzing the codebase, here's the capability distribution:

#### **MUST Stay Local (Privacy-Sensitive)**

```typescript
// File content access and manipulation
- File reading/writing operations (all clients)
- Checkpoint creation with file contents (FileSystemStorage)
- File system monitoring (WorkspaceMemoryManager)
- Editor integration (VS Code decorations, status bar)
- Local git operations (GitIntegration)
- AST parsing of source code (Guardian.analyzeWithAST)
- File content threat detection (Guardian, ThreatDetection)
```

**Rationale**: These operations require direct file access and contain sensitive source code. Moving to API would violate privacy principles.

#### **CAN Move to API (Metadata-Only)**

```typescript
// Aggregation and analytics (metadata-based)
- Risk score aggregation across workspace
- Change velocity trending
- Pattern-based checkpoint triggers
- Dependency graph analysis (metadata only)
- Statistical anomaly detection
- Workspace-wide risk reporting
- Historical risk trend analysis
- Checkpoint recommendation intelligence

// Enhanced features (opt-in value-adds)
- Cross-workspace pattern recognition
- Team-wide risk benchmarking
- Advanced ML-based risk prediction
- Compliance reporting
- Audit log aggregation
```

**Rationale**: These operations work on metadata (file paths, sizes, timestamps, risk scores) without needing file contents.

#### **SHOULD Stay Local (Core Features)**

```typescript
// Essential operations that must work offline
- Basic risk analysis (Guardian.quickCheckDoc)
- Checkpoint creation (FileSystemStorage.create)
- Checkpoint listing (FileSystemStorage.list)
- File protection status (WorkspaceMemoryManager)
- Notification management (NotificationManager)
- Operation coordination (OperationCoordinator)
```

**Rationale**: Core functionality must remain available without network connectivity.

### 1.2 Current Client Architecture

**VS Code Extension** (`apps/vscode/`):

-   **Entry Point**: `src/extension.ts` (activate/deactivate lifecycle)
-   **Core Services**:
    -   `OperationCoordinator` - Multi-step workflow orchestration
    -   `WorkspaceMemoryManager` - Persistent state management
    -   `NotificationManager` - User feedback system
-   **Processing**:
    -   Local file monitoring
    -   Risk analysis coordination
    -   Checkpoint creation workflow
    -   UI state management

**MCP Server** (`apps/mcp-server/`):

-   **Entry Point**: `src/index.ts` (MCP protocol handler)
-   **Exposed Tools**:
    -   `snapback.analyze_risk` - Risk analysis from diff changes
    -   `snapback.check_dependencies` - Dependency diff analysis
    -   `snapback.create_checkpoint` - Checkpoint creation
    -   `snapback.list_checkpoints` - Checkpoint retrieval
-   **Processing**: Wraps `@snapback/core` services via MCP protocol

**CLI** (`apps/cli/`):

-   **Entry Point**: `src/index.ts` (Commander CLI)
-   **Commands**:
    -   `analyze <file>` - File risk analysis
    -   `checkpoint` - Create checkpoint
    -   `list` - List checkpoints
    -   `interactive` - Guided workflows
-   **Processing**: Direct usage of `@snapback/core` services

**Shared Packages**:

-   `@snapback/core` - Risk analysis, threat detection, MCP federation
-   `@snapback/storage` - Checkpoint persistence (file system)
-   `@snapback/contracts` - TypeScript types and Zod schemas
-   `@snapback/telemetry` - Event tracking

---

## 2. API Architecture Design

### 2.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   VS Code    │  │  MCP Server  │  │     CLI      │             │
│  │  Extension   │  │              │  │              │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                           │                                         │
│                  ┌────────▼────────┐                                │
│                  │  @snapback/sdk  │ ◄──── New Client SDK          │
│                  │  (API Client)   │                                │
│                  └────────┬────────┘                                │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │   PRIVACY LAYER    │
                  │  Metadata Gateway  │ ◄──── Strips file contents
                  └─────────┬──────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                         API LAYER                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     API Gateway                              │  │
│  │  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │ Auth/AuthZ    │  │ Rate Limiting│  │  Request Cache   │  │  │
│  │  │ (JWT/API Key) │  │              │  │                  │  │  │
│  │  └───────────────┘  └──────────────┘  └──────────────────┘  │  │
│  └─────────────────────────────┬──────────────────────────────────┘│
│                                │                                   │
│  ┌─────────────────────────────▼──────────────────────────────┐  │
│  │                    Service Layer                            │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │  Analytics API   │  │  Intelligence API │               │  │
│  │  │  - Aggregation   │  │  - ML Predictions │               │  │
│  │  │  - Trending      │  │  - Recommendations│               │  │
│  │  │  - Reporting     │  │  - Anomaly Detect │               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │   Metadata API   │  │   Checkpoint API  │               │  │
│  │  │  - Risk Scores   │  │  - Recommendations│               │  │
│  │  │  - File Metrics  │  │  - Scheduling     │               │  │
│  │  │  - Patterns      │  │  - Templates      │               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    Data Layer                                ││
│  │  ┌────────────────┐  ┌─────────────┐  ┌─────────────────┐  ││
│  │  │  Metadata DB   │  │  Analytics  │  │   Event Store   │  ││
│  │  │  (PostgreSQL)  │  │  (TimeSeries│  │   (Kafka/Redis) │  ││
│  │  │                │  │   InfluxDB) │  │                 │  ││
│  │  └────────────────┘  └─────────────┘  └─────────────────┘  ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Privacy Boundary Definition

**What Crosses the Wire (Metadata Only)**:

```typescript
interface FileMetadata {
	// File identification (hashed paths for extra privacy)
	filePathHash: string; // SHA-256 hash of file path
	fileExtension: string; // e.g., ".ts", ".js"

	// Size metrics
	sizeBytes: number; // File size in bytes
	lineCount: number; // Total lines

	// Risk scores (computed locally)
	riskScore: number; // 0-1 normalized score
	riskFactors: string[]; // Generic risk factor names
	severity: "low" | "medium" | "high" | "critical";

	// Complexity metrics (computed locally)
	complexity: number; // 0-1 normalized complexity
	functionCount: number; // Number of functions detected
	nestingDepth: number; // Maximum nesting level

	// Timestamps
	timestamp: number; // When analysis occurred
	lastModified: number; // File modification time

	// Context (minimal)
	workspaceId: string; // Unique workspace identifier (user-controlled)
	checkpointId?: string; // Associated checkpoint reference
}

interface CheckpointMetadata {
	id: string; // Client-generated checkpoint ID
	timestamp: number; // Creation timestamp
	trigger: string; // What triggered creation
	fileCount: number; // Number of files in checkpoint
	totalSize: number; // Total checkpoint size
	riskScoreAvg: number; // Average risk across files
	workspaceId: string; // Workspace identifier
}

interface WorkspaceMetadata {
	workspaceId: string; // User-controlled identifier
	fileCount: number; // Total files monitored
	totalSize: number; // Total workspace size
	languageDistribution: Record<string, number>; // Extension counts
	lastActivity: number; // Last workspace activity
}
```

**What NEVER Crosses the Wire**:

```typescript
// ❌ FORBIDDEN in API requests
- File contents (source code)
- File paths (only hashes)
- Function/variable names
- Comments or documentation
- String literals or constants
- Any reconstructable source code
```

### 2.3 API Endpoint Specification

#### **Authentication & Authorization**

```
POST /v1/auth/register
  Request:  { email: string, password: string }
  Response: { userId: string, apiKey: string }

POST /v1/auth/login
  Request:  { email: string, password: string }
  Response: { accessToken: string (JWT), refreshToken: string }

POST /v1/auth/refresh
  Request:  { refreshToken: string }
  Response: { accessToken: string }

GET /v1/auth/keys
  Headers:  Authorization: Bearer <token>
  Response: { keys: Array<{ id: string, name: string, createdAt: number }> }

POST /v1/auth/keys
  Headers:  Authorization: Bearer <token>
  Request:  { name: string, scopes: string[] }
  Response: { apiKey: string, id: string }
```

#### **Metadata Ingestion**

```
POST /v1/metadata/files/batch
  Headers:  Authorization: Bearer <token> | X-API-Key: <key>
  Request:  {
    workspaceId: string,
    files: FileMetadata[]
  }
  Response: {
    accepted: number,
    rejected: number,
    errors: Array<{ index: number, reason: string }>
  }

POST /v1/metadata/checkpoints
  Headers:  Authorization: Bearer <token> | X-API-Key: <key>
  Request:  CheckpointMetadata
  Response: {
    id: string,
    recommendation?: string,
    nextCheckpointAt?: number
  }
```

#### **Analytics & Intelligence**

```
GET /v1/analytics/risk-trends
  Headers:  Authorization: Bearer <token> | X-API-Key: <key>
  Query:    workspaceId, startDate, endDate, granularity
  Response: {
    dataPoints: Array<{
      timestamp: number,
      avgRiskScore: number,
      maxRiskScore: number,
      fileCount: number
    }>
  }

GET /v1/analytics/patterns
  Headers:  Authorization: Bearer <token> | X-API-Key: <key>
  Query:    workspaceId, lookbackDays
  Response: {
    patterns: Array<{
      type: string,
      confidence: number,
      description: string,
      recommendation: string
    }>
  }

GET /v1/intelligence/recommendations
  Headers:  Authorization: Bearer <token> | X-API-Key: <key>
  Query:    workspaceId
  Response: {
    checkpointRecommendations: Array<{
      reason: string,
      urgency: 'low' | 'medium' | 'high',
      fileCount: number
    }>,
    riskMitigation: Array<{
      pattern: string,
      suggestion: string
    }>
  }

POST /v1/intelligence/predict-risk
  Headers:  Authorization: Bearer <token> | X-API-Key: <key>
  Request:  {
    workspaceId: string,
    fileMetadata: FileMetadata[]
  }
  Response: {
    predictions: Array<{
      filePathHash: string,
      predictedRisk: number,
      confidence: number,
      factors: string[]
    }>
  }
```

#### **Workspace Management**

```
GET /v1/workspaces
  Headers:  Authorization: Bearer <token>
  Response: {
    workspaces: Array<{
      id: string,
      name: string,
      createdAt: number,
      fileCount: number,
      lastActivity: number
    }>
  }

POST /v1/workspaces
  Headers:  Authorization: Bearer <token>
  Request:  { name: string }
  Response: { id: string, apiKey: string }

GET /v1/workspaces/:workspaceId/summary
  Headers:  Authorization: Bearer <token> | X-API-Key: <key>
  Response: {
    fileCount: number,
    totalSize: number,
    avgRiskScore: number,
    checkpointCount: number,
    lastCheckpoint: number,
    riskDistribution: {
      low: number,
      medium: number,
      high: number,
      critical: number
    }
  }
```

### 2.4 Authentication & Authorization Design

#### **API Key Strategy**

```typescript
// Two-tier authentication model
interface AuthModel {
	// Tier 1: User Authentication (OAuth2/JWT)
	userAuth: {
		provider: "email" | "github" | "google";
		scopes: ["read", "write", "admin"];
		sessionDuration: "24h";
	};

	// Tier 2: API Key (Workspace-specific)
	apiKey: {
		format: "sb_<workspace>_<random_32_chars>";
		scopes: ["metadata.write", "analytics.read", "intelligence.read"];
		rateLimit: {
			tier: "free" | "pro" | "enterprise";
			requestsPerMinute: 60 | 600 | 6000;
		};
	};
}
```

#### **Rate Limiting**

```typescript
interface RateLimitConfig {
	free: {
		requestsPerMinute: 60;
		requestsPerDay: 10000;
		burstSize: 10;
	};
	pro: {
		requestsPerMinute: 600;
		requestsPerDay: 100000;
		burstSize: 50;
	};
	enterprise: {
		requestsPerMinute: 6000;
		requestsPerDay: 1000000;
		burstSize: 200;
	};
}
```

#### **Privacy Opt-In Flow**

```typescript
// Client-side opt-in configuration
interface SnapBackConfig {
	api: {
		enabled: boolean; // Master kill switch
		endpoint: string; // API endpoint URL
		apiKey: string; // Workspace API key

		// Granular feature toggles
		features: {
			analytics: boolean; // Send metadata for trending
			intelligence: boolean; // Receive ML predictions
			recommendations: boolean; // Get smart suggestions
			telemetry: boolean; // Anonymous usage stats
		};

		// Privacy controls
		privacy: {
			hashFilePaths: boolean; // Hash file paths (default: true)
			anonymizeWorkspace: boolean; // Use anonymous workspace ID
			retentionDays: number; // Data retention (default: 90)
		};
	};
}
```

### 2.5 Caching Strategy

```typescript
interface CacheStrategy {
	// Client-side caching
	client: {
		recommendationsCache: {
			ttl: 300; // 5 minutes
			invalidateOn: ["checkpoint.created", "file.analyzed"];
		};
		trendCache: {
			ttl: 3600; // 1 hour
			invalidateOn: ["day.changed"];
		};
	};

	// API-side caching
	api: {
		workspaceSummary: {
			ttl: 60; // 1 minute
			invalidateOn: ["metadata.ingested"];
		};
		analyticsQuery: {
			ttl: 1800; // 30 minutes
			invalidateOn: ["hourly.aggregate"];
		};
		predictions: {
			ttl: 300; // 5 minutes
			invalidateOn: ["model.updated"];
		};
	};
}
```

---

## 3. Client-API Contract

### 3.1 Metadata Payload Structure

```typescript
// Outbound: Client → API
interface MetadataBatchRequest {
	workspaceId: string;
	files: Array<{
		filePathHash: string; // SHA-256(workspaceId + filePath)
		fileExtension: string;
		sizeBytes: number;
		lineCount: number;

		// Risk analysis (computed locally)
		risk: {
			score: number; // 0-1 normalized
			factors: string[]; // Generic factor names only
			severity: "low" | "medium" | "high" | "critical";
		};

		// Complexity metrics (computed locally)
		complexity: {
			score: number; // 0-1 normalized
			functionCount: number;
			nestingDepth: number;
			cyclomaticComplexity: number;
		};

		// Temporal data
		timestamp: number; // Analysis timestamp
		lastModified: number; // File modification time

		// Optional context
		context?: {
			checkpointId?: string; // Associated checkpoint
			gitBranch?: string; // Current branch (hashed)
			gitCommit?: string; // Commit SHA (partial)
		};
	}>;

	// Batch metadata
	batchId: string; // Client-generated batch ID
	batchTimestamp: number;
}

// Inbound: API → Client
interface AnalyticsResponse {
	workspaceId: string;

	// Risk insights
	riskInsights: {
		currentAvgRisk: number;
		trendDirection: "increasing" | "decreasing" | "stable";
		percentileRank: number; // Compared to similar workspaces
		hotspots: Array<{
			filePathHash: string;
			riskScore: number;
			recommendation: string;
		}>;
	};

	// Checkpoint recommendations
	checkpointRecommendations: {
		shouldCreateCheckpoint: boolean;
		reason: string;
		urgency: "low" | "medium" | "high";
		suggestedTiming: "now" | "1h" | "4h" | "24h";
	};

	// Pattern recognition
	patterns: Array<{
		type:
			| "high_velocity"
			| "large_changes"
			| "sensitive_files"
			| "dependency_thrash";
		confidence: number;
		description: string;
		mitigation: string;
	}>;

	// Predictive intelligence
	predictions?: Array<{
		filePathHash: string;
		predictedRisk: number;
		confidence: number;
		reasoning: string[];
	}>;
}
```

### 3.2 Error Handling Patterns

```typescript
interface APIError {
	code: string;
	message: string;
	retryable: boolean;
	retryAfter?: number; // Seconds to wait before retry
}

// Standard error codes
enum ErrorCode {
	// Authentication
	INVALID_API_KEY = "E_AUTH_001",
	EXPIRED_TOKEN = "E_AUTH_002",
	INSUFFICIENT_PERMISSIONS = "E_AUTH_003",

	// Rate limiting
	RATE_LIMIT_EXCEEDED = "E_RATE_001",
	QUOTA_EXCEEDED = "E_RATE_002",

	// Validation
	INVALID_PAYLOAD = "E_VALID_001",
	INVALID_WORKSPACE = "E_VALID_002",

	// Server
	INTERNAL_ERROR = "E_SRV_001",
	SERVICE_UNAVAILABLE = "E_SRV_002",
}

// Client-side error handling
class APIClient {
	async sendMetadata(data: MetadataBatchRequest): Promise<AnalyticsResponse> {
		try {
			const response = await this.request(
				"/v1/metadata/files/batch",
				data
			);
			return response;
		} catch (error) {
			if (error.code === ErrorCode.RATE_LIMIT_EXCEEDED) {
				// Exponential backoff with jitter
				await this.backoff(error.retryAfter);
				return this.sendMetadata(data); // Retry
			}

			if (error.code === ErrorCode.INVALID_API_KEY) {
				// Disable API and fall back to local-only
				this.disableAPI();
				throw new Error(
					"API authentication failed. Falling back to local mode."
				);
			}

			// For all other errors, continue with local-only operation
			console.warn(
				"API request failed, continuing with local analysis:",
				error
			);
			return this.fallbackToLocal(data);
		}
	}
}
```

### 3.3 Offline/Degraded Mode Behavior

```typescript
interface FeatureAvailability {
	// Core features (always available)
	core: {
		localRiskAnalysis: "always"; // Never requires API
		checkpointCreation: "always";
		fileProtection: "always";
		basicNotifications: "always";
	};

	// Enhanced features (API-dependent)
	enhanced: {
		riskTrending: "api_optional"; // Works offline with cached data
		recommendations: "api_optional"; // Falls back to local heuristics
		predictions: "api_required"; // Only available with API
		crossWorkspace: "api_required"; // Only available with API
		teamBenchmarking: "api_required"; // Only available with API
	};
}

// Client behavior when API unavailable
class DegradedModeHandler {
	async handleAPIUnavailable() {
		// 1. Switch to local-only mode
		this.config.api.enabled = false;

		// 2. Show user notification (once)
		this.notifyUser({
			type: "warning",
			message: "SnapBack API unavailable. Running in local-only mode.",
			actions: ["Retry", "Dismiss", "Settings"],
		});

		// 3. Use cached analytics if available
		const cachedAnalytics = await this.cache.get("last_analytics");
		if (cachedAnalytics && this.isFresh(cachedAnalytics, 3600)) {
			return cachedAnalytics; // Use cache if < 1 hour old
		}

		// 4. Fall back to local heuristics
		return this.localFallback.generateRecommendations();
	}
}
```

---

## 4. Migration Strategy

### 4.1 Phased Extraction Approach

#### **Phase 1: Infrastructure & SDK (Weeks 1-3)**

**Goals:**

-   Create API service infrastructure
-   Build client SDK
-   Establish privacy contracts

**Deliverables:**

```
apps/
  api/                           # New API service
    src/
      server.ts                  # Express/Fastify server
      routes/
        auth.ts
        metadata.ts
        analytics.ts
      middleware/
        auth.ts
        ratelimit.ts
        privacy.ts               # Privacy validator
      services/
        analytics-service.ts
        intelligence-service.ts
      models/
        metadata-model.ts
        workspace-model.ts
    Dockerfile
    docker-compose.yml

packages/
  sdk/                           # New client SDK
    src/
      client.ts                  # API client
      privacy.ts                 # Metadata hasher/sanitizer
      cache.ts                   # Client-side cache
      types.ts                   # Shared types
    README.md
```

**Migration:**

1. Create `apps/api` service with basic auth endpoints
2. Create `packages/sdk` with API client
3. Add privacy validation middleware to API
4. Implement metadata ingestion endpoints
5. Set up PostgreSQL + TimescaleDB for storage

**Validation:**

-   ✅ API accepts only metadata (validation tests)
-   ✅ Privacy validator rejects payloads with file contents
-   ✅ SDK successfully sends metadata batches
-   ✅ Authentication flow works end-to-end

#### **Phase 2: Analytics Migration (Weeks 4-6)**

**Goals:**

-   Migrate risk trending to API
-   Implement pattern recognition
-   Build analytics dashboard

**Deliverables:**

```
apps/api/src/
  services/
    analytics-service.ts         # Risk trending, aggregation
    pattern-service.ts           # Pattern recognition
  jobs/
    hourly-aggregate.ts          # Background aggregation
    daily-cleanup.ts             # Data retention

packages/sdk/src/
  analytics-client.ts            # Analytics API wrapper

apps/vscode/src/
  analyticsView.ts               # New analytics view
```

**Migration:**

1. Move risk aggregation logic from clients to API
2. Implement time-series analytics in API
3. Create background jobs for aggregation
4. Update VS Code extension to call analytics API
5. Implement analytics caching in SDK

**Validation:**

-   ✅ Risk trending data matches local calculations
-   ✅ Pattern recognition identifies known patterns
-   ✅ Analytics work offline with cached data
-   ✅ Background jobs complete successfully

#### **Phase 3: Intelligence Layer (Weeks 7-10)**

**Goals:**

-   Add ML-based risk prediction
-   Implement smart recommendations
-   Build checkpoint intelligence

**Deliverables:**

```
apps/api/src/
  services/
    ml-service.ts                # ML model inference
    recommendation-service.ts    # Smart recommendations
  models/
    risk-predictor/              # Trained ML model
      model.pkl
      features.json

packages/sdk/src/
  intelligence-client.ts         # Intelligence API wrapper

apps/vscode/src/
  smartRecommendations.ts        # Enhanced recommendations view
```

**Migration:**

1. Train ML model on metadata patterns
2. Implement prediction service in API
3. Create recommendation engine
4. Update clients to request predictions
5. A/B test predictions vs local heuristics

**Validation:**

-   ✅ Predictions have >70% accuracy
-   ✅ Recommendations reduce false positives
-   ✅ Intelligence gracefully degrades when offline
-   ✅ Model retraining pipeline works

#### **Phase 4: Client Refactoring (Weeks 11-14)**

**Goals:**

-   Refactor clients to use SDK
-   Implement opt-in flow
-   Clean up duplicate code

**Deliverables:**

```
apps/vscode/src/
  config/
    api-config.ts                # API configuration UI
  services/
    api-service.ts               # SDK integration

apps/mcp-server/src/
  tools/
    analytics-tool.ts            # Analytics MCP tool

apps/cli/src/
  commands/
    analytics.ts                 # Analytics CLI command
    config.ts                    # API configuration
```

**Migration:**

1. Add API configuration UI to VS Code extension
2. Implement opt-in flow with privacy notice
3. Refactor clients to use `@snapback/sdk`
4. Remove duplicate analytics code from clients
5. Add API status indicators to all UIs

**Validation:**

-   ✅ Opt-in flow clearly explains privacy model
-   ✅ All clients can toggle API on/off
-   ✅ Code duplication reduced by >50%
-   ✅ API calls properly cached and rate-limited

### 4.2 Backward Compatibility

```typescript
// Versioned API ensures compatibility
interface APIVersioning {
	// URL-based versioning
	v1: {
		routes: "/v1/*";
		deprecationDate: null;
		status: "stable";
	};

	// SDK versioning
	sdk: {
		minVersion: "1.0.0";
		recommendedVersion: "1.2.0";
		compatibility: {
			"1.0.x": ["v1"];
			"1.1.x": ["v1"];
			"1.2.x": ["v1", "v2"]; // Multi-version support
		};
	};

	// Client version detection
	clientHeaders: {
		"X-SnapBack-Client": "vscode/0.1.0";
		"X-SnapBack-SDK": "1.2.0";
	};
}

// Graceful migration for breaking changes
class APICompatibility {
	async handleRequest(req: Request): Promise<Response> {
		const clientVersion = this.parseVersion(req.headers["x-snapback-sdk"]);

		// Warn about deprecations
		if (this.isDeprecated(clientVersion)) {
			res.setHeader(
				"X-Deprecation-Warning",
				"Please upgrade to SDK v1.2.0"
			);
		}

		// Transform request for compatibility
		const transformed = this.transformRequest(req, clientVersion);
		return this.processRequest(transformed);
	}
}
```

### 4.3 Feature Parity Validation

```typescript
// Automated testing to ensure feature parity
describe("Feature Parity Tests", () => {
	it("should compute same risk score locally and via API", async () => {
		const fileMetadata = generateTestMetadata();

		// Local calculation
		const localRisk = await localRiskAnalyzer.analyze(fileMetadata);

		// API calculation
		const apiRisk = await apiClient.analyzeRisk(fileMetadata);

		expect(apiRisk.score).toBeCloseTo(localRisk.score, 2);
		expect(apiRisk.severity).toBe(localRisk.severity);
	});

	it("should provide recommendations with and without API", async () => {
		const workspace = generateTestWorkspace();

		// With API
		const apiRecommendations = await apiClient.getRecommendations(
			workspace
		);

		// Without API (local fallback)
		const localRecommendations = await localFallback.getRecommendations(
			workspace
		);

		// Both should provide valid recommendations
		expect(apiRecommendations).toBeDefined();
		expect(localRecommendations).toBeDefined();
		expect(apiRecommendations.length).toBeGreaterThan(0);
		expect(localRecommendations.length).toBeGreaterThan(0);
	});
});
```

### 4.4 Rollback Strategy

```typescript
interface RollbackPlan {
	// Feature flags for gradual rollout
	flags: {
		"api.enabled": boolean;
		"api.analytics": boolean;
		"api.intelligence": boolean;
		"api.recommendations": boolean;
	};

	// Rollback triggers
	triggers: {
		errorRate: {
			threshold: 0.05; // 5% error rate
			action: "disable_api";
		};
		latency: {
			threshold: 5000; // 5 second timeout
			action: "use_cache";
		};
		availability: {
			threshold: 0.99; // 99% uptime
			action: "fallback_local";
		};
	};

	// Automated rollback
	autoRollback: {
		enabled: true;
		cooldownMinutes: 30;
		notifyAdmins: true;
	};
}

// Monitoring and auto-rollback
class APIHealthMonitor {
	async checkHealth(): Promise<void> {
		const metrics = await this.collectMetrics();

		if (
			metrics.errorRate > this.rollbackPlan.triggers.errorRate.threshold
		) {
			await this.executeRollback("high_error_rate");
		}

		if (metrics.p95Latency > this.rollbackPlan.triggers.latency.threshold) {
			await this.executeRollback("high_latency");
		}
	}

	async executeRollback(reason: string): Promise<void> {
		// 1. Disable API features
		await this.featureFlags.set("api.enabled", false);

		// 2. Notify administrators
		await this.notifyAdmins(`API rollback triggered: ${reason}`);

		// 3. Log incident
		await this.logIncident(reason);

		// 4. Switch all clients to local mode
		await this.broadcastConfigUpdate({ api: { enabled: false } });
	}
}
```

---

## 5. Code Organization

### 5.1 Monorepo Structure

```
snapback-minimal/
├── apps/
│   ├── vscode/                  # Existing VS Code extension
│   │   └── src/
│   │       ├── services/
│   │       │   └── api-service.ts        # NEW: SDK integration
│   │       ├── config/
│   │       │   └── api-config.ts         # NEW: API configuration UI
│   │       └── views/
│   │           └── analyticsView.ts      # NEW: Analytics dashboard
│   │
│   ├── mcp-server/              # Existing MCP server
│   │   └── src/
│   │       └── tools/
│   │           └── analytics-tool.ts     # NEW: Analytics MCP tool
│   │
│   ├── cli/                     # Existing CLI
│   │   └── src/
│   │       └── commands/
│   │           ├── analytics.ts          # NEW: Analytics commands
│   │           └── config.ts             # NEW: API configuration
│   │
│   └── api/                     # NEW: API service
│       ├── src/
│       │   ├── server.ts        # Express/Fastify server
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── metadata.ts
│       │   │   ├── analytics.ts
│       │   │   ├── intelligence.ts
│       │   │   └── workspaces.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── ratelimit.ts
│       │   │   ├── privacy.ts  # Privacy validator
│       │   │   └── cache.ts
│       │   ├── services/
│       │   │   ├── analytics-service.ts
│       │   │   ├── intelligence-service.ts
│       │   │   ├── ml-service.ts
│       │   │   └── recommendation-service.ts
│       │   ├── models/
│       │   │   ├── metadata-model.ts
│       │   │   ├── workspace-model.ts
│       │   │   └── user-model.ts
│       │   ├── jobs/
│       │   │   ├── hourly-aggregate.ts
│       │   │   └── daily-cleanup.ts
│       │   └── utils/
│       │       ├── hasher.ts   # File path hashing
│       │       └── validator.ts
│       ├── tests/
│       │   ├── privacy.test.ts # Privacy validation tests
│       │   └── integration/
│       ├── Dockerfile
│       ├── docker-compose.yml
│       └── package.json
│
├── packages/
│   ├── core/                    # Existing core logic
│   │   └── src/
│   │       ├── risk-analyzer.ts # KEEP: Local risk analysis
│   │       ├── guardian.ts      # KEEP: Local threat detection
│   │       └── git-integration.ts # KEEP: Local git ops
│   │
│   ├── storage/                 # Existing storage
│   │   └── src/
│   │       └── adapters/
│   │           └── fs.ts        # KEEP: Local file storage
│   │
│   ├── contracts/               # Existing contracts
│   │   └── src/
│   │       └── schemas.ts       # ENHANCE: Add API schemas
│   │
│   ├── telemetry/               # Existing telemetry
│   │   └── src/
│   │       └── index.ts         # ENHANCE: Add API events
│   │
│   └── sdk/                     # NEW: API client SDK
│       ├── src/
│       │   ├── client.ts        # Main API client
│       │   ├── privacy/
│       │   │   ├── hasher.ts    # File path hashing
│       │   │   ├── sanitizer.ts # Metadata sanitization
│       │   │   └── validator.ts # Privacy validation
│       │   ├── services/
│       │   │   ├── analytics-client.ts
│       │   │   ├── intelligence-client.ts
│       │   │   └── auth-client.ts
│       │   ├── cache/
│       │   │   └── lru-cache.ts # Client-side caching
│       │   ├── types.ts         # API types
│       │   └── config.ts        # SDK configuration
│       ├── tests/
│       │   ├── privacy.test.ts  # Privacy validation tests
│       │   └── client.test.ts
│       └── README.md
│
├── docs/
│   ├── api/
│   │   ├── openapi.yaml         # OpenAPI specification
│   │   ├── authentication.md
│   │   └── privacy-model.md
│   └── migration/
│       ├── phase-1.md
│       ├── phase-2.md
│       └── rollback-guide.md
│
└── scripts/
    ├── generate-api-key.ts
    └── migrate-to-api.ts
```

### 5.2 Shared Types Package

```typescript
// packages/contracts/src/api-schemas.ts

import { z } from "zod";

// Privacy-safe file metadata
export const FileMetadataSchema = z.object({
	filePathHash: z.string().regex(/^[a-f0-9]{64}$/), // SHA-256 hash
	fileExtension: z.string(),
	sizeBytes: z.number().int().positive(),
	lineCount: z.number().int().nonnegative(),

	risk: z.object({
		score: z.number().min(0).max(1),
		factors: z.array(z.string()),
		severity: z.enum(["low", "medium", "high", "critical"]),
	}),

	complexity: z.object({
		score: z.number().min(0).max(1),
		functionCount: z.number().int().nonnegative(),
		nestingDepth: z.number().int().nonnegative(),
		cyclomaticComplexity: z.number().int().nonnegative(),
	}),

	timestamp: z.number().int().positive(),
	lastModified: z.number().int().positive(),

	context: z
		.object({
			checkpointId: z.string().optional(),
			gitBranch: z.string().optional(),
			gitCommit: z.string().optional(),
		})
		.optional(),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;

// Checkpoint metadata
export const CheckpointMetadataSchema = z.object({
	id: z.string(),
	timestamp: z.number().int().positive(),
	trigger: z.string(),
	fileCount: z.number().int().nonnegative(),
	totalSize: z.number().int().nonnegative(),
	riskScoreAvg: z.number().min(0).max(1),
	workspaceId: z.string(),
});

export type CheckpointMetadata = z.infer<typeof CheckpointMetadataSchema>;

// Analytics response
export const AnalyticsResponseSchema = z.object({
	workspaceId: z.string(),

	riskInsights: z.object({
		currentAvgRisk: z.number(),
		trendDirection: z.enum(["increasing", "decreasing", "stable"]),
		percentileRank: z.number(),
		hotspots: z.array(
			z.object({
				filePathHash: z.string(),
				riskScore: z.number(),
				recommendation: z.string(),
			})
		),
	}),

	checkpointRecommendations: z.object({
		shouldCreateCheckpoint: z.boolean(),
		reason: z.string(),
		urgency: z.enum(["low", "medium", "high"]),
		suggestedTiming: z.enum(["now", "1h", "4h", "24h"]),
	}),

	patterns: z.array(
		z.object({
			type: z.enum([
				"high_velocity",
				"large_changes",
				"sensitive_files",
				"dependency_thrash",
			]),
			confidence: z.number(),
			description: z.string(),
			mitigation: z.string(),
		})
	),

	predictions: z
		.array(
			z.object({
				filePathHash: z.string(),
				predictedRisk: z.number(),
				confidence: z.number(),
				reasoning: z.array(z.string()),
			})
		)
		.optional(),
});

export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;
```

### 5.3 Client SDK Implementation

```typescript
// packages/sdk/src/client.ts

import {
	FileMetadata,
	CheckpointMetadata,
	AnalyticsResponse,
} from "@snapback/contracts";
import { PrivacySanitizer } from "./privacy/sanitizer";
import { LRUCache } from "./cache/lru-cache";

export interface SDKConfig {
	endpoint: string;
	apiKey: string;

	privacy: {
		hashFilePaths: boolean;
		anonymizeWorkspace: boolean;
	};

	cache: {
		enabled: boolean;
		ttl: Record<string, number>;
	};

	retry: {
		maxRetries: number;
		backoffMs: number;
	};
}

export class SnapBackAPIClient {
	private sanitizer: PrivacySanitizer;
	private cache: LRUCache;
	private config: SDKConfig;

	constructor(config: SDKConfig) {
		this.config = config;
		this.sanitizer = new PrivacySanitizer(config.privacy);
		this.cache = new LRUCache(config.cache);
	}

	/**
	 * Send file metadata batch to API
	 * Automatically sanitizes metadata to ensure privacy
	 */
	async sendMetadata(
		workspaceId: string,
		files: FileMetadata[]
	): Promise<{ accepted: number; rejected: number }> {
		// Privacy validation - ensures no file contents
		const sanitized = files.map((f) => this.sanitizer.sanitize(f));

		// Validate all metadata is privacy-safe
		for (const file of sanitized) {
			if (!this.sanitizer.isPrivacySafe(file)) {
				throw new Error(
					"Privacy validation failed: file contains sensitive data"
				);
			}
		}

		try {
			const response = await this.request(
				"POST",
				"/v1/metadata/files/batch",
				{
					workspaceId,
					files: sanitized,
				}
			);

			return response;
		} catch (error) {
			// Graceful degradation - don't fail if API unavailable
			console.warn(
				"API metadata upload failed, continuing with local operation:",
				error
			);
			return { accepted: 0, rejected: files.length };
		}
	}

	/**
	 * Get analytics for workspace
	 * Uses cache when available
	 */
	async getAnalytics(
		workspaceId: string,
		options?: { forceRefresh?: boolean }
	): Promise<AnalyticsResponse> {
		const cacheKey = `analytics:${workspaceId}`;

		// Check cache first
		if (!options?.forceRefresh && this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey);
		}

		try {
			const response = await this.request(
				"GET",
				`/v1/analytics/workspace/${workspaceId}`
			);

			// Cache successful response
			this.cache.set(cacheKey, response, this.config.cache.ttl.analytics);

			return response;
		} catch (error) {
			// Return cached data if available, even if stale
			if (this.cache.has(cacheKey)) {
				console.warn("API unavailable, using stale cached analytics");
				return this.cache.get(cacheKey);
			}

			throw error;
		}
	}

	/**
	 * Get smart recommendations
	 */
	async getRecommendations(
		workspaceId: string
	): Promise<AnalyticsResponse["checkpointRecommendations"]> {
		try {
			const response = await this.request(
				"GET",
				`/v1/intelligence/recommendations?workspaceId=${workspaceId}`
			);
			return response.checkpointRecommendations;
		} catch (error) {
			// Fallback to local heuristics
			return this.localFallback.generateRecommendations();
		}
	}

	/**
	 * HTTP request with retry and error handling
	 */
	private async request(
		method: string,
		path: string,
		body?: any
	): Promise<any> {
		let lastError: Error | null = null;

		for (
			let attempt = 0;
			attempt <= this.config.retry.maxRetries;
			attempt++
		) {
			try {
				const response = await fetch(`${this.config.endpoint}${path}`, {
					method,
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": this.config.apiKey,
						"X-SnapBack-SDK": "1.0.0",
					},
					body: body ? JSON.stringify(body) : undefined,
				});

				if (!response.ok) {
					const error = await response.json();

					// Handle rate limiting
					if (response.status === 429) {
						const retryAfter = parseInt(
							response.headers.get("Retry-After") || "60"
						);
						await this.sleep(retryAfter * 1000);
						continue;
					}

					throw new Error(error.message || "API request failed");
				}

				return await response.json();
			} catch (error) {
				lastError = error as Error;

				if (attempt < this.config.retry.maxRetries) {
					const backoff =
						this.config.retry.backoffMs * Math.pow(2, attempt);
					await this.sleep(backoff);
				}
			}
		}

		throw lastError;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
```

### 5.4 Privacy Sanitizer

```typescript
// packages/sdk/src/privacy/sanitizer.ts

import crypto from "crypto";
import { FileMetadata } from "@snapback/contracts";

export class PrivacySanitizer {
	constructor(
		private config: {
			hashFilePaths: boolean;
			anonymizeWorkspace: boolean;
		}
	) {}

	/**
	 * Sanitize file metadata to ensure privacy
	 * Removes any potentially sensitive data
	 */
	sanitize(metadata: FileMetadata): FileMetadata {
		// Hash file path if enabled
		if (this.config.hashFilePaths && "filePath" in metadata) {
			const filePath = (metadata as any).filePath;
			(metadata as any).filePathHash = this.hashFilePath(filePath);
			delete (metadata as any).filePath;
		}

		// Remove sensitive risk factors
		if (metadata.risk?.factors) {
			metadata.risk.factors = metadata.risk.factors.map((factor) =>
				this.sanitizeFactor(factor)
			);
		}

		return metadata;
	}

	/**
	 * Validate that metadata contains no sensitive data
	 */
	isPrivacySafe(metadata: any): boolean {
		// Blacklist of forbidden properties
		const forbiddenProps = [
			"content",
			"sourceCode",
			"fileContent",
			"code",
			"text",
			"body",
			"filePath", // Only hashed paths allowed
			"fullPath",
		];

		// Check for forbidden properties
		for (const prop of forbiddenProps) {
			if (prop in metadata) {
				return false;
			}
		}

		// Check nested objects
		for (const [key, value] of Object.entries(metadata)) {
			if (typeof value === "object" && value !== null) {
				if (!this.isPrivacySafe(value)) {
					return false;
				}
			}

			// Check for suspiciously large strings (potential code content)
			if (typeof value === "string" && value.length > 1000) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Hash file path with workspace salt
	 */
	private hashFilePath(filePath: string): string {
		return crypto.createHash("sha256").update(filePath).digest("hex");
	}

	/**
	 * Sanitize risk factor to remove specific identifiers
	 */
	private sanitizeFactor(factor: string): string {
		// Replace specific file names with generic placeholders
		return factor
			.replace(/['"].*?['"]/g, '"<redacted>"') // Remove quoted strings
			.replace(/\b\w+\.\w+\b/g, "<file>") // Remove file names
			.replace(/\b\/[\w\/]+\b/g, "<path>"); // Remove paths
	}
}
```

---

## 6. Privacy Architecture

### 6.1 Privacy-by-Design Validation

```typescript
// apps/api/src/middleware/privacy.ts

import { Request, Response, NextFunction } from "express";
import { FileMetadataSchema } from "@snapback/contracts";

export class PrivacyValidator {
	/**
	 * Middleware to validate incoming requests contain no file contents
	 */
	validateRequest(req: Request, res: Response, next: NextFunction) {
		try {
			// Validate against schema
			const validated = FileMetadataSchema.parse(req.body);

			// Additional privacy checks
			if (!this.isMetadataOnly(validated)) {
				return res.status(400).json({
					code: "E_PRIVACY_001",
					message: "Request contains forbidden file content data",
					retryable: false,
				});
			}

			// Enforce metadata size limits
			const payloadSize = JSON.stringify(req.body).length;
			if (payloadSize > this.MAX_METADATA_SIZE) {
				return res.status(413).json({
					code: "E_PRIVACY_002",
					message:
						"Metadata payload too large (possible content leak)",
					retryable: false,
				});
			}

			next();
		} catch (error) {
			return res.status(400).json({
				code: "E_VALID_001",
				message: "Invalid metadata format",
				details: error.message,
				retryable: false,
			});
		}
	}

	/**
	 * Check that payload contains only metadata
	 */
	private isMetadataOnly(data: any): boolean {
		// Forbidden properties
		const forbidden = [
			"content",
			"sourceCode",
			"fileContent",
			"code",
			"text",
			"body",
			"filePath", // Only hashed paths allowed
			"fullPath",
			"absolutePath",
		];

		// Check for forbidden properties
		const props = this.getAllProps(data);
		for (const prop of forbidden) {
			if (props.includes(prop)) {
				console.warn(
					`Privacy violation: forbidden property '${prop}' in request`
				);
				return false;
			}
		}

		// Check for suspiciously large strings
		const strings = this.getAllStrings(data);
		for (const str of strings) {
			if (str.length > 1000) {
				console.warn(
					`Privacy violation: string too large (${str.length} chars)`
				);
				return false;
			}

			// Check for code-like patterns
			if (this.looksLikeCode(str)) {
				console.warn(
					"Privacy violation: string contains code-like patterns"
				);
				return false;
			}
		}

		return true;
	}

	/**
	 * Get all property names recursively
	 */
	private getAllProps(obj: any, prefix = ""): string[] {
		let props: string[] = [];

		for (const [key, value] of Object.entries(obj)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			props.push(fullKey);

			if (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value)
			) {
				props = props.concat(this.getAllProps(value, fullKey));
			}
		}

		return props;
	}

	/**
	 * Get all string values recursively
	 */
	private getAllStrings(obj: any): string[] {
		let strings: string[] = [];

		for (const value of Object.values(obj)) {
			if (typeof value === "string") {
				strings.push(value);
			} else if (typeof value === "object" && value !== null) {
				strings = strings.concat(this.getAllStrings(value));
			}
		}

		return strings;
	}

	/**
	 * Heuristic to detect code-like strings
	 */
	private looksLikeCode(str: string): boolean {
		const codePatterns = [
			/function\s+\w+/,
			/const\s+\w+\s*=/,
			/let\s+\w+\s*=/,
			/var\s+\w+\s*=/,
			/class\s+\w+/,
			/import\s+.*from/,
			/export\s+(default\s+)?/,
			/if\s*\(/,
			/for\s*\(/,
			/while\s*\(/,
		];

		return codePatterns.some((pattern) => pattern.test(str));
	}

	private readonly MAX_METADATA_SIZE = 100 * 1024; // 100KB per request
}
```

### 6.2 Opt-In Flow Design

```typescript
// apps/vscode/src/config/api-config.ts

import * as vscode from "vscode";

export class APIConfigurationManager {
	/**
	 * Show opt-in flow when user first enables API
	 */
	async showOptInFlow(): Promise<boolean> {
		// Step 1: Privacy notice
		const privacyAccepted = await this.showPrivacyNotice();
		if (!privacyAccepted) {
			return false;
		}

		// Step 2: Feature selection
		const features = await this.selectFeatures();

		// Step 3: API key configuration
		const apiKey = await this.configureAPIKey();

		// Step 4: Test connection
		const connected = await this.testConnection(apiKey);
		if (!connected) {
			vscode.window.showErrorMessage("Failed to connect to SnapBack API");
			return false;
		}

		// Step 5: Save configuration
		await this.saveConfiguration({
			enabled: true,
			apiKey,
			features,
		});

		vscode.window.showInformationMessage(
			"SnapBack API successfully configured!"
		);
		return true;
	}

	/**
	 * Show privacy notice with clear explanation
	 */
	private async showPrivacyNotice(): Promise<boolean> {
		const message = `
SnapBack API Privacy Notice

By enabling the SnapBack API, you agree to share the following metadata:
• File sizes, line counts, and extensions
• Risk scores and complexity metrics (computed locally)
• Timestamps and workspace IDs

What is NEVER shared:
• Your source code or file contents
• File paths (only hashed paths are sent)
• Function/variable names or comments
• Any reconstructable source code

Your data:
• Is stored for 90 days by default
• Can be deleted at any time
• Is never sold or shared with third parties

You can disable API features at any time in Settings.
    `.trim();

		const result = await vscode.window.showInformationMessage(
			message,
			{ modal: true },
			"I Accept",
			"Learn More",
			"Cancel"
		);

		if (result === "Learn More") {
			vscode.env.openExternal(
				vscode.Uri.parse("https://snapback.dev/privacy")
			);
			return this.showPrivacyNotice(); // Show again after learning more
		}

		return result === "I Accept";
	}

	/**
	 * Let user select which API features to enable
	 */
	private async selectFeatures(): Promise<Record<string, boolean>> {
		const features = await vscode.window.showQuickPick(
			[
				{
					label: "Analytics",
					description: "Risk trending and workspace insights",
					picked: true,
				},
				{
					label: "Intelligence",
					description: "ML-powered risk predictions",
					picked: true,
				},
				{
					label: "Recommendations",
					description: "Smart checkpoint suggestions",
					picked: true,
				},
				{
					label: "Telemetry",
					description: "Anonymous usage statistics",
					picked: false,
				},
			],
			{
				canPickMany: true,
				title: "Select SnapBack API Features",
			}
		);

		return {
			analytics: features?.some((f) => f.label === "Analytics") ?? false,
			intelligence:
				features?.some((f) => f.label === "Intelligence") ?? false,
			recommendations:
				features?.some((f) => f.label === "Recommendations") ?? false,
			telemetry: features?.some((f) => f.label === "Telemetry") ?? false,
		};
	}

	/**
	 * Configure API key
	 */
	private async configureAPIKey(): Promise<string> {
		const result = await vscode.window.showQuickPick(
			[
				{
					label: "Generate New API Key",
					description: "Create a new workspace-specific API key",
				},
				{
					label: "Use Existing API Key",
					description: "Enter an API key you already have",
				},
			],
			{
				title: "API Key Configuration",
			}
		);

		if (result?.label === "Generate New API Key") {
			// Open browser to generate key
			vscode.env.openExternal(
				vscode.Uri.parse("https://snapback.dev/api-keys")
			);

			const apiKey = await vscode.window.showInputBox({
				prompt: "Paste your API key here",
				password: true,
				validateInput: (value) => {
					if (!value.startsWith("sb_")) {
						return "Invalid API key format";
					}
					return null;
				},
			});

			return apiKey || "";
		} else {
			const apiKey = await vscode.window.showInputBox({
				prompt: "Enter your existing API key",
				password: true,
				validateInput: (value) => {
					if (!value.startsWith("sb_")) {
						return "Invalid API key format";
					}
					return null;
				},
			});

			return apiKey || "";
		}
	}

	/**
	 * Test API connection
	 */
	private async testConnection(apiKey: string): Promise<boolean> {
		try {
			const client = new SnapBackAPIClient({
				endpoint: "https://api.snapback.dev",
				apiKey,
				privacy: { hashFilePaths: true, anonymizeWorkspace: false },
				cache: { enabled: true, ttl: {} },
				retry: { maxRetries: 2, backoffMs: 1000 },
			});

			// Test connection with simple request
			await client.request("GET", "/v1/health");
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Save API configuration
	 */
	private async saveConfiguration(config: any): Promise<void> {
		const vscodeConfig = vscode.workspace.getConfiguration("snapback");
		await vscodeConfig.update(
			"api",
			config,
			vscode.ConfigurationTarget.Global
		);
	}
}
```

---

## 7. Testing Strategy

### 7.1 Privacy Contract Tests

```typescript
// packages/sdk/tests/privacy.test.ts

describe("Privacy Contract Tests", () => {
	const sanitizer = new PrivacySanitizer({
		hashFilePaths: true,
		anonymizeWorkspace: false,
	});

	it("should reject payloads containing file content", () => {
		const payload = {
			filePathHash: "abc123",
			content: 'function foo() { return "bar"; }', // FORBIDDEN
			riskScore: 0.5,
		};

		expect(sanitizer.isPrivacySafe(payload)).toBe(false);
	});

	it("should reject payloads with raw file paths", () => {
		const payload = {
			filePath: "/Users/john/project/src/index.ts", // FORBIDDEN
			riskScore: 0.5,
		};

		expect(sanitizer.isPrivacySafe(payload)).toBe(false);
	});

	it("should accept metadata-only payloads", () => {
		const payload = {
			filePathHash: "abc123",
			sizeBytes: 1024,
			lineCount: 50,
			riskScore: 0.5,
		};

		expect(sanitizer.isPrivacySafe(payload)).toBe(true);
	});

	it("should hash file paths correctly", () => {
		const filePath = "/Users/john/project/src/index.ts";
		const hash = sanitizer.hashFilePath(filePath);

		expect(hash).toHaveLength(64); // SHA-256
		expect(hash).not.toContain(filePath);
	});

	it("should sanitize risk factors to remove identifiers", () => {
		const factor = 'High complexity in function "getUserData"';
		const sanitized = sanitizer.sanitizeFactor(factor);

		expect(sanitized).not.toContain("getUserData");
		expect(sanitized).toContain("<redacted>");
	});
});
```

### 7.2 Integration Tests

```typescript
// apps/api/tests/integration/metadata.test.ts

describe("Metadata Ingestion Integration", () => {
	let apiClient: SnapBackAPIClient;
	let testWorkspaceId: string;

	beforeAll(async () => {
		// Set up test API client
		apiClient = new SnapBackAPIClient({
			endpoint: process.env.TEST_API_ENDPOINT || "http://localhost:3000",
			apiKey: process.env.TEST_API_KEY || "test_key",
			privacy: { hashFilePaths: true, anonymizeWorkspace: false },
			cache: { enabled: false, ttl: {} },
			retry: { maxRetries: 2, backoffMs: 100 },
		});

		// Create test workspace
		const workspace = await apiClient.createWorkspace("Test Workspace");
		testWorkspaceId = workspace.id;
	});

	it("should successfully ingest valid metadata", async () => {
		const metadata: FileMetadata[] = [
			{
				filePathHash: crypto.randomBytes(32).toString("hex"),
				fileExtension: ".ts",
				sizeBytes: 1024,
				lineCount: 50,
				risk: {
					score: 0.3,
					factors: ["Medium complexity"],
					severity: "medium",
				},
				complexity: {
					score: 0.5,
					functionCount: 5,
					nestingDepth: 3,
					cyclomaticComplexity: 10,
				},
				timestamp: Date.now(),
				lastModified: Date.now(),
			},
		];

		const result = await apiClient.sendMetadata(testWorkspaceId, metadata);

		expect(result.accepted).toBe(1);
		expect(result.rejected).toBe(0);
	});

	it("should reject metadata containing file contents", async () => {
		const metadata: any = {
			filePathHash: crypto.randomBytes(32).toString("hex"),
			content: "function foo() {}", // FORBIDDEN
			riskScore: 0.5,
		};

		await expect(
			apiClient.sendMetadata(testWorkspaceId, [metadata])
		).rejects.toThrow("Privacy validation failed");
	});

	it("should retrieve analytics for workspace", async () => {
		// First, ingest some metadata
		await apiClient.sendMetadata(testWorkspaceId, generateTestMetadata(10));

		// Then retrieve analytics
		const analytics = await apiClient.getAnalytics(testWorkspaceId);

		expect(analytics.workspaceId).toBe(testWorkspaceId);
		expect(analytics.riskInsights).toBeDefined();
		expect(analytics.checkpointRecommendations).toBeDefined();
	});
});
```

### 7.3 Performance Tests

```typescript
// apps/api/tests/performance/load.test.ts

describe("API Performance Tests", () => {
	it("should handle 1000 concurrent requests", async () => {
		const startTime = Date.now();

		const promises = Array.from({ length: 1000 }, async (_, i) => {
			const client = new SnapBackAPIClient(testConfig);
			return client.sendMetadata(testWorkspaceId, [
				generateTestMetadata(),
			]);
		});

		const results = await Promise.allSettled(promises);
		const endTime = Date.now();

		const successful = results.filter(
			(r) => r.status === "fulfilled"
		).length;
		const failed = results.filter((r) => r.status === "rejected").length;

		expect(successful).toBeGreaterThan(950); // >95% success rate
		expect(endTime - startTime).toBeLessThan(30000); // <30s total
	});

	it("should respond to analytics queries in <500ms", async () => {
		const startTime = Date.now();

		await apiClient.getAnalytics(testWorkspaceId);

		const endTime = Date.now();
		expect(endTime - startTime).toBeLessThan(500);
	});
});
```

---

## 8. Migration Roadmap Summary

### Timeline Overview

```
Phase 1: Infrastructure & SDK (Weeks 1-3)
├─ Week 1: API service setup, database schema
├─ Week 2: Client SDK development, privacy layer
└─ Week 3: Authentication, rate limiting, integration tests

Phase 2: Analytics Migration (Weeks 4-6)
├─ Week 4: Risk trending API, background jobs
├─ Week 5: Pattern recognition service
└─ Week 6: Client integration, analytics views

Phase 3: Intelligence Layer (Weeks 7-10)
├─ Week 7-8: ML model training, inference service
├─ Week 9: Recommendation engine
└─ Week 10: A/B testing, performance optimization

Phase 4: Client Refactoring (Weeks 11-14)
├─ Week 11: API configuration UI (all clients)
├─ Week 12: Code cleanup, duplicate removal
├─ Week 13: Documentation, migration guides
└─ Week 14: Beta testing, rollout preparation
```

### Success Metrics

```typescript
interface MigrationMetrics {
	privacy: {
		zeroContentLeaks: true; // No file contents in API logs
		privacyTestsPassing: 100; // % of privacy tests passing
	};

	performance: {
		apiLatencyP95: "<500ms"; // 95th percentile latency
		apiUptime: ">99.5%"; // Monthly uptime
		cacheHitRate: ">70%"; // Cache effectiveness
	};

	adoption: {
		apiOptInRate: ">30%"; // Users enabling API
		activeUsers: ">1000"; // Active API users
		retentionRate: ">85%"; // Monthly retention
	};

	quality: {
		codeDuplicationReduction: ">50%"; // Code reuse improvement
		testCoverage: ">85%"; // Test coverage
		bugRate: "<5/month"; // Production bugs
	};
}
```

### Validation Gates

```typescript
interface PhaseGates {
	phase1: {
		required: [
			"API service running in production",
			"SDK published to npm",
			"Privacy validation tests passing 100%",
			"Authentication flow complete",
			"Rate limiting working correctly"
		];
		optional: ["Load testing complete", "Security audit passed"];
	};

	phase2: {
		required: [
			"Analytics API endpoints functional",
			"Background aggregation jobs running",
			"Pattern recognition accuracy >70%",
			"Client analytics views working",
			"Caching reducing API load >50%"
		];
	};

	phase3: {
		required: [
			"ML model trained with >70% accuracy",
			"Prediction service deployed",
			"Recommendations improving user outcomes",
			"A/B test showing positive impact"
		];
	};

	phase4: {
		required: [
			"All clients integrated with SDK",
			"Opt-in flow complete and tested",
			"Code duplication reduced >50%",
			"Documentation complete",
			"Beta users successfully using API"
		];
	};
}
```

---

## 9. Conclusion

This API architecture achieves the project goals:

**✅ Privacy-First Design**: Only metadata crosses the wire, never file contents

-   File path hashing prevents reconstruction
-   Privacy validator rejects any file content
-   Automated tests ensure contract compliance

**✅ Local-First Operation**: Core features work offline

-   All essential operations stay local
-   API provides value-add enhancements only
-   Graceful degradation when API unavailable

**✅ User Opt-In**: Clear consent flow

-   Transparent privacy notice
-   Granular feature selection
-   Easy enable/disable

**✅ Capability Extraction**: Smart service separation

-   Metadata aggregation → API
-   Content analysis → Local
-   Intelligence/ML → API (optional enhancement)

**✅ Scalable Architecture**: Production-ready design

-   RESTful API with versioning
-   Rate limiting and caching
-   Monitoring and rollback strategies

**Next Steps:**

1. Review and approve architecture
2. Begin Phase 1 implementation
3. Set up CI/CD pipelines
4. Recruit beta testers
5. Execute migration phases incrementally
