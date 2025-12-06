# @snapback-oss/contracts

[![npm version](https://img.shields.io/npm/v/@snapback-oss/contracts?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback-oss/contracts)
[![npm downloads](https://img.shields.io/npm/dm/@snapback-oss/contracts?style=flat&colorA=18181B&colorB=10B981)](https://www.npmjs.com/package/@snapback-oss/contracts)
[![License](https://img.shields.io/badge/license-Apache%202.0-10B981?style=flat&colorA=18181B&colorB=10B981)](https://github.com/snapback-dev/contracts/blob/main/LICENSE)

**Production-grade TypeScript types for code safety infrastructure**

Part of [SnapBack](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=contracts) - the code safety platform that helps developers ship confidently through intelligent file protection, automatic snapshots, and AI-powered risk analysis for your codebase.

---

## What is SnapBack?

SnapBack is a **code safety platform** that protects your codebase from breaking changes. Think of it as version control on steroids - create instant snapshots before risky changes, automatically protect critical files, and get AI-powered risk analysis before accepting code suggestions.

[Learn more about code safety →](https://docs.snapback.dev/concepts/code-safety?utm_source=npm&utm_medium=readme&utm_campaign=contracts)

---

## What's This Package?

Pure **TypeScript type definitions** for building code safety systems. This package provides the type contracts used across the SnapBack ecosystem - from file protection levels to snapshot metadata to risk analysis results.

Zero runtime overhead, maximum type safety.

**Use this when:**
- Building custom safety tooling
- Extending SnapBack functionality
- Creating type-safe integrations
- Implementing framework-agnostic safety features

[API Reference →](https://docs.snapback.dev/api/contracts?utm_source=npm&utm_medium=readme&utm_campaign=contracts)

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

[View complete examples →](https://docs.snapback.dev/guides/type-safety?utm_source=npm&utm_medium=readme&utm_campaign=contracts)

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

[Learn about file protection →](https://docs.snapback.dev/concepts/file-protection?utm_source=npm&utm_medium=readme&utm_campaign=contracts)

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

[Understanding snapshots →](https://docs.snapback.dev/concepts/snapshots?utm_source=npm&utm_medium=readme&utm_campaign=contracts)

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

[How risk analysis works →](https://docs.snapback.dev/concepts/risk-analysis?utm_source=npm&utm_medium=readme&utm_campaign=contracts)

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

[TypeScript setup guide →](https://docs.snapback.dev/setup/typescript?utm_source=npm&utm_medium=readme&utm_campaign=contracts)

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
| **[@snapback-oss/contracts](https://www.npmjs.com/package/@snapback-oss/contracts)** | TypeScript types | [Docs](https://docs.snapback.dev/api/contracts?utm_source=npm&utm_medium=readme&utm_campaign=contracts) |
| **[@snapback-oss/sdk](https://www.npmjs.com/package/@snapback-oss/sdk)** | Complete SDK | [Docs](https://docs.snapback.dev/api/sdk?utm_source=npm&utm_medium=readme&utm_campaign=contracts) |
| **[@snapback-oss/infrastructure](https://www.npmjs.com/package/@snapback-oss/infrastructure)** | Observability toolkit | [Docs](https://docs.snapback.dev/api/infrastructure?utm_source=npm&utm_medium=readme&utm_campaign=contracts) |
| **[@snapback-oss/events](https://www.npmjs.com/package/@snapback-oss/events)** | Event bus | [Docs](https://docs.snapback.dev/api/events?utm_source=npm&utm_medium=readme&utm_campaign=contracts) |
| **[@snapback-oss/config](https://www.npmjs.com/package/@snapback-oss/config)** | Configuration | [Docs](https://docs.snapback.dev/api/config?utm_source=npm&utm_medium=readme&utm_campaign=contracts) |
| **[@snapback/mcp-server](https://www.npmjs.com/package/@snapback/mcp-server)** | AI integration | [Docs](https://docs.snapback.dev/integrations/mcp?utm_source=npm&utm_medium=readme&utm_campaign=contracts) |
| **[VS Code Extension](https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode&utm_source=npm&utm_medium=readme&utm_campaign=contracts)** | Editor integration | [Docs](https://new-docs.snapback.dev/integrations/vscode?utm_source=npm&utm_medium=readme&utm_campaign=contracts) |

[Explore the full platform →](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=contracts)

---

## Resources

- 🌐 **Website**: [snapback.dev](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=contracts)
- 📖 **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/snapback-dev/contracts/issues)
- 💬 **Get Help**: [hello@snapback.dev](mailto:hello@snapback.dev)

---

## Contributing

We welcome contributions! See our [Contributing Guide](https://github.com/snapback-dev/contracts/blob/main/CONTRIBUTING.md) to get started.

**Quick Links:**
- [Development Setup](https://docs.snapback.dev/contributing/setup?utm_source=npm&utm_medium=readme&utm_campaign=contracts)
- [Architecture Overview](https://docs.snapback.dev/contributing/architecture?utm_source=npm&utm_medium=readme&utm_campaign=contracts)
- [Code Style Guide](https://docs.snapback.dev/contributing/style-guide?utm_source=npm&utm_medium=readme&utm_campaign=contracts)

---

## License

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

This project is licensed under the **Apache 2.0 License**.
See [LICENSE](./LICENSE) for details.

---

<div align="center">

**[snapback.dev](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=contracts)** • **[Documentation](https://docs.snapback.dev)** • **[@snapbackdev](https://twitter.com/snapbackdev)**

Made with ❤️ for developers who ship with confidence

</div>
