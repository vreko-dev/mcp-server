# Setup Wizard

## Overview

The setup wizard provides a user-friendly interface for configuring the enhanced SnapBack system. The wizard guides users through scanning for configuration files, checking compatibility, and setting up protection mechanisms.

## Implementation

The setup wizard is implemented as a class:

```typescript
export class SetupWizard {
	private scanner: ConfigFileScanner;
	private compatibilityChecker: CompatibilityChecker;

	constructor() {
		this.scanner = new ConfigFileScanner();
		this.compatibilityChecker = new CompatibilityChecker();
	}

	async run() {
		// Implementation details
	}

	private async scanWithProgress(): Promise<any[]> {
		// Implementation details
	}
}
```

## Wizard Flow

### 1. Workspace Scanning

The wizard begins by scanning the workspace for configuration files:

1. **Progress Reporting**

    - Uses VS Code's progress API
    - Provides real-time scanning updates
    - Allows cancellation

2. **File Detection**
    - Leverages ConfigFileScanner
    - Identifies all relevant configuration files
    - Categorizes files by type

### 2. File Selection

Users can review and select which files to protect:

1. **TreeView Interface**

    - Presents files in a hierarchical view
    - Shows file types and categories
    - Allows selection/deselection

2. **File Information**
    - Displays file paths
    - Shows file sizes
    - Provides type information

### 3. Compatibility Checking

The wizard checks for compatibility issues:

1. **Dependency Analysis**

    - Examines package.json files
    - Checks for known incompatibilities
    - Identifies outdated dependencies

2. **Issue Reporting**
    - Presents compatibility issues
    - Provides severity ratings
    - Offers resolution suggestions

### 4. Baseline Creation

The wizard creates baselines for selected files:

1. **Hash Generation**

    - Creates cryptographic hashes
    - Stores baseline information
    - Records timestamps

2. **Protection Activation**
    - Enables file watching
    - Sets up change detection
    - Configures notifications

## User Experience Features

### Progress Tracking

1. **Visual Progress Bar**

    - Shows overall progress
    - Displays current operation
    - Provides estimated time remaining

2. **Detailed Status**
    - Shows current file being processed
    - Displays operation details
    - Provides error information

### Error Handling

1. **Graceful Degradation**

    - Continues operation despite individual failures
    - Reports errors without stopping
    - Provides recovery options

2. **User Guidance**
    - Explains errors in user-friendly terms
    - Provides actionable solutions
    - Offers support resources

## Integration Points

The setup wizard integrates with:

1. **Configuration File Scanner** - Discovers files to protect
2. **Compatibility Checker** - Identifies potential issues
3. **Change Detector** - Creates baselines for monitoring
4. **File Watcher** - Sets up ongoing monitoring
5. **VS Code UI** - Uses VS Code's native UI components
