# CLI Enhancement Spec: Log-Update Integration

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | CLI-UX-004 |
| **Priority** | P2 - Medium (Demo Polish) |
| **Estimated Effort** | 1 hour |
| **Dependencies** | None |
| **Author** | SnapBack Team |
| **Created** | 2024-12-21 |
| **Status** | Draft |

---

## Problem Statement

When the `check` command analyzes multiple files, users see no feedback until completion. For large repositories with 50+ staged files, this creates anxiety ("Is it stuck?") and poor perceived performance. Real-time progress feedback builds trust and makes the tool feel responsive.

### Current State

```bash
$ snapback check
⠋ Checking for risky changes...
# (30 seconds of nothing)
✔ Found risks in 3 files
```

### Desired State

```bash
$ snapback check
⠋ Analyzing 1/47: src/auth/login.ts
⠙ Analyzing 2/47: src/auth/logout.ts
⠹ Analyzing 3/47: src/api/users.ts
...
⠿ Analyzing 47/47: test/utils.test.ts

┌──────────────────────────────────────────────────────────────┐
│                     Analysis Complete                        │
│  47 files analyzed • 3 high risk • 8 medium risk            │
└──────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Show current file being analyzed in real-time | Must Have |
| FR-002 | Show progress counter (N/total) | Must Have |
| FR-003 | Preserve final output after completion | Must Have |
| FR-004 | Support `--quiet` to disable progress updates | Must Have |
| FR-005 | Show elapsed time for long operations (>5s) | Should Have |
| FR-006 | Support non-TTY environments (CI/CD) | Must Have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Update frequency | Every file (not throttled) |
| NFR-002 | No flicker | Smooth single-line updates |
| NFR-003 | Package size impact | < 10KB |

---

## Technical Design

### Package Selection

```bash
pnpm add log-update@^6.1.0
```

**Rationale:**
- log-update is purpose-built for overwriting terminal lines
- ESM-native in v6
- Handles cursor management properly
- Works with ora spinners

### API Design

```typescript
// src/utils/progress.ts

import logUpdate from 'log-update';
import chalk from 'chalk';
import ora, { Ora } from 'ora';

export interface ProgressTrackerOptions {
  total: number;
  label?: string;
  quiet?: boolean;
  showElapsed?: boolean;
}

export class ProgressTracker {
  private current = 0;
  private total: number;
  private label: string;
  private quiet: boolean;
  private showElapsed: boolean;
  private startTime: number;
  private spinner: Ora | null = null;
  private isTTY: boolean;

  constructor(options: ProgressTrackerOptions) {
    this.total = options.total;
    this.label = options.label || 'Processing';
    this.quiet = options.quiet || false;
    this.showElapsed = options.showElapsed ?? true;
    this.startTime = Date.now();
    this.isTTY = process.stdout.isTTY ?? false;
  }

  /**
   * Start the progress tracker
   */
  start(): void {
    if (this.quiet) return;

    if (this.isTTY) {
      this.spinner = ora({
        text: this.formatProgress(''),
        spinner: 'dots',
      }).start();
    } else {
      // Non-TTY: just log start
      console.log(`${this.label}: Starting (${this.total} items)`);
    }
  }

  /**
   * Update progress with current item
   */
  update(currentItem: string): void {
    this.current++;
    
    if (this.quiet) return;

    const progressText = this.formatProgress(currentItem);

    if (this.isTTY && this.spinner) {
      this.spinner.text = progressText;
    } else {
      // Non-TTY: log every 10th item or significant items
      if (this.current % 10 === 0 || this.current === this.total) {
        console.log(`[${this.current}/${this.total}] ${currentItem}`);
      }
    }
  }

  /**
   * Complete the progress with final message
   */
  complete(message: string): void {
    if (this.quiet) return;

    if (this.isTTY && this.spinner) {
      this.spinner.succeed(message);
    } else {
      console.log(`✔ ${message}`);
    }
  }

  /**
   * Fail the progress with error message
   */
  fail(message: string): void {
    if (this.isTTY && this.spinner) {
      this.spinner.fail(message);
    } else {
      console.error(`✖ ${message}`);
    }
  }

  /**
   * Get elapsed time string
   */
  getElapsed(): string {
    const elapsed = Date.now() - this.startTime;
    if (elapsed < 1000) return `${elapsed}ms`;
    return `${(elapsed / 1000).toFixed(1)}s`;
  }

  private formatProgress(currentItem: string): string {
    const counter = chalk.cyan(`[${this.current}/${this.total}]`);
    const item = currentItem ? chalk.gray(this.truncateItem(currentItem, 40)) : '';
    const elapsed = this.showElapsed && (Date.now() - this.startTime) > 2000
      ? chalk.dim(` (${this.getElapsed()})`)
      : '';

    return `${this.label} ${counter} ${item}${elapsed}`;
  }

