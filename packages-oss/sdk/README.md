# @snapback/sdk

[![npm version](https://img.shields.io/npm/v/@snapback/sdk?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@snapback/sdk?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback/sdk)
[![License](https://img.shields.io/badge/license-Apache%202.0-10B981?style=flat&colorA=18181B&colorB=10B981)](https://github.com/snapback-dev/sdk/blob/main/LICENSE)

**Production-ready TypeScript SDK for building code safety systems**

Part of [SnapBack](https://snapback.dev) - create snapshots before risky changes, protect critical files automatically, and analyze code for security risks with our powerful SDK.

---

## What is SnapBack?

SnapBack is a **code safety platform** that prevents breaking changes in your codebase. Create instant snapshots before refactoring, automatically protect sensitive files like `.env`, and get AI-powered risk warnings before accepting code changes.

This SDK gives you programmatic access to all SnapBack features.

[Learn more about code safety →](https://docs.snapback.dev/concepts/code-safety)

---

## What's This Package?

The complete **SnapBack SDK** with everything you need to build code safety into your applications:

- 📸 **Snapshot Management** - Create and restore code snapshots
- 🔒 **File Protection** - Pattern-based file protection rules
- 🛡️ **Risk Analysis** - Detect secrets and vulnerabilities
- 💾 **Storage Adapters** - Local SQLite or cloud storage
- 🎪 **Event System** - Subscribe to safety events

**Use this when:**
- Building custom developer tools
- Adding safety features to your CI/CD
- Creating automated code protection workflows
- Implementing snapshot-based rollback

[API Reference →](https://docs.snapback.dev/api/sdk)

---

## Installation

```bash
npm install @snapback/sdk
```

**Optional:**
```bash
npm install better-sqlite3  # For local storage
```

---

## Quick Start

### Create Your First Snapshot

```typescript
import { SnapshotManager } from '@snapback/sdk';

const manager = new SnapshotManager();
await manager.initialize();

// Save current state before making changes
const snapshot = await manager.create({
  reason: 'Before database migration',
  files: ['src/db/**/*']
});

console.log(`✓ Snapshot created: ${snapshot.id}`);

// Make your risky changes...

// Changed your mind? Restore instantly:
await manager.restore(snapshot.id);
```

[Complete snapshot guide →](https://docs.snapback.dev/guides/snapshots)

---

## Core Features

### 📸 Snapshot Management

Create point-in-time snapshots of your codebase for instant rollback.

```typescript
import { SnapshotManager } from '@snapback/sdk';

const manager = new SnapshotManager('./snapshots');

// Create snapshot before risky change
const snap = await manager.create({
  reason: 'Pre-deployment checkpoint',
  files: ['src/**/*', 'config/**/*'],
  tags: ['deployment', 'production']
});

// List all snapshots
const snapshots = await manager.list({
  limit: 50,
  tags: ['production']
});

// Restore from snapshot
await manager.restore(snap.id);
```

[Snapshot API reference →](https://docs.snapback.dev/api/sdk/snapshots)

### 🔒 File Protection

Protect critical files from accidental changes.

```typescript
import { ProtectionEngine } from '@snapback/sdk';

const engine = new ProtectionEngine();

// Protect sensitive files
engine.protect({
  pattern: '**/.env*',
  level: 'protected',
  reason: 'Contains API keys'
});

// Check if file is protected
if (engine.isProtected('.env.production')) {
  console.log('⚠️ This file is protected');
}
```

[File protection guide →](https://docs.snapback.dev/guides/file-protection)

### 🛡️ Risk Analysis

Analyze code for security risks before applying changes.

```typescript
import { RiskAnalyzer } from '@snapback/sdk';

const analyzer = new RiskAnalyzer();

// Analyze code for secrets
const analysis = await analyzer.analyze(`
  const API_KEY = "sk_live_abc123";
`);

console.log(analysis.riskLevel);  // → 'high'
console.log(analysis.issues);     // → Details about detected secret
```

[Risk analysis guide →](https://docs.snapback.dev/guides/risk-analysis)

---

## Storage Options

### Local Storage (Default)

Uses SQLite for fast, offline-first storage.

```typescript
import { LocalStorage } from '@snapback/sdk';

const storage = new LocalStorage('./snapback.db');
await storage.initialize();
```

**Pros:**
- ✅ Works completely offline
- ✅ Fast queries with SQLite
- ✅ No external dependencies

[Local storage setup →](https://docs.snapback.dev/guides/storage/local)

### Cloud Storage (Optional)

Sync snapshots across devices and teams.

```typescript
import { CloudStorage } from '@snapback/sdk';

const storage = new CloudStorage({
  apiKey: process.env.SNAPBACK_API_KEY
});
```

**Pros:**
- ✅ Access snapshots anywhere
- ✅ Team collaboration
- ✅ Automatic backups

[Cloud storage setup →](https://docs.snapback.dev/guides/storage/cloud)

---

## Real-World Examples

### CI/CD Integration

```typescript
// In your deployment script
import { SnapshotManager } from '@snapback/sdk';

const manager = new SnapshotManager();

// Before deploy
const snapshot = await manager.create({
  reason: `Deploy ${process.env.VERSION}`,
  tags: ['deployment', process.env.ENV]
});

try {
  await deploy();
} catch (error) {
  console.error('Deploy failed, rolling back...');
  await manager.restore(snapshot.id);
  throw error;
}
```

[CI/CD integration guide →](https://docs.snapback.dev/integrations/ci-cd)

### Pre-commit Hook

```typescript
// In .git/hooks/pre-commit
import { RiskAnalyzer } from '@snapback/sdk';

const analyzer = new RiskAnalyzer();
const staged = await getStagedFiles();

for (const file of staged) {
  const analysis = await analyzer.analyzeFile(file);

  if (analysis.riskLevel === 'high') {
    console.error(`⚠️ High risk in ${file}`);
    process.exit(1);
  }
}
```

[Git hooks guide →](https://docs.snapback.dev/integrations/git-hooks)

---

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Create snapshot | ~45ms | 100 files, SQLite |
| Restore snapshot | ~120ms | 100 files |
| List snapshots | ~5ms | 1000 snapshots |
| Risk analysis | ~30ms | 1000 lines of code |

*Benchmarked on MacBook Pro M1, Node.js 20*

[Performance optimization →](https://docs.snapback.dev/guides/performance)

---

## SnapBack Ecosystem

Build complete code safety solutions:

| Package | Purpose | Documentation |
|---------|---------|---------------|
| **[@snapback/contracts](https://www.npmjs.com/package/@snapback/contracts)** | TypeScript types | [Docs](https://docs.snapback.dev/api/contracts) |
| **[@snapback/sdk](https://www.npmjs.com/package/@snapback/sdk)** | Complete SDK (you are here) | [Docs](https://docs.snapback.dev/api/sdk) |
| **[@snapback/infrastructure](https://www.npmjs.com/package/@snapback/infrastructure)** | Logging & observability | [Docs](https://docs.snapback.dev/api/infrastructure) |
| **[@snapback/events](https://www.npmjs.com/package/@snapback/events)** | Event bus | [Docs](https://docs.snapback.dev/api/events) |
| **[@snapback/config](https://www.npmjs.com/package/@snapback/config)** | Configuration | [Docs](https://docs.snapback.dev/api/config) |
| **[@snapback/mcp-server](https://www.npmjs.com/package/@snapback/mcp-server)** | AI integration | [Docs](https://docs.snapback.dev/integrations/mcp) |
| **[VS Code Extension](https://marketplace.visualstudio.com/items?itemName=snapback.snapback)** | Editor integration | [Docs](https://docs.snapback.dev/integrations/vscode) |

[Explore the platform →](https://snapback.dev)

---

## Resources

- 🌐 **Website**: [snapback.dev](https://snapback.dev)
- 📖 **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/snapback-dev/sdk/issues)
- 💬 **Get Help**: [hello@snapback.dev](mailto:hello@snapback.dev)

---

## Contributing

We welcome contributions! See our [Contributing Guide](https://github.com/snapback-dev/sdk/blob/main/CONTRIBUTING.md).

**Quick Links:**
- [Development Setup](https://docs.snapback.dev/contributing/setup)
- [Architecture](https://docs.snapback.dev/contributing/architecture)
- [Testing Guide](https://docs.snapback.dev/contributing/testing)

---

## License

Apache-2.0 © [SnapBack](https://snapback.dev)

**Commercial use allowed** • See [LICENSE](https://github.com/snapback-dev/sdk/blob/main/LICENSE)

---

<div align="center">

**[snapback.dev](https://snapback.dev)** • **[Documentation](https://docs.snapback.dev)** • **[@snapbackdev](https://twitter.com/snapbackdev)**

Made with ❤️ for developers who ship with confidence

</div>
