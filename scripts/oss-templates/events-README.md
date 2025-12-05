# @snapback-oss/events

[![npm version](https://badge.fury.io/js/@snapback-oss%2Fevents.svg)](https://www.npmjs.com/package/@snapback-oss/events)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> Type-safe event bus for Node.js applications

Part of the [SnapBack](https://snapback.dev) open-core ecosystem - a simple, type-safe event emitter built on EventEmitter2.

## Installation

```bash
npm install @snapback-oss/events
# or pnpm add @snapback-oss/events
```

## Quick Start

```typescript
import { EventBus } from '@snapback-oss/events';

// Create event bus
const events = new EventBus();

// Subscribe to events
events.on('user.created', (data) => {
  console.log('New user:', data);
});

// Emit events
events.emit('user.created', { id: '123', name: 'Alice' });

// Wildcard support
events.on('user.*', (data) => {
  console.log('Any user event:', data);
});
```

## Features

- 🎯 **Type-Safe**: Full TypeScript support
- 🌲 **Namespacing**: Organize events with dot notation
- 🔍 **Wildcards**: Listen to patterns like `user.*`
- ⚡ **Fast**: Built on EventEmitter2
- 🪶 **Lightweight**: Minimal dependencies

## API Reference

### Basic Usage

```typescript
import { EventBus } from '@snapback-oss/events';

const bus = new EventBus();

// Subscribe
bus.on(event, handler);
bus.once(event, handler);
bus.off(event, handler);

// Emit
bus.emit(event, data);

// Check listeners
bus.listenerCount(event);
```

### Namespaced Events

```typescript
// Organize events hierarchically
bus.emit('user.created', user);
bus.emit('user.updated', user);
bus.emit('user.deleted', userId);

// Listen to all user events
bus.on('user.*', (data) => {
  console.log('User event:', data);
});
```

### Multiple Listeners

```typescript
// Multiple handlers for same event
bus.on('order.placed', logOrder);
bus.on('order.placed', sendEmail);
bus.on('order.placed', updateInventory);

// All execute when event fires
bus.emit('order.placed', orderData);
```

### Error Handling

```typescript
// Handle errors in listeners
bus.on('error', (err) => {
  console.error('Event bus error:', err);
});

// Errors in handlers are caught
bus.on('risky.event', () => {
  throw new Error('Oops');
});
```

## Examples

### Simple Pub/Sub

```typescript
const events = new EventBus();

// Publisher
function createUser(name: string) {
  const user = { id: Date.now(), name };
  events.emit('user.created', user);
  return user;
}

// Subscriber
events.on('user.created', (user) => {
  console.log(`Welcome ${user.name}!`);
});

createUser('Alice');
// Output: Welcome Alice!
```

### Event Aggregation

```typescript
// Collect events
const userEvents: any[] = [];

events.on('user.*', (data) => {
  userEvents.push(data);
});

events.emit('user.created', { id: 1 });
events.emit('user.updated', { id: 1 });
events.emit('user.deleted', { id: 1 });

console.log(userEvents.length); // 3
```

## What's Included

### Public API (OSS)
- ✅ EventEmitter2 wrapper
- ✅ Type-safe event definitions
- ✅ Wildcard support
- ✅ Namespace support

### Not Included (Private)
- ❌ Platform-specific events
- ❌ Config/SDK integration hooks

## Configuration

```typescript
const bus = new EventBus({
  wildcard: true,        // Enable wildcards (default: true)
  delimiter: '.',        // Namespace delimiter (default: '.')
  maxListeners: 10,      // Max listeners per event
  verboseMemoryLeak: false
});
```

## TypeScript Support

```typescript
// Define your events
interface AppEvents {
  'user.created': { id: string; name: string };
  'user.updated': { id: string; changes: any };
  'user.deleted': { id: string };
}

// Type-safe event bus
const bus = new EventBus<AppEvents>();

// TypeScript knows the event data types
bus.on('user.created', (data) => {
  // data is { id: string; name: string }
  console.log(data.name);
});
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

```bash
pnpm install
pnpm build
pnpm test
```

## Links

- **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- **Main Repository**: [Marcelle-Labs/snapback.dev](https://github.com/Marcelle-Labs/snapback.dev)
- **NPM**: [@snapback-oss/events](https://www.npmjs.com/package/@snapback-oss/events)

## Related Packages

- [`@snapback-oss/contracts`](https://github.com/snapback-dev/contracts) - Type definitions
- [`@snapback-oss/sdk`](https://github.com/snapback-dev/sdk) - Client SDK

## License

Apache-2.0 © SnapBack
