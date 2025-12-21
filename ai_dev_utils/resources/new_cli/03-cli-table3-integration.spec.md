# CLI Enhancement Spec: CLI-Table3 Integration

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | CLI-UX-003 |
| **Priority** | P2 - Medium (Demo Polish) |
| **Estimated Effort** | 2 hours |
| **Dependencies** | CLI-UX-001 (boxen) |
| **Author** | SnapBack Team |
| **Created** | 2024-12-21 |
| **Status** | Draft |

---

## Problem Statement

Risk analysis output currently uses `console.log` with basic formatting. When multiple risk signals are detected, the output becomes hard to scan. For expert users who need to quickly triage risks, structured tabular output is essential.

### Current State

```bash
$ snapback analyze src/auth.ts

Risk Level: HIGH
Risk Score: 7.2/10

Risk Factors:
  ⚠ complexity: 3.5
  ⚠ deletions: 2.8
  ⚠ aiGenerated: 1.2
```

### Desired State

```bash
$ snapback analyze src/auth.ts

Risk Level: HIGH
Risk Score: 7.2/10

┌──────────────────┬───────┬──────────┐
│ Signal           │ Score │ Severity │
├──────────────────┼───────┼──────────┤
│ complexity       │  3.5  │    ●●●   │
│ deletions        │  2.8  │    ●●○   │
│ aiGenerated      │  1.2  │    ●○○   │
└──────────────────┴───────┴──────────┘

Top Recommendation: Review authentication logic changes carefully.
```

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Display risk signals in formatted table | Must Have |
| FR-002 | Show severity indicator (visual dots/bars) | Must Have |
| FR-003 | Support colored output based on severity | Must Have |
| FR-004 | Sort signals by score (highest first) | Should Have |
| FR-005 | Support `--no-color` for piping | Should Have |
| FR-006 | Display file comparison table for batch analysis | Should Have |
| FR-007 | Support `--json` to bypass table formatting | Must Have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Table rendering time | < 10ms |
| NFR-002 | Package size impact | < 40KB |
| NFR-003 | Terminal width handling | Auto-wrap or truncate |

---

## Technical Design

### Package Selection

```bash
pnpm add cli-table3@^0.6.5
```

**Rationale:**
- cli-table3 is the maintained fork of cli-table
- Supports colors, Unicode box characters, spanning
- Small footprint with no heavy dependencies
- Good terminal width handling

### API Design

```typescript
// src/utils/tables.ts

import Table from 'cli-table3';
import chalk from 'chalk';

export interface RiskSignal {
  signal: string;
  value: number;
  description?: string;
}

export interface FileRiskSummary {
  file: string;
  riskScore: number;
  riskLevel: string;
  topSignal?: string;
}

/**
 * Render severity as visual indicator
 */
function renderSeverity(value: number, maxValue: number = 10): string {
  const normalized = Math.min(value / maxValue, 1);
  const filled = Math.round(normalized * 3);
  const empty = 3 - filled;
  
  const dot = '●';
  const emptyDot = '○';
  
  let color: typeof chalk.red;
  if (normalized > 0.7) {
    color = chalk.red;
  } else if (normalized > 0.4) {
    color = chalk.yellow;
  } else {
    color = chalk.green;
  }
  
  return color(dot.repeat(filled)) + chalk.gray(emptyDot.repeat(empty));
}

/**
 * Create a table for risk signals
 */
export function createRiskSignalTable(signals: RiskSignal[]): string {
  if (signals.length === 0) {
    return chalk.green('No risk signals detected.');
  }

  // Sort by value descending
  const sorted = [...signals].sort((a, b) => b.value - a.value);

  const table = new Table({
    head: [
      chalk.cyan('Signal'),
      chalk.cyan('Score'),
      chalk.cyan('Severity'),
    ],
    style: {
      head: [],
      border: [],
    },
    colWidths: [20, 8, 12],
  });

  for (const signal of sorted) {
    // Only show signals with value > 0
    if (signal.value <= 0) continue;

    table.push([
      signal.signal,
      signal.value.toFixed(1),
      renderSeverity(signal.value),
    ]);
  }

  return table.toString();
}

/**
 * Create a summary table for batch file analysis
 */
export function createFileSummaryTable(files: FileRiskSummary[]): string {
  if (files.length === 0) {
    return chalk.green('No files analyzed.');
  }

  // Sort by risk score descending
  const sorted = [...files].sort((a, b) => b.riskScore - a.riskScore);

  const table = new Table({
    head: [
      chalk.cyan('File'),
      chalk.cyan('Risk'),
      chalk.cyan('Level'),
      chalk.cyan('Top Signal'),
    ],
    style: {
      head: [],
      border: [],
    },
    colWidths: [40, 8, 10, 15],
    wordWrap: true,
  });

  for (const file of sorted) {
    const levelColor = 
      file.riskLevel === 'high' ? chalk.red :
      file.riskLevel === 'medium' ? chalk.yellow :
      chalk.green;

    table.push([
      truncatePath(file.file, 38),
      file.riskScore.toFixed(1),
      levelColor(file.riskLevel.toUpperCase()),
      file.topSignal || '-',
    ]);
  }

  return table.toString();
}

/**
 * Create a compact inline table for snapshot listing
 */
export function createSnapshotTable(snapshots: Array<{
  id: string;
  timestamp: Date;
  message?: string;
  fileCount?: number;
}>): string {
  if (snapshots.length === 0) {
    return chalk.yellow('No snapshots found.');
  }

  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Created'),
      chalk.cyan('Message'),
      chalk.cyan('Files'),
    ],
    style: {
      head: [],
      border: [],
    },
    colWidths: [12, 22, 30, 8],
    wordWrap: true,
  });

  for (const snap of snapshots) {
    table.push([
      snap.id.substring(0, 8),
      formatRelativeTime(snap.timestamp),
      snap.message || chalk.gray('(none)'),
      snap.fileCount?.toString() || '-',
    ]);
  }

  return table.toString();
}

/**
 * Helper: truncate file path intelligently
 */
function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;
  
  const parts = path.split('/');
  if (parts.length <= 2) {
    return '...' + path.slice(-(maxLength - 3));
  }
  
  // Keep filename and first directory
  const filename = parts[parts.length - 1];
  const firstDir = parts[0];
  
  if (filename.length + firstDir.length + 5 > maxLength) {
    return '...' + filename.slice(-(maxLength - 3));
  }
  
  return `${firstDir}/.../${filename}`;
}

/**
 * Helper: format timestamp as relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
```

