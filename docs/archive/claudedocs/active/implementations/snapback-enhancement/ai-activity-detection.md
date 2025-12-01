# AI Activity Detection

## Overview

The AI activity detection system monitors code changes to identify patterns that suggest AI-assisted coding tools are being used. This allows SnapBack to provide appropriate safeguards and notifications when AI tools are detected.

## Implementation

The AI activity detector is implemented as a class that monitors document changes:

```typescript
export class AIActivityDetector {
	private knownAIExtensions = [
		"github.copilot",
		"continue.continue",
		"sourcegraph.cody-ai",
		"anthropic.claude-dev",
		"amazonwebservices.amazon-q-vscode",
	];

	async detectActiveAITools(): Promise<string[]> {
		// Implementation details
	}

	onDocumentChange(event: vscode.TextDocumentChangeEvent) {
		// Implementation details
	}
}
```

## Detection Methods

### Active AI Tool Detection

The system checks for active AI extensions in the VS Code environment:

1. **GitHub Copilot**
2. **Continue**
3. **Sourcegraph Cody**
4. **Anthropic Claude**
5. **Amazon Q**

### Change Pattern Analysis

The system analyzes document change patterns to identify AI-generated content:

1. **Large Change Detection**

    - Identifies changes with text length > 100 characters
    - Flags changes with range length > 100 characters

2. **Rapid Change Detection**
    - Tracks frequency of changes to the same file
    - Identifies more than 3 changes to a file within 5 seconds

## Response Mechanisms

When AI activity is detected, the system can:

1. **Trigger Protection Checks**

    - Initiate checkpoint creation for AI-modified files
    - Apply additional scrutiny to changes

2. **Notify Users**

    - Provide alerts about AI-assisted coding activity
    - Offer suggestions for managing AI-generated code

3. **Adjust Monitoring**
    - Increase monitoring frequency for AI-active sessions
    - Apply different risk assessment rules

## Integration Points

The AI activity detection system integrates with:

1. **VS Code Extension** - Monitors document changes through VS Code APIs
2. **Checkpoint System** - Triggers checkpoints for AI-generated changes
3. **Risk Analyzer** - Factors AI activity into risk assessments
4. **Notification System** - Alerts users to AI activity
