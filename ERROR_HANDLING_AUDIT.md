# SnapBack Error Handling Audit - Comprehensive Report

## Executive Summary

SnapBack implements a **hierarchical, domain-specific error handling system** with:
- **20+ custom error classes** organized by domain
- **Type-safe error chains** with cause propagation
- **Centralized logging** with PII redaction
- **Multi-layer error handling** across VS Code, API, MCP, and Web
- **Validation errors** via Zod with structured error context

**Status**: Production-ready, well-architected system with consistent patterns across all applications.

---

## 1. ERROR CLASSES & TYPES

### 1.1 VS Code Extension Error Hierarchy
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/src/errors/index.ts`
**Lines**: 1-686

**Base Error Class**:
```ts
class SnapBackError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error,
  )
  getFullMessage(): string  // Returns error chain as string
}
```

**Storage Errors** (Lines 46-117):
- `StorageError` - base class
- `DatabaseConnectionError` - SQLite connection failed
- `DatabaseInitializationError` - Schema/migration failed
- `DatabaseQueryError` - Query execution failed (includes query metadata)
- `DatabaseTransactionError` - Transaction rollback
- `StorageCorruptionError` - Data integrity issues

**Snapshot Errors** (Lines 119-202):
- `SnapshotError` - base class
- `SnapshotNotFoundError` - Missing snapshot (includes snapshotId)
- `SnapshotCreationError` - Creation failed (includes filePath)
- `SnapshotRestorationError` - Restore failed
- `SnapshotValidationError` - Data validation failed
- `SnapshotDeduplicationError` - Dedup logic failed

**Session Errors** (Lines 204-272):
- `SessionError` - base class
- `SessionNotFoundError` - Missing session (includes sessionId)
- `SessionCreationError` - Creation failed
- `SessionFinalizationError` - Finalization failed (includes sessionId)
- `SessionRestorationError` - Restore failed

**Protection Errors** (Lines 274-337):
- `ProtectionError` - base class
- `ProtectionBlockedError` - Operation blocked (includes filePath, reason, protectionLevel)
- `InvalidProtectionLevelError` - Invalid level enum (includes level, validLevels)
- `PolicyEvaluationError` - Policy check failed (includes policyPath)

**Validation Errors** (Lines 339-374):
- `ValidationError` - base class (includes field, value)
- `SchemaValidationError` - Zod/schema failure (includes schema name, errors array)

**Configuration Errors** (Lines 376-432):
- `ConfigurationError` - base class (includes configKey)
- `ConfigurationFileNotFoundError` - Missing .snapbackrc
- `ConfigurationParseError` - Invalid JSON/YAML

**File System Errors** (Lines 434-508):
- `FileSystemError` - base class
- `FileNotFoundError` - Missing file
- `FileReadError` - Read operation failed
- `FileWriteError` - Write operation failed
- `FilePermissionError` - Access denied (includes operation)

**Event Bus Errors** (Lines 510-549):
- `EventBusError` - base class
- `EventBusConnectionError` - Connection failed
- `EventPublishError` - Publishing failed (includes eventType)

**Error Severity Enum** (Lines 648-685):
```ts
enum ErrorSeverity {
  LOW = "low",           // Informational
  MEDIUM = "medium",     // Degrades functionality
  HIGH = "high",         // Significantly impacts
  CRITICAL = "critical"  // System failure
}

function getErrorSeverity(error: unknown): ErrorSeverity
```

**Maps error types to severity automatically**:
- DatabaseConnectionError, DatabaseInitializationError → CRITICAL
- StorageCorruptionError → CRITICAL
- SessionFinalizationError, SnapshotCreationError → HIGH
- ValidationError, ConfigurationError → MEDIUM
- ProtectionBlockedError → LOW (expected behavior)

**Type Guards** (Lines 555-611):
```ts
isSnapBackError(error: unknown): error is SnapBackError
isStorageError(error: unknown): error is StorageError
isSnapshotError(error: unknown): error is SnapshotError
isSessionError(error: unknown): error is SessionError
isProtectionError(error: unknown): error is ProtectionError
isValidationError(error: unknown): error is ValidationError
isConfigurationError(error: unknown): error is ConfigurationError
isFileSystemError(error: unknown): error is FileSystemError
```

**Error Utilities** (Lines 613-643):
```ts
toError(error: unknown): Error
ensureSnapBackError(error: unknown, defaultCode?): SnapBackError
```

### 1.2 SDK Error Classes
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/StorageErrors.ts`
**Lines**: 1-45

