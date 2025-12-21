import { z } from "zod";
import { getPostHog } from "@/lib/posthog-server";
import { publicProcedure } from "@/orpc/procedures";

// Temporarily define the types here
interface TelemetryEvent {
	event: string;
	properties?: Record<string, unknown>;
	timestamp: number;
}

// Specific event types with strict property definitions
interface ExtensionActivatedEvent {
	event: "extension.activated";
	properties: {
		version: string;
		vscodeVersion: string;
	};
	timestamp: number;
}

interface ExtensionDeactivatedEvent {
	event: "extension.deactivated";
	properties: Record<string, never>; // No properties
	timestamp: number;
}

interface CommandExecutionEvent {
	event: "command.execution";
	properties: {
		command: string;
		duration: number;
		success: boolean;
	};
	timestamp: number;
}

interface SnapshotCreatedEvent {
	event: "snapshot.created";
	properties: {
		method: string;
		filesCount: number;
	};
	timestamp: number;
}

interface SnapBackUsedEvent {
	event: "snapback.used";
	properties: {
		filesRestored: number;
		duration: number;
		success: boolean;
	};
	timestamp: number;
}

interface RiskDetectedEvent {
	event: "risk.detected";
	properties: {
		riskLevel: string;
		patterns: string[];
		confidence: number;
	};
	timestamp: number;
}

interface ViewActivatedEvent {
	event: "view.activated";
	properties: {
		viewId: string;
	};
	timestamp: number;
}

interface NotificationShownEvent {
	event: "notification.shown";
	properties: {
		notificationType: string;
		actionTaken: string | null;
	};
	timestamp: number;
}

interface FeatureUsedEvent {
	event: "feature.used";
	properties: {
		feature: string;
	};
	timestamp: number;
}

interface ErrorEvent {
	event: "error";
	properties: {
		errorType: string;
		errorMessage: string;
	};
	timestamp: number;
}

interface WalkthroughStepCompletedEvent {
	event: "walkthrough.step.completed";
	properties: {
		stepId: string;
		stepTitle: string;
	};
	timestamp: number;
}

interface OnboardingProtectionAssignedEvent {
	event: "onboarding.protection.assigned";
	properties: {
		level: string;
		trigger: string;
		fileType: string;
		isFirstProtection: boolean;
	};
	timestamp: number;
}

interface OnboardingPhaseProgressedEvent {
	event: "onboarding.phase.progressed";
	properties: {
		phase: number;
		trigger: string;
		unlockedFeatures: string[];
	};
	timestamp: number;
}

interface OnboardingContextualPromptShownEvent {
	event: "onboarding.contextualPrompt.shown";
	properties: {
		promptType: string;
		actionTaken: string | null;
	};
	timestamp: number;
}

interface SignatureVerificationSuccessEvent {
	event: "signature.verification.success";
	properties: Record<string, never>; // No properties
	timestamp: number;
}

interface SignatureVerificationFailedEvent {
	event: "signature.verification.failed";
	properties: Record<string, never>; // No properties
	timestamp: number;
}

interface RulesCachedFallbackEvent {
	event: "rules.cached.fallback";
	properties: Record<string, never>; // No properties
	timestamp: number;
}

// Union type of all allowed events
type AllowedTelemetryEvent =
	| ExtensionActivatedEvent
	| ExtensionDeactivatedEvent
	| CommandExecutionEvent
	| SnapshotCreatedEvent
	| SnapBackUsedEvent
	| RiskDetectedEvent
	| ViewActivatedEvent
	| NotificationShownEvent
	| FeatureUsedEvent
	| ErrorEvent
	| WalkthroughStepCompletedEvent
	| OnboardingProtectionAssignedEvent
	| OnboardingPhaseProgressedEvent
	| OnboardingContextualPromptShownEvent
	| SignatureVerificationSuccessEvent
	| SignatureVerificationFailedEvent
	| RulesCachedFallbackEvent;

// Event name allowlist - enum enforcement (kept for backward compatibility)
const ALLOWED_EVENTS = [
	"extension.activated",
	"extension.deactivated",
	"command.execution",
	"snapshot.created",
	"snapback.used",
	"risk.detected",
	"view.activated",
	"notification.shown",
	"feature.used",
	"error",
	"walkthrough.step.completed",
	"onboarding.protection.assigned",
	"onboarding.phase.progressed",
	"onboarding.contextualPrompt.shown",
	"signature.verification.success",
	"signature.verification.failed",
	"rules.cached.fallback",
] as const;

// Enhanced validation function that uses both Zod and runtime schema validation
function validateEventWithSchema(event: z.infer<typeof eventSchema>): event is AllowedTelemetryEvent {
	// First validate with Zod schema
	try {
		eventSchema.parse(event);
	} catch {
		return false;
	}

	// Then validate with our runtime schema validation
	const typedEvent: TelemetryEvent = {
		event: event.event,
		properties: event.properties,
		timestamp: event.timestamp || Date.now(),
	};

	return validateTelemetryEvent(typedEvent);
}

