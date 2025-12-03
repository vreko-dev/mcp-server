#!/bin/bash
set -e

# Extract @snapback/contracts package for OSS

echo "📦 Extracting @snapback/contracts package..."

PRIVATE_REPO=$(pwd)
OSS_REPO="../snapback-oss"

# Check if OSS repo exists
if [ ! -d "$OSS_REPO" ]; then
  echo "❌ OSS repository not found at $OSS_REPO"
  echo "Please run setup-oss-repo.sh first"
  exit 1
fi

# Copy the contracts package (excluding node_modules and build artifacts)
echo "Copying contracts package..."
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.turbo' --exclude='*.tsbuildinfo' packages/contracts/ "$OSS_REPO/packages/contracts/"

# Navigate to the copied package
cd "$OSS_REPO/packages/contracts"

# Update package.json to be public
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
  directory: 'packages/contracts'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Create/update README.md
cat > README.md << 'EOF'
# @snapback/contracts

> Shared TypeScript types and interfaces for SnapBack

## Installation

```bash
npm install @snapback/contracts
```

## Usage

```typescript
import type { Snapshot, ProtectionLevel } from '@snapback/contracts';

const snapshot: Snapshot = {
  id: 'snap_123',
  filePath: '/path/to/file.ts',
  content: '...',
  timestamp: Date.now()
};

const level: ProtectionLevel = 'WARN';
```

## License

MIT © SnapBack Team
EOF

echo "✅ @snapback/contracts extracted successfully!"
echo ""
echo "Next steps:"
echo "1. cd $OSS_REPO/packages/contracts"
echo "2. Review the code for any proprietary types"
echo "3. Remove any internal API types"
echo "4. Test: pnpm build && pnpm test"

cd "$PRIVATE_REPO"
