# SnapBack SDK Extraction & Shared Infrastructure Implementation Guide

## Purpose

Create a shared SnapBack SDK surface that encapsulates checkpoint intelligence, storage, and validation utilities so the VS Code extension, MCP server, and CLI reuse the same core infrastructure while keeping host-specific UX inside each product.

## Scope Overview

-   **In scope**: TypeScript modules in `apps/vscode/src` that are framework neutral (no `vscode` import), the SQLite and compression storage layer, checkpoint orchestration, performance utilities, path/glob validation, and shared types.
-   **Out of scope**: VS Code activation, commands, tree/data providers, notification plumbing, decorators, and any code that calls `vscode.*` APIs. These remain inside the extension and use thin adapters to call the SDK.

## Baseline Metrics (Jan 2025 snapshot)

-   Extension TypeScript total: ~19,200 LOC.
-   Framework-neutral modules: ~7,700 LOC (~40%) suitable for SDK relocation (e.g., `src/checkpoint/**`, `src/storage/**`, `src/performance/**`, `src/security/**`, `src/types/**`, `src/workspaceMemory.ts`).
-   VS Code dependent modules: ~11,500 LOC (~60%) remain in `apps/vscode`.

## Target Layout

```text
packages/
  sdk/
    src/
      checkpoint/
        CheckpointManager.ts
        CheckpointDeduplicator.ts
        CheckpointNamingStrategy.ts
        CheckpointIconStrategy.ts
        CheckpointDeletionService.ts
        adapters/
          StorageAdapter.ts          ← replaces extension-specific adapter
          ConfirmationGateway.ts     ← host-provided UI bridge interface
      storage/
        SqliteCheckpointStorage.ts   ← relocated with platform guards
        CompressionUtil.ts
        StreamingCompressionUtil.ts
        StorageErrors.ts
      performance/
        PerformanceMonitor.ts
        timingDecorators.ts
      security/
        pathValidator.ts
        globValidator.ts
      workspace/
        WorkspaceMemoryManager.ts
      types/
        checkpoint.ts
        checkpointInfo.ts
        fileChanges.ts
      utils/
        logger.ts                    ← sanitized, host-neutral logger
      index.ts                       ← central export surface
    package.json
    README.md (updated overview and usage)
```

The VS Code extension keeps a new `apps/vscode/src/adapters/` folder for host wiring:

```text
apps/vscode/src/adapters/
  VSCodeConfirmationService.ts  ← implements SDK ConfirmationGateway
  VSCodeLogger.ts               ← wraps SDK logger to use VS Code output channels
  VSCodeStorageBridge.ts        ← forwards to @snapback/storage (if distinct)
```

## Migration Phases

### Phase 0 – Pre-flight

1. Run `pnpm install` at the monorepo root, `npm run compile`, and `npm run lint` inside `apps/vscode` to confirm a clean baseline.
2. Capture current coverage via `npm run test:coverage` and store summary in `coverage/` (already baseline). Note numbers for regression comparison.
3. Ensure `packages/sdk` tests (if any) pass via `pnpm test --filter sdk` (or add stub command).

### Phase 1 – SDK Contract Preparation

1. Create `packages/sdk/src/types/` and move extension-neutral interfaces (`apps/vscode/src/types/checkpoint.ts`, `.../types/checkpointInfo.ts`, `.../types/fileChanges.ts`, etc.) into dedicated modules.
2. Update `packages/sdk/src/index.ts` to export the new types (`export * from './types/checkpoint';` etc.).
3. Add explicit interface contracts for confirmation, storage, and event emission:
    - `CheckpointConfirmationGateway` (prompts user confirmation).
    - `CheckpointStoragePort` (CRUD operations currently under `IStorage`).
    - `CheckpointEventBus` (optional emitter interface).
4. Adjust existing extension files to import these types from `@snapback/sdk` but continue referencing local implementations until the migration completes (introduce temporary re-export modules if necessary to avoid circular changes).

### Phase 2 – Port Checkpoint Domain

1. Relocate the following modules into `packages/sdk/src/checkpoint/`:
    - `CheckpointManager`, `CheckpointDeduplicator`, `CheckpointNamingStrategy`, `CheckpointIconStrategy`, `CheckpointDeletionService`.
