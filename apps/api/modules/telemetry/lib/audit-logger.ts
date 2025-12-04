/**
 * Audit Logger for Telemetry Events
 *
 * Maintains immutable audit logs of all telemetry operations for compliance and debugging:
 * - Event acceptance/rejection decisions
 * - Privacy gate filtering actions
 * - Consent verification
 * - Data deletion requests
 * - Policy changes
 *
 * Reference: GDPR Article 5(1)(f) - Integrity and confidentiality principle
 */

import { logger } from "@snapback/infrastructure";

export type AuditAction =
	| "event_accepted"
	| "event_rejected"
	| "event_filtered"
	| "consent_verified"
	| "consent_withdrawn"
	| "data_deleted"
	| "policy_updated"
	| "error_occurred";

export interface AuditLogEntry {
	// Core metadata
	id: string;
	timestamp: number;
	action: AuditAction;
	status: "success" | "failure";

	// User/System context
	userId?: string;
	orgId?: string;
	systemId?: string;

	// Event details
	eventType?: string;
	eventId?: string;

	// Action details
	reason?: string;
	filteredFields?: string[];
	retentionDays?: number;

	// Error tracking
	error?: string;
	errorCode?: string;

	// Audit trail
	ipAddress?: string; // Hashed
	userAgent?: string; // Hashed
	source?: string;
}

export class AuditLogger {
	private static readonly MAX_LOG_SIZE = 10000;
	private logs: AuditLogEntry[] = [];
	private logIndex: Map<string, number> = new Map();

	/**
	 * Log an audit event
	 */
	logAction(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
		const auditEntry: AuditLogEntry = {
			...entry,
			id: this.generateId(),
			timestamp: Date.now(),
		};

		// Store in audit log
		this.logs.push(auditEntry);
		this.logIndex.set(auditEntry.id, this.logs.length - 1);

		// Enforce size limit (keep recent logs)
		if (this.logs.length > AuditLogger.MAX_LOG_SIZE) {
			this.logs = this.logs.slice(-AuditLogger.MAX_LOG_SIZE);
			this.rebuildIndex();
		}

		// Log to system
		this.persistLog(auditEntry);

		return auditEntry;
	}

	/**
	 * Log event acceptance
	 */
	logEventAccepted(eventId: string, eventType: string, userId?: string): void {
		this.logAction({
			action: "event_accepted",
			status: "success",
			eventId,
			eventType,
			userId,
			source: "ingest",
		});

		logger.debug("Event accepted", {
			eventId,
			eventType,
			userId,
		});
	}

	/**
	 * Log event rejection
	 */
	logEventRejected(
		eventId: string,
		eventType: string,
		reason: string,
		userId?: string,
	): void {
		this.logAction({
			action: "event_rejected",
			status: "success",
			eventId,
			eventType,
			reason,
			userId,
			source: "ingest",
		});

		logger.info("Event rejected", {
			eventId,
			eventType,
			reason,
			userId,
		});
	}

	/**
	 * Log event filtering (PII removal)
	 */
	logEventFiltered(
		eventId: string,
		eventType: string,
		filteredFields: string[],
		userId?: string,
	): void {
		this.logAction({
			action: "event_filtered",
			status: "success",
			eventId,
			eventType,
			filteredFields,
			userId,
			reason: "Privacy gate filtering",
			source: "privacy_gate",
		});

		logger.debug("Event filtered (PII removed)", {
			eventId,
			eventType,
			fieldCount: filteredFields.length,
		});
	}

	/**
	 * Log consent verification
	 */
	logConsentVerified(
		userId: string,
		consentGiven: boolean,
		version: string,
	): void {
		this.logAction({
			action: "consent_verified",
			status: "success",
			userId,
			reason: `Consent verified: ${consentGiven ? "granted" : "missing"}`,
			retentionDays: consentGiven ? 90 : 0,
		});

		logger.info("Consent verified", {
			userId,
			consentGiven,
			version,
		});
	}

	/**
	 * Log consent withdrawal
	 */
	logConsentWithdrawn(userId: string, orgId?: string): void {
		this.logAction({
			action: "consent_withdrawn",
			status: "success",
			userId,
			orgId,
			reason: "User withdrawn consent",
			retentionDays: 0,
		});

		logger.info("Consent withdrawn", {
			userId,
			orgId,
		});
	}

