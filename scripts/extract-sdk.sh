#!/bin/bash
set -e

# Extract @snapback/sdk package for OSS

echo "📦 Extracting @snapback/sdk package..."

PRIVATE_REPO=$(pwd)
OSS_REPO="../snapback-oss"

# Check if OSS repo exists
if [ ! -d "$OSS_REPO" ]; then
  echo "❌ OSS repository not found at $OSS_REPO"
  echo "Please run setup-oss-repo.sh first"
  exit 1
fi

# Copy the SDK package
echo "Copying SDK package..."
cp -r packages/sdk "$OSS_REPO/packages/"

# Navigate to the copied package
cd "$OSS_REPO/packages/sdk"

# Update package.json to be public and remove proprietary dependencies
echo "Updating package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.private = false;
pkg.publishConfig = {
  access: 'public',
  registry: 'https://registry.npmjs.org/'
};
pkg.repository = {
  type: 'git',
  url: 'https://github.com/snapback-dev/snapback-oss.git',
  directory: 'packages/sdk'
};

// Update dependencies to use only OSS packages
if (pkg.dependencies) {
  // Remove proprietary packages
  delete pkg.dependencies['@snapback/platform'];
  delete pkg.dependencies['@snapback/integrations'];
  delete pkg.dependencies['@snapback/infrastructure'];

  // Keep OSS dependencies
  // @snapback/contracts, @snapback/core, @snapback/events should remain
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Create/update README.md
cat > README.md << 'EOF'
# @snapback/sdk

> TypeScript SDK for SnapBack - Local-first snapshot and file protection

## Installation

```bash
npm install @snapback/sdk
```

## Quick Start

```typescript
import { SnapBackSDK } from '@snapback/sdk';

// Initialize SDK
const sdk = new SnapBackSDK({
  storagePath: './.snapback'
});

// Create a snapshot
const snapshot = await sdk.createSnapshot('file.ts', 'Before refactoring');

// List snapshots
const snapshots = await sdk.listSnapshots('file.ts');

// Restore from snapshot
await sdk.restoreSnapshot(snapshot.id);

// File protection
await sdk.protectFile('important.ts', 'WARN');
```

## Features

- 📸 Local snapshot creation and management
- 🛡️ File protection levels (WATCH, WARN, BLOCK)
- 🔍 Snapshot search and filtering
- 💾 SQLite-based local storage
- 🎯 Content deduplication
- 🌲 Git-aware naming

## API Reference

### SnapBackSDK

#### `createSnapshot(filePath, note?)`
Creates a snapshot of a file.

#### `listSnapshots(filePath?)`
Lists all snapshots, optionally filtered by file path.

#### `restoreSnapshot(snapshotId)`
Restores a file from a snapshot.

#### `protectFile(filePath, level)`
Sets protection level for a file.

See [full documentation](https://docs.snapback.dev/sdk) for more details.

## License

MIT © SnapBack Team
EOF

echo "✅ @snapback/sdk extracted successfully!"
echo ""
echo "⚠️  Manual review required:"
echo "1. Check src/ for any cloud sync features - remove them"
echo "2. Remove API client code that calls proprietary endpoints"
echo "3. Ensure only local SQLite storage is used"
echo "4. Update imports to only use OSS packages"
echo ""
echo "Then:"
echo "1. cd $OSS_REPO/packages/sdk"
echo "2. pnpm install"
echo "3. pnpm build"
echo "4. pnpm test"

cd "$PRIVATE_REPO"
