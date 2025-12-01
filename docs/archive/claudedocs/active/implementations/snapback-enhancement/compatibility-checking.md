# Compatibility Checking

## Overview

The compatibility checking system provides analysis of dependency compatibility, particularly focusing on major version upgrades and known incompatibilities. The system is designed to identify potential issues before they cause problems in the development workflow.

## Implementation

The compatibility checker is implemented as a class with methods for specific compatibility checks:

```typescript
export class CompatibilityChecker {
	async checkReact19Compatibility(packageJson: any): Promise<Issue[]> {
		// Implementation details
	}

	private async checkReact19Dependencies(packageJson: any): Promise<Issue[]> {
		// Implementation details
	}

	async checkForOutdatedDependencies(): Promise<UpgradeInfo[]> {
		// Implementation details
	}
}
```

## Key Features

### React 19 Compatibility Checking

Specialized checking for React 19 compatibility issues:

1. **Framer Motion Compatibility**

    - Checks for Framer Motion < 11.11 which is incompatible with React 19
    - Provides upgrade suggestions

2. **Known Incompatibilities**
    - Maintains a registry of packages known to be incompatible with React 19
    - Provides removal/replacement suggestions

### Dependency Version Analysis

The system analyzes package.json files to:

1. **Identify Major Version Upgrades**

    - Detect when dependencies have major version changes
    - Assess breaking change risk

2. **Check for Outdated Dependencies**
    - Identify packages that have newer versions available
    - Distinguish between patch, minor, and major updates

## Data Structures

### Issue Interface

```typescript
export interface Issue {
	type: string;
	package: string;
	message: string;
	severity: "error" | "warning" | "info";
	suggestion: string;
}
```

### UpgradeInfo Interface

```typescript
export interface UpgradeInfo {
	package: string;
	currentVersion: string;
	latestVersion: string;
	breaking: boolean;
}
```

## Integration Points

The compatibility checking system integrates with:

1. **Setup Wizard** - Provides compatibility analysis during initial setup
2. **Risk Analyzer** - Identifies compatibility issues as risk factors
3. **Notification System** - Alerts users to compatibility issues
4. **Checkpoint System** - Creates checkpoints before compatibility-affecting changes
