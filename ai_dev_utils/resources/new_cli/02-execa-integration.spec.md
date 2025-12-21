# CLI Enhancement Spec: Execa Integration

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | CLI-UX-002 |
| **Priority** | P1 - High (Demo Critical) |
| **Estimated Effort** | 1 hour |
| **Dependencies** | None |
| **Author** | SnapBack Team |
| **Created** | 2024-12-21 |
| **Status** | Draft |

---

## Problem Statement

The `snapback check` command is designed as a pre-commit hook but currently scans **all files** in the directory instead of only **staged files**. This creates noise, false positives, and defeats the purpose of a pre-commit workflow.

### Current State

```typescript
// Current implementation in src/index.ts
const cwd = process.cwd();
const allFiles = await getAllFiles(cwd);  // ❌ Scans everything

// Comment in code acknowledges the issue:
// "Get staged files (in a real implementation, this would use git commands)"
```

### Desired State

```typescript
// Proper git integration
const { stdout } = await execa('git', ['diff', '--cached', '--name-only']);
const stagedFiles = stdout.split('\n').filter(Boolean);  // ✅ Only staged files
```

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | `check` command must only analyze git staged files | Must Have |
| FR-002 | Graceful fallback when not in a git repository | Must Have |
| FR-003 | Handle renamed/moved files in staging area | Should Have |
| FR-004 | Support `--all` flag to analyze all files (current behavior) | Should Have |
| FR-005 | Display clear error when git is not installed | Must Have |
| FR-006 | Handle binary files gracefully (skip analysis) | Must Have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Git command execution time | < 100ms |
| NFR-002 | Package size impact | < 30KB |
| NFR-003 | Cross-platform compatibility | Windows, macOS, Linux |

---

## Technical Design

### Package Selection

```bash
pnpm add execa@^9.5.2
```

**Rationale:** 
- execa v9 is ESM-native and handles edge cases (signals, encoding, streams)
- Proper error handling for missing git
- Cross-platform path handling
- Built-in timeout support

### API Design

```typescript
// src/services/git-client.ts

import { execa, ExecaError } from 'execa';

export interface GitClientOptions {
  cwd?: string;
  timeout?: number;
}

export interface StagedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string; // For renames
}

export class GitClient {
  private cwd: string;
  private timeout: number;

  constructor(options: GitClientOptions = {}) {
    this.cwd = options.cwd || process.cwd();
    this.timeout = options.timeout || 10000; // 10s default
  }

  /**
   * Check if current directory is inside a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await execa('git', ['rev-parse', '--is-inside-work-tree'], {
        cwd: this.cwd,
        timeout: this.timeout,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if git is installed and accessible
   */
  async isGitInstalled(): Promise<boolean> {
    try {
      await execa('git', ['--version'], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of staged files with their status
   */
  async getStagedFiles(): Promise<StagedFile[]> {
    try {
      // Use porcelain format for machine-readable output
      const { stdout } = await execa(
        'git',
        ['diff', '--cached', '--name-status', '--no-renames'],
        {
          cwd: this.cwd,
          timeout: this.timeout,
        }
      );

      if (!stdout.trim()) {
        return [];
      }

      return stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [status, ...pathParts] = line.split('\t');
          const path = pathParts.join('\t'); // Handle paths with tabs (rare but possible)

          return {
            path,
            status: this.parseStatus(status),
          };
        });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a git repository')) {
        throw new GitNotRepositoryError(this.cwd);
      }
      throw error;
    }
  }

  /**
   * Get staged file content (for analysis)
   */
  async getStagedContent(filePath: string): Promise<string> {
    const { stdout } = await execa(
      'git',
      ['show', `:${filePath}`],
      {
        cwd: this.cwd,
        timeout: this.timeout,
      }
    );
    return stdout;
  }

  /**
   * Get diff of staged changes for a file
   */
  async getStagedDiff(filePath: string): Promise<string> {
    const { stdout } = await execa(
      'git',
      ['diff', '--cached', '--', filePath],
      {
        cwd: this.cwd,
        timeout: this.timeout,
      }
    );
    return stdout;
  }

  private parseStatus(status: string): StagedFile['status'] {
    switch (status.charAt(0)) {
      case 'A': return 'added';
      case 'M': return 'modified';
      case 'D': return 'deleted';
      case 'R': return 'renamed';
      case 'C': return 'copied';
      default: return 'modified';
    }
  }
}

// Custom errors
export class GitNotInstalledError extends Error {
  constructor() {
    super('Git is not installed or not accessible in PATH');
    this.name = 'GitNotInstalledError';
  }
}

export class GitNotRepositoryError extends Error {
  constructor(path: string) {
    super(`Not a git repository: ${path}`);
    this.name = 'GitNotRepositoryError';
  }
}
```

