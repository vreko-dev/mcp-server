# Change Detection

## Overview

The change detection system monitors files for modifications using cryptographic hashing and content analysis. The system provides reliable detection of file changes to trigger appropriate responses.

## Implementation

The change detector is implemented as a class:

```typescript
export class ChangeDetector {
	async createBaseline(filePath: string): Promise<FileBaseline> {
		// Implementation details
	}

	async detectChanges(
		filePath: string,
		baseline: FileBaseline
	): Promise<boolean> {
		// Implementation details
	}

	private tryParseAndHash(content: string): string | undefined {
		// Implementation details
	}
}
```

## Key Libraries

### hasha

Used for cryptographic hashing:

-   SHA-256 hashing for file content
-   Async hashing for large files
-   Reliable change detection

### object-hash

Used for content-aware hashing:

-   Deep hashing of JavaScript objects
-   Consistent hashing regardless of property order
-   Special handling for JSON content

## Baseline Creation

The system creates baselines for file monitoring:

1. **File Hashing**

    - Creates SHA-256 hash of file content
    - Stores hash for comparison
    - Records timestamp and file size

2. **Content-Aware Hashing**

    - Parses JSON content when possible
    - Creates structural hashes for JSON files
    - Enables semantic change detection

3. **Metadata Storage**
    - Tracks file paths
    - Records creation timestamps
    - Stores file sizes

## Change Detection Process

### Hash Comparison

1. **Content Hashing**

    - Reads current file content
    - Generates SHA-256 hash
    - Compares with baseline hash

2. **Semantic Comparison**
    - For JSON files, parses and structurally compares
    - Ignores formatting changes
    - Focuses on meaningful content changes

### Change Reporting

1. **Boolean Results**

    - Simple true/false change indication
    - Fast comparison operations
    - Minimal memory overhead

2. **Detailed Analysis**
    - Integration with diff systems for detailed changes
    - Line-by-line change detection when needed
    - Change magnitude assessment

## Data Structures

### FileBaseline Interface

```typescript
export interface FileBaseline {
	path: string;
	hash: string;
	contentHash?: string;
	timestamp: number;
	size: number;
}
```

## Integration Points

The change detection system integrates with:

1. **File Watching** - Triggers change detection on file events
2. **Protection System** - Identifies unauthorized changes
3. **Checkpoint System** - Determines when new checkpoints are needed
4. **Notification System** - Alerts users to detected changes
