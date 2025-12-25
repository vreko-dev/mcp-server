# DRY Code Consolidation Design

## Context

This design documents code consolidation opportunities discovered through comprehensive codebase analysis. The goal is to eliminate duplication, improve maintainability, and reduce bundle sizes while preserving existing functionality and adhering to the Open-Core architectural pattern.

## Current State Analysis

### Duplication Metrics

Based on codebase analysis, the following duplication patterns have been identified:

| Pattern | Duplicate Implementations | Total Duplicated LOC | Risk Level |
|---------|---------------------------|---------------------|------------|
| Hash utilities | 3 locations | ~100 LOC | High |
| Result type | 2 implementations | ~550 LOC | High |
| Path validation | 2 implementations | ~420 LOC | High (Security) |
| Logger implementations | 9 locations | ~400 LOC + maintenance burden | High |
| Atomic file writes | 2+ locations | ~50 LOC + safety risk | Medium |
| ID generation | 8+ locations | ~60 LOC + consistency | Medium |
| Zod schemas | Multiple API procedures | Consistency issue | Medium |
| Rate limiters | 2 different algorithms | Maintenance burden | Low |
| Error helpers | Multiple locations | ~30 LOC | Low |
| Event bus patterns | Multiple locations | Consistency issue | Low |

### Current Implementation Locations

#### Hash Utilities

**Location 1: VS Code Extension**
- File: `apps/vscode/src/storage/utils/hash.ts`
- Functions: `hashContent()`, `getBlobPath()`
- Implementation: SHA-256 with 2-level directory structure
- Purpose: Content-addressable blob storage

**Location 2: OSS SDK Privacy**
- File: `packages-oss/sdk/src/privacy/hasher.ts`
- Functions: `hashFilePath()`, `hashWorkspaceId()`
- Implementation: SHA-256 for anonymization
- Purpose: Privacy-preserving telemetry

**Location 3: Engine Storage**
- File: `packages/engine/src/runtime/storage.ts`
- Implementation: Inline `createHash("sha256")` at line 278
- Purpose: Blob storage in simplified engine

#### Result Type

**Implementation 1: OSS SDK**
- File: `packages-oss/sdk/src/utils/result.ts`
- LOC: 403 lines
- Constructors: `ok()`, `err()` (lowercase)
- Features: `fromPromise()`, `fromPromiseWith()`, `sequence()`, `tryAll()`, `tap()`, `tapErr()`, `match()`

**Implementation 2: VS Code Extension**
- File: `apps/vscode/src/types/result.ts`
- LOC: 400 lines
- Constructors: `Ok()`, `Err()` (uppercase)
- Additional Features: `toPromise()`, `all()`, `allOrErrors()`, `tryCatch()`, `tryCatchAsync()`
- Missing from OSS: `toPromise()`, `all()`, `allOrErrors()`, `tryCatch()`, `tryCatchAsync()`

#### Path Validation

**Implementation 1: VS Code PathValidator (Comprehensive)**
- File: `apps/vscode/src/security/pathValidator.ts`
- LOC: 342 lines
- Approach: Class-based
- Features:
  - Windows-specific attack detection (UNC paths, alternate data streams, drive letters)
  - Symbolic link validation
  - URL-encoded traversal detection (single and double encoding)
  - Null byte injection detection
  - Directory boundary validation with separator-aware checking
- Security Level: Comprehensive

**Implementation 2: MCP Package (Functional)**
- File: `packages/mcp/src/validation.ts`
- LOC: 378 lines total (includes other utilities)
- Path validation: ~80 LOC
- Approach: Function-based
- Functions: `validateFilePath()`, `validateFilePaths()`, `validateRefPath()`
- Additional utility: `atomicWriteFileSync()`
- Security Level: Basic traversal protection

#### Logger Implementations

Nine logger implementations identified:

| Location | Type | Purpose | Implementation |
|----------|------|---------|----------------|
| `packages/infrastructure/src/logging/logger.ts` | Production | Server-side logging | Pino-based with redaction |
| `packages-oss/infrastructure/src/logging/logger.ts` | OSS Production | OSS server logging | Pino-based |
| `packages/contracts/src/logger.ts` | Interface | Type definition | TypeScript interface |
| `packages-oss/contracts/src/logger.ts` | OSS Interface | OSS type definition | TypeScript interface |
| `packages/intelligence/src/utils/logger.ts` | Simple | Intelligence package | JSON console logger |
| `packages/core/src/utils/logger.ts` | Unknown | Core package | To be analyzed |
| `packages/core/src/audit/logger.ts` | Unknown | Audit utilities | To be analyzed |
| `apps/vscode/src/utils/logger.ts` | VS Code | Extension logging | OutputChannel-based |
| `apps/api/lib/logger.ts` | Unknown | API server | To be analyzed |

#### Atomic File Write

**Location 1: MCP Package**
- File: `packages/mcp/src/validation.ts`
- Function: `atomicWriteFileSync()`
- Features: Temp file + rename pattern, size limits, cleanup on failure
- LOC: ~40 lines

**Location 2: Engine Storage**
- File: `packages/engine/src/runtime/storage.ts`
- Implementation: Direct `writeFileSync()` at line 166
- Risk: No atomic guarantees, potential for partial writes

**Location 3: VS Code Storage (Unknown)**
- Location: `apps/vscode/src/storage/`
- Status: Needs investigation

#### ID Generation

Found 8+ custom ID generation implementations:

| Location | Function | Purpose |
|----------|----------|--------|
| `packages/sdk/src/utils/id-generation.ts` | Canonical | `generateSnapshotId()`, `generateSessionId()`, `generateCheckpointId()` |
| `apps/vscode/src/sdk-adapter.ts` | Custom | `generateSessionId()` (line 77) |
| `apps/vscode/src/domain/notificationAdapter.ts` | Custom | `generateId()` (line 251) |
| `apps/api/modules/telemetry/lib/audit-logger.ts` | Custom | `generateId()` (line 343) |
| `apps/_archive/mcp-server/src/sdk-adapter.ts` | Custom | `generateSessionId()` (line 38) |
| `apps/_archive/mcp-server/src/tools/learning-tools.ts` | Custom | `generateSessionId()` (line 151) |

**Analysis**: Canonical implementation exists in `packages/sdk/src/utils/id-generation.ts` but not consistently used across apps.

## Consolidation Strategy

### Open-Core Architectural Principles

All consolidation must adhere to the Open-Core model:

1. **OSS Foundation**: Core utilities must reside in `packages-oss/`
2. **Pro Extensions**: Enterprise features extend OSS in `packages/`
3. **Zero File Overlap**: No duplicate files between OSS and Pro
4. **Type Safety**: Maintain strict TypeScript type safety across boundaries
5. **Bundle Size**: Optimize for tree-shaking and minimal bundle sizes

### Priority-Based Phased Approach

#### Phase 1: High-Impact Safety-Critical (Week 1)

**Objective**: Consolidate utilities with safety implications and high code savings

##### Task 1.1: Hash Utilities Consolidation

**Target Location**: `packages-oss/sdk/src/utils/hash.ts`

**Design**:

Create unified hash utilities with multiple use cases:

Functions to provide:
- `sha256(input: string): string` - Core SHA-256 hashing
- `hashContent(content: string): string` - Alias for content hashing
- `hashFilePath(filePath: string): string` - Path anonymization
- `hashWorkspaceId(workspaceId: string): string` - Workspace anonymization
- `getBlobPath(hash: string, levels?: number): string` - Sharded blob path generation

Default behavior:
- Two-level directory sharding (configurable via levels parameter)
- UTF-8 encoding for content
- Lowercase hex output

**Migration Steps**:

1. Create `packages-oss/sdk/src/utils/hash.ts` with unified implementation
2. Export from `packages-oss/sdk/src/index.ts`
3. Update `apps/vscode/src/storage/utils/hash.ts` to re-export from OSS SDK
4. Update `packages-oss/sdk/src/privacy/hasher.ts` to re-export from utils
5. Update `packages/engine/src/runtime/storage.ts` to import from OSS SDK
6. Run integration tests for VS Code storage and engine

**Validation**:
- **CRITICAL**: Hash backward compatibility testing:
  ```typescript
  // Test: Hash output compatibility with production data
  describe('Hash Backward Compatibility', () => {
    test('sha256 output matches previous VS Code implementation', () => {
      const testCases = [
        { input: 'hello world', expected: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9' },
        { input: 'const x = 1;', expected: '8fef470eb0d143f2e7b5f3d8b5d5f4c5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5' },
        // Add more production samples
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sha256(input)).toBe(expected);
      });
    });

    test('getBlobPath matches previous sharding structure', () => {
      const hash = 'abcd1234567890';
      expect(getBlobPath(hash)).toBe('ab/cd/abcd1234567890');
    });
  });
  ```
- Verify VS Code snapshot creation and restoration
- Verify engine blob storage deduplication
- Verify privacy hash outputs match previous implementation
- **Risk**: If hash outputs change, existing blob storage becomes inaccessible

**Estimated Savings**: ~100 LOC

##### Task 1.2: Atomic File Write Consolidation

**Target Location**: `packages-oss/sdk/src/fs/atomic.ts`

**Design**:

Provide atomic file write utilities for all packages:

Functions to provide:
- `atomicWriteFileSync(path: string, content: string, options?: AtomicWriteOptions): Result<void, Error>`
- `atomicWriteFile(path: string, content: string, options?: AtomicWriteOptions): Promise<Result<void, Error>>`

Options interface:
- `encoding?: BufferEncoding` - Default: 'utf8'
- `maxSize?: number` - Default: 10MB
- `mode?: number` - File permissions

**Usage Guidelines**:
```typescript
/**
 * atomicWriteFileSync - Use for:
 * - CLI tools where blocking is acceptable
 * - Configuration file writes during initialization
 * - Small files (<1MB)
 * - Synchronous workflows
 *
 * atomicWriteFile - Use for:
 * - VS Code extension (non-blocking required for UI responsiveness)
 * - Large file writes (>1MB)
 * - Server-side operations
 * - Async workflows
 */
```

Implementation details:
- Generate random temp file name in same directory
- Write to temp file
- Atomic rename (POSIX guarantees atomicity on same filesystem)
- Cleanup temp file on failure
- Size limit validation before write
- Return Result type for explicit error handling

**Migration Steps**:

1. Create `packages-oss/sdk/src/fs/atomic.ts` with both sync and async implementations
2. Migrate `packages/mcp/src/validation.ts` to re-export from OSS SDK
3. Update `packages/engine/src/runtime/storage.ts` to use atomic writes
4. Investigate and update `apps/vscode/src/storage/` if needed
5. Add integration tests for crash scenarios

**Validation**:
- Test partial write recovery
- Test same-filesystem rename atomicity
- Verify temp file cleanup on all error paths
- Test max size enforcement

**Critical Safety Impact**: Prevents data corruption on crash or interruption

**Estimated Savings**: ~50 LOC + critical safety improvement

#### Phase 2: High-Impact Security (Week 2)

##### Task 2.1: Path Validation Consolidation

**Priority Rationale**: Security vulnerabilities (path traversal) are exploitable and external-facing (MCP API). Type safety is internal code quality. Security takes precedence.

**Target Location**: `packages-oss/sdk/src/security/path-validator.ts`

**Design**:

Merge both implementations into comprehensive security solution:

