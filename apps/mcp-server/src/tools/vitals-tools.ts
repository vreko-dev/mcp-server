/**
 * Vitals MCP Tools
 *
 * Workspace health sensing tools for AI agents.
 * Allows agents to query workspace vitals before making risky changes.
 *
 * Tools:
 * - get_workspace_vitals: Get current workspace health signals
 * - acknowledge_risk: Acknowledge risk and proceed with changes
 */

import { WorkspaceVitals } from "@snapback/intelligence/vitals";
import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

export const GetWorkspaceVitalsSchema = {
	type: "object" as const,
	properties: {
		workspaceId: {
			type: "string",
			description: "Workspace path or identifier (defaults to current workspace)",
		},
	},
	required: [] as const,
};

export const AcknowledgeRiskSchema = {
	type: "object" as const,
	properties: {
		workspaceId: {
			type: "string",
			description: "Workspace path or identifier",
		},
		files: {
			type: "array",
			items: { type: "string" },
			description: "Files you intend to modify",
		},
		reason: {
			type: "string",
			description: "Why you are proceeding despite the risk",
		},
	},
	required: ["files", "reason"] as const,
};

// Zod schemas for validation
const GetVitalsArgsSchema = z.object({
	workspaceId: z.string().optional(),
});

const AcknowledgeRiskArgsSchema = z.object({
	workspaceId: z.string().optional(),
	files: z.array(z.string()),
	reason: z.string(),
});

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const vitalsToolDefinitions = [
	{
		name: "snapback.get_workspace_vitals",
		description: `**Purpose:** Get current workspace health signals before making changes.

**When to Use:**
- BEFORE making risky modifications
- When planning refactoring or major changes
- To understand current workspace risk state
- When user asks "is it safe to continue?"

**Returns:**
- Pulse: Change velocity (resting/elevated/racing/critical)
- Temperature: AI activity level (cold/warm/hot/burning)
- Pressure: Risk accumulation (0-100)
- Oxygen: Snapshot coverage (0-100%)
- Trajectory: Overall state (stable/escalating/critical/recovering)
- Guidance: Suggested actions and blocked operations
- Forecast: Trajectory predictions (5/10 min)
- Calibration: Learning status and threshold adjustments

**Performance:** < 10ms`,
		inputSchema: GetWorkspaceVitalsSchema,
		requiresBackend: false,
	},
	{
		name: "snapback.acknowledge_risk",
		description: `**Purpose:** Acknowledge current risk state and proceed with changes.

**When to Use:**
- When you understand the risks and want to continue
- After reviewing vitals that show elevated risk
- To override risk warnings with explicit acknowledgment

**Note:** This creates an audit trail of risk acknowledgments.

**Returns:**
- Acknowledgment confirmation
- Reminder to create snapshot after changes`,
		inputSchema: AcknowledgeRiskSchema,
		requiresBackend: false,
	},
];

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Handle get_workspace_vitals tool call
 */
export async function handleGetWorkspaceVitals(args: unknown): Promise<{
	content: Array<{ type: string; text?: string; json?: unknown }>;
	isError?: boolean;
}> {
	try {
		const parsed = GetVitalsArgsSchema.parse(args);
		const workspaceId = parsed.workspaceId || process.cwd();

		const vitals = WorkspaceVitals.for(workspaceId);
		const current = vitals.current();
		const guidance = vitals.getAgentGuidance();
		const snapshotDecision = vitals.shouldSnapshot();
		const forecast = vitals.getForecast();
		const calibration = vitals.getCalibrationProfile();
		const behaviorStats = vitals.getBehaviorStats();

		return {
			content: [
				{
					type: "json",
					json: {
						vitals: {
							pulse: current.pulse,
							temperature: current.temperature,
							pressure: current.pressure,
							oxygen: current.oxygen,
							trajectory: current.trajectory,
						},
						guidance: {
							shouldSnapshot: guidance.shouldSnapshot,
							snapshotReason: guidance.snapshotReason,
							riskyFiles: guidance.riskyFiles,
							safeOperations: guidance.safeOperations,
							blockedOperations: guidance.blockedOperations,
							suggestion: guidance.suggestion,
						},
						recommendation: {
							should: snapshotDecision.should,
							reason: snapshotDecision.reason,
							urgency: snapshotDecision.urgency,
						},
						forecast: {
							current: forecast.current,
							in5Minutes: forecast.in5Minutes,
							in10Minutes: forecast.in10Minutes,
							trend: forecast.trend,
							confidence: forecast.confidence,
							timeToStateChange: forecast.timeToStateChange,
						},
						calibration: {
							status: calibration.status,
							observationCount: calibration.observationCount,
							confidence: calibration.confidence,
							riskTolerance: calibration.riskTolerance,
						},
						behaviorStats: {
							riskProfile: behaviorStats.riskProfile,
							totalObservations: behaviorStats.totalObservations,
							alignedSnapshots: behaviorStats.alignedSnapshots,
							earlySnapshots: behaviorStats.earlySnapshots,
							lateSnapshots: behaviorStats.lateSnapshots,
							missedRecommendations: behaviorStats.missedRecommendations,
						},
					},
				},
				{
					type: "text",
					text: formatVitalsText(current, guidance),
				},
			],
		};
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `❌ Failed to get workspace vitals: ${error instanceof Error ? error.message : "Unknown error"}`,
				},
			],
			isError: true,
		};
	}
}

