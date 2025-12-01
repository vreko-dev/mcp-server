# SnapBack API Migration Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-02
**Audience**: Development team migrating from embedded processing to API-first architecture

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Step-by-Step Migration Process](#step-by-step-migration-process)
4. [Client Refactoring Guide](#client-refactoring-guide)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Migration Overview

### What's Changing

**Before (Embedded Processing)**:

```
┌─────────────────────────────────────────────────┐
│  VS Code / MCP / CLI Client                     │
│  ┌───────────────────────────────────────────┐  │
│  │  Full Processing Pipeline                 │  │
│  │  • File analysis                          │  │
│  │  • Risk calculation                       │  │
│  │  • Checkpoint management                  │  │
│  │  • Telemetry                              │  │
│  │  • Feature flags                          │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**After (API-First Architecture)**:

```
┌─────────────────────────────────────────────────┐
│  VS Code / MCP / CLI Client                     │
│  ┌───────────────────────────────────────────┐  │
│  │  Local Processing Only                    │  │
│  │  • File content analysis (NEVER leaves)   │  │
│  │  • Generate metadata                      │  │
│  │  • Send metadata to API (opt-in)          │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓ metadata only
┌─────────────────────────────────────────────────┐
│  SnapBack API (Centralized Services)            │
│  • Risk scoring (from metadata)                 │
│  • Checkpoint tracking                          │
│  • Feature flag management                      │
│  • Analytics aggregation                        │
└─────────────────────────────────────────────────┘
```

### Key Principles

1. **Privacy-First**: File contents NEVER leave the client
2. **Metadata-Only**: Only operation statistics sent to API
3. **Opt-In**: Users explicitly enable API integration
4. **Local Fallback**: All features work without API (degraded mode)

---

## Pre-Migration Checklist

### Environment Setup

-   [ ] **API Access**: Obtain API key from SnapBack dashboard
-   [ ] **Environment Variables**: Configure `.env` with API credentials
-   [ ] **Network Access**: Verify connectivity to `api.snapback.dev`
-   [ ] **SDK Installation**: Install `@snapback/sdk` package
-   [ ] **Feature Flags**: Enable `telemetry.enabled` flag

### Code Audit

-   [ ] **Identify Capabilities**: List all features that currently process locally
-   [ ] **Map to API Endpoints**: Match capabilities to new API endpoints
-   [ ] **Data Flow Analysis**: Document what data flows where
-   [ ] **Privacy Review**: Ensure no sensitive data in metadata payloads
-   [ ] **Error Handling**: Plan fallback behavior for API failures

### Testing Preparation

-   [ ] **Test Environment**: Set up staging API endpoint
-   [ ] **Mock API Server**: Configure for offline testing
-   [ ] **Test Data**: Prepare representative test cases
-   [ ] **Rollback Plan**: Document reversion procedure

---

## Step-by-Step Migration Process

### Phase 1: Install SDK and Configure (1-2 hours)

**Step 1.1: Install SDK**

```bash
# In your client package (vscode, mcp, cli)
cd apps/vscode
pnpm add @snapback/sdk
```

**Step 1.2: Configure Environment Variables**

Add to `.env`:

```bash
# SnapBack API Configuration
SNAPBACK_API_KEY=sb_live_1234567890abcdef
SNAPBACK_API_URL=https://api.snapback.dev/v1
SNAPBACK_API_ENABLED=false  # Start disabled, enable after testing
SNAPBACK_API_TIMEOUT=5000
```

**Step 1.3: Initialize API Client**

Create `src/api-client.ts`:

```typescript
import { SnapBackClient } from "@snapback/sdk";
import { FeatureManager } from "@snapback/core";

let apiClient: SnapBackClient | null = null;

export function getApiClient(): SnapBackClient | null {
	const featureManager = FeatureManager.getInstance();

	// Check if API integration is enabled
	if (!featureManager.isEnabled("telemetry.enabled")) {
		return null; // Fallback to local-only mode
	}

	if (!apiClient) {
		const apiKey = process.env.SNAPBACK_API_KEY;
		const baseUrl =
			process.env.SNAPBACK_API_URL || "https://api.snapback.dev/v1";

		if (!apiKey) {
			console.warn(
				"SNAPBACK_API_KEY not configured. Running in local-only mode."
			);
			return null;
		}

		apiClient = new SnapBackClient({
			apiKey,
			baseUrl,
			timeout: parseInt(process.env.SNAPBACK_API_TIMEOUT || "5000"),
			retry: {
				retries: 3,
				factor: 2,
				minTimeout: 1000,
				maxTimeout: 5000,
			},
			circuitBreaker: {
				enabled: true,
				errorThresholdPercentage: 50,
				volumeThreshold: 10,
				timeout: 5000,
				resetTimeout: 30000,
			},
		});
	}

	return apiClient;
}

export function isApiEnabled(): boolean {
	const featureManager = FeatureManager.getInstance();
	return (
		featureManager.isEnabled("telemetry.enabled") &&
		!!process.env.SNAPBACK_API_KEY
	);
}
```

---

### Phase 2: Refactor Checkpoint Creation (2-3 hours)

**Before (Embedded Processing)**:

```typescript
// OLD: packages/core/src/guardian.ts
export class Guardian {
	async createCheckpoint(content: string): Promise<Checkpoint> {
		// Analyze file content locally
		const analysis = await this.analyze(content);

		// Store checkpoint locally
		const checkpoint = await this.storage.save({
			id: uuidv4(),
			timestamp: Date.now(),
			riskScore: analysis.score,
			content: content, // ❌ Stored locally with content
		});

		// Send telemetry with content metadata
		this.telemetry.track("checkpoint.created", {
			checkpointId: checkpoint.id,
			contentLength: content.length, // ❌ Content metadata
		});

		return checkpoint;
	}
}
```

**After (API-First Architecture)**:

```typescript
// NEW: packages/core/src/guardian.ts
import { getApiClient, isApiEnabled } from "./api-client";

export class Guardian {
	async createCheckpoint(
		content: string,
		metadata: { trigger: string; fileCount: number }
	): Promise<Checkpoint> {
		// Step 1: Analyze content LOCALLY (never leaves machine)
		const analysis = await this.analyzeLocally(content);

		// Step 2: Store checkpoint LOCALLY with content
		const localCheckpoint = await this.storage.save({
			id: uuidv4(),
			timestamp: Date.now(),
			riskScore: analysis.score,
			content: content, // ✅ Kept locally
		});

		// Step 3: Send METADATA ONLY to API (opt-in)
		if (isApiEnabled()) {
			try {
				const apiClient = getApiClient();
				await apiClient?.createCheckpoint({
					trigger: metadata.trigger,
					risk_score: analysis.score,
					file_count: metadata.fileCount,
					total_additions: this.countAdditions(content),
					total_deletions: this.countDeletions(content),
					severity: analysis.severity,
					metadata: {
						client_type: "vscode",
						client_version: "1.2.0",
						session_id: this.sessionId, // anonymous UUID
						analysis_duration_ms: analysis.duration,
						// ❌ NO file paths, names, or content
					},
				});
			} catch (error) {
				// API failure doesn't break functionality
				console.warn(
					"Failed to sync checkpoint metadata to API:",
					error
				);
				// Continue with local-only checkpoint
			}
		}

		return localCheckpoint;
	}

	private analyzeLocally(content: string): AnalysisResult {
		// All analysis happens locally
		// File content NEVER sent to API
		return this.analyze(content);
	}

	private countAdditions(content: string): number {
		// Count additions for metadata (not content itself)
		return content.split("\n").filter((line) => line.startsWith("+"))
			.length;
	}

	private countDeletions(content: string): number {
		// Count deletions for metadata
		return content.split("\n").filter((line) => line.startsWith("-"))
			.length;
	}
}
```

**Key Changes**:

1. ✅ Content analysis stays local
2. ✅ Only metadata sent to API
3. ✅ API failures don't break functionality
4. ✅ Opt-in via feature flag

---

### Phase 3: Refactor Risk Analysis (2-3 hours)

**Before (Embedded Processing)**:

```typescript
// OLD: VS Code extension
async function analyzeRisk(changes: DiffChange[]): Promise<RiskScore> {
	const guardian = new Guardian();
	return guardian.analyze(changes); // Local processing
}
```

**After (API-First with Fallback)**:

```typescript
// NEW: VS Code extension
import { getApiClient, isApiEnabled } from "./api-client";
import { Guardian } from "@snapback/core";

async function analyzeRisk(changes: DiffChange[]): Promise<RiskScore> {
	// Prefer API for risk analysis (if enabled)
	if (isApiEnabled()) {
		try {
			const apiClient = getApiClient();
			const metadata = extractMetadata(changes); // Extract counts only

			const result = await apiClient?.analyzeRisk({
				changes: metadata.changes, // Only counts, not content
				file_count: metadata.fileCount,
				metadata: {
					file_types: metadata.fileTypes, // e.g., ['.ts', '.json']
					session_id: getSessionId(),
				},
			});

			return {
				score: result.risk_analysis.score,
				severity: result.risk_analysis.severity,
				factors: result.risk_analysis.factors,
			};
		} catch (error) {
			console.warn(
				"API risk analysis failed, falling back to local:",
				error
			);
			// Fall through to local analysis
		}
	}

	// Fallback to local analysis
	const guardian = new Guardian();
	return guardian.analyze(changes);
}

function extractMetadata(changes: DiffChange[]): ChangeMetadata {
	// Extract metadata WITHOUT file contents
	return {
		changes: changes.map((c) => ({
			type: c.added ? "addition" : "deletion",
			line_count: c.count || 0,
			// ❌ NO actual code or values
		})),
		fileCount: new Set(changes.map((c) => c.file)).size,
		fileTypes: [...new Set(changes.map((c) => path.extname(c.file)))],
	};
}
```

**Key Changes**:

1. ✅ API-first approach (when enabled)
2. ✅ Graceful fallback to local processing
3. ✅ Metadata extraction (no content)
4. ✅ Error handling preserves functionality

---

### Phase 4: Refactor Telemetry (1-2 hours)

**Before (Embedded Processing)**:

```typescript
// OLD: packages/telemetry/src/telemetry-client.ts
export class TelemetryClient {
	track(event: string, properties?: Record<string, any>) {
		// Send directly to PostHog from client
		this.posthog.capture({
			distinctId: this.userId,
			event: event,
			properties: properties,
		});
	}
}
```

**After (API Proxy)**:

```typescript
// NEW: packages/telemetry/src/telemetry-client.ts
import { getApiClient, isApiEnabled } from "./api-client";

export class TelemetryClient {
	track(event: string, properties?: Record<string, any>) {
		const featureManager = FeatureManager.getInstance();

		// Check if telemetry is enabled (opt-in)
		if (!featureManager.isEnabled("telemetry.enabled")) {
			return; // User opted out
		}

		// Sanitize properties (remove PII)
		const sanitizedProps = this.sanitizeProperties(properties);

		// Send via API (preferred method)
		if (isApiEnabled()) {
			try {
				const apiClient = getApiClient();
				apiClient?.trackEvent({
					event,
					properties: sanitizedProps,
					timestamp: Date.now(),
				});
				return; // Success
			} catch (error) {
				console.warn("API event tracking failed:", error);
				// Fall through to direct PostHog
			}
		}

		// Fallback: Direct PostHog (deprecated, will be removed)
		this.posthog.capture({
			distinctId: this.userId,
			event: event,
			properties: sanitizedProps,
		});
	}

	private sanitizeProperties(
		props?: Record<string, any>
	): Record<string, any> {
		// Remove PII and sensitive data
		const sanitized = { ...props };

		// Remove file paths and content
		delete sanitized.filePath;
		delete sanitized.absolutePath;
		delete sanitized.content;
		delete sanitized.fileName;

		// Remove user identifiers
		delete sanitized.userName;
		delete sanitized.userEmail;
		delete sanitized.userId;

		// Remove credentials
		delete sanitized.apiKey;
		delete sanitized.token;
		delete sanitized.password;
		delete sanitized.secret;

		return sanitized;
	}
}
```

**Key Changes**:

1. ✅ Telemetry proxied through API
2. ✅ Enhanced sanitization
3. ✅ Fallback to direct PostHog (temporary)
4. ✅ Opt-in enforcement

---

### Phase 5: Add Feature Flag Support (1 hour)

**Before (Static Flags)**:

```typescript
// OLD: packages/contracts/src/features.ts
export const FEATURE_FLAGS = {
	"telemetry.enabled": true, // Hardcoded
	"telemetry.detailed_events": true,
};
```

**After (Dynamic API Flags)**:

```typescript
// NEW: packages/core/src/feature-manager.ts
import { getApiClient, isApiEnabled } from "./api-client";

export class FeatureManager {
	private static instance: FeatureManager;
	private flags: Map<string, boolean> = new Map();
	private lastRefresh: number = 0;
	private refreshInterval = 300000; // 5 minutes

	async initialize() {
		await this.refreshFlags();
	}

	async refreshFlags() {
		if (!isApiEnabled()) {
			// Use local defaults
			this.loadLocalDefaults();
			return;
		}

		try {
			const apiClient = getApiClient();
			const response = await apiClient?.getFeatureFlags();

			for (const [key, value] of Object.entries(response.features)) {
				this.flags.set(key, Boolean(value));
			}

			this.lastRefresh = Date.now();
		} catch (error) {
			console.warn("Failed to fetch feature flags from API:", error);
			this.loadLocalDefaults();
		}
	}

	isEnabled(flag: string): boolean {
		// Auto-refresh if stale
		if (Date.now() - this.lastRefresh > this.refreshInterval) {
			this.refreshFlags(); // Fire and forget
		}

		return this.flags.get(flag) ?? FEATURE_FLAGS[flag] ?? false;
	}

	private loadLocalDefaults() {
		for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
			this.flags.set(key, value);
		}
	}
}
```

---

### Phase 6: Update VS Code Extension (2-3 hours)

**Refactor Extension Initialization**:

```typescript
// apps/vscode/src/extension.ts
import { getApiClient, isApiEnabled } from "./api-client";
import { FeatureManager } from "@snapback/core";

export async function activate(context: vscode.ExtensionContext) {
	// Step 1: Initialize feature flags from API
	const featureManager = FeatureManager.getInstance();
	await featureManager.initialize();

	// Step 2: Check if API integration is enabled
	if (isApiEnabled()) {
		vscode.window.showInformationMessage(
			"SnapBack API integration enabled. Metadata will be synced to improve insights."
		);
	} else {
		vscode.window.showInformationMessage(
			"SnapBack running in local-only mode. Enable API in settings for enhanced features."
		);
	}

	// Step 3: Initialize services with API client
	const apiClient = getApiClient();
	const operationCoordinator = new OperationCoordinator(
		workspaceMemory,
		notificationManager,
		storage,
		apiClient // Pass API client
	);

	// Rest of activation...
}
```

**Add Settings UI for API Configuration**:

```typescript
// apps/vscode/package.json - Add configuration
{
  "contributes": {
    "configuration": {
      "title": "SnapBack",
      "properties": {
        "snapback.api.enabled": {
          "type": "boolean",
          "default": false,
          "description": "Enable API integration for enhanced features (metadata only)"
        },
        "snapback.api.key": {
          "type": "string",
          "default": "",
          "description": "API key for SnapBack services"
        },
        "snapback.telemetry.enabled": {
          "type": "boolean",
          "default": false,
          "description": "Enable anonymous usage telemetry (opt-in)"
        }
      }
    }
  }
}
```

---

### Phase 7: Update MCP Server (1-2 hours)

**Refactor MCP Server**:

```typescript
// apps/mcp-server/src/index.ts
import { getApiClient, isApiEnabled } from "./api-client";
import { Guardian } from "@snapback/core";

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	if (request.params.name === "create_checkpoint") {
		const args = CreateCheckpointArgsSchema.parse(request.params.arguments);

		// Analyze locally
		const guardian = new Guardian();
		const analysis = await guardian.analyze(args.content);

		// Store locally
		const checkpoint = await storage.save({
			id: uuidv4(),
			timestamp: Date.now(),
			riskScore: analysis.score,
			content: args.content,
		});

		// Sync metadata to API (if enabled)
		if (isApiEnabled()) {
			try {
				const apiClient = getApiClient();
				await apiClient?.createCheckpoint({
					trigger: args.trigger,
					risk_score: analysis.score,
					file_count: args.files?.length || 1,
					metadata: {
						client_type: "mcp",
						session_id: getSessionId(),
					},
				});
			} catch (error) {
				// Non-blocking error
				console.warn("Failed to sync checkpoint to API:", error);
			}
		}

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(checkpoint),
				},
			],
		};
	}
});
```

---

### Phase 8: Update CLI (1-2 hours)

**Refactor CLI Commands**:

```typescript
// apps/cli/src/index.ts
import { getApiClient, isApiEnabled } from "./api-client";