Simpler hierarchy (extends Error directly):
- `StorageError` (base, includes code, details)
- `StorageConnectionError` - DB/API unavailable
- `StorageTransactionError` - Concurrent write conflict
- `StorageFullError` - Disk quota exceeded
- `StorageLockError` - Database locked
- `CorruptedDataError` - Invalid snapshot data

### 1.3 VS Code Extension Storage Errors
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/src/storage/StorageErrors.ts`
**Lines**: 1-147

More detailed hierarchy with prototype chain fixes:
```ts
StorageError (base)
├── DatabaseError
│   ├── DatabaseConnectionError
│   ├── DatabaseQueryError (includes query, parameters)
│   └── DatabaseTransactionError (includes operation)
├── SnapshotError (includes snapshotId)
│   ├── SnapshotNotFoundError
│   ├── SnapshotChainCorruptionError (includes chainInfo)
│   └── SnapshotValidationError (includes validationIssues array)
└── StorageIntegrityError
```

**Note**: Uses `Object.setPrototypeOf(this, Class.prototype)` for proper instanceof checks in transpiled code.

### 1.4 Supabase Error Handler
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/supabase-error-handler.ts`
**Lines**: 1-211

Custom error classes:
- `SupabaseError` - base (includes code, details)
- `DatabaseConnectionError` - Connection/network errors
- `AuthenticationError` - Auth failures, JWT issues
- `ValidationError` - Database constraint violations

**Error Factory Function** (Lines 43-78):
```ts
handleSupabaseError(error: any): SupabaseError
// Detects:
// - Connection errors: "connection" | "network" in message
// - Auth errors: "authentication" | "auth" | "jwt" in message
// - Validation errors: "validation" | "constraint" in message
```

**Retry Mechanism** (Lines 81-117):
```ts
withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T>

// Options:
// - maxRetries: number (default 3)
// - delay: number (default 1000ms)
// - exponentialBackoff: boolean (default true)

// Skips retry for:
// - ValidationError (constraint violations)
// - AuthenticationError (auth failures)
```

**Connection Management** (Lines 120-201):
```ts
class SupabaseConnectionManager {
  async testConnection(supabase: SupabaseClient): Promise<boolean>
  async waitForConnection(supabase, timeout): Promise<boolean>
  async refreshConnection(supabase: SupabaseClient): Promise<void>
}
```

---

## 2. ERROR CREATION PATTERNS

### 2.1 Direct Instantiation (API Procedures)
**Pattern**: Simple `throw new Error(message)`

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/modules/snapshots/procedures/create-snapshot.ts`
**Lines**: 60-73, 144-150

```ts
// User validation
if (!user) {
  throw new Error("Unauthorized");
}

// Database check
if (!drizzle) {
  throw new Error("Database not available");
}

// API key validation
if (!apiKeyResult || apiKeyResult.length === 0) {
  throw new Error("No API key found");
}

// Limits exceeded
if (snapshotsLimit !== undefined && snapshotsUsed >= snapshotsLimit) {
  throw new Error(
    JSON.stringify({
      error: "Monthly snapshot limit exceeded",
      used: snapshotsUsed,
      limit: snapshotsLimit,
      upgradeUrl: "/pricing",
      suggestedPlan: snapshotsLimit === 100 ? "solo" : "team",
    }),
  );
}

// Feature paywall
if (input.cloudBackupEnabled && !permissions.cloudBackup) {
  throw new Error("Cloud backup not available on your plan. Upgrade to Solo or Team.");
}
```

**Pattern**: Uses JSON.stringify() for structured error context (lines 137-144).

### 2.2 ORPC Error Creation
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/modules/apikeys/procedures/create-api-key.ts`
**Lines**: 39-41

