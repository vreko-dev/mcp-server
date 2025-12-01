# @snapback/infrastructure

**Purpose**: Observability & infrastructure utilities
**Role**: Logging, metrics, tracing for production monitoring

## Architecture

### Logging (`logging/`)
**Structured logging** with multiple transports:
- Console (development)
- File rotation (production)
- Remote aggregation (Datadog/CloudWatch)

Implements `Logger` contract from `@snapback/contracts`.

### Metrics (`metrics/`)
**Performance & business metrics**:
- `Counter`: Increment-only (snapshot_created_total)
- `Gauge`: Point-in-time value (active_sessions)
- `Histogram`: Distribution (snapshot_size_bytes)
- `Summary`: Percentiles (snapshot_latency_ms)

Exporters:
- Prometheus (`/metrics` endpoint)
- StatsD (push-based)

### Tracing (`tracing/`)
**Distributed tracing** for request flows:
- OpenTelemetry integration
- Trace ID propagation (VSCode → MCP → API)
- Span creation helpers

## Usage

### Logging
```ts
import { createLogger } from '@snapback/infrastructure';

const logger = createLogger({
  service: 'vscode-extension',
  level: 'info',
  transports: ['console', 'file']
});

logger.info('Snapshot created', {
  snapshotId: 'snap-123',
  filesize: 1024
});
```

### Metrics
```ts
import { metrics } from '@snapback/infrastructure';

// Increment counter
metrics.counter('snapshots.created').inc();

// Set gauge
metrics.gauge('active.sessions').set(5);

// Record histogram
metrics.histogram('snapshot.size').observe(1024);
```

### Tracing
```ts
import { tracer } from '@snapback/infrastructure';

const span = tracer.startSpan('create_snapshot');
try {
  // ... snapshot creation logic
} finally {
  span.end();
}
```

## Configuration
Environment variables:
- `LOG_LEVEL`: debug|info|warn|error (default: info)
- `METRICS_PORT`: Prometheus exporter port (default: 9090)
- `TRACE_ENDPOINT`: OTLP collector URL

## Performance

- **Logging**: <1ms overhead (async file writes)
- **Metrics**: <0.1ms (in-memory aggregation)
- **Tracing**: <5ms (batch export)

## Dependencies

- **Logging**: pino (high-performance logger)
- **Metrics**: prom-client (Prometheus)
- **Tracing**: @opentelemetry/sdk-node

## Related Docs
- Contracts: [packages/contracts/CLAUDE.md](../contracts/CLAUDE.md)
