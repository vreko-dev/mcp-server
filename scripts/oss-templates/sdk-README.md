# @snapback-oss/sdk

[![npm version](https://badge.fury.io/js/@snapback-oss%2Fsdk.svg)](https://www.npmjs.com/package/@snapback-oss/sdk)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> Official TypeScript SDK for interacting with SnapBack

Create, manage, and restore file snapshots programmatically with a clean, type-safe API.

## Installation

```bash
npm install @snapback-oss/sdk
# or pnpm add @snapback-oss/sdk
```

## Quick Start

```typescript
import { SnapBackSDK } from '@snapback-oss/sdk';

// Initialize SDK
const snapback = new SnapBackSDK({
  apiKey: process.env.SNAPBACK_API_KEY,
  apiUrl: 'https://api.snapback.dev',
});

// Create a snapshot
const snapshot = await snapback.snapshots.create({
  files: ['src/**/*.ts'],
  message: 'Before refactoring',
});

// List snapshots
const snapshots = await snapback.snapshots.list();

// Restore from snapshot
await snapback.snapshots.restore(snapshot.id);
```

## Features

- 📸 **Snapshot Management** - Create, list, restore snapshots
- 🗂️ **File Protection** - Mark files as protected
- 🔍 **Search & Filter** - Find snapshots by criteria
- ⚡ **Async/Await** - Promise-based API
- 🔒 **Type-Safe** - Full TypeScript support
- 🧪 **Well-Tested** - Comprehensive test coverage

## API Reference

### Snapshots

```typescript
// Create snapshot
const snapshot = await sdk.snapshots.create({
  files: string[];        // File patterns (glob supported)
  message?: string;       // Optional description
  tags?: string[];        // Optional tags
});

// List snapshots
const snapshots = await sdk.snapshots.list({
  limit?: number;
  offset?: number;
  tags?: string[];
});

// Get snapshot details
const snapshot = await sdk.snapshots.get(snapshotId);

// Restore snapshot
await sdk.snapshots.restore(snapshotId, {
  target?: string;        // Optional restore location
  force?: boolean;        // Overwrite existing files
});

// Delete snapshot
await sdk.snapshots.delete(snapshotId);
```

### File Protection

```typescript
// Protect files
await sdk.protection.add({
  patterns: ['*.config.js', 'src/critical/**'],
  level: 'high',
});

// List protected files
const protected = await sdk.protection.list();

// Remove protection
await sdk.protection.remove({
  patterns: ['*.config.js'],
});
```

### Storage

```typescript
// Get storage usage
const usage = await sdk.storage.usage();

// Clean up old snapshots
await sdk.storage.cleanup({
  olderThan: '30d',
  keepMinimum: 10,
});
```

## Configuration

### SDK Options

```typescript
const sdk = new SnapBackSDK({
  // Required
  apiKey: string;

  // Optional
  apiUrl?: string;                    // Default: https://api.snapback.dev
  timeout?: number;                   // Default: 30000
  retries?: number;                   // Default: 3
  logger?: Logger;                    // Custom logger
});
```

### Environment Variables

```bash
SNAPBACK_API_KEY=your_api_key
SNAPBACK_API_URL=https://api.snapback.dev
```

## Error Handling

```typescript
import { SnapBackError } from '@snapback-oss/sdk';

try {
  await sdk.snapshots.create({ files: [] });
} catch (error) {
  if (error instanceof SnapBackError) {
    console.error('SnapBack error:', error.code, error.message);
  }
}
```

## Examples

### Automated Backups

```typescript
import { SnapBackSDK } from '@snapback-oss/sdk';
import { CronJob } from 'cron';

const sdk = new SnapBackSDK({ apiKey: process.env.SNAPBACK_API_KEY });

// Daily backup at midnight
new CronJob('0 0 * * *', async () => {
  await sdk.snapshots.create({
    files: ['src/**/*'],
    message: `Daily backup ${new Date().toISOString()}`,
    tags: ['automated', 'daily'],
  });
}).start();
```

### Pre-commit Hook

```typescript
// .git/hooks/pre-commit
import { SnapBackSDK } from '@snapback-oss/sdk';

const sdk = new SnapBackSDK({ apiKey: process.env.SNAPBACK_API_KEY });

await sdk.snapshots.create({
  files: ['src/**/*'],
  message: `Pre-commit snapshot`,
  tags: ['pre-commit'],
});
```

### CI/CD Integration

```typescript
// In your CI pipeline
import { SnapBackSDK } from '@snapback-oss/sdk';

const sdk = new SnapBackSDK({ apiKey: process.env.SNAPBACK_API_KEY });

// Snapshot before deployment
await sdk.snapshots.create({
  files: ['dist/**/*'],
  message: `Pre-deployment ${process.env.CI_COMMIT_SHA}`,
  tags: ['deployment', process.env.CI_BRANCH],
});
```

## What's Included

### Public API (OSS)
- ✅ Snapshot CRUD operations
- ✅ File protection
- ✅ Storage management
- ✅ HTTP client with retries
- ✅ Type definitions

### Not Included (Proprietary)
- ❌ Advanced analytics
- ❌ AI-powered suggestions
- ❌ Premium storage features

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

```bash
pnpm install
pnpm build
pnpm test
```

## Links

- **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- **API Reference**: [docs.snapback.dev/api](https://docs.snapback.dev/api)
- **Main Repository**: [Marcelle-Labs/snapback.dev](https://github.com/Marcelle-Labs/snapback.dev)

## License

Apache-2.0 © SnapBack
