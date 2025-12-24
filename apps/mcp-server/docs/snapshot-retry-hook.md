# Snapshot Retry Hook Usage Guide

The Snapshot Retry Hook provides automatic error resolution for snapshot creation failures. It intelligently diagnoses common errors and applies fixes automatically.

## Features

- **Automatic Error Diagnosis**: Identifies root cause of snapshot failures
- **Intelligent Retry Logic**: Retries with exponential backoff
- **Auto-Fix Capability**: Automatically resolves common issues
- **Detailed Diagnostics**: Provides actionable error information
- **Confidence Scoring**: Indicates reliability of diagnosis

## Quick Start

### Basic Usage

```typescript
import { createSnapshotWithAutoRetry } from './tools/create-snapshot';

const result = await createSnapshotWithAutoRetry({
  files: ['src/index.ts', 'src/utils.ts'],
  reason: 'Pre-deployment snapshot',
  trigger: 'manual'
});

if (!result.success) {
  console.error(result.error);
  // Detailed diagnostics available in result.help
}
```

### Advanced Configuration

```typescript
import { createSnapshotWithAutoRetry } from './tools/create-snapshot';

const result = await createSnapshotWithAutoRetry(
  {
    files: ['src/index.ts'],
    reason: 'Before refactoring',
    trigger: 'manual'
  },
  {
    maxRetries: 5,        // Increase retry attempts
    verbose: true,        // Enable detailed logging
    autoFix: true         // Enable automatic fixes
  }
);
```

## Error Types & Auto-Fixes

### ✅ Auto-Fixable Errors

#### 1. ABSOLUTE_PATH_REJECTED

**Problem**: Snapshot tool requires relative paths but absolute paths were provided.

**Auto-Fix**: Converts absolute paths to relative paths from workspace root.

**Example**:
```typescript
// Before (will fail):
files: ['/Users/dev/project/src/index.ts']

// After auto-fix (will succeed):
files: ['src/index.ts']
```

#### 2. WORKING_DIRECTORY_MISMATCH

**Problem**: Snapshot tool running from different directory than where files exist.

**Auto-Fix**: Changes working directory to workspace root.

**Example**:
```
Current directory: /Users/dev/
Workspace root: /Users/dev/project/
Files location: /Users/dev/project/src/

Auto-fix: process.chdir('/Users/dev/project/')
```

#### 3. WORKSPACE_MISMATCH

**Problem**: Files are in workspace but not found from current location.

**Auto-Fix**: Updates working directory and retries.

### ⚠️ Manual Fix Required

#### 1. FILE_NOT_FOUND

**Problem**: Files do not exist in filesystem.

**Action Required**:
- Verify file creation completed
- Check file paths for typos
- Ensure files are in expected location

#### 2. PERMISSION_DENIED

**Problem**: Insufficient permissions to read files.

**Action Required**:
- Check file permissions (`chmod 644 <file>`)
- Run with elevated privileges if needed
- Verify user has access to directory

#### 3. UNKNOWN

**Problem**: Unrecognized error pattern.

**Action Required**:
- Review full error message
- Check logs for additional context
- Report to SnapBack team if persistent

## Diagnostic Information

### Diagnosis Structure

```typescript
interface SnapshotDiagnosis {
  type: string;           // Error category
  message: string;        // User-friendly description
  cause: string;          // Root cause explanation
  suggestedFix: string;   // How to fix it
  userAction: string;     // Required action
  canAutoFix: boolean;    // Whether auto-fix available
  confidence: number;     // Reliability (0-1)
  affectedFiles?: string[]; // Files causing issue
}
```

### Example Diagnosis Output

```
🔍 Snapshot Failure Diagnosis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type: ABSOLUTE_PATH_REJECTED
Confidence: 100%
✅ Auto-fixable

📋 Issue:
  Snapshot tool requires relative paths

🔎 Root Cause:
  Provided absolute path instead of relative to workspace root

💡 Suggested Fix:
  Convert to paths relative to workspace root

👤 Action Required:
  Automatic: Converting to relative paths

📁 Affected Files:
  - /Users/dev/project/src/index.ts
  - /Users/dev/project/src/utils.ts
```

## Retry Behavior

### Retry Strategy

1. **Attempt 1**: Try snapshot creation
2. **On Failure**:
   - Diagnose error
   - Apply auto-fix if available
   - Wait with backoff
3. **Attempt 2-N**: Retry with fixes applied
4. **Final Failure**: Return diagnostics

### Exponential Backoff

```typescript
// Default configuration:
{
  maxRetries: 3,
  delayMs: 100,
  exponentialBackoff: true
}

// Timing:
// Attempt 1: Immediate
// Attempt 2: Wait 100ms
// Attempt 3: Wait 200ms (2^1 * 100ms)
// Attempt 4: Wait 400ms (2^2 * 100ms)
```

## Integration Examples

### MCP Server Integration

```typescript
// In MCP server tool handler
import { createSnapshotWithAutoRetry } from '../tools/create-snapshot';

if (name === "snapback.create_snapshot") {
  const result = await createSnapshotWithAutoRetry(
    {
      files: args.files,
      reason: args.reason,
      trigger: 'mcp'
    },
    {
      verbose: process.env.MCP_VERBOSE === '1'
    }
  );

  if (!result.success) {
    return {
      content: [{
        type: "text",
        text: `❌ ${result.error}\n\n${result.help || ''}`
      }],
      isError: true
    };
  }

  return {
    content: [{
      type: "text",
      text: `✅ Snapshot created: ${result.snapshot.id}`
    }]
  };
}
```

