# SnapBack Dependency Graph

## Package Dependency Analysis

```
apps/web
  ├─► @snapback/database ✅
  │   └─► deviceTrials ❌ NOT EXPORTED
  ├─► @snapback/storage ⚠️
  │   ├─► CheckpointStorage ✅
  │   └─► getSignedUrl ❌ MISSING from interface
  └─► @snapback/auth 🚧
      └─► drizzle.db can be null (TypeScript error)

apps/vscode
  ├─► @snapback/storage ✅
  │   ├─► FileSystemStorage ✅
  │   └─► restore() ✅ IMPLEMENTED
  ├─► @snapback/core ✅
  │   ├─► Guardian ✅
  │   └─► GitIntegration ✅
  └─► @snapback/contracts ✅
      └─► Checkpoint interface ✅

apps/cli
  ├─► @snapback/storage ✅
  │   └─► restore command ❌ NOT IMPLEMENTED (tests exist)
  └─► @snapback/core ✅
      └─► Guardian ✅

packages/api
  ├─► @snapback/database ✅
  │   ├─► drizzle queries ✅
  │   └─► schema exports ✅
  ├─► @snapback/storage ⚠️
  │   └─► restore() ✅ IMPLEMENTED
  └─► @snapback/integrations ✅
      └─► Stripe integration ✅

packages/core
  ├─► @snapback/contracts ✅
  └─► esprima 🚧
      └─► AST parsing ✅

packages/storage
  ├─► @snapback/contracts ✅
  └─► @snapback/database ❌ NOT DEPENDENT
      └─► Should depend for cloud storage

packages/database
  ├─► drizzle-orm ✅
  └─► @snapback/config ❌ MISSING
      └─► Hardcoded values used instead
```

## Detailed Dependency Analysis

### apps/web Dependencies

**Status**: ⚠️ PARTIAL

**Working Dependencies**:

```json
{
	"@snapback/database": "^1.0.0",
	"@snapback/storage": "^1.0.0",
	"@snapback/auth": "^1.0.0"
}
```

**Missing Exports**:

-   ❌ `deviceTrials` table not exported from database package
-   Evidence:
    ```bash
    grep -r "deviceTrials" packages/database/index.ts
    # Not found in exports
    ```

**TypeScript Issues**:

-   🚧 `drizzle.db` can be null in auth package
-   Evidence:
    ```typescript
    // In auth package usage
    if (!drizzle.db) {
    	throw new Error("Database not available");
    }
    ```

### apps/vscode Dependencies

**Status**: ✅ COMPLETE

**Working Dependencies**:

```json
{
	"@snapback/storage": "workspace:*",
	"@snapback/core": "workspace:*",
	"@snapback/contracts": "workspace:*"
}
```

**Fully Integrated**:

-   ✅ `restoreToCheckpoint()` method implemented in OperationCoordinator
-   Evidence:
    ```bash
    grep -A10 "restoreToCheckpoint" apps/vscode/src/operationCoordinator.ts
    # Full implementation exists
    ```

**Test Coverage**:

-   ✅ Tests exist and pass for restore functionality
-   Evidence:
    ```bash
    # File: apps/vscode/src/operationCoordinator.restore.unit.test.ts
    # All tests passing
    ```

### apps/cli Dependencies

**Status**: ⚠️ PARTIAL

**Working Dependencies**:

```json
{
	"@snapback/storage": "workspace:*",
	"@snapback/core": "workspace:*"
}
```

**Missing Implementation**:

-   ❌ `restore` command not implemented despite tests
-   Evidence:
    ```bash
    grep -n "restore" apps/cli/src/index.ts
    # No restore command found
    ```

**Test Mismatch**:

-   ⚠️ Comprehensive tests exist for unimplemented feature
-   Evidence:
    ```bash
    ls -la apps/cli/test/restore.test.ts
    # File exists with 486 lines of tests
    ```

### packages/api Dependencies

**Status**: ✅ COMPLETE with gaps

**Working Dependencies**:

```json
{
	"@snapback/database": "workspace:*",
	"@snapback/storage": "workspace:*",
	"@snapback/integrations": "workspace:*"
}
```

**Storage Interface**:

-   ✅ `restore()` method implemented in storage interface affects API
-   Evidence:
    ```typescript
    // File: packages/storage/src/interface.ts
    restore(
      id: string,
      targetPath: string,
      options?: {
        files?: string[];
        dryRun?: boolean;
        backupCurrent?: boolean;
      },
    ): Promise<RestoreResult>;
    ```

### packages/core Dependencies