async function handleCreateCheckpoint(options) {
	const guardian = new Guardian();

	// Read file content locally
	const content = await fs.readFile(options.file, "utf-8");

	// Analyze locally
	const analysis = await guardian.analyze(content);

	// Create local checkpoint
	const checkpoint = await storage.save({
		id: uuidv4(),
		timestamp: Date.now(),
		riskScore: analysis.score,
		content: content,
	});

	console.log(`✅ Checkpoint created: ${checkpoint.id}`);
	console.log(`   Risk Score: ${analysis.score}`);
	console.log(`   Severity: ${analysis.severity}`);

	// Sync to API (if enabled)
	if (isApiEnabled()) {
		try {
			const apiClient = getApiClient();
			await apiClient?.createCheckpoint({
				trigger: "manual",
				risk_score: analysis.score,
				file_count: 1,
				metadata: {
					client_type: "cli",
					session_id: getSessionId(),
				},
			});
			console.log("📡 Metadata synced to API");
		} catch (error) {
			console.warn(
				"⚠️  Failed to sync to API (local checkpoint still created)"
			);
		}
	}
}
```

---

## Testing Strategy

### Unit Tests

**Test Local Processing**:

```typescript
// apps/vscode/test/unit/guardian.test.ts
import { describe, it, expect, vi } from "vitest";
import { Guardian } from "@snapback/core";
import { getApiClient } from "../src/api-client";