  private truncateItem(item: string, maxLength: number): string {
    if (item.length <= maxLength) return item;
    return '...' + item.slice(-(maxLength - 3));
  }
}

/**
 * Simple log-update wrapper for custom progress displays
 */
export function createLiveLogger() {
  const isTTY = process.stdout.isTTY ?? false;

  return {
    update: (text: string) => {
      if (isTTY) {
        logUpdate(text);
      }
    },
    done: () => {
      if (isTTY) {
        logUpdate.done();
      }
    },
    clear: () => {
      if (isTTY) {
        logUpdate.clear();
      }
    },
  };
}

/**
 * Progress bar renderer
 */
export function renderProgressBar(
  current: number,
  total: number,
  width: number = 30
): string {
  const percentage = Math.min(current / total, 1);
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const percent = chalk.cyan(`${Math.round(percentage * 100)}%`);

  return `${bar} ${percent}`;
}
```

### Integration Points

#### 1. Update `check` Command

```typescript
// src/index.ts - check command

import { ProgressTracker } from './utils/progress';

program
  .command('check')
  .action(async (options) => {
    // ... get files to check ...

    const progress = new ProgressTracker({
      total: filesToCheck.length,
      label: 'Analyzing',
      quiet: options.quiet,
    });

    progress.start();

    const fileResults: FileRiskSummary[] = [];
    let hasRiskyChanges = false;

    for (const file of filesToCheck) {
      progress.update(file);

      try {
        const content = options.all
          ? await readFile(resolve(process.cwd(), file), 'utf-8')
          : await git.getStagedContent(file);

        const result = await engineAdapter.analyze({
          files: [{ path: file, content }],
          format: 'json',
          quiet: true, // Suppress per-file output
        });

        fileResults.push({
          file,
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          topSignal: result.signals?.[0]?.signal,
        });

        if (result.riskScore > 5) {
          hasRiskyChanges = true;
        }
      } catch (error) {
        // Skip files that can't be analyzed
      }
    }

    // Summary
    const highRisk = fileResults.filter(f => f.riskScore > 7).length;
    const mediumRisk = fileResults.filter(f => f.riskScore > 4 && f.riskScore <= 7).length;

    if (hasRiskyChanges) {
      progress.fail(
        `Found risks in ${highRisk + mediumRisk} files ` +
        `(${highRisk} high, ${mediumRisk} medium) - ${progress.getElapsed()}`
      );
    } else {
      progress.complete(
        `No risky changes detected in ${filesToCheck.length} files - ${progress.getElapsed()}`
      );
    }

    // ... show detailed results table ...
  });
```

#### 2. Update `snapshot` Command (for large file sets)

```typescript
// src/index.ts - snapshot command with many files

import { ProgressTracker } from './utils/progress';

program
  .command('snapshot')
  .action(async (options) => {
    // For snapshots with many files, show progress
    if (options.files && options.files.length > 10) {
      const progress = new ProgressTracker({
        total: options.files.length,
        label: 'Capturing',
        quiet: options.quiet,
      });

      progress.start();

      for (const file of options.files) {
        progress.update(file);
        // ... capture file ...
      }

      progress.complete(`Snapshot created with ${options.files.length} files`);
    } else {
      // Use simple spinner for small snapshots
      const spinner = ora('Creating snapshot...').start();
      // ...
    }
  });
```

---

## Test Plan

### Unit Tests

```typescript
// test/utils/progress.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressTracker, renderProgressBar } from '../../src/utils/progress';

describe('ProgressTracker', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'isTTY', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Happy path
  it('should track progress through all items', () => {
    const tracker = new ProgressTracker({ total: 5, quiet: true });
    
    tracker.start();
    for (let i = 0; i < 5; i++) {
      tracker.update(`file${i}.ts`);
    }
    
    // Should not throw
    expect(() => tracker.complete('Done')).not.toThrow();
  });

  // Elapsed time
  it('should track elapsed time', async () => {
    const tracker = new ProgressTracker({ total: 1, quiet: true });
    
    tracker.start();
    await new Promise(r => setTimeout(r, 10));
    
    const elapsed = tracker.getElapsed();
    expect(elapsed).toMatch(/\d+ms/);
  });

  // Quiet mode
  it('should suppress output in quiet mode', () => {
    const logSpy = vi.spyOn(console, 'log');
    
    const tracker = new ProgressTracker({ total: 5, quiet: true });
    tracker.start();
    tracker.update('test.ts');
    tracker.complete('Done');
    
    expect(logSpy).not.toHaveBeenCalled();
  });

  // Non-TTY mode
  it('should fall back to line-by-line in non-TTY', () => {
    vi.spyOn(process.stdout, 'isTTY', 'get').mockReturnValue(false);
    
    const logSpy = vi.spyOn(console, 'log');
    
    const tracker = new ProgressTracker({ total: 20, quiet: false });
    tracker.start();
    
    // Update 15 times - should log at 10
    for (let i = 0; i < 15; i++) {
      tracker.update(`file${i}.ts`);
    }
    
    // Should have logged: start + every 10th
    expect(logSpy).toHaveBeenCalledTimes(2); // start + 10th
  });
});

