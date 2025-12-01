# @snapback/contracts

**Purpose**: Shared types, schemas, and contracts across all packages/apps
**Role**: Single source of truth for data structures, ensuring type safety

## Architecture

### Feature Management (`feature-manager.ts`)
**Feature flags** for gradual rollout & A/B testing:
```ts
class FeatureManager {
  isEnabled(feature: FeatureFlag): boolean;
  enable(feature: FeatureFlag): void;
  disable(feature: feature): void;
}

enum FeatureFlag {
  DETECTION_ENGINE = 'detection_engine',
  SESSION_SNAPSHOTS = 'session_snapshots',
  AI_BURST_DETECTION = 'ai_burst_detection',
  // Add features here
}
```

### Schemas (`schemas.ts`)
**Zod schemas** for runtime validation:
- `SnapshotSchema`: Snapshot data structure
- `ProtectionLevelSchema`: 'watch' | 'warn' | 'block'
- `SessionManifestSchema`: Session metadata
- `AnalysisResultSchema`: Guardian plugin output

### Type Definitions (`types/`)
**Shared TypeScript interfaces**:

```ts
// Snapshot types
interface Snapshot {
  id: string;
  filePath: string;
  content: string;
  hash: string;
  createdAt: number;
  metadata?: SnapshotMetadata;
}

// Protection types
type ProtectionLevel = 'watch' | 'warn' | 'block';

interface ProtectionPolicy {
  pattern: string;      // glob pattern
  level: ProtectionLevel;
  reason?: string;
}

// Session types
interface SessionManifest {
  id: string;
  startedAt: number;
  endedAt: number;
  reason: 'idle-break' | 'blur' | 'commit' | 'task' | 'manual';
  files: SessionFileEntry[];
  summary?: string;
  tags?: string[];
}

// Analysis types
interface AnalysisResult {
  score: number;        // 0-1 risk score
  severity?: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];    // Why this score?
  recommendations: string[];
}
```

### Logger Contract (`logger.ts`)
**Structured logging** interface implemented by all packages:
```ts
interface Logger {
  debug(message: string, meta?: object): void;
  info(message: string, meta?: object): void;
  warn(message: string, error?: Error, meta?: object): void;
  error(message: string, error: Error, meta?: object): void;
}
```
Ensures consistent log format across VSCode/MCP/Web.

### Event Bus Contract (`eventBus.ts`)
**Event type definitions** for pub/sub:
```ts
enum SnapBackEvent {
  SNAPSHOT_CREATED = 'snapshot:created',
  PROTECTION_CHANGED = 'protection:changed',
  // All events enumerated here
}
```

## Usage

### Import Shared Types
```ts
import type { Snapshot, ProtectionLevel, SessionManifest } from '@snapback/contracts';
```

### Validate at Runtime
```ts
import { SnapshotSchema } from '@snapback/contracts';

const data = JSON.parse(untrustedInput);
const snapshot = SnapshotSchema.parse(data); // Throws if invalid
```

### Feature Flags
```ts
import { FeatureManager, FeatureFlag } from '@snapback/contracts';

const features = new FeatureManager();
if (features.isEnabled(FeatureFlag.SESSION_SNAPSHOTS)) {
  // Use session features
}
```

## Design Principles

1. **Type-first**: All runtime schemas have corresponding TypeScript types
2. **Version-safe**: Schema versioning for breaking changes
3. **Minimal deps**: Zero runtime dependencies except zod
4. **Backwards-compatible**: Add new fields, never remove old ones

## Versioning

Schema versions embedded in data:
```ts
interface Snapshot {
  version: 1; // Increment on breaking changes
  // ... rest of fields
}
```

Consumers handle migrations:
```ts
function migrateSnapshot(data: any): Snapshot {
  if (data.version === 1) return data;
  // Handle v0 → v1 migration
}
```

## Testing

- **Schema tests**: All zod schemas have valid/invalid test cases
- **Type tests**: tsd for compile-time type checking
- **Breaking change detection**: Schema diff on CI

## Dependencies

- **zod**: Runtime schema validation (only dependency)

## Related Docs
- All packages import from here
- See individual package docs for usage examples
