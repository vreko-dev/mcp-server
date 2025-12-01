# SnapBack Error Handling Architecture Proposal

**Version:** 2.0
**Status:** PROPOSED
**Date:** 2025-11-16
**Author:** Architecture Review Team

---

## Executive Summary

This proposal defines a **unified error handling architecture** for SnapBack, addressing gaps identified in the comprehensive audit while preserving the strong foundation already in place.

**Current State:** 7.5/10 - Production-ready with inconsistencies
**Target State:** 9.5/10 - Enterprise-grade, consistent, observable

**Key Improvements:**
1. Standardized error metadata with correlation IDs
2. Unified API error response schema (RFC 7807-inspired)
3. Enhanced user message templates and UX consistency
4. Error catalog documentation
5. Improved developer experience (builder pattern)
6. Circuit breaker integration
7. Comprehensive error testing utilities

---

## Table of Contents

1. [Guiding Principles](#guiding-principles)
2. [Core Architecture](#core-architecture)
3. [Error Metadata Standard](#error-metadata-standard)
4. [API Error Response Schema](#api-error-response-schema)
5. [User Message Templates](#user-message-templates)
6. [Developer Experience Enhancements](#developer-experience-enhancements)
7. [Observability Integration](#observability-integration)
8. [Resilience Patterns](#resilience-patterns)
9. [Testing Strategy](#testing-strategy)
10. [Migration Path](#migration-path)
11. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Guiding Principles

### 1.1 Design Philosophy

**Consistency Over Cleverness**
- Standardized patterns across all applications
- Predictable error handling behavior
- Uniform developer experience

**Progressive Disclosure**
- Simple errors simple to create
- Rich context available when needed
- Automatic metadata enrichment

**Type Safety First**
- Full TypeScript integration
- Runtime validation with Zod
- Compile-time error detection

**User-Centric Communication**
- Clear, actionable messages
- Context-aware guidance
- Consistent tone and voice

**Observability by Default**
- Automatic correlation ID propagation
- Structured logging integration
- Metrics and tracing hooks

### 1.2 Error Handling Tenets

1. **Every error must have a correlation ID** for distributed tracing
2. **Every error must have a severity level** for filtering and alerting
3. **Every error must be loggable** without exposing PII
4. **User-facing messages must be clear and actionable**
5. **Internal errors must preserve full context** for debugging
6. **Errors must be testable** with minimal setup

---

## 2. Core Architecture

### 2.1 Error Class Hierarchy (Enhanced)

```typescript
/**
 * Base error class with standardized metadata
 */
abstract class BaseError extends Error {
  // Core identification
  readonly code: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;

  // Observability
  readonly correlationId: string;
  readonly timestamp: Date;
  readonly context: ErrorContext;

  // User communication
  readonly userMessage: string;
  readonly developerMessage: string;
  readonly helpUrl?: string;

  // Retry policy
  readonly retryable: boolean;
  readonly retryPolicy?: RetryPolicy;

  constructor(options: BaseErrorOptions) {
    super(options.developerMessage);
    this.name = this.constructor.name;
    this.code = options.code;
    this.severity = options.severity ?? 'ERROR';
    this.category = this.getCategory();
    this.correlationId = options.correlationId ?? generateCorrelationId();
    this.timestamp = new Date();
    this.context = {
      ...options.context,
      environment: process.env.NODE_ENV,
      service: options.context?.service ?? 'unknown',
    };
    this.userMessage = options.userMessage ?? this.getDefaultUserMessage();
    this.developerMessage = options.developerMessage;
    this.helpUrl = options.helpUrl ?? this.getHelpUrl();
    this.retryable = options.retryable ?? this.isRetryableByDefault();
    this.retryPolicy = options.retryPolicy;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Override in subclasses to define error category
   */
  protected abstract getCategory(): ErrorCategory;

  /**
   * Override to provide default user message
   */
  protected abstract getDefaultUserMessage(): string;

  /**
   * Override to define retryability
   */
  protected isRetryableByDefault(): boolean {
    return false;
  }

  /**
   * Generate help documentation URL
   */
  protected getHelpUrl(): string | undefined {
    return `https://docs.snapback.dev/errors/${this.code.toLowerCase()}`;
  }

  /**
   * Serialize for logging (PII-safe)
   */
  toLogObject(): LoggableError {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      category: this.category,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      message: this.developerMessage,
      context: sanitizeContext(this.context),
      retryable: this.retryable,
      stack: this.stack,
    };
  }

  /**
   * Serialize for API responses (user-safe)
   */
  toAPIResponse(): APIErrorResponse {
    return {
      type: this.category,
      code: this.code,
      message: this.userMessage,
      severity: this.severity,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      helpUrl: this.helpUrl,
      retryable: this.retryable,
      details: this.getSafeDetails(),
    };
  }

  /**
   * Get details safe for public consumption
   */
  protected getSafeDetails(): Record<string, unknown> {
    return {};
  }
}
```

### 2.2 Type Definitions

```typescript
/**
 * Error severity levels (aligned with logging)
 */
type ErrorSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

/**
 * Error categories (based on HTTP semantics + domain)
 */
type ErrorCategory =
  | 'CLIENT_ERROR'      // 4xx-equivalent (user input, auth)
  | 'SERVER_ERROR'      // 5xx-equivalent (internal failures)
  | 'VALIDATION_ERROR'  // Schema/business rule violations
  | 'NETWORK_ERROR'     // Connectivity, timeouts
  | 'EXTERNAL_ERROR'    // Third-party service failures
  | 'CONFIGURATION_ERROR' // System setup issues
  | 'STORAGE_ERROR'     // Database/filesystem issues
  | 'UNKNOWN_ERROR';    // Unclassified

/**
 * Standard error context (baseline for all errors)
 */
interface ErrorContext {
  // Service identification
  service: string;          // 'vscode-extension' | 'mcp-server' | 'web-app' | 'api'
  environment: string;      // 'development' | 'staging' | 'production'

  // Request tracking
  requestId?: string;       // HTTP request ID (if applicable)
  sessionId?: string;       // User session ID
  userId?: string;          // User identifier (hashed for privacy)
  organizationId?: string;  // Organization ID

  // Execution context
  operation?: string;       // Operation being performed
  resource?: string;        // Resource being accessed
  filePath?: string;        // File path (for file operations)

  // Additional metadata (domain-specific)
  [key: string]: unknown;
}

/**
 * Retry policy configuration
 */
interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes?: number[];
}

/**
 * RFC 7807-inspired API error response
 */
interface APIErrorResponse {
  type: ErrorCategory;
  code: string;
  message: string;
  severity: ErrorSeverity;
  correlationId: string;
  timestamp: string;
  helpUrl?: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * Loggable error format (PII-safe)
 */
interface LoggableError {
  name: string;
  code: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  correlationId: string;
  timestamp: string;
  message: string;
  context: Record<string, unknown>;
  retryable: boolean;
  stack?: string;
}
```

### 2.3 Domain Error Examples (Enhanced)

```typescript
/**
 * Authentication domain errors
 */
class AuthenticationError extends BaseError {
  protected getCategory(): ErrorCategory {
    return 'CLIENT_ERROR';
  }

  protected getDefaultUserMessage(): string {
    return 'Authentication failed. Please check your credentials and try again.';
  }

  protected isRetryableByDefault(): boolean {
    return false; // Auth errors typically not retryable
  }

  // Builder pattern for common scenarios
  static invalidCredentials(
    userId?: string,
    correlationId?: string
  ): AuthenticationError {
    return new AuthenticationError({
      code: 'INVALID_CREDENTIALS',
      severity: 'WARN',
      userMessage: 'Invalid email or password. Please try again.',
      developerMessage: 'Authentication failed: invalid credentials',
      context: { userId: userId ? hashUserId(userId) : undefined },
      correlationId,
      helpUrl: 'https://docs.snapback.dev/errors/invalid-credentials',
    });
  }

  static tokenExpired(
    token: string,
    correlationId?: string
  ): AuthenticationError {
    return new AuthenticationError({
      code: 'TOKEN_EXPIRED',
      severity: 'WARN',
      userMessage: 'Your session has expired. Please sign in again.',
      developerMessage: 'JWT token expired',
      context: { tokenType: getTokenType(token) },
      correlationId,
      retryable: false,
      helpUrl: 'https://docs.snapback.dev/errors/token-expired',
    });
  }

  static apiKeyInvalid(
    keyPrefix: string,
    correlationId?: string
  ): AuthenticationError {
    return new AuthenticationError({
      code: 'INVALID_API_KEY',
      severity: 'ERROR',
      userMessage: 'Invalid API key. Check your configuration.',
      developerMessage: `API key validation failed for key: ${keyPrefix}***`,
      context: { keyPrefix },
      correlationId,
      helpUrl: 'https://docs.snapback.dev/errors/invalid-api-key',
    });
  }
}

/**
 * Validation domain errors
 */
class ValidationError extends BaseError {
  readonly validationErrors: ValidationFailure[];

  constructor(options: ValidationErrorOptions) {
    super(options);
    this.validationErrors = options.validationErrors ?? [];
  }

  protected getCategory(): ErrorCategory {
    return 'VALIDATION_ERROR';
  }

  protected getDefaultUserMessage(): string {
    if (this.validationErrors.length === 1) {
      return this.validationErrors[0].message;
    }
    return `${this.validationErrors.length} validation errors occurred`;
  }

  protected getSafeDetails(): Record<string, unknown> {
    return {
      errors: this.validationErrors.map(e => ({
        field: e.field,
        message: e.message,
        code: e.code,
      })),
    };
  }

  // Builder pattern for Zod errors
  static fromZodError(
    zodError: z.ZodError,
    correlationId?: string
  ): ValidationError {
    const validationErrors: ValidationFailure[] = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: undefined, // Don't expose actual value for security
    }));

    return new ValidationError({
      code: 'VALIDATION_FAILED',
      severity: 'WARN',
      userMessage: `Validation failed: ${validationErrors.map(e => e.message).join(', ')}`,
      developerMessage: 'Schema validation failed',
      validationErrors,
      context: { validationCount: validationErrors.length },
      correlationId,
    });
  }

  // Builder for single field errors
  static invalidField(
    field: string,
    message: string,
    value?: unknown,
    correlationId?: string
  ): ValidationError {
    return new ValidationError({
      code: 'INVALID_FIELD',
      severity: 'WARN',
      userMessage: message,
      developerMessage: `Field validation failed: ${field}`,
      validationErrors: [{ field, message, code: 'invalid', value }],
      context: { field },
      correlationId,
    });
  }
}

/**
 * Network domain errors (with retry policy)
 */
class NetworkError extends BaseError {
  readonly statusCode?: number;
  readonly url?: string;

  constructor(options: NetworkErrorOptions) {
    super(options);
    this.statusCode = options.statusCode;
    this.url = options.url;
  }

  protected getCategory(): ErrorCategory {
    return 'NETWORK_ERROR';
  }

  protected getDefaultUserMessage(): string {
    if (this.statusCode && this.statusCode >= 500) {
      return 'Service temporarily unavailable. Please try again in a moment.';
    }
    return 'Network error occurred. Please check your connection.';
  }

  protected isRetryableByDefault(): boolean {
    // Retry on 5xx, timeouts, and specific 4xx
    if (!this.statusCode) return true; // Timeout
    return this.statusCode >= 500 || this.statusCode === 429 || this.statusCode === 408;
  }

  // Builder with automatic retry policy
  static timeout(
    url: string,
    timeoutMs: number,
    correlationId?: string
  ): NetworkError {
    return new NetworkError({
      code: 'NETWORK_TIMEOUT',
      severity: 'WARN',
      userMessage: 'Request timed out. Please try again.',
      developerMessage: `Network timeout after ${timeoutMs}ms`,
      url,
      context: { url, timeoutMs },
      correlationId,
      retryable: true,
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      },
    });
  }

  static serviceUnavailable(
    url: string,
    statusCode: number,
    correlationId?: string
  ): NetworkError {
    return new NetworkError({
      code: 'SERVICE_UNAVAILABLE',
      severity: 'ERROR',
      userMessage: 'Service temporarily unavailable. Please try again shortly.',
      developerMessage: `Service returned ${statusCode} for ${url}`,
      url,
      statusCode,
      context: { url, statusCode },
      correlationId,
      retryable: true,
      retryPolicy: {
        maxAttempts: 5,
        backoffStrategy: 'exponential',
        initialDelayMs: 2000,
        maxDelayMs: 30000,
      },
    });
  }
}
```

---

## 3. Error Metadata Standard

### 3.1 Correlation ID Generation

```typescript
/**
 * Generate unique correlation ID for request tracing
 */
function generateCorrelationId(): string {
  // Format: {service}-{timestamp}-{random}
  // Example: vscode-1700000000000-a1b2c3d4
  const service = getServiceIdentifier();
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');

  return `${service}-${timestamp}-${random}`;
}

/**
 * Extract correlation ID from various sources
 */
function extractCorrelationId(
  request?: Request | NextRequest,
  context?: ErrorContext
): string | undefined {
  // Priority order:
  // 1. Explicit context
  if (context?.correlationId) return context.correlationId;

  // 2. HTTP headers
  if (request) {
    const header = request.headers.get('X-Correlation-ID')
                || request.headers.get('X-Request-ID');
    if (header) return header;
  }

  // 3. Generate new
  return generateCorrelationId();
}
```

### 3.2 Context Enrichment

```typescript
/**
 * Automatically enrich error context with ambient information
 */
function enrichErrorContext(
  baseContext: Partial<ErrorContext>,
  request?: Request | NextRequest
): ErrorContext {
  const context: ErrorContext = {
    service: getServiceIdentifier(),
    environment: process.env.NODE_ENV ?? 'development',
    ...baseContext,
  };

  // Add request context if available
  if (request) {
    context.requestId = request.headers.get('X-Request-ID') ?? undefined;
    context.sessionId = extractSessionId(request);
    context.userId = extractUserId(request);
    context.organizationId = extractOrganizationId(request);
  }

  // Add runtime context
  context.nodeVersion = process.version;
  context.platform = process.platform;

  return context;
}

/**
 * Sanitize context for logging (remove PII)
 */
function sanitizeContext(context: ErrorContext): Record<string, unknown> {
  const sanitized = { ...context };

  // Hash identifiers
  if (sanitized.userId) {
    sanitized.userId = hashUserId(sanitized.userId);
  }
  if (sanitized.sessionId) {
    sanitized.sessionId = hashSessionId(sanitized.sessionId);
  }

  // Redact sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
```

---

## 4. API Error Response Schema

### 4.1 ORPC Error Handler (Standardized)

```typescript
/**
 * Standard ORPC error handler
 */
export function handleORPCError(
  error: unknown,
  context: {
    procedureName: string;
    userId?: string;
    organizationId?: string;
    correlationId?: string;
  }
): never {
  const correlationId = context.correlationId ?? generateCorrelationId();

  // Already a BaseError - enhance and rethrow
  if (error instanceof BaseError) {
    logger.error('ORPC procedure error', error.toLogObject());
    throw new TRPCError({
      code: mapErrorCategoryToTRPCCode(error.category),
      message: error.userMessage,
      cause: error,
      // Attach standardized metadata
      data: error.toAPIResponse(),
    });
  }

  // Zod validation error
  if (error instanceof z.ZodError) {
    const validationError = ValidationError.fromZodError(error, correlationId);
    logger.warn('ORPC validation error', validationError.toLogObject());
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: validationError.userMessage,
      cause: validationError,
      data: validationError.toAPIResponse(),
    });
  }

  // Unknown error - wrap in generic error
  const unknownError = new UnknownError({
    code: 'INTERNAL_SERVER_ERROR',
    severity: 'ERROR',
    userMessage: 'An unexpected error occurred. Please try again.',
    developerMessage: error instanceof Error ? error.message : String(error),
    context: {
      service: 'api',
      operation: context.procedureName,
      userId: context.userId,
      organizationId: context.organizationId,
    },
    correlationId,
  });

  logger.error('ORPC unknown error', {
    ...unknownError.toLogObject(),
    originalError: error instanceof Error ? error.stack : String(error),
  });

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: unknownError.userMessage,
    cause: unknownError,
    data: unknownError.toAPIResponse(),
  });
}

