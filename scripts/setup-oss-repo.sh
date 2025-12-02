#!/bin/bash
set -e

# SnapBack OSS Repository Setup Script
# This script creates the initial structure for the public OSS repository

echo "🚀 Setting up SnapBack OSS Repository..."

# Configuration
OSS_REPO_NAME="snapback-oss"
CURRENT_DIR=$(pwd)

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create OSS repo directory
echo -e "${BLUE}Creating directory structure...${NC}"
mkdir -p "../$OSS_REPO_NAME"
cd "../$OSS_REPO_NAME"

# Initialize git
if [ ! -d ".git" ]; then
  echo -e "${BLUE}Initializing git repository...${NC}"
  git init
  echo "node_modules/" > .gitignore
  echo "dist/" >> .gitignore
  echo ".turbo/" >> .gitignore
  echo ".env" >> .gitignore
  echo ".env.local" >> .gitignore
  echo "*.log" >> .gitignore
  echo ".DS_Store" >> .gitignore
  echo "coverage/" >> .gitignore
  echo ".vscode-test/" >> .gitignore
  echo "*.vsix" >> .gitignore
fi

# Create folder structure
echo -e "${BLUE}Creating folder structure...${NC}"
mkdir -p apps/cli
mkdir -p apps/vscode
mkdir -p packages/sdk
mkdir -p packages/core
mkdir -p packages/contracts
mkdir -p packages/config
mkdir -p packages/events
mkdir -p packages/tsconfig
mkdir -p examples/basic-usage
mkdir -p examples/custom-integration
mkdir -p docs/community
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE

# Create root package.json
echo -e "${BLUE}Creating root package.json...${NC}"
cat > package.json << 'EOF'
{
  "name": "snapback-oss",
  "version": "1.0.0",
  "private": true,
  "description": "Open source snapshot and file protection system",
  "repository": {
    "type": "git",
    "url": "https://github.com/snapback-dev/snapback-oss.git"
  },
  "license": "MIT",
  "author": "SnapBack Team",
  "packageManager": "pnpm@10.14.0",
  "engines": {
    "node": ">=18.17.0"
  },
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "type-check": "turbo type-check",
    "clean": "turbo clean",
    "format": "biome format --write .",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.2.4",
    "@changesets/cli": "^2.29.7",
    "turbo": "^2.3.4",
    "typescript": "^5.9.2"
  }
}
EOF

# Create pnpm-workspace.yaml
echo -e "${BLUE}Creating pnpm-workspace.yaml...${NC}"
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - apps/*
  - packages/*
  - '!apps/vscode/.vscode-test/**'

catalogs:
  default:
    '@types/node': 24.5.1
    'typescript': 5.9.2
    'tsup': 8.5.0
    'tsx': 4.20.5
    'vitest': 3.2.4
    '@vitest/coverage-v8': 3.2.4
    '@vitest/ui': 3.2.4
    'better-sqlite3': 9.6.0
    '@types/better-sqlite3': 7.6.13
    'zod': 4.1.8
    'chalk': 4.1.2
    'commander': 9.5.0
    'ora': 5.4.1
    '@inquirer/prompts': 7.9.0
    'eventemitter2': 6.4.9
    'diff': 7.0.0
    '@types/diff': 5.2.1
    'esprima': 4.0.1
    '@types/esprima': 4.0.6
EOF

# Create turbo.json
echo -e "${BLUE}Creating turbo.json...${NC}"
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": ["*"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "*.tsbuildinfo"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    },
    "clean": {
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
EOF

# Create tsconfig.json
echo -e "${BLUE}Creating tsconfig.json...${NC}"
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist"]
}
EOF

# Create biome.json
echo -e "${BLUE}Creating biome.json...${NC}"
cat > biome.json << 'EOF'
{
  "$schema": "https://biomejs.dev/schemas/1.9.3/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "off"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
EOF

# Create .npmrc
echo -e "${BLUE}Creating .npmrc...${NC}"
cat > .npmrc << 'EOF'
auto-install-peers=true
strict-peer-dependencies=false
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
EOF

# Create README.md
echo -e "${BLUE}Creating README.md...${NC}"
cat > README.md << 'EOF'
# SnapBack OSS 🧢

> Open source snapshot and file protection system

[![npm version](https://badge.fury.io/js/%40snapback%2Fsdk.svg)](https://www.npmjs.com/package/@snapback/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SnapBack is an AI-aware code protection system that automatically creates intelligent snapshots before AI assistants make changes to your codebase.

## Features

- 📸 **Smart Snapshots** - Content-based deduplication, Git-aware naming
- 🛡️ **File Protection** - Three-level protection system (Watch, Warn, Block)
- 🤖 **AI Detection** - Automatically identifies AI-generated code
- 💻 **VS Code Extension** - Native IDE integration
- 🔧 **CLI Tool** - Command-line interface for automation
- 📦 **SDK** - TypeScript SDK for custom integrations

## Quick Start

### Install CLI

```bash
npm install -g @snapback/cli
```

### Install VS Code Extension

Search for "SnapBack" in VS Code extensions marketplace, or:

```bash
code --install-extension MarcelleLabs.snapback-vscode
```

### Use SDK

```bash
npm install @snapback/sdk
```

```typescript
import { SnapBackSDK } from '@snapback/sdk';

const sdk = new SnapBackSDK();
await sdk.createSnapshot('myfile.ts', 'Before refactoring');
```

## Packages

This monorepo contains:

- **[@snapback/sdk](./packages/sdk)** - TypeScript SDK
- **[@snapback/core](./packages/core)** - Core snapshot functionality
- **[@snapback/contracts](./packages/contracts)** - Shared TypeScript types
- **[@snapback/config](./packages/config)** - Configuration utilities
- **[@snapback/events](./packages/events)** - Event system
- **[@snapback/cli](./apps/cli)** - CLI tool
- **[snapback-vscode](./apps/vscode)** - VS Code extension

## Documentation

- [Getting Started](https://docs.snapback.dev/getting-started)
- [CLI Documentation](https://docs.snapback.dev/cli)
- [SDK Reference](https://docs.snapback.dev/sdk)
- [VS Code Extension Guide](https://docs.snapback.dev/vscode)

## Community vs Commercial

**SnapBack OSS** (This Repository) - Free & Open Source:
- ✅ Local snapshots
- ✅ File protection
- ✅ Basic AI detection
- ✅ VS Code extension
- ✅ CLI tool
- ✅ SDK

**SnapBack Cloud** - Commercial/Enterprise:
- ☁️ Cloud sync
- 👥 Team collaboration
- 🔐 Enterprise SSO
- 📊 Advanced analytics
- 🎯 Priority support

[Compare Plans](https://snapback.dev/pricing)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) for details.

## Links

- [Website](https://snapback.dev)
- [Documentation](https://docs.snapback.dev)
- [Discord Community](https://discord.gg/snapback)
- [Twitter](https://twitter.com/snapback_dev)
EOF

# Create initial commit
echo -e "${BLUE}Creating initial commit...${NC}"
git add .
git commit -m "chore: initial OSS repository structure" || true

echo -e "${GREEN}✅ OSS repository structure created successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. cd ../$OSS_REPO_NAME"
echo "2. Review the structure"
echo "3. Run package extraction scripts"
echo "4. Initialize pnpm: corepack enable && pnpm install"
echo ""
echo -e "${BLUE}Repository location: $CURRENT_DIR/../$OSS_REPO_NAME${NC}"

cd "$CURRENT_DIR"