**Class-based API** (from VS Code PathValidator):
```
class PathValidator {
  constructor(workspaceRoot: string)
  async isPathSafe(targetPath: string): Promise<boolean>
}
```

**Functional API** (from MCP validation):
```
function validateFilePath(
  filePath: string,
  workspaceRoot: string
): { valid: true; sanitizedPath: string } | { valid: false; error: string }

function validateFilePaths(
  filePaths: string[],
  workspaceRoot: string
): { valid: true; sanitizedPaths: string[] } | { valid: false; error: string; invalidPath: string }

function validateRefPath(
  refPath: string,
  workspaceRoot: string
): { valid: true; sanitizedPath: string } | { valid: false; error: string }
```

**Security Features** (all included):
- Null byte injection detection
- Directory traversal detection (..)
- Absolute path validation
- URL-encoded traversal detection (single and double encoding)
- Windows-specific attack vectors:
  - UNC paths (\\server\share)
  - Alternate data streams (file.txt:hidden)
  - Drive letter validation
- Symbolic link validation
- Directory boundary checking with separator awareness

**Implementation Strategy**:
- Functional API wraps class-based implementation
- Class maintains comprehensive security checks
- Both APIs available for different use cases

**Migration Steps**:

1. Create `packages-oss/sdk/src/security/path-validator.ts` with merged implementation
2. Create `packages-oss/sdk/src/security/index.ts` exporting both APIs
3. Update `apps/vscode/src/security/pathValidator.ts` to re-export from OSS SDK
4. Update `packages/mcp/src/validation.ts` to re-export from OSS SDK
5. Add platform-specific tests (Windows, Linux, macOS)
6. Add security regression tests for all attack vectors

**Validation**:
- Security audit of all attack vectors
- Cross-platform testing (Windows, macOS, Linux)
- Verify VS Code file operations remain secure
- Verify MCP path validation functions correctly
- Penetration testing with common path traversal payloads

**Estimated Savings**: ~300 LOC + security hardening

#### Phase 3: High-Impact Type Safety (Week 3)

##### Task 3.1: Result Type Consolidation

**Risk Assessment**: HIGH - This change affects ~15,000+ LOC in VS Code extension with widespread `Ok()`/`Err()` usage throughout production code and tests.

**Target Location**: `packages-oss/sdk/src/utils/result.ts` (existing)

**Design**:

Merge capabilities from both implementations into OSS SDK:

**Keep from OSS SDK**:
- Constructor naming: `ok()`, `err()` (lowercase, functional style)
- Core transformations: `map()`, `mapErr()`, `andThen()`
- Unwrappers: `unwrap()`, `unwrapOr()`, `unwrapOrElse()`
- Promise integration: `fromPromise()`, `fromPromiseWith()`
- Combinators: `sequence()`, `tryAll()`
- Side effects: `tap()`, `tapErr()`
- Pattern matching: `match()`

**Add from VS Code implementation**:
- `toPromise()` - Convert Result to Promise
- `all()` - Combine multiple Results (fail-fast)
- `allOrErrors()` - Combine multiple Results (collect all errors)
- `tryCatch()` - Wrap sync functions
- `tryCatchAsync()` - Wrap async functions

**Do NOT add**:
- Uppercase `Ok()`, `Err()` constructors (maintain lowercase convention)

**Pre-Migration Analysis**:

1. Run codebase audit:
   ```bash
   # Count uppercase usage
   grep -r "Ok(" apps/vscode/src/ --include="*.ts" | wc -l
   grep -r "Err(" apps/vscode/src/ --include="*.ts" | wc -l
   # Expected: 25+ occurrences in production code + tests
   ```

2. Review and update documentation:
   - Check if `.qoder/rules/always-result-type-pattern.md` exists
   - Update to reflect lowercase convention

**Migration Steps**:

1. Add missing functions to `packages-oss/sdk/src/utils/result.ts`:
   - `toPromise()` - Convert Result to Promise
   - `all()` - Combine multiple Results (fail-fast)
   - `allOrErrors()` - Combine multiple Results (collect all errors)
   - `tryCatch()` - Wrap sync functions
   - `tryCatchAsync()` - Wrap async functions

2. Update `apps/vscode/src/types/result.ts` to:
   ```typescript
   export * from "@snapback-oss/sdk/utils/result";

   // DEPRECATED: Use lowercase ok(), err() instead
   // Will be removed in 4 sprints (extended from 2)
   /** @deprecated Use ok() instead. Will be removed after 4 sprints. */
   export { ok as Ok } from "@snapback-oss/sdk/utils/result";
   /** @deprecated Use err() instead. Will be removed after 4 sprints. */
   export { err as Err } from "@snapback-oss/sdk/utils/result";

   // Add runtime deprecation warnings
   if (process.env.NODE_ENV !== 'production') {
     console.warn('[DEPRECATED] Ok/Err uppercase constructors are deprecated. Use ok/err instead.');
   }
   ```

3. Create automated migration codemod:
   ```typescript
   // scripts/migrate-result-type.ts
   // Find/replace Ok( → ok(, Err( → err(
   // Run: ts-node scripts/migrate-result-type.ts apps/vscode/src/**/*.ts
   ```

4. **Extended Migration Period**: Update VS Code code to use lowercase constructors over **3-4 sprints** (not 2)
   - Sprint 1: Core managers and SDK adapters
   - Sprint 2: Domain logic and services
   - Sprint 3: UI components and commands
   - Sprint 4: Test files

5. Remove deprecated aliases after migration complete

6. Run comprehensive validation:
   - Type checking: `pnpm type-check`
   - Test suite: `pnpm test`
   - Verify zero deprecation warnings

**Validation**:
- Verify zero type errors across monorepo
- Verify all Result-based flows function correctly
- Verify VS Code extension compiles and runs
- Run full test suite