/**
 * Map error categories to TRPC codes
 */
function mapErrorCategoryToTRPCCode(category: ErrorCategory): TRPC_ERROR_CODE_KEY {
  const mapping: Record<ErrorCategory, TRPC_ERROR_CODE_KEY> = {
    CLIENT_ERROR: 'BAD_REQUEST',
    VALIDATION_ERROR: 'BAD_REQUEST',
    SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    NETWORK_ERROR: 'INTERNAL_SERVER_ERROR',
    EXTERNAL_ERROR: 'INTERNAL_SERVER_ERROR',
    CONFIGURATION_ERROR: 'INTERNAL_SERVER_ERROR',
    STORAGE_ERROR: 'INTERNAL_SERVER_ERROR',
    UNKNOWN_ERROR: 'INTERNAL_SERVER_ERROR',
  };

  return mapping[category];
}

/**
 * Usage in ORPC procedures
 */
export const getUserAnalytics = publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input, ctx }) => {
    const correlationId = generateCorrelationId();

    try {
      const analytics = await db.query.analytics.findMany({
        where: eq(analytics.userId, input.userId),
      });

      return analytics;
    } catch (error) {
      handleORPCError(error, {
        procedureName: 'getUserAnalytics',
        userId: input.userId,
        organizationId: ctx.organizationId,
        correlationId,
      });
    }
  });
