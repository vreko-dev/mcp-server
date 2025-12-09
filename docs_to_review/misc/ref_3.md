Here is the implementation for **Layer 1 (The Interface)** and **Layer 3 (The Hono Middleware)**.

This establishes the strict contract your entire monorepo will follow, ensuring that your API and VS Code extension speak the same telemetry language.

### 1\. The Contract (Layer 1)

**File:** `packages/contracts/src/observability/instrumentation.ts`

This file defines *what* we can track without tying us to *how* (OTel, Datadog, etc.) we track it.

```typescript
/**
 * Standardized Semantic Attributes
 * Use these constants to ensure consistent naming across VS Code and API.
 * Aligns with OpenTelemetry Semantic Conventions v1.25+
 */
export const SemanticAttributes = {
  // HTTP & Network
  HTTP_METHOD: 'http.method',
  HTTP_ROUTE: 'http.route',
  HTTP_STATUS_CODE: 'http.status_code',
  HTTP_USER_AGENT: 'http.user_agent',

  // Identity & Tenancy
  USER_ID: 'snapback.user.id',
  ORG_ID: 'snapback.org.id',
  PLAN_TIER: 'snapback.org.tier',

  // Business Logic
  SNAPSHOT_ID: 'snapback.snapshot.id',
  FILE_COUNT: 'snapback.snapshot.file_count',
  OPERATION_TYPE: 'snapback.operation.type',

  // Infrastructure
  SERVICE_NAME: 'service.name',
  SERVICE_VERSION: 'service.version',
  ENV: 'deployment.environment',
} as const;

export type SpanStatus = 'ok' | 'error';

export interface SpanOptions {
  /**
   * Key-value pairs to attach to the span immediately
   */
  attributes?: Record<string, string | number | boolean>;
  /**
   * Is this span a root span? (Ignores parent context)
   */
  root?: boolean;
}

/**
 * The Unit of Work.
 * Wraps an OTel Span or a mock span for testing.
 */
export interface Span {
  setAttribute(key: string, value: string | number | boolean): void;
  setAttributes(attributes: Record<string, string | number | boolean>): void;

  /**
   * Record a distinct event (log) within the span's timeline
   */
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void;

  /**
   * Record an error exception on the span
   */
  recordException(error: Error | unknown): void;

  /**
   * Explicitly set the status (e.g., mark as error without throwing)
   */
  setStatus(status: SpanStatus, message?: string): void;

  /**
   * End the span manually (not needed if using `withSpan`)
   */
  end(): void;

  /**
   * Get the Trace ID (useful for returning to the client for debugging)
   */
  getTraceId(): string;
}

/**
 * The Telemetry Entry Point.
 * Inject this into your Services/Managers.
 */
export interface InstrumentationProvider {
  /**
   * Wraps a function execution in a span.
   * Automatically handles success/error status and ending the span.
   */
  withSpan<T>(name: string, fn: (span: Span) => Promise<T>, options?: SpanOptions): Promise<T>;

  /**
   * Manually start a span. You MUST call span.end()!
   * Use `withSpan` whenever possible.
   */
  startSpan(name: string, options?: SpanOptions): Span;

  /**
   * Injects the current Trace Context into a headers object.
   * Use this before making fetch calls to other services.
   */
  propagateContext(headers: Record<string, string>): void;

  /**
   * Extracts Trace Context from incoming headers.
   * Use this in Middleware.
   */
  extractContext(headers: Record<string, string>): void;
}
```

-----

### 2\. The Hono Middleware (Layer 3)

**File:** `apps/api/src/middleware/instrumentation.ts`

This middleware acts as the "Receiver." It looks for trace headers from the VS Code extension. If found, it continues that specific trace. If not, it starts a new one.

```typescript
import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import {
  InstrumentationProvider,
  SemanticAttributes
} from '@snapback/contracts/src/observability/instrumentation';

/**
 * Hono Middleware to automatically instrument incoming HTTP requests.
 * * 1. Extracts Trace Context (connecting VS Code -> API).
 * 2. Starts a Span for the request.
 * 3. Adds standard HTTP attributes.
 * 4. Injects the Span into the Hono Context for downstream use.
 */
export const instrumentationMiddleware = (provider: InstrumentationProvider) =>
  createMiddleware(async (c: Context, next: Next) => {
    // 1. Extract Headers to link this request to the parent trace (e.g., from VS Code)
    const headers = c.req.header();
    provider.extractContext(headers as Record<string, string>);

    // 2. Start the HTTP Span
    const route = c.req.path; // e.g., "/v1/snapshot"
    const method = c.req.method;

    await provider.withSpan(
      `HTTP ${method} ${route}`,
      async (span) => {
        // 3. Add High-Cardinality Attributes
        span.setAttributes({
          [SemanticAttributes.HTTP_METHOD]: method,
          [SemanticAttributes.HTTP_ROUTE]: route,
          [SemanticAttributes.HTTP_USER_AGENT]: headers['user-agent'] || 'unknown',
        });

        // Make span available to route handlers (e.g., c.get('span'))
        c.set('span', span);
        c.set('traceId', span.getTraceId());

        try {
          await next();

          // 4. Record Response Status
          const status = c.res.status;
          span.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, status);

          if (status >= 500) {
            span.setStatus('error', `HTTP ${status}`);
          }
        } catch (err) {
          // 5. Catch & Record Unhandled Errors
          span.recordException(err);
          span.setStatus('error');
          throw err;
        }
      }
    );
  });
```

### 3\. Usage Example (The "User" Code)

Here is how you will eventually use this in your API handlers. Notice how clean it is—no direct OTel dependencies.

**File:** `apps/api/src/routes/snapshot.ts`

```typescript
app.post('/snapshot', async (c) => {
  const span = c.get('span'); // Type-safe from Hono context
  const body = await c.req.json();

  // Add business context to the CURRENT span
  span.setAttribute(SemanticAttributes.FILE_COUNT, body.files.length);

  // Example: Return the Trace ID so the user can send it to support
  return c.json({
    id: 'snap_123',
    _traceId: span.getTraceId()
  });
});
```

### Next Step

Now that the **Contracts** and **Middleware** are defined, we need the "Engine" that makes them work.

Would you like me to implement the **`OTelInstrumentationProvider`** (Layer 2) next, specifically configured to be "Tree-Shakable" so it doesn't bloat your VS Code extension?