// Mock API client
vi.mock("../src/api-client", () => ({
	getApiClient: vi.fn(() => null), // Simulate API disabled
	isApiEnabled: vi.fn(() => false),
}));

describe("Guardian - Local Processing", () => {
	it("should analyze content locally without API", async () => {
		const guardian = new Guardian();
		const content = "function test() { return true; }";

		const result = await guardian.analyze(content);

		expect(result.score).toBeDefined();
		expect(result.severity).toBeDefined();
		// Verify no API calls made
		expect(getApiClient).not.toHaveBeenCalled();
	});
});
```

**Test API Integration**:

```typescript
// apps/vscode/test/unit/api-integration.test.ts
import { describe, it, expect, vi } from "vitest";
import { Guardian } from "@snapback/core";
import { getApiClient, isApiEnabled } from "../src/api-client";

// Mock API client
const mockApiClient = {
	createCheckpoint: vi.fn().mockResolvedValue({ checkpoint: { id: "test" } }),
};

vi.mock("../src/api-client", () => ({
	getApiClient: vi.fn(() => mockApiClient),
	isApiEnabled: vi.fn(() => true),
}));

describe("Guardian - API Integration", () => {
	it("should send metadata to API when enabled", async () => {
		const guardian = new Guardian();
		const content = "function test() { return true; }";

		await guardian.createCheckpoint(content, {
			trigger: "manual",
			fileCount: 1,
		});

		expect(mockApiClient.createCheckpoint).toHaveBeenCalledWith(
			expect.objectContaining({
				trigger: "manual",
				file_count: 1,
				risk_score: expect.any(Number),
				metadata: expect.objectContaining({
					client_type: "vscode",
				}),
			})
		);

		// Verify NO content in API call
		const apiCall = mockApiClient.createCheckpoint.mock.calls[0][0];
		expect(apiCall).not.toHaveProperty("content");
		expect(JSON.stringify(apiCall)).not.toContain(content);
	});
});
```

### Integration Tests

**Test API Fallback**:

```typescript
describe("API Fallback Behavior", () => {
	it("should fallback to local processing when API fails", async () => {
		const mockFailingClient = {
			createCheckpoint: vi.fn().mockRejectedValue(new Error("API Error")),
		};

		vi.mocked(getApiClient).mockReturnValue(mockFailingClient);
		vi.mocked(isApiEnabled).mockReturnValue(true);

		const guardian = new Guardian();
		const content = "function test() {}";

		// Should not throw despite API failure
		const checkpoint = await guardian.createCheckpoint(content, {
			trigger: "manual",
			fileCount: 1,
		});

		expect(checkpoint).toBeDefined();
		expect(checkpoint.id).toBeDefined();
		// Local checkpoint still created
	});
});
```

### Privacy Validation Tests

**Test Data Sanitization**:

```typescript
describe("Privacy - Data Sanitization", () => {
	it("should never send file content to API", async () => {
		const mockApiClient = {
			createCheckpoint: vi
				.fn()
				.mockResolvedValue({ checkpoint: { id: "test" } }),
		};

		vi.mocked(getApiClient).mockReturnValue(mockApiClient);
		vi.mocked(isApiEnabled).mockReturnValue(true);

		const guardian = new Guardian();
		const secretContent = 'const API_KEY = "sk_live_secret123";';

		await guardian.createCheckpoint(secretContent, {
			trigger: "manual",
			fileCount: 1,
		});

		const apiCallPayload = JSON.stringify(
			mockApiClient.createCheckpoint.mock.calls[0][0]
		);

		// Verify secret content NOT in API payload
		expect(apiCallPayload).not.toContain("sk_live_secret123");
		expect(apiCallPayload).not.toContain("API_KEY");
		expect(apiCallPayload).not.toContain(secretContent);
	});

	it("should sanitize file paths from metadata", async () => {
		const telemetry = new TelemetryClient();

		telemetry.track("file.saved", {
			filePath: "/Users/john/projects/secret-project/auth.ts",
			absolutePath: "/Users/john/projects/secret-project/auth.ts",
		});

		// Verify paths removed
		const sanitized = telemetry.sanitizeProperties({
			filePath: "/Users/john/projects/secret-project/auth.ts",
		});

		expect(sanitized.filePath).toBeUndefined();
		expect(sanitized.absolutePath).toBeUndefined();
	});
});
```

---

## Rollback Procedures

### Emergency Rollback (5 minutes)

**Option 1: Disable API via Environment Variable**

```bash
# Set in .env or export
export SNAPBACK_API_ENABLED=false