```

### 4.2 Next.js API Route Error Handler

```typescript
/**
 * Standard Next.js API error handler
 */
export function handleAPIError(
  error: unknown,
  request: NextRequest
): NextResponse<APIErrorResponse> {
  const correlationId = extractCorrelationId(request);

  // Already a BaseError
  if (error instanceof BaseError) {
    logger.error('API route error', error.toLogObject());
    return NextResponse.json(
      error.toAPIResponse(),
      { status: getHTTPStatusCode(error.category) }
    );
  }

  // Unknown error
  const unknownError = new UnknownError({
    code: 'INTERNAL_SERVER_ERROR',
    severity: 'ERROR',
    userMessage: 'An unexpected error occurred',
    developerMessage: error instanceof Error ? error.message : String(error),
    context: enrichErrorContext({ service: 'web-app' }, request),
    correlationId,
  });

  logger.error('API route unknown error', unknownError.toLogObject());

  return NextResponse.json(
    unknownError.toAPIResponse(),
    { status: 500 }
  );
}

/**
 * Map error categories to HTTP status codes
 */
function getHTTPStatusCode(category: ErrorCategory): number {
  const mapping: Record<ErrorCategory, number> = {
    CLIENT_ERROR: 400,
    VALIDATION_ERROR: 400,
    SERVER_ERROR: 500,
    NETWORK_ERROR: 502,
    EXTERNAL_ERROR: 502,
    CONFIGURATION_ERROR: 500,
    STORAGE_ERROR: 500,
    UNKNOWN_ERROR: 500,
  };

  return mapping[category];
}
```

### 4.3 Middleware Error Handling (Fix for Selected Code)

```typescript
/**
 * Enhanced middleware with error handling
 */
