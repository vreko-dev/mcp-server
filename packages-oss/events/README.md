# @snapback-oss/events

Event bus implementation for SnapBack.

## Installation

```bash
npm install @snapback-oss/events
# or
pnpm add @snapback-oss/events
```

## Usage

```typescript
import { EventBus } from "@snapback-oss/events";

const bus = new EventBus();

bus.subscribe("user.created", (payload) => {
  console.log("User created:", payload);
});

bus.publish("user.created", { id: "123", name: "Alice" });
```

## License

Apache-2.0