### CLI Integration

```typescript
import { createSnapshotWithAutoRetry } from '@snapback/mcp-server';

async function createSnapshotCommand(files: string[]) {
  const result = await createSnapshotWithAutoRetry(
    {
      files,
      reason: 'CLI snapshot',
      trigger: 'manual'
    },
    {
      verbose: true,  // Show retry progress
      maxRetries: 5   // More retries for CLI
    }
  );

  if (!result.success) {
    console.error(chalk.red('❌ Snapshot failed'));
    console.error(result.help);
    process.exit(1);
  }

  console.log(chalk.green(`✅ Snapshot created: ${result.snapshot.id}`));
}
```

### VSCode Extension Integration

```typescript
import { createSnapshotWithAutoRetry } from '@snapback/mcp-server';

async function createSnapshotFromEditor(files: string[]) {
  const result = await createSnapshotWithAutoRetry(
    {
      files,
      reason: 'Manual snapshot from editor',
      trigger: 'manual'
    },
    {
      verbose: false,  // Silent retries in editor
      maxRetries: 3
    }
  );

  if (!result.success) {
    vscode.window.showErrorMessage(
      `Failed to create snapshot: ${result.error}`,
      'View Details'
    ).then(selection => {
      if (selection === 'View Details') {
        // Show diagnosis in output channel
        outputChannel.appendLine(result.help || '');
        outputChannel.show();
      }
    });
    return;
  }

  vscode.window.showInformationMessage(
    `✅ Snapshot created (${result.snapshot.fileCount} files)`
  );
}
```

## Testing

### Unit Tests

```typescript
import { diagnoseSnapshotFailure, createSnapshotWithRetry } from './snapshot-retry-hook';

describe('Error Diagnosis', () => {
  it('should diagnose file not found error', () => {
    const error = new Error('ENOENT: no such file');
    const diagnosis = diagnoseSnapshotFailure(
      error,
      ['missing.ts'],
      '/workspace'
    );

    expect(diagnosis.type).toBe('FILE_NOT_FOUND');
    expect(diagnosis.canAutoFix).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Retry with Auto-Fix', () => {
  it('should fix absolute path error', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('Absolute paths not allowed'))
      .mockResolvedValueOnce({ snapshot: { id: 'snap-123' } });

    const result = await createSnapshotWithRetry(
      {
        files: ['/absolute/path.ts'],
        reason: 'test',
        trigger: 'manual',
        workspaceRoot: '/workspace'
      },
      mockFn,
      { maxRetries: 3, autoFix: true }
    );

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(2); // Succeeded on retry
  });
});
```

## Best Practices

### ✅ Do

- **Enable verbose mode** during development
- **Use auto-fix** for production deployments
- **Set appropriate max retries** (3-5 for automated, 1-2 for interactive)
- **Log diagnostics** for debugging
- **Handle both success and failure** cases

### ❌ Don't

- **Don't disable auto-fix** in production without good reason
- **Don't ignore diagnostic information** - it helps debugging
- **Don't set maxRetries too high** - can mask real issues
- **Don't retry forever** - fail fast with good error messages

## Troubleshooting

### High Retry Count

**Symptom**: Snapshots taking long time due to many retries

**Causes**:
1. Working directory not set correctly
2. Files being created asynchronously
3. Permissions issues

**Solutions**:
1. Set working directory: `process.chdir(workspaceRoot)`
2. Await file creation: `await fs.promises.writeFile(...)`
3. Check permissions: `ls -la <file>`

### Auto-Fix Not Working

**Symptom**: Error persists despite auto-fix being enabled

**Causes**:
1. Error not auto-fixable (e.g., permission denied)
2. Fix applied but issue remains
3. Multiple overlapping issues

**Solutions**:
1. Check `diagnosis.canAutoFix` flag
2. Review diagnosis output
3. Enable verbose mode to see fix attempts

### False Positives in Diagnosis

**Symptom**: Diagnosis confidence low or incorrect error type

**Causes**:
1. Unusual error message format
2. Multiple concurrent errors
3. Edge case not covered

**Solutions**:
1. Check `diagnosis.confidence` score
2. Review full error stack trace
3. Report pattern to SnapBack team

## Performance Considerations

### Retry Overhead

- **Default delays**: 100ms base with exponential backoff
- **Total overhead** (3 retries): ~700ms maximum
- **Network calls**: None (all local file operations)

### Memory Usage

- **Minimal**: Only diagnosis objects kept in memory
- **No caching**: Each retry is independent
- **File content**: Only read once per attempt

### Optimization Tips

1. **Reduce maxRetries** if snapshot latency critical
2. **Disable verbose** in production for performance
3. **Pre-validate files** before calling if possible
4. **Use workspace-relative paths** from start

## API Reference

See [`snapshot-retry-hook.ts`](../src/utils/snapshot-retry-hook.ts) for complete API documentation.

---

**Last Updated**: December 24, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