### Integration Points

#### 1. Update `analyze` Command

```typescript
// src/index.ts - analyze command

import { createRiskSignalTable } from './utils/tables';

// After analysis is complete
console.log(chalk.cyan('Risk Level:'), riskData.riskLevel.toUpperCase());
console.log(chalk.cyan('Risk Score:'), `${riskData.riskScore.toFixed(1)}/10`);
console.log();

if (riskData.signals && riskData.signals.length > 0 && !options.quiet) {
  console.log(createRiskSignalTable(riskData.signals));
}
```

#### 2. Update `check` Command (Batch Analysis)

```typescript
// src/index.ts - check command

import { createFileSummaryTable } from './utils/tables';

// After analyzing all files
const fileResults: FileRiskSummary[] = [];

for (const file of filesToCheck) {
  const result = await engineAdapter.analyze({ ... });
  
  fileResults.push({
    file,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    topSignal: result.signals?.[0]?.signal,
  });
}

if (!options.quiet && fileResults.length > 0) {
  console.log();
  console.log(chalk.cyan('Analysis Results:'));
  console.log(createFileSummaryTable(fileResults));
}
```

#### 3. Update `list` Command

```typescript
// src/index.ts - list command

import { createSnapshotTable } from './utils/tables';

// Replace console.table with formatted table
const snapshots = await storage.list();

if (snapshots.length === 0) {
  console.log(chalk.yellow('No snapshots found'));
  return;
}

console.log(createSnapshotTable(
  snapshots.map(s => ({
    id: s.id,
    timestamp: new Date(s.timestamp),
    message: s.meta?.message,
    fileCount: s.files?.length,
  }))
));
```

---

## Test Plan

### Unit Tests