```ts
throw new ORPCError("FORBIDDEN", {
  message: "API keys require Solo plan or higher. Upgrade at /pricing",
});
```

**Pattern**: ORPC provides dedicated error constructor with code + context object.

### 2.3 Error Wrapping in Procedures
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/modules/risk/procedures/analyze-risk.ts`
**Lines**: 202-221

```ts
// Feature not available
throw new Error(
  JSON.stringify({
    error: "Advanced detection not available on free plan",
    upgradeUrl: "/pricing",
    feature: "advancedDetection",
  }),
);

// Custom rules unavailable
throw new Error(
  JSON.stringify({
    error: "Custom rules not available on your plan",
    upgradeUrl: "/pricing",
    feature: "customRules",
    requiredPlan: "team",
  }),
);
```

### 2.4 MCP Server Error Sanitization
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/index.ts`
**Lines**: 118-145

```ts
function sanitizeError(
  error: unknown,
  context: string,
): {
  message: string;
  code: string;
  logId: string;
} {
  const isDevelopment = process.env.NODE_ENV === "development";
  const logId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log full details to stderr
  console.error(`[Error ${logId}] ${context}:`, error);

  // Return sanitized message
  if (isDevelopment) {
    return {
      message: error instanceof Error ? error.message : String(error),
      code: "INTERNAL_ERROR",
      logId,
    };
  }

  // Production: generic message
  return {
    message: "An internal error occurred. Contact support with log ID.",
    code: "INTERNAL_ERROR",
    logId,
  };
}
```

---

## 3. ERROR PROPAGATION & HANDLING

### 3.1 Try-Catch Blocks in MCP Server
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/index.ts`
**Lines**: 450-807

```ts
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Get API key
    const apiKey = process.env.SNAPBACK_API_KEY || "";

    // Authenticate
    const authResult = await authenticate(apiKey);

    // Tool-specific logic with Zod validation
    if (name === "snapback.analyze_risk") {
      const parsed = z.object({
        changes: z.array(z.object({...})),
      }).parse(args);

      // API call with fallback
      try {
        const apiClient = new SnapBackAPIClient({...});
        const risk = await apiClient.analyzeFast(analysisRequest);
        // ... process result
      } catch (error) {
        // Fallback to basic analysis
        console.error("Backend API call failed:", error);
        const basicRisk = {...};
        // ... return fallback
      }
    }

    // ... other tool handlers
    
  } catch (error: unknown) {
    const sanitized = sanitizeError(error, `tool_call_${name}`);
    console.error(`[SnapBack MCP] Error handling tool ${name}:`, error);

    return {
      content: [{
        type: "text",
        text: `${sanitized.message} (Log ID: ${sanitized.logId})`,
      }],
      isError: true,
      error: {
        message: sanitized.message,
        code: sanitized.code,
      },
    };
  }
});
```

**Pattern**: 
- Inner try-catch for specific operations (API calls)
- Outer try-catch for entire request handler
- Returns error in MCP-compatible format

### 3.2 Async/Await Error Handling
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/src/server.ts`
**Lines**: 210-226

```ts
const fetchPromise = app.fetch(request) as Promise<Response>;
fetchPromise
  .then(async (response: Response) => {
    res.statusCode = response.status;
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });
    return response.arrayBuffer();
  })
  .then((buffer: ArrayBuffer) => {
    res.end(Buffer.from(buffer));
  })
  .catch((error: Error) => {
    console.error("Server error:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  });
```

**Pattern**: Promise chains with `.catch()` for HTTP server errors.

### 3.3 Fire-and-Forget with Error Handling
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/modules/snapshots/procedures/create-snapshot.ts`
**Lines**: 236-253

```ts
// Track usage for analytics (async, non-blocking)
trackUsage({
  requestId: crypto.randomUUID(),
  apiKeyId: apiKey.id,
  userId: user.id,
  endpoint: "/api/snapshots/create",
  method: "POST",
  tokensUsed: 0,
  responseTime: 0,
  responseStatus: 201,
  cached: false,
  clientVersion: input.metadata?.clientVersion,
  metadata: {
    snapshotId: newSnapshot.id,
    filesProtected: input.fileCount,
    trigger: input.trigger,
    riskScore: input.riskScore,
  },
}).catch(console.error);  // Silent error handling
```

**Pattern**: `.catch(console.error)` for non-critical background tasks.

### 3.4 Event Bus Connection Errors
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/index.ts`
**Lines**: 178-193