**Estimated Savings**: ~250 LOC

#### Phase 4: High-Impact Architecture (Week 4)

##### Task 4.1: Logger Interface Standardization

**Target Location**:
- Interface: `packages-oss/contracts/src/logger.ts`
- Adapters: `packages-oss/infrastructure/src/logging/adapters/`
- Default: `packages-oss/infrastructure/src/logging/logger.ts`

**Design**:

Standardize on adapter pattern with single interface:

**Logger Interface** (canonical):
```
interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown> | Error): void
  child(bindings: Record<string, unknown>): Logger
  level?: string
}
```

**Adapter Implementations**:

1. **PinoAdapter** (production default):
   - File: `packages-oss/infrastructure/src/logging/adapters/pino.ts`
   - Features: Structured logging, redaction, stderr output, MCP_QUIET support
   - Use case: Server-side applications (API, MCP server)

2. **ConsoleAdapter** (development):
   - File: `packages-oss/infrastructure/src/logging/adapters/console.ts`
   - Features: Simple JSON console logging
   - Use case: Intelligence package, lightweight utilities

3. **VSCodeAdapter** (VS Code extension):
   - File: `packages-oss/infrastructure/src/logging/adapters/vscode.ts`
   - Features: OutputChannel integration, VS Code API compatibility, singleton pattern
   - Use case: VS Code extension
   - Implementation:
     ```typescript
     // Singleton pattern for VS Code OutputChannel
     let instance: Logger | null = null;

     export function createVSCodeLogger(outputChannel: vscode.OutputChannel): Logger {
       if (!instance) {
         instance = new VSCodeLoggerAdapter(outputChannel);
       }
       return instance;
     }

     export function resetVSCodeLogger(): void {
       instance = null; // For testing
     }
     ```

4. **SilentAdapter** (testing):
   - File: `packages-oss/infrastructure/src/logging/adapters/silent.ts`
   - Features: No-op implementation
   - Use case: Unit tests, silent mode

**Factory Function**:
```
function createLogger(options?: LoggerOptions): Logger
```

Options:
- `adapter?: 'pino' | 'console' | 'vscode' | 'silent'` - Default: 'pino'
- `level?: LogLevel` - Default: 'info'
- `bindings?: Record<string, unknown>` - Initial context
- `redact?: string[]` - Paths to redact

**Migration Steps**:

1. Consolidate interface in `packages-oss/contracts/src/logger.ts`
2. Create adapter directory structure
3. Migrate Pino implementation to adapter
4. Create Console adapter from intelligence logger
5. Create VSCode adapter wrapping OutputChannel
6. Create Silent adapter for testing
7. Update all 9 logger locations to use new system:
   - `packages/infrastructure` → re-export PinoAdapter
   - `packages-oss/infrastructure` → re-export PinoAdapter
   - `packages/contracts` → canonical interface
   - `packages-oss/contracts` → re-export interface
   - `packages/intelligence` → use ConsoleAdapter
   - `packages/core` → use PinoAdapter
   - `apps/vscode` → use VSCodeAdapter
   - `apps/api` → use PinoAdapter
8. Add adapter switching tests

**Migration Steps**:

1. Consolidate interface in `packages-oss/contracts/src/logger.ts`
2. Create adapter directory structure
3. Migrate Pino implementation to adapter
4. Create Console adapter from intelligence logger
5. Create VSCode adapter with singleton pattern wrapping OutputChannel
6. Create Silent adapter for testing
7. Update all 9 logger locations to use new system:
   - `packages/infrastructure` → re-export PinoAdapter
   - `packages-oss/infrastructure` → re-export PinoAdapter
   - `packages/contracts` → canonical interface
   - `packages-oss/contracts` → re-export interface
   - `packages/intelligence` → use ConsoleAdapter
   - `packages/core` → use PinoAdapter
   - `apps/vscode` → use VSCodeAdapter with singleton
   - `apps/api` → use PinoAdapter
8. Add adapter switching tests

**Validation**:
- Verify structured logging in production
- Verify VS Code OutputChannel integration
- Verify VS Code singleton pattern preserves OutputChannel reference
- Verify MCP_QUIET mode suppression
- Verify redaction of sensitive data
- Verify child logger context propagation
- Test adapter switching in test environment

**Estimated Impact**: ~400 LOC saved + unified maintenance + adapter flexibility

#### Phase 5: Medium-Impact Consistency (Post-Launch)

##### Task 5.1: Zod Schema Consolidation

**Target Location**: `packages-oss/contracts/src/schemas/`

**Design**:

Create centralized schema library for shared validation:

Schema categories:
- **Common**: `FilePathSchema`, `WorkspaceIdSchema`, `TimestampSchema`
- **Snapshot**: `SnapshotCreateSchema`, `SnapshotRestoreSchema`, `SnapshotListSchema`
- **Session**: `SessionStartSchema`, `SessionEndSchema`
- **Risk**: `RiskAnalysisSchema`, `RiskFactorSchema`
- **Validation**: `ValidationModeSchema`, `ValidationResultSchema`

**Implementation**:
- Each schema category in separate file
- Re-export all from `packages-oss/contracts/src/schemas/index.ts`
- Shared refinement functions (path validation, date parsing, etc.)

**Migration Steps**:

1. Create schema directory structure
2. Extract common patterns from MCP `validation.ts`
3. Extract common patterns from API procedure schemas
4. Identify VS Code command input schemas
5. Create shared schema library
6. Update MCP to use shared schemas
7. Update API procedures to use shared schemas
8. Update VS Code commands to use shared schemas

**Validation**:
- Verify input validation consistency across all entry points
- Verify error messages are consistent
- Verify type inference works correctly