/**
 * Handle acknowledge_risk tool call
 */
export async function handleAcknowledgeRisk(args: unknown): Promise<{
	content: Array<{ type: string; text?: string; json?: unknown }>;
	isError?: boolean;
}> {
	try {
		const parsed = AcknowledgeRiskArgsSchema.parse(args);
		const workspaceId = parsed.workspaceId || process.cwd();

		// Log the acknowledgment for audit trail
		console.error(`[Vitals] Risk acknowledged for ${workspaceId}:`, {
			files: parsed.files,
			reason: parsed.reason,
			timestamp: new Date().toISOString(),
		});

		// Get current vitals for context
		const vitals = WorkspaceVitals.for(workspaceId);
		const current = vitals.current();

		return {
			content: [
				{
					type: "json",
					json: {
						acknowledged: true,
						filesCount: parsed.files.length,
						reason: parsed.reason,
						currentState: {
							trajectory: current.trajectory,
							pressure: current.pressure.value,
						},
					},
				},
				{
					type: "text",
					text: `✅ Risk acknowledged for ${parsed.files.length} file(s)

Reason: ${parsed.reason}
Current State: ${current.trajectory} (pressure: ${current.pressure.value}%)

⚠️ Reminder: Consider creating a snapshot after completing your changes.`,
				},
			],
		};
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `❌ Failed to acknowledge risk: ${error instanceof Error ? error.message : "Unknown error"}`,
				},
			],
			isError: true,
		};
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format vitals as human-readable text
 */
function formatVitalsText(
	vitals: ReturnType<WorkspaceVitals["current"]>,
	guidance: ReturnType<WorkspaceVitals["getAgentGuidance"]>,
): string {
	const pulseIcon = {
		resting: "💤",
		elevated: "💓",
		racing: "💗",
		critical: "🚨",
	}[vitals.pulse.level];

	const tempIcon = {
		cold: "❄️",
		warm: "🌡️",
		hot: "🔥",
		burning: "🌋",
	}[vitals.temperature.level];

	const trajectoryIcon = {
		stable: "✅",
		escalating: "⚠️",
		critical: "🚨",
		recovering: "📈",
	}[vitals.trajectory];

	let text = `Workspace Vitals
━━━━━━━━━━━━━━━━━━━━━━━━━━

${pulseIcon} Pulse: ${vitals.pulse.level} (${vitals.pulse.changesPerMinute} changes/min)
${tempIcon} Temperature: ${vitals.temperature.level} (${vitals.temperature.aiPercentage}% AI)
📊 Pressure: ${vitals.pressure.value}% (${vitals.pressure.unsnapshotedChanges} unsaved changes)
🫁 Oxygen: ${vitals.oxygen.value}% coverage

${trajectoryIcon} Trajectory: ${vitals.trajectory.toUpperCase()}

`;

	if (guidance.shouldSnapshot) {
		text += `\n🔴 RECOMMENDATION: ${guidance.snapshotReason}\n`;
	}

	text += `\n💡 ${guidance.suggestion}`;

	if (guidance.blockedOperations.length > 0) {
		text += `\n\n⛔ Blocked operations: ${guidance.blockedOperations.join(", ")}`;
	}

	if (guidance.riskyFiles.length > 0) {
		text += `\n\n⚠️ Risky files: ${guidance.riskyFiles.slice(0, 5).join(", ")}`;
		if (guidance.riskyFiles.length > 5) {
			text += ` (+${guidance.riskyFiles.length - 5} more)`;
		}
	}

	return text;
}
