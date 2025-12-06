# SnapBack Core

Core business logic for SnapBack - snapshot management, file protection, pattern memory, and restoration algorithms.

## Overview

**SnapBack Core** is the heart of the SnapBack system. It contains all business logic for:

- **Snapshot Management**: Create, store, and retrieve file snapshots
- **File Protection**: Monitor files for changes and protect against unwanted modifications
- **Pattern Memory**: Learn from what breaks in your codebase
- **Restoration**: Restore files to previous states
- **Session Management**: Track snapshot sessions and history

## Important

**This package is private** and not available on npm. It's used internally by SnapBack services:
- VS Code extension (`apps/vscode`)
- Web dashboard (`apps/web`)
- CLI tool (`apps/cli`)
- API server (`apps/api`)
- MCP server (`apps/mcp-server`)

## Architecture

### Core Systems

```
Core/
├── Snapshot Manager
│   ├── Create snapshots
│   ├── Store snapshots
│   ├── Retrieve snapshots
│   └── Delete snapshots
│
├── File Protector
│   ├── Monitor file changes
│   ├── Detect modifications
│   ├── Apply protection policies
│   └── Enforce restrictions
│
├── Risk Assessor
│   ├── Analyze patterns that caused problems
│   ├── Calculate how confident we are
│   ├── Suggest what to watch for
│   └── Learn from outcomes
│
├── Restoration Engine
│   ├── Restore files to snapshots
│   ├── Diff detection
│   ├── Merge strategies
│   └── Conflict resolution
│
└── Session Manager
    ├── Create sessions
    ├── Track history
    ├── Manage session state
    └── Retention policies
```

### Key Modules

#### Snapshot Manager (`src/snapshot/`)

Handles all snapshot lifecycle operations:

```typescript
import { SnapshotManager } from "@snapback/core";

const manager = new SnapshotManager(storage);

// Create snapshot
const snapshot = await manager.create(filePath, content);

// Retrieve snapshot
const snapshot = await manager.get(snapshotId);

// List snapshots for file
const snapshots = await manager.getByFile(filePath);

// Restore snapshot
await manager.restore(snapshotId, targetPath);

// Delete snapshot
await manager.delete(snapshotId);
```

#### File Protector (`src/protection/`)

Enforces file protection policies:

```typescript
import { FileProtector, ProtectionLevel } from "@snapback/core";

const protector = new FileProtector();

// Set protection level
await protector.protect(filePath, ProtectionLevel.WATCH);

// Check protection status
const isProtected = await protector.isProtected(filePath);

// Apply policy
await protector.applyPolicy(filePath, policy);

// Unprotect file
await protector.unprotect(filePath);
```

**Protection Levels**:
- `WATCH`: Monitor only, no restrictions
- `WARN`: Warn before modifications
- `BLOCK`: Prevent modifications

#### Risk Assessor (`src/risk/`) - *How SnapBack learns what breaks in your codebase*

Analyzes code changes and learns patterns:

```typescript
import { RiskAssessor } from "@snapback/core";

const assessor = new RiskAssessor();

// Assess file risk
const assessment = await assessor.assess(filePath, content);

// Properties:
// - score: 0-1 (0 = safe, 1 = risky)
// - factors: Patterns detected
// - severity: "low" | "medium" | "high"

console.log(assessment.score);        // 0.65
console.log(assessment.factors);      // ["hardcoded_secret", "eval_usage"]
console.log(assessment.severity);     // "high"
```

**Risk Factors**:
- `high_complexity`: Cyclomatic complexity > threshold
- `many_dependencies`: High number of imports
- `recent_changes`: Frequently modified
- `large_file`: File size > threshold
- `deeply_nested`: Deep nesting levels

#### Restoration Engine (`src/restoration/`)

Restores files from snapshots:

```typescript
import { RestorationEngine } from "@snapback/core";

const engine = new RestorationEngine(storage);

// Get diff between current and snapshot
const diff = await engine.diff(snapshotId, filePath);

// Restore file
const result = await engine.restore(snapshotId, targetPath);

if (result.success) {
  console.log("File restored");
} else {
  console.error("Restoration failed:", result.error);
}
```

#### Session Manager (`src/session/`)

Manages snapshot sessions:

```typescript
import { SessionManager } from "@snapback/core";

const sessionMgr = new SessionManager(storage);

// Create session
const session = await sessionMgr.create({
  name: "Feature development",
  description: "Working on feature X",
});

// Add snapshot to session
await sessionMgr.addSnapshot(session.id, snapshotId);

// Get session
const session = await sessionMgr.get(sessionId);

// List sessions
const sessions = await sessionMgr.list();
```