2. Replace any VS Code-specific imports with SDK interfaces. If a helper is UI-bound (`CheckpointIconStrategy` uses codicon identifiers), keep codicon strings but document that hosts may override icons.
3. Introduce `CheckpointDomainConfig` (in the SDK) containing configuration toggles (naming preferences, deduplication window size) so hosts can feed environment-specific values.
4. Add unit tests under `packages/sdk/test/checkpoint/*.test.ts` mirroring existing behavior (migrate or clone from `apps/vscode/test/unit` where possible).
5. Update `packages/sdk/src/index.ts` exports and adjust `package.json` `exports` map to include `"./checkpoint": "./dist/checkpoint/index.js"` if bundling by subpath.

### Phase 3 – Port Storage & Utilities

1. Move `SqliteCheckpointStorage`, `CompressionUtil`, `StreamingCompressionUtil`, and `StorageErrors` into `packages/sdk/src/storage`.
2. Wrap `better-sqlite3` loading logic in host capability flags so the SDK can function without the native module (the VS Code extension already performs runtime detection).
3. Extract `PerformanceMonitor`, `timingDecorators`, `pathValidator`, `globValidator`, and `WorkspaceMemoryManager` into the SDK.
4. Ensure any `logger` usage is abstracted:
    - Provide a lightweight logger interface and default console implementation in the SDK.
    - Allow hosts to inject log sinks (VS Code, CLI stdout, MCP telemetry).
5. Update `packages/sdk` build config (if needed) to ensure these files compile to `dist/`.

### Phase 4 – Rewire the VS Code Extension

1. Replace local imports with SDK equivalents:
    - `import { CheckpointManager } from '@snapback/sdk/checkpoint';`
    - `import { SqliteCheckpointStorage } from '@snapback/sdk/storage';`
    - `import { PerformanceMonitor } from '@snapback/sdk/performance';`
2. Implement adapters in `apps/vscode/src/adapters` that satisfy the SDK contracts:
    - `VSCodeConfirmationService` implements `CheckpointConfirmationGateway`.
    - `VSCodeEventEmitter` (wraps `vscode.EventEmitter` if needed).
    - `VSCodeLogger` implements the SDK logger interface using `vscode.window.createOutputChannel`.
3. Delete redundant local copies after all imports point to the SDK.
4. Update dependency graph:
    - In `apps/vscode/package.json`, add `"@snapback/sdk": "workspace:*"` if not already present.
    - Remove now-unused relative modules from the build pipeline.
5. Run `npm run compile`, `npm run lint`, and `npm run test` to ensure the extension stays green.

### Phase 5 – Adopt in MCP & CLI

1. Identify the MCP server and CLI entry points (`clients/` or `packages/` folders) that currently duplicate checkpoint logic.
2. Replace custom implementations with SDK imports:
    - Use `CheckpointManager` and shared types for checkpoint creation.
    - Use `SqliteCheckpointStorage` or provide alternate storage adapters if the host runs in a different environment.
3. Implement host-specific confirmation gateways or loggers as needed (e.g., CLI prompts via `inquirer`, MCP-based remote prompts).
4. Extend automated tests in those packages to cover the new integrations and ensure compatibility with SDK behavior.

### Phase 6 – Cleanup & Release

1. Remove deprecated files from `apps/vscode/src` (any leftover stubs after migration).
2. Update documentation:
    - `packages/sdk/README.md` with new modules and usage examples.
    - `apps/vscode/README.md` to note reliance on the SDK.
3. Run the full workspace pipeline: `pnpm lint`, `pnpm test`, `npm run test:coverage` (extension), and packaging scripts.
4. Prepare a changeset covering the SDK enhancements and extension refactor. Confirm version bumps for `@snapback/sdk` and dependent packages.
5. Once stable, `npm run package-with-changeset` and verify the VSIX installs, then run MCP/CLI smoke tests.

## SDK API Additions Checklist

-   [ ] `packages/sdk/src/index.ts` exports all new modules.
-   [ ] Add `exports` mappings in `packages/sdk/package.json` (e.g., `"./checkpoint": "./dist/checkpoint/index.js"`).
-   [ ] Ensure type declarations (`typesVersions`) map new paths for consumers using TypeScript path resolution.
-   [ ] Update `tsconfig.base.json` path aliases if required (`"@snapback/sdk/*": ["packages/sdk/src/*"]`).

