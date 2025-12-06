# @snapback/events

Event bus and event types for SnapBack.

## Installation

```bash
npm install @snapback/events
```

## What's Included

- **Event bus**: Publish/subscribe event system
- **Event types**: TypeScript types for all SnapBack events
- **Event handlers**: Standard patterns for event processing

## Quick Start

```typescript
import { eventBus } from "@snapback/events";

// Subscribe to events
eventBus.on("snapshot.created", (event) => {
  console.log("Snapshot created:", event.snapshotId);
});

// Publish events
await eventBus.emit("snapshot.created", {
  snapshotId: "snap-123",
  timestamp: Date.now(),
});
```

## API Reference

See [documentation](https://docs.snapback.dev) for complete API reference.

## Development

```bash
pnpm build
pnpm test
```

## License

MIT