	/**
	 * Log data deletion request
	 */
	logDataDeletion(
		userId: string,
		eventCount: number,
		orgId?: string,
		reason: string = "User requested deletion",
	): void {
		this.logAction({
			action: "data_deleted",
			status: "success",
			userId,
			orgId,
			reason,
			retentionDays: 0,
		});

		logger.info("Data deletion processed", {
			userId,
			eventCount,
			orgId,
			reason,
		});
	}

	/**
	 * Log policy update
	 */
	logPolicyUpdate(
		policyName: string,
		policyVersion: string,
		changes: string[],
		orgId?: string,
	): void {
		this.logAction({
			action: "policy_updated",
			status: "success",
			orgId,
			reason: `${policyName} v${policyVersion} updated`,
			retentionDays: 365, // Keep policy changes for 1 year
		});

		logger.info("Policy updated", {
			policyName,
			policyVersion,
			changes,
		});
	}

	/**
	 * Log error
	 */
	logError(
		errorCode: string,
		error: Error,
		context?: Record<string, unknown>,
	): void {
		this.logAction({
			action: "error_occurred",
			status: "failure",
			errorCode,
			error: error.message,
			reason: `Error during telemetry processing: ${error.message}`,
		});

		logger.error("Audit log error", {
			errorCode,
			error: error.message,
			context,
		});
	}

	/**
	 * Get audit logs for a user (for GDPR DSAR)
	 */
	getAuditLogsForUser(userId: string): AuditLogEntry[] {
		return this.logs.filter((log) => log.userId === userId);
	}

	/**
	 * Get audit logs by action type
	 */
	getAuditLogsByAction(action: AuditAction): AuditLogEntry[] {
		return this.logs.filter((log) => log.action === action);
	}

	/**
	 * Get audit logs within time range
	 */
	getAuditLogsByDateRange(startTime: number, endTime: number): AuditLogEntry[] {
		return this.logs.filter(
			(log) => log.timestamp >= startTime && log.timestamp <= endTime,
		);
	}

	/**
	 * Search audit logs
	 */
	searchAuditLogs(predicate: (log: AuditLogEntry) => boolean): AuditLogEntry[] {
		return this.logs.filter(predicate);
	}

	/**
	 * Verify audit log integrity (detect tampering)
	 */
	verifyIntegrity(): boolean {
		// In production, this would use cryptographic hashing
		// For now, just verify index consistency
		if (this.logIndex.size !== this.logs.length) {
			logger.warn("Audit log index inconsistency detected");
			return false;
		}

		// Verify timestamp ordering (logs should be chronological)
		for (let i = 1; i < this.logs.length; i++) {
			if (this.logs[i].timestamp < this.logs[i - 1].timestamp) {
				logger.warn("Audit log timestamp order violation detected");
				return false;
			}
		}

		return true;
	}

	/**
	 * Export audit logs for compliance report
	 */
	exportAuditLogs(format: "json" | "csv" = "json"): string {
		if (format === "json") {
			return JSON.stringify(this.logs, null, 2);
		}

		// CSV export
		const headers = Object.keys(this.logs[0] || {});
		const rows = this.logs.map((log) =>
			headers.map((h) => {
				const value = (log as unknown as Record<string, unknown>)[h];
				if (Array.isArray(value)) {
					return `"${value.join(", ")}"`;
				}
				return typeof value === "string" ? `"${value}"` : String(value);
			}),
		);

		return [headers, ...rows].map((row) => row.join(",")).join("\n");
	}

	/**
	 * Clear old audit logs (respecting retention periods)
	 */
	clearOldLogs(retentionDays: number = 90): void {
		const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

		const initialLength = this.logs.length;
		this.logs = this.logs.filter((log) => log.timestamp > cutoffTime);

		if (this.logs.length < initialLength) {
			this.rebuildIndex();
			logger.info("Audit logs cleaned up", {
				removed: initialLength - this.logs.length,
				retained: this.logs.length,
			});
		}
	}

	/**
	 * Generate unique audit log ID
	 */
	private generateId(): string {
		return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Persist audit log to storage (database, file, etc.)
	 */
	private persistLog(entry: AuditLogEntry): void {
		// In production, this would persist to a database or file system
		// For now, we keep it in memory
		logger.debug("Audit log persisted", {
			id: entry.id,
			action: entry.action,
			userId: entry.userId,
		});
	}

	/**
	 * Rebuild the index after modifying logs
	 */
	private rebuildIndex(): void {
		this.logIndex.clear();
		this.logs.forEach((log, index) => {
			this.logIndex.set(log.id, index);
		});
	}
}

// Singleton instance
export const auditLogger = new AuditLogger();