export async function updateSession(request: NextRequest) {
  const correlationId = extractCorrelationId(request);

  try {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options) {
            request.cookies.set({ name, value: "", ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value: "", ...options });
          },
        },
      },
    );

    // Error handling for auth check
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      logger.warn('Middleware auth check failed', {
        correlationId,
        error: error.message,
        path: request.nextUrl.pathname,
      });

      // Don't throw - let the request continue but clear cookies
      response.cookies.delete('sb-access-token');
      response.cookies.delete('sb-refresh-token');
    }

    return response;
  } catch (error) {
    // Unexpected errors in middleware
    logger.error('Middleware unexpected error', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      path: request.nextUrl.pathname,
    });

    // Return response anyway - don't block requests
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
}
```

---

## 5. User Message Templates

### 5.1 Message Structure Guidelines

**Template Format:**
```
[Clear Description] [Context] [Action]
```

**Examples:**
- ✅ "File not found at '/path/to/file'. Please check the path and try again."
- ✅ "Session expired. Please sign in again to continue."
- ✅ "Rate limit exceeded. Wait 60 seconds before retrying."
- ❌ "Error 403" (too technical)
- ❌ "Something went wrong" (too vague)
- ❌ "VALIDATION_FAILED" (error code not message)

### 5.2 Domain-Specific Templates

**Authentication:**
```typescript
const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  UNAUTHORIZED: 'You don't have permission to access this resource.',
  INVALID_API_KEY: 'Invalid API key. Check your configuration in Settings > API Keys.',
  RATE_LIMITED: 'Too many login attempts. Please wait {retryAfter} seconds.',
} as const;
```

**Validation:**
```typescript
const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: '{field} is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  PASSWORD_TOO_SHORT: 'Password must be at least {minLength} characters.',
  FILE_TOO_LARGE: 'File size must be less than {maxSize}MB.',
  INVALID_FORMAT: '{field} format is invalid. Expected: {format}.',
} as const;
```

**Network:**
```typescript
const NETWORK_MESSAGES = {
  TIMEOUT: 'Request timed out. Please check your connection and try again.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again in a moment.',
  CONNECTION_REFUSED: 'Unable to connect to server. Please check your network.',
  RATE_LIMITED: 'Too many requests. Please wait {retryAfter} seconds before retrying.',
} as const;
```

**Storage:**
```typescript
const STORAGE_MESSAGES = {
  FILE_NOT_FOUND: 'File not found at {path}. Please check the path.',
  PERMISSION_DENIED: 'Permission denied accessing {path}. Check file permissions.',
  DISK_FULL: 'Storage full. Please free up space and try again.',
  QUOTA_EXCEEDED: 'Storage quota exceeded. Upgrade your plan or delete old snapshots.',
} as const;
```

### 5.3 Message Formatter Utility

```typescript
/**
 * Format error message with template variables
 */
function formatMessage(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return String(variables[key] ?? match);
  });
}

/**
 * Usage example
 */
ValidationError.passwordTooShort(8, correlationId) // minLength = 8
// userMessage: "Password must be at least 8 characters."

NetworkError.rateLimited(60, correlationId) // retryAfter = 60
// userMessage: "Too many requests. Please wait 60 seconds before retrying."
```

---

## 6. Developer Experience Enhancements

### 6.1 Error Builder Pattern

```typescript
/**
 * Centralized error factory with builder pattern
 */