```ts
const eventBus = new SnapBackEventBus();
try {
  await eventBus.connect();
  console.error("[SnapBack MCP] Connected to event bus");
} catch (err) {
  console.error("[SnapBack MCP] Failed to connect to event bus:", err);
  // Continues without event bus (graceful degradation)
}

const extensionClient = new ExtensionIPCClient();
try {
  await extensionClient.connect();
  console.error("[SnapBack MCP] Connected to Extension IPC");
} catch (err) {
  console.error("[SnapBack MCP] Failed to connect to Extension IPC:", err);
  // Continues without extension IPC
}
```

**Pattern**: Try-catch with graceful degradation (continues on failure).

---

## 4. ERROR RESPONSE SCHEMAS

### 4.1 API Error Responses
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/src/server.ts`
**Lines**: 21-34

```ts
.use(
  bodyLimit({
    maxSize: 10 * 1024 * 1024,
    onError: (c) => {
      return c.json(
        {
          error: "Payload too large",
          message: "Request body exceeds 10MB limit",
        },
        413,
      );
    },
  }),
)
```

**Pattern**: JSON response with `error` + `message` fields and HTTP status code.

### 4.2 ORPC Error Response
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/modules/apikeys/procedures/create-api-key.ts`
**Lines**: 39-41

```ts
throw new ORPCError("FORBIDDEN", {
  message: "API keys require Solo plan or higher. Upgrade at /pricing",
});
```

ORPC automatically converts to:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "API keys require Solo plan or higher. Upgrade at /pricing"
  }
}
```

### 4.3 MCP Error Response
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/index.ts`
**Lines**: 794-806

```ts
return {
  content: [
    {
      type: "text",
      text: `${sanitized.message} (Log ID: ${sanitized.logId})`,
    },
  ],
  isError: true,
  error: {
    message: sanitized.message,
    code: sanitized.code,
  },
};
```

**Pattern**: MCP uses `content` array + `isError` flag + `error` object.

### 4.4 Supabase Error Response
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/supabase-error-handler.ts`
**Lines**: 134-196

Returns typed errors:
```ts
new DatabaseConnectionError(message, code, details)
new AuthenticationError(message, code, details)
new ValidationError(message, code, details)
```

Each includes:
- `message`: Human-readable
- `code`: Error code
- `details`: Structured metadata (hint, details from Supabase)

---

## 5. ERROR LOGGING & MONITORING

### 5.1 Structured Logging System
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/packages/infrastructure/src/logging/logger.ts`
**Lines**: 1-120

**Pino-based implementation** with:
- **Redaction paths** (Lines 4-13):
  ```ts
  const redactPaths = [
    "user.email",
    "user.password",
    "apiKey",
    "session.token",
    "req.headers.authorization",
    "auth.*.password",
    "config.*.secret",
    "env.*",
  ];
  ```

- **Development vs Production** (Lines 18-40):
  - Dev: pino-pretty (colorized output)
  - Prod: Fast JSON output
  - Never uses transports in VSCode (bundling issues)

- **Logger interface** (Lines 45-114):
  ```ts
  logger.debug(message: string, meta?: Record<string, unknown>): void
  logger.info(message: string, meta?: Record<string, unknown>): void
  logger.warn(message: string, meta?: Record<string, unknown>): void
  logger.error(message: string, meta?: Record<string, unknown> | Error): void
  logger.child(bindings: Record<string, unknown>) // Scoped logger
  ```

