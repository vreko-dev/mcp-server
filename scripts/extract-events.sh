#!/bin/bash
set -e

# Extract @snapback/events package for OSS

echo "📦 Extracting @snapback/events package..."

PRIVATE_REPO=$(pwd)
OSS_REPO="../snapback-oss"

# Check if OSS repo exists
if [ ! -d "$OSS_REPO" ]; then
  echo "❌ OSS repository not found at $OSS_REPO"
  echo "Please run setup-oss-repo.sh first"
  exit 1
fi

# Copy the events package (excluding node_modules and build artifacts)
echo "Copying events package..."
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.turbo' --exclude='*.tsbuildinfo' packages/events/ "$OSS_REPO/packages/events/"

# Navigate to the copied package
cd "$OSS_REPO/packages/events"

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
  directory: 'packages/events'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Create/update README.md
cat > README.md << 'EOF'
# @snapback/events

> Event bus system for SnapBack

## Installation

\`\`\`bash
npm install @snapback/events
\`\`\`

## Usage

\`\`\`typescript
import { SnapBackEventBus } from '@snapback/events';

// Initialize event bus
const eventBus = new SnapBackEventBus();
await eventBus.initialize();

// Subscribe to events
eventBus.on('snapshot.created', (event) => {
  console.log('Snapshot created:', event.snapshotId);
});

// Publish events
await eventBus.publish('snapshot.created', {
  snapshotId: 'snap_123',
  filePath: '/path/to/file.ts',
  timestamp: Date.now()
});
\`\`\`

## Events

- `snapshot.created` - Fired when a snapshot is created
- `snapshot.restored` - Fired when a snapshot is restored
- `file.protected` - Fired when file protection is enabled
- `risk.detected` - Fired when a risk is detected

## License

MIT © SnapBack Team
EOF

echo "✅ @snapback/events extracted successfully!"
echo ""
echo "Next steps:"
echo "1. cd $OSS_REPO/packages/events"
echo "2. Review for any cloud-specific events"
echo "3. Test: pnpm build && pnpm test"

cd "$PRIVATE_REPO"