# Restart extension/service
# All processing reverts to local-only
```

**Option 2: Disable via Feature Flag**

```typescript
// Immediate disable via feature manager
const featureManager = FeatureManager.getInstance();
featureManager.setFlag("telemetry.enabled", false);
```

**Option 3: Revert Git Commit**

```bash
# Find the migration commit
git log --oneline | grep "API migration"

# Revert the commit
git revert <commit-hash>

# Deploy reverted version
```

### Planned Rollback (30 minutes)

**Step 1: Switch to Local-Only Mode**

```bash
# Update feature flags in API dashboard
TELEMETRY_ENABLED=false

# Or update environment
export SNAPBACK_API_ENABLED=false
```

**Step 2: Remove API Dependencies**

```bash
# Remove SDK package
pnpm remove @snapback/sdk

# Revert code changes
git checkout main -- apps/vscode/src/api-client.ts
```

**Step 3: Restore Old Implementation**

```bash
# Checkout previous version
git checkout migration-backup-branch

# Cherry-pick bug fixes if needed
git cherry-pick <commit-hash>
```

**Step 4: Verify Functionality**

```bash
# Run tests
pnpm test

# Manual verification
# - Create checkpoint locally
# - Analyze risk locally
# - Verify no API calls
```

---

## Troubleshooting

### Issue: API Key Not Working

**Symptoms**:

-   401 Unauthorized errors
-   "Invalid API key" messages

**Solutions**:

```bash
# Verify API key format
echo $SNAPBACK_API_KEY
# Should start with "sb_live_" or "sb_test_"

