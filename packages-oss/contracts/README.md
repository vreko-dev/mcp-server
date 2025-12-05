# @snapback/contracts

[![npm version](https://img.shields.io/npm/v/@snapback/contracts?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback/contracts)
[![npm downloads](https://img.shields.io/npm/dm/@snapback/contracts?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback/contracts)
[![License](https://img.shields.io/badge/license-Apache%202.0-10B981?style=flat&colorA=18181B&colorB=10B981)](https://github.com/snapback-dev/contracts/blob/main/LICENSE)

**Production-grade TypeScript types for code safety infrastructure**

Part of [SnapBack](https://snapback.dev) - the code safety platform that helps developers ship confidently through intelligent file protection, automatic snapshots, and AI-powered risk analysis for your codebase.

---

## What is SnapBack?

SnapBack is a **code safety platform** that protects your codebase from breaking changes. Think of it as version control on steroids - create instant snapshots before risky changes, automatically protect critical files, and get AI-powered risk analysis before accepting code suggestions.

[Learn more about code safety →](https://docs.snapback.dev/concepts/code-safety)

---

## What's This Package?

Pure **TypeScript type definitions** for building code safety systems. This package provides the type contracts used across the SnapBack ecosystem - from file protection levels to snapshot metadata to risk analysis results.

Zero runtime overhead, maximum type safety.

**Use this when:**
- Building custom safety tooling
- Extending SnapBack functionality
- Creating type-safe integrations
- Implementing framework-agnostic safety features

[API Reference →](https://docs.snapback.dev/api/contracts)

---

## Installation

```bash
npm install @snapback/contracts
```

**Requirements:**
- TypeScript 5.0+
- Node.js 18+

---

## Quick Start

```typescript
import type { ProtectionLevel, Snapshot, RiskAnalysis } from '@snapback/contracts';

// File protection types
const level: ProtectionLevel = 'protected';

// Snapshot types
const snapshot: Snapshot = {
  id: 'snap_xyz123',
  timestamp: Date.now(),
  reason: 'Before database migration',
  fileCount: 23
};

// Risk analysis types
const analysis: RiskAnalysis = {
  riskLevel: 'high',
  score: 8.5,
  confidence: 0.95,
  issues: []
};
```

[View complete examples →](https://docs.snapback.dev/guides/type-safety)

---

## Core Type Categories

### File Protection Types

Define protection levels and rules for critical files in your codebase.

```typescript
import type {
  ProtectionLevel,
  ProtectedFile,
  ProtectionRule
} from '@snapback/contracts';

type ProtectionLevel = 'watched' | 'caution' | 'protected';

interface ProtectedFile {
  path: string;
  level: ProtectionLevel;
  timestamp: number;
}
```

[Learn about file protection →](https://docs.snapback.dev/concepts/file-protection)

### Snapshot Types

Type-safe snapshot creation and restoration for your codebase.

```typescript
import type { Snapshot, SnapshotMetadata } from '@snapback/contracts';

interface Snapshot {
  id: string;
  timestamp: number;
  reason: string;
  fileCount: number;
  metadata?: SnapshotMetadata;
}
```

[Understanding snapshots →](https://docs.snapback.dev/concepts/snapshots)

### Risk Analysis Types

AI-powered risk detection type definitions.

```typescript
import type { RiskAnalysis, SecurityIssue } from '@snapback/contracts';

interface RiskAnalysis {
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  score: number;          // 0-10 scale
  confidence: number;     // 0-1 confidence score
  issues: SecurityIssue[];
}
```

[How risk analysis works →](https://docs.snapback.dev/concepts/risk-analysis)

---

## TypeScript Configuration

For best type safety with SnapBack contracts:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2022"
  }
}
```

[TypeScript setup guide →](https://docs.snapback.dev/setup/typescript)

---

## Bundle Impact

```
@snapback/contracts: 0 kB (types only)
```

All types are stripped during compilation - **zero runtime cost**.

---

## SnapBack Ecosystem

Build complete code safety solutions with the SnapBack platform:

| Package | Purpose | Documentation |
|---------|---------|---------------|
| **[@snapback/contracts](https://www.npmjs.com/package/@snapback/contracts)** | TypeScript types | [Docs](https://docs.snapback.dev/api/contracts) |
| **[@snapback/sdk](https://www.npmjs.com/package/@snapback/sdk)** | Complete SDK | [Docs](https://docs.snapback.dev/api/sdk) |
| **[@snapback/infrastructure](https://www.npmjs.com/package/@snapback/infrastructure)** | Observability toolkit | [Docs](https://docs.snapback.dev/api/infrastructure) |
| **[@snapback/events](https://www.npmjs.com/package/@snapback/events)** | Event bus | [Docs](https://docs.snapback.dev/api/events) |
| **[@snapback/config](https://www.npmjs.com/package/@snapback/config)** | Configuration | [Docs](https://docs.snapback.dev/api/config) |
| **[@snapback/mcp-server](https://www.npmjs.com/package/@snapback/mcp-server)** | AI integration | [Docs](https://docs.snapback.dev/integrations/mcp) |
| **[VS Code Extension](https://marketplace.visualstudio.com/items?itemName=snapback.snapback)** | Editor integration | [Docs](https://docs.snapback.dev/integrations/vscode) |

[Explore the full platform →](https://snapback.dev)

---

## Resources

- 🌐 **Website**: [snapback.dev](https://snapback.dev)
- 📖 **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/snapback-dev/contracts/issues)
- 💬 **Get Help**: [hello@snapback.dev](mailto:hello@snapback.dev)

---

## Contributing

We welcome contributions! See our [Contributing Guide](https://github.com/snapback-dev/contracts/blob/main/CONTRIBUTING.md) to get started.

**Quick Links:**
- [Development Setup](https://docs.snapback.dev/contributing/setup)
- [Architecture Overview](https://docs.snapback.dev/contributing/architecture)
- [Code Style Guide](https://docs.snapback.dev/contributing/style-guide)

---

## License

Apache-2.0 © [SnapBack](https://snapback.dev)

**Commercial use allowed** • See [LICENSE](https://github.com/snapback-dev/contracts/blob/main/LICENSE) for details

---

<div align="center">

**[snapback.dev](https://snapback.dev)** • **[Documentation](https://docs.snapback.dev)** • **[@snapbackdev](https://twitter.com/snapbackdev)**

Made with ❤️ for developers who ship with confidence

</div>
