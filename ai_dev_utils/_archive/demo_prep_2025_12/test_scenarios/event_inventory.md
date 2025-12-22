{
  "phase": "S6",
  "title": "Event Cataloging",
  "timestamp": "2025-11-07T00:00:00.000Z",
  "executiveSummary": "SnapBack implements a comprehensive event tracking system with multiple layers of telemetry. The system includes legacy events for detailed tracking, core events for analytics simplification, and infrastructure events for business metrics. Events are tracked across the VS Code extension, web application, and backend services with proper validation and privacy controls.",
  "eventArchitecture": {
    "layers": [
      {
        "name": "Legacy Events",
        "description": "Detailed event tracking with 60+ specific event types for granular analytics",
        "implementation": "packages/contracts/src/telemetry/events.ts",
        "count": 60
      },
      {
        "name": "Core Events",
        "description": "Simplified event model with 7 core event types for easier analytics",
        "implementation": "packages/contracts/src/telemetry/events.v1.ts",
        "count": 7
      },
      {
        "name": "Infrastructure Events",
        "description": "Business-level events for marketing, billing, and user engagement tracking",
        "implementation": "packages/contracts/generated/infrastructure-events.ts",
        "count": 60
      }
    ],
    "components": [
      {
        "name": "Event Bus",
        "description": "Internal event distribution system for real-time event processing",
        "implementation": "packages/contracts/src/eventBus.ts"
      },
      {
        "name": "Telemetry Client",
        "description": "Client-side event tracking with PostHog integration",
        "implementation": "packages/infrastructure/src/tracing/telemetry-client.ts"
      },
      {
        "name": "Telemetry Proxy",
        "description": "Backend proxy for event ingestion with validation and sanitization",
        "implementation": "packages/api/modules/telemetry/procedures/ingest-events.ts"
      },
      {
        "name": "Event Mapper",
        "description": "Utility for mapping legacy events to core events",
        "implementation": "packages/contracts/src/telemetry/event-mapper.ts"
      }
    ]
  },
  "eventCategories": {
    "extensionLifecycle": {
      "description": "Events related to extension activation, deactivation, and lifecycle",
      "events": [
        "extension.activated",
        "extension.deactivated"
      ]
    },
    "userInteraction": {
      "description": "Events tracking user interactions with the extension",
      "events": [
        "command.execution",
        "view.activated",
        "notification.shown",
        "feature.used",
        "walkthrough.step.completed"
      ]
    },
    "codeProtection": {
      "description": "Events related to code protection and risk detection",
      "events": [
        "snapshot.created",
        "snapback.used",
        "risk.detected",
        "onboarding.protection.assigned"
      ]
    },
    "onboarding": {
      "description": "Events tracking user onboarding progress",
      "events": [
        "onboarding.phase.progressed",
        "onboarding.contextualPrompt.shown"
      ]
    },
    "systemIntegrity": {
      "description": "Events related to system integrity and validation",
      "events": [
        "signature.verification.success",
        "signature.verification.failed",
        "rules.cached.fallback"
      ]
    },
    "errorTracking": {
      "description": "Events for error monitoring and debugging",
      "events": [
        "error"
      ]
    }
  },
  "coreEvents": {
    "saveAttempt": {
      "event": "save_attempt",
      "description": "Tracks when a user attempts to save a file with protection levels",
      "properties": [
        "protection",
        "severity",
        "file_kind",
        "reason",
        "ai_present",
        "ai_burst",
        "outcome"
      ]
    },
    "snapshotCreated": {
      "event": "snapshot_created",
      "description": "Tracks when a code snapshot is created",
      "properties": [
        "session_id",
        "snapshot_id",
        "bytes_original",
        "bytes_stored",
        "dedup_hit",
        "latency_ms"
      ]
    },
    "sessionFinalized": {
      "event": "session_finalized",
      "description": "Tracks when a coding session is finalized",
      "properties": [
        "session_id",
        "files",
        "triggers",
        "duration_ms",
        "ai_present",
        "ai_burst",
        "highest_severity"
      ]
    },
    "issueCreated": {
      "event": "issue_created",
      "description": "Tracks when a code issue is detected",
      "properties": [
        "issue_id",
        "session_id",
        "file_kind",
        "type",
        "severity",
        "recommendation"
      ]
    },
    "issueResolved": {
      "event": "issue_resolved",
      "description": "Tracks when a code issue is resolved",
      "properties": [
        "issue_id",
        "resolution"
      ]
    },
    "sessionRestored": {
      "event": "session_restored",
      "description": "Tracks when a coding session is restored",
      "properties": [
        "session_id",
        "files_restored",
        "time_to_restore_ms",
        "reason"
      ]
    },
    "policyChanged": {
      "event": "policy_changed",
      "description": "Tracks when protection policies are changed",
      "properties": [
        "pattern",
        "from",
        "to",
        "source"
      ]
    }
  },
  "infrastructureEvents": {
    "authEvents": [
      "auth_signup_completed",
      "auth_login_completed",
      "auth_logout_completed",
      "auth_email_verified"
    ],
    "billingEvents": [
      "billing_upgrade_prompt_shown",
      "billing_checkout_completed",
      "billing_subscription_upgraded"
    ],
    "extensionEvents": [
      "extension_installed",
      "extension_activated",
      "extension_command_used"
    ],
    "dashboardEvents": [
      "dashboard_viewed",
      "dashboard_api_key_created"
    ],
    "teamEvents": [
      "team_created",
      "team_member_invited"
    ],
    "aiEvents": [
      "ai_suggestion_shown",
      "ai_suggestion_accepted",
      "ai_risk_detected"
    ]
  },
  "privacySecurity": {
    "dataSanitization": "Sensitive properties are stripped before forwarding to analytics services",
    "ipScrubbing": "IP addresses are explicitly scrubbed from all events",
    "userAnonymization": "User IDs are never forwarded to analytics services",
    "propertyBlocklist": [
      "path",
      "filePath",
      "fileName",
      "email",
      "user",
      "ip"
    ]
  },
  "validation": {
    "schemaValidation": "All events are validated against Zod schemas for type safety",
    "runtimeValidation": "Runtime validation ensures events conform to expected structures",
    "eventAllowlist": "Strict allowlist enforcement prevents unauthorized event types"
  },
  "findings": [
    {
      "type": "strength",
      "description": "Comprehensive event tracking with multiple layers for different analytics needs",
      "details": "The system implements legacy events for detailed tracking, core events for simplified analytics, and infrastructure events for business metrics"
    },
    {
      "type": "strength",
      "description": "Strong privacy and security controls with data sanitization",
      "details": "Sensitive properties are stripped, IP addresses are scrubbed, and user IDs are anonymized"
    },
    {
      "type": "strength",
      "description": "Robust validation with both schema and runtime validation",
      "details": "Events are validated against Zod schemas and runtime validation functions"
    },
    {
      "type": "strength",
      "description": "Event mapping system for analytics simplification",
      "details": "Legacy events can be mapped to core events for easier analytics processing"
    },
    {
      "type": "consideration",
      "description": "Potential for event duplication across systems",
      "details": "Events are tracked through multiple systems (telemetry client, event bus, telemetry proxy) which may lead to duplication"
    }
  ],
  "recommendations": [
    {
      "priority": "medium",
      "description": "Implement deduplication mechanism for events tracked through multiple systems",
      "details": "Add event ID generation and deduplication to prevent counting the same event multiple times"
    },
    {
      "priority": "low",
      "description": "Add audit logging for event ingestion",
      "details": "Implement audit logging for all event ingestion to track volume and patterns"
    },
    {
      "priority": "medium",
      "description": "Enhance event documentation with property descriptions",
      "details": "Add detailed descriptions for each event property to improve analytics team understanding"
    }
  ]
}
