/**
 * Auth Audit Logging
 * Re-exports shared audit module from @snapback/auth
 * Replaces 371 lines of custom implementation
 *
 * All audit functionality is now centralized in packages/auth/src/lib/audit.ts
 * and triggered via better-auth's database hooks in packages/auth/src/auth.ts
 */

export {
	type AuditEventMetadata,
	type AuditEventType,
	createDatabaseHookHandler,
	trackEvent,
	trackFailedAuth,
} from "@snapback/auth/lib/audit";
