# CLI Enhancement Spec: Boxen Integration

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | CLI-UX-001 |
| **Priority** | P1 - High (Demo Critical) |
| **Estimated Effort** | 2 hours |
| **Dependencies** | None |
| **Author** | SnapBack Team |
| **Created** | 2024-12-21 |
| **Status** | Draft |

---

## Problem Statement

The current CLI output is plain text with basic chalk coloring. Critical moments like snapshot creation, risk detection, and recovery operations blend into the terminal noise. For SnapBack's "Pioneer Program" gamification to succeed, we need **screenshot-worthy moments** that users want to share.

### Current State

```bash
$ snapback snapshot -m "before AI changes"
✔ Snapshot created
Created snapshot abc123de
```

### Desired State

```bash
$ snapback snapshot -m "before AI changes"
╔═══════════════════════════════════════════════╗
║        🛡️ SnapBack Protection Active          ║
╠═══════════════════════════════════════════════╣
║  ✓ Snapshot created                           ║
║  ID: abc123de                                 ║
║  Message: before AI changes                   ║
║  Files: 12 protected                          ║
╚═══════════════════════════════════════════════╝
```

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Display boxed output for snapshot creation success | Must Have |
| FR-002 | Display boxed output for high-risk detection (score > 7) | Must Have |
| FR-003 | Display boxed output for rollback/restore operations | Must Have |
| FR-004 | Display "save story" box when SnapBack prevents a disaster | Should Have |
| FR-005 | Support `--quiet` flag to suppress boxed output | Must Have |
| FR-006 | Support `--json` flag to output raw JSON (no boxes) | Must Have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Box rendering must not block for > 10ms | < 10ms |
| NFR-002 | Package size impact | < 50KB |
| NFR-003 | No external runtime dependencies | 0 |

---

## Technical Design

### Package Selection

```bash
pnpm add boxen@8.0.1
```

**Rationale:** boxen v8 is ESM-native, tree-shakeable, and has zero runtime dependencies beyond string-width and related utilities (all bundled).

### API Design

```typescript
// src/utils/display.ts

import boxen, { Options as BoxenOptions } from 'boxen';
import chalk from 'chalk';

export type BoxType = 'success' | 'warning' | 'error' | 'info' | 'save-story';

interface DisplayBoxOptions {
  title?: string;
  type?: BoxType;
  padding?: number;
  margin?: number;
}

const BOX_STYLES: Record<BoxType, Partial<BoxenOptions>> = {
  success: {
    borderColor: 'green',
    borderStyle: 'round',
  },
  warning: {
    borderColor: 'yellow',
    borderStyle: 'round',
  },
  error: {
    borderColor: 'red',
    borderStyle: 'round',
  },
  info: {
    borderColor: 'cyan',
    borderStyle: 'round',
  },
  'save-story': {
    borderColor: 'green',
    borderStyle: 'double',
    padding: 1,
    margin: 1,
  },
};

export function displayBox(
  content: string,
  options: DisplayBoxOptions = {}
): string {
  const { title, type = 'info', padding = 1, margin = 0 } = options;
  
  return boxen(content, {
    ...BOX_STYLES[type],
    padding,
    margin,
    ...(title && { title, titleAlignment: 'center' }),
  });
}
```

### Integration Points

#### 1. Snapshot Creation (`snapshot` command)

```typescript
// src/index.ts - snapshot command

spinner.succeed('Snapshot created');

if (!options.quiet && !options.json) {
  console.log(displayBox(
    `${chalk.green('✓')} Snapshot created\n` +
    `${chalk.cyan('ID:')} ${snap.id.substring(0, 8)}\n` +
    `${chalk.cyan('Message:')} ${options.message || '(none)'}\n` +
    `${chalk.cyan('Files:')} ${fileCount} protected`,
    {
      title: '🛡️ SnapBack Protection Active',
      type: 'success',
    }
  ));
}
```

#### 2. High-Risk Detection (`analyze` command)

```typescript
// src/index.ts - analyze command (when riskScore > 7)

if (riskData.riskScore > 7 && !options.quiet) {
  console.log(displayBox(
    `${chalk.red('⚠ High Risk Detected')}\n\n` +
    `${chalk.cyan('File:')} ${file}\n` +
    `${chalk.cyan('Risk Score:')} ${chalk.red(riskData.riskScore.toFixed(1) + '/10')}\n\n` +
    `${chalk.yellow('Recommendation:')} Create a snapshot before proceeding`,
    {
      title: '🚨 Risk Analysis',
      type: 'warning',
    }
  ));
}
```

#### 3. Save Story Display (new function)

