# SnapBack API Reference

**Version**: 1.0.0
**Last Updated**: 2025-10-02
**Audience**: Developers integrating with SnapBack API

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL & Versioning](#base-url--versioning)
4. [Rate Limiting](#rate-limiting)
5. [Endpoints](#endpoints)
6. [Error Handling](#error-handling)
7. [SDK Libraries](#sdk-libraries)

---

## Overview

The SnapBack API enables metadata-only tracking of code changes, risk analysis, and checkpoint management. The API follows a **privacy-first, local-first** architecture:

-   **Metadata Only**: Only operation metadata is transmitted (file sizes, change counts, timestamps)
-   **No Source Code**: File contents, sensitive data, and actual code are NEVER transmitted
-   **Opt-In**: Users must explicitly enable API integration
-   **Local Processing**: All code analysis happens on user's machine

### What Data is Collected

**Metadata Transmitted to API**:

```json
{
	"timestamp": 1696233600000,
	"operation_type": "checkpoint_created",
	"file_count": 3,
	"total_changes": 156,
	"risk_score": 0.35,
	"severity": "medium",
	"session_id": "uuid-v4-anonymous",
	"client_type": "vscode",
	"client_version": "1.2.0"
}
```

**Data NEVER Transmitted**:

-   File contents or source code
-   File paths or directory structures
-   Variable names, function names, or identifiers
-   Comments or documentation
-   API keys, passwords, or secrets
-   User names, emails, or PII
-   IP addresses (optional anonymization)

---

## Authentication

### API Key Generation

API keys are generated through the SnapBack dashboard or CLI:

```bash
# Generate API key via CLI
snapback auth generate-key --name "VS Code Extension"

# Output
{
  "api_key": "sb_live_1234567890abcdef",
  "key_id": "key_abc123",
  "created_at": "2025-10-02T12:00:00Z",
  "expires_at": "2026-10-02T12:00:00Z"
}
```

### Using API Keys

Include the API key in the `Authorization` header:

```http
Authorization: Bearer sb_live_1234567890abcdef
```

### Key Rotation

Rotate keys regularly for security:

```bash
# Rotate API key
snapback auth rotate-key --key-id key_abc123

# Output includes both old and new keys for transition period
{
  "old_key": "sb_live_1234567890abcdef",
  "new_key": "sb_live_fedcba0987654321",
  "transition_period_days": 7
}
```

### Environment Variables

Configure API keys via environment variables:

```bash
# .env file
SNAPBACK_API_KEY=sb_live_1234567890abcdef
SNAPBACK_API_URL=https://api.snapback.dev/v1
```

---

## Base URL & Versioning

**Production Base URL**: `https://api.snapback.dev/v1`
**Staging Base URL**: `https://staging-api.snapback.dev/v1`
**API Version**: v1 (current)

### Version Headers

Include API version in requests:

```http
X-API-Version: 1
Accept: application/json
Content-Type: application/json
```

---

## Rate Limiting

### Default Limits

| Tier       | Requests/Minute | Requests/Hour | Burst Limit |
| ---------- | --------------- | ------------- | ----------- |
| Free       | 60              | 1,000         | 10          |
| Pro        | 300             | 10,000        | 50          |
| Enterprise | Custom          | Custom        | Custom      |

### Rate Limit Headers

Response includes rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1696233660
X-RateLimit-Retry-After: 15
```

### Handling Rate Limits

**429 Response Example**:

```json
{
	"error": {
		"code": "RATE_LIMIT_EXCEEDED",
		"message": "Rate limit exceeded. Please retry after 15 seconds.",
		"retry_after": 15,
		"limit": 60,
		"window": "60s"
	}
}
```

**Client Retry Logic**:

```typescript
async function apiRequestWithRetry(url: string, options: RequestInit) {
	try {
		const response = await fetch(url, options);

		if (response.status === 429) {
			const retryAfter = response.headers.get("X-RateLimit-Retry-After");
			await new Promise((resolve) =>
				setTimeout(resolve, parseInt(retryAfter) * 1000)
			);
			return apiRequestWithRetry(url, options);
		}

		return response;
	} catch (error) {
		// Handle network errors
	}
}
```

---

## Endpoints

### 1. Create Checkpoint

Create a new checkpoint with metadata.

**Endpoint**: `POST /checkpoints`

**Request**:

```json
{
	"trigger": "manual",
	"risk_score": 0.35,
	"file_count": 3,
	"total_additions": 120,
	"total_deletions": 36,
	"severity": "medium",
	"metadata": {
		"client_type": "vscode",
		"client_version": "1.2.0",
		"session_id": "anonymous-uuid-v4"
	}
}
```

**Response** (201 Created):

```json
{
	"checkpoint": {
		"id": "ckpt_1234567890",
		"created_at": "2025-10-02T12:00:00Z",
		"risk_score": 0.35,
		"severity": "medium",
		"file_count": 3,
		"url": "https://api.snapback.dev/v1/checkpoints/ckpt_1234567890"
	}
}
```

**cURL Example**:

```bash
curl -X POST https://api.snapback.dev/v1/checkpoints \
  -H "Authorization: Bearer sb_live_1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": "manual",
    "risk_score": 0.35,
    "file_count": 3,
    "total_additions": 120,
    "total_deletions": 36,
    "severity": "medium"
  }'
```

---

### 2. Analyze Risk

Analyze risk metadata for code changes.

**Endpoint**: `POST /risk/analyze`

**Request**:

```json
{
	"changes": [
		{
			"type": "addition",
			"line_count": 120
		},
		{
			"type": "deletion",
			"line_count": 36
		}
	],
	"file_count": 3,
	"metadata": {
		"file_types": [".ts", ".json"],
		"session_id": "anonymous-uuid-v4"
	}
}
```

**Response** (200 OK):

```json
{
	"risk_analysis": {
		"score": 0.35,
		"severity": "medium",
		"factors": [
			"Medium-sized change detected",
			"Multiple file types modified"
		],
		"recommendations": [
			"Consider creating checkpoint before proceeding",
			"Review changes in files with high churn rate"
		]
	}
}
```

**TypeScript Example**:

```typescript
import { SnapBackClient } from "@snapback/sdk";

const client = new SnapBackClient({
	apiKey: process.env.SNAPBACK_API_KEY,
});

const riskAnalysis = await client.analyzeRisk({
	changes: [
		{ type: "addition", line_count: 120 },
		{ type: "deletion", line_count: 36 },
	],
	file_count: 3,
});

console.log(`Risk Score: ${riskAnalysis.score}`);
console.log(`Severity: ${riskAnalysis.severity}`);
```

---

### 3. List Checkpoints

Retrieve checkpoint history (metadata only).

**Endpoint**: `GET /checkpoints`

**Query Parameters**:

-   `limit` (integer, default: 20, max: 100): Number of checkpoints to return
-   `offset` (integer, default: 0): Pagination offset
-   `severity` (string): Filter by severity (low, medium, high, critical)
-   `start_date` (ISO 8601): Filter checkpoints after date
-   `end_date` (ISO 8601): Filter checkpoints before date

**Request**:

```http
GET /checkpoints?limit=10&severity=high&start_date=2025-10-01T00:00:00Z
```

**Response** (200 OK):

```json
{
	"checkpoints": [
		{
			"id": "ckpt_1234567890",
			"created_at": "2025-10-02T12:00:00Z",
			"risk_score": 0.85,
			"severity": "high",
			"file_count": 12,
			"total_changes": 456
		}
	],
	"pagination": {
		"limit": 10,
		"offset": 0,
		"total": 45,
		"has_more": true
	}
}
```

---

### 4. Get Checkpoint Details

Retrieve detailed metadata for a specific checkpoint.

**Endpoint**: `GET /checkpoints/:id`

**Response** (200 OK):

```json
{
	"checkpoint": {
		"id": "ckpt_1234567890",
		"created_at": "2025-10-02T12:00:00Z",
		"trigger": "auto",
		"risk_score": 0.85,
		"severity": "high",
		"file_count": 12,
		"total_additions": 380,
		"total_deletions": 76,
		"metadata": {
			"client_type": "vscode",
			"client_version": "1.2.0",
			"analysis_duration_ms": 245
		}
	}
}
```

---

### 5. Track Event

Track custom events (opt-in analytics).

**Endpoint**: `POST /events`

**Request**:

```json
{
	"event": "checkpoint.created",
	"properties": {
		"trigger": "auto",
		"risk_score": 0.35,
		"severity": "medium",
		"duration_ms": 245
	},
	"timestamp": 1696233600000
}
```

**Response** (202 Accepted):

```json
{
	"status": "accepted",
	"event_id": "evt_1234567890"
}
```

---

### 6. Feature Flags

Retrieve feature flags for client configuration.

**Endpoint**: `GET /config/features`

**Response** (200 OK):

```json
{
	"features": {
		"telemetry.enabled": true,
		"telemetry.detailed_events": false,
		"telemetry.sampling_rate": 0.5,
		"auto_checkpoint.enabled": true,
		"ai_detection.enabled": true
	},
	"updated_at": "2025-10-02T12:00:00Z"
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
	"error": {
		"code": "ERROR_CODE",
		"message": "Human-readable error message",
		"details": {
			"field": "Additional context"
		},
		"request_id": "req_1234567890",
		"documentation_url": "https://docs.snapback.dev/errors/ERROR_CODE"
	}
}
```

### HTTP Status Codes

| Code | Meaning               | Description                        |
| ---- | --------------------- | ---------------------------------- |
| 200  | OK                    | Request succeeded                  |
| 201  | Created               | Resource created successfully      |
| 202  | Accepted              | Request accepted for processing    |
| 400  | Bad Request           | Invalid request parameters         |
| 401  | Unauthorized          | Missing or invalid API key         |
| 403  | Forbidden             | API key lacks required permissions |
| 404  | Not Found             | Resource not found                 |
| 429  | Too Many Requests     | Rate limit exceeded                |
| 500  | Internal Server Error | Server error                       |
| 503  | Service Unavailable   | Temporary service issue            |

### Common Error Codes

**INVALID_API_KEY**:

```json
{
	"error": {
		"code": "INVALID_API_KEY",
		"message": "The provided API key is invalid or expired",
		"documentation_url": "https://docs.snapback.dev/errors/INVALID_API_KEY"
	}
}
```

**VALIDATION_ERROR**:

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Request validation failed",
		"details": {
			"risk_score": "Must be between 0 and 1",
			"file_count": "Must be a positive integer"
		}
	}
}
```

**RATE_LIMIT_EXCEEDED**:

```json
{
	"error": {
		"code": "RATE_LIMIT_EXCEEDED",
		"message": "Rate limit exceeded. Please retry after 15 seconds.",
		"retry_after": 15,
		"limit": 60,
		"window": "60s"
	}
}
```

### Error Handling Best Practices

```typescript
async function handleApiRequest<T>(request: () => Promise<T>): Promise<T> {
	try {
		return await request();
	} catch (error) {
		if (error.status === 401) {
			// Invalid API key - refresh credentials
			console.error("Authentication failed. Please check your API key.");
		} else if (error.status === 429) {
			// Rate limit - implement exponential backoff
			const retryAfter = error.response.retry_after || 60;
			await new Promise((resolve) =>
				setTimeout(resolve, retryAfter * 1000)
			);
			return handleApiRequest(request);
		} else if (error.status === 500) {
			// Server error - log and notify user
			console.error("Server error:", error.message);
			// Implement fallback to local-only mode
		}
		throw error;
	}
}
```

---

## SDK Libraries

### Official SDKs

**TypeScript/JavaScript**:

```bash
npm install @snapback/sdk
```

**Python**:

```bash
pip install snapback-sdk
```

**Go**:

```bash
go get github.com/marcelle-labs/snapback-sdk-go
```

### TypeScript SDK Usage

**Installation**:

```bash
npm install @snapback/sdk
```

**Basic Usage**:

```typescript
import { SnapBackClient } from "@snapback/sdk";

const client = new SnapBackClient({
	apiKey: process.env.SNAPBACK_API_KEY,
	baseUrl: "https://api.snapback.dev/v1", // optional
	timeout: 5000, // optional, default 5s
	retries: 3, // optional, default 3
});

// Create checkpoint
const checkpoint = await client.createCheckpoint({
	trigger: "manual",
	risk_score: 0.35,
	file_count: 3,
});

// Analyze risk
const riskAnalysis = await client.analyzeRisk({
	changes: [{ type: "addition", line_count: 120 }],
	file_count: 3,
});

// List checkpoints
const checkpoints = await client.listCheckpoints({
	limit: 10,
	severity: "high",
});
```

**Advanced Configuration**:

```typescript
const client = new SnapBackClient({
	apiKey: process.env.SNAPBACK_API_KEY,

	// Retry configuration
	retry: {
		retries: 3,
		factor: 2,
		minTimeout: 1000,
		maxTimeout: 5000,
	},

	// Circuit breaker
	circuitBreaker: {
		enabled: true,
		errorThresholdPercentage: 50,
		volumeThreshold: 10,
		timeout: 5000,
		resetTimeout: 30000,
	},

	// Request middleware
	middleware: [
		async (request) => {
			// Add custom headers
			request.headers["X-Client-Version"] = "1.2.0";
			return request;
		},
	],
});
```

### Python SDK Usage

```python
from snapback import SnapBackClient

client = SnapBackClient(
    api_key=os.environ['SNAPBACK_API_KEY'],
    base_url='https://api.snapback.dev/v1',
    timeout=5.0
)

# Create checkpoint
checkpoint = client.create_checkpoint(
    trigger='manual',
    risk_score=0.35,
    file_count=3
)

# Analyze risk
risk_analysis = client.analyze_risk(
    changes=[
        {'type': 'addition', 'line_count': 120}
    ],
    file_count=3
)

# List checkpoints
checkpoints = client.list_checkpoints(
    limit=10,
    severity='high'
)
```

---

## Metadata Payload Specifications

### Checkpoint Metadata Schema

```typescript
interface CheckpointMetadata {
	// Required fields
	trigger: "manual" | "auto" | "pre-commit" | "pre-push";
	file_count: number;
	total_additions: number;
	total_deletions: number;

	// Optional fields
	risk_score?: number; // 0.0 to 1.0
	severity?: "low" | "medium" | "high" | "critical";

	// Client metadata
	metadata?: {
		client_type: "vscode" | "mcp" | "cli";
		client_version: string;
		session_id: string; // anonymous UUID
		analysis_duration_ms?: number;
		file_types?: string[]; // e.g., ['.ts', '.json']
	};
}
```

**Field Constraints**:

-   `file_count`: Positive integer, max 10,000
-   `total_additions`: Non-negative integer, max 1,000,000
-   `total_deletions`: Non-negative integer, max 1,000,000
-   `risk_score`: Float between 0.0 and 1.0
-   `session_id`: UUIDv4 format

**Validation Example**:

```typescript
import { z } from "zod";

const CheckpointMetadataSchema = z.object({
	trigger: z.enum(["manual", "auto", "pre-commit", "pre-push"]),
	file_count: z.number().int().positive().max(10000),
	total_additions: z.number().int().nonnegative().max(1000000),
	total_deletions: z.number().int().nonnegative().max(1000000),
	risk_score: z.number().min(0).max(1).optional(),
	severity: z.enum(["low", "medium", "high", "critical"]).optional(),
	metadata: z
		.object({
			client_type: z.enum(["vscode", "mcp", "cli"]),
			client_version: z.string(),
			session_id: z.string().uuid(),
			analysis_duration_ms: z.number().int().positive().optional(),
			file_types: z.array(z.string()).optional(),
		})
		.optional(),
});
```

---

## Webhooks (Optional)

Configure webhooks to receive notifications of checkpoint events.

**Endpoint**: `POST /webhooks`

**Create Webhook**:

```json
{
	"url": "https://your-app.com/webhooks/snapback",
	"events": ["checkpoint.created", "risk.high", "checkpoint.deleted"],
	"secret": "whsec_1234567890abcdef"
}
```

**Webhook Payload Example**:

```json
{
	"event": "checkpoint.created",
	"timestamp": 1696233600000,
	"data": {
		"checkpoint_id": "ckpt_1234567890",
		"risk_score": 0.35,
		"severity": "medium",
		"file_count": 3
	},
	"signature": "sha256=..."
}
```

---

## Privacy & Data Retention

### Data Collected

-   Checkpoint metadata (timestamps, counts, scores)
-   Risk analysis results (severity, factors)
-   Anonymous session identifiers
-   Client type and version

### Data NOT Collected

-   Source code or file contents
-   File paths or directory structures
-   Variable/function names
-   User identities or credentials

### Retention Policy

-   Checkpoint metadata: 90 days (configurable)
-   Risk analysis results: 30 days
-   Event logs: 7 days
-   API key usage logs: 365 days

### Data Deletion

```bash
# Delete all data for a session
curl -X DELETE https://api.snapback.dev/v1/sessions/:session_id \
  -H "Authorization: Bearer sb_live_1234567890abcdef"
```

---

## Support & Resources

-   **API Documentation**: https://docs.snapback.dev/api
-   **Status Page**: https://status.snapback.dev
-   **Support Email**: api-support@snapback.dev
-   **Community Discord**: https://discord.gg/snapback
-   **GitHub Issues**: https://github.com/marcelle-labs/snapback/issues
