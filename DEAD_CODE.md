# Dead Code References

This file lists test files that still contain references to "checkpoint" terminology that should be updated to "snapshot".

## Status: MOSTLY COMPLETE ✅

**Files Renamed**: ✅ All test files with "checkpoint" in filename have been renamed to "snapshot"
**Production Code**: ✅ All production code violations fixed
**Test Content**: ⚠️ Minor test content references remain (variable names, comments)

## Production Code Fixes (COMPLETE):

- ✅ apps/web/app/(marketing)/snapback-demo/commands/index.ts
  - Renamed: viewCheckpoint → viewSnapshot
  - Renamed: showAllCheckpoints → showAllSnapshots
  - Renamed: renameCheckpoint → renameSnapshot
  - Renamed: deleteCheckpoint → deleteSnapshot
  - Renamed: compareWithCheckpoint → compareWithSnapshot
  - Renamed: createCheckpoint → createSnapshot

- ✅ apps/vscode/.env.example
  - CHECKPOINT_TIMELINE_ENABLED → SNAPSHOT_TIMELINE_ENABLED
  - GIT_AUTO_CHECKPOINT_ON_COMMIT → GIT_AUTO_SNAPSHOT_ON_COMMIT
  - CREATE_CHECKPOINT_SHORTCUT → CREATE_SNAPSHOT_SHORTCUT

- ✅ packages/core/test/security-validator.test.ts
  - validateCheckpointId → validateSnapshotId (legacy checkpoint test)

## Test Files Renamed (COMPLETE):

All files previously listed have been renamed from checkpoint → snapshot:
- ✅ apps/vscode/test/integration/* (4 files)
- ✅ apps/vscode/test/regression/* (2 files)
- ✅ apps/vscode/test/unit/checkpoint/* (5 files + directory)
- ✅ apps/vscode/test/unit/* (6 files)
- ✅ apps/vscode/test/unit/decorations/* (1 file)
- ✅ apps/vscode/test/unit/integration/* (1 file)
- ✅ apps/vscode/test/unit/providers/* (1 file)
- ✅ apps/vscode/test/unit/services/* (1 file)

## Remaining Minor Test Content References (ACCEPTABLE):

These are acceptable uses in test files (variable names, test data):
- Test variable names: `const checkpoint = ...` (describing snapshot objects)
- URI schemes: `snapback-checkpoint:` (legacy scheme in tests)
- MCP server test scopes: "checkpoint" scope testing
- Comment references to legacy behavior

## Archive Files (NO ACTION NEEDED):

Archive files intentionally preserved for historical reference:
- apps/vscode/ARCHIVE/20251014/checkpoint-*.md
