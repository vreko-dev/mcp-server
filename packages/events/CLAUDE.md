# @snapback/events

**Purpose**: Inter-process pub/sub event bus using EventEmitter2
**Role**: Decouple VS Code extension ↔ MCP server ↔ web app communication

## Architecture

### EventBus (`EventBusEventEmitter2.ts`)
**EventEmitter2-based pub/sub** for distributed state synchronization:

```ts
class SnapBackEventBus {
  // Simple initialization (no server/client modes)
  initialize(): Promise<void>

  // EventEmitter2 methods
  on(event: string | string[], listener: (...args: any[]) => void): this
  once(event: string | string[], listener: (...args: any[]) => void): this
  off(event: string | string[], listener: (...args: any[]) => void): this
  emit(event: string | string[], ...values: any[]): boolean

  // Request/response pattern
  onRequest(event: string, handler: (data: any) => Promise<any>): void
  request(event: string, data: any, timeoutMs?: number): Promise<any>

  // QoS publishing
  publish(eventType: string, payload: any): void
  publishQoS(eventType: string, payload: any, qosLevel: QoSLevel, correlationId?: string): Promise<string | undefined>
}
```

### Event Types
```ts
enum SnapBackEvent {
  FILE_PROTECTED = 'file:protected',
  FILE_UNPROTECTED = 'file:unprotected',
  PROTECTION_CHANGED = 'protection:changed',
  SNAPSHOT_CREATED = 'snapshot:created',
  // Add events here to sync state across processes
}
```

### Transport Layer
- **EventEmitter2** (in-memory event emitter)
- **Wildcard support** for pattern-based event subscription
- **No network overhead** - all communication is in-process

### Payload Schemas
All payloads are strongly typed:

```ts
interface SnapshotCreatedPayload {
  filePath: string;
  snapshotId: string;
  protection: 'watch' | 'warn' | 'block';
  timestamp: number;
}

interface FileProtectedPayload {
  filePath: string;
  level: 'watch' | 'warn' | 'block';
}
```

## Usage Patterns

### Basic Usage
```ts
import { SnapBackEventBus, SnapBackEvent } from "@snapback/events";

const bus = new SnapBackEventBus();
await bus.initialize();

// Publish when snapshot created
bus.publish(SnapBackEvent.SNAPSHOT_CREATED, {
  filePath: '/path/to/file.ts',
  snapshotId: 'snap-123',
  protection: 'watch',
  timestamp: Date.now()
});

// Subscribe to protection changes
bus.on(SnapBackEvent.PROTECTION_CHANGED, (payload) => {
  updateLocalProtection(payload.filePath, payload.newLevel);
});
```

### Request/Response Pattern
```ts
// Server side - register handler
bus.onRequest("get_snapshot", async (data) => {
  const snapshot = await getSnapshotById(data.snapshotId);
  return snapshot;
});

// Client side - make request
const snapshot = await bus.request("get_snapshot", {
  snapshotId: "snap-123"
});
```

### QoS Event Publishing
```ts
// Publish with guaranteed delivery
const eventId = await bus.publishQoS(
  SnapBackEvent.SNAPSHOT_CREATED,
  {
    filePath: '/path/to/file.ts',
    snapshotId: 'snap-123',
    protection: 'watch',
    timestamp: Date.now()
  },
  QoSLevel.AT_LEAST_ONCE
);
```

### Wildcard Subscriptions
```ts
// Subscribe to all file-related events
bus.on("file:*", (payload) => {
  console.log("File event received:", payload);
});

// Subscribe to all snapshot events
bus.on("snapshot:*", (payload) => {
  console.log("Snapshot event received:", payload);
});
```

## Design Principles

1. **Simplicity**: No complex socket management or connection handling
2. **Performance**: In-memory event emission with minimal overhead
3. **Reliability**: No network issues or connection drops
4. **Type-safe**: All payloads validated at compile time
5. **Flexible**: Wildcard event matching and pattern-based subscriptions

## Error Handling

- **Request timeouts**: Configurable timeouts with automatic rejection
- **Request failures**: Errors propagated back to callers
- **Subscriber errors**: Caught and logged, don't affect other subscribers
- **QoS retries**: Automatic retry with exponential backoff for critical events

## Performance

- **Latency**: <1ms intra-process pub/sub
- **Throughput**: 10,000+ events/sec (limited by subscriber callback execution)
- **Memory**: O(subscribers) per event type

## Security

- **Process isolation**: Events only shared within the same process
- **No network exposure**: No external access points
- **Payload validation**: TypeScript types prevent malformed events

## Testing

- **Unit**: Event pub/sub flow
- **Integration**: Request/response patterns
- **QoS**: Event persistence and retry logic
- **Performance**: High-throughput event handling

## Dependencies

- **eventemitter2**: Main event emitter library
- **@snapback/config**: Configuration utilities
- **@snapback/contracts**: Shared types and interfaces
- **@snapback/sdk**: Storage and other utilities

## Related Docs
- MCP Server: [apps/mcp-server/CLAUDE.md](../../apps/mcp-server/CLAUDE.md)
- VS Code Extension: [apps/vscode/CLAUDE.md](../../apps/vscode/CLAUDE.md)
- Web App: [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md)
- [Canonical Developer Guide](../../docs/development/canonical-developer-guide.md)
