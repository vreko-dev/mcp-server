# Session Replay Implementation

## Overview

This document describes the implementation of session replay functionality with smart sampling for the SnapBack web application. The implementation includes:

1. Autocapture configuration for automatic event tracking
2. Session recording with privacy controls
3. Smart sampling based on user segments and plan tiers
4. Budget management to control costs

## Architecture

The session replay system consists of several components:

### 1. Configuration Module
Located at `packages/config/src/analytics/session-replay.ts`, this module contains all configurable parameters for session replay including:
- Sampling rates by environment
- Plan-based multipliers
- Privacy settings
- Budget limits

### 2. Sampling Logic
Located at `packages/infrastructure/src/metrics/session-replay/sampling.ts`, this module implements the core sampling algorithms:
- Preset strategies (Conservative, Balanced, Aggressive)
- Dynamic rate calculation based on user context
- Budget-based adjustments

### 3. Session Replay Manager
Located at `packages/infrastructure/src/metrics/session-replay/manager.ts`, this module manages the overall session replay functionality:
- Singleton pattern for consistent configuration
- Context management
- Budget tracking

### 4. Browser Analytics Client
Located at `packages/infrastructure/src/metrics/client/index.ts`, this module integrates session replay with the PostHog client:
- Enhanced client with session recording controls
- Context-aware initialization

## Implementation Details

### Autocapture Configuration

The PostHog client is configured with autocapture enabled in `apps/web/modules/analytics/provider/posthog/index.tsx`:

```typescript
posthog.init(posthogKey, {
  api_host: "https://i.posthog.com",
  person_profiles: "identified_only",
  autocapture: true,
  capture_pageview: true,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '[data-private="true"]',
    recordCanvas: false,
    inlineStylesheet: true,
  },
  sample_rate: 0.3,
  session_recording_sample_rate: 0.3,
});
```

### Smart Sampling

The smart sampling system dynamically adjusts recording rates based on:

1. **User Plan**: Higher sampling rates for paid users
2. **Onboarding Status**: Increased sampling during onboarding
3. **Engagement Level**: Higher rates for more engaged users
4. **Error States**: Always record sessions with errors
5. **Budget Constraints**: Automatic rate reduction when approaching limits

### Privacy Controls

Privacy is maintained through:

1. **Element Masking**: Elements with `data-private="true"` are masked
2. **Input Masking**: All inputs are masked by default
3. **Canvas Blocking**: Canvas elements are never recorded
4. **Selector-Based Controls**: Configurable selectors for masking/blocking

### Budget Management

Monthly budget limits prevent excessive costs:

1. **Environment-Based Limits**: Different limits for dev/staging/production
2. **Usage Tracking**: Tracks recorded sessions per month
3. **Automatic Adjustment**: Reduces sampling when approaching limits
4. **Threshold Alerts**: Configurable warning levels

## Usage

### Basic Setup

The session replay is automatically configured when the analytics client is initialized:

```typescript
import { createBrowserAnalytics } from '@snapback/infrastructure/src/metrics/client';

const analytics = createBrowserAnalytics({
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  plan: 'pro',
  environment: 'web',
});
```

### React Hook Usage

For component-level control, use the `useSessionRecording` hook:

```typescript
import { useSessionRecording } from '@/modules/analytics/hooks/use-session-recording';

function MyComponent() {
  const { 
    isRecording, 
    startRecording, 
    stopRecording,
    samplingRate,
    budgetUtilization
  } = useSessionRecording({
    autoStart: true,
    context: {
      plan: 'pro',
      isOnboarding: true
    }
  });

  // Component implementation
}
```

### Manual Control

Direct control is available through the PostHog client:

```typescript
// Start recording
window.posthog.startSessionRecording();

// Stop recording
window.posthog.stopSessionRecording();
```

## Configuration

### Environment Variables

The following environment variables control the behavior:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_posthog_key
NODE_ENV=production # development, staging, or production
```

### Custom Configuration

Customize the behavior by modifying `packages/config/src/analytics/session-replay.ts`:

```typescript
export const SESSION_REPLAY_CONFIG = {
  samplingRates: {
    development: 1.0,
    staging: 0.5,
    production: 0.3
  },
  // ... other configuration
};
```

## Testing

Tests are located at `packages/infrastructure/src/metrics/__tests__/session-replay.test.ts` and cover:

1. Sampling rate calculations
2. Context-based adjustments
3. Budget management
4. Edge case handling

Run tests with:

```bash
npm run test packages/infrastructure/src/metrics/__tests__/session-replay.test.ts
```

## Monitoring

Monitor session replay performance through:

1. **PostHog Dashboard**: View recording statistics and quality metrics
2. **Budget Tracking**: Monitor monthly usage against limits
3. **Sampling Reports**: Analyze effective sampling rates by segment

## Best Practices

1. **Privacy First**: Always mark sensitive elements with `data-private="true"`
2. **Selective Recording**: Use manual controls for important user flows
3. **Budget Awareness**: Monitor usage and adjust configuration as needed
4. **Performance Monitoring**: Watch for performance impacts from recording
5. **User Consent**: Ensure proper consent mechanisms are in place

## Troubleshooting

### Common Issues

1. **Recordings Not Appearing**: Check API key and network connectivity
2. **Privacy Violations**: Verify all sensitive elements are properly marked
3. **Performance Issues**: Reduce sampling rates or disable for heavy components
4. **Budget Overruns**: Adjust configuration or upgrade PostHog plan

### Debugging

Enable debug mode in the analytics configuration:

```typescript
const analytics = createBrowserAnalytics({
  // ... other config
  debug: true
});
```

This will log detailed information about sampling decisions and recording status.