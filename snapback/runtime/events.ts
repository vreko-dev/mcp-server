/**
 * SnapBack Simplified Architecture - Event System
 *
 * This replaces the 127+ events across 3 systems with ~15 focused events.
 *
 * Design principles:
 * 1. Each event has a clear purpose
 * 2. No duplicate/overlapping events
 * 3. Minimal properties (only what's needed)
 * 4. Privacy-safe (no file paths, content, or PII)
 *
 * Target: ~50 LOC
 *
 * SOURCE REFERENCE:
 * - packages/contracts/src/events/core.ts (7 events we're simplifying)
 * - packages/contracts/src/events/infrastructure.ts (DELETE - over-engineered)
 * - packages/contracts/src/events/legacy.ts (DELETE - deprecated)
 */

import { EventEmitter } from "events";

// =============================================================================
// EVENT DEFINITIONS (~15 events total)
// =============================================================================

/**
 * All SnapBack events with their payload types
 *
 * Naming convention: domain.action (e.g., "session.started")
 */
export interface SnapBackEvents {
	// -------------------------------------------------------------------------
	// Session Events (4)
	// -------------------------------------------------------------------------

	/** Emitted when a coding session starts */
	"session.started": {
		sessionId: string;
		workspaceHash: string; // Hashed workspace path for privacy
	};

	/** Emitted when a session ends */
	"session.ended": {
		sessionId: string;
		duration: number; // milliseconds
		filesModified: number; // count only, not paths
		snapshotsCreated: number;
	};

	/** Emitted when session health changes significantly */
	"session.health_changed": {
		sessionId: string;
		previousScore: number;
		currentScore: number;
		trigger: string; // what caused the change
	};

	// -------------------------------------------------------------------------
	// File Events (2)
	// -------------------------------------------------------------------------

	/** Emitted when a file is modified (privacy-safe, no content) */
	"file.changed": {
		changeType: "add" | "modify" | "delete";
		extension: string; // ".ts", ".js", etc.
		lineCount: number;
	};

	// -------------------------------------------------------------------------
	// Snapshot Events (2)
	// -------------------------------------------------------------------------

	/** Emitted when a snapshot is created */
	"snapshot.created": {
		snapshotId: string;
		fileCount: number;
		totalBytes: number;
		trigger: "manual" | "auto" | "risk";
		riskScore: number;
	};

	/** Emitted when a snapshot is restored */
	"snapshot.restored": {
		snapshotId: string;
		filesRestored: number;
		duration: number;
	};

	// -------------------------------------------------------------------------
	// Risk & Validation Events (3)
	// -------------------------------------------------------------------------

	/** Emitted when risk is analyzed */
	"risk.analyzed": {
		score: number; // 0-10
		factorCount: number;
		threatCount: number;
	};

	/** Emitted when validation passes */
	"validation.passed": {
		validator: string; // "types", "cycles", etc.
		duration: number;
	};

	/** Emitted when validation fails */
	"validation.failed": {
		validator: string;
		errorCount: number;
		duration: number;
	};

	// -------------------------------------------------------------------------
	// Protection Events (1)
	// -------------------------------------------------------------------------

	/** Emitted when protection level changes */
	"protection.changed": {
		from: string;
		to: string;
		source: "user" | "auto" | "policy";
	};

	// -------------------------------------------------------------------------
	// Error Events (1)
	// -------------------------------------------------------------------------

	/** Emitted when an error occurs */
	"error.occurred": {
		component: string; // "orchestrator", "storage", etc.
		message: string;
		recoverable: boolean;
	};

	// -------------------------------------------------------------------------
	// Auth Events (1)
	// -------------------------------------------------------------------------

	/** Emitted when authentication completes */
	"auth.completed": {
		provider: "github" | "google" | "email";
		success: boolean;
	};
}

// =============================================================================
// EVENT BUS IMPLEMENTATION
// =============================================================================

/**
 * Type-safe event emitter for SnapBack events
 *
 * Usage:
 *   eventBus.emit('session.started', { sessionId: '123', workspaceHash: 'abc' });
 *   eventBus.on('session.started', (payload) => console.log(payload.sessionId));
 */
class SnapBackEventBus extends EventEmitter {
	/**
	 * Emit a typed event
	 */
	emit<K extends keyof SnapBackEvents>(event: K, payload: SnapBackEvents[K]): boolean {
		// Add timestamp to all events
		const enrichedPayload = {
			...payload,
			_timestamp: Date.now(),
			_event: event,
		};

		return super.emit(event, enrichedPayload);
	}

	/**
	 * Listen for a typed event
	 */
	on<K extends keyof SnapBackEvents>(event: K, listener: (payload: SnapBackEvents[K]) => void): this {
		return super.on(event, listener);
	}

	/**
	 * Listen for a typed event once
	 */
	once<K extends keyof SnapBackEvents>(event: K, listener: (payload: SnapBackEvents[K]) => void): this {
		return super.once(event, listener);
	}
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Global event bus instance
 *
 * Import this in any file that needs to emit or listen for events.
 */
export const eventBus = new SnapBackEventBus();

// =============================================================================
// TELEMETRY INTEGRATION (Optional)
// =============================================================================

/**
 * Forward events to PostHog (if configured)
 *
 * This is the ONLY place where telemetry is sent.
 * All events are already privacy-safe by design.
 *
 * TODO: Implement PostHog integration
 *
 * Reference: packages/analytics/src/posthog.ts
 */
export function initTelemetry(_posthogKey?: string): void {
	// TODO: Initialize PostHog client
	// TODO: Subscribe to all events and forward to PostHog
	//
	// Implementation hint:
	// eventBus.on('session.started', (payload) => {
	//   posthog.capture('session_started', payload);
	// });
}