### 5.2 Logger Contract (Public API)
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/packages/contracts/src/logger.ts`
**Lines**: 1-206

**createLogger factory**:
```ts
function createLogger(options: LoggerOptions): Logger {
  // Uses infrastructure logger if available
  // Falls back to minimal console-based implementation
  
  // Options:
  // - name: string (module name)
  // - level?: LogLevel (DEBUG|INFO|WARN|ERROR|SILENT)
  // - timestamps?: boolean
}
```

**Fallback implementation** (Lines 141-191):
- Formats messages with timestamps
- Serializes metadata with circular reference handling
- Never throws during logging

### 5.3 Error Logging Examples
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/src/snapshot/SnapshotDeletionService.ts`

```ts
logger.error(
  "Auto-cleanup failed for snapshot",
  toError(error),
  { snapshotId: snapshot.id }
);
```

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/src/snapshot/migration/encrypt-existing-snapshots.ts`
**Lines**: 45, 87, 100

```ts
// Info logs
logger.info("Snapshot encryption migration already completed");

// Warning logs
logger.warn("Failed to read snapshots directory", {
  error: "ENOENT",
  path: snapshotsPath,
});

// Error logs
logger.error(`Failed to migrate snapshot ${file}`, error as Error);

// Complete operation log
logger.info("Snapshot encryption migration completed", {
  encryptedCount: encryptedSnapshots.length,
  totalSnapshots: files.length,
});
```

### 5.4 PostHog Telemetry
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/packages/infrastructure/src/posthog/alerts.ts`
**Lines**: 54-109

```ts
// Info: successful operations
logger.info("PostHog Alert Configuration (Manual Setup Required)", {
  url: alertUrl,
  documentationUrl: DOCUMENTATION_URL,
});

// Error: failures with context
logger.error("Failed to create PostHog alert", { error, config });

logger.error("Failed to toggle PostHog alert", { error, alertId, enabled });

logger.error("Failed to delete PostHog alert", { error, alertId });
```

---

## 6. USER-FACING ERROR MESSAGES

### 6.1 Toast Notifications (VS Code Extension)
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/src/ui/SnapshotRestoreUI.ts`
**Lines**: 76, 222, 288, 419, 440

```ts
// Restore workflow failure
logger.error("Restore workflow failed", error as Error);
// Presumably shows toast to user (implementation in UI layer)

// Opening diffs
logger.info("Opening diff previews", {
  sessionId: sessionManifest.id,
  fileCount: sessionManifest.files.length,
});

// Diff open failure
logger.error("Failed to open diff for file", error as Error, {
  filePath,
  sessionId: sessionManifest.id,
});

// Restoration failure
logger.error("Restoration failed", error as Error);

// Cleanup failure
logger.warn("Failed to close diff tab", error as Error);
```

### 6.2 API Error Messages
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/modules/snapshots/procedures/create-snapshot.ts`
**Lines**: 136-150

```ts
// Structured error with upgrade path
throw new Error(
  JSON.stringify({
    error: "Monthly snapshot limit exceeded",
    used: snapshotsUsed,
    limit: snapshotsLimit,
    upgradeUrl: "/pricing",
    suggestedPlan: snapshotsLimit === 100 ? "solo" : "team",
  }),
);

// Feature paywall message
throw new Error("Cloud backup not available on your plan. Upgrade to Solo or Team.");
```

### 6.3 MCP Error Messages
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/index.ts`
**Lines**: 595-606, 685-689

```ts
// Pro-tier restriction
return {
  content: [
    { type: "json", json: sarifLog },
    {
      type: "text",
      text: "❌ This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
    },
  ],
};

// Snapshot creation failure
return {
  content: [{
    type: "text",
    text: `❌ Failed to create snapshot: ${result.error}`,
  }],
  isError: true,
};

// Success message
return {
  content: [{
    type: "text",
    text: `✅ Snapshot created successfully

ID: ${result.snapshot.id}
Timestamp: ${new Date(result.snapshot.timestamp).toLocaleString()}
Reason: ${result.snapshot.reason}
File Count: ${result.snapshot.fileCount}

You can restore this snapshot using its ID.`,
  }],
};
```

### 6.4 ORPC Client Error Handling
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/web/modules/shared/lib/orpc-client.ts`
**Lines**: 33-42

