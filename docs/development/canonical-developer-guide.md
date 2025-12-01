# SnapBack Developer Guide

This guide provides comprehensive documentation for developers working on the SnapBack codebase, focusing on the current architecture that uses industry-standard libraries.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Libraries](#core-libraries)
3. [Event System](#event-system)
4. [API Client](#api-client)
5. [Authentication](#authentication)
6. [Offline Queuing](#offline-queuing)
7. [Testing](#testing)

## Architecture Overview

SnapBack has been simplified to use industry-standard libraries instead of custom implementations:

- **HTTP Client**: [ky](https://github.com/sindresorhus/ky) with [cockatiel](https://github.com/connor4312/cockatiel) for resilience
- **Caching**: [lru-cache](https://github.com/isaacs/node-lru-cache) for authentication
- **Event System**: [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2) for inter-process communication
- **Offline Queuing**: [p-queue](https://github.com/sindresorhus/p-queue) for request queuing

This consolidation reduced ~1,650 lines of custom code and development time from 10-12 days to 6-8 days (40% faster).

## Core Libraries

### ky + cockatiel (HTTP Client with Resilience)

**Purpose**: Replace custom fetchAPI wrapper with a resilient HTTP client

**Location**: [apps/mcp-server/src/client/snapback-api.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/client/snapback-api.ts)

**Key Features**:
- Automatic retries with exponential backoff
- Circuit breaker pattern to prevent cascading failures
- Timeout handling
- Request/response logging

**Usage Example**:
```typescript
import { SnapBackAPIClient } from "./snapback-api.js";

const client = new SnapBackAPIClient("http://localhost:3000");
const result = await client.analyzeRisk({
  filePath: "/path/to/file.ts",
  content: "file content",
});
```

### lru-cache (Authentication Caching)

**Purpose**: Replace custom LRU cache with battle-tested implementation

**Location**: [apps/mcp-server/src/auth.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/auth.ts)

**Key Features**:
- Memory-efficient LRU eviction policy
- TTL (time-to-live) support
- Size limiting

**Usage Example**:
```typescript
import { AuthManager } from "./auth.js";

const authManager = new AuthManager();
const user = await authManager.authenticate(token);
```

## Event System

### EventEmitter2 (Inter-Process Communication)

**Purpose**: Replace TCP socket-based EventBus with EventEmitter2

**Location**: [packages/events/src/EventBusEventEmitter2.ts](file:///Users/user1/WebstreamProjects/SnapBack-Site/packages/events/src/EventBusEventEmitter2.ts)

**Key Features**:
- Publish/subscribe messaging pattern
- Request/response RPC capabilities
- Quality of Service (QoS) levels for event delivery guarantees
- Event persistence for replay and deduplication
- Wildcard event matching

### Event Types

```typescript
enum SnapBackEvent {
  SNAPSHOT_CREATED = "snapshot:created",
  SNAPSHOT_DELETED = "snapshot:deleted",
  SNAPSHOT_RESTORED = "snapshot:restored",
  PROTECTION_CHANGED = "protection:changed",
  FILE_PROTECTED = "file:protected",
  FILE_UNPROTECTED = "file:unprotected",
  ANALYSIS_REQUESTED = "analysis:requested",
  ANALYSIS_COMPLETED = "analysis:completed",
}
```

### Quality of Service (QoS) Levels

```typescript
enum QoSLevel {
  BEST_EFFORT = 0,      // At most once delivery (fire and forget)
  AT_LEAST_ONCE = 1,    // At least once delivery with acknowledgment
  EXACTLY_ONCE = 2,     // Exactly once delivery with deduplication
}
```

### Usage Examples

#### Publishing Events
```typescript
// Simple event publishing
eventBus.publish(SnapBackEvent.SNAPSHOT_CREATED, {
  id: "snap-123",
  filePath: "/test.ts",
  source: "extension",
  timestamp: Date.now(),
});

// QoS event publishing
const eventId = await eventBus.publishQoS(
  SnapBackEvent.PROTECTION_CHANGED,
  { filePath: "/test.ts", level: "block" },
  QoSLevel.AT_LEAST_ONCE
);
```

#### Subscribing to Events
```typescript
eventBus.on(SnapBackEvent.SNAPSHOT_CREATED, (payload) => {
  console.log("Snapshot created:", payload);
});
```

#### Request/Response Pattern
```typescript
// Server-side handler
eventBus.onRequest("get_stats", async (data) => {
  return {
    filePath: data.filePath,
    count: 5,
    level: "medium",
  };
});

// Client-side request
const response = await eventBus.request("get_stats", {
  filePath: "test/file.ts",
});
```

### Event Persistence

Events with QoS levels higher than BEST_EFFORT are persisted in-memory for replay and deduplication:

```typescript
// Replay events within a time range
await eventBus.replayEvents(
  startTime: 1704672000000,
  endTime: 1704675600000,
  eventType: "snapshot:created" // Optional filter
);
```

## API Client

### SnapBackAPIClient

**Purpose**: Provide resilient API communication with automatic retries and circuit breaking

**Location**: [apps/mcp-server/src/client/snapback-api.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/client/snapback-api.ts)

**Key Features**:
- Built on ky with cockatiel resilience policies
- Automatic retry with exponential backoff
- Circuit breaker to prevent cascading failures
- Request timeout handling
- Request/response logging

**Usage Example**:
```typescript
const apiClient = new SnapBackAPIClient("http://localhost:3000");
const result = await apiClient.analyzeRisk({
  filePath: "/path/to/file.ts",
  content: fileContent,
});
```

## Authentication

### AuthManager

**Purpose**: Handle authentication with efficient caching

**Location**: [apps/mcp-server/src/auth.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/mcp-server/src/auth.ts)

**Key Features**:
- Uses lru-cache for token caching
- TTL-based cache invalidation
- Memory-efficient LRU eviction

**Usage Example**:
```typescript
const authManager = new AuthManager();
const user = await authManager.authenticate(token);
```

## Offline Queuing

### RequestQueue

**Purpose**: Queue requests when offline and process when reconnected

**Location**: [apps/vscode/src/services/QueuedNetworkAdapter.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/vscode/src/services/QueuedNetworkAdapter.ts)

**Key Features**:
- Built on p-queue for concurrency control
- Automatic retry on reconnect
- Priority queuing
- Persistent storage for queued requests

**Usage Example**:
```typescript
const queue = new RequestQueue();
await queue.enqueue(async () => {
  return await apiClient.analyzeRisk(payload);
}, { priority: 1 });
```

## Testing

### Unit Tests

All core components have comprehensive unit tests:

- SnapBackAPIClient tests for ky + cockatiel implementation
- AuthManager tests for lru-cache implementation
- EventBus tests for EventEmitter2 implementation

### Integration Tests

Integration tests cover key workflows:

- ky + cockatiel resilience scenarios
- End-to-end testing with feature flags
- RequestQueue functionality (offline queuing, priority, state transitions, retry)

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test packages/events/test/eventBus.test.ts
```