```typescript
// src/utils/display.ts

export function displaySaveStory(
  riskScore: number,
  affectedFiles: string[],
  snapshotId: string
): string {
  return displayBox(
    `${chalk.bold('🛡️ SnapBack just protected you!')}\n\n` +
    `${chalk.cyan('Risk Score:')} ${chalk.red(riskScore.toFixed(1) + '/10')}\n` +
    `${chalk.cyan('Files Protected:')} ${chalk.green(affectedFiles.length.toString())}\n` +
    `${chalk.cyan('Snapshot:')} ${snapshotId.substring(0, 8)}\n\n` +
    chalk.dim('Share your save story: snapback.dev/stories'),
    {
      type: 'save-story',
    }
  );
}
```

---

## Test Plan

### Unit Tests

```typescript
// test/utils/display.test.ts

import { describe, it, expect } from 'vitest';
import { displayBox, displaySaveStory } from '../../src/utils/display';

describe('displayBox', () => {
  // Happy path
  it('should render a success box with title', () => {
    const result = displayBox('Test content', {
      title: 'Test Title',
      type: 'success',
    });
    
    expect(result).toContain('Test content');
    expect(result).toContain('Test Title');
    // Box characters present
    expect(result).toMatch(/[╭╮╰╯│─]/);
  });

  // Sad path
  it('should handle empty content gracefully', () => {
    const result = displayBox('', { type: 'info' });
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  // Edge case
  it('should handle very long content without breaking', () => {
    const longContent = 'A'.repeat(500);
    const result = displayBox(longContent, { type: 'info' });
    expect(result).toContain('A'.repeat(100)); // At least partial content
  });

  // Error case
  it('should default to info type for unknown types', () => {
    // @ts-expect-error - Testing runtime behavior
    const result = displayBox('Test', { type: 'unknown' });
    expect(result).toBeDefined();
  });
});

describe('displaySaveStory', () => {
  // Happy path
  it('should render save story with all fields', () => {
    const result = displaySaveStory(8.5, ['file1.ts', 'file2.ts'], 'abc123def456');
    
    expect(result).toContain('SnapBack just protected you');
    expect(result).toContain('8.5/10');
    expect(result).toContain('2'); // file count
    expect(result).toContain('abc123de'); // truncated ID
  });

  // Edge case
  it('should handle zero files', () => {
    const result = displaySaveStory(5.0, [], 'abc123def456');
    expect(result).toContain('0');
  });
});
```

### Integration Tests

```typescript
// test/commands/snapshot.integration.test.ts

import { describe, it, expect } from 'vitest';
import { createCLI } from '../../src/index';

describe('snapshot command with boxen output', () => {
  it('should display boxed output on success', async () => {
    // Capture stdout
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    
    try {
      const program = createCLI();
      await program.parseAsync(['node', 'snapback', 'snapshot', '-m', 'test']);
      
      const output = logs.join('\n');
      expect(output).toContain('SnapBack Protection Active');
      expect(output).toMatch(/[╭╮╰╯│─]/); // Box characters
    } finally {
      console.log = originalLog;
    }
  });

  it('should NOT display box when --quiet is set', async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    
    try {
      const program = createCLI();
      await program.parseAsync(['node', 'snapback', 'snapshot', '-q']);
      
      const output = logs.join('\n');
      expect(output).not.toMatch(/[╭╮╰╯│─]/);
    } finally {
      console.log = originalLog;
    }
  });
});
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/cli/package.json` | Modify | Add `boxen@^8.0.1` dependency |
| `apps/cli/src/utils/display.ts` | Create | Box rendering utilities |
| `apps/cli/src/index.ts` | Modify | Integrate boxed output in commands |
| `apps/cli/test/utils/display.test.ts` | Create | Unit tests for display utilities |
| `apps/cli/test/commands/snapshot.integration.test.ts` | Modify | Add integration tests |

---

## Rollout Plan

1. **Phase 1: Core Implementation** (1 hour)
   - Add dependency
   - Create `display.ts` utility
   - Write unit tests

2. **Phase 2: Command Integration** (30 mins)
   - Update `snapshot` command
   - Update `analyze` command
   - Add `--quiet` flag handling

3. **Phase 3: Testing & Polish** (30 mins)
   - Run integration tests
   - Manual testing in terminal
   - Verify no regressions

---

## Acceptance Criteria

- [ ] `snapback snapshot` displays boxed success output
- [ ] `snapback analyze <file>` displays boxed warning for high-risk files
- [ ] `--quiet` flag suppresses all boxed output
- [ ] `--json` flag outputs raw JSON with no formatting
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Bundle size increase < 50KB
- [ ] No TypeScript errors

---

## Open Questions

1. **Q:** Should we add a `--no-box` flag separate from `--quiet`?
   **A:** Defer - `--quiet` covers this use case for now.

2. **Q:** Should save stories be automatically posted to analytics?
   **A:** Yes, but tracked separately in telemetry spec.
