# Contributing to SnapBack SDK

Guide for developers who want to contribute to the SnapBack SDK.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Testing Requirements](#testing-requirements)
5. [Submitting Changes](#submitting-changes)
6. [Architecture Overview](#architecture-overview)

---

## Getting Started

### Prerequisites

- Node.js 18+ (check with `node --version`)
- pnpm 8+ (install with `npm install -g pnpm`)
- Git

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/SnapBack-Dev/snapback.git
cd snapback

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start watch mode for development
pnpm dev
```

### Project Structure

```
packages/sdk/
├── src/
│   ├── analysis/       # Risk analysis engine
│   ├── core/           # Session management, detection
│   ├── snapshot/       # Snapshot creation, dedup
│   ├── storage/        # Storage adapters
│   ├── protection/     # File protection
│   └── Snapback.ts     # Main SDK class
├── __tests__/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── performance/    # Performance tests
└── docs/               # Documentation
```

---

## Development Workflow

### 1. Pick an Issue

```bash
# Find good first issues
gh issue list --label "good first issue" --repo SnapBack-Dev/sdk

# Or check the roadmap
cat ROADMAP.md
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number
```

### 3. Make Changes

```bash
# Edit files in packages/sdk/src/
# Follow TypeScript strict mode
# Use provided utilities and patterns
```

### 4. Test Locally

```bash
# Run unit tests
pnpm test

# Run specific test file
pnpm test snapshot.test.ts

# Watch mode
pnpm test --watch
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: description of change

- Detailed point 1
- Detailed point 2"
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
# Then create PR on GitHub
```

---

## Code Standards

### TypeScript

```typescript
// ✅ GOOD - Strict typing
function createSnapshot(
  files: FileInput[],
  options?: SnapshotOptions
): Promise<Result<Snapshot, SnapshotError>> {
  // Implementation
}

// ❌ BAD - Loose typing
function createSnapshot(files, options) {
  // Implementation
}
```

### Error Handling

```typescript
// ✅ Use Result pattern
const result = await operation()
if (isErr(result)) {
  return handleError(result.error)
}

// ❌ Don't mix patterns
try {
  const result = await operation()
  return result
} catch (error) {
  // Inconsistent
}
```

### Naming

```typescript
// ✅ Clear, descriptive names
const createSnapshotFromChanges = async (changes: ChangeInfo) => {}
const isRiskyPatternDetected = (content: string) => {}

// ❌ Unclear abbreviations
const snap = async (c) => {}
const check = (s) => {}
```

### Comments

```typescript
// ✅ Explain WHY, not WHAT
/**
 * We use LRU cache to bound memory usage while deduping
 * high-frequency patterns in large codebases
 */
private cache: LRUCache

// ❌ Stating the obvious
/**
 * This creates a snapshot
 */
function createSnapshot() {}
```

### Imports

```typescript
// ✅ Use package boundaries
import type { Snapshot } from '@snapback/contracts'
import { logger } from '@snapback/infrastructure'

// ❌ Relative imports across packages
import { Snapshot } from '../../contracts/src'
import { logger } from '../../../infrastructure/src'
```

---

## Testing Requirements

### Unit Tests

```typescript
// Each public function needs test coverage
describe('RiskAnalyzer', () => {
  it('should detect eval patterns', () => {
    const analyzer = new RiskAnalyzer()
    const result = analyzer.analyze('eval(code)')

    expect(result.score).toBeGreaterThan(0)
    expect(result.factors).toContain('eval execution')
  })

  it('should handle edge cases', () => {
    // Test empty, null, huge inputs
  })
})
```

### Integration Tests

```typescript
// Test flows between components
describe('Snapshot Workflow', () => {
  it('should create, list, and restore snapshots', async () => {
    const storage = new MemoryStorage()
    const sdk = new Snapback(storage)

    // Create
    const created = await sdk.createSnapshot(files)
    expect(created.id).toBeTruthy()

    // List
    const snapshots = await sdk.listSnapshots()
    expect(snapshots).toContain(created)

    // Restore
    const restored = await sdk.restoreSnapshot(created.id, targetDir)
    expect(restored.fileCount).toBe(files.length)
  })
})
```

### Coverage Requirements

- **Minimum:** 80% line coverage
- **Target:** 90%+ coverage
- **Critical paths:** 100% coverage

```bash
# Check coverage
pnpm coverage

# Generate HTML report
pnpm coverage --reporter=html
open coverage/index.html
```

---

## Submitting Changes

### PR Checklist

- [ ] Tests pass: `pnpm test`
- [ ] Types check: `pnpm type-check`
- [ ] Linting passes: `pnpm lint`
- [ ] Coverage maintained (run `pnpm coverage`)
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No console.log or debug code

### PR Description Template

```markdown
## Description
Brief explanation of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
How was this tested? Include steps to reproduce.

## Screenshots (if applicable)
Before/after screenshots for visual changes.

## Issues Closed
Closes #issue-number
```

### Code Review

Your PR will be reviewed for:
1. **Correctness** - Does it solve the problem?
2. **Performance** - Any performance implications?
3. **Maintainability** - Is it easy to understand?
4. **Security** - Any vulnerabilities?
5. **Tests** - Are tests comprehensive?
6. **Documentation** - Is it documented?

---

## Architecture Overview

### Core Components

**RiskAnalyzer**
- Detects dangerous patterns in code
- Returns score 0-10 with factors
- Configured via THRESHOLDS

**SnapshotManager**
- Creates, lists, restores snapshots
- Manages file content and metadata
- Uses StorageAdapter for persistence

**SessionCoordinator**
- Tracks user sessions and events
- Records snapshots, operations, errors
- Generates metrics and analytics

**StorageAdapter**
- Interface for persistence layer
- Implementations: Memory, Local, S3, SQLite
- Handles CRUD operations on snapshots

### Key Patterns

**Result<T, E> Pattern**
```typescript
// Instead of throwing, return Result
type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E }
```

**Type Guards**
```typescript
function isErr<T, E>(r: Result<T, E>): r is { success: false; error: E } {
  return r.success === false
}
```

**Const Assertions for Config**
```typescript
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const
type RiskLevel = typeof RISK_LEVELS[number]
```

---

## Debugging Tips

### Enable Detailed Logging

```typescript
import { logger } from '@snapback/infrastructure'

logger.debug('Operation details', {
  fileCount: 100,
  duration: 1234,
  riskScore: 5.5
})
```

### Inspect with VSCode Debugger

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Commands

```bash
# Run tests in watch mode
pnpm test --watch

# Debug a specific test
pnpm test --inspect-brk snapshot.test.ts

# Check TypeScript errors
pnpm type-check

# Format code
pnpm format

# Lint for issues
pnpm lint
```

---

## Reporting Issues

### Good Bug Report

```markdown
## Description
Snapshot creation fails on Windows with special characters in filenames

## Steps to Reproduce
1. Create file named `test-ñ-file.ts`
2. Call `sdk.createSnapshot([file])`
3. Observe error

## Expected
Snapshot created successfully

## Actual
Error: Invalid file path

## Environment
- OS: Windows 11
- Node: 18.16.0
- SDK: 1.0.0-beta
```

### Feature Request

```markdown
## Problem
Users need to share snapshots between machines

## Proposed Solution
Add `snapshot.export()` and `snapshot.import()` methods

## Example Usage
```typescript
const exported = await snapshot.export()
const restored = await Snapshot.import(exported)
```

---

## Community

- **GitHub Discussions:** https://github.com/SnapBack-Dev/sdk/discussions
- **Issues:** https://github.com/SnapBack-Dev/sdk/issues
- **Roadmap:** https://github.com/SnapBack-Dev/sdk/projects
- **Email:** dev@snapback.dev

---

## License

All contributions are licensed under the MIT License.

**Last Updated:** 2025-11-20
