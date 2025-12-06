# @snapback/infrastructure

Shared infrastructure and observability utilities for SnapBack.

## Installation

```bash
npm install @snapback/infrastructure
```

## What's Included

- **Logging**: Pino-based structured logging
- **Metrics**: Event-based metrics collection
- **Tracing**: Distributed tracing support

## Quick Start

```typescript
import { logger } from "@snapback/infrastructure";

logger.info("Snapshot created", { snapshotId: "snap-123" });
```

## API Reference

See [documentation](https://docs.snapback.dev) for complete API reference.

## Development

```bash
pnpm build
pnpm test
```

Internal packages use Prometheus, Grafana, Jaeger for observability. See [GET_STARTED_HOLISTIC.md](../../GET_STARTED_HOLISTIC.md) for complete setup.

## License

MIT