# Test API key
curl -H "Authorization: Bearer $SNAPBACK_API_KEY" \
  https://api.snapback.dev/v1/health

# Regenerate key if needed
snapback auth generate-key
```

---

### Issue: API Requests Failing

**Symptoms**:

-   Network errors
-   Timeout errors
-   500 server errors

**Solutions**:

```typescript
// Add detailed logging
const apiClient = new SnapBackClient({
	apiKey: process.env.SNAPBACK_API_KEY,
	debug: true, // Enable debug logging
	onError: (error) => {
		console.error("API Error:", {
			status: error.status,
			message: error.message,
			response: error.response,
		});
	},
});

// Increase timeout
const apiClient = new SnapBackClient({
	apiKey: process.env.SNAPBACK_API_KEY,
	timeout: 10000, // Increase to 10s
});
```

---

### Issue: Metadata Validation Errors

**Symptoms**:

-   400 Bad Request errors
-   "Validation failed" messages

**Solutions**:

```typescript
// Validate metadata before sending
import { CheckpointMetadataSchema } from "@snapback/contracts";

try {
	const validatedMetadata = CheckpointMetadataSchema.parse(metadata);
	await apiClient.createCheckpoint(validatedMetadata);
} catch (error) {
	if (error instanceof z.ZodError) {
		console.error("Metadata validation failed:", error.errors);
		// Handle validation errors
	}
}
```

---

### Issue: Feature Flags Not Updating

**Symptoms**:

-   Old flag values persist
-   Changes not reflected in client

**Solutions**:

```typescript
// Force refresh feature flags
const featureManager = FeatureManager.getInstance();
await featureManager.refreshFlags();