describe('renderProgressBar', () => {
  it('should render empty bar at 0%', () => {
    const bar = renderProgressBar(0, 100);
    expect(bar).toContain('░');
    expect(bar).toContain('0%');
  });

  it('should render full bar at 100%', () => {
    const bar = renderProgressBar(100, 100);
    expect(bar).toContain('█');
    expect(bar).toContain('100%');
  });

  it('should render partial bar at 50%', () => {
    const bar = renderProgressBar(50, 100, 20);
    expect(bar).toContain('50%');
    // Should have roughly equal filled and empty
  });

  it('should handle edge case of current > total', () => {
    const bar = renderProgressBar(150, 100);
    expect(bar).toContain('100%'); // Cap at 100%
  });
});
```

### Integration Tests

```typescript
// test/commands/check.progress.test.ts

import { describe, it, expect, vi } from 'vitest';
import { createCLI } from '../../src/index';

describe('check command progress display', () => {
  it('should show progress for multiple files', async () => {
    // Mock stdout.isTTY
    vi.spyOn(process.stdout, 'isTTY', 'get').mockReturnValue(true);
    
    // Mock ora to capture spinner updates
    const spinnerUpdates: string[] = [];
    vi.mock('ora', () => ({
      default: (options: any) => ({
        start: () => ({ 
          set text(val: string) { spinnerUpdates.push(val); },
          succeed: vi.fn(),
          fail: vi.fn(),
        }),
      }),
    }));

    const program = createCLI();
    // ... run check with multiple staged files ...

    // Verify progress was shown
    expect(spinnerUpdates.some(u => u.includes('[1/'))).toBe(true);
  });
});
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/cli/package.json` | Modify | Add `log-update@^6.1.0` dependency |
| `apps/cli/src/utils/progress.ts` | Create | Progress tracking utilities |
| `apps/cli/src/index.ts` | Modify | Integrate ProgressTracker in check/snapshot commands |
| `apps/cli/test/utils/progress.test.ts` | Create | Unit tests for progress utilities |

---

## Rollout Plan

1. **Phase 1: Progress Utilities** (30 mins)
   - Add log-update dependency
   - Create `progress.ts` with ProgressTracker
   - Write unit tests

2. **Phase 2: Command Integration** (20 mins)
   - Update `check` command
   - Update `snapshot` command (for large file sets)

3. **Phase 3: Polish** (10 mins)
   - Test in various terminal environments
   - Test in CI (non-TTY)
   - Verify no flicker

---

## Acceptance Criteria

- [ ] `snapback check` shows real-time file-by-file progress
- [ ] Progress shows counter (N/total)
- [ ] Long operations (>2s) show elapsed time
- [ ] `--quiet` suppresses progress output
- [ ] Non-TTY environments (CI) get line-by-line fallback
- [ ] Final summary is preserved after progress completes
- [ ] All unit tests pass
- [ ] No visual flicker during updates

---

## Design Considerations

### TTY Detection

```typescript
// Handle various environments
const isTTY = 
  process.stdout.isTTY && // Standard TTY check
  !process.env.CI &&       // Not in CI
  process.env.TERM !== 'dumb'; // Not a dumb terminal
```

### Performance

- Updates happen per-file, not throttled
- For very fast operations (<50ms per file), this is fine
- If analysis becomes slower, consider throttling to every 100ms

### Integration with ora

The ProgressTracker uses ora internally for spinner consistency. To combine with existing ora usage:

```typescript
// Progress replaces the initial spinner
const progress = new ProgressTracker({ ... });
progress.start(); // Creates its own spinner

// Don't create separate ora instance
```

---

## Open Questions

1. **Q:** Should we add ETA estimation?
   **A:** Defer - not accurate enough for variable-time operations.

2. **Q:** Should we support parallel analysis with concurrent progress?
   **A:** Future enhancement - would need thread-safe counter.

3. **Q:** Should we persist progress state for resume?
   **A:** Not needed - analysis is fast enough to restart.
