# @snapback/infrastructure

[![npm version](https://img.shields.io/npm/v/@snapback/infrastructure?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback/infrastructure)
[![npm downloads](https://img.shields.io/npm/dm/@snapback/infrastructure?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback/infrastructure)
[![License](https://img.shields.io/badge/license-Apache%202.0-10B981?style=flat&colorA=18181B&colorB=10B981)](https://github.com/snapback-dev/infrastructure/blob/main/LICENSE)

**Production-grade observability toolkit for TypeScript applications**

Part of [SnapBack](https://snapback.dev) - structured logging, distributed tracing, and performance monitoring to help you understand what's happening in your code safety systems.

---

## What is SnapBack?

SnapBack is a **code safety platform** that prevents breaking changes in your codebase through snapshots, file protection, and risk analysis. This infrastructure package provides the observability tools needed to monitor and debug these safety systems in production.

[Learn more about SnapBack →](https://snapback.dev)

---

## What's This Package?

Production-ready **logging and telemetry** infrastructure for TypeScript applications. Built for high-performance observability without vendor lock-in.

- 📊 **Structured Logging** - JSON-formatted logs with context
- 🔍 **Distributed Tracing** - Track operations across services
- ⚡ **Performance Monitoring** - Built-in metrics collection
- 🔌 **Pluggable Backends** - Send data anywhere (Datadog, New Relic, etc.)

**Use this when:**
- Building production TypeScript services
- Need structured logging without dependencies
- Want distributed tracing support
- Require vendor-agnostic observability

[API Reference →](https://docs.snapback.dev/api/infrastructure)

---

## Installation

```bash
npm install @snapback/infrastructure
```

---

## Quick Start

### Structured Logging

```typescript
import { Logger } from '@snapback/infrastructure';

const logger = new Logger({
  service: 'my-app',
  environment: 'production'
});

logger.info('User signed in', {
  userId: '123',
  email: 'user@example.com'
});

logger.error('Payment failed', {
  userId: '123',
  amount: 99.99,
  error: err.message
});
```

[Logging guide →](https://docs.snapback.dev/guides/logging)

---

## Features

### Structured Logging

JSON-formatted logs with automatic context propagation.

```typescript
import { Logger } from '@snapback/infrastructure';

const logger = new Logger({
  service: 'api',
  version: '1.0.0'
});

// Automatic context
logger.info('API request', {
  method: 'POST',
  path: '/api/users',
  duration: 45
});

// Output:
// {
//   "level": "info",
//   "message": "API request",
//   "service": "api",
//   "version": "1.0.0",
//   "method": "POST",
//   "path": "/api/users",
//   "duration": 45,
//   "timestamp": "2025-01-04T12:00:00.000Z"
// }
```

### Distributed Tracing

Track operations across service boundaries.

```typescript
import { Tracer } from '@snapback/infrastructure';

const tracer = new Tracer();

// Start a trace
const span = tracer.startSpan('process-payment');
span.setAttribute('amount', 99.99);
span.setAttribute('currency', 'USD');

try {
  await processPayment();
  span.setStatus('success');
} catch (error) {
  span.setStatus('error');
  span.recordException(error);
} finally {
  span.end();
}
```

[Tracing guide →](https://docs.snapback.dev/guides/tracing)

### Performance Monitoring

Built-in metrics for performance tracking.

```typescript
import { metrics } from '@snapback/infrastructure';

// Record metrics
metrics.increment('api.requests');
metrics.histogram('api.duration', 45);
metrics.gauge('active.connections', 150);
```

---

## Integration Examples

### With Express

```typescript
import express from 'express';
import { Logger, requestLogger } from '@snapback/infrastructure';

const app = express();
const logger = new Logger({ service: 'api' });

// Add request logging
app.use(requestLogger(logger));

app.get('/users', (req, res) => {
  logger.info('Fetching users', { count: users.length });
  res.json(users);
});
```

### With Datadog

```typescript
import { Logger } from '@snapback/infrastructure';

const logger = new Logger({
  service: 'api',
  backends: [{
    type: 'datadog',
    apiKey: process.env.DATADOG_API_KEY
  }]
});
```

[Integration guides →](https://docs.snapback.dev/integrations/observability)

---

## Configuration

```typescript
import { Logger } from '@snapback/infrastructure';

const logger = new Logger({
  service: 'my-app',
  environment: process.env.NODE_ENV,
  level: 'info',           // Minimum log level
  pretty: false,           // Pretty print (dev only)
  version: '1.0.0',
  backends: [
    { type: 'console' },   // Log to console
    { type: 'file', path: './logs/app.log' }
  ]
});
```

[Configuration reference →](https://docs.snapback.dev/api/infrastructure/config)

---

## SnapBack Ecosystem

Part of the complete code safety platform:

| Package | Purpose | Documentation |
|---------|---------|---------------|
| **[@snapback/contracts](https://www.npmjs.com/package/@snapback/contracts)** | TypeScript types | [Docs](https://docs.snapback.dev/api/contracts) |
| **[@snapback/sdk](https://www.npmjs.com/package/@snapback/sdk)** | Complete SDK | [Docs](https://docs.snapback.dev/api/sdk) |
| **[@snapback/infrastructure](https://www.npmjs.com/package/@snapback/infrastructure)** | Observability (you are here) | [Docs](https://docs.snapback.dev/api/infrastructure) |
| **[@snapback/events](https://www.npmjs.com/package/@snapback/events)** | Event bus | [Docs](https://docs.snapback.dev/api/events) |
| **[@snapback/config](https://www.npmjs.com/package/@snapback/config)** | Configuration | [Docs](https://docs.snapback.dev/api/config) |

[Explore the platform →](https://snapback.dev)

---

## Resources

- 🌐 **Website**: [snapback.dev](https://snapback.dev)
- 📖 **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/snapback-dev/infrastructure/issues)
- 💬 **Get Help**: [hello@snapback.dev](mailto:hello@snapback.dev)

---

## Contributing

See our [Contributing Guide](https://github.com/snapback-dev/infrastructure/blob/main/CONTRIBUTING.md).

---

## License

Apache-2.0 © [SnapBack](https://snapback.dev)

**Commercial use allowed** • See [LICENSE](https://github.com/snapback-dev/infrastructure/blob/main/LICENSE)

---

<div align="center">

**[snapback.dev](https://snapback.dev)** • **[Documentation](https://docs.snapback.dev)** • **[@snapbackdev](https://twitter.com/snapbackdev)**

Made with ❤️ for developers who ship with confidence

</div>