```ts
const link = new RPCLink({
  url: `${getApiBaseUrl()}/api/rpc`,
  headers: async () => {...},
  interceptors: [
    onError((error) => {
      // Skip abort errors (user canceled)
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      // Log other errors
      logger.error("ORPC client error", { error });
    }),
  ],
});
```

---

## 7. VALIDATION ERROR HANDLING

### 7.1 Zod Schema Validation
**Pattern**: Used extensively in MCP server and API procedures.

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/index.ts`
**Lines**: 468-479

```ts
const parsed = z
  .object({
    changes: z.array(
      z.object({
        added: z.boolean().optional().default(false),
        removed: z.boolean().optional().default(false),
        value: z.string(),
        count: z.number().optional(),
      }),
    ),
  })
  .parse(args);  // Throws ZodError if invalid
```

**Lines**: 757-773

```ts
// Context7 resolve library
const parsed = z.object({ libraryName: z.string().min(1) }).parse(args);

// Get library docs
const parsed = z
  .object({
    context7CompatibleLibraryID: z.string().min(1),
    topic: z.string().optional(),
    tokens: z.number().optional(),
  })
  .parse(args);
```

### 7.2 Snapshots Schema Validation
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/api/modules/snapshots/procedures/create-snapshot.ts`
**Lines**: 9-56

```ts
const createSnapshotSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  trigger: z.enum(["manual", "auto", "pre_command", "risk_detection"]),
  fileCount: z.number().int().nonnegative(),
  totalSizeBytes: z.number().int().nonnegative(),
  fileHashes: z.array(z.string()),
  gitBranch: z.string().optional(),
  gitCommit: z.string().optional(),
  gitDirty: z.boolean().optional(),
  riskScore: z.number().int().min(0).max(100).optional(),
  riskFactors: z
    .array(
      z.object({
        type: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        message: z.string(),
      }),
    )
    .optional(),
  projectPath: z.string().optional(),
  workspaceId: z.string().optional(),
  cloudBackupEnabled: z.boolean().default(false),
  encryptionKeyId: z.string().optional(),
  encryptedDataKey: z.string().optional(),
  encryptionAlgorithm: z.string().optional().default("AES-256-GCM"),
  files: z.array(
    z.object({
      filePath: z.string(),
      fileHash: z.string(),
      fileSizeBytes: z.number().int().nonnegative(),
      changeType: z.enum(["added", "modified", "deleted"]).optional(),
      linesChanged: z.number().int().optional(),
      containsSecrets: z.boolean().default(false),
      riskLevel: z.enum(["low", "medium", "high"]).optional(),
    }),
  ),
  metadata: z.object({...}).optional(),
});

export const createSnapshot = protectedProcedure
  .input(createSnapshotSchema)
  .handler(async ({ input, context }) => {
    // input is guaranteed to be validated
  });
```

