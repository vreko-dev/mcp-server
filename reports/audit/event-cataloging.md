# Phase S6: Event Cataloging

**Timestamp:** 2025-11-07

## Executive Summary

SnapBack implements a comprehensive event tracking system with multiple layers of telemetry. The system includes legacy events for detailed tracking, core events for analytics simplification, and infrastructure events for business metrics. Events are tracked across the VS Code extension, web application, and backend services with proper validation and privacy controls.

## Event Architecture

### Event Layers

1. **Legacy Events**
   - Detailed event tracking with 60+ specific event types for granular analytics
   - Implementation: [packages/contracts/src/telemetry/events.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/contracts/src/telemetry/events.ts)
   - Count: 60 events

2. **Core Events**
   - Simplified event model with 7 core event types for easier analytics
   - Implementation: [packages/contracts/src/telemetry/events.v1.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/contracts/src/telemetry/events.v1.ts)
   - Count: 7 events

3. **Infrastructure Events**
   - Business-level events for marketing, billing, and user engagement tracking
   - Implementation: [packages/contracts/generated/infrastructure-events.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/contracts/generated/infrastructure-events.ts)
   - Count: 60 events

### Components

1. **Event Bus**
   - Internal event distribution system for real-time event processing
   - Implementation: [packages/contracts/src/eventBus.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/contracts/src/eventBus.ts)

2. **Telemetry Client**
   - Client-side event tracking with PostHog integration
   - Implementation: packages/infrastructure/src/tracing/telemetry-client.ts

3. **Telemetry Proxy**
   - Backend proxy for event ingestion with validation and sanitization
   - Implementation: [packages/api/modules/telemetry/procedures/ingest-events.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/api/modules/telemetry/procedures/ingest-events.ts)

4. **Event Mapper**
   - Utility for mapping legacy events to core events
   - Implementation: [packages/contracts/src/telemetry/event-mapper.ts](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/contracts/src/telemetry/event-mapper.ts)

## Event Categories

### Extension Lifecycle
Events related to extension activation, deactivation, and lifecycle:
- `extension.activated`
- `extension.deactivated`

### User Interaction
Events tracking user interactions with the extension:
- `command.execution`
- `view.activated`
- `notification.shown`
- `feature.used`
- `walkthrough.step.completed`

### Code Protection
Events related to code protection and risk detection:
- `snapshot.created`
- `snapback.used`
- `risk.detected`
- `onboarding.protection.assigned`

### Onboarding
Events tracking user onboarding progress:
- `onboarding.phase.progressed`
- `onboarding.contextualPrompt.shown`

### System Integrity
Events related to system integrity and validation:
- `signature.verification.success`
- `signature.verification.failed`
- `rules.cached.fallback`

### Error Tracking
Events for error monitoring and debugging:
- `error`

## Core Events

### Save Attempt
- **Event:** `save_attempt`
- **Description:** Tracks when a user attempts to save a file with protection levels
- **Properties:** 
  - `protection`
  - `severity`
  - `file_kind`
  - `reason`
  - `ai_present`
  - `ai_burst`
  - `outcome`

### Snapshot Created
- **Event:** `snapshot_created`
- **Description:** Tracks when a code snapshot is created
- **Properties:**
  - `session_id`
  - `snapshot_id`
  - `bytes_original`
  - `bytes_stored`
  - `dedup_hit`
  - `latency_ms`

### Session Finalized
- **Event:** `session_finalized`
- **Description:** Tracks when a coding session is finalized
- **Properties:**
  - `session_id`
  - `files`
  - `triggers`
  - `duration_ms`
  - `ai_present`
  - `ai_burst`
  - `highest_severity`

### Issue Created
- **Event:** `issue_created`
- **Description:** Tracks when a code issue is detected
- **Properties:**
  - `issue_id`
  - `session_id`
  - `file_kind`
  - `type`
  - `severity`
  - `recommendation`

### Issue Resolved
- **Event:** `issue_resolved`
- **Description:** Tracks when a code issue is resolved
- **Properties:**
  - `issue_id`
  - `resolution`

### Session Restored
- **Event:** `session_restored`
- **Description:** Tracks when a coding session is restored
- **Properties:**
  - `session_id`
  - `files_restored`
  - `time_to_restore_ms`
  - `reason`

### Policy Changed
- **Event:** `policy_changed`
- **Description:** Tracks when protection policies are changed
- **Properties:**
  - `pattern`
  - `from`
  - `to`
  - `source`

## Infrastructure Events

### Authentication Events
- `auth_signup_completed`
- `auth_login_completed`
- `auth_logout_completed`
- `auth_email_verified`

### Billing Events
- `billing_upgrade_prompt_shown`
- `billing_checkout_completed`
- `billing_subscription_upgraded`

### Extension Events
- `extension_installed`
- `extension_activated`
- `extension_command_used`

### Dashboard Events
- `dashboard_viewed`
- `dashboard_api_key_created`

### Team Events
- `team_created`
- `team_member_invited`

### AI Events
- `ai_suggestion_shown`
- `ai_suggestion_accepted`
- `ai_risk_detected`

## Privacy & Security

### Data Sanitization
Sensitive properties are stripped before forwarding to analytics services.

### IP Scrubbing
IP addresses are explicitly scrubbed from all events.

### User Anonymization
User IDs are never forwarded to analytics services.

### Property Blocklist
Properties containing sensitive information are blocked:
- `path`
- `filePath`
- `fileName`
- `email`
- `user`
- `ip`

## Validation

### Schema Validation
All events are validated against Zod schemas for type safety.

### Runtime Validation
Runtime validation ensures events conform to expected structures.

### Event Allowlist
Strict allowlist enforcement prevents unauthorized event types.

## Findings

### Strengths

1. **Comprehensive event tracking with multiple layers for different analytics needs**
   - The system implements legacy events for detailed tracking, core events for simplified analytics, and infrastructure events for business metrics

2. **Strong privacy and security controls with data sanitization**
   - Sensitive properties are stripped, IP addresses are scrubbed, and user IDs are anonymized

3. **Robust validation with both schema and runtime validation**
   - Events are validated against Zod schemas and runtime validation functions

4. **Event mapping system for analytics simplification**
   - Legacy events can be mapped to core events for easier analytics processing

### Considerations

1. **Potential for event duplication across systems**
   - Events are tracked through multiple systems (telemetry client, event bus, telemetry proxy) which may lead to duplication

## Recommendations

### Medium Priority

1. **Implement deduplication mechanism for events tracked through multiple systems**
   - Add event ID generation and deduplication to prevent counting the same event multiple times

2. **Enhance event documentation with property descriptions**
   - Add detailed descriptions for each event property to improve analytics team understanding

### Low Priority

1. **Add audit logging for event ingestion**
   - Implement audit logging for all event ingestion to track volume and patterns