# @snapback-oss/events

[![npm version](https://img.shields.io/npm/v/@snapback-oss/events?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback-oss/events)
[![npm downloads](https://img.shields.io/npm/dm/@snapback-oss/events?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback-oss/events)
[![License](https://img.shields.io/badge/license-Apache%202.0-10B981?style=flat&colorA=18181B&colorB=10B981)](https://github.com/snapback-dev/events/blob/main/LICENSE)

**Type-safe event bus for building reactive TypeScript applications**

Part of [SnapBack](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=events) - power your code safety systems with a high-performance event bus for real-time notifications and reactive workflows.

---

## What is SnapBack?

SnapBack is a **code safety platform** that prevents breaking changes through snapshots, file protection, and risk analysis. This event bus powers real-time notifications when snapshots are created, files are protected, or risks are detected.

[Learn more about SnapBack →](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=events)

---

## What's This Package?

Type-safe **event bus** built on EventEmitter2 with full async/await support. Perfect for building reactive, event-driven TypeScript applications.

- 🎯 **Type-Safe Events** - Full TypeScript support for event payloads
- ⚡ **Async/Await** - First-class promise support
- 🔄 **Wildcard Listeners** - Listen to event patterns
- 🎪 **Namespaced Events** - Organize events hierarchically

**Use this when:**
- Building event-driven architectures
- Need type-safe pub/sub patterns
- Want reactive workflows
- Require async event handlers

[API Reference →](https://docs.snapback.dev/api/events?utm_source=npm&utm_medium=readme&utm_campaign=events)

---

## Installation

```bash
npm install @snapback/events
```

---

## Quick Start

```typescript
import { EventBus } from '@snapback/events';

const events = new EventBus();

// Subscribe to events
events.on('snapshot.created', (snapshot) => {
  console.log(`Snapshot ${snapshot.id} created`);
});

// Emit events
events.emit('snapshot.created', {
  id: 'snap_123',
  timestamp: Date.now(),
  reason: 'Before deployment'
});
```

[Event bus guide →](https://docs.snapback.dev/guides/events?utm_source=npm&utm_medium=readme&utm_campaign=events)

---

## Features

### Type-Safe Events

Full TypeScript support with typed event payloads.

```typescript
import { EventBus } from '@snapback/events';

interface Events {
  'user.created': { id: string; email: string };
  'user.deleted': { id: string };
}

const events = new EventBus<Events>();

// TypeScript will enforce correct payload shapes
events.on('user.created', (data) => {
  console.log(data.email); // ✅ Type-safe
  console.log(data.name);  // ❌ TypeScript error
});

events.emit('user.created', {
  id: '123',
  email: 'user@example.com'
});
```

### Async Event Handlers

All handlers support async/await.

```typescript
events.on('payment.processed', async (payment) => {
  await sendConfirmationEmail(payment.email);
  await updateDatabase(payment);
  console.log('Payment processed');
});

// Wait for all handlers to complete
await events.emitAsync('payment.processed', {
  id: 'pay_123',
  amount: 99.99,
  email: 'user@example.com'
});
```

### Wildcard Patterns

Listen to multiple events with patterns.

```typescript
// Listen to all snapshot events
events.on('snapshot.*', (data) => {
  console.log('Snapshot event:', data);
});

// Listen to all events
events.on('**', (data) => {
  console.log('Any event:', data);
});
```

[Pattern matching guide →](https://docs.snapback.dev/guides/events/patterns?utm_source=npm&utm_medium=readme&utm_campaign=events)

### Event Namespaces

Organize events hierarchically.

```typescript
// User events
events.emit('user.created', { id: '123' });
events.emit('user.updated', { id: '123' });
events.emit('user.deleted', { id: '123' });

// Admin events
events.emit('admin.login', { id: 'admin_1' });

// Listen to all user events
events.on('user.*', (data) => {
  console.log('User event:', data);
});
```

---

## Real-World Examples

### SnapBack Integration

```typescript
import { EventBus } from '@snapback/events';
import { SnapshotManager } from '@snapback/sdk';

const events = new EventBus();
const manager = new SnapshotManager();

// Subscribe to snapshot events
events.on('snapshot.created', async (snapshot) => {
  console.log(`✓ Snapshot ${snapshot.id} created`);
  await notifyTeam(snapshot);
});

events.on('snapshot.restored', async (snapshot) => {
  console.log(`⚠️ Rolled back to ${snapshot.id}`);
  await logRollback(snapshot);
});

// Events are emitted automatically by SDK
await manager.create({ reason: 'Before deploy' });
```

### Microservices Communication

```typescript
const events = new EventBus();

// Service A: Publish events
events.emit('order.placed', {
  orderId: '123',
  userId: '456',
  total: 99.99
});

// Service B: Listen for events
events.on('order.placed', async (order) => {
  await processPayment(order);
  events.emit('payment.processed', { orderId: order.orderId });
});

// Service C: Listen for payment events
events.on('payment.processed', async (payment) => {
  await sendConfirmationEmail(payment.orderId);
});
```

---

## API Reference

### EventBus

```typescript
class EventBus<T = any> {
  // Subscribe to events
  on(event: string, handler: Function): this;

  // Subscribe once
  once(event: string, handler: Function): this;

  // Emit events (fire and forget)
  emit(event: string, data: T): boolean;

  // Emit events (wait for handlers)
  emitAsync(event: string, data: T): Promise<void>;

  // Unsubscribe
  off(event: string, handler: Function): this;

  // Remove all listeners
  removeAllListeners(event?: string): this;
}
```

[Complete API docs →](https://docs.snapback.dev/api/events?utm_source=npm&utm_medium=readme&utm_campaign=events)

---

## SnapBack Ecosystem

Build complete event-driven code safety systems:

| Package | Purpose | Documentation |
|---------|---------|---------------|
| **[@snapback-oss/contracts](https://www.npmjs.com/package/@snapback-oss/contracts)** | TypeScript types | [Docs](https://docs.snapback.dev/api/contracts?utm_source=npm&utm_medium=readme&utm_campaign=events) |
| **[@snapback-oss/sdk](https://www.npmjs.com/package/@snapback-oss/sdk)** | Complete SDK | [Docs](https://docs.snapback.dev/api/sdk?utm_source=npm&utm_medium=readme&utm_campaign=events) |
| **[@snapback-oss/infrastructure](https://www.npmjs.com/package/@snapback-oss/infrastructure)** | Observability | [Docs](https://docs.snapback.dev/api/infrastructure?utm_source=npm&utm_medium=readme&utm_campaign=events) |
| **[@snapback-oss/events](https://www.npmjs.com/package/@snapback-oss/events)** | Event bus (you are here) | [Docs](https://docs.snapback.dev/api/events?utm_source=npm&utm_medium=readme&utm_campaign=events) |
| **[@snapback-oss/config](https://www.npmjs.com/package/@snapback-oss/config)** | Configuration | [Docs](https://docs.snapback.dev/api/config?utm_source=npm&utm_medium=readme&utm_campaign=events) |

[Explore the platform →](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=events)

---

## Resources

- 🌐 **Website**: [snapback.dev](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=events)
- 📖 **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/snapback-dev/events/issues)
- 💬 **Get Help**: [hello@snapback.dev](mailto:hello@snapback.dev)

---

## Contributing

See our [Contributing Guide](https://github.com/snapback-dev/events/blob/main/CONTRIBUTING.md).

---

## License

Apache-2.0 © [SnapBack](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=events)

**Commercial use allowed** • See [LICENSE](https://github.com/snapback-dev/events/blob/main/LICENSE)

---

<div align="center">

**[snapback.dev](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=events)** • **[Documentation](https://docs.snapback.dev)** • **[@snapbackdev](https://twitter.com/snapbackdev)**

Made with ❤️ for developers who ship with confidence

</div>