```typescript
// test/utils/tables.test.ts

import { describe, it, expect } from 'vitest';
import { 
  createRiskSignalTable, 
  createFileSummaryTable,
  createSnapshotTable 
} from '../../src/utils/tables';

describe('createRiskSignalTable', () => {
  // Happy path
  it('should render signals sorted by value', () => {
    const signals = [
      { signal: 'low', value: 1.0 },
      { signal: 'high', value: 8.0 },
      { signal: 'medium', value: 4.5 },
    ];

    const result = createRiskSignalTable(signals);

    // High should appear first
    const lines = result.split('\n');
    const highIndex = lines.findIndex(l => l.includes('high'));
    const lowIndex = lines.findIndex(l => l.includes('low'));
    
    expect(highIndex).toBeLessThan(lowIndex);
  });

  // Edge case: empty signals
  it('should handle empty signal array', () => {
    const result = createRiskSignalTable([]);
    expect(result).toContain('No risk signals detected');
  });

  // Edge case: zero-value signals
  it('should filter out zero-value signals', () => {
    const signals = [
      { signal: 'active', value: 3.0 },
      { signal: 'inactive', value: 0 },
    ];

    const result = createRiskSignalTable(signals);

    expect(result).toContain('active');
    expect(result).not.toContain('inactive');
  });

  // Severity indicators
  it('should show correct severity indicators', () => {
    const signals = [
      { signal: 'critical', value: 9.0 },
      { signal: 'warning', value: 5.0 },
      { signal: 'info', value: 2.0 },
    ];

    const result = createRiskSignalTable(signals);

    // Should contain filled and empty dots
    expect(result).toContain('●');
    expect(result).toContain('○');
  });
});

describe('createFileSummaryTable', () => {
  // Happy path
  it('should render file summary with risk levels', () => {
    const files = [
      { file: 'src/auth.ts', riskScore: 7.5, riskLevel: 'high', topSignal: 'complexity' },
      { file: 'src/utils.ts', riskScore: 2.0, riskLevel: 'low' },
    ];

    const result = createFileSummaryTable(files);

    expect(result).toContain('auth.ts');
    expect(result).toContain('HIGH');
    expect(result).toContain('complexity');
  });

  // Edge case: long file paths
  it('should truncate long file paths', () => {
    const files = [
      { 
        file: 'src/components/authentication/providers/oauth/github/callback.ts',
        riskScore: 5.0,
        riskLevel: 'medium',
      },
    ];

    const result = createFileSummaryTable(files);

    // Should be truncated but still readable
    expect(result).toContain('...');
    expect(result).toContain('callback.ts');
  });
});

describe('createSnapshotTable', () => {
  // Happy path
  it('should render snapshots with relative time', () => {
    const now = new Date();
    const snapshots = [
      { id: 'abc123def456', timestamp: now, message: 'before changes' },
    ];

    const result = createSnapshotTable(snapshots);

    expect(result).toContain('abc123de'); // Truncated ID
    expect(result).toContain('just now');
    expect(result).toContain('before changes');
  });

  // Edge case: no message
  it('should handle missing message', () => {
    const snapshots = [
      { id: 'abc123def456', timestamp: new Date() },
    ];

    const result = createSnapshotTable(snapshots);

    expect(result).toContain('(none)');
  });

  // Edge case: empty list
  it('should handle empty snapshot list', () => {
    const result = createSnapshotTable([]);
    expect(result).toContain('No snapshots found');
  });
});
```

### Visual Regression Tests

```typescript
// test/utils/tables.visual.test.ts

import { describe, it, expect } from 'vitest';
import { createRiskSignalTable } from '../../src/utils/tables';

describe('Table Visual Consistency', () => {
  it('should produce consistent output (snapshot test)', () => {
    const signals = [
      { signal: 'complexity', value: 5.5 },
      { signal: 'deletions', value: 3.2 },
    ];

    const result = createRiskSignalTable(signals);

    // Snapshot test to catch visual regressions
    expect(result).toMatchSnapshot();
  });
});
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/cli/package.json` | Modify | Add `cli-table3@^0.6.5` dependency |
| `apps/cli/src/utils/tables.ts` | Create | Table rendering utilities |
| `apps/cli/src/index.ts` | Modify | Integrate tables in analyze/check/list commands |
| `apps/cli/test/utils/tables.test.ts` | Create | Unit tests for table utilities |
| `apps/cli/test/utils/tables.visual.test.ts` | Create | Visual regression tests |

---

## Rollout Plan

1. **Phase 1: Core Table Utilities** (1 hour)
   - Add cli-table3 dependency
   - Create `tables.ts` with all table functions
   - Write unit tests

2. **Phase 2: Command Integration** (45 mins)
   - Update `analyze` command output
   - Update `check` command batch output
   - Update `list` command output

3. **Phase 3: Polish & Testing** (15 mins)
   - Add visual snapshot tests
   - Manual testing in various terminal widths
   - Verify color output

---

## Acceptance Criteria

- [ ] `snapback analyze` shows risk signals in formatted table
- [ ] `snapback check` shows batch results in file summary table
- [ ] `snapback list` shows snapshots in formatted table
- [ ] Tables respect terminal width
- [ ] `--no-color` works correctly
- [ ] `--json` bypasses table formatting
- [ ] All unit tests pass
- [ ] Visual regression tests pass
- [ ] No TypeScript errors

---

## Design Considerations

### Terminal Width Handling

```typescript
// Optional: Auto-detect terminal width
const terminalWidth = process.stdout.columns || 80;

const table = new Table({
  colWidths: calculateDynamicWidths(terminalWidth),
  // ...
});
```

### Color Scheme Consistency

| Severity | Score Range | Color | Indicator |
|----------|-------------|-------|-----------|
| Critical | 7.0 - 10.0 | Red | ●●● |
| Warning | 4.0 - 6.9 | Yellow | ●●○ |
| Info | 0.1 - 3.9 | Green | ●○○ |
| None | 0 | Gray | ○○○ |

---

## Open Questions

1. **Q:** Should we support different table styles (ASCII-only for legacy terminals)?
   **A:** Defer - Unicode box drawing works on all modern terminals.

2. **Q:** Should tables be paginated for very long output?
   **A:** Defer - not needed for typical use cases. Could add `| less` hint.

3. **Q:** Should we add sparklines for trend data?
   **A:** Future enhancement - could show risk trends over time.
