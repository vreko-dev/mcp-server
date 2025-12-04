# SnapBack Infrastructure

Shared infrastructure utilities for logging, metrics, and tracing across SnapBack services.

## Two Versions Available

| Package | Access | Use Case | Features |
|---------|--------|----------|----------|
| **`@snapback/infrastructure`** | Private | Internal SnapBack services | Full features including PostHog integration |
| **`@snapback-oss/infrastructure`** | Public npm | Community users | Logging and basic metrics (privacy-first) |

## Overview

Infrastructure provides a unified observability layer for SnapBack:

- **Structured Logging**: Pino-based JSON logging with context
- **Metrics**: Event-based metrics collection
- **Tracing**: Distributed tracing support
- **Privacy-First**: No personal data collection by default

## Installation

### Using the OSS Package (Recommended for Most Users)

```bash
npm install @snapback-oss/infrastructure
```

### Using the Private Package

The private `@snapback/infrastructure` is used internally by SnapBack services and includes proprietary analytics (PostHog integration). It is not available on npm and requires workspace access.

## Features

### Public (`@snapback-oss/infrastructure`)

- **Structured Logging** with Pino
- **Context Management**: Request IDs, user context, correlation IDs
- **Metrics**: Counter, gauge, histogram utilities
- **Type Safety**: Full TypeScript support
- **Log Levels**: debug, info, warn, error, fatal
- **JSON Output**: Machine-readable logs

### Private (`@snapback/infrastructure`)

Includes all public features plus:

- **PostHog Integration**: Advanced analytics
- **Cohort Analysis**: User segment tracking
- **Event Correlation**: Link related events
- **A/B Testing**: Feature flag integration
- **Alerts**: Alert management and escalation

## Usage

### Logging

```typescript
import { logger } from "@snapback-oss/infrastructure";

// Simple logging
logger.info("Snapshot created", {
  snapshotId: "snap-123",
  fileCount: 5,
});

// Error logging with context
logger.error("Snapshot creation failed", {
  error: error.message,
  filePath: "/path/to/file",
  stack: error.stack,
});
```

### Metrics

```typescript
import { metrics } from "@snapback-oss/infrastructure";

// Counter
metrics.counter("snapshots.created", 1, {
  workspace: "workspace-123",
  source: "vscode",
});

// Gauge
metrics.gauge("active.sessions", 42);

// Histogram
metrics.histogram("snapshot.size.bytes", 1024);
```

### Private Analytics (Internal Use Only)

```typescript
import { analytics } from "@snapback/infrastructure";
import { posthog } from "@snapback/infrastructure/posthog";

// Internal only - not available in OSS version
await posthog.track({
  distinctId: "user-123",
  event: "snapshot.created",
  properties: {
    source: "vscode",
    duration: 1234,
  },
});
```

## Architecture

### Public vs Private Exports

The package uses conditional exports to hide private features from npm:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./logging": "./dist/logging/index.js",
    "./metrics": "./dist/metrics/index.js",
    // ./posthog NOT exported to npm - internal only
  }
}
```

### Separation Strategy

- **`src/logging/`**: Public logging utilities (Pino wrapper)
- **`src/metrics/`**: Public metrics (event-based)
- **`src/posthog/`**: Private analytics (not in OSS)
- **`src/tracing/`**: Shared tracing (public in OSS)

## Configuration

### Environment Variables

```bash
# Log level
LOG_LEVEL=info

# For internal services only
POSTHOG_API_KEY=xxx
POSTHOG_ENABLED=true
```

### Logger Configuration

```typescript
import { logger, createLogger } from "@snapback-oss/infrastructure";

// Use default logger
logger.info("message");

// Or create a scoped logger
const fileLogger = createLogger("file-watcher");
fileLogger.debug("File changed", { path });
```

## Contributing

Infrastructure improvements welcome! See [Contributing Guide](/docs/contributing) for:

- Code style guidelines
- Testing requirements
- Pull request process
- OSS vs private guidelines

### Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

## Internal Development Notes

### Adding New Features

**For public features:**
1. Add to `src/logging/`, `src/metrics/`, or `src/tracing/`
2. Export from `src/index.ts`
3. Add to `package.json` exports
4. Test in OSS context

**For private features:**
1. Add to `src/posthog/` or similar private directory
2. Do NOT export from main `src/index.ts`
3. Import only from `@snapback/infrastructure/posthog`
4. Document that it's internal-only

### Migration Path

When moving from private to public:
1. Move implementation to public directory
2. Update exports in package.json
3. Update imports in dependent packages
4. Add to OSS version
5. Update documentation

## Performance

- **Zero-overhead logging**: Inactive log levels are fast
- **Batched metrics**: Efficient collection
- **Async operations**: Non-blocking where possible

## License

- **Public (`@snapback-oss/infrastructure`)**: MIT
- **Private (`@snapback/infrastructure`)**: Proprietary

## Observability Stack Integration

This infrastructure package integrates with industry-standard observability tools deployed via Docker Compose. See the [Holistic Docker Setup Guide](../../GET_STARTED_HOLISTIC.md) for complete observability platform setup.

### Monitoring & Metrics (Prometheus)

**What**: Prometheus is an open-source systems monitoring and alerting toolkit that collects metrics from services and exposes them in a time-series database.

**URL**: http://localhost:9090
**Use Case**: Collect application metrics (requests, latency, errors, resource usage)

**Integration Pattern**:
```typescript
import { metrics } from "@snapback/infrastructure";