### 7.3 Error Helpers for Runtime Conversion
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/utils/errorHelpers.ts`
**Lines**: 29-58

```ts
export function toError(error: unknown): Error {
  // If already an Error, return as-is
  if (error instanceof Error) {
    return error;
  }

  // Convert string to Error
  if (typeof error === "string") {
    return new Error(error);
  }

  // Handle objects
  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") {
      return new Error(error.message);
    }

    // Try to stringify
    try {
      return new Error(JSON.stringify(error));
    } catch (_stringifyError) {
      return new Error(String(error));
    }
  }

  // For all other types
  return new Error(String(error));
}
```

---

## 8. KEY PATTERNS & CONVENTIONS

### 8.1 Error Code Naming Convention
**Pattern**: UPPER_SNAKE_CASE for error codes

Examples:
- `DATABASE_CONNECTION_ERROR`
- `DATABASE_INITIALIZATION_ERROR`
- `DATABASE_QUERY_ERROR`
- `DATABASE_TRANSACTION_ERROR`
- `SNAPSHOT_NOT_FOUND`
- `SNAPSHOT_CREATION_ERROR`
- `SESSION_FINALIZATION_ERROR`
- `PROTECTION_BLOCKED`
- `VALIDATION_ERROR`
- `SCHEMA_VALIDATION_ERROR`
- `CONFIGURATION_ERROR`
- `FILE_NOT_FOUND`
- `EVENT_BUS_CONNECTION_ERROR`

### 8.2 Error Message Conventions
**Pattern 1**: Simple descriptive message (for user consumption)
```ts
throw new Error("Unauthorized");
throw new Error("Database not available");
throw new Error("No API key found");
```

**Pattern 2**: Structured JSON for detailed errors
```ts
throw new Error(JSON.stringify({
  error: "Monthly snapshot limit exceeded",
  used: 50,
  limit: 50,
  upgradeUrl: "/pricing",
  suggestedPlan: "solo",
}));
```

**Pattern 3**: ORPCError for API-specific errors
```ts
throw new ORPCError("FORBIDDEN", {
  message: "API keys require Solo plan or higher",
});
```

### 8.3 Error Context Metadata
**Structured metadata attached to errors**:
- `snapshotId` - snapshot operations
- `sessionId` - session operations
- `filePath` - file operations
- `query` - database queries
- `operation` - transaction/operation context
- `field` - form validation
- `schema` - schema validation
- `policyPath` - policy evaluation
- `protectionLevel` - protection context
- `chainInfo` - snapshot chain corruption

### 8.4 Error Chain Pattern
**Pattern**: Error cause propagation for debugging

```ts
class SnapBackError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error,
  )
  
  getFullMessage(): string {
    const messages = [this.message];
    let current = this.cause;
    while (current) {
      messages.push(`Caused by: ${current.message}`);
      current = current instanceof SnapBackError ? current.cause : undefined;
    }
    return messages.join("\n");
  }
}
```

### 8.5 Retry & Resilience Pattern
**File**: `/Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/supabase-error-handler.ts`

```ts
withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T>

// Config:
// - maxRetries: 3 (default)
// - delay: 1000ms (default)
// - exponentialBackoff: true (default)

// Skips retry for:
// - ValidationError (constraint violations)
// - AuthenticationError (auth failures)

