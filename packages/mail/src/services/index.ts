export {
  EmailService,
  EmailOrchestrator,
  getEmailService,
  getEmailOrchestrator,
  resetEmailService,
  type EmailPayload,
  type SendResult,
  type EmailServiceConfig,
  type EmailEnvironment,
} from "./email";

export {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  getUnsubscribeUrl,
  getEmailPreferences,
  createDefaultPreferences,
  updatePreference,
  unsubscribe,
  resubscribe,
  canReceiveEmail,
  syncUnsubscribeToHubSpot,
  syncPreferenceToHubSpot,
  type EmailCategory,
  type EmailPreference,
  type UnsubscribeToken,
} from "./unsubscribe";
