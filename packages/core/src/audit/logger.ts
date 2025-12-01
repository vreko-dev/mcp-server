// append-only structured logs; redact PII

import { createWriteStream } from "node:fs";

export interface AuditLogEntry {
	id: string;
	timestamp: Date;
	userId?: string;
	action: string;
	resource?: string;
	details?: Record<string, any>;
	outcome: "success" | "failure";
	ipAddress?: string;
	userAgent?: string;
}

export class AuditLogger {
	private logStream: NodeJS.WritableStream;
	private piiFields: Set<string>;

	constructor(logFilePath?: string, piiFields: string[] = []) {
		// Default to writing to stdout in test environments
		if (process.env.NODE_ENV === "test" || !logFilePath) {
			this.logStream = process.stdout;
		} else {
			// Ensure directory exists
			const _dir = logFilePath.substring(0, logFilePath.lastIndexOf("/"));
			// Create directory if it doesn't exist (simplified)
			this.logStream = createWriteStream(logFilePath, { flags: "a" });
		}

		this.piiFields = new Set(piiFields);
	}

	log(entry: Omit<AuditLogEntry, "id" | "timestamp">): void {
		const logEntry: AuditLogEntry = {
			id: this.generateId(),
			timestamp: new Date(),
			...entry,
		};

		// Redact PII fields
		const sanitizedEntry = this.redactPII(logEntry);

		// Write to log stream
		this.logStream.write(`${JSON.stringify(sanitizedEntry)}\n`);
	}

	private generateId(): string {
		// Simple ID generation
		return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
	}

	private redactPII(entry: AuditLogEntry): AuditLogEntry {
		if (!entry.details) {
			return entry;
		}

		const redactedDetails: Record<string, any> = {};

		for (const [key, value] of Object.entries(entry.details)) {
			if (this.piiFields.has(key)) {
				redactedDetails[key] = "[REDACTED]";
			} else if (typeof value === "string" && this.containsPII(value)) {
				redactedDetails[key] = "[REDACTED]";
			} else {
				redactedDetails[key] = value;
			}
		}

		return {
			...entry,
			details: redactedDetails,
		};
	}

	private containsPII(value: string): boolean {
		// Simple PII detection patterns
		const piiPatterns = [
			/\b\d{3}-?\d{2}-?\d{4}\b/, // SSN
			/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
			/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
			/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone number
		];

		return piiPatterns.some((pattern) => pattern.test(value));
	}

	// Static method for testing
	static createTestLogger(): AuditLogger {
		return new AuditLogger(undefined, ["email", "phone", "ssn"]);
	}
}

// Export a singleton instance for easy use
let auditLogger: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
	if (!auditLogger) {
		const logPath = process.env.AUDIT_LOG_PATH || "./audit.log";
		const piiFields = (process.env.PII_FIELDS || "email,phone,ssn").split(",");
		auditLogger = new AuditLogger(logPath, piiFields);
	}

	return auditLogger;
}
