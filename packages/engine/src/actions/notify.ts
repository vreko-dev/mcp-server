#!/usr/bin/env npx tsx
/**
 * Notify Action - Send notifications for events
 *
 * SOURCE: Transport-agnostic notification dispatcher
 *
 * FEATURES:
 * - Multiple notification channels (console, file, webhook)
 * - Severity levels (info, warning, error, critical)
 * - Event type routing (snapshot.created, risk.detected, etc.)
 *
 * CONTRACT:
 * - Input: --type=snapshot.created --message="..." [--severity=info]
 * - Output: JSON to stdout
 * - Exit: Always 0 (notifications are non-blocking)
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

interface NotifyOptions {
	type: string;
	message: string;
	severity: "info" | "warning" | "error" | "critical";
	data?: Record<string, any>;
}

interface ActionOutput {
	action: "notify";
	success: boolean;
	result?: {
		type: string;
		severity: string;
		channels: string[];
	};
	error?: string;
}

/**
 * Send notification to console
 */
function notifyConsole(options: NotifyOptions): void {
	const timestamp = new Date().toISOString();
	const prefix = {
		info: "ℹ️ ",
		warning: "⚠️ ",
		error: "❌",
		critical: "🚨",
	}[options.severity];

	console.error(`[${timestamp}] ${prefix} [${options.type}] ${options.message}`);

	if (options.data) {
		console.error(JSON.stringify(options.data, null, 2));
	}
}

/**
 * Send notification to file log
 */
function notifyFile(options: NotifyOptions): void {
	const logDir = process.env.SNAPBACK_LOG_DIR || ".snapback/logs";
	const logFile = path.join(logDir, "notifications.jsonl");

	const entry = {
		timestamp: new Date().toISOString(),
		type: options.type,
		severity: options.severity,
		message: options.message,
		data: options.data,
	};

	try {
		writeFileSync(logFile, `${JSON.stringify(entry)}\n`, { flag: "a" });
	} catch {
		// Ignore file write errors (non-blocking)
	}
}

/**
 * Send notification to webhook (if configured)
 */
async function notifyWebhook(options: NotifyOptions): Promise<void> {
	const webhookUrl = process.env.SNAPBACK_WEBHOOK_URL;

	if (!webhookUrl) {
		return; // No webhook configured
	}

	try {
		const payload = {
			type: options.type,
			severity: options.severity,
			message: options.message,
			timestamp: new Date().toISOString(),
			data: options.data,
		};

		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			// Log webhook failure but don't throw (non-blocking)
			console.error(`Webhook notification failed: ${response.status} ${response.statusText}`);
		}
	} catch {
		// Ignore webhook errors (non-blocking)
	}
}

/**
 * Parse command-line arguments
 */
function parseArgs(): NotifyOptions {
	const typeArg = process.argv.find((arg) => arg.startsWith("--type="));
	const messageArg = process.argv.find((arg) => arg.startsWith("--message="));
	const severityArg = process.argv.find((arg) => arg.startsWith("--severity="));
	const dataArg = process.argv.find((arg) => arg.startsWith("--data="));

	if (!typeArg) {
		throw new Error("Missing required argument: --type=event.type");
	}

	if (!messageArg) {
		throw new Error('Missing required argument: --message="notification message"');
	}

	const type = typeArg.replace("--type=", "");
	const message = messageArg.replace("--message=", "");
	const severity = (severityArg?.replace("--severity=", "") as NotifyOptions["severity"]) || "info";
	const data = dataArg ? JSON.parse(dataArg.replace("--data=", "")) : undefined;

	return {
		type,
		message,
		severity,
		data,
	};
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
	try {
		const options = parseArgs();
		const channels: string[] = [];

		// Send to console (always)
		notifyConsole(options);
		channels.push("console");

		// Send to file log (if enabled)
		if (process.env.SNAPBACK_LOG_FILE !== "false") {
			notifyFile(options);
			channels.push("file");
		}

		// Send to webhook (if configured)
		if (process.env.SNAPBACK_WEBHOOK_URL) {
			await notifyWebhook(options);
			channels.push("webhook");
		}

		const output: ActionOutput = {
			action: "notify",
			success: true,
			result: {
				type: options.type,
				severity: options.severity,
				channels,
			},
		};

		console.log(JSON.stringify(output));
		process.exit(0);
	} catch (error) {
		const output: ActionOutput = {
			action: "notify",
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};

		console.log(JSON.stringify(output));
		process.exit(0); // Non-blocking, always exit 0
	}
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	void main();
}
