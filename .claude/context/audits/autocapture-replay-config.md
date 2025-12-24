# Phase S2.5: Autocapture/Replay Configuration Audit

## Web Application Configuration

### Sentry Configuration
The web application uses Sentry for error tracking and session replay with the following configuration:

- **Replay Configuration**:
  - `replaysOnErrorSampleRate`: 1.0 (100% of sessions with errors)
  - `replaysSessionSampleRate`: 0.1 (10% of normal sessions)
  
- **Integrations**:
  - `replayIntegration`:
    - `maskAllText`: true
    - `blockAllMedia`: true
  - `feedbackIntegration`:
    - `colorScheme`: "system"

- **Additional Settings**:
  - Session Recording: Enabled
  - Tunnel Route: "/monitoring"
  - React Component Annotation: Enabled

### PostHog Configuration
The infrastructure includes PostHog analytics implementation through the `@snapback/infrastructure` package:

- **Implementation Location**: packages/infrastructure/src/metrics
- **BrowserAnalyticsConfig**:
  - `autocapture`: false (explicitly disabled)
  - `capturePageview`: false
  - `capturePageleave`: false
  - `sessionRecording`:
    - `maskAllInputs`: true

- **Current Usage**: Not actively used in web app - uses multiple other analytics providers

## Analytics Providers

The web application implements multiple analytics providers but only some are active:

1. **Google Analytics** - Active
   - Implementation: apps/web/modules/analytics/provider/google/index.tsx

2. **Vercel Analytics** - Active
   - Implementation: apps/web/modules/analytics/provider/vercel/index.tsx

3. **Plausible** - Not Active
   - Implementation: apps/web/modules/analytics/provider/plausible/index.tsx

4. **Mixpanel** - Not Active
   - Implementation: apps/web/modules/analytics/provider/mixpanel/index.tsx

5. **Umami** - Not Active
   - Implementation: apps/web/modules/analytics/provider/umami/index.tsx

6. **Pirsch** - Not Active
   - Implementation: apps/web/modules/analytics/provider/pirsch/index.tsx

7. **PostHog** - Not Active
   - Implementation: apps/web/modules/analytics/provider/posthog/index.tsx

## Autocapture Status

- **Sentry Session Replay**: ENABLED
- **PostHog Autocapture**: DISABLED
- **Other Providers**: DISABLED

## Findings

1. Sentry session replay is configured and active with 100% error sampling and 10% session sampling
2. PostHog autocapture is explicitly disabled in the BrowserAnalyticsConfig
3. Multiple analytics providers are implemented but most are not active
4. No explicit autocapture configuration found beyond Sentry and PostHog

The application primarily relies on Sentry for session replay functionality, which is properly configured with appropriate sampling rates and privacy settings.