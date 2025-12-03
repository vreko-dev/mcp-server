#!/bin/bash
set -e

# Extract @snapback/cli app for OSS

echo "🔧 Extracting @snapback/cli app..."

PRIVATE_REPO=$(pwd)
OSS_REPO="../snapback-oss"

# Check if OSS repo exists
if [ ! -d "$OSS_REPO" ]; then
  echo "❌ OSS repository not found at $OSS_REPO"
  echo "Please run setup-oss-repo.sh first"
  exit 1
fi

# Copy the CLI app (excluding node_modules and build artifacts)
echo "Copying CLI app..."
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.turbo' --exclude='*.tsbuildinfo' apps/cli/ "$OSS_REPO/apps/cli/"

# Navigate to the copied app
cd "$OSS_REPO/apps/cli"

# Update package.json
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
  directory: 'apps/cli'
};

// Update homepage
pkg.homepage = 'https://snapback.dev';
pkg.bugs = {
  url: 'https://github.com/snapback-dev/snapback-oss/issues'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Create/update README.md
cat > README.md << 'EOF'
# @snapback/cli

> Command-line interface for SnapBack snapshot management

## Installation

Global installation:
```bash
npm install -g @snapback/cli
```

Or use with npx:
```bash
npx @snapback/cli <command>
```

## Usage

### Initialize SnapBack

```bash
snapback init
```

### Create Snapshot

```bash
snapback snapshot create <file>
snapback snapshot create <file> -m "Before refactoring"
```

### List Snapshots

```bash
snapback snapshot list
snapback snapshot list <file>
```

### Restore Snapshot

```bash
snapback restore <snapshot-id>
```

### File Protection

```bash
snapback protect <file> --level WARN
snapback protect <file> --level BLOCK
snapback unprotect <file>
```

### List Protected Files

```bash
snapback protected list
```

## Commands

- `init` - Initialize SnapBack in current directory
- `snapshot create <file>` - Create snapshot
- `snapshot list [file]` - List snapshots
- `snapshot delete <id>` - Delete snapshot
- `restore <id>` - Restore from snapshot
- `protect <file>` - Protect a file
- `unprotect <file>` - Unprotect a file
- `protected list` - List protected files
- `status` - Show SnapBack status

## Options

- `-m, --message <message>` - Add message to snapshot
- `-l, --level <level>` - Protection level (WATCH, WARN, BLOCK)
- `-f, --force` - Force operation without confirmation
- `--help` - Show help
- `--version` - Show version

## Configuration

Create `.snapbackrc` in your project root:

```json
{
  "protectionLevels": {
    "*.env": "BLOCK",
    "package.json": "WARN",
    "src/**/*.ts": "WATCH"
  }
}
```

## License

MIT © SnapBack Team
EOF

echo "✅ @snapback/cli extracted successfully!"
echo ""
echo "⚠️  Manual review required:"
echo "1. Remove any cloud sync commands"
echo "2. Remove API-dependent features"
echo "3. Keep only local filesystem operations"
echo ""
echo "Then:"
echo "1. cd $OSS_REPO/apps/cli"
echo "2. pnpm install"
echo "3. pnpm build"
echo "4. Test: ./dist/index.js --help"

cd "$PRIVATE_REPO"