const eventSchema = z.object({
	event: z.enum(ALLOWED_EVENTS), // Strict allowlist
	properties: z.record(z.string(), z.unknown()).transform(stripSensitiveProperties),
	timestamp: z.number().optional(),
});

const ingestEventsSchema = z.object({
	events: z.array(eventSchema),
});

/**
 * Strip sensitive properties before forwarding to PostHog
 */
function stripSensitiveProperties(props: Record<string, unknown>): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {};

	// Remove any properties that could contain PII
	const blocklist = ["path", "filePath", "fileName", "email", "user", "ip"];

	for (const [key, value] of Object.entries(props)) {
		if (!blocklist.some((blocked) => key.toLowerCase().includes(blocked))) {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

// Validation function for telemetry events
function validateTelemetryEvent(event: TelemetryEvent): event is AllowedTelemetryEvent {
	const TELEMETRY_EVENTS = {
		EXTENSION_ACTIVATED: "extension.activated",
		EXTENSION_DEACTIVATED: "extension.deactivated",
		COMMAND_EXECUTION: "command.execution",
		SNAPSHOT_CREATED: "snapshot.created",
		SNAPBACK_USED: "snapback.used",
		RISK_DETECTED: "risk.detected",
		VIEW_ACTIVATED: "view.activated",
		NOTIFICATION_SHOWN: "notification.shown",
		FEATURE_USED: "feature.used",
		ERROR: "error",
		WALKTHROUGH_STEP_COMPLETED: "walkthrough.step.completed",
		ONBOARDING_PROTECTION_ASSIGNED: "onboarding.protection.assigned",
		ONBOARDING_PHASE_PROGRESSED: "onboarding.phase.progressed",
		ONBOARDING_CONTEXTUAL_PROMPT_SHOWN: "onboarding.contextual.prompt.shown",
		SIGNATURE_VERIFICATION_SUCCESS: "signature.verification.success",
		SIGNATURE_VERIFICATION_FAILED: "signature.verification.failed",
		RULES_CACHED_FALLBACK: "rules.cached.fallback",
	} as const;

	switch (event.event) {
		case TELEMETRY_EVENTS.EXTENSION_ACTIVATED:
			return validateExtensionActivatedEvent(event as ExtensionActivatedEvent);
		case TELEMETRY_EVENTS.EXTENSION_DEACTIVATED:
			return validateExtensionDeactivatedEvent(event as ExtensionDeactivatedEvent);
		case TELEMETRY_EVENTS.COMMAND_EXECUTION:
			return validateCommandExecutionEvent(event as CommandExecutionEvent);
		case TELEMETRY_EVENTS.SNAPSHOT_CREATED:
			return validateSnapshotCreatedEvent(event as SnapshotCreatedEvent);
		case TELEMETRY_EVENTS.SNAPBACK_USED:
			return validateSnapBackUsedEvent(event as SnapBackUsedEvent);
		case TELEMETRY_EVENTS.RISK_DETECTED:
			return validateRiskDetectedEvent(event as RiskDetectedEvent);
		case TELEMETRY_EVENTS.VIEW_ACTIVATED:
			return validateViewActivatedEvent(event as ViewActivatedEvent);
		case TELEMETRY_EVENTS.NOTIFICATION_SHOWN:
			return validateNotificationShownEvent(event as NotificationShownEvent);
		case TELEMETRY_EVENTS.FEATURE_USED:
			return validateFeatureUsedEvent(event as FeatureUsedEvent);
		case TELEMETRY_EVENTS.ERROR:
			return validateErrorEvent(event as ErrorEvent);
		case TELEMETRY_EVENTS.WALKTHROUGH_STEP_COMPLETED:
			return validateWalkthroughStepCompletedEvent(event as WalkthroughStepCompletedEvent);
		case TELEMETRY_EVENTS.ONBOARDING_PROTECTION_ASSIGNED:
			return validateOnboardingProtectionAssignedEvent(event as OnboardingProtectionAssignedEvent);
		case TELEMETRY_EVENTS.ONBOARDING_PHASE_PROGRESSED:
			return validateOnboardingPhaseProgressedEvent(event as OnboardingPhaseProgressedEvent);
		case TELEMETRY_EVENTS.ONBOARDING_CONTEXTUAL_PROMPT_SHOWN:
			return validateOnboardingContextualPromptShownEvent(event as OnboardingContextualPromptShownEvent);
		case TELEMETRY_EVENTS.SIGNATURE_VERIFICATION_SUCCESS:
			return validateSignatureVerificationSuccessEvent(event as SignatureVerificationSuccessEvent);
		case TELEMETRY_EVENTS.SIGNATURE_VERIFICATION_FAILED:
			return validateSignatureVerificationFailedEvent(event as SignatureVerificationFailedEvent);
		case TELEMETRY_EVENTS.RULES_CACHED_FALLBACK:
			return validateRulesCachedFallbackEvent(event as RulesCachedFallbackEvent);
		default:
			return false;
	}
}

// Individual validation functions
function validateExtensionActivatedEvent(event: ExtensionActivatedEvent): boolean {
	return typeof event.properties.version === "string" && typeof event.properties.vscodeVersion === "string";
}

function validateExtensionDeactivatedEvent(event: ExtensionDeactivatedEvent): boolean {
	return Object.keys(event.properties).length === 0;
}

function validateCommandExecutionEvent(event: CommandExecutionEvent): boolean {
	return (
		typeof event.properties.command === "string" &&
		typeof event.properties.duration === "number" &&
		typeof event.properties.success === "boolean"
	);
}

function validateSnapshotCreatedEvent(event: SnapshotCreatedEvent): boolean {
	return typeof event.properties.method === "string" && typeof event.properties.filesCount === "number";
}

function validateSnapBackUsedEvent(event: SnapBackUsedEvent): boolean {
	return (
		typeof event.properties.filesRestored === "number" &&
		typeof event.properties.duration === "number" &&
		typeof event.properties.success === "boolean"
	);
}

function validateRiskDetectedEvent(event: RiskDetectedEvent): boolean {
	return (
		typeof event.properties.riskLevel === "string" &&
		Array.isArray(event.properties.patterns) &&
		typeof event.properties.confidence === "number"
	);
}

function validateViewActivatedEvent(event: ViewActivatedEvent): boolean {
	return typeof event.properties.viewId === "string";
}

function validateNotificationShownEvent(event: NotificationShownEvent): boolean {
	return (
		typeof event.properties.notificationType === "string" &&
		(event.properties.actionTaken === null || typeof event.properties.actionTaken === "string")
	);
}

function validateFeatureUsedEvent(event: FeatureUsedEvent): boolean {
	return typeof event.properties.feature === "string";
}

function validateErrorEvent(event: ErrorEvent): boolean {
	return typeof event.properties.errorType === "string" && typeof event.properties.errorMessage === "string";
}

function validateWalkthroughStepCompletedEvent(event: WalkthroughStepCompletedEvent): boolean {
	return typeof event.properties.stepId === "string" && typeof event.properties.stepTitle === "string";
}

function validateOnboardingProtectionAssignedEvent(event: OnboardingProtectionAssignedEvent): boolean {
	return (
		typeof event.properties.level === "string" &&
		typeof event.properties.trigger === "string" &&
		typeof event.properties.fileType === "string" &&
		typeof event.properties.isFirstProtection === "boolean"
	);
}

function validateOnboardingPhaseProgressedEvent(event: OnboardingPhaseProgressedEvent): boolean {
	return (
		typeof event.properties.phase === "number" &&
		typeof event.properties.trigger === "string" &&
		Array.isArray(event.properties.unlockedFeatures)
	);
}

function validateOnboardingContextualPromptShownEvent(event: OnboardingContextualPromptShownEvent): boolean {
	return (
		typeof event.properties.promptType === "string" &&
		(event.properties.actionTaken === null || typeof event.properties.actionTaken === "string")
	);
}

function validateSignatureVerificationSuccessEvent(event: SignatureVerificationSuccessEvent): boolean {
	return Object.keys(event.properties).length === 0;
}

function validateSignatureVerificationFailedEvent(event: SignatureVerificationFailedEvent): boolean {
	return Object.keys(event.properties).length === 0;
}

function validateRulesCachedFallbackEvent(event: RulesCachedFallbackEvent): boolean {
	return Object.keys(event.properties).length === 0;
}

/**
 * Telemetry ingestion endpoint with schema validation and IP scrubbing
 */
export const ingestEvents = publicProcedure
	.input(ingestEventsSchema)
	.handler(async ({ input }: { input: z.infer<typeof ingestEventsSchema> }) => {
		try {
			// Validate each event with our enhanced validation
			const validEvents = input.events.filter(validateEventWithSchema);

			// Log any invalid events
			const invalidEvents = input.events.filter((event) => !validateEventWithSchema(event));
			if (invalidEvents.length > 0) {
				console.warn("Invalid telemetry events detected:", invalidEvents);
			}

			// Use canonical PostHog client (INT-006)
			const posthog = getPostHog();

			// Forward validated events to PostHog
			for (const event of validEvents) {
				posthog.capture({
					distinctId: "anonymous", // Never forward user IDs
					event: event.event,
					properties: {
						...event.properties,
						// Server-side properties (not client-provided)
						$ip: null, // Explicitly scrub IP
						$lib: "snapback-proxy", // Override client library detection
						server_timestamp: Date.now(),
					},
					timestamp: event.timestamp ? new Date(event.timestamp) : undefined,
				});
			}

			// Flush events (shared client so don't shutdown)
			await posthog.flush();

			return {
				success: true,
				processed: validEvents.length,
				invalid: invalidEvents.length,
			};
		} catch (error) {
			console.error("Telemetry ingestion failed", error);
			throw error;
		}
	});