## Development

### Getting Started

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check

# Watch mode for development
pnpm dev
```

### Project Structure

```
packages/core/
├── src/
│   ├── snapshot/          # Snapshot management
│   │   ├── manager.ts
│   │   ├── storage.ts
│   │   └── types.ts
│   ├── protection/        # File protection
│   │   ├── protector.ts
│   │   ├── policies.ts
│   │   └── types.ts
│   ├── risk/              # Risk assessment
│   │   ├── assessor.ts
│   │   ├── factors.ts
│   │   └── algorithms.ts
│   ├── restoration/       # File restoration
│   │   ├── engine.ts
│   │   ├── diff.ts
│   │   └── merge.ts
│   ├── session/           # Session management
│   │   ├── manager.ts
│   │   └── types.ts
│   ├── types/             # Shared types
│   ├── errors/            # Custom errors
│   └── index.ts           # Public exports
├── test/
│   ├── snapshot/
│   ├── protection/
│   ├── risk/
│   ├── restoration/
│   └── session/
├── docs/
│   ├── DETECTION_SYSTEM.md
│   └── POLICY_PRECEDENCE.md
└── package.json
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific module
pnpm test snapshot
pnpm test risk
pnpm test restoration

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage
```

### Code Style

Follow the TypeScript patterns defined in the workspace:

- **Discriminated Unions**: For state management
- **Type Guards**: For type narrowing
- **Result Types**: For error handling (Result<T, E>)
- **Const Assertions**: For immutable data

See [Developer Guide](/docs/developer-guide) for examples.

## Error Handling

Core uses the `Result<T, E>` pattern for error handling:

```typescript
import { Ok, Err, isOk, isErr } from "@snapback/core";

const result = await manager.create(filePath, content);

if (isOk(result)) {
  const snapshot = result.value;
  console.log("Snapshot created:", snapshot.id);
} else {
  console.error("Failed:", result.error.message);
}
```

### Custom Errors

```typescript
class SnapshotNotFoundError extends BaseError {
  constructor(snapshotId: string) {
    super(`Snapshot ${snapshotId} not found`);
    this.name = "SnapshotNotFoundError";
  }
}

class ProtectionError extends BaseError {
  constructor(filePath: string, reason: string) {
    super(`Failed to protect ${filePath}: ${reason}`);
    this.name = "ProtectionError";
  }
}
```

## Dependencies

Core depends on:

- **@snapback/contracts**: Type definitions and schemas
- **@snapback/infrastructure**: Logging and observability
- **@snapback/events**: Event bus for pub/sub
- **Standard libraries**: fs, path, crypto, etc.

Core does **NOT** depend on:
- UI frameworks
- Web frameworks
- Database-specific code
- Platform-specific code

## Performance Considerations

### Snapshot Creation

- Lazy file reading: Read only when needed
- Content hashing: Quick duplicate detection
- Metadata extraction: Minimal overhead

### Risk Assessment

- Cached results: Avoid re-assessing identical files
- Async processing: Non-blocking analysis
- Parallel evaluation: Assess multiple factors simultaneously

### Restoration

- Efficient diffing: Minimal memory usage
- Streaming: Handle large files
- Conflict detection: Identify overlapping changes

## Observability

Core includes structured logging for all operations:

```typescript
import { logger } from "@snapback/infrastructure";

// Automatically logged:
// - Snapshot creation/restoration
// - Risk assessments
// - Protection policy changes
// - Errors and failures
```

Enable debug logging:

```bash
LOG_LEVEL=debug pnpm dev
```

## Contributing

To contribute to Core:

1. Understand the architecture (see docs/ folder)
2. Write tests for your changes
3. Follow code style guidelines
4. Run `pnpm test` and `pnpm build`
5. Submit PR with clear description

See [Contributing Guide](/docs/contributing) for details.

### Key Concepts

- **Privacy-First**: Never send file contents
- **Type Safety**: Use advanced TypeScript patterns
- **Error Handling**: Always use Result<T, E>
- **Testing**: 100% coverage target for public APIs
- **Performance**: Optimize for common case

## Architecture Docs

- **DETECTION_SYSTEM.md**: How risk detection works
- **POLICY_PRECEDENCE.md**: Protection policy rules

## Resources

- **Contracts**: [Type Definitions](../contracts/README.md)
- **Infrastructure**: [Logging & Observability](../infrastructure/README.md)
- **Developer Guide**: [Technical Guide](/docs/developer-guide)
- **Contributing**: [How to Contribute](/docs/contributing)

## License

Proprietary - SnapBack Core is not open source
