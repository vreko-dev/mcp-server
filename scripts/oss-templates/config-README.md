# @snapback-oss/config

[![npm version](https://badge.fury.io/js/@snapback-oss%2Fconfig.svg)](https://www.npmjs.com/package/@snapback-oss/config)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> Configuration management utilities for Node.js applications

Part of the [SnapBack](https://snapback.dev) open-core ecosystem - type-safe configuration loading and validation.

## Installation

```bash
npm install @snapback-oss/config
# or pnpm add @snapback-oss/config
```

## Quick Start

```typescript
import { loadConfig, validateConfig } from '@snapback-oss/config';

// Load configuration
const config = loadConfig({
  env: process.env.NODE_ENV,
  paths: ['.env', '.env.local'],
});

// Validate configuration
const validated = validateConfig(config, schema);
```

## Features

- ⚙️ **Config Loading**: Load from files and environment
- ✅ **Validation**: Schema-based validation
- 🔒 **Type-Safe**: Full TypeScript support
- 🔄 **Merging**: Smart config merging
- 📝 **Defaults**: Default value support

## API Reference

### Loading Configuration

```typescript
import { loadConfig } from '@snapback-oss/config';

const config = loadConfig({
  // Config file paths (in order of priority)
  paths: [
    '.env.local',      // Highest priority
    '.env',
    'config.json'
  ],

  // Environment to load
  env: 'production',

  // Defaults
  defaults: {
    port: 3000,
    host: 'localhost'
  }
});
```

### Validation

```typescript
import { validateConfig } from '@snapback-oss/config';
import { z } from 'zod';

// Define schema
const schema = z.object({
  port: z.number().min(1024).max(65535),
  host: z.string(),
  apiKey: z.string().min(32)
});

// Validate
const validated = validateConfig(config, schema);
// TypeScript knows the validated types!
```

### Environment Variables

```typescript
import { getEnv } from '@snapback-oss/config';

// Get with default
const port = getEnv('PORT', '3000');

// Get required (throws if missing)
const apiKey = getEnv('API_KEY');

// Get typed
const debugMode = getEnv('DEBUG', 'false') === 'true';
```

## Examples

### Basic Configuration

```typescript
// config.ts
import { loadConfig, validateConfig } from '@snapback-oss/config';
import { z } from 'zod';

const schema = z.object({
  database: z.object({
    url: z.string().url(),
    pool: z.number().default(10)
  }),
  redis: z.object({
    host: z.string(),
    port: z.number()
  })
});

export const config = validateConfig(
  loadConfig({ paths: ['.env'] }),
  schema
);
```

### Multi-Environment

```typescript
const config = loadConfig({
  env: process.env.NODE_ENV,
  paths: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    '.env.local',
    '.env'
  ]
});
```

### With Defaults

```typescript
const config = loadConfig({
  defaults: {
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    logging: {
      level: 'info',
      format: 'json'
    }
  },
  paths: ['.env']
});
```

## TypeScript Support

```typescript
// Define your config type
interface AppConfig {
  port: number;
  apiKey: string;
  database: {
    url: string;
    pool: number;
  };
}

// Type-safe loading
const config = loadConfig<AppConfig>({
  paths: ['.env']
});

// TypeScript knows all the types
config.database.pool; // number
```

## Configuration File Formats

### `.env` Format

```bash
PORT=3000
DATABASE_URL=postgresql://localhost/db
API_KEY=secret123
```

### JSON Format

```json
{
  "port": 3000,
  "database": {
    "url": "postgresql://localhost/db",
    "pool": 10
  }
}
```

## Best Practices

1. **Use .env.local for secrets** (gitignored)
2. **Validate all config** before app starts
3. **Provide sensible defaults**
4. **Use environment-specific files**
5. **Never commit secrets to git**

## What's Included

### Public API (OSS)
- ✅ Configuration loading
- ✅ Environment variable parsing
- ✅ Schema validation
- ✅ Config merging
- ✅ Type coercion

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
- **NPM**: [@snapback-oss/config](https://www.npmjs.com/package/@snapback-oss/config)

## Related Packages

- [`@snapback-oss/infrastructure`](https://github.com/snapback-dev/infrastructure) - Logging utilities
- [`@snapback-oss/sdk`](https://github.com/snapback-dev/sdk) - Client SDK

## License

Apache-2.0 © SnapBack