### Integration Points

#### 1. Update `check` Command

```typescript
// src/index.ts - check command

import { GitClient, GitNotInstalledError, GitNotRepositoryError } from './services/git-client';

program
  .command('check')
  .description('Pre-commit hook to check for risky AI changes')
  .option('-s, --snapshot', 'Create snapshot if risky changes detected')
  .option('-q, --quiet', 'Suppress output unless issues found')
  .option('-a, --all', 'Check all files, not just staged (legacy behavior)')
  .action(async (options) => {
    const spinner = options.quiet ? null : ora('Checking for risky changes...').start();
    const git = new GitClient({ cwd: process.cwd() });

    try {
      // Validate git environment
      if (!await git.isGitInstalled()) {
        throw new GitNotInstalledError();
      }

      if (!await git.isGitRepository()) {
        throw new GitNotRepositoryError(process.cwd());
      }

      // Get files to check
      let filesToCheck: string[];
      
      if (options.all) {
        // Legacy behavior: all files
        const allFiles = await getAllFiles(process.cwd());
        filesToCheck = allFiles.filter(isCodeFile);
      } else {
        // New behavior: staged files only
        const stagedFiles = await git.getStagedFiles();
        filesToCheck = stagedFiles
          .filter(f => f.status !== 'deleted')
          .filter(f => isCodeFile(f.path))
          .map(f => f.path);
      }

      if (filesToCheck.length === 0) {
        if (spinner) {
          spinner.succeed('No staged code files to check');
        }
        return;
      }

      if (spinner) {
        spinner.text = `Analyzing ${filesToCheck.length} staged files...`;
      }

      // Analyze staged content (not working directory version)
      for (const file of filesToCheck) {
        try {
          // Get staged version of file, not working directory
          const content = options.all
            ? await readFile(resolve(process.cwd(), file), 'utf-8')
            : await git.getStagedContent(file);

          const result = await engineAdapter.analyze({
            files: [{ path: file, content }],
            format: 'json',
            quiet: options.quiet,
          });

          // ... rest of risk analysis logic
        } catch (error) {
          // Skip files that can't be read (binary, permissions, etc.)
          if (!options.quiet) {
            console.log(chalk.gray(`⚠ Could not analyze ${file}`));
          }
        }
      }

      // ... rest of check logic
    } catch (error) {
      if (error instanceof GitNotInstalledError) {
        if (spinner) spinner.fail('Git is not installed');
        console.error(chalk.red('Error:'), 'Git must be installed to use the check command');
        console.log(chalk.gray('Install git: https://git-scm.com/downloads'));
        process.exit(1);
      }
      
      if (error instanceof GitNotRepositoryError) {
        if (spinner) spinner.fail('Not a git repository');
        console.error(chalk.red('Error:'), 'This command must be run inside a git repository');
        console.log(chalk.gray('Initialize with: git init'));
        process.exit(1);
      }
      
      throw error;
    }
  });

// Helper function
function isCodeFile(file: string): boolean {
  return /\.(ts|tsx|js|jsx|py|java|cpp|c|go|rs|rb)$/.test(file);
}
```

---

## Test Plan

### Unit Tests

