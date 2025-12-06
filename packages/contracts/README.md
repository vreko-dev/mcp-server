# @snapback/contracts

Shared type definitions and schemas for SnapBack.

## Installation

```bash
npm install @snapback/contracts
```

## What's Included

- **Type definitions** for snapshots, files, risk assessments
- **Zod schemas** for runtime validation
- **API contracts** for request/response shapes
- **Event types** for the event bus

## Quick Start

```typescript
import type { Snapshot, RiskAssessment } from "@snapback/contracts";
import { SnapshotSchema } from "@snapback/contracts";

// Use types
const snap: Snapshot = { /* ... */ };

// Validate at runtime
const result = SnapshotSchema.safeParse(data);
```

## API Reference

See [documentation](https://docs.snapback.dev) for complete API reference and usage examples.

## Development

```bash
pnpm build
pnpm test
pnpm generate-openapi
```

## License

MIT
