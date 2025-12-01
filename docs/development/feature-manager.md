# Feature Manager Documentation

The FeatureManager is a centralized feature flag system that allows for runtime configuration of application features. It provides a simple API to enable/disable features and configure feature behavior without requiring code changes or deployments.

## Overview

The FeatureManager is implemented as a singleton class in the `@snapback/contracts` package. It manages all feature flags for the SnapBack platform, providing type-safe access to feature configurations with support for environment variable overrides.

## Feature Flags

The following feature flags are currently available in the system:

### Core Protection Features

-   `protection.enabled` (default: true) - Enables core protection functionality
-   `protection.auto_checkpoint` (default: true) - Automatically creates checkpoints during file operations
-   `protection.pre_save_hook` (default: true) - Runs protection checks before saving files

### Risk Analysis

-   `risk.guardian_v2` (default: false) - Enables the experimental Guardian v2 risk analysis engine
-   `risk.dependency_analysis` (default: true) - Analyzes dependencies for security risks
-   `risk.deep_analysis` (default: false) - Performs deep static analysis of code
-   `risk.ai_detection` (default: true) - Uses AI models for threat detection

### Storage

-   `storage.compression` (default: true) - Compresses stored snapshots to save space
-   `storage.deduplication` (default: false) - Deduplicates identical file content
-   `storage.encryption` (default: false) - Encrypts stored snapshots

### UI/UX

-   `ui.chat_participant` (default: true) - Enables AI assistant chat participant
-   `ui.status_bar` (default: true) - Shows SnapBack status in the IDE status bar
-   `ui.timeline_view` (default: true) - Enables the timeline view for snapshot history

### Telemetry

-   `telemetry.detailed_events` (default: false) - Collects detailed usage events
-   `telemetry.performance_metrics` (default: true) - Collects performance metrics
-   `telemetry.sampling_rate` (default: 1.0) - Sampling rate for telemetry collection (0.0-1.0)

### Experimental

-   `experimental.mcp_tools` (default: false) - Enables experimental MCP tools integration
-   `experimental.recovery_mode` (default: false) - Enables experimental recovery mode

## Usage

### Getting the Instance

```typescript
import { FeatureManager } from "@snapback/contracts";

const featureManager = FeatureManager.getInstance();
```

### Checking Feature Status

```typescript
// Check if a boolean feature is enabled
if (featureManager.isEnabled("risk.guardian_v2")) {
	// Enable experimental guardian feature
}

// Get the value of any feature flag
const samplingRate = featureManager.getValue<number>("telemetry.sampling_rate");
```

### Setting Features at Runtime

```typescript
// Enable a feature at runtime
featureManager.setFlag("risk.guardian_v2", true);

// Set a numeric feature value
featureManager.setFlag("telemetry.sampling_rate", 0.5);
```

### Resetting to Defaults

```typescript
// Reset all features to their default values
featureManager.reset();
```

## Environment Variable Overrides

Feature flags can be overridden using environment variables. The naming convention is:

```
SNAPBACK_{FLAG_NAME_IN_UPPERCASE_WITH_DOTS_AS_UNDERSCORES}
```

Examples:

-   `SNAPBACK_RISK_GUARDIAN_V2=true` to enable the Guardian v2 feature
-   `SNAPBACK_TELEMETRY_SAMPLING_RATE=0.5` to set the telemetry sampling rate to 50%

## Special Handling

The `telemetry.sampling_rate` flag has special behavior. When checked with `isEnabled()`, it returns a random boolean value based on the sampling rate, which is useful for probabilistic telemetry collection.

## Testing

The FeatureManager includes comprehensive tests that verify:

-   Singleton behavior
-   Default value handling
-   Runtime flag setting
-   Environment variable overrides
-   Reset functionality
-   Special handling for numeric flags

## Best Practices

1. **Use descriptive flag names**: Flag names should clearly indicate their purpose
2. **Provide sensible defaults**: Default values should be safe and functional
3. **Group related flags**: Use consistent naming prefixes for related features
4. **Document new flags**: Add documentation when introducing new feature flags
5. **Clean up obsolete flags**: Remove flags that are no longer needed

## Adding New Feature Flags

To add a new feature flag:

1. Add the flag to the `FEATURE_FLAGS` object in `packages/contracts/src/features.ts`
2. The flag will automatically be available through the FeatureManager
3. Use environment variable overrides as needed
4. Update this documentation with the new flag

Example:

```typescript
export const FEATURE_FLAGS = {
	// ... existing flags
	"my.new.feature": true, // Add new flag with default value
} as const;
```

Then use it in your code:

```typescript
if (featureManager.isEnabled("my.new.feature")) {
	// New feature implementation
}
```