**Status**: ⚠️ PARTIAL

**Working Dependencies**:

```json
{
	"@snapback/contracts": "workspace:*",
	"esprima": "^4.0.1"
}
```

**AST Parsing**:

-   ✅ `esprima` correctly integrated for code analysis
-   Evidence:
    ```typescript
    // File: packages/core/src/guardian.ts:2
    import * as esprima from "esprima";
    ```

### packages/storage Dependencies

**Status**: ⚠️ PARTIAL

**Working Dependencies**:

```json
{
	"@snapback/contracts": "workspace:*"
}
```

**Missing Dependencies**:

-   ❌ Should depend on `@snapback/database` for cloud storage
-   Evidence:
    ```bash
    grep -r "@snapback/database" packages/storage/package.json
    # Not found
    ```

**Current Implementation**:

-   ✅ Storage interface and implementation updated with restore functionality
-   Evidence:
    ```typescript
    // File: packages/storage/src/interface.ts
    export interface CheckpointStorage {
    	// ... existing methods
    	restore(
    		id: string,
    		targetPath: string,
    		options?: {
    			files?: string[];
    			dryRun?: boolean;
    			backupCurrent?: boolean;
    		}
    	): Promise<RestoreResult>;
    }
    ```

### packages/database Dependencies

**Status**: ⚠️ PARTIAL

**Working Dependencies**:

```json
{
	"drizzle-orm": "^0.39.2",
	"@paralleldrive/cuid2": "^2.2.2"
}
```

**Missing Dependencies**:

-   ❌ `@snapback/config` not used, hardcoded values instead
-   Evidence:
    ```typescript
    // File: packages/database/drizzle/schema/snapback/subscriptions.ts
    // Uses hardcoded enum values instead of config
    export const planTypeEnum = pgEnum("plan_type", [
    	"free",
    	"solo",
    	"team",
    	"enterprise",
    ]);
    ```

## Cross-Package Dependency Issues

### 1. VSCode Restore Functionality Integration

**Impact**: ✅ RESOLVED - Fully integrated

```
apps/vscode/operationCoordinator.ts
  └─► packages/storage/interface.ts (✅ RESTORE METHOD IMPLEMENTED)
      └─► packages/storage/adapters/fs.ts (✅ RESTORE IMPLEMENTATION EXISTS)
          └─► File System (✅ AVAILABLE and CONNECTED)
```

**Evidence**:

```bash
# Interface now has restore method
grep -A10 "interface CheckpointStorage" packages/storage/src/interface.ts

# Implementation now has restore method
grep -A10 "async restore" packages/storage/src/adapters/fs.ts

# VSCode integration now exists
grep -A10 "restoreToCheckpoint" apps/vscode/src/operationCoordinator.ts
```

### 2. Test-Implementation Mismatch

**Impact**: Medium - Misleading development state

```
apps/cli/test/restore.test.ts (486 lines of tests)
  └─► apps/cli/src/index.ts (❌ NO restore command implementation)
```

**Evidence**:

```bash
# Test file exists and is comprehensive
wc -l apps/cli/test/restore.test.ts
# 487 lines

# Implementation missing
grep -A10 "restore" apps/cli/src/index.ts
# No restore command found
```

### 3. Database Export Issues

**Impact**: Low - Internal inconsistency

```
packages/database/drizzle/schema/snapback/device-trials.ts (✅ Implemented)
  └─► packages/database/index.ts (❌ NOT EXPORTED)
```

**Evidence**:

```bash
# Schema exists
ls packages/database/drizzle/schema/snapback/device-trials.ts

# Not exported
grep -r "deviceTrials" packages/database/index.ts
# No results
```

## Dependency Verification Commands

```bash
# Check package.json dependencies
find . -name "package.json" -path "*/apps/*" -o -path "*/packages/*" | xargs grep -l "@snapback"

# Check for missing exports
grep -r "export.*from" packages/*/index.ts

# Check for interface completeness
grep -A15 "interface.*Storage" packages/storage/src/interface.ts

# Check for test-implementation gaps
ls apps/*/test/*restore*.test.ts
ls apps/*/src/*restore*.ts
```

## Summary of Critical Dependency Issues

1. **CLI Integration Gap**: Restore command missing from CLI implementation
2. **Test Debt**: Comprehensive tests written for unimplemented features
3. **Export Issues**: Database schemas not properly exported
4. **Configuration Hardcoding**: Database package uses hardcoded values instead of config

These dependency issues indicate that while the core restore functionality has been successfully implemented and integrated with the VSCode extension, the CLI integration is still incomplete.