// Metrics automatically exported for Prometheus scraping
metrics.counter("api.requests.total", 1, { method: "GET", status: 200 });
metrics.histogram("api.request.duration.ms", 150);
metrics.gauge("database.connections.active", 5);
```

**Key Features**:
- PromQL query language for flexible metric analysis
- Alert rules for threshold-based notifications
- Time-series storage for historical analysis
- Multi-dimensional labels for metric filtering

**Reference**: [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)

---

### Visualization & Dashboards (Grafana)

**What**: Grafana is an open-source platform for monitoring and observability that visualizes metrics, logs, and traces from various data sources.

**URL**: http://localhost:3002 (admin/admin)
**Use Case**: Create dashboards, alerts, and visualizations from collected metrics

**Dashboard Setup**:
```typescript
// 1. Metrics flow from your app → Prometheus
// 2. Connect Prometheus as data source in Grafana
// 3. Create dashboards to visualize metrics
// 4. Set up alert rules with notifications
```

**Key Features**:
- Multi-datasource support (Prometheus, Elasticsearch, MySQL, etc.)
- Drag-and-drop dashboard builder
- Alert notification channels (email, Slack, webhooks)
- Dynamic templating for variable dashboards
- Permission management for team access

**Recommended Dashboards**:
- Application Performance (latency, throughput, errors)
- Infrastructure (CPU, memory, disk usage)
- Business Metrics (snapshots created, users active, API calls)
- Service Health (uptime, error rates, response times)

**Reference**: [Grafana Documentation](https://grafana.com/docs/grafana/latest/)

---

### Distributed Tracing (Jaeger)

**What**: Jaeger is a distributed tracing platform for monitoring and troubleshooting complex distributed systems.

**URL**: http://localhost:16686
**Use Case**: Trace requests across multiple services to identify bottlenecks and failures

**Integration Pattern**:
```typescript
import { tracing } from "@snapback/infrastructure";

// Start a trace
const span = await tracing.startSpan("snapshot.creation");
try {
  // ... perform work ...
  span.addTag("file.count", 5);
  span.addTag("duration.ms", 1234);
} finally {
  await span.finish();
}
```

**Key Features**:
- Service dependency mapping
- Latency analysis across service boundaries
- Root cause analysis for errors
- OpenTelemetry compatible
- Span sampling for high-volume services

**Use Cases**:
- Debugging slow requests across services
- Understanding service dependencies
- Identifying network issues
- Performance optimization

**Reference**: [Jaeger Documentation](https://www.jaegertracing.io/docs/)

---

### Data Cache Management (Redis Insight)

**What**: Redis Insight is a web-based management tool for Redis servers, providing visualization and analysis of in-memory data.

**URL**: http://localhost:8001
**Use Case**: Monitor and manage Redis cache, debug data structures, analyze performance

**Integration Pattern**:
```typescript
// Redis is used for caching and session management
// Redis Insight provides visibility into cache hit rates and memory usage

// Monitor cache effectiveness
metrics.gauge("cache.hit.rate", hitRate);
metrics.gauge("redis.memory.usage.bytes", memoryUsed);
metrics.counter("cache.operations", 1, { operation: "get", hit: true });
```

**Key Features**:
- Real-time cache monitoring
- Memory usage analysis
- Key pattern exploration
- Command monitoring
- Data structure visualization
- TTL (time-to-live) analysis

**Use Cases**:
- Debug cache invalidation issues
- Identify memory leaks
- Optimize key expiration policies
- Analyze hot keys

**Reference**: [Redis Documentation](https://redis.io/docs/latest/)

---

### Observability Flow Diagram

```
Application Code
      ↓
[Logger] → stdout/JSON logs
[Metrics] → Prometheus (/metrics endpoint)
[Tracing] → Jaeger (gRPC)
      ↓
[Prometheus] scrapes metrics every 15s
[Jaeger] receives spans in real-time
      ↓
[Grafana] queries Prometheus for visualizations
[Jaeger UI] displays distributed traces
[Redis Insight] monitors cache health
      ↓
Dashboards & Alerts
```

---

### Health Checks

All monitoring services include health checks that are automatically validated:

```bash
# API health check (validates monitoring integration)
curl http://localhost:8080/api/health

# Output includes:
{
  "status": "ok",
  "services": {
    "prometheus": "healthy",
    "jaeger": "healthy",
    "redis": "healthy"
  },
  "uptime": 3600
}
```

---

### Common Monitoring Patterns

**Pattern 1: Request Tracing**
```typescript
// Automatically traces request through services
logger.info("API request received", {
  correlationId: req.id,
  method: req.method,
  path: req.path,
  traceId: span.context().traceId,
});
```

**Pattern 2: Error Tracking**
```typescript
// Errors automatically tracked in Prometheus and Jaeger
try {
  await processSnapshot(file);
} catch (error) {
  metrics.counter("snapshot.creation.errors", 1, {
    reason: error.code,
  });
  span.recordException(error);
}
```

**Pattern 3: Performance Monitoring**
```typescript
// Track operation duration
const start = performance.now();
await databaseOperation();
const duration = performance.now() - start;

metrics.histogram("db.query.duration.ms", duration, {
  operation: "select",
  table: "snapshots",
});
```

---

## Resources

- **Docs**: [SnapBack Documentation](/docs)
- **Contributing**: [Contributing Guide](/docs/contributing)
- **Prometheus**: [Prometheus Documentation](https://prometheus.io/docs/)
- **Grafana**: [Grafana Documentation](https://grafana.com/docs/grafana/)
- **Jaeger**: [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- **Redis**: [Redis Documentation](https://redis.io/docs/)
- **Holistic Setup Guide**: [Docker Setup Guide](../../GET_STARTED_HOLISTIC.md)
- **Pino**: [Pino Logging](https://getpino.io)

## Support

- **Issues**: [GitHub Issues](https://github.com/snapback/snapback/issues)
- **Discussions**: [GitHub Discussions](https://github.com/snapback/snapback/discussions)
