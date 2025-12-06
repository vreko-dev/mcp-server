# @snapback-oss/events

## 0.2.0 (2025-12-06)

### Features

**OSS remediation and event schema expansion**

- Tier-specific event types for Free | Pro | Team | Enterprise tiers
- Device trial events for multi-device evaluation
- Improved event names using Pattern Memory terminology

### What You See

- Subscribe to tier-gated events: only Pro/Team/Enterprise emits certain events
- Device trial events show trial-specific behavior separate from paid accounts
- Event names are clear: `FileProtected` not `FileSafeguardInitiated`

## 0.1.0 (2025-12-04)

### Features

**Initial public release of event bus implementation**

- **Event Bus**: Simple, type-safe event emitter
  - Built on EventEmitter2
  - Type-safe event handling
  - Wildcard event support
  - Event namespacing

### What's Included

- ✅ EventEmitter2 wrapper
- ✅ Type-safe event definitions
- ✅ Simple pub/sub interface

### What's Not Included (Private)

- ❌ Config/SDK integration hooks
- ❌ Platform-specific events

---

**Full Changelog**: https://github.com/snapback-dev/events/commits/main