**Estimated Impact**: Consistency + DRX (Don't Repeat validations)

##### Task 5.2: ID Generation Consolidation

**Target Location**: `packages-oss/contracts/src/id-generator.ts` (canonical location already exists)

**Design**:

Standardize on existing canonical implementation:

Functions provided:
- `generateSnapshotId(description?: string): SnapshotId`
- `generateSessionId(): SessionId`
- `generateCheckpointId(): string`

**Migration Steps**:

1. Audit all custom ID generation:
   ```bash
   grep -r "generateSessionId\|generateId" apps/ packages/ --include="*.ts" | grep -v "test"
   ```

2. Update custom implementations to use canonical:
   - `apps/vscode/src/sdk-adapter.ts` → Import from `@snapback/contracts`
   - `apps/vscode/src/domain/notificationAdapter.ts` → Import from `@snapback/contracts`
   - `apps/api/modules/telemetry/lib/audit-logger.ts` → Import from `@snapback/contracts`

3. Verify ID format consistency across all systems

4. Add tests for ID uniqueness and format

**Validation**:
- Verify all IDs follow consistent format
- Verify uniqueness guarantees
- Verify no ID collisions in production data

**Estimated Savings**: ~60 LOC + consistency

##### Task 5.3: Error Helper Utilities

**Target Location**: `packages-oss/sdk/src/utils/error-helpers.ts` (already exists)

**Design**:

Standardize error conversion and handling:

Functions to add:
- `toErrorMessage(e: unknown): string` - Extract error message safely
- `isNodeError(e: unknown): e is NodeJS.ErrnoException` - Type guard for Node errors
- `wrapError(message: string, cause: unknown): Error` - Create chained error

Existing function:
- `toError(e: unknown): Error` - Already implemented

**Migration Steps**:

1. Add missing functions to existing `error-helpers.ts`
2. Search codebase for inline error conversions:
   - `error instanceof Error ? error.message : String(error)`
   - `error instanceof Error ? error : new Error(String(error))`
3. Replace with helper functions
4. Export from `packages-oss/sdk/src/index.ts`

**Validation**:
- Verify error handling works correctly
- Verify error message extraction
- Verify type guards function correctly

**Estimated Impact**: ~30 LOC + consistency

#### Phase 6: Lower-Priority Patterns (Future)

##### Task 6.1: Event Bus Pattern Standardization

**Approach**: Informational only - no code changes required

**Current State**:
- Event types already defined in `packages-oss/contracts/src/events/`
- Event bus implementations vary by runtime (VS Code, server, MCP)
- Type safety maintained through contracts

**Recommendation**:
- Document standard event payload types
- Ensure all events use typed payloads from contracts
- No consolidation needed - implementations are context-specific

##### Task 6.2: Rate Limiter Analysis

**Current State**:
- Sliding window algorithm: `apps/vscode/src/domain/rateLimiter.ts`
- Token bucket algorithm: `packages/sdk/src/token/RateLimiter.ts`

**Analysis**:
- Different algorithms serve different purposes (intentional)
- Sliding window: Snapshot creation throttling
- Token bucket: API rate limiting

**Recommendation**:
- Keep separate implementations
- Extract common interfaces if beneficial:
  - `RateLimitResult` type
  - `RateLimitStatus` type
  - Time calculation utilities
- Document use cases for each algorithm

## Migration Validation Strategy

### Testing Requirements

For each consolidation task:

1. **Unit Tests**:
   - Test new consolidated utility in isolation
   - Test all edge cases and error paths
   - Test backwards compatibility

2. **Integration Tests**:
   - Test old code paths using new utilities
   - Test cross-package imports
   - Test build system integration

3. **Regression Tests**:
   - Run existing test suites
   - Verify no behavioral changes
   - Verify no type errors

4. **Platform Tests**:
   - Test on Windows, macOS, Linux
   - Test in VS Code extension host
   - Test in Node.js server environments

### Rollback Strategy

For each migration:

1. Keep old implementation as deprecated export
2. Add console warnings for old paths
3. Maintain for 2 sprints before removal
4. Document migration guide

### Success Metrics

| Metric | Target |
|--------|--------|
| LOC reduction | ~1,000+ lines |
| Duplicate files removed | ~10+ files |
| Bundle size reduction | 10-15% |
| Zero type errors | Pass |
| Zero test failures | Pass |
| Zero behavioral regressions | Pass |

## Risk Assessment

### High Risks

1. **Breaking Changes in Result Type**:
   - Mitigation: Provide deprecated aliases, gradual migration
   - Validation: Comprehensive type checking

2. **Path Validation Security Regression**:
   - Mitigation: Security audit, penetration testing
   - Validation: Cross-platform attack vector testing

3. **Logger Adapter Compatibility**:
   - Mitigation: Maintain existing loggers during transition
   - Validation: Verify all log outputs work correctly

### Medium Risks

1. **Atomic Write Performance**:
   - Mitigation: Benchmark before and after
   - Validation: Monitor file I/O performance

2. **Import Path Changes**:
   - Mitigation: Use TypeScript path mapping for smooth transition
   - Validation: Verify all imports resolve correctly

### Low Risks

1. **Hash Function Consistency**:
   - Mitigation: Verify output matches previous implementation
   - Validation: Hash comparison tests

## Dependencies and Constraints

### External Dependencies

- TypeScript 5.9.2 (catalog version)
- Zod for schema validation
- Pino for logging
- Node.js crypto module
- VS Code API (for VS Code adapter)

### Monorepo Constraints

- Must follow workspace protocol (`workspace:*`)
- Must use catalog for external dependencies
- Must maintain OSS/Pro separation
- Must support tree-shaking
- Must work with Turbo build system

### Platform Constraints

- Must work on Windows, macOS, Linux
- Must work in VS Code extension host
- Must work in Node.js server environments
- Must work in browser (where applicable)

## Implementation Guidelines

### Code Style

- Follow existing Biome configuration
- Use TypeScript strict mode
- Document all public APIs with JSDoc
- Include usage examples in documentation

### Import Conventions

- Use `@snapback-oss/sdk` for OSS utilities
- Use `@snapback/sdk` for Pro extensions
- Use `@snapback-oss/contracts` for types
- Never use relative imports across package boundaries

### Testing Standards

- Vitest for unit tests
- Minimum 80% code coverage
- Test all error paths
- Test platform-specific behavior

### Documentation Requirements

- Update README files
- Update architecture documentation
- Create migration guides
- Document deprecation timelines

## Pre-Implementation Baseline

### Baseline Measurements (Required Before Phase 1)

1. **Bundle Size Baseline**:
   ```bash
   # Before consolidation - record these metrics
   pnpm turbo run build
   du -sh apps/vscode/dist/           # Record size
   du -sh packages/*/dist/            # Record individual package sizes
   du -sh packages-oss/*/dist/        # Record OSS package sizes

   # Create baseline report
   echo "Bundle Size Baseline ($(date))" > .baseline-metrics.txt
   du -sh apps/vscode/dist/ >> .baseline-metrics.txt
   du -sh packages/sdk/dist/ >> .baseline-metrics.txt
   # ... add all relevant packages
   ```

2. **Result Type Usage Audit**:
   ```bash
   # Count uppercase usage
   grep -r "Ok(" apps/vscode/src/ --include="*.ts" | wc -l > result-type-baseline.txt
   grep -r "Err(" apps/vscode/src/ --include="*.ts" | wc -l >> result-type-baseline.txt
   ```

3. **ID Generation Audit**:
   ```bash
   # Find all custom ID generation
   grep -r "generateSessionId\|generateId\|generateSnapshotId" . --include="*.ts" | grep -v "node_modules" | grep -v "test" > id-generation-baseline.txt
   ```

## Success Criteria

### Technical Criteria

- [ ] Pre-implementation baseline metrics captured
- [ ] All high-priority consolidations complete (Phases 1-4)
- [ ] Zero type errors across monorepo
- [ ] All existing tests pass
- [ ] No behavioral regressions
- [ ] Bundle size reduced by 10%+ (measured against baseline)
- [ ] Security audit passed (path validation)
- [ ] Hash backward compatibility verified (no blob storage breakage)

### Maintenance Criteria

- [ ] Single source of truth for each utility
- [ ] Clear ownership and location documentation
- [ ] Migration guides published
- [ ] Deprecation warnings in place

### Quality Criteria

- [ ] Code coverage maintained or improved
- [ ] Documentation complete and accurate
- [ ] No console warnings in production
- [ ] Performance benchmarks met or improved

## Timeline

- **Week 1**: Phase 1 (Hash + Atomic Write) - Safety-Critical
- **Week 2**: Phase 2 (Path Validation) - Security-Critical (Reordered)
- **Week 3**: Phase 3 (Result Type) - Type Safety (Extended timeline)
- **Week 4**: Phase 4 (Logger Standardization) - Architecture
- **Post-Launch**: Phases 5-6 (Medium/Low priority)

Total estimated effort: 4 weeks for high-priority items

**Priority Rationale**: Path validation (Week 2) moved ahead of Result type (Week 3) because:
- Security vulnerabilities are exploitable and affect external-facing MCP API
- Path traversal attacks are well-known and actively exploited
- Result type migration is internal code quality with no security implications
- Extended Result type timeline (3-4 sprints) accommodates thorough migration of ~15,000+ LOC

## CI/CD Integration

### Linting Rules (Add to Biome/ESLint)

```json
// .eslintrc.json or biome.json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["**/apps/vscode/src/types/result"],
            "message": "Import from @snapback-oss/sdk/utils/result instead"
          },
          {
            "group": ["**/apps/vscode/src/storage/utils/hash"],
            "message": "Import from @snapback-oss/sdk/utils/hash instead"
          }
        ]
      }
    ],
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.name='Ok']",
        "message": "Use lowercase ok() instead of Ok()"
      },
      {
        "selector": "CallExpression[callee.name='Err']",
        "message": "Use lowercase err() instead of Err()"
      }
    ]
  }
}
```

### GitHub Actions Workflow

```yaml
# .github/workflows/consolidation-checks.yml
name: Consolidation Checks

on: [pull_request]

jobs:
  check-deprecated-imports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check for deprecated Result imports
        run: |
          # Fail if deprecated patterns found after grace period
          if [ "$(date +%Y%m%d)" -gt "20250401" ]; then
            ! grep -r "from.*apps/vscode/src/types/result" packages/ || exit 1
            ! grep -r "Ok(" packages-oss/ --include="*.ts" | grep -v "test" || exit 1
          fi

      - name: Check for custom ID generation
        run: |
          # Warn if custom ID generation found
          grep -r "private.*generateId\|function generateSessionId" apps/ packages/ --include="*.ts" || true
```

## Appendix: File Inventory

### Files to Create

- `packages-oss/sdk/src/utils/hash.ts`
- `packages-oss/sdk/src/fs/atomic.ts`
- `packages-oss/sdk/src/security/path-validator.ts`
- `packages-oss/sdk/src/security/index.ts`
- `packages-oss/infrastructure/src/logging/adapters/pino.ts`
- `packages-oss/infrastructure/src/logging/adapters/console.ts`
- `packages-oss/infrastructure/src/logging/adapters/vscode.ts`
- `packages-oss/infrastructure/src/logging/adapters/silent.ts`
- `packages-oss/contracts/src/schemas/common.ts`
- `packages-oss/contracts/src/schemas/snapshot.ts`
- `packages-oss/contracts/src/schemas/session.ts`
- `packages-oss/contracts/src/schemas/risk.ts`
- `packages-oss/contracts/src/schemas/index.ts`
- `scripts/migrate-result-type.ts` (codemod for automated migration)
- `.baseline-metrics.txt` (bundle size baseline)
- `result-type-baseline.txt` (usage audit)
- `id-generation-baseline.txt` (ID generation audit)

### Files to Modify (Re-export Pattern)

- `packages-oss/sdk/src/index.ts` (add new exports)
- `packages-oss/sdk/src/utils/index.ts` (add barrel exports)
- `apps/vscode/src/storage/utils/hash.ts`
- `packages-oss/sdk/src/privacy/hasher.ts`
- `packages/engine/src/runtime/storage.ts`
- `apps/vscode/src/types/result.ts` (add deprecation warnings)
- `packages/mcp/src/validation.ts`
- `apps/vscode/src/security/pathValidator.ts`
- `packages/infrastructure/src/logging/logger.ts`
- `packages-oss/infrastructure/src/logging/logger.ts`
- `packages/intelligence/src/utils/logger.ts`
- `packages/core/src/utils/logger.ts`
- `apps/vscode/src/utils/logger.ts`
- `apps/api/lib/logger.ts`
- `apps/vscode/src/sdk-adapter.ts` (use canonical ID generation)
- `apps/vscode/src/domain/notificationAdapter.ts` (use canonical ID generation)
- `apps/api/modules/telemetry/lib/audit-logger.ts` (use canonical ID generation)
- `.qoder/rules/always-result-type-pattern.md` (update to lowercase convention)

### Files to Remove (After Migration)

- Deprecated exports after 3-4 sprint grace period (extended from 2)
- Old hash implementations (after backward compatibility verified)
- Duplicate path validators (after security audit passed)
- Standalone logger implementations (after adapter migration)
- Custom ID generation functions (after canonical migration)
For each migration:

1. Keep old implementation as deprecated export
2. Add console warnings for old paths
3. Maintain for 2 sprints before removal
4. Document migration guide

### Success Metrics

| Metric | Target |
|--------|--------|
| LOC reduction | ~1,000+ lines |
| Duplicate files removed | ~10+ files |
| Bundle size reduction | 10-15% |
| Zero type errors | Pass |
| Zero test failures | Pass |
| Zero behavioral regressions | Pass |

## Risk Assessment

### High Risks

1. **Breaking Changes in Result Type**:
   - Mitigation: Provide deprecated aliases, gradual migration
   - Validation: Comprehensive type checking

2. **Path Validation Security Regression**:
   - Mitigation: Security audit, penetration testing
   - Validation: Cross-platform attack vector testing

3. **Logger Adapter Compatibility**:
   - Mitigation: Maintain existing loggers during transition
   - Validation: Verify all log outputs work correctly

### Medium Risks

1. **Atomic Write Performance**:
   - Mitigation: Benchmark before and after
   - Validation: Monitor file I/O performance

2. **Import Path Changes**:
   - Mitigation: Use TypeScript path mapping for smooth transition
   - Validation: Verify all imports resolve correctly

### Low Risks

1. **Hash Function Consistency**:
   - Mitigation: Verify output matches previous implementation
   - Validation: Hash comparison tests

## Dependencies and Constraints

### External Dependencies

- TypeScript 5.9.2 (catalog version)
- Zod for schema validation
- Pino for logging
- Node.js crypto module
- VS Code API (for VS Code adapter)

### Monorepo Constraints

- Must follow workspace protocol (`workspace:*`)
- Must use catalog for external dependencies
- Must maintain OSS/Pro separation
- Must support tree-shaking
- Must work with Turbo build system

### Platform Constraints

- Must work on Windows, macOS, Linux
- Must work in VS Code extension host
- Must work in Node.js server environments
- Must work in browser (where applicable)

## Implementation Guidelines

### Code Style

- Follow existing Biome configuration
- Use TypeScript strict mode
- Document all public APIs with JSDoc
- Include usage examples in documentation

### Import Conventions

- Use `@snapback-oss/sdk` for OSS utilities
- Use `@snapback/sdk` for Pro extensions
- Use `@snapback-oss/contracts` for types
- Never use relative imports across package boundaries

### Testing Standards

- Vitest for unit tests
- Minimum 80% code coverage
- Test all error paths
- Test platform-specific behavior

### Documentation Requirements

- Update README files
- Update architecture documentation
- Create migration guides
- Document deprecation timelines

## Pre-Implementation Baseline

### Baseline Measurements (Required Before Phase 1)

1. **Bundle Size Baseline**:
   ```bash
   # Before consolidation - record these metrics
   pnpm turbo run build
   du -sh apps/vscode/dist/           # Record size
   du -sh packages/*/dist/            # Record individual package sizes
   du -sh packages-oss/*/dist/        # Record OSS package sizes

   # Create baseline report
   echo "Bundle Size Baseline ($(date))" > .baseline-metrics.txt
   du -sh apps/vscode/dist/ >> .baseline-metrics.txt
   du -sh packages/sdk/dist/ >> .baseline-metrics.txt
   # ... add all relevant packages
   ```

2. **Result Type Usage Audit**:
   ```bash
   # Count uppercase usage
   grep -r "Ok(" apps/vscode/src/ --include="*.ts" | wc -l > result-type-baseline.txt
   grep -r "Err(" apps/vscode/src/ --include="*.ts" | wc -l >> result-type-baseline.txt
   ```

3. **ID Generation Audit**:
   ```bash
   # Find all custom ID generation
   grep -r "generateSessionId\|generateId\|generateSnapshotId" . --include="*.ts" | grep -v "node_modules" | grep -v "test" > id-generation-baseline.txt
   ```

## Success Criteria

### Technical Criteria

- [ ] Pre-implementation baseline metrics captured
- [ ] All high-priority consolidations complete (Phases 1-4)
- [ ] Zero type errors across monorepo
- [ ] All existing tests pass
- [ ] No behavioral regressions
- [ ] Bundle size reduced by 10%+ (measured against baseline)
- [ ] Security audit passed (path validation)
- [ ] Hash backward compatibility verified (no blob storage breakage)

### Maintenance Criteria

- [ ] Single source of truth for each utility
- [ ] Clear ownership and location documentation
- [ ] Migration guides published
- [ ] Deprecation warnings in place

### Quality Criteria

- [ ] Code coverage maintained or improved
- [ ] Documentation complete and accurate
- [ ] No console warnings in production
- [ ] Performance benchmarks met or improved

## Timeline

- **Week 1**: Phase 1 (Hash + Atomic Write) - Safety-Critical
- **Week 2**: Phase 2 (Path Validation) - Security-Critical (Reordered)
- **Week 3**: Phase 3 (Result Type) - Type Safety (Extended timeline)
- **Week 4**: Phase 4 (Logger Standardization) - Architecture
- **Post-Launch**: Phases 5-6 (Medium/Low priority)

Total estimated effort: 4 weeks for high-priority items

**Priority Rationale**: Path validation (Week 2) moved ahead of Result type (Week 3) because:
- Security vulnerabilities are exploitable and affect external-facing MCP API
- Path traversal attacks are well-known and actively exploited
- Result type migration is internal code quality with no security implications
- Extended Result type timeline (3-4 sprints) accommodates thorough migration of ~15,000+ LOC

## CI/CD Integration

### Linting Rules (Add to Biome/ESLint)

```json
// .eslintrc.json or biome.json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["**/apps/vscode/src/types/result"],
            "message": "Import from @snapback-oss/sdk/utils/result instead"
          },
          {
            "group": ["**/apps/vscode/src/storage/utils/hash"],
            "message": "Import from @snapback-oss/sdk/utils/hash instead"
          }
        ]
      }
    ],
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.name='Ok']",
        "message": "Use lowercase ok() instead of Ok()"
      },
      {
        "selector": "CallExpression[callee.name='Err']",
        "message": "Use lowercase err() instead of Err()"
      }
    ]
  }
}
```

### GitHub Actions Workflow

```yaml
# .github/workflows/consolidation-checks.yml
name: Consolidation Checks

on: [pull_request]

jobs:
  check-deprecated-imports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check for deprecated Result imports
        run: |
          # Fail if deprecated patterns found after grace period
          if [ "$(date +%Y%m%d)" -gt "20250401" ]; then
            ! grep -r "from.*apps/vscode/src/types/result" packages/ || exit 1
            ! grep -r "Ok(" packages-oss/ --include="*.ts" | grep -v "test" || exit 1
          fi

      - name: Check for custom ID generation
        run: |
          # Warn if custom ID generation found
          grep -r "private.*generateId\|function generateSessionId" apps/ packages/ --include="*.ts" || true
```

## Appendix: File Inventory

### Files to Create

- `packages-oss/sdk/src/utils/hash.ts`
- `packages-oss/sdk/src/fs/atomic.ts`
- `packages-oss/sdk/src/security/path-validator.ts`
- `packages-oss/sdk/src/security/index.ts`
- `packages-oss/infrastructure/src/logging/adapters/pino.ts`
- `packages-oss/infrastructure/src/logging/adapters/console.ts`
- `packages-oss/infrastructure/src/logging/adapters/vscode.ts`
- `packages-oss/infrastructure/src/logging/adapters/silent.ts`
- `packages-oss/contracts/src/schemas/common.ts`
- `packages-oss/contracts/src/schemas/snapshot.ts`
- `packages-oss/contracts/src/schemas/session.ts`
- `packages-oss/contracts/src/schemas/risk.ts`
- `packages-oss/contracts/src/schemas/index.ts`
- `scripts/migrate-result-type.ts` (codemod for automated migration)
- `.baseline-metrics.txt` (bundle size baseline)
- `result-type-baseline.txt` (usage audit)
- `id-generation-baseline.txt` (ID generation audit)

### Files to Modify (Re-export Pattern)

- `packages-oss/sdk/src/index.ts` (add new exports)
- `packages-oss/sdk/src/utils/index.ts` (add barrel exports)
- `apps/vscode/src/storage/utils/hash.ts`
- `packages-oss/sdk/src/privacy/hasher.ts`
- `packages/engine/src/runtime/storage.ts`
- `apps/vscode/src/types/result.ts` (add deprecation warnings)
- `packages/mcp/src/validation.ts`
- `apps/vscode/src/security/pathValidator.ts`
- `packages/infrastructure/src/logging/logger.ts`
- `packages-oss/infrastructure/src/logging/logger.ts`
- `packages/intelligence/src/utils/logger.ts`
- `packages/core/src/utils/logger.ts`
- `apps/vscode/src/utils/logger.ts`
- `apps/api/lib/logger.ts`
- `apps/vscode/src/sdk-adapter.ts` (use canonical ID generation)
- `apps/vscode/src/domain/notificationAdapter.ts` (use canonical ID generation)
- `apps/api/modules/telemetry/lib/audit-logger.ts` (use canonical ID generation)
- `.qoder/rules/always-result-type-pattern.md` (update to lowercase convention)

### Files to Remove (After Migration)

- Deprecated exports after 3-4 sprint grace period (extended from 2)
- Old hash implementations (after backward compatibility verified)
- Duplicate path validators (after security audit passed)
- Standalone logger implementations (after adapter migration)
- Custom ID generation functions (after canonical migration)