// Implements exponential backoff:
// delay * 2^(attempt - 1)
// 1s, 2s, 4s, 8s, ...
```

---

## 9. INCONSISTENCIES & GAPS

### 9.1 Duplicate Error Classes
**Issue**: Similar error classes defined in multiple places

**Files**:
- `apps/vscode/src/errors/index.ts` - Comprehensive hierarchy with metadata
- `packages/sdk/src/storage/StorageErrors.ts` - Simpler hierarchy (extends Error)
- `apps/vscode/src/storage/StorageErrors.ts` - Different hierarchy with DatabaseError base

**Recommendation**: Consolidate to single location or clarify separation of concerns.

### 9.2 Error Handling Inconsistency in Procedures
**Issue**: API procedures use generic `throw new Error()` instead of custom error classes

**Pattern Found**:
- Some procedures: `throw new Error("message")`
- Others: `throw new ORPCError("CODE", {...})`
- Some: `throw new Error(JSON.stringify({...}))`

**Recommendation**: Standardize to use custom error classes with error codes.

### 9.3 Missing Error Codes in Some Domains
**Gap**: Protection blocking doesn't generate HTTP error codes

**File**: `apps/vscode/src/errors/index.ts` line 300-302
```ts
constructor(
  public readonly filePath: string,
  public readonly reason: string,
  public readonly protectionLevel?: string,
) {
  super(
    `Save blocked for protected file: ${filePath}. Reason: ${reason}`,
    "PROTECTION_BLOCKED",  // No HTTP status code
  );
}
```

**Recommendation**: Map error codes to HTTP status codes in API layer.

### 9.4 Incomplete Error Sanitization in API
**Issue**: API procedures may leak sensitive data in error messages

**Example**: `/apps/api/modules/snapshots/procedures/create-snapshot.ts` line 137
```ts
throw new Error(
  JSON.stringify({
    error: "Monthly snapshot limit exceeded",
    used: snapshotsUsed,
    limit: snapshotsLimit,
    upgradeUrl: "/pricing",
    suggestedPlan: snapshotsLimit === 100 ? "solo" : "team",
  }),
);
```

**Consideration**: Already structured, but no automatic PII redaction at API level.

### 9.5 Type Safety for JSON Error Strings
**Issue**: Parsing JSON error messages is error-prone

**Pattern**:
```ts
throw new Error(JSON.stringify({...}));  // client must parse
```

**Recommendation**: Use typed error classes instead:
```ts
throw new LimitExceededError({
  used: snapshotsUsed,
  limit: snapshotsLimit,
});
```

---

## 10. LOCATION INDEX

### Error Classes
| File | Lines | Classes |
|------|-------|---------|
| `apps/vscode/src/errors/index.ts` | 1-686 | SnapBackError (base), Storage*, Snapshot*, Session*, Protection*, Validation*, Configuration*, FileSystem*, EventBus* errors (20+ classes) |
| `packages/sdk/src/storage/StorageErrors.ts` | 1-45 | StorageError, StorageConnectionError, StorageTransactionError, StorageFullError, StorageLockError, CorruptedDataError |
| `apps/vscode/src/storage/StorageErrors.ts` | 1-147 | StorageError, DatabaseError*, SnapshotError*, StorageIntegrityError |
| `packages/platform/src/db/supabase-error-handler.ts` | 1-211 | SupabaseError, DatabaseConnectionError, AuthenticationError, ValidationError |

### Error Logging
| File | Lines | Implementation |
|------|-------|-----------------|
| `packages/infrastructure/src/logging/logger.ts` | 1-120 | Pino-based logger with redaction |
| `packages/contracts/src/logger.ts` | 1-206 | Logger interface, createLogger factory |

### Error Handling Examples
| File | Lines | Pattern |
|------|-------|---------|
| `apps/api/modules/snapshots/procedures/create-snapshot.ts` | 60-150 | Direct Error instantiation, JSON context |
| `apps/api/modules/apikeys/procedures/create-api-key.ts` | 39-41 | ORPCError usage |
| `apps/mcp-server/src/index.ts` | 118-807 | Sanitization, Zod validation, try-catch, fallback |
| `packages/platform/src/db/supabase-error-handler.ts` | 43-117 | Retry mechanism with exponential backoff |
| `apps/web/modules/shared/lib/orpc-client.ts` | 33-42 | Client error handling with AbortError check |

### Validation
| File | Lines | Pattern |
|------|-------|---------|
| `apps/api/modules/snapshots/procedures/create-snapshot.ts` | 9-56 | Zod schema definition |
| `apps/mcp-server/src/index.ts` | 468-479 | Zod .parse() with try-catch |
| `packages/sdk/src/utils/errorHelpers.ts` | 29-58 | toError() utility |

---

## 11. RECOMMENDATIONS

### High Priority
1. **Consolidate Error Classes**: Move all error definitions to `packages/contracts`
2. **Standardize API Errors**: Use custom error classes with HTTP status codes
3. **Error Code Mapping**: Create mapping from error codes to HTTP status codes
4. **Zod Error Handling**: Create custom Zod error interceptor to normalize validation errors

### Medium Priority
5. **Error Monitoring**: Integrate Sentry for production error tracking
6. **Error Telemetry**: Track error rates by type and feature
7. **User Error Messages**: Separate internal logs from user-facing messages
8. **Error Documentation**: Document error codes and recovery procedures

### Low Priority
9. **Error Analytics**: Dashboard for error trends
10. **Error Recovery**: Suggest recovery actions in error messages

---

## 12. CONCLUSION

SnapBack implements a **production-grade error handling system** with:
- ✅ Comprehensive custom error class hierarchy
- ✅ Error cause chaining for debugging
- ✅ Type-safe error handling with type guards
- ✅ Centralized structured logging with PII redaction
- ✅ Multi-layer error handling (API, MCP, Extension, Web)
- ✅ Zod validation integration
- ✅ Retry mechanisms with exponential backoff
- ✅ Error sanitization for production

**Minor gaps** exist in error code standardization and error class consolidation, but overall architecture is sound and follows best practices.

