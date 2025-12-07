export {
	type EmailEnvironment,
	EmailOrchestrator,
	type EmailPayload,
	EmailService,
	type EmailServiceConfig,
	getEmailOrchestrator,
	getEmailService,
	resetEmailService,
	type SendResult,
} from "./email";

export {
	canReceiveEmail,
	createDefaultPreferences,
	type EmailCategory,
	type EmailPreference,
	generateUnsubscribeToken,
	getEmailPreferences,
	getUnsubscribeUrl,
	resubscribe,
	syncPreferenceToHubSpot,
	syncUnsubscribeToHubSpot,
	type UnsubscribeToken,
	unsubscribe,
	updatePreference,
	verifyUnsubscribeToken,
} from "./unsubscribe";