export const errors = {
  auth: {
    invalidCredentials: (userId?: string, correlationId?: string) =>
      AuthenticationError.invalidCredentials(userId, correlationId),

    tokenExpired: (token: string, correlationId?: string) =>
      AuthenticationError.tokenExpired(token, correlationId),

    apiKeyInvalid: (keyPrefix: string, correlationId?: string) =>
      AuthenticationError.apiKeyInvalid(keyPrefix, correlationId),
  },

  validation: {
    fromZod: (zodError: z.ZodError, correlationId?: string) =>
      ValidationError.fromZodError(zodError, correlationId),

    invalidField: (field: string, message: string, correlationId?: string) =>
      ValidationError.invalidField(field, message, undefined, correlationId),

    requiredField: (field: string, correlationId?: string) =>
      ValidationError.invalidField(
        field,
        formatMessage(VALIDATION_MESSAGES.REQUIRED_FIELD, { field }),
        undefined,
        correlationId
      ),
  },

  network: {
    timeout: (url: string, timeoutMs: number, correlationId?: string) =>
      NetworkError.timeout(url, timeoutMs, correlationId),

    serviceUnavailable: (url: string, statusCode: number, correlationId?: string) =>
      NetworkError.serviceUnavailable(url, statusCode, correlationId),
  },

  storage: {
    fileNotFound: (path: string, correlationId?: string) =>
      StorageError.fileNotFound(path, correlationId),

    permissionDenied: (path: string, operation: string, correlationId?: string) =>
      StorageError.permissionDenied(path, operation, correlationId),
  },
};

/**
 * Usage - simple and consistent
 */
// Before (verbose)
throw new AuthenticationError({
  code: 'INVALID_CREDENTIALS',
  severity: 'WARN',
  userMessage: 'Invalid email or password',
  developerMessage: 'Auth failed',
  context: { userId: 'user123' },
});

// After (concise)
throw errors.auth.invalidCredentials('user123');
```

### 6.2 Type Guards (Centralized Export)

```typescript
/**
 * Type guards for error checking
 * Export from @snapback/contracts/errors
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

export function isRetryableError(error: unknown): boolean {
  return error instanceof BaseError && error.retryable;
}

/**
 * Usage in error handling
 */
try {
  await someOperation();
} catch (error) {
  if (isAuthenticationError(error)) {
    // Handle auth errors
    redirectToLogin();
  } else if (isValidationError(error)) {
    // Show validation errors
    displayValidationErrors(error.validationErrors);
  } else if (isRetryableError(error)) {
    // Retry the operation
    await retryOperation(error.retryPolicy);
  } else {
    // Generic error handling
    showErrorToast('An unexpected error occurred');
  }
}
```

### 6.3 Error Catalog Documentation

Create `ERROR_CATALOG.md`:

```markdown
# SnapBack Error Catalog

## Authentication Errors

### INVALID_CREDENTIALS
- **Category:** CLIENT_ERROR
- **Severity:** WARN
- **User Message:** "Invalid email or password. Please try again."
- **Cause:** User provided incorrect email/password combination
- **Resolution:**
  - Verify email and password are correct
  - Check Caps Lock is off
  - Use "Forgot Password" if needed
- **Retryable:** No
- **Help:** https://docs.snapback.dev/errors/invalid-credentials

### TOKEN_EXPIRED
- **Category:** CLIENT_ERROR
- **Severity:** WARN
- **User Message:** "Your session has expired. Please sign in again."
- **Cause:** JWT token exceeded expiration time
- **Resolution:**
  - Sign in again to get new token
  - Enable "Remember me" for longer sessions
- **Retryable:** No
- **Help:** https://docs.snapback.dev/errors/token-expired

[... all error codes documented ...]
```

---

## 7. Observability Integration

### 7.1 Structured Logging Integration

```typescript
/**
 * Log error with full context
 */
export function logError(error: BaseError | Error, additionalContext?: Record<string, unknown>) {
  if (error instanceof BaseError) {
    const logObject = error.toLogObject();

    logger[getSeverityLevel(error.severity)]({
      ...logObject,
      ...additionalContext,
    }, error.developerMessage);
  } else {
    logger.error({
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...additionalContext,
    }, 'Unhandled error');
  }
}

function getSeverityLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
  return severity.toLowerCase() as 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}
```

### 7.2 Metrics Collection

```typescript
/**
 * Error metrics (Prometheus-compatible)
 */
export const errorMetrics = {
  errorCount: new Counter({
    name: 'snapback_errors_total',
    help: 'Total number of errors',
    labelNames: ['category', 'code', 'severity', 'service'],
  }),

  errorDuration: new Histogram({
    name: 'snapback_error_handling_duration_seconds',
    help: 'Time spent handling errors',
    labelNames: ['category', 'service'],
  }),
};

/**
 * Track error occurrence
 */
export function trackError(error: BaseError) {
  errorMetrics.errorCount.inc({
    category: error.category,
    code: error.code,
    severity: error.severity,
    service: error.context.service,
  });
}
```

### 7.3 External Monitoring Integration (Sentry)

```typescript
/**
 * Send error to Sentry with full context
 */
export function reportToSentry(error: BaseError | Error) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureException(error, {
    level: error instanceof BaseError
      ? mapSeverityToSentryLevel(error.severity)
      : 'error',

    tags: error instanceof BaseError ? {
      errorCode: error.code,
      errorCategory: error.category,
      service: error.context.service,
    } : {},

    contexts: error instanceof BaseError ? {
      error: {
        correlationId: error.correlationId,
        retryable: error.retryable,
        timestamp: error.timestamp.toISOString(),
      },
      ...error.context,
    } : {},

    fingerprint: error instanceof BaseError
      ? [error.code, error.category]
      : [error.name, error.message],
  });
}

function mapSeverityToSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
  const mapping: Record<ErrorSeverity, Sentry.SeverityLevel> = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warning',
    ERROR: 'error',
    FATAL: 'fatal',
  };
  return mapping[severity];
}
```

---

## 8. Resilience Patterns

### 8.1 Retry Mechanism with Circuit Breaker

```typescript
/**
 * Retry operation with circuit breaker
 */
