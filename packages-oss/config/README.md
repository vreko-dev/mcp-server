# @snapback-oss/config

[![npm version](https://img.shields.io/npm/v/@snapback-oss/config?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback-oss/config)
[![npm downloads](https://img.shields.io/npm/dm/@snapback-oss/config?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback-oss/config)
[![License](https://img.shields.io/badge/license-Apache%202.0-10B981?style=flat&colorA=18181B&colorB=10B981)](https://github.com/snapback-dev/config/blob/main/LICENSE)

**Type-safe configuration management for TypeScript applications**

Part of [SnapBack](https://snapback.dev) - manage configuration for your code safety systems with environment-based config, validation, and zero-downtime updates.

---

## What is SnapBack?

SnapBack is a **code safety platform** that prevents breaking changes through snapshots, file protection, and risk analysis. This config package provides type-safe configuration management for all SnapBack components.

[Learn more about SnapBack →](https://snapback.dev)

---

## What's This Package?

Type-safe **configuration management** with environment-based overrides, validation, and hot-reloading.

- 🎯 **Type-Safe Config** - Full TypeScript support
- 🔄 **Environment Overrides** - Dev, staging, production configs
- ✅ **Validation** - Zod-powered schema validation
- 🔥 **Hot Reload** - Update config without restarts

**Use this when:**
- Managing multi-environment configs
- Need type-safe configuration
- Want validated config at runtime
- Require zero-downtime config updates

[API Reference →](https://docs.snapback.dev/api/config)

---

## Installation

```bash
npm install @snapback/config
```

---

## Quick Start

```typescript
import { ConfigManager } from '@snapback/config';
import { z } from 'zod';

// Define config schema
const schema = z.object({
  port: z.number().default(3000),
  database: z.object({
    host: z.string(),
    port: z.number()
  }),
  apiKey: z.string().optional()
});

// Load configuration
const config = new ConfigManager(schema);
await config.load();

// Access typed config
console.log(config.get('port'));        // Type: number
console.log(config.get('database'));    // Type: { host: string; port: number }
```

[Configuration guide →](https://docs.snapback.dev/guides/configuration)

---

## Features

### Type-Safe Configuration

Full TypeScript support with automatic type inference.

```typescript
import { ConfigManager } from '@snapback/config';
import { z } from 'zod';

const schema = z.object({
  service: z.string(),
  port: z.number(),
  features: z.object({
    snapshots: z.boolean(),
    protection: z.boolean()
  })
});

const config = new ConfigManager(schema);

// TypeScript knows the types
const port: number = config.get('port');
const features = config.get('features');
console.log(features.snapshots); // ✅ Type-safe
```

### Environment Overrides

Different configs for dev, staging, and production.

```typescript
// config/default.json
{
  "port": 3000,
  "database": {
    "host": "localhost"
  }
}

// config/production.json
{
  "database": {
    "host": "prod.db.example.com",
    "ssl": true
  }
}

// Automatically merges based on NODE_ENV
const config = new ConfigManager(schema, {
  env: process.env.NODE_ENV
});
```

[Environment setup →](https://docs.snapback.dev/guides/config/environments)

### Validation

Catch config errors before they cause problems.

```typescript
const schema = z.object({
  port: z.number().min(1).max(65535),
  apiKey: z.string().min(32),
  database: z.object({
    host: z.string().url()
  })
});

const config = new ConfigManager(schema);

try {
  await config.load();
} catch (error) {
  // Invalid config - detailed validation errors
  console.error(error.issues);
}
```

### Hot Reload

Update configuration without restarting.

```typescript
const config = new ConfigManager(schema, {
  watch: true
});

config.on('change', (newConfig) => {
  console.log('Config updated:', newConfig);
  // Reinitialize services with new config
});
```

---

## Configuration Sources

### File-Based

```typescript
const config = new ConfigManager(schema, {
  sources: [
    { type: 'file', path: './config/default.json' },
    { type: 'file', path: `./config/${process.env.NODE_ENV}.json` }
  ]
});
```

### Environment Variables

```typescript
const config = new ConfigManager(schema, {
  sources: [
    { type: 'env', prefix: 'APP_' }
  ]
});

// Reads from APP_PORT, APP_DATABASE_HOST, etc.
```

### Remote Config

```typescript
const config = new ConfigManager(schema, {
  sources: [
    {
      type: 'remote',
      url: 'https://config.example.com/my-app',
      refreshInterval: 60000 // Check every minute
    }
  ]
});
```

[Configuration sources →](https://docs.snapback.dev/guides/config/sources)

---

## Real-World Example

```typescript
import { ConfigManager } from '@snapback/config';
import { z } from 'zod';

// Define SnapBack config schema
const snapbackConfig = z.object({
  storage: z.object({
    type: z.enum(['local', 'cloud']),
    path: z.string().optional(),
    apiKey: z.string().optional()
  }),
  protection: z.object({
    enabled: z.boolean().default(true),
    levels: z.array(z.enum(['watched', 'caution', 'protected']))
  }),
  snapshots: z.object({
    maxAge: z.number().default(30), // days
    compression: z.boolean().default(true)
  })
});

// Load config
const config = new ConfigManager(snapbackConfig, {
  env: process.env.NODE_ENV,
  watch: true
});

await config.load();

// Use in your app
const storageType = config.get('storage.type');
const maxAge = config.get('snapshots.maxAge');
```

---

## SnapBack Ecosystem

Complete configuration for code safety:

| Package | Purpose | Documentation |
|---------|---------|---------------|
| **[@snapback-oss/contracts](https://www.npmjs.com/package/@snapback-oss/contracts)** | TypeScript types | [Docs](https://docs.snapback.dev/api/contracts) |
| **[@snapback-oss/sdk](https://www.npmjs.com/package/@snapback-oss/sdk)** | Complete SDK | [Docs](https://docs.snapback.dev/api/sdk) |
| **[@snapback-oss/infrastructure](https://www.npmjs.com/package/@snapback-oss/infrastructure)** | Observability | [Docs](https://docs.snapback.dev/api/infrastructure) |
| **[@snapback-oss/events](https://www.npmjs.com/package/@snapback-oss/events)** | Event bus | [Docs](https://docs.snapback.dev/api/events) |
| **[@snapback-oss/config](https://www.npmjs.com/package/@snapback-oss/config)** | Configuration (you are here) | [Docs](https://docs.snapback.dev/api/config) |

[Explore the platform →](https://snapback.dev)

---

## Resources

- 🌐 **Website**: [snapback.dev](https://snapback.dev)
- 📖 **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/snapback-dev/config/issues)
- 💬 **Get Help**: [hello@snapback.dev](mailto:hello@snapback.dev)

---

## Contributing

See our [Contributing Guide](https://github.com/snapback-dev/config/blob/main/CONTRIBUTING.md).

---

## License

Apache-2.0 © [SnapBack](https://snapback.dev)

**Commercial use allowed** • See [LICENSE](https://github.com/snapback-dev/config/blob/main/LICENSE)

---

<div align="center">

**[snapback.dev](https://snapback.dev)** • **[Documentation](https://docs.snapback.dev)** • **[@snapbackdev](https://twitter.com/snapbackdev)**

Made with ❤️ for developers who ship with confidence

</div>