## Extension Adapter Responsibilities

-   Keep `apps/vscode/src/extension.ts` responsible for activation and dependency wiring.
-   `SmartContext`/`WorkflowIntegration` modules should depend on SDK services via dependency injection versus direct instantiation.
-   `notificationManager`, `editorDecorations`, `views/*` remain host-specific but receive data structures produced by the SDK (e.g., `RichCheckpoint`).
-   All interactions with VS Code UI must pass through the adapter layer before calling SDK APIs.

## Testing & Validation Strategy

1. **Unit Tests**: Port existing Vitest suites for checkpoint, storage, and validators into `packages/sdk/test`. Run with `pnpm vitest --scope sdk` (or configured scripts).
2. **Integration Tests**: Ensure `npm run test:integration` for the extension still passes after refactor.
3. **Performance Benchmarks**: If existing performance tests rely on SDK internals, migrate them to the SDK package and expose metrics for comparison.
4. **Coverage**: Re-run `npm run test:coverage` and confirm no regression below the `coverage/` baseline.
5. **Manual Verification**: Use `npm run dev` to package and install the VSIX in a clean VS Code profile and execute key flows (checkpoint creation, restore, protection toggles).
6. **Cross-Surface Smoke Tests**: Exercise MCP and CLI flows to validate shared storage and checkpoint logic.

## Risk Assessment & Mitigations

| Risk                                                           | Impact                                             | Mitigation                                                                                                       |
| -------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Hidden VS Code dependencies in moved files                     | Runtime errors in MCP/CLI                          | Audit each module for `vscode` import or API usage before relocation; add lint rule prohibiting `vscode` in SDK. |
| Native `better-sqlite3` binding not available in certain hosts | Storage initialization failure                     | Keep feature detection (`tryLoadBetterSqlite3`) and surface a file-based fallback path in SDK.                   |
| Diverging configuration expectations between hosts             | Incorrect checkpoint naming or protection defaults | Centralize config structs in SDK and let each host supply environment-specific overrides.                        |
| Increased bundle size for extension                            | Slower activation                                  | After refactor, run `npm run check:bundle-size` and tree-shake unused exports.                                   |
| Breaking changes for external consumers                        | Downstream failures                                | Publish SDK changes with semver bumps and document migration notes in CHANGELOG.                                 |

## Rollback Plan

1. Keep migration work on a feature branch (e.g., `feat/sdk-consolidation`).
2. Commit in small, logical steps with `conventional` prefixes to ease cherry-pick or revert.
3. If a phase causes regressions, revert to the last green commit and reapply with smaller batches.
4. Maintain a copy of original extension modules until the SDK integration finishes; delete only after end-to-end verification.

## Deliverable Checklist

-   [ ] SDK exposes checkpoint, storage, performance, security, workspace modules with typed interfaces.
-   [ ] VS Code extension depends on SDK for core logic and uses adapters for UI concerns.
-   [ ] MCP and CLI reuse SDK modules for checkpoint orchestration.
-   [ ] Documentation and scripts updated for new module boundaries.
-   [ ] Tests, coverage, linting, and package builds succeed across the workspace.
-   [ ] Changeset prepared for coordinated release.

## Suggested Timeline (Adjust as Needed)

1. **Week 1**: Phases 0-2 (contracts + checkpoint domain) + unit tests.
2. **Week 2**: Phase 3 (storage/utilities) + adapter scaffolding inside extension.
3. **Week 3**: Phase 4 integration, extension regression testing, bundle-size checks.
4. **Week 4**: Phase 5 adoption in MCP/CLI, smoke tests, coverage review.
5. **Week 5**: Phase 6 cleanup, documentation, release packaging.

## References

-   `apps/vscode/src/checkpoint/CheckpointManager.ts`
-   `apps/vscode/src/storage/SqliteCheckpointStorage.ts`
-   `apps/vscode/src/performance/PerformanceMonitor.ts`
-   `apps/vscode/src/security/pathValidator.ts`, `globValidator.ts`
-   `packages/sdk/src/index.ts`

Keep this guide updated as module ownership evolves to ensure all SnapBack surfaces share a consistent infrastructure baseline.
