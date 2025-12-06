# @snapback/config

Shared configuration schemas and defaults for SnapBack packages.

## Installation

```bash
npm install @snapback/config
```

## What's Included

- **Configuration schemas**: Zod schemas for validation
- **Default configurations**: Sensible defaults for all packages
- **Environment parsing**: Type-safe environment variable loading

## Quick Start

```typescript
import { loadConfig } from "@snapback/config";

const config = await loadConfig({
  logLevel: process.env.LOG_LEVEL || "info",
});
```

## API Reference

See [documentation](https://docs.snapback.dev) for complete API reference.

## Development

```bash
pnpm build
pnpm test
```

## License

MIT
