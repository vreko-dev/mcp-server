# @snapback-oss/infrastructure

## 0.2.0 (2025-12-06)

### Features

**Messaging alignment and tier standardization**

- Pattern Memory narrative alignment - logs now show what actually happened, not internal state
- Pricing tier standardization (Free | Pro | Team | Enterprise)
- Improved error messages with clear remediation steps

### What You See

- Logs use developer-native language: "Snapshot restored successfully" not "RestoreOperation completed"
- Tier-gated logging distinguishes free vs premium user paths
- Error context includes what broke and why, not diagnostic codes

## 0.1.0 (2025-12-04)

### Features

**Initial public release of infrastructure utilities**

- **Structured Logging**: Production-ready Pino logger
  - Contextual logging with child loggers
  - JSON structured output
  - Multiple log levels (trace, debug, info, warn, error, fatal)
  - Pretty printing for development

- **Metrics Collection**: Generic metrics interfaces
  - Counter, Gauge, Histogram support
  - Framework-agnostic design
  - Easy integration with monitoring systems

- **Distributed Tracing**: OpenTelemetry integration
  - Span creation and management
  - Attribute setting
  - Context propagation
  - OTLP exporter support

### What's Included

- ✅ Pino-based structured logger
- ✅ Generic metrics interfaces
- ✅ OpenTelemetry tracing utilities
- ✅ Context propagation helpers
- ✅ Error formatting utilities

### What's Not Included (Private)

- ❌ PostHog analytics integration
- ❌ SnapBack-specific event tracking
- ❌ Proprietary correlation analysis
- ❌ Custom alert configurations

### Framework Compatibility

Works with any Node.js application - not SnapBack-specific!

---

**Full Changelog**: https://github.com/snapback-dev/infrastructure/commits/main