export class RetryManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  async retry<T>(
    operation: () => Promise<T>,
    policy: RetryPolicy,
    operationKey: string
  ): Promise<T> {
    // Get or create circuit breaker
    let breaker = this.circuitBreakers.get(operationKey);
    if (!breaker) {
      breaker = new CircuitBreaker(operationKey);
      this.circuitBreakers.set(operationKey, breaker);
    }

    // Check circuit state
    if (breaker.isOpen()) {
      throw new NetworkError({
        code: 'CIRCUIT_BREAKER_OPEN',
        severity: 'ERROR',
        userMessage: 'Service temporarily unavailable. Please try again later.',
        developerMessage: `Circuit breaker open for ${operationKey}`,
        context: { operationKey, breakerState: breaker.state },
        retryable: false,
      });
    }

    // Attempt operation with retries
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
      try {
        const result = await operation();
        breaker.recordSuccess();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        breaker.recordFailure();

        // Don't retry if not retryable
        if (error instanceof BaseError && !error.retryable) {
          throw error;
        }

        // Last attempt - throw
        if (attempt === policy.maxAttempts - 1) {
          throw error;
        }

        // Wait before retry
        const delay = this.calculateDelay(attempt, policy);
        await this.sleep(delay);

        logger.warn('Retrying operation', {
          operationKey,
          attempt: attempt + 1,
          maxAttempts: policy.maxAttempts,
          delayMs: delay,
        });
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number, policy: RetryPolicy): number {
    let delay: number;

    switch (policy.backoffStrategy) {
      case 'exponential':
        delay = Math.min(
          policy.initialDelayMs * Math.pow(2, attempt),
          policy.maxDelayMs
        );
        break;
      case 'linear':
        delay = Math.min(
          policy.initialDelayMs * (attempt + 1),
          policy.maxDelayMs
        );
        break;
      case 'fixed':
        delay = policy.initialDelayMs;
        break;
    }

    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;

  private readonly failureThreshold = 5;
  private readonly successThreshold = 2;
  private readonly timeoutMs = 60000; // 1 minute

  constructor(private readonly key: string) {}

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      // Check if timeout has passed
      if (this.lastFailureTime) {
        const elapsed = Date.now() - this.lastFailureTime.getTime();
        if (elapsed >= this.timeoutMs) {
          this.state = 'HALF_OPEN';
          this.successCount = 0;
          logger.info('Circuit breaker entering half-open state', {
            key: this.key,
          });
          return false;
        }
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logger.info('Circuit breaker closed', { key: this.key });
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      logger.warn('Circuit breaker reopened from half-open', {
        key: this.key,
      });
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn('Circuit breaker opened', {
        key: this.key,
        failureCount: this.failureCount,
      });
    }
  }
}

/**
 * Global retry manager instance
 */
export const retryManager = new RetryManager();
```

### 8.2 Usage Examples

```typescript
/**
 * API call with retry
 */
async function fetchUserData(userId: string): Promise<User> {
  const correlationId = generateCorrelationId();

  try {
    return await retryManager.retry(
      async () => {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw NetworkError.serviceUnavailable(
            `/api/users/${userId}`,
            response.status,
            correlationId
          );
        }
        return response.json();
      },
      {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      },
      `fetchUser-${userId}`
    );
  } catch (error) {
    logError(error as Error, { userId, correlationId });
    throw error;
  }
}

/**
 * Storage operation with retry
 */
async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  const correlationId = generateCorrelationId();

  try {
    return await retryManager.retry(
      async () => {
        await storage.save(snapshot);
      },
      {
        maxAttempts: 5,
        backoffStrategy: 'exponential',
        initialDelayMs: 500,
        maxDelayMs: 5000,
      },
      'saveSnapshot'
    );
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw errors.storage.saveFailed(
      snapshot.filePath,
      error instanceof Error ? error.message : String(error),
      correlationId
    );
  }
}
```

---

## 9. Testing Strategy

### 9.1 Error Testing Utilities

```typescript
/**
 * Error factory for testing
 */
export const testErrors = {
  /**
   * Create mock authentication error
   */
  mockAuthError: (overrides?: Partial<AuthenticationError>): AuthenticationError => {
    return new AuthenticationError({
      code: 'TEST_AUTH_ERROR',
      severity: 'ERROR',
      userMessage: 'Test auth error',
      developerMessage: 'Test auth error',
      context: { service: 'test' },
      correlationId: 'test-correlation-id',
      ...overrides,
    });
  },

  /**
   * Create mock validation error
   */
  mockValidationError: (
    fields?: string[],
    overrides?: Partial<ValidationError>
  ): ValidationError => {
    const validationErrors = (fields ?? ['testField']).map(field => ({
      field,
      message: `Invalid ${field}`,
      code: 'invalid',
    }));

    return new ValidationError({
      code: 'TEST_VALIDATION_ERROR',
      severity: 'WARN',
      userMessage: 'Test validation error',
      developerMessage: 'Test validation error',
      validationErrors,
      context: { service: 'test' },
      correlationId: 'test-correlation-id',
      ...overrides,
    });
  },

  /**
   * Create mock network error
   */
  mockNetworkError: (
    statusCode?: number,
    retryable = true
  ): NetworkError => {
    return new NetworkError({
      code: 'TEST_NETWORK_ERROR',
      severity: 'ERROR',
      userMessage: 'Test network error',
      developerMessage: 'Test network error',
      statusCode,
      url: 'https://test.example.com',
      context: { service: 'test' },
      correlationId: 'test-correlation-id',
      retryable,
    });
  },
};

/**
 * Error assertion utilities
 */
