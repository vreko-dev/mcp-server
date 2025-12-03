# @snapback-oss/sdk

SnapBack SDK for TypeScript/JavaScript.

## Installation

```bash
npm install @snapback-oss/sdk
# or
pnpm add @snapback-oss/sdk
```

## Usage

```typescript
import { Snapback, SnapshotClient } from "@snapback-oss/sdk";

const snapback = new Snapback({
  apiKey: process.env.SNAPBACK_API_KEY
});

// Create a snapshot
await snapback.snapshot.create({
  files: [...]
});
```

## Features

- Local snapshot storage
- File change analysis
- Risk analysis (configurable thresholds)
- Session management
- Cloud backup (S3 compatible)

## License

Apache-2.0

---

**Community Edition**: This is the open-source version. For advanced features like ML-powered risk detection and team collaboration, see [SnapBack Pro](https://snapback.dev).