// Reduce cache time for testing
const featureManager = new FeatureManager({
	refreshInterval: 10000, // 10 seconds for testing
});
```

---

### Issue: Local Fallback Not Working

**Symptoms**:

-   Functionality breaks when API unavailable
-   Error thrown instead of fallback

**Solutions**:

```typescript
// Ensure proper error handling
async function createCheckpoint(content: string) {
	let apiResult = null;

	if (isApiEnabled()) {
		try {
			const apiClient = getApiClient();
			apiResult = await apiClient?.createCheckpoint(metadata);
		} catch (error) {
			console.warn("API failed, using local fallback:", error);
			// Continue to local processing
		}
	}

	// Local processing always happens
	const localCheckpoint = await storage.save({
		id: uuidv4(),
		timestamp: Date.now(),
		content: content,
	});

	return localCheckpoint;
}
```

---

## Migration Validation Checklist

After completing migration, verify:

-   [ ] **Privacy**: File contents never sent to API
-   [ ] **Opt-In**: API only used when explicitly enabled
-   [ ] **Fallback**: All features work without API
-   [ ] **Error Handling**: API failures don't break functionality
-   [ ] **Testing**: All tests pass (local and API modes)
-   [ ] **Documentation**: README and docs updated
-   [ ] **Monitoring**: API errors logged and tracked
-   [ ] **User Experience**: Clear messaging about API integration

---

## Next Steps

1. **Monitor API Usage**: Track API call volume and error rates
2. **Gather User Feedback**: Survey users about privacy and functionality
3. **Optimize API Calls**: Batch requests, reduce redundant calls
4. **Enhance Privacy**: Continue auditing data flows
5. **Documentation**: Update user guides and API docs

---

## Support

-   **Migration Issues**: dev-support@snapback.dev
-   **API Questions**: api-support@snapback.dev
-   **Privacy Concerns**: privacy@snapback.dev
-   **Internal Docs**: [Migration Runbook](./MIGRATION-RUNBOOK.md)