export const errorAssertions = {
  /**
   * Assert error has required metadata
   */
  assertHasMetadata(error: BaseError): void {
    expect(error.code).toBeDefined();
    expect(error.correlationId).toBeDefined();
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.severity).toBeDefined();
    expect(error.category).toBeDefined();
  },

  /**
   * Assert error is loggable without PII
   */
  assertPIISafe(error: BaseError): void {
    const logObject = error.toLogObject();
    const jsonString = JSON.stringify(logObject);

    // Should not contain sensitive patterns
    expect(jsonString).not.toMatch(/password/i);
    expect(jsonString).not.toMatch(/token/i);
    expect(jsonString).not.toMatch(/secret/i);
    expect(jsonString).not.toMatch(/\b\d{16}\b/); // Credit card
    expect(jsonString).not.toMatch(/\b[\w-]+@[\w-]+\.[\w-]+\b/); // Full email
  },

  /**
   * Assert API response is user-safe
   */
  assertUserSafe(error: BaseError): void {
    const apiResponse = error.toAPIResponse();

    // Should have user-friendly message
    expect(apiResponse.message).toBeTruthy();
    expect(apiResponse.message.length).toBeGreaterThan(10);

    // Should not expose internals
    expect(apiResponse).not.toHaveProperty('stack');
    expect(apiResponse).not.toHaveProperty('developerMessage');
  },
};
```

### 9.2 Test Examples

```typescript
/**
 * Unit tests for error classes
 */
describe('AuthenticationError', () => {
  it('should create error with all required metadata', () => {
    const error = errors.auth.invalidCredentials('user123');

    errorAssertions.assertHasMetadata(error);
    expect(error.code).toBe('INVALID_CREDENTIALS');
    expect(error.category).toBe('CLIENT_ERROR');
    expect(error.retryable).toBe(false);
  });

  it('should produce PII-safe log output', () => {
    const error = errors.auth.invalidCredentials('user123');
    errorAssertions.assertPIISafe(error);
  });

  it('should produce user-safe API response', () => {
    const error = errors.auth.invalidCredentials('user123');
    errorAssertions.assertUserSafe(error);
  });
});

/**
 * Integration tests for error handling
 */
describe('ORPC Error Handling', () => {
  it('should handle validation errors correctly', async () => {
    const { result } = renderHook(() => useORPCMutation('testProcedure'));

    // Trigger error
    await act(async () => {
      try {
        await result.current.mutateAsync({ invalid: 'data' });
      } catch (error) {
        expect(isValidationError(error)).toBe(true);
        expect(error.toAPIResponse()).toMatchObject({
          type: 'VALIDATION_ERROR',
          code: 'VALIDATION_FAILED',
          retryable: false,
        });
      }
    });
  });

  it('should attach correlation IDs', async () => {
    const { result } = renderHook(() => useORPCQuery('getUser', { userId: 'test' }));

    await waitFor(() => {
      if (result.current.error) {
        const apiResponse = result.current.error.toAPIResponse();
        expect(apiResponse.correlationId).toMatch(/^vscode-\d+-[a-f0-9]+$/);
      }
    });
  });
});

/**
 * E2E tests for error scenarios
 */
describe('Error Handling E2E', () => {
  it('should display user-friendly error messages', async () => {
    const { page } = await setupE2ETest();

    // Trigger auth error
    await page.fill('[data-testid="email"]', 'invalid@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="submit"]');

    // Check error message
    await expect(page.locator('[role="alert"]')).toContainText(
      'Invalid email or password'
    );

    // Should not show technical details
    await expect(page.locator('[role="alert"]')).not.toContainText('INVALID_CREDENTIALS');
    await expect(page.locator('[role="alert"]')).not.toContainText('correlationId');
  });

  it('should retry retryable errors', async () => {
    const networkMock = setupNetworkMock();

    // Fail first 2 attempts, succeed on 3rd
    networkMock
      .onGet('/api/data')
      .replyOnce(503)
      .onGet('/api/data')
      .replyOnce(503)
      .onGet('/api/data')
      .reply(200, { data: 'success' });

    const result = await fetchUserData('user123');

    expect(result.data).toBe('success');
    expect(networkMock.history.get.length).toBe(3);
  });
});
```

---

## 10. Migration Path

### 10.1 Phase 1: Foundation (Week 1-2)

**Tasks:**
1. Create new error base classes in `packages/contracts/errors`
2. Implement correlation ID generation utility
3. Add error metadata types and schemas
4. Create error builder pattern (`errors` object)
5. Write comprehensive tests for error classes

**Deliverables:**
- `packages/contracts/src/errors/base.ts`
- `packages/contracts/src/errors/types.ts`
- `packages/contracts/src/errors/builders.ts`
- `packages/contracts/src/errors/utils.ts`
- Test suite with >90% coverage

**Migration Strategy:**
- Keep existing error classes functioning
- New code uses new error system
- Gradual migration of existing code

### 10.2 Phase 2: API Layer (Week 3-4)

**Tasks:**
1. Implement standardized ORPC error handler
2. Update all ORPC procedures to use new handler
3. Add correlation ID middleware
4. Update API error response schema
5. Add error response tests

**Deliverables:**
- `packages/api/src/errors/handler.ts`
- Updated ORPC procedures (11 total)
- Correlation ID middleware
- Integration tests

**Breaking Changes:**
- API error response format changes (version bump)
- Clients must handle new error structure

### 10.3 Phase 3: Application Layer (Week 5-6)

**Tasks:**
1. Update VSCode extension error handling
2. Update MCP server error handling
3. Update web app error handling
4. Add React Error Boundaries with new errors
5. Update CLI error formatting

**Deliverables:**
- Updated error handling in all applications
- Consistent error UI components
- User message templates
- E2E tests for error scenarios

### 10.4 Phase 4: Observability (Week 7-8)

**Tasks:**
1. Integrate error logging with correlation IDs
2. Add error metrics collection
3. Implement Sentry integration
4. Add circuit breaker implementation
5. Create error monitoring dashboard

**Deliverables:**
- `packages/infrastructure/src/errors/logging.ts`
- `packages/infrastructure/src/errors/metrics.ts`
- `packages/infrastructure/src/errors/monitoring.ts`
- Circuit breaker implementation
- Grafana dashboard for errors

### 10.5 Phase 5: Documentation & DX (Week 9-10)

**Tasks:**
1. Create ERROR_CATALOG.md
2. Write migration guide for developers
3. Add JSDoc comments to all error classes
4. Create error testing utilities
5. Update all CLAUDE.md files

**Deliverables:**
- ERROR_CATALOG.md (all error codes documented)
- MIGRATION_GUIDE.md
- Testing utilities in `packages/contracts/testing`
- Updated documentation

---

## 11. Implementation Roadmap

### 11.1 Priority Levels

**P0 - Critical (Weeks 1-4):**
- ✅ Error base classes with metadata
- ✅ Correlation ID system
- ✅ ORPC error handler standardization
- ✅ API error response schema

**P1 - High (Weeks 5-6):**
- ✅ Application layer migration
- ✅ Error builder pattern
- ✅ User message templates
- ✅ Type guard exports

**P2 - Medium (Weeks 7-8):**
- ✅ Circuit breaker implementation
- ✅ Retry manager
- ✅ Observability integration
- ✅ Error metrics

**P3 - Low (Weeks 9-10):**
- ✅ Error catalog documentation
- ✅ Testing utilities
- ✅ Developer experience polish
- ✅ i18n preparation

### 11.2 Success Metrics

**Code Quality:**
- [ ] 100% of errors have correlation IDs
- [ ] 100% of errors use standardized metadata
- [ ] 100% of API errors use RFC 7807 schema
- [ ] >90% test coverage for error handling

**User Experience:**
- [ ] All user messages follow template guidelines
- [ ] Error messages tested with users for clarity
- [ ] Consistent error UI across all applications
- [ ] <5% error message confusion in support tickets

**Developer Experience:**
- [ ] Error creation reduced to single line (builder pattern)
- [ ] Error catalog referenced in 80%+ of error handling code
- [ ] <10 minutes to add new error type
- [ ] Error testing utilities used in 100% of new tests

**Observability:**
- [ ] 100% of errors logged with correlation IDs
- [ ] Error metrics dashboard operational
- [ ] Sentry integration capturing all unhandled errors
- [ ] <2 minutes to trace error across distributed system

### 11.3 Rollback Plan

**If critical issues arise:**

1. **Phase 1-2 Issues:** Revert to original error classes
   - Feature flag: `FEATURE_NEW_ERROR_SYSTEM=false`
   - Fallback to existing `BaseError` in contracts

2. **Phase 3 Issues:** Application-specific rollback
   - Each app can independently disable new errors
   - Graceful degradation to old error handling

3. **Phase 4 Issues:** Disable observability features
   - Sentry integration can be disabled
   - Metrics collection optional
   - Circuit breaker can be bypassed

**Monitoring During Rollout:**
- Error rate should not increase >10%
- Response times should not degrade
- User-reported error confusion should decrease
- Developer velocity should improve after ramp-up

---

## 12. Appendix

### 12.1 Complete Error Class Reference

See [ERROR_HANDLING_AUDIT.md](./ERROR_HANDLING_AUDIT.md) for current state.

### 12.2 Before/After Examples

**Before:**
```typescript
// Inconsistent error creation
throw new Error('File not found');