```typescript
// test/services/git-client.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitClient, GitNotInstalledError, GitNotRepositoryError } from '../../src/services/git-client';
import { execa } from 'execa';

vi.mock('execa');

describe('GitClient', () => {
  let client: GitClient;

  beforeEach(() => {
    client = new GitClient({ cwd: '/test/repo' });
    vi.clearAllMocks();
  });

  describe('isGitInstalled', () => {
    // Happy path
    it('should return true when git is installed', async () => {
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'git version 2.40.0' } as any);
      
      expect(await client.isGitInstalled()).toBe(true);
    });

    // Sad path
    it('should return false when git is not installed', async () => {
      vi.mocked(execa).mockRejectedValueOnce(new Error('command not found: git'));
      
      expect(await client.isGitInstalled()).toBe(false);
    });
  });

  describe('isGitRepository', () => {
    // Happy path
    it('should return true inside a git repo', async () => {
      vi.mocked(execa).mockResolvedValueOnce({ stdout: 'true' } as any);
      
      expect(await client.isGitRepository()).toBe(true);
    });

    // Sad path
    it('should return false outside a git repo', async () => {
      vi.mocked(execa).mockRejectedValueOnce(new Error('not a git repository'));
      
      expect(await client.isGitRepository()).toBe(false);
    });
  });

  describe('getStagedFiles', () => {
    // Happy path
    it('should parse staged files correctly', async () => {
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: 'M\tsrc/index.ts\nA\tsrc/new.ts\nD\tsrc/old.ts',
      } as any);

      const files = await client.getStagedFiles();

      expect(files).toEqual([
        { path: 'src/index.ts', status: 'modified' },
        { path: 'src/new.ts', status: 'added' },
        { path: 'src/old.ts', status: 'deleted' },
      ]);
    });

    // Edge case: no staged files
    it('should return empty array when no staged files', async () => {
      vi.mocked(execa).mockResolvedValueOnce({ stdout: '' } as any);

      const files = await client.getStagedFiles();

      expect(files).toEqual([]);
    });

    // Edge case: paths with special characters
    it('should handle paths with spaces and special chars', async () => {
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: 'M\tpath with spaces/file.ts\nA\tpath-with-dashes.ts',
      } as any);

      const files = await client.getStagedFiles();

      expect(files).toHaveLength(2);
      expect(files[0].path).toBe('path with spaces/file.ts');
    });

    // Error case
    it('should throw GitNotRepositoryError when not in repo', async () => {
      const error = new Error('fatal: not a git repository');
      vi.mocked(execa).mockRejectedValueOnce(error);

      await expect(client.getStagedFiles()).rejects.toThrow(GitNotRepositoryError);
    });
  });

  describe('getStagedContent', () => {
    // Happy path
    it('should return staged file content', async () => {
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: 'const x = 1;\nexport { x };',
      } as any);

      const content = await client.getStagedContent('src/index.ts');

      expect(content).toBe('const x = 1;\nexport { x };');
    });

    // Error case
    it('should throw for non-existent staged file', async () => {
      vi.mocked(execa).mockRejectedValueOnce(new Error('path not found'));

      await expect(client.getStagedContent('nonexistent.ts')).rejects.toThrow();
    });
  });
});
```

### Integration Tests

```typescript
// test/commands/check.integration.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('check command - git integration', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temp directory with git repo
    testDir = mkdtempSync(join(tmpdir(), 'snapback-test-'));
    execSync('git init', { cwd: testDir });
    execSync('git config user.email "test@test.com"', { cwd: testDir });
    execSync('git config user.name "Test"', { cwd: testDir });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should only check staged files', async () => {
    // Create two files
    writeFileSync(join(testDir, 'staged.ts'), 'const risky = eval("code");');
    writeFileSync(join(testDir, 'unstaged.ts'), 'const safe = 1;');

    // Stage only one
    execSync('git add staged.ts', { cwd: testDir });

    // Run check - should only analyze staged.ts
    // ... test implementation
  });

  it('should handle empty staging area', async () => {
    writeFileSync(join(testDir, 'file.ts'), 'const x = 1;');
    // Don't stage anything
    
    // Should succeed with "no staged files" message
    // ... test implementation
  });

  it('should fail gracefully outside git repo', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'non-git-'));
    
    try {
      // Should show helpful error message
      // ... test implementation
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true });
    }
  });
});
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/cli/package.json` | Modify | Add `execa@^9.5.2` dependency |
| `apps/cli/src/services/git-client.ts` | Create | Git operations service |
| `apps/cli/src/index.ts` | Modify | Update check command to use GitClient |
| `apps/cli/test/services/git-client.test.ts` | Create | Unit tests for GitClient |
| `apps/cli/test/commands/check.integration.test.ts` | Modify | Add git integration tests |

---

## Rollout Plan

1. **Phase 1: GitClient Service** (30 mins)
   - Add execa dependency
   - Create GitClient class
   - Write unit tests

2. **Phase 2: Command Integration** (20 mins)
   - Update `check` command
   - Add `--all` flag for legacy behavior
   - Update error handling

3. **Phase 3: Testing** (10 mins)
   - Run integration tests
   - Manual testing with real git repo
   - Test error cases (no git, not repo)

---

## Acceptance Criteria

- [ ] `snapback check` only analyzes staged files by default
- [ ] `snapback check --all` analyzes all files (legacy behavior)
- [ ] Clear error message when git is not installed
- [ ] Clear error message when not in a git repository
- [ ] Binary files are skipped gracefully
- [ ] Deleted files are excluded from analysis
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Works on Windows, macOS, and Linux

---

## Migration Notes

### Breaking Change

This is a **behavioral change** for the `check` command:
- **Before:** Analyzed all code files in directory
- **After:** Analyzes only staged files

To maintain old behavior, users can use `snapback check --all`.

### Pre-commit Hook Update

Users with existing `.husky/pre-commit` or similar hooks don't need changes—the command signature is the same, just the behavior is more correct.

---

## Open Questions

1. **Q:** Should we support `--diff` to show actual changes being analyzed?
   **A:** Defer to separate spec - could be valuable for verbose mode.

2. **Q:** Should we cache git status during a check run?
   **A:** Not needed for MVP - git commands are fast (<100ms).
