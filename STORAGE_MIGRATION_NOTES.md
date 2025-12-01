# Storage Package Migration Notes

## Current Status

**Storage implementation has been migrated to `@snapback/sdk`**

### Actual Location
```
packages/sdk/src/storage/
├── StorageAdapter.ts        # Interface
├── LocalStorage.ts          # SQLite implementation
├── MemoryStorage.ts         # In-memory implementation
├── StorageBroker.ts         # Broker pattern
├── StorageBrokerAdapter.ts  # Adapter
├── StorageErrors.ts         # Error types
└── index.ts                 # Exports
```

### Ghost Package
```
packages/storage/
├── CLAUDE.md        # Documentation only
└── package.json     # Empty package
└── src/             # ❌ DOES NOT EXIST
```

## Issue

The `packages/storage` directory exists but has **no source code**. All storage logic was moved to `@snapback/sdk/src/storage/`.

## Resolution Options

### Option A: Remove Ghost Package (RECOMMENDED)

**Pros**:
- Cleaner workspace
- No confusion about where storage lives
- SDK already exports storage properly

**Cons**:
- Need to update any references

**Implementation**:
```bash
# 1. Remove directory
rm -rf packages/storage

# 2. Verify no broken imports
grep -r '"@snapback/storage"' packages/ apps/

# 3. Update pnpm-workspace.yaml if needed
# (Remove "packages/storage" if listed)

# 4. Clean install
pnpm install
```

### Option B: Keep as Documentation Package

**Pros**:
- Keeps CLAUDE.md accessible
- No code changes needed

**Cons**:
- Confusing for developers
- Unused package in workspace

**Implementation**:
```bash
# Move CLAUDE.md to SDK
cp packages/storage/CLAUDE.md packages/sdk/STORAGE.md

# Remove ghost package
rm -rf packages/storage
```

## Current Exports

Storage is properly exported from SDK:

```json
// packages/sdk/package.json
{
  "exports": {
    ".": "./dist/index.js",
    "./storage": "./dist/storage/index.js"  // ✅ Works correctly
  }
}
```

## Usage Examples

```typescript
// Correct usage (from SDK)
import { LocalStorage, MemoryStorage } from "@snapback/sdk/storage";

// ❌ INCORRECT (would fail if referencing ghost package)
import { LocalStorage } from "@snapback/storage";
```

## Action Required

**Remove the ghost package**:

```bash
cd /home/user/snapback.dev
rm -rf packages/storage
git add packages/storage
git commit -m "chore: remove ghost storage package (migrated to SDK)"
```

**Verify build still works**:
```bash
pnpm install
pnpm build --filter="@snapback/*"
```

## Documentation Update

Update `CLAUDE.md` to reflect that storage is part of SDK:

```markdown
# Storage Implementation

**Location**: `packages/sdk/src/storage/`
**Package**: `@snapback/sdk`
**Import**: `import { LocalStorage } from "@snapback/sdk/storage"`
```

---

**Status**: ✅ No code changes needed, storage works correctly from SDK
**Action**: Remove ghost package directory