// No correlation ID
throw new StorageError('STORAGE_ERROR', 'Failed to save');

// Verbose
throw new ValidationError({
  code: 'INVALID_INPUT',
  message: 'Email is required',
  details: { field: 'email' }
});

// Different formats across apps
logger.error('Error occurred', { error });
```

**After:**
```typescript
// Standardized with metadata
throw errors.storage.fileNotFound('/path/to/file', correlationId);

// Correlation ID automatic
const error = errors.auth.invalidCredentials(userId);
// error.correlationId = 'vscode-1700000000-a1b2c3d4'

// Concise builder
throw errors.validation.requiredField('email', correlationId);

// Consistent logging
logError(error, { additionalContext });
```

### 12.3 Error Decision Tree

```
Error Occurred
├─ Is it user's fault?
│  ├─ Yes → CLIENT_ERROR or VALIDATION_ERROR
│  │  └─ Use clear, actionable user message
│  └─ No → Is it our service?
│     ├─ Yes → SERVER_ERROR or STORAGE_ERROR
│     │  └─ Use apologetic, reassuring user message
│     └─ No → EXTERNAL_ERROR or NETWORK_ERROR
│        └─ Use explanatory, wait-oriented message
│
├─ Is it retryable?
│  ├─ Yes → Set retryable=true + retryPolicy
│  └─ No → Set retryable=false
│
├─ What severity?
│  ├─ User can continue → WARN
│  ├─ Feature broken → ERROR
│  └─ System broken → FATAL
│
└─ Generate correlation ID → Log → Report → Respond
```

### 12.4 Glossary

- **Correlation ID:** Unique identifier for tracing a request/operation across distributed system
- **Error Category:** High-level classification (CLIENT_ERROR, SERVER_ERROR, etc.)
- **Error Code:** Specific error identifier (UPPER_SNAKE_CASE, e.g., INVALID_CREDENTIALS)
- **Severity:** Impact level (DEBUG, INFO, WARN, ERROR, FATAL)
- **Retryable:** Whether operation can/should be retried automatically
- **Circuit Breaker:** Pattern to prevent cascading failures by temporarily disabling failing operations
- **PII:** Personally Identifiable Information (must be redacted in logs)
- **RFC 7807:** Standard for HTTP problem details (JSON error format)

---

## Summary

This proposal provides a **comprehensive, unified error handling architecture** for SnapBack that:

✅ **Preserves strengths** of current system (type safety, logging, security)
✅ **Addresses gaps** identified in audit (correlation IDs, metadata, UX)
✅ **Enhances DX** with builder pattern and error catalog
✅ **Improves observability** with structured logging and metrics
✅ **Adds resilience** with circuit breakers and retry policies
✅ **Maintains consistency** across all applications and layers

**Next Steps:**
1. Review and approve proposal
2. Begin Phase 1 implementation
3. Iterative rollout with metrics monitoring
4. Gather developer feedback and iterate

**Questions or feedback?** Contact the architecture team or open a discussion issue.
